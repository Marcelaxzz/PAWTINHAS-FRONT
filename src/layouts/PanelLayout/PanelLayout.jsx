import { Outlet, useLocation } from 'react-router-dom'
import { SiteHeader } from '../../components/SiteHeader/SiteHeader.jsx'
import styles from './PanelLayout.module.css'

const LINKS = [
  { to: '/inicio', label: 'Início' },
  { to: '/agenda', label: 'Agenda' },
  { to: '/pacientes', label: 'Pacientes' },
  { to: '/alarmes', label: 'Alarmes' },
  { to: '/calculadoras', label: 'Calculadoras' },
  { to: '/admin/adocoes', label: 'Adoção' },
  // Abre o guia em PDF numa aba nova; as configurações ficam no menu da conta (a letra no canto).
  { href: '/tutorial-pawtinhas.pdf', label: 'Tutorial' },
]

/** Layout do painel da veterinária (todas as telas internas). */
export function PanelLayout() {
  const { pathname } = useLocation()

  return (
    <div className={styles.app}>
      <SiteHeader links={LINKS} homePath="/inicio" showBack={pathname !== '/inicio'} backFallback="/inicio" search />
      <Outlet />
    </div>
  )
}
