import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../../../layouts/AuthLayout/AuthLayout.jsx'
import { TextField } from '../../../components/TextField/TextField.jsx'
import { Checkbox } from '../../../components/Checkbox/Checkbox.jsx'
import { Button } from '../../../components/Button/Button.jsx'
import { FormAlert } from '../../../components/FormAlert/FormAlert.jsx'
import { LockIcon, UserIcon } from '../../../components/Icons/Icons.jsx'
import { usePageTitle } from '../../../hooks/usePageTitle.js'
import { authService } from '../../../services/authService.js'
import { validateEmail, validateLoginPassword } from '../../../utils/validators.js'
import styles from '../AuthPages.module.css'

const validators = {
  identifier: (values) => validateEmail(values.identifier),
  password: (values) => validateLoginPassword(values.password),
}

export function Login() {
  usePageTitle('Entrar')
  const navigate = useNavigate()
  const location = useLocation()
  const notice = location.state?.notice
  const from = location.state?.from

  const [values, setValues] = useState({ identifier: '', password: '', remember: false })
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)
  const passwordRef = useRef(null)
  const identifierRef = useRef(null)

  const update = (field) => (event) => {
    const next = { ...values, [field]: event.target.value }
    setValues(next)
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: validators[field](next) }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (loading) return

    const nextErrors = {
      identifier: validators.identifier(values),
      password: validators.password(values),
    }
    setErrors(nextErrors)
    setFormError('')
    if (nextErrors.identifier) return identifierRef.current?.focus()
    if (nextErrors.password) return passwordRef.current?.focus()

    setLoading(true)
    try {
      const challenge = await authService.login(values)
      navigate('/login/verificacao', {
        state: { challengeId: challenge.challengeId, resendIn: challenge.resendIn, purpose: 'login', from },
      })
    } catch (error) {
      setFormError(error.message)
      setValues((prev) => ({ ...prev, password: '' }))
      passwordRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <h1 className={styles.titulo}>Entrar</h1>

      {notice && !formError && (
        <div className={styles.alerta}>
          <FormAlert tone="sucesso">{notice}</FormAlert>
        </div>
      )}
      {formError && (
        <div className={styles.alerta}>
          <FormAlert>{formError}</FormAlert>
        </div>
      )}

      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <div className={styles.campos}>
          <TextField
            ref={identifierRef}
            label="E-mail"
            icon={UserIcon}
            type="email"
            name="username"
            autoComplete="username"
            inputMode="email"
            placeholder="exemplo@pawtinhas.com.br"
            maxLength={254}
            value={values.identifier}
            onChange={update('identifier')}
            error={errors.identifier}
          />
          <TextField
            ref={passwordRef}
            label="Senha"
            icon={LockIcon}
            type="password"
            name="password"
            autoComplete="current-password"
            placeholder="••••••••••••"
            maxLength={128}
            value={values.password}
            onChange={update('password')}
            error={errors.password}
          />
        </div>

        <div className={styles.opcoes}>
          <Checkbox
            label="Lembrar de mim"
            name="remember"
            checked={values.remember}
            onChange={(remember) => setValues((prev) => ({ ...prev, remember }))}
          />
          <Link to="/redefinir-senha" className={styles.linkForte}>
            Esqueceu a senha?
          </Link>
        </div>

        <Button className={styles.acao} loading={loading} loadingText="Entrando…">
          Entrar
        </Button>
      </form>

      <p className={styles.voltar}>
        <Link to="/" className={styles.linkForte}>
          Voltar ao início
        </Link>
      </p>
    </AuthLayout>
  )
}
