import { useId } from 'react'
import { CheckIcon } from '../Icons/Icons.jsx'
import styles from './Checkbox.module.css'

export function Checkbox({ label, checked, onChange, ...props }) {
  const id = useId()

  return (
    <label htmlFor={id} className={styles.checkbox}>
      <input
        id={id}
        type="checkbox"
        className={styles.nativo}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        {...props}
      />
      <span className={styles.caixa} aria-hidden="true">
        <CheckIcon size={11} strokeWidth={3} className={styles.marca} />
      </span>
      <span className={styles.texto}>{label}</span>
    </label>
  )
}
