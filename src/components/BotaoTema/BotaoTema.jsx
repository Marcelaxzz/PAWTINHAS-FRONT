import { useEffect, useState } from 'react'
import styles from './BotaoTema.module.css'

const CHAVE = 'pawtinhas-tema'
const COR_DA_BARRA = { claro: '#f4e6d3', escuro: '#1b1410' }

function temaAtual() {
  return document.documentElement.dataset.tema === 'escuro' ? 'escuro' : 'claro'
}

/** Lua no canto da tela: liga e desliga o modo escuro e lembra a escolha neste navegador. */
export function BotaoTema() {
  const [tema, setTema] = useState(temaAtual)
  const escuro = tema === 'escuro'

  useEffect(() => {
    if (escuro) document.documentElement.dataset.tema = 'escuro'
    else delete document.documentElement.dataset.tema
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', COR_DA_BARRA[tema])
    try {
      localStorage.setItem(CHAVE, tema)
    } catch {
      // Sem armazenamento: vale só até fechar a aba.
    }
  }, [tema, escuro])

  return (
    <button
      type="button"
      className={styles.botao}
      onClick={() => setTema(escuro ? 'claro' : 'escuro')}
      aria-pressed={escuro}
      aria-label={escuro ? 'Voltar para o modo claro' : 'Ativar o modo escuro'}
      title={escuro ? 'Modo claro' : 'Modo escuro'}
    >
      {escuro ? (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" fill="currentColor" />
          <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6" />
          </g>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path
            fill="currentColor"
            d="M20.2 14.6A8.6 8.6 0 0 1 9.4 3.8a.7.7 0 0 0-.9-.9A9.6 9.6 0 1 0 21.1 15.5a.7.7 0 0 0-.9-.9Z"
          />
        </svg>
      )}
    </button>
  )
}
