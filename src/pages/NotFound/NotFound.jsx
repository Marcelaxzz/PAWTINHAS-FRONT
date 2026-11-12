import { Link } from 'react-router-dom'
import { ArrowLeftIcon } from '../../components/Icons/Icons.jsx'
import { usePageTitle } from '../../hooks/usePageTitle.js'
import logo from '../../assets/images/logo-pawtinhas.webp'
import styles from './NotFound.module.css'

export function NotFound() {
  usePageTitle('Página não encontrada')

  return (
    <main className={styles.pagina}>
      <img src={logo} alt="" className={styles.logo} width="187" height="245" />
      <p className={styles.codigo}>404</p>
      <h1 className={styles.titulo}>Página não encontrada</h1>
      <p className={styles.texto}>A página que você procura não existe ou foi removida.</p>
      <Link to="/" className={styles.botao}>
        <ArrowLeftIcon size={16} strokeWidth={2.4} />
        Voltar ao início
      </Link>
    </main>
  )
}
