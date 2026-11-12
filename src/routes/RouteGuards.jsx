import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth.js'
import { HOME_PATH } from '../services/authService.js'
import { LoadingScreen } from '../components/LoadingScreen/LoadingScreen.jsx'

/**
 * Exige a sessão da veterinária. A checagem aqui é só de interface:
 * o backend valida o token e o papel em cada requisição.
 */
export function PrivateRoute() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'carregando') return <LoadingScreen />
  if (status !== 'autenticado') {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}

/** Telas de login e redefinição: quem já está logado vai direto para o painel. */
export function GuestRoute() {
  const { status } = useAuth()

  if (status === 'carregando') return <LoadingScreen />
  if (status === 'autenticado') return <Navigate to={HOME_PATH} replace />
  return <Outlet />
}
