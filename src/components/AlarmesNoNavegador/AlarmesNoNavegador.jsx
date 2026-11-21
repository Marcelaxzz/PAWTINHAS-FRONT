import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ClockIcon } from '../Icons/Icons.jsx'
import { dataService } from '../../services/dataService.js'
import { paradasAlarmeService } from '../../services/gestaoService.js'
import { ONDE_PAROU, minutoDoToque, paradaDoToque, tocaEm } from '../../utils/alarmes.js'
import {
  TOCAR_POR_MS,
  aoMudaremAlarmes,
  aoPedirParadaPelaNotificacao,
  liberarSom,
  notificar,
  pedirPermissaoNotificacao,
  permissaoNotificacao,
  prepararNotificacoes,
  reservarMinuto,
  tocarNoNavegador,
  tocarSom,
} from './alarmesNoNavegador.js'
import styles from './AlarmesNoNavegador.module.css'

const MINUTO = 60_000
/** De quanto em quanto tempo, enquanto toca, pergunta ao servidor se alguém parou em outro aparelho. */
const CONFERIR_PARADA_MS = 2500
/** Quanto tempo o aviso "Parado na caixinha" fica na tela antes de sumir. */
const MOSTRAR_PARADO_MS = 3000
const doisDigitos = (n) => String(n).padStart(2, '0')

function abrirCanal() {
  try {
    return typeof BroadcastChannel === 'undefined' ? null : new BroadcastChannel('pawtinhas-alarmes')
  } catch {
    return null
  }
}

/** Janela modal aberta por cima da página (formulário, confirmação...), ou null. */
function modalAberto() {
  const abertos = [...document.querySelectorAll('dialog[open]')].filter((d) => {
    try {
      return d.matches(':modal')
    } catch {
      return false
    }
  })
  return abertos.at(-1) ?? null
}

/**
 * Onde o aviso é desenhado. Uma janela modal aberta deixa o resto da página inerte (sem clique),
 * então, enquanto houver uma, o aviso vai para dentro dela e continua clicável, no mesmo canto da tela.
 */
function useLugarDoAviso(ativo) {
  const [lugar, setLugar] = useState(null)
  useEffect(() => {
    if (!ativo) return undefined
    const atualizar = () => setLugar(modalAberto() ?? document.body)
    atualizar()
    const observador = new MutationObserver(atualizar)
    observador.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] })
    return () => observador.disconnect()
  }, [ativo])
  return lugar ?? document.body
}

/**
 * Com a conta logada (em qualquer página e em qualquer aba), mostra no canto da tela o alarme que está
 * tocando, com o botão "Parar alarme". Também aparece como notificação do sistema (Windows, Mac, Android),
 * com o botão "Desligar alarme", para quem estiver em outra aba ou em outro programa.
 * Parar aqui para também no app, na caixinha ESP32 e nas outras abas; parar lá fecha o aviso aqui.
 * O som toca numa aba só por navegador e só se "Tocar neste navegador" estiver ligado.
 * Usa as mesmas regras de horário do ESP32 e do app (utils/alarmes.js).
 */
export function AlarmesNoNavegador() {
  const [toque, setToque] = useState(null)
  const toqueAtual = useRef(null)
  const alarmes = useRef([])
  const ultimoMinuto = useRef(null)
  const pararSom = useRef(null)
  const fecharNotificacao = useRef(null)
  const canal = useRef(null)
  const lugar = useLugarDoAviso(Boolean(toque))

  useEffect(() => {
    toqueAtual.current = toque
  }, [toque])

  useEffect(() => {
    prepararNotificacoes()
  }, [])

  // Lista de alarmes: ao abrir, a cada minuto, ao voltar para a aba e quando uma tela avisa que mudou.
  useEffect(() => {
    let ativo = true
    const carregar = async () => {
      try {
        const lista = await dataService.list('alarmes')
        if (ativo) alarmes.current = lista.filter((a) => a.ativo)
      } catch {
        // Sem conexão: continua com a última lista.
      }
    }
    carregar()
    const intervalo = setInterval(carregar, MINUTO)
    const pararDeOuvir = aoMudaremAlarmes(carregar)
    const voltou = () => document.visibilityState === 'visible' && carregar()
    document.addEventListener('visibilitychange', voltou)
    return () => {
      ativo = false
      clearInterval(intervalo)
      pararDeOuvir()
      document.removeEventListener('visibilitychange', voltou)
    }
  }, [])

  // O navegador só deixa tocar som (e pedir para mostrar notificações) depois de um clique ou tecla na página.
  useEffect(() => {
    const liberar = () => {
      liberarSom()
      if (permissaoNotificacao() === 'default') pedirPermissaoNotificacao()
    }
    window.addEventListener('pointerdown', liberar, { once: true })
    window.addEventListener('keydown', liberar, { once: true })
    return () => {
      window.removeEventListener('pointerdown', liberar)
      window.removeEventListener('keydown', liberar)
    }
  }, [])

  const silenciar = useCallback(() => {
    pararSom.current?.()
    pararSom.current = null
    fecharNotificacao.current?.()
    fecharNotificacao.current = null
  }, [])

  const fechar = useCallback(() => {
    silenciar()
    setToque(null)
  }, [silenciar])

  useEffect(() => silenciar, [silenciar])

  /** Para aqui, nas outras abas, no app e na caixinha. */
  const parar = useCallback(() => {
    const atual = toqueAtual.current
    if (!atual || atual.paradoOnde) return
    fechar()
    canal.current?.postMessage({ tipo: 'parado', minuto: atual.minuto })
    paradasAlarmeService
      .parar(
        atual.lista.map((a) => a.id),
        atual.minuto,
        'painel',
      )
      .catch(() => {
        // Sem conexão: parou aqui; o app e a caixinha param sozinhos no fim do toque.
      })
  }, [fechar])

  // Outra aba deste navegador parou: fecha aqui na hora, sem esperar o servidor.
  useEffect(() => {
    canal.current = abrirCanal()
    if (!canal.current) return undefined
    canal.current.onmessage = ({ data }) => {
      const atual = toqueAtual.current
      if (data?.tipo === 'parado' && atual && Math.abs(atual.minuto - data.minuto) <= 1) fechar()
    }
    return () => {
      canal.current?.close()
      canal.current = null
    }
  }, [fechar])

  // "Desligar alarme" apertado na notificação do sistema.
  useEffect(
    () =>
      aoPedirParadaPelaNotificacao((minuto) => {
        const atual = toqueAtual.current
        if (atual && (minuto === undefined || Math.abs(atual.minuto - minuto) <= 1)) parar()
      }),
    [parar],
  )

  // Confere a cada 5 s. Se a aba ficou parada em segundo plano, confere os minutos que passaram (até 5).
  useEffect(() => {
    const disparar = (lista, quando) => {
      const minuto = minutoDoToque(quando)
      const hora = `${doisDigitos(quando.getHours())}:${doisDigitos(quando.getMinutes())}`
      silenciar()
      // Várias abas abertas: todas mostram o aviso na página, mas só a primeira toca e mostra a notificação.
      if (reservarMinuto(minuto)) {
        if (tocarNoNavegador()) pararSom.current = tocarSom()
        const titulo = `⏰ ${lista.map((a) => a.nome).join(', ')}`
        const detalhes = lista
          .map((a) => [a.petNome, a.descricao].filter(Boolean).join(': '))
          .filter(Boolean)
          .join('\n')
        notificar(titulo, [`Alarme das ${hora}`, detalhes].filter(Boolean).join('\n'), minuto).then((fecharEla) => {
          // Se já pararam enquanto a notificação abria, fecha na hora.
          if (toqueAtual.current?.minuto === minuto && !toqueAtual.current.paradoOnde)
            fecharNotificacao.current = fecharEla
          else fecharEla()
        })
      }
      setToque({ minuto, lista, hora, paradoOnde: null })
    }

    const conferir = () => {
      const agora = Math.floor(Date.now() / MINUTO)
      if (agora < ultimoMinuto.current) ultimoMinuto.current = agora - 1 // relógio do computador voltou
      for (let m = Math.max(ultimoMinuto.current + 1, agora - 5); m <= agora; m++) {
        const quando = new Date(m * MINUTO)
        const lista = alarmes.current.filter((a) => tocaEm(a, quando))
        if (lista.length > 0) disparar(lista, quando)
      }
      ultimoMinuto.current = agora
    }
    // Começa no minuto atual: abrir o painel não toca alarmes que já passaram.
    ultimoMinuto.current = Math.floor(Date.now() / MINUTO)
    const intervalo = setInterval(conferir, 5000)
    return () => clearInterval(intervalo)
  }, [silenciar])

  const minutoTocando = toque && !toque.paradoOnde ? toque.minuto : null
  const idsTocando = toque?.lista.map((a) => a.id).join(',')

  // Ninguém parou: o aviso some junto com o som, depois de TOCAR_POR_MS.
  useEffect(() => {
    if (minutoTocando === null) return undefined
    const fim = setTimeout(fechar, TOCAR_POR_MS)
    return () => clearTimeout(fim)
  }, [minutoTocando, fechar])

  // Enquanto toca, pergunta ao servidor se alguém parou no app, na caixinha ou em outro computador.
  useEffect(() => {
    if (minutoTocando === null) return undefined
    const ids = idsTocando.split(',').map(Number)
    let ativo = true
    const conferir = async () => {
      try {
        const parada = paradaDoToque(await paradasAlarmeService.recentes(), ids, minutoTocando)
        if (!ativo || !parada) return
        silenciar()
        setToque((atual) => (atual?.minuto === minutoTocando ? { ...atual, paradoOnde: parada.origem } : atual))
      } catch {
        // Sem conexão: continua tocando até alguém parar aqui ou o tempo acabar.
      }
    }
    conferir()
    const intervalo = setInterval(conferir, CONFERIR_PARADA_MS)
    return () => {
      ativo = false
      clearInterval(intervalo)
    }
  }, [minutoTocando, idsTocando, silenciar])

  // "Parado na caixinha" fica alguns segundos e some.
  useEffect(() => {
    if (!toque?.paradoOnde) return undefined
    const fim = setTimeout(() => setToque(null), MOSTRAR_PARADO_MS)
    return () => clearTimeout(fim)
  }, [toque?.paradoOnde])

  if (!toque) return null

  const parado = Boolean(toque.paradoOnde)

  return createPortal(
    <div
      className={`${styles.aviso} ${parado ? styles.parado : ''}`}
      role="alertdialog"
      aria-labelledby="alarme-tocando-titulo"
      aria-describedby="alarme-tocando-lista"
    >
      <div className={styles.topo}>
        <span className={styles.icone} aria-hidden="true">
          <ClockIcon size={20} />
        </span>
        <div className={styles.cabecalho}>
          <p className={styles.situacao} aria-live="assertive">
            {parado ? `Desligado ${ONDE_PAROU[toque.paradoOnde] ?? 'em outro aparelho'}` : 'Tocando agora'}
          </p>
          <h2 id="alarme-tocando-titulo" className={styles.titulo}>
            Alarme das {toque.hora}
          </h2>
        </div>
      </div>

      <ul id="alarme-tocando-lista" className={styles.lista}>
        {toque.lista.map((a) => (
          <li key={a.id}>
            <strong>{a.nome}</strong>
            {(a.petNome || a.descricao) && <span>{[a.petNome, a.descricao].filter(Boolean).join(' · ')}</span>}
          </li>
        ))}
      </ul>

      {!parado && (
        <>
          <button type="button" className={styles.parar} onClick={parar}>
            Desligar alarme
          </button>
          <p className={styles.nota}>Desliga também no app e na caixinha.</p>
          <span className={styles.tempo} style={{ animationDuration: `${TOCAR_POR_MS}ms` }} aria-hidden="true" />
        </>
      )}
    </div>,
    lugar,
  )
}
