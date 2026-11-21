import { useEffect } from 'react'

const CONFERIR_A_CADA_MS = 3 * 60_000
/** Só recarrega com a aba aberta se ninguém mexeu na página nesse tempo. */
const PARADO_HA_MS = 2 * 60_000

/** Arquivo JavaScript principal de uma página (muda a cada publicação do site). */
function scriptPrincipal(html) {
  return /<script[^>]*type="module"[^>]*src="([^"]+)"/.exec(html)?.[1] ?? null
}

/**
 * Abas abertas há muito tempo continuam rodando a versão antiga do site. Este componente confere de tempos
 * em tempos se saiu uma versão nova e recarrega a página sozinho: na hora, se a aba estiver em segundo
 * plano; com ela na tela, só quando ninguém estiver mexendo, sem formulário em uso e sem alarme tocando.
 */
export function AtualizacaoAutomatica() {
  useEffect(() => {
    if (import.meta.env.DEV) return undefined
    const atual = scriptPrincipal(document.documentElement.outerHTML)
    if (!atual) return undefined

    let versaoNova = false
    let ultimoUso = Date.now()
    const usou = () => {
      ultimoUso = Date.now()
    }

    const podeRecarregar = () => {
      if (document.querySelector('[role="alertdialog"]')) return false // alarme tocando
      if (document.visibilityState === 'hidden') return true
      const emUso = document.activeElement?.matches?.('input, textarea, select, [contenteditable="true"]')
      return !emUso && !document.querySelector('dialog[open]') && Date.now() - ultimoUso > PARADO_HA_MS
    }

    const conferir = async () => {
      if (!versaoNova) {
        try {
          const resposta = await fetch('/', { cache: 'no-store' })
          const publicado = scriptPrincipal(await resposta.text())
          versaoNova = Boolean(publicado && publicado !== atual)
        } catch {
          return
        }
      }
      if (versaoNova && podeRecarregar()) window.location.reload()
    }

    const intervalo = setInterval(conferir, CONFERIR_A_CADA_MS)
    const mudouVisibilidade = () => conferir()
    document.addEventListener('visibilitychange', mudouVisibilidade)
    window.addEventListener('pointerdown', usou, { passive: true })
    window.addEventListener('keydown', usou)
    return () => {
      clearInterval(intervalo)
      document.removeEventListener('visibilitychange', mudouVisibilidade)
      window.removeEventListener('pointerdown', usou)
      window.removeEventListener('keydown', usou)
    }
  }, [])

  return null
}
