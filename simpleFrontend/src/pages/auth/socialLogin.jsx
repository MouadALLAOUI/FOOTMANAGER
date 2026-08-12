import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPhone } from '@fortawesome/free-solid-svg-icons'
import { faGoogle, faFacebook, faApple } from '@fortawesome/free-brands-svg-icons'

const providers = [
  { id: 'google', icon: faGoogle },
  { id: 'facebook', icon: faFacebook },
  { id: 'apple', icon: faApple },
  { id: 'phone', icon: faPhone },
]

export default function SocialLogin() {
  const { t } = useTranslation()

  return (
    <div className="mt-8">
      <div className="flex items-center gap-4">
        <span className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-semibold text-slate-400">{t('auth.divider')}</span>
        <span className="h-px flex-1 bg-slate-200" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {providers.map((p) => (
          <button
            key={p.id}
            type="button"
            className="flex h-12 items-center justify-center gap-2.5 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-green-400 hover:text-green-700 hover:shadow-[0_14px_34px_rgba(34,197,94,0.14)] active:translate-y-0"
          >
            <FontAwesomeIcon icon={p.icon} className="size-4" />
            {t(`auth.${p.id}`)}
          </button>
        ))}
      </div>
    </div>
  )
}
