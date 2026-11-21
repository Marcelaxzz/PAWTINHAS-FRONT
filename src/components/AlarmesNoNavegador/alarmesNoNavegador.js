/**
 * Alarmes tocando no navegador: preferência deste aparelho, aviso de "lista mudou",
 * som (Web Audio, sem arquivo) e notificação do sistema.
 */

const CHAVE_LIGADO = 'pawtinhas.alarmesNoNavegador'
const CHAVE_ULTIMO = 'pawtinhas.alarmesNoNavegador.ultimoMinuto'
const EVENTO = 'pawtinhas:alarmes-mudaram'

export const TOCAR_POR_MS = 45_000

function ler(chave) {
  try {
    return localStorage.getItem(chave)
  } catch {
    return null
  }
}

function gravar(chave, valor) {
  try {
    localStorage.setItem(chave, valor)
  } catch {
    // Modo privado ou armazenamento bloqueado: vale só enquanto a página estiver aberta.
  }
}

/** Ligado por padrão. */
export const tocarNoNavegador = () => ler(CHAVE_LIGADO) !== 'nao'

export function definirTocarNoNavegador(ligado) {
  gravar(CHAVE_LIGADO, ligado ? 'sim' : 'nao')
  avisarAlarmesMudaram()
}

/** Telas de alarme chamam depois de salvar, pausar ou excluir: o navegador busca a lista de novo. */
export function avisarAlarmesMudaram() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVENTO))
}

export function aoMudaremAlarmes(ouvinte) {
  window.addEventListener(EVENTO, ouvinte)
  return () => window.removeEventListener(EVENTO, ouvinte)
}

/**
 * Com o painel aberto em mais de uma aba, só uma toca: a primeira que marcar o minuto.
 * Devolve false se outra aba já tocou esse minuto.
 */
export function reservarMinuto(minuto) {
  if (Number(ler(CHAVE_ULTIMO)) >= minuto) return false
  gravar(CHAVE_ULTIMO, String(minuto))
  return true
}

// ---------- Notificação do sistema ----------

export const notificacaoSuportada = () => typeof window !== 'undefined' && 'Notification' in window

export const permissaoNotificacao = () => (notificacaoSuportada() ? Notification.permission : 'denied')

export async function pedirPermissaoNotificacao() {
  if (!notificacaoSuportada()) return 'denied'
  if (Notification.permission !== 'default') return Notification.permission
  try {
    return await Notification.requestPermission()
  } catch {
    return 'denied'
  }
}

const TAG_ALARME = 'pawtinhas-alarme'
const MENSAGEM_PARAR = 'pawtinhas-parar-alarme'
let registro = null

/** Registra o service worker dos alarmes (é ele que põe o botão "Desligar alarme" na notificação do sistema). */
export function prepararNotificacoes() {
  if (registro || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return registro
  registro = navigator.serviceWorker.register('/sw-alarmes.js', { scope: '/' }).catch(() => null)
  return registro
}

/**
 * Notificação do sistema (canto da tela, mesmo com o navegador em outra aba ou minimizado) com o botão
 * "Desligar alarme". Devolve uma função que fecha a notificação.
 */
export async function notificar(titulo, texto, minuto) {
  if (permissaoNotificacao() !== 'granted') return () => {}
  const opcoes = { body: texto, tag: TAG_ALARME, requireInteraction: true, renotify: true, icon: '/favicon.png' }
  try {
    const sw = await prepararNotificacoes()
    if (sw?.showNotification) {
      await sw.showNotification(titulo, {
        ...opcoes,
        data: { minuto },
        actions: [{ action: 'parar', title: 'Desligar alarme' }],
      })
      return () =>
        sw
          .getNotifications({ tag: TAG_ALARME })
          .then((lista) => lista.forEach((n) => n.close()))
          .catch(() => {})
    }
  } catch {
    // Sem service worker: cai na notificação simples (sem botão; o clique traz o painel para a frente).
  }
  try {
    const simples = new Notification(titulo, opcoes)
    simples.onclick = () => window.focus()
    return () => simples.close()
  } catch {
    return () => {}
  }
}

/** "Desligar alarme" apertado na notificação do sistema. */
export function aoPedirParadaPelaNotificacao(ouvinte) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return () => {}
  const receber = (evento) => {
    if (evento.data?.tipo === MENSAGEM_PARAR) ouvinte(evento.data.minuto)
  }
  navigator.serviceWorker.addEventListener('message', receber)
  navigator.serviceWorker.startMessages?.()
  return () => navigator.serviceWorker.removeEventListener('message', receber)
}

// ---------- Som ----------

let contexto = null

/**
 * O navegador só libera som depois de um clique na página. Esta função é chamada no primeiro clique
 * (e nos botões de ligar e testar), para o alarme conseguir tocar depois sozinho.
 */
export function liberarSom() {
  const Contexto = window.AudioContext || window.webkitAudioContext
  if (!Contexto) return null
  contexto ??= new Contexto()
  if (contexto.state === 'suspended') contexto.resume().catch(() => {})
  return contexto
}

export const somLiberado = () => contexto?.state === 'running'

/** Toca bipes em ciclo até chamar a função devolvida (ou passar `duracaoMs`). */
export function tocarSom(duracaoMs = TOCAR_POR_MS) {
  const ctx = liberarSom()
  if (!ctx) return () => {}
  const volume = ctx.createGain()
  volume.gain.value = 0.25
  volume.connect(ctx.destination)

  // Ciclo de 2 s: dois bipes de 0,35 s, como o buzzer do ESP32.
  const fim = ctx.currentTime + duracaoMs / 1000
  for (let t = ctx.currentTime + 0.05; t < fim; t += 2) {
    for (const atraso of [0, 0.5]) {
      const osc = ctx.createOscillator()
      osc.type = 'square'
      osc.frequency.value = 880
      const env = ctx.createGain()
      env.gain.setValueAtTime(0, t + atraso)
      env.gain.linearRampToValueAtTime(1, t + atraso + 0.01)
      env.gain.setValueAtTime(1, t + atraso + 0.34)
      env.gain.linearRampToValueAtTime(0, t + atraso + 0.35)
      osc.connect(env).connect(volume)
      osc.start(t + atraso)
      osc.stop(t + atraso + 0.36)
    }
  }
  return () => {
    volume.gain.cancelScheduledValues(ctx.currentTime)
    volume.gain.setValueAtTime(0, ctx.currentTime)
    volume.disconnect()
  }
}

/** Um bipe curto, para conferir o volume. */
export function bipeDeTeste() {
  const parar = tocarSom(400)
  setTimeout(parar, 450)
}
