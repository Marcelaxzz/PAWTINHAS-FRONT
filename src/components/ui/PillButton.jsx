import { Link } from 'react-router-dom'
import styles from './PillButton.module.css'

/**
 * Botão em pílula das telas internas.
 * variant: solido | contorno | sucesso | fantasma | perigo
 * size: sm | md | lg
 * Com `to` vira um <Link>; com `href` vira link externo seguro.
 */
export function PillButton({
  variant = 'solido',
  size = 'md',
  to,
  href,
  className = '',
  children,
  type = 'button',
  loading = false,
  disabled,
  ...props
}) {
  const classes = `${styles.botao} ${styles[variant]} ${styles[size]} ${className}`

  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    )
  }

  if (href) {
    return (
      <a href={href} className={classes} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    )
  }

  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      {children}
    </button>
  )
}
