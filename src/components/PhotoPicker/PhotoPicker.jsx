import { useId, useRef, useState } from 'react'
import { CameraIcon, UploadIcon } from '../Icons/Icons.jsx'
import { readImageFile } from '../../utils/images.js'
import styles from './PhotoPicker.module.css'

/**
 * Área de envio de foto (clique ou arraste). Valida tipo, tamanho e assinatura do
 * arquivo e devolve uma data URL re-codificada (sem metadados).
 */
export function PhotoPicker({
  value,
  onChange,
  label = 'Enviar foto do animal',
  hint = 'PNG ou JPG de até 5MB',
  variant = 'camera',
  maxBytes,
}) {
  const inputId = useId()
  const inputRef = useRef(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [dragging, setDragging] = useState(false)

  const handleFile = async (file) => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      onChange(await readImageFile(file, maxBytes))
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const Icon = variant === 'upload' ? UploadIcon : CameraIcon

  return (
    <div className={styles.envolve}>
      {value && <img src={value} alt="Pré-visualização da foto" className={styles.previa} />}
      <label
        htmlFor={inputId}
        className={`${styles.area} ${dragging ? styles.arrastando : ''} ${error ? styles.comErro : ''}`}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          handleFile(event.dataTransfer.files?.[0])
        }}
      >
        <Icon size={variant === 'upload' ? 18 : 22} />
        <strong>{busy ? 'Processando imagem…' : value ? 'Trocar foto' : label}</strong>
        <span>{hint}</span>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="visualmente-oculto"
          onChange={(event) => handleFile(event.target.files?.[0])}
          disabled={busy}
        />
      </label>
      {error && (
        <p className={styles.erro} role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
