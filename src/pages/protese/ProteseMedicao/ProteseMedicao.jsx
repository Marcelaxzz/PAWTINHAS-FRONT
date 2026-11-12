import { useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { CameraIcon, CloseIcon, PlusIcon } from '../../../components/Icons/Icons.jsx'
import { Field, FieldGrid } from '../../../components/ui/Field.jsx'
import { PillButton } from '../../../components/ui/PillButton.jsx'
import { Page } from '../../../layouts/Page/Page.jsx'
import { useCollections } from '../../../hooks/useCollections.js'
import { useToast } from '../../../hooks/useToast.js'
import { dataService } from '../../../services/dataService.js'
import { photoSrc } from '../../../utils/images.js'
import { formatNumber, maskDecimal, parseDecimal } from '../../../utils/numbers.js'
import { usePetFromQuery } from '../usePetFromQuery.js'
import { abrirMedidor, arDisponivel } from '../medidorAR.js'
import { proteseTabs } from '../proteseTabs.js'
import shared from '../ProteseShared.module.css'
import styles from './ProteseMedicao.module.css'

/** As quatro medidas que o modelo 3D usa, na ordem em que são feitas com a câmera. */
const MEDIDAS = [
  { key: 'comprimentoMembro', label: 'Comprimento do membro', dica: 'Do cotovelo (ou joelho) até a ponta da pata' },
  { key: 'alturaChao', label: 'Altura até o chão', dica: 'Do fim do coto até o chão' },
  { key: 'larguraPata', label: 'Largura da pata', dica: 'De um lado ao outro, na parte mais larga' },
  { key: 'larguraEncaixe', label: 'Largura no encaixe', dica: 'Onde a prótese vai encaixar' },
]
const VAZIAS = Object.fromEntries(MEDIDAS.map((m) => [m.key, '']))
const MEMBROS = ['Anterior esquerdo', 'Anterior direito', 'Posterior esquerdo', 'Posterior direito']

/** Medida em centímetros aceita pela API: de 0,1 a 200. */
const medidaValida = (n) => Number.isFinite(n) && n >= 0.1 && n <= 200
const cm = (n) => `${formatNumber(n, 1)} cm`

export function ProteseMedicao() {
  const navigate = useNavigate()
  const toast = useToast()
  const { petId, pet, query } = usePetFromQuery()
  const { data } = useCollections(['pets'])

  const [ar, setAr] = useState(null) // null = verificando
  const [medidas, setMedidas] = useState(VAZIAS)
  const [metodo, setMetodo] = useState('Fita métrica')
  const [membro, setMembro] = useState('')
  const [petEscolhido, setPetEscolhido] = useState('')
  const [salvando, setSalvando] = useState(false)
  const alvo = petId ?? petEscolhido

  // Câmera com realidade aumentada
  const raiz = useRef(null)
  const medidor = useRef(null)
  const [medindo, setMedindo] = useState(false)
  const [passo, setPasso] = useState(0)
  const [marcou, setMarcou] = useState(false)
  const [quadro, setQuadro] = useState({ mira: false, distancia: null, inicioTela: null, centro: null })

  useEffect(() => {
    let ativo = true
    arDisponivel().then((ok) => ativo && setAr(ok))
    return () => {
      ativo = false
      medidor.current?.fechar()
    }
  }, [])

  const abrirCamera = async () => {
    // A interface precisa estar visível antes de pedir a câmera (ela vira a camada por cima do vídeo).
    flushSync(() => {
      setPasso(0)
      setMarcou(false)
      setMedindo(true)
    })
    try {
      medidor.current = await abrirMedidor(raiz.current, {
        aoQuadro: setQuadro,
        aoFechar: () => {
          medidor.current = null
          setMedindo(false)
        },
      })
    } catch {
      setMedindo(false)
      toast.error('Não foi possível abrir a câmera. Confira se o Chrome tem permissão de câmera.')
    }
  }

  const marcar = () => {
    const r = medidor.current?.marcar()
    if (!r) return
    if (r.tipo === 'inicio') {
      setMarcou(true)
      return
    }
    const { key } = MEDIDAS[passo]
    setMedidas((m) => ({ ...m, [key]: formatNumber(r.cm, 1) }))
    setMetodo('Câmera do celular')
    setMarcou(false)
    if (passo + 1 < MEDIDAS.length) setPasso(passo + 1)
    else medidor.current?.fechar()
  }

  const desfazer = () => {
    if (marcou) {
      medidor.current?.desfazer()
      setMarcou(false)
    } else if (passo > 0) {
      setPasso(passo - 1)
    }
  }

  const salvar = async (evento) => {
    evento.preventDefault()
    if (!alvo) return toast.error('Escolha o paciente.')
    if (!membro) return toast.error('Escolha qual membro foi medido.')
    const numeros = Object.fromEntries(MEDIDAS.map(({ key }) => [key, parseDecimal(medidas[key])]))
    const faltando = MEDIDAS.filter(({ key }) => !medidaValida(numeros[key]))
    if (faltando.length) return toast.error(`Falta: ${faltando.map((m) => m.label.toLowerCase()).join(', ')}.`)

    setSalvando(true)
    try {
      const agora = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      await dataService.create('medicoes', {
        petId: alvo,
        membro,
        metodo,
        leituras: 1,
        ...Object.fromEntries(MEDIDAS.map(({ key }) => [key, numeros[key].toFixed(2)])),
        criadoEm: `${agora.getFullYear()}-${pad(agora.getMonth() + 1)}-${pad(agora.getDate())}T${pad(agora.getHours())}:${pad(agora.getMinutes())}`,
      })
      toast.success('Medidas salvas. Agora é só gerar o modelo 3D.')
      navigate(`/protese-3d/modelo?pet=${encodeURIComponent(alvo)}`)
    } catch (err) {
      toast.error(err.message)
      setSalvando(false)
    }
  }

  const atual = MEDIDAS[passo]

  return (
    <Page
      title="Medição para prótese"
      subtitle="Aponte a câmera para o membro e toque nas pontas de cada medida."
      tabs={proteseTabs(query)}
      width="estreito"
    >
      {pet && (
        <span className={shared.paciente}>
          {photoSrc(pet.foto) && <img src={photoSrc(pet.foto)} alt="" />}
          Paciente: {pet.nome}
        </span>
      )}

      <form className={styles.cartao} onSubmit={salvar} noValidate>
        <div className={styles.camera}>
          <span className={styles.cameraIcone} aria-hidden="true">
            <CameraIcon size={26} />
          </span>
          <div className={styles.cameraTexto}>
            <strong>Medir com a câmera</strong>
            <span>
              {ar === false
                ? 'Este navegador não mede pela câmera. Use o Chrome num celular Android ou meça com fita e digite abaixo.'
                : 'As medidas aparecem na hora, como no app Medida do iPhone.'}
            </span>
          </div>
          {ar && (
            <PillButton type="button" size="lg" onClick={abrirCamera}>
              Abrir câmera
            </PillButton>
          )}
        </div>

        <FieldGrid>
          {!petId && (
            <Field
              label="Paciente"
              as="select"
              placeholder="Escolha…"
              options={[...(data?.pets ?? [])]
                .sort((a, b) => a.nome.localeCompare(b.nome))
                .map((p) => ({ value: p.id, label: `${p.nome} · ${p.especie}` }))}
              value={petEscolhido}
              onChange={(e) => setPetEscolhido(e.target.value)}
            />
          )}
          <Field
            label="Membro"
            as="select"
            placeholder="Escolha…"
            span={petId ? 2 : 1}
            options={MEMBROS.map((m) => ({ value: m, label: m }))}
            value={membro}
            onChange={(e) => setMembro(e.target.value)}
          />
          {MEDIDAS.map((m) => (
            <Field
              key={m.key}
              label={`${m.label} (cm)`}
              inputMode="decimal"
              placeholder="0,0"
              hint={m.dica}
              value={medidas[m.key]}
              onChange={(e) => {
                setMedidas((v) => ({ ...v, [m.key]: maskDecimal(e.target.value, 5) }))
                if (metodo !== 'Câmera do celular') setMetodo('Fita métrica')
              }}
            />
          ))}
        </FieldGrid>

        <PillButton type="submit" size="lg" loading={salvando} className={styles.salvar}>
          Salvar medidas
        </PillButton>
      </form>

      {/* Interface por cima da câmera (dom-overlay do WebXR). Fica escondida fora da medição. */}
      <div ref={raiz} className={`${styles.ar} ${medindo ? styles.arAberto : ''}`}>
        {medindo && (
          <>
            <div className={styles.arTopo}>
              <div>
                <small>
                  {passo + 1} de {MEDIDAS.length}
                </small>
                <strong>{atual.label}</strong>
                <span>{marcou ? 'Agora aponte para a outra ponta e toque no +' : atual.dica}</span>
              </div>
              <button
                type="button"
                className={styles.arFechar}
                onClick={() => medidor.current?.fechar()}
                aria-label="Fechar a câmera"
              >
                <CloseIcon size={22} />
              </button>
            </div>

            {quadro.inicioTela && quadro.centro && (
              <svg className={styles.arLinha} aria-hidden="true">
                <line x1={quadro.inicioTela.x} y1={quadro.inicioTela.y} x2={quadro.centro.x} y2={quadro.centro.y} />
                <circle cx={quadro.inicioTela.x} cy={quadro.inicioTela.y} r="7" />
              </svg>
            )}
            <span className={`${styles.arMira} ${quadro.mira ? styles.arMiraAchou : ''}`} aria-hidden="true" />
            {quadro.distancia != null && <span className={styles.arDistancia}>{cm(quadro.distancia)}</span>}
            {!quadro.mira && <span className={styles.arAviso}>Mexa o celular devagar até a mira ficar branca</span>}

            <div className={styles.arBase}>
              <ul className={styles.arFeitas}>
                {MEDIDAS.map((m, i) => (
                  <li key={m.key} className={i === passo ? styles.arFeitaAtual : undefined}>
                    {medidas[m.key] ? `${medidas[m.key]} cm` : '–'}
                  </li>
                ))}
              </ul>
              <div className={styles.arBotoes}>
                <button
                  type="button"
                  className={styles.arDesfazer}
                  onClick={desfazer}
                  disabled={!marcou && passo === 0}
                >
                  Desfazer
                </button>
                <button
                  type="button"
                  className={styles.arMarcar}
                  onClick={marcar}
                  disabled={!quadro.mira}
                  aria-label={marcou ? 'Marcar a outra ponta' : 'Marcar a primeira ponta'}
                >
                  <PlusIcon size={34} strokeWidth={2.4} />
                </button>
                <span className={styles.arEspaco} />
              </div>
            </div>
          </>
        )}
      </div>
    </Page>
  )
}
