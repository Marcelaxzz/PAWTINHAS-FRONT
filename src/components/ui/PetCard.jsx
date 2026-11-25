import { useState } from 'react'
import { PawFilled, PawOutline } from '../Icons/Icons.jsx'
import { tomDaEspecie } from '../../utils/enfeites.js'
import styles from './PetCard.module.css'

/**
 * Card horizontal das listas (cirurgias, banho, visitas, alarmes, pacientes…).
 * avatar: tamanho da foto em px · variant: creme | branco
 * especie: sem foto, a patinha ganha a cor da espécie (cachorro mel, gato lavanda...).
 */
export function PetCard({
  photo,
  especie,
  title,
  badges,
  children,
  actions,
  avatar = 120,
  variant = 'creme',
  titleSize = 'lg',
  className = '',
}) {
  const [fotoFalhou, setFotoFalhou] = useState(null)
  const mostrarFoto = photo && fotoFalhou !== photo
  return (
    <article className={`${styles.card} ${styles[variant]} ${className}`} data-avatar={avatar}>
      <div
        className={`${styles.foto} ${styles[`foto${avatar}`] ?? ''} ${!mostrarFoto && especie ? styles[`tom_${tomDaEspecie(especie)}`] : ''}`}
      >
        {mostrarFoto ? (
          <img src={photo} alt="" loading="lazy" decoding="async" onError={() => setFotoFalhou(photo)} />
        ) : especie && typeof title === 'string' ? (
          <span className={styles.inicial}>
            {title.slice(0, 1)}
            <PawFilled fill="currentColor" className={styles.inicialPata} />
          </span>
        ) : (
          <PawOutline className={styles.semFoto} />
        )}
      </div>
      <div className={styles.corpo}>
        <div className={styles.topo}>
          <h2 className={`${styles.titulo} ${styles[`titulo_${titleSize}`]}`}>{title}</h2>
          {badges}
        </div>
        {children && <div className={styles.linhas}>{children}</div>}
      </div>
      {actions && <div className={styles.acoes}>{actions}</div>}
    </article>
  )
}

/** "Dono(a): Marcela Marques", com rótulo em taupe e valor em destaque. */
export function InfoLine({ label, children, tone = 'escuro', truncate = false }) {
  return (
    <p className={`${styles.linha} ${truncate ? styles.truncar : ''}`}>
      <span className={styles.rotulo}>{label} </span>
      <strong className={styles[tone]}>{children}</strong>
    </p>
  )
}
