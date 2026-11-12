import styles from './PageHeading.module.css'

/** Título das páginas internas, com subtítulo opcional. */
export function PageHeading({ title, subtitle }) {
  return (
    <header className={styles.cabecalho}>
      <h1 className={styles.titulo}>{title}</h1>
      {subtitle && <p className={styles.subtitulo}>{subtitle}</p>}
    </header>
  )
}
