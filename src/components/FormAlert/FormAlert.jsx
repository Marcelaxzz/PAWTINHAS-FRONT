import { AlertIcon, CheckIcon } from '../Icons/Icons.jsx'
import styles from './FormAlert.module.css'

export function FormAlert({ tone = 'erro', children }) {
  if (!children) return null
  const Icon = tone === 'sucesso' ? CheckIcon : AlertIcon

  return (
    <div className={`${styles.alerta} ${styles[tone]}`} role={tone === 'erro' ? 'alert' : 'status'}>
      <Icon size={16} className={styles.icone} />
      <p>{children}</p>
    </div>
  )
}
