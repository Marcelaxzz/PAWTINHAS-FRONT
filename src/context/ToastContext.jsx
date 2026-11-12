import { useCallback, useMemo, useRef, useState } from 'react'
import { CheckIcon, AlertIcon, CloseIcon } from '../components/Icons/Icons.jsx'
import { ToastContext } from './toastContext.js'
import styles from './Toast.module.css'

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const counter = useRef(0)

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), [])

  const show = useCallback(
    (message, tone = 'sucesso') => {
      counter.current += 1
      const id = counter.current
      setToasts((list) => [...list.slice(-2), { id, message, tone }])
      setTimeout(() => dismiss(id), 4200)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ success: (msg) => show(msg, 'sucesso'), error: (msg) => show(msg, 'erro') }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.area} role="status" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`${styles.toast} ${styles[toast.tone]}`}>
            {toast.tone === 'erro' ? <AlertIcon size={18} /> : <CheckIcon size={18} strokeWidth={2.6} />}
            <p>{toast.message}</p>
            <button type="button" onClick={() => dismiss(toast.id)} aria-label="Fechar aviso">
              <CloseIcon size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
