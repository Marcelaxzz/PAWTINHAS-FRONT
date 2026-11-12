import { PawOutline } from '../Icons/Icons.jsx'
import styles from './PetCard.module.css'

/**
 * Card horizontal das listas (cirurgias, banho, visitas, alarmes, pacientes…).
 * avatar: tamanho da foto em px · variant: creme | branco
 */
export function PetCard({
  photo,
  title,
  badges,
  children,
  actions,
  avatar = 120,
  variant = 'creme',
  titleSize = 'lg',
  className = '',
}) {
  return (
    <article className={`${styles.card} ${styles[variant]} ${className}`} data-avatar={avatar}>
      <div className={`${styles.foto} ${styles[`foto${avatar}`] ?? ''}`}>
        {photo ? <img src={photo} alt="" loading="lazy" decoding="async" /> : <PawOutline className={styles.semFoto} />}
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
