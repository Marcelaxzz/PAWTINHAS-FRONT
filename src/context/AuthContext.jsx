import { useCallback, useEffect, useMemo, useState } from 'react'
import { authService } from '../services/authService.js'
import { SESSION_EXPIRED_EVENT } from '../services/http.js'
import { AuthContext } from './authContext.js'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState('carregando')

  useEffect(() => {
    let active = true
    authService
      .me()
      .then(({ user: current }) => {
        if (!active) return
        // Visitante sem sessão: a API responde { user: null }.
        setUser(current ?? null)
        setStatus(current ? 'autenticado' : 'anonimo')
      })
      .catch(() => {
        if (!active) return
        setUser(null)
        setStatus('anonimo')
      })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const expire = () => {
      setUser(null)
      setStatus('anonimo')
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, expire)
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expire)
  }, [])

  const completeSignIn = useCallback((signedUser) => {
    setUser(signedUser)
    setStatus('autenticado')
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      setUser(null)
      setStatus('anonimo')
    }
  }, [])

  const value = useMemo(() => ({ user, status, completeSignIn, logout }), [user, status, completeSignIn, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
