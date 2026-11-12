import { useEffect, useId, useRef } from 'react'
import { CloseIcon } from '../Icons/Icons.jsx'
import styles from './Dialog.module.css'

/**
 * Janela modal acessível baseada no <dialog> nativo:
 * prende o foco, fecha com Esc e devolve o foco ao elemento que a abriu.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md', tone = 'claro' }) {
  const ref = useRef(null)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return undefined
    const handleCancel = (event) => {
      event.preventDefault()
      onClose()
    }
    dialog.addEventListener('cancel', handleCancel)
    return () => dialog.removeEventListener('cancel', handleCancel)
  }, [onClose])

  const handleBackdrop = (event) => {
    if (event.target === ref.current) onClose()
  }

  return (
    <dialog
      ref={ref}
      className={`${styles.dialogo} ${styles[size]}`}
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClick={handleBackdrop}
    >
      {open && (
        <div className={styles.conteudo}>
          <header className={`${styles.cabecalho} ${styles[tone]}`}>
            <div>
              <h2 id={titleId} className={styles.titulo}>
                {title}
              </h2>
              {description && (
                <p id={descId} className={styles.descricao}>
                  {description}
                </p>
              )}
            </div>
            <button type="button" className={styles.fechar} onClick={onClose} aria-label="Fechar">
              <CloseIcon size={20} />
            </button>
          </header>
          <div className={styles.corpo}>{children}</div>
          {footer && <footer className={styles.rodape}>{footer}</footer>}
        </div>
      )}
    </dialog>
  )
}

/** Confirmação para ações destrutivas. */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirmar',
  loading = false,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" className={styles.botaoSecundario} onClick={onClose} disabled={loading}>
            Cancelar
          </button>
          <button
            type="button"
            className={styles.botaoPerigo}
            onClick={onConfirm}
            disabled={loading}
            aria-busy={loading || undefined}
          >
            {loading ? 'Aguarde…' : confirmLabel}
          </button>
        </>
      }
    >
      <p className={styles.mensagem}>{message}</p>
    </Dialog>
  )
}
