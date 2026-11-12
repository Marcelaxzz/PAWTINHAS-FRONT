import styles from './FotoInteira.module.css'

/**
 * Foto que nunca corta o animal: a imagem inteira (contain) sobre uma cópia desfocada dela mesma,
 * que preenche as sobras da moldura. As fotos da adoção chegam em qualquer proporção (em pé,
 * deitadas, quadradas); com "cover" a cabeça do bicho ficava de fora.
 */
export function FotoInteira({ src, alt, className = '', loading = 'lazy', children }) {
  return (
    <div className={`${styles.moldura} ${className}`}>
      {src ? (
        <>
          <img src={src} alt="" aria-hidden="true" className={styles.fundo} loading={loading} decoding="async" />
          <img src={src} alt={alt} className={styles.foto} loading={loading} decoding="async" />
        </>
      ) : (
        <span className={styles.semFoto}>Sem foto</span>
      )}
      {children}
    </div>
  )
}
