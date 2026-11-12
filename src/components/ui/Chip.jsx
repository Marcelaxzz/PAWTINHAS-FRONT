import { statusTone } from '../../utils/status.js'
import styles from './Chip.module.css'

/**
 * Etiquetas de status, idade, raça e serviço.
 * tone: neutro (idade/raça), tag (serviço), sucesso, perigo, alerta, info
 */
export function Chip({ tone = 'neutro', size = 'md', children, className = '' }) {
  return <span className={`${styles.chip} ${styles[tone]} ${styles[size]} ${className}`}>{children}</span>
}

export function StatusChip({ status, size = 'sm' }) {
  return (
    <Chip tone={statusTone(status)} size={size}>
      {status}
    </Chip>
  )
}
