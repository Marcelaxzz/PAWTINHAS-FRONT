import styles from './Button.module.css'

/**
 * Botão principal das telas de acesso: pílula com o gradiente café.
 * tone="ferrugem" fica disponível para destaques pontuais.
 */
export function Button({ children, tone = 'cafe', loading = false, loadingText, disabled, className = '', ...props }) {
  return (
    <button
      type="submit"
      className={`${styles.botao} ${styles[tone]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <span className={styles.spinner} aria-hidden="true" />}
      <span>{loading && loadingText ? loadingText : children}</span>
    </button>
  )
}
