import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../../../layouts/AuthLayout/AuthLayout.jsx'
import { TextField } from '../../../components/TextField/TextField.jsx'
import { Button } from '../../../components/Button/Button.jsx'
import { FormAlert } from '../../../components/FormAlert/FormAlert.jsx'
import { LockIcon, UserIcon } from '../../../components/Icons/Icons.jsx'
import { usePageTitle } from '../../../hooks/usePageTitle.js'
import { authService } from '../../../services/authService.js'
import { validateEmail, validateNewPassword, validatePasswordConfirmation } from '../../../utils/validators.js'
import styles from '../AuthPages.module.css'

const FIELDS = ['email', 'password', 'confirmation']

// Nome de cada campo do estado no atributo name do input (usado para focar o primeiro erro).
const INPUT_NAMES = { email: 'email', password: 'new-password', confirmation: 'confirm-password' }

const validators = {
  email: (v) => validateEmail(v.email),
  password: (v) => validateNewPassword(v.password),
  confirmation: (v) => validatePasswordConfirmation(v.password, v.confirmation),
}

export function ResetPassword() {
  usePageTitle('Redefinir senha')
  const navigate = useNavigate()
  const formRef = useRef(null)

  const [values, setValues] = useState({ email: '', password: '', confirmation: '' })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  const update = (field) => (event) => {
    const next = { ...values, [field]: event.target.value }
    setValues(next)
    setErrors((prev) => {
      const updated = { ...prev }
      if (prev[field]) updated[field] = validators[field](next)
      if (field === 'password' && prev.confirmation) updated.confirmation = validators.confirmation(next)
      return updated
    })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (loading) return

    const nextErrors = Object.fromEntries(FIELDS.map((field) => [field, validators[field](values)]))
    setErrors(nextErrors)
    setFormError('')
    const firstInvalid = FIELDS.find((field) => nextErrors[field])
    if (firstInvalid) return formRef.current?.elements.namedItem(INPUT_NAMES[firstInvalid])?.focus()

    setLoading(true)
    try {
      const challenge = await authService.requestPasswordReset(values)
      navigate('/redefinir-senha/verificacao', {
        state: { challengeId: challenge.challengeId, resendIn: challenge.resendIn, purpose: 'reset' },
      })
    } catch (error) {
      setFormError(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className={styles.titulo}>Redefinir senha</h1>
      <p className={styles.descricao}>Enviaremos um código para o seu e-mail para confirmar a troca.</p>

      {formError && (
        <div className={styles.alerta}>
          <FormAlert>{formError}</FormAlert>
        </div>
      )}

      <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.campos}>
          <TextField
            error={errors.email}
            label="E-mail de cadastro"
            icon={UserIcon}
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            placeholder="exemplo@pawtinhas.com.br"
            maxLength={254}
            value={values.email}
            onChange={update('email')}
          />
          <TextField
            error={errors.password}
            label="Nova senha"
            icon={LockIcon}
            type="password"
            name="new-password"
            autoComplete="new-password"
            placeholder="••••••••••••"
            maxLength={128}
            hint="Mínimo de 8 caracteres, com letra maiúscula, minúscula, número e símbolo."
            value={values.password}
            onChange={update('password')}
          />
          <TextField
            error={errors.confirmation}
            label="Confirmar nova senha"
            icon={LockIcon}
            type="password"
            name="confirm-password"
            autoComplete="new-password"
            placeholder="••••••••••••"
            maxLength={128}
            value={values.confirmation}
            onChange={update('confirmation')}
          />
        </div>

        <Button className={styles.acao} loading={loading} loadingText="Enviando código…">
          Redefinir senha
        </Button>
      </form>

      <p className={styles.voltar}>
        <Link to="/login" className={styles.linkForte}>
          Voltar ao login
        </Link>
      </p>
    </AuthLayout>
  )
}
