import { useId } from 'react'
import { ChevronDownIcon } from '../Icons/Icons.jsx'
import styles from './Field.module.css'

/**
 * Campo de formulário das telas internas (Nova Cirurgia, Novo Alarme…).
 * as: input | select | textarea
 */
export function Field({
  label,
  as = 'input',
  options = [],
  placeholder,
  error,
  hint,
  icon: Icon,
  span = 1,
  required,
  className = '',
  variant = 'branco',
  caps = false,
  ...props
}) {
  const id = useId()
  const describedBy = [error && `${id}-erro`, hint && `${id}-dica`].filter(Boolean).join(' ') || undefined
  const common = {
    id,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy,
    'aria-required': required || undefined,
    ...props,
  }

  return (
    <div className={`${styles.campo} ${span === 2 ? styles.inteiro : ''} ${className}`}>
      <label htmlFor={id} className={`${styles.rotulo} ${caps ? styles.caps : ''}`}>
        {label}
        {required && (
          <span className={styles.obrigatorio} aria-hidden="true">
            {' '}
            *
          </span>
        )}
      </label>

      <div
        className={`${styles.caixa} ${styles[variant]} ${error ? styles.erroCaixa : ''} ${as === 'textarea' ? styles.caixaTexto : ''}`}
      >
        {Icon && <Icon size={16} className={styles.icone} />}
        {as === 'select' ? (
          <>
            <select
              className={`${styles.controle} ${styles.select} ${props.value === '' ? styles.vazio : ''}`}
              {...common}
            >
              {placeholder && (
                <option value="" disabled>
                  {placeholder}
                </option>
              )}
              {options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon size={16} className={styles.seta} />
          </>
        ) : as === 'textarea' ? (
          <textarea className={`${styles.controle} ${styles.textarea}`} placeholder={placeholder} {...common} />
        ) : (
          <input className={styles.controle} placeholder={placeholder} {...common} />
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

/** Grade de duas colunas usada nos formulários. */
export function FieldGrid({ children, className = '' }) {
  return <div className={`${styles.grade} ${className}`}>{children}</div>
}
