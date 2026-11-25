import { useState } from 'react'
import { PawFilled } from '../Icons/Icons.jsx'
import styles from './FotoInteira.module.css'

/**
 * Foto que nunca corta o animal: a imagem inteira (contain) sobre uma cópia desfocada dela mesma,
 * que preenche as sobras da moldura. As fotos da adoção chegam em qualquer proporção (em pé,
 * deitadas, quadradas); com "cover" a cabeça do bicho ficava de fora.
 */
export function FotoInteira({ src, alt, className = '', loading = 'lazy', children }) {
  const [falhou, setFalhou] = useState(null)
  return (
    <div className={`${styles.moldura} ${className}`}>
      {src && falhou !== src ? (
        <>
          <img src={src} alt="" aria-hidden="true" className={styles.fundo} loading={loading} decoding="async" />
          <img
            src={src}
            alt={alt}
            className={styles.foto}
            loading={loading}
            decoding="async"
            onError={() => setFalhou(src)}
          />
        </>
      ) : (
        <span className={styles.semFoto}>
          <PawFilled fill="currentColor" className={styles.patinha} />
          Sem foto
        </span>
      )}
      {children}
    </div>
  )
}
