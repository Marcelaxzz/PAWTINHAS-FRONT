import logo from '../../assets/images/logo-pawtinhas.webp'
import styles from './LoadingScreen.module.css'

export function LoadingScreen() {
  return (
    <div className={styles.tela} role="status" aria-live="polite">
      <img src={logo} alt="" className={styles.logo} width="187" height="245" />
      <span className="visualmente-oculto">Carregando…</span>
    </div>
  )
}
