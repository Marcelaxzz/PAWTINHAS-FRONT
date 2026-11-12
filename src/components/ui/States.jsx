import { AlertIcon } from '../Icons/Icons.jsx'
import styles from './States.module.css'

export function LoadingState({ label = 'Carregando…' }) {
  return (
    <div className={styles.estado} role="status">
      <span className={styles.spinner} aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className={`${styles.estado} ${styles.erro}`} role="alert">
      <AlertIcon size={28} />
      <p>{message}</p>
      {onRetry && (
        <button type="button" className={styles.botao} onClick={onRetry}>
          Tentar novamente
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, children, action }) {
  return (
    <div className={styles.estado}>
      <p className={styles.titulo}>{title}</p>
      {children && <p className={styles.texto}>{children}</p>}
      {action}
    </div>
  )
}
