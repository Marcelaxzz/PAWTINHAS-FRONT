import { useEffect, useRef } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { PageHeading } from '../../components/ui/PageHeading.jsx'
import { usePageTitle } from '../../hooks/usePageTitle.js'
import styles from './Page.module.css'

/**
 * Estrutura padrão de todas as telas internas: título centralizado, subtítulo,
 * ações, abas da seção e conteúdo.
 *
 * width: estreito (880px) | padrao (1360px) | largo (1440px) | amplo (1560px)
 * tabs:  [{ to, label, end? }], navegação entre telas da mesma seção
 */
export function Page({ title, subtitle, children, actions, tabs, width = 'padrao', decor, documentTitle }) {
  usePageTitle(documentTitle ?? title)
  const abas = useRef(null)
  const { pathname } = useLocation()

  // No celular as abas rolam para o lado: traz a aba atual para o meio.
  useEffect(() => {
    const nav = abas.current
    const ativa = nav?.querySelector('[aria-current="page"]')
    if (!ativa || nav.scrollWidth <= nav.clientWidth) return
    nav.scrollLeft = ativa.offsetLeft - (nav.clientWidth - ativa.offsetWidth) / 2
  }, [pathname])

  return (
    <main className={styles.pagina}>
      {decor}

      <div className={`${styles.conteudo} ${styles[width]}`}>
        <PageHeading title={title} subtitle={subtitle} />

        {tabs && (
          <nav ref={abas} className={styles.abas} aria-label={`Seções de ${title}`}>
            {tabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                end={tab.end ?? true}
                className={({ isActive }) => `${styles.aba} ${isActive ? styles.abaAtiva : ''}`}
              >
                {tab.label}
              </NavLink>
            ))}
          </nav>
        )}

        {actions && <div className={styles.acoes}>{actions}</div>}

        <div className={styles.corpo}>{children}</div>
      </div>
    </main>
  )
}
