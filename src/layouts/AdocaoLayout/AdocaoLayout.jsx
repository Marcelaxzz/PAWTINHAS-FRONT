import { Outlet, useLocation } from 'react-router-dom'
import { SiteHeader } from '../../components/SiteHeader/SiteHeader.jsx'
import styles from './AdocaoLayout.module.css'

const LINKS = [
  { to: '/adocao', label: 'Adoção', end: true, match: (path) => path === '/adocao' || path.startsWith('/adocao/') },
  { to: '/favoritos', label: 'Favoritos' },
  { to: '/como-adotar', label: 'Como adotar' },
  { to: '/sobre', label: 'Sobre nós' },
]

/** Área pública de adoção: catálogo, detalhes, favoritos, como adotar e sobre nós. */
export function AdocaoLayout() {
  const { pathname } = useLocation()

  return (
    <div className={styles.app}>
      <SiteHeader
        links={LINKS}
        homePath="/"
        showBack={pathname !== '/adocao'}
        backFallback="/adocao"
        navLabel="Adoção"
      />
      <Outlet />
    </div>
  )
}
