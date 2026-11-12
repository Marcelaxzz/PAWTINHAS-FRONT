import { useRef, useState } from 'react'
import styles from './OtpInput.module.css'

const EMPTY = ['', '', '', '', '', '']

export function OtpInput({ length = 6, onChange, onComplete, disabled = false, invalid = false, describedBy }) {
  const [digits, setDigits] = useState(() => EMPTY.slice(0, length))
  const inputs = useRef([])

  const focusAt = (index) => {
    const target = inputs.current[Math.max(0, Math.min(length - 1, index))]
    target?.focus()
    target?.select()
  }

  const commit = (next) => {
    setDigits(next)
    const code = next.join('')
    onChange?.(code)
    if (next.every(Boolean)) onComplete?.(code)
  }

  const fillFrom = (index, raw) => {
    const chars = raw
      .replace(/\D/g, '')
      .slice(0, length - index)
      .split('')
    if (!chars.length) return
    const next = [...digits]
    chars.forEach((char, offset) => {
      next[index + offset] = char
    })
    commit(next)
    focusAt(index + chars.length)
  }

  const handleChange = (index, event) => {
    const raw = event.target.value
    if (!raw) {
      const next = [...digits]
      next[index] = ''
      commit(next)
      return
    }
    // Ao digitar num campo já preenchido, o navegador entrega "antigo + novo":
    // fica só o dígito novo. Textos maiores (autopreenchimento) são distribuídos.
    const typedOverExisting = digits[index] && raw.length === 2
    fillFrom(index, typedOverExisting ? raw.replace(digits[index], '') || raw[1] : raw)
  }

  const handleKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      event.preventDefault()
      const next = [...digits]
      next[index - 1] = ''
      commit(next)
      focusAt(index - 1)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      focusAt(index - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      focusAt(index + 1)
    }
  }

  const handlePaste = (index, event) => {
    event.preventDefault()
    fillFrom(index, event.clipboardData.getData('text'))
  }

  return (
    <div
      className={styles.grupo}
      role="group"
      aria-label="Código de verificação de 6 dígitos"
      aria-describedby={describedBy}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputs.current[index] = el
          }}
          className={`${styles.digito} ${digit ? styles.preenchido : ''} ${invalid ? styles.invalido : ''}`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? 'one-time-code' : 'off'}
          maxLength={length}
          value={digit}
          disabled={disabled}
          aria-label={`Dígito ${index + 1} de ${length}`}
          aria-invalid={invalid || undefined}
          onChange={(event) => handleChange(index, event)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={(event) => handlePaste(index, event)}
          onFocus={(event) => event.target.select()}
          autoFocus={index === 0}
        />
      ))}
    </div>
  )
}
