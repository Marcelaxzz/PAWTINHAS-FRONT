import { useId, useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthLayout } from '../../../layouts/AuthLayout/AuthLayout.jsx'
import { OtpInput } from '../../../components/OtpInput/OtpInput.jsx'
import { Button } from '../../../components/Button/Button.jsx'
import { FormAlert } from '../../../components/FormAlert/FormAlert.jsx'
import { useAuth } from '../../../hooks/useAuth.js'
import { useCountdown } from '../../../hooks/useCountdown.js'
import { usePageTitle } from '../../../hooks/usePageTitle.js'
import { HOME_PATH, authService } from '../../../services/authService.js'
import { formatCountdown } from '../../../utils/masks.js'
import { safeRedirect } from '../../../utils/navigation.js'
import { validateCode } from '../../../utils/validators.js'
import styles from '../AuthPages.module.css'

const CONTENT = {
  login: {
    description: 'Digite o código de 6 dígitos enviado para o seu e-mail.',
    back: { to: '/login', label: 'Voltar ao login' },
  },
  reset: {
    description: 'Digite o código de 6 dígitos enviado para o seu e-mail.',
    back: { to: '/redefinir-senha', label: 'Voltar para redefinição de senha' },
  },
}

/**
 * Segunda etapa da autenticação. O `challengeId` chega pelo state da navegação
 * (nunca pela URL); sem ele, a pessoa volta para o início do fluxo.
 */
export function VerifyCode({ mode }) {
  const location = useLocation()
  const state = location.state
  const purpose = mode === 'reset' ? 'reset' : 'login'

  if (!state?.challengeId || state.purpose !== purpose) {
    return <Navigate to={CONTENT[purpose].back.to} replace />
  }

  return (
    <VerifyCodeForm
      key={state.challengeId}
      purpose={purpose}
      challengeId={state.challengeId}
      resendIn={state.resendIn}
      from={state.from}
    />
  )
}

function VerifyCodeForm({ purpose, challengeId, resendIn, from }) {
  usePageTitle('Verificação de segurança')
  const navigate = useNavigate()
  const { completeSignIn } = useAuth()
  const helpId = useId()
  const content = CONTENT[purpose]

  const [code, setCode] = useState('')
  const [otpKey, setOtpKey] = useState(0)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [remaining, restartCountdown] = useCountdown(resendIn ?? 60)
  const submitting = useRef(false)

  const verify = async (value) => {
    if (submitting.current) return
    const validation = validateCode(value)
    if (validation) {
      setError(validation)
      return
    }

    submitting.current = true
    setLoading(true)
    setError('')
    setInfo('')
    try {
      if (purpose === 'reset') {
        await authService.confirmPasswordReset({ challengeId, code: value })
        navigate('/login', {
          replace: true,
          state: { notice: 'Senha redefinida com sucesso! Entre com a sua nova senha.' },
        })
      } else {
        const { user } = await authService.verifyLogin({ challengeId, code: value })
        completeSignIn(user)
        navigate(safeRedirect(from, HOME_PATH), { replace: true })
      }
    } catch (err) {
      setError(err.message)
      setCode('')
      setOtpKey((k) => k + 1)
    } finally {
      submitting.current = false
      setLoading(false)
    }
  }

  const resend = async () => {
    if (remaining > 0 || resending) return
    setResending(true)
    setError('')
    setInfo('')
    try {
      const result = await authService.resendCode({ challengeId })
      restartCountdown(result.resendIn ?? 60)
      setCode('')
      setOtpKey((k) => k + 1)
      setInfo('Enviamos um novo código para o seu e-mail.')
    } catch (err) {
      if (err.retryAfter) restartCountdown(err.retryAfter)
      setError(err.message)
    } finally {
      setResending(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    verify(code)
  }

  return (
    <AuthLayout>
      <div>
        <h1 className={styles.titulo}>Verificação</h1>
        <p className={styles.descricao} id={helpId}>
          {content.description}
        </p>

        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <div className={styles.otp}>
            <OtpInput
              key={otpKey}
              onChange={(value) => {
                setCode(value)
                if (error) setError('')
              }}
              onComplete={verify}
              disabled={loading}
              invalid={Boolean(error)}
              describedBy={helpId}
            />
          </div>

          {(error || info) && (
            <div className={styles.otpAlerta}>
              {error ? <FormAlert>{error}</FormAlert> : <FormAlert tone="sucesso">{info}</FormAlert>}
            </div>
          )}

          <div className={styles.reenvio}>
            <span className={styles.contador}>
              {remaining > 0 ? `Reenviar código em ${formatCountdown(remaining)}` : 'Não recebeu o código?'}
            </span>
            <button
              type="button"
              className={styles.botaoReenviar}
              onClick={resend}
              disabled={remaining > 0 || resending}
            >
              {resending ? 'Reenviando…' : 'Reenviar código'}
            </button>
          </div>

          <Button className={styles.acao} loading={loading} loadingText="Verificando…">
            Verificar código
          </Button>
        </form>

        <p className={styles.voltar}>
          <Link to={content.back.to} className={styles.linkForte}>
            {content.back.label}
          </Link>
        </p>
      </div>
    </AuthLayout>
  )
}
