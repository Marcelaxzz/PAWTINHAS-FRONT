import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Volta ao topo ao trocar de página ou rola até a âncora (#secao) quando houver. */
export function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0)
      return undefined
    }
    // Espera a página (carregada sob demanda) renderizar a seção.
    let tries = 0
    const id = setInterval(() => {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)))
      tries += 1
      if (target || tries > 20) {
        clearInterval(id)
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
    return () => clearInterval(id)
  }, [pathname, hash])

  return null
}
