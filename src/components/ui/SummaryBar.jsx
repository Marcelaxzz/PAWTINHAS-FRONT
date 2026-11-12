import styles from './SummaryBar.module.css'

/** Barra de resumo no rodapé das listas ("Resumo de cirurgias…"). */
export function SummaryBar({ icon, children, actions, className = '' }) {
  return (
    <section className={`${styles.barra} ${className}`} aria-label="Resumo">
      {icon && (
        <span className={styles.icone} aria-hidden="true">
          {icon}
        </span>
      )}
      <p className={styles.texto}>{children}</p>
      {actions && <div className={styles.acoes}>{actions}</div>}
    </section>
  )
}
