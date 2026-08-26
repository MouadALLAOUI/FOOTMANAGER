import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faEnvelope,
  faLock,
  faEye,
  faEyeSlash,
  faRightToBracket,
  faSpinner,
  faCheck,
} from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../../context/AuthContext'
import { consumeAction, peekAction } from '../../lib/intent'
import { getFieldErrors } from '../../lib/errorState'
import { takeAuthRedirect } from '../../api/client'
import PremiumField from './premiumField'

export default function LoginForm() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [intentHint] = useState(() => peekAction())

  const hintName =
    intentHint?.name || intentHint?.teamName || (intentHint?.type === 'register_tournament' ? intentHint.slug : '')
  const hintMessage = intentHint
    ? hintName
      ? t(`publicActions.loginHint.${intentHint.type}`, { name: hintName })
      : t('publicActions.loginRequired')
    : ''

  const [loginValue, setLoginValue] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [busy, setBusy] = useState(false)

  const clearFieldError = (field) => {
    setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
  }

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    setBusy(true)
    try {
      const user = await login(loginValue, password)
      const redirect = takeAuthRedirect()
      const intent = consumeAction()
      let dest
      if (redirect && redirect.startsWith('/')) {
        dest = redirect
      } else if (intent?.type === 'book') {
        dest = `/fields?book=${intent.id}`
      } else if (intent?.type === 'challenge') {
        dest = `/matches?challenge=${intent.teamId}&teamName=${encodeURIComponent(intent.teamName || '')}`
      } else if (intent?.type === 'register_tournament') {
        dest = `/tournaments/${intent.slug}?register=1`
      } else {
        dest =
          user.role === 'admin' || user.role === 'sub_admin'
            ? '/admin'
            : user.role === 'terrain_owner'
              ? '/terrain'
              : user.role === 'player'
                ? '/player'
                : user.role === 'committee'
                  ? '/committee'
                  : '/dashboard'
      }
      navigate(dest)
    } catch (err) {
      const fe = getFieldErrors(err)
      if (Object.keys(fe).length > 0) {
        setFieldErrors(fe)
        setError('')
      } else {
        setFieldErrors({})
        setError(err.response?.data?.message || t('auth.errors.loginFailed'))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {hintMessage && (
        <div className="fade-in flex items-start gap-2.5 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700">
          <span aria-hidden="true" className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-sky-100 text-[11px] font-black">
            !
          </span>
          {hintMessage}
        </div>
      )}

      {error && (
        <div className="fade-in rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      <PremiumField
        id="login-value"
        label={t('auth.loginValue')}
        placeholder={t('auth.loginPlaceholder')}
        icon={<FontAwesomeIcon icon={faEnvelope} className="size-[18px]" />}
        value={loginValue}
        onChange={(e) => {
          setLoginValue(e.target.value)
          clearFieldError('login')
        }}
        required
        autoComplete="username"
        error={fieldErrors.login?.[0]}
      />

      <PremiumField
        id="login-password"
        label={t('auth.password')}
        placeholder={t('auth.passwordPlaceholder')}
        type={showPassword ? 'text' : 'password'}
        icon={<FontAwesomeIcon icon={faLock} className="size-[18px]" />}
        value={password}
        onChange={(e) => {
          setPassword(e.target.value)
          clearFieldError('password')
        }}
        required
        autoComplete="current-password"
        error={fieldErrors.password?.[0]}
        endAdornment={
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
            className="absolute end-2.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-xl text-slate-400 transition-all duration-300 hover:bg-slate-100 hover:text-green-600"
          >
            <FontAwesomeIcon
              icon={showPassword ? faEyeSlash : faEye}
              className="size-[18px] transition-transform duration-300"
            />
          </button>
        }
      />

      <div className="flex items-center justify-between gap-4 pt-1">
        <label className="group flex cursor-pointer select-none items-center gap-2.5">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="peer sr-only"
          />
          <span className="grid size-5 place-items-center rounded-md border border-slate-300 bg-white text-transparent transition-all duration-300 group-hover:border-green-400 peer-checked:border-green-500 peer-checked:bg-green-500 peer-checked:text-white">
            <FontAwesomeIcon icon={faCheck} className="size-3" />
          </span>
          <span className="text-sm font-semibold text-slate-600 transition-colors group-hover:text-slate-800">
            {t('auth.remember')}
          </span>
        </label>

        <Link
          to="/forgot-password"
          className="text-sm font-bold text-green-600 transition-all duration-300 hover:text-green-700 hover:underline hover:underline-offset-4"
        >
          {t('auth.forgotPassword')}
        </Link>
      </div>

      <button
        type="submit"
        disabled={busy}
        className="btn-ripple flex h-[58px] w-full items-center justify-center gap-2.5 rounded-2xl bg-green-500 text-[15px] font-extrabold text-white shadow-[0_16px_40px_rgba(22,163,74,0.45)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-green-600 hover:shadow-[0_22px_55px_rgba(22,163,74,0.6)] active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {busy ? (
          <FontAwesomeIcon icon={faSpinner} className="size-5 animate-spin" />
        ) : (
          <FontAwesomeIcon icon={faRightToBracket} className="size-5" />
        )}
        {busy ? t('auth.submitLoginBusy') : t('auth.submitLogin')}
      </button>
    </form>
  )
}
