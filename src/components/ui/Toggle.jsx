import { useId } from 'react'
import styles from './Toggle.module.css'

/** Interruptor acessível (role="switch"). */
export function Toggle({ checked, onChange, label, description, disabled, hideLabel = false }) {
  const id = useId()

  return (
    <div className={styles.linha}>
      <span className={hideLabel ? 'visualmente-oculto' : styles.textos}>
        <label htmlFor={id} className={styles.rotulo}>
          {label}
        </label>
        {description && <span className={styles.descricao}>{description}</span>}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        className={`${styles.chave} ${checked ? styles.ligada : ''}`}
        onClick={() => onChange(!checked)}
        disabled={disabled}
      >
        <span className={styles.bolinha} aria-hidden="true" />
      </button>
    </div>
  )
}
