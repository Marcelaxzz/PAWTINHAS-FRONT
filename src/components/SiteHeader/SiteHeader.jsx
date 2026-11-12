import { useEffect, useId, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { BackButton } from '../BackButton/BackButton.jsx'
import { PillButton } from '../ui/PillButton.jsx'
import { CloseIcon, HeartIcon, HouseIcon, LogoutIcon, MenuIcon, SearchIcon } from '../Icons/Icons.jsx'
import logo from '../../assets/images/logo-horizontal.webp'
import styles from './SiteHeader.module.css'

function useDismiss(open, close, ref) {
  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => {
      if (!ref.current?.contains(event.target)) close()
    }
    const onKey = (event) => {
      if (event.key === 'Escape') close()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close, ref])
}

/**
 * Cabeçalho único do site. Cada área (painel, adoção) só muda os links.
 * links: [{ to, label, end?, match?(pathname) }]
 */
export function SiteHeader({
  links,
  homePath = '/',
  showBack = false,
  backFallback = '/',
  search = false,
  navLabel = 'Principal',
}) {
  const { status, user, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [navOpen, setNavOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [term, setTerm] = useState('')
  const [lastPath, setLastPath] = useState(pathname)
  const menuRef = useRef(null)
  const navId = useId()
  const menuId = useId()

  // Fecha os menus ao trocar de página.
  if (lastPath !== pathname) {
    setLastPath(pathname)
    setNavOpen(false)
    setMenuOpen(false)
  }

  useDismiss(menuOpen, () => setMenuOpen(false), menuRef)

  const handleSearch = (event) => {
    event.preventDefault()
    const value = term.trim().slice(0, 80)
    if (value) navigate(`/pacientes?busca=${encodeURIComponent(value)}`)
  }

  const handleLogout = async () => {
    setMenuOpen(false)
    await logout()
    navigate('/', { replace: true })
  }

  const searchForm = (suffix, extraClass = '') => (
    <form role="search" className={`${styles.busca} ${extraClass}`} onSubmit={handleSearch}>
      <SearchIcon size={16} className={styles.buscaIcone} />
      <label className="visualmente-oculto" htmlFor={`${navId}-${suffix}`}>
        Buscar pets e tutores
      </label>
      <input
        id={`${navId}-${suffix}`}
        type="search"
        placeholder="Buscar pets, tutores..."
        maxLength={80}
        autoComplete="off"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
      />
    </form>
  )

  const initial = (user?.name?.trim()?.[0] ?? 'P').toUpperCase()

  return (
    <header className={styles.cabecalho}>
      <div className={styles.esquerda}>
        {showBack && <BackButton fallback={backFallback} />}
        <Link to={homePath} className={styles.marca} aria-label="Pawtinhas, página inicial">
          <img src={logo} alt="" width="600" height="145" className={styles.logo} />
        </Link>
      </div>

      <nav id={navId} className={`${styles.nav} ${navOpen ? styles.navAberta : ''}`} aria-label={navLabel}>
        <ul>
          {links.map((link) => (
            <li key={link.to}>
              <NavLink
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  `${styles.link} ${(link.match ? link.match(pathname) : isActive) ? styles.ativo : ''}`
                }
              >
                {link.label}
              </NavLink>
            </li>
          ))}
        </ul>
        {search && searchForm('movel', styles.buscaMovel)}
      </nav>

      <div className={styles.direita}>
        {search && searchForm('topo', styles.buscaTopo)}

        {status === 'autenticado' ? (
          <div className={styles.conta} ref={menuRef}>
            <button
              type="button"
              className={styles.avatar}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => setMenuOpen((open) => !open)}
            >
              <span aria-hidden="true">{initial}</span>
              <span className="visualmente-oculto">Abrir menu da conta</span>
            </button>

            {menuOpen && (
              <div id={menuId} className={styles.menu} role="menu">
                <div className={styles.menuUsuario}>
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                </div>
                <Link to="/inicio" role="menuitem" className={styles.menuItem}>
                  <HouseIcon size={16} />
                  Painel da clínica
                </Link>
                <Link to="/adocao" role="menuitem" className={styles.menuItem}>
                  <HeartIcon size={16} />
                  Vitrine de adoção
                </Link>
                <button type="button" role="menuitem" className={styles.menuItem} onClick={handleLogout}>
                  <LogoutIcon size={16} />
                  Sair
                </button>
              </div>
            )}
          </div>
        ) : (
          status === 'anonimo' && (
            <PillButton to="/login" size="sm" className={styles.entrar}>
              Entrar
            </PillButton>
          )
        )}

        <button
          type="button"
          className={styles.hamburguer}
          aria-expanded={navOpen}
          aria-controls={navId}
          onClick={() => setNavOpen((open) => !open)}
        >
          {navOpen ? <CloseIcon size={22} /> : <MenuIcon size={22} />}
          <span className="visualmente-oculto">{navOpen ? 'Fechar menu' : 'Abrir menu'}</span>
        </button>
      </div>
    </header>
  )
}
