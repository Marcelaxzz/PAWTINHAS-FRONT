import { useCallback, useEffect, useRef, useState } from 'react'
import { Dialog } from '../ui/Dialog.jsx'
import { PillButton } from '../ui/PillButton.jsx'
import { dataService } from '../../services/dataService.js'
import { tocaEm } from '../../utils/alarmes.js'
import {
  aoMudaremAlarmes,
  liberarSom,
  notificar,
  reservarMinuto,
  tocarNoNavegador,
  tocarSom,
} from './alarmesNoNavegador.js'
import styles from './AlarmesNoNavegador.module.css'

const MINUTO = 60_000
const doisDigitos = (n) => String(n).padStart(2, '0')

/**
 * Com o painel aberto (mesmo em outra aba), toca os alarmes ativos no horário: som, aviso na tela
 * e notificação do sistema. Usa as mesmas regras do ESP32 e do app (utils/alarmes.js).
 */
export function AlarmesNoNavegador() {
  const [tocando, setTocando] = useState(null)
  const alarmes = useRef([])
  const ultimoMinuto = useRef(null)
  const pararSom = useRef(null)
  const notificacao = useRef(null)

  // Lista de alarmes: ao abrir, a cada minuto, ao voltar para a aba e quando uma tela avisa que mudou.
  useEffect(() => {
    let ativo = true
    const carregar = async () => {
      if (!tocarNoNavegador()) {
        alarmes.current = []
        return
      }
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

  // O navegador só deixa tocar som depois de um clique ou tecla na página.
  useEffect(() => {
    const liberar = () => liberarSom()
    window.addEventListener('pointerdown', liberar, { once: true })
    window.addEventListener('keydown', liberar, { once: true })
    return () => {
      window.removeEventListener('pointerdown', liberar)
      window.removeEventListener('keydown', liberar)
    }
  }, [])

  const parar = useCallback(() => {
    pararSom.current?.()
    pararSom.current = null
    notificacao.current?.close()
    notificacao.current = null
    setTocando(null)
  }, [])

  useEffect(() => () => pararSom.current?.(), [])

  // Confere a cada 5 s. Se a aba ficou parada em segundo plano, confere os minutos que passaram (até 5).
  useEffect(() => {
    const disparar = (lista, quando) => {
      pararSom.current?.()
      pararSom.current = tocarSom()
      notificacao.current?.close()
      const titulo = `⏰ ${lista.map((a) => a.nome).join(', ')}`
      const texto = lista
        .map((a) => [a.petNome, a.descricao].filter(Boolean).join(': '))
        .filter(Boolean)
        .join('\n')
      notificacao.current = notificar(titulo, texto || 'Hora do alarme.')
      if (notificacao.current) notificacao.current.onclick = () => window.focus()
      setTocando({ lista, hora: `${doisDigitos(quando.getHours())}:${doisDigitos(quando.getMinutes())}` })
    }

    const conferir = () => {
      const agora = Math.floor(Date.now() / MINUTO)
      if (agora < ultimoMinuto.current) ultimoMinuto.current = agora - 1 // relógio do computador voltou
      for (let m = Math.max(ultimoMinuto.current + 1, agora - 5); m <= agora; m++) {
        const quando = new Date(m * MINUTO)
        const lista = alarmes.current.filter((a) => tocaEm(a, quando))
        if (lista.length > 0 && tocarNoNavegador() && reservarMinuto(m)) disparar(lista, quando)
      }
      ultimoMinuto.current = agora
    }
    // Começa no minuto atual: abrir o painel não toca alarmes que já passaram.
    ultimoMinuto.current = Math.floor(Date.now() / MINUTO)
    const intervalo = setInterval(conferir, 5000)
    return () => clearInterval(intervalo)
  }, [])

  return (
    <Dialog
      open={Boolean(tocando)}
      onClose={parar}
      title={tocando ? `Alarme das ${tocando.hora}` : ''}
      tone="escuro"
      footer={
        <PillButton size="lg" onClick={parar} autoFocus>
          Desligar
        </PillButton>
      }
    >
      {tocando && (
        <ul className={styles.lista} aria-live="assertive">
          {tocando.lista.map((a) => (
            <li key={a.id}>
              <strong>{a.nome}</strong>
              {a.petNome && <span>{a.petNome}</span>}
              {a.descricao && <p>{a.descricao}</p>}
            </li>
          ))}
        </ul>
      )}
    </Dialog>
  )
}
