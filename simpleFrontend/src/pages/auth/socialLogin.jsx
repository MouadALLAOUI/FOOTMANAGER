import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faFacebook } from '@fortawesome/free-brands-svg-icons'

export default function SocialLogin({ role = 'player' }) {
  const { t } = useTranslation()

  const handleOAuth = (provider) => {
    const apiBase = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace(/\/+$/, '')
    const url = new URL(`${apiBase}/auth/${provider}/redirect`)
    if (role) {
      url.searchParams.set('role', role)
    }
    window.location.href = url.toString()
  }

  return (
    <div className="mt-8">
      <div className="flex items-center gap-4">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-semibold text-slate-400">{t('auth.divider', 'أو المتابعة عبر')}</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {/* Google Login Button */}
        <button
          type="button"
          onClick={() => handleOAuth('google')}
          className="flex h-12 items-center justify-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 hover:shadow-md active:translate-y-0"
        >
          <svg className="size-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.97 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span className="truncate">{t('auth.google', 'Google')}</span>
        </button>

        {/* Facebook Login Button */}
        <button
          type="button"
          onClick={() => handleOAuth('facebook')}
          className="flex h-12 items-center justify-center gap-2.5 rounded-2xl border border-[#1877F2]/20 bg-[#1877F2]/5 px-3 text-sm font-bold text-[#1877F2] shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#1877F2]/40 hover:bg-[#1877F2]/10 hover:shadow-md active:translate-y-0"
        >
          <FontAwesomeIcon icon={faFacebook} className="size-4 shrink-0 text-[#1877F2]" />
          <span className="truncate">{t('auth.facebook', 'Facebook')}</span>
        </button>
      </div>
    </div>
  )
}
