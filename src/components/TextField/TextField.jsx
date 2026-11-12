import { useId, useState } from 'react'
import { EyeIcon, EyeOffIcon } from '../Icons/Icons.jsx'
import styles from './TextField.module.css'

export function TextField({ label, icon: Icon, type = 'text', error, hint, className = '', ref, ...inputProps }) {
  const id = useId()
  const [visible, setVisible] = useState(false)
  const isPassword = type === 'password'
  const describedBy = [error && `${id}-erro`, hint && `${id}-dica`].filter(Boolean).join(' ') || undefined

  return (
    <div className={`${styles.campo} ${className}`}>
      <label htmlFor={id} className={styles.rotulo}>
        {label}
      </label>
      <div className={`${styles.caixa} ${error ? styles.caixaErro : ''}`}>
        {Icon && <Icon className={styles.icone} size={16} />}
        <input
          ref={ref}
          id={id}
          type={isPassword && visible ? 'text' : type}
          className={styles.entrada}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          spellCheck={isPassword || type === 'email' ? false : undefined}
          autoCapitalize={isPassword || type === 'email' ? 'none' : undefined}
          {...inputProps}
        />
        {isPassword && (
          <button
            type="button"
            className={styles.alternar}
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={visible}
            aria-controls={id}
          >
            {visible ? <EyeOffIcon size={17} /> : <EyeIcon size={17} />}
          </button>
        )}
      </div>
      {hint && !error && (
        <p id={`${id}-dica`} className={styles.dica}>
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-erro`} className={styles.erro}>
          {error}
        </p>
      )}
    </div>
  )
}
