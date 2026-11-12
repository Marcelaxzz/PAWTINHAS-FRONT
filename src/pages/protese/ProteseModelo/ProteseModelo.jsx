import { useId, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Page } from '../../../layouts/Page/Page.jsx'
import { Field, FieldGrid } from '../../../components/ui/Field.jsx'
import { PillButton } from '../../../components/ui/PillButton.jsx'
import { EmptyState, ErrorState, LoadingState } from '../../../components/ui/States.jsx'
import { DownloadIcon } from '../../../components/Icons/Icons.jsx'
import { useCollections } from '../../../hooks/useCollections.js'
import { formatDateBr } from '../../../utils/dates.js'
import { formatNumber, maskDecimal, parseDecimal } from '../../../utils/numbers.js'
import { proteseTabs } from '../proteseTabs.js'
import { usePetFromQuery } from '../usePetFromQuery.js'
import { MATERIAIS, PADRAO, dimensoes, malha, material, stl } from '../impressao/modeloProtese.js'
import { INCLINACAO, vista3d } from '../impressao/vista3d.js'
import styles from './ProteseModelo.module.css'

/** O modelo calcula em milímetros (unidade do STL); a tela mostra em centímetros. */
const cm = (mm) => `${formatNumber(mm / 10, 1)} cm`
const emCm = (mm) => formatNumber(mm / 10, 2).replace(/\./g, '')
/** Campo em cm → mm para o cálculo. */
const paraMm = (texto) => (parseDecimal(texto) == null ? null : parseDecimal(texto) * 10)

/** "Paçoca" → "pacoca", para o nome do arquivo. */
const slug = (texto) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

export function ProteseModelo() {
  const { query } = usePetFromQuery()
  const { data, loading, error, reload } = useCollections(['pets', 'medicoes'])

  return (
    <Page
      title="Modelo para impressão 3D"
      subtitle="Gere o arquivo da prótese a partir de uma medição salva e leve para o fatiador da impressora."
      tabs={proteseTabs(query)}
      width="largo"
    >
      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && <Modelo pets={data.pets} medicoes={data.medicoes} />}
    </Page>
  )
}

function Modelo({ pets, medicoes }) {
  const [params] = useSearchParams()
  const [petId, setPetId] = useState(params.get('pet') ?? '')
  const doPet = useMemo(
    () => medicoes.filter((m) => m.petId === petId).sort((a, b) => b.criadoEm.localeCompare(a.criadoEm)),
    [medicoes, petId],
  )
  const [medicaoId, setMedicaoId] = useState(params.get('medicao') ?? '')
  const medicao = doPet.find((m) => m.id === medicaoId) ?? doPet[0]
  const pet = pets.find((p) => p.id === petId)

  const [ajustes, setAjustes] = useState({
    folga: emCm(PADRAO.folgaMm),
    parede: emCm(PADRAO.paredeMm),
    profundidade: '',
    encaixe: '',
    tipo: 'PETG',
  })
  const [vista, setVista] = useState('3d')
  const set = (campo) => (e) => setAjustes((a) => ({ ...a, [campo]: e.target.value }))
  const setCm = (campo) => (e) => setAjustes((a) => ({ ...a, [campo]: maskDecimal(e.target.value, 5) }))

  const pacientesComMedicao = pets.filter((p) => medicoes.some((m) => m.petId === p.id))
  const encaixe = medicao?.larguraEncaixe ?? parseDecimal(ajustes.encaixe)

  let calculo = null
  let problema = ''
  if (medicao) {
    try {
      const d = dimensoes({
        larguraEncaixe: encaixe,
        alturaChao: medicao.alturaChao,
        larguraPata: medicao.larguraPata,
        folgaMm: paraMm(ajustes.folga) ?? PADRAO.folgaMm,
        paredeMm: Math.max(1.2, paraMm(ajustes.parede) ?? PADRAO.paredeMm),
        profundidadeMm: paraMm(ajustes.profundidade) ?? undefined,
      })
      calculo = { d, m: material(d.volumeCm3, ajustes.tipo) }
    } catch (e) {
      problema = e.message
    }
  }

  const baixar = () => {
    const arquivo = stl(malha(calculo.d), `Pawtinhas - ${pet?.nome ?? 'protese'}`)
    const url = URL.createObjectURL(new Blob([arquivo], { type: 'model/stl' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `protese-${slug(pet?.nome ?? 'pet')}-${slug(medicao.membro ?? 'membro')}.stl`
    link.click()
    URL.revokeObjectURL(url)
  }

  if (pacientesComMedicao.length === 0) {
    return (
      <EmptyState
        title="Nenhuma medição salva ainda"
        action={<PillButton to="/protese-3d/medicao">Fazer uma medição</PillButton>}
      >
        O modelo é gerado a partir das medidas registradas na ficha do paciente.
      </EmptyState>
    )
  }

  return (
    <div className={styles.layout}>
      <section className={styles.cartao} aria-labelledby="titulo-dados">
        <h2 id="titulo-dados" className={styles.titulo}>
          Medição
        </h2>
        <FieldGrid>
          <Field
            label="Paciente"
            as="select"
            placeholder="Selecione…"
            options={pacientesComMedicao
              .sort((a, b) => a.nome.localeCompare(b.nome))
              .map((p) => ({ value: p.id, label: p.nome }))}
            value={petId}
            onChange={(e) => {
              setPetId(e.target.value)
              setMedicaoId('')
            }}
          />
          <Field
            label="Medição"
            as="select"
            placeholder="Selecione…"
            options={doPet.map((m) => ({
              value: m.id,
              label: `${formatDateBr(m.criadoEm.slice(0, 10))} · ${m.membro ?? 'membro não informado'}`,
            }))}
            value={medicao?.id ?? ''}
            onChange={(e) => setMedicaoId(e.target.value)}
          />
        </FieldGrid>

        {medicao && (
          <dl className={styles.medidas}>
            <div>
              <dt>Altura até o chão</dt>
              <dd>{formatNumber(medicao.alturaChao, 1)} cm</dd>
            </div>
            <div>
              <dt>Largura da pata</dt>
              <dd>{formatNumber(medicao.larguraPata, 1)} cm</dd>
            </div>
            <div>
              <dt>Largura no encaixe</dt>
              <dd>{medicao.larguraEncaixe ? `${formatNumber(medicao.larguraEncaixe, 1)} cm` : 'não medida'}</dd>
            </div>
            <div>
              <dt>Comprimento do membro</dt>
              <dd>{formatNumber(medicao.comprimentoMembro, 1)} cm</dd>
            </div>
          </dl>
        )}

        {medicao && !medicao.larguraEncaixe && (
          <Field
            label="Largura no encaixe (cm)"
            inputMode="decimal"
            placeholder="Ex.: 4,2"
            hint="Esta medição é anterior à quarta medida. Meça com a fita ou faça uma nova medição."
            value={ajustes.encaixe}
            onChange={(e) => setAjustes((a) => ({ ...a, encaixe: maskDecimal(e.target.value, 5) }))}
          />
        )}

        <h2 className={styles.titulo}>Ajustes da peça</h2>
        <FieldGrid>
          <Field
            label="Folga interna (cm)"
            inputMode="decimal"
            hint="Espaço para espuma ou meia de proteção."
            value={ajustes.folga}
            onChange={setCm('folga')}
          />
          <Field
            label="Parede (cm)"
            inputMode="decimal"
            hint="Mínimo de 0,12 cm."
            value={ajustes.parede}
            onChange={setCm('parede')}
          />
          <Field
            label="Profundidade do soquete (cm)"
            inputMode="decimal"
            placeholder={calculo ? emCm(calculo.d.profundidade) : ''}
            hint="Em branco: 1,2 × o diâmetro interno."
            value={ajustes.profundidade}
            onChange={setCm('profundidade')}
          />
          <Field
            label="Material"
            as="select"
            options={Object.keys(MATERIAIS).map((t) => ({ value: t, label: t }))}
            value={ajustes.tipo}
            onChange={set('tipo')}
          />
        </FieldGrid>
      </section>

      <section className={styles.cartao} aria-labelledby="titulo-modelo" aria-live="polite">
        <div className={styles.cabecalhoVista}>
          <h2 id="titulo-modelo" className={styles.titulo}>
            Pré-visualização
          </h2>
          {calculo && (
            <div className={styles.alternar} role="group" aria-label="Tipo de vista">
              {[
                ['3d', 'Peça em 3D'],
                ['corte', 'Corte com medidas'],
              ].map(([valor, rotulo]) => (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={vista === valor}
                  className={vista === valor ? styles.alternarAtivo : undefined}
                  onClick={() => setVista(valor)}
                >
                  {rotulo}
                </button>
              ))}
            </div>
          )}
        </div>
        {problema && <p className={styles.problema}>{problema}</p>}
        {!calculo && !problema && <PecaFantasma />}
        {calculo && (
          <>
            {vista === '3d' ? <Vista3D d={calculo.d} /> : <VistaLateral d={calculo.d} />}
            <dl className={styles.resumo}>
              <div>
                <dt>Altura total</dt>
                <dd>{cm(calculo.d.alturaTotal)}</dd>
              </div>
              <div>
                <dt>Diâmetro interno</dt>
                <dd>{cm(calculo.d.raioInterno * 2)}</dd>
              </div>
              <div>
                <dt>Volume (maciço)</dt>
                <dd>{formatNumber(calculo.d.volumeCm3, 1)} cm³</dd>
              </div>
              <div>
                <dt>{ajustes.tipo} (maciço)</dt>
                <dd>
                  {formatNumber(calculo.m.massaG, 0)} g · {formatNumber(calculo.m.filamentoM, 1)} m
                </dd>
              </div>
            </dl>
            <p className={styles.nota}>
              Massa da peça 100% preenchida, com densidade de {formatNumber(calculo.m.densidade, 2)} g/cm³ (
              {calculo.m.fonte}) e filamento de 1,75 mm. O fatiador calcula o valor final pelo preenchimento escolhido.
              Imprima de pé, com a base no prato: o cone de 45° dispensa suporte. O arquivo já sai no tamanho real (o
              fatiador lê em milímetros), então não precisa aumentar nem diminuir a escala.
            </p>
            <PillButton size="lg" onClick={baixar}>
              <DownloadIcon size={18} />
              Baixar arquivo STL
            </PillButton>
          </>
        )}
        {!petId && <p className={styles.nota}>Escolha o paciente e a medição para ver a peça e baixar o arquivo.</p>}
        {!medicao && petId && (
          <p className={styles.nota}>
            Este paciente ainda não tem medição. <Link to={`/protese-3d/medicao?pet=${petId}`}>Medir agora</Link>
          </p>
        )}
      </section>
    </div>
  )
}

/** Gradientes e formas da vista 3D; `id` separa os gradientes de duas vistas na mesma página. */
function Formas3D({ vista, id }) {
  return (
    <>
      <defs>
        <linearGradient id={`${id}-lateral`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0" stopColor="#7a4b2c" />
          <stop offset="0.28" stopColor="#e9c193" />
          <stop offset="0.45" stopColor="#d8a16b" />
          <stop offset="1" stopColor="#6e4329" />
        </linearGradient>
        <linearGradient id={`${id}-tampa`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#f6dfc0" />
          <stop offset="1" stopColor="#e2b685" />
        </linearGradient>
        <linearGradient id={`${id}-boca`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#2a1a11" />
          <stop offset="1" stopColor="#6b4329" />
        </linearGradient>
        <radialGradient id={`${id}-sombra`}>
          <stop offset="0" stopColor="#36241a" stopOpacity="0.28" />
          <stop offset="1" stopColor="#36241a" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-recorte`}>
          <path d={vista.recorteBoca} />
        </clipPath>
      </defs>
      {vista.formas.map((f, i) => (
        <path
          key={i}
          d={f.d}
          fill={`url(#${id}-${f.tipo === 'fundo' ? 'tampa' : f.tipo})`}
          className={styles[`forma-${f.tipo}`]}
          clipPath={f.tipo === 'fundo' ? `url(#${id}-recorte)` : undefined}
        />
      ))}
    </>
  )
}

/** Peça em perspectiva; arrastar na vertical inclina a câmera. */
function Vista3D({ d }) {
  const id = useId().replace(/:/g, '')
  const [inclinacao, setInclinacao] = useState(INCLINACAO.padrao)
  const arraste = useRef(null)
  const vista = vista3d(d, inclinacao)

  const mover = (e) => {
    if (!arraste.current) return
    const delta = (e.clientY - arraste.current.y) * 0.3
    setInclinacao(Math.min(INCLINACAO.maxima, Math.max(INCLINACAO.minima, arraste.current.inicio + delta)))
  }
  const teclado = (e) => {
    const passo = { ArrowUp: -4, ArrowDown: 4 }[e.key]
    if (!passo) return
    e.preventDefault()
    setInclinacao((v) => Math.min(INCLINACAO.maxima, Math.max(INCLINACAO.minima, v + passo)))
  }

  return (
    <div className={styles.palco}>
      <svg
        className={styles.desenho3d}
        viewBox={`0 0 ${vista.largura} ${vista.altura}`}
        role="img"
        tabIndex={0}
        aria-label={`Prótese em 3D, inclinada ${Math.round(vista.inclinacao)} graus. Use as setas para cima e para baixo para inclinar.`}
        onPointerDown={(e) => {
          arraste.current = { y: e.clientY, inicio: vista.inclinacao }
          e.currentTarget.setPointerCapture(e.pointerId)
        }}
        onPointerMove={mover}
        onPointerUp={() => (arraste.current = null)}
        onPointerCancel={() => (arraste.current = null)}
        onKeyDown={teclado}
      >
        <Formas3D vista={vista} id={id} />
      </svg>
      <p className={styles.dicaArraste}>Arraste para cima ou para baixo para inclinar a peça</p>
    </div>
  )
}

/** Silhueta clara da peça enquanto nenhuma medição foi escolhida. */
function PecaFantasma() {
  const id = useId().replace(/:/g, '')
  const exemplo = dimensoes({ larguraEncaixe: 4, alturaChao: 14, larguraPata: 5, folgaMm: 2, paredeMm: 3 })
  const vista = vista3d(exemplo)
  return (
    <div className={`${styles.palco} ${styles.fantasma}`} aria-hidden="true">
      <svg className={styles.desenho3d} viewBox={`0 0 ${vista.largura} ${vista.altura}`}>
        <Formas3D vista={vista} id={id} />
      </svg>
    </div>
  )
}

/** Desenho em escala, com as cotas principais. */
function VistaLateral({ d }) {
  const margem = 34
  const largura = d.raioBase * 2 + margem * 2 + 70
  const altura = d.alturaTotal + margem * 2
  const cx = margem + d.raioBase
  const y = (z) => altura - margem - z
  const topo = d.zFundoInterno + d.profundidade

  const contorno = [
    [cx - d.raioBase, y(0)],
    [cx - d.raioBase, y(d.alturaBase)],
    [cx - d.raioHaste, y(d.alturaBase)],
    [cx - d.raioHaste, y(d.zCone)],
    [cx - d.raioExterno, y(d.zFundo)],
    [cx - d.raioExterno, y(topo)],
    [cx - d.raioInterno, y(topo)],
    [cx - d.raioInterno, y(d.zFundoInterno)],
    [cx + d.raioInterno, y(d.zFundoInterno)],
    [cx + d.raioInterno, y(topo)],
    [cx + d.raioExterno, y(topo)],
    [cx + d.raioExterno, y(d.zFundo)],
    [cx + d.raioHaste, y(d.zCone)],
    [cx + d.raioHaste, y(d.alturaBase)],
    [cx + d.raioBase, y(d.alturaBase)],
    [cx + d.raioBase, y(0)],
  ]
  const xCota = cx + d.raioBase + 30

  return (
    <svg
      className={styles.desenho}
      viewBox={`0 0 ${largura} ${altura}`}
      role="img"
      aria-label={`Prótese com ${cm(d.alturaTotal)} de altura e soquete de ${cm(d.raioInterno * 2)}`}
    >
      <line x1="0" x2={largura} y1={y(0)} y2={y(0)} className={styles.chao} />
      <polygon points={contorno.map((p) => p.join(',')).join(' ')} className={styles.peca} />
      <line x1={xCota} x2={xCota} y1={y(0)} y2={y(d.zFundoInterno)} className={styles.cota} />
      <text x={xCota + 6} y={y(d.zFundoInterno / 2)} className={styles.textoCota}>
        {cm(d.zFundoInterno)}
      </text>
      <line x1={xCota} x2={xCota} y1={y(d.zFundoInterno)} y2={y(topo)} className={styles.cota} />
      <text x={xCota + 6} y={y(d.zFundoInterno + d.profundidade / 2)} className={styles.textoCota}>
        {cm(d.profundidade)}
      </text>
      <text x={cx} y={y(topo) - 10} textAnchor="middle" className={styles.textoCota}>
        Ø {cm(d.raioInterno * 2)}
      </text>
      <text x={cx} y={y(0) + 22} textAnchor="middle" className={styles.textoCota}>
        Ø {cm(d.raioBase * 2)}
      </text>
    </svg>
  )
}
