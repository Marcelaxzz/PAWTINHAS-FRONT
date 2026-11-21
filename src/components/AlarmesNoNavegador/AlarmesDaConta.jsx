import { lazy, Suspense } from 'react'
import { useAuth } from '../../hooks/useAuth.js'

const AlarmesNoNavegador = lazy(() =>
  import('./AlarmesNoNavegador.jsx').then((m) => ({ default: m.AlarmesNoNavegador })),
)

/** Alarmes tocando em qualquer página do site (painel, adoção, sobre...) enquanto a conta estiver logada. */
export function AlarmesDaConta() {
  const { status } = useAuth()
  if (status !== 'autenticado') return null
  return (
    <Suspense fallback={null}>
      <AlarmesNoNavegador />
    </Suspense>
  )
}
