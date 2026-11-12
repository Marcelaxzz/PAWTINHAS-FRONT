import { useCallback, useEffect, useState } from 'react'

const KEY = 'pawtinhas:favoritos'
const ID_RE = /^[a-z0-9-]{1,64}$/i

function read() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string' && ID_RE.test(id)).slice(0, 200) : []
  } catch {
    return []
  }
}

/** Favoritos do visitante, guardados só no navegador (não exige login). */
export function useFavorites() {
  const [ids, setIds] = useState(read)

  useEffect(() => {
    const sync = (event) => {
      if (event.key === KEY) setIds(read())
    }
    window.addEventListener('storage', sync)
    return () => window.removeEventListener('storage', sync)
  }, [])

  const toggle = useCallback((id) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
      try {
        localStorage.setItem(KEY, JSON.stringify(next))
      } catch {
        /* sem storage: mantém só nesta sessão */
      }
      return next
    })
  }, [])

  return { ids, isFavorite: (id) => ids.includes(id), toggle }
}
