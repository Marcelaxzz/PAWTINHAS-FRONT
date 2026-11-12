import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronLeftIcon } from '../Icons/Icons.jsx'
import styles from './BackButton.module.css'

function parentPath(pathname, fallback) {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length <= 1) return fallback
  return `/${parts.slice(0, -1).join('/')}`
}

/** Volta no histórico ou, se a página foi aberta direto, para a página pai. */
export function BackButton({ fallback = '/', className = '' }) {
  const navigate = useNavigate()
  const location = useLocation()

  const goBack = () => {
    if (location.key !== 'default') navigate(-1)
    else navigate(parentPath(location.pathname, fallback))
  }

  return (
    <button type="button" className={`${styles.voltar} ${className}`} onClick={goBack} aria-label="Voltar">
      <ChevronLeftIcon size={20} strokeWidth={2.6} />
    </button>
  )
}
