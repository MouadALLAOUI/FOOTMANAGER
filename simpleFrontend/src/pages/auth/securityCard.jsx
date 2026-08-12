import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShieldHalved } from '@fortawesome/free-solid-svg-icons'

export default function SecurityCard() {
  const { t } = useTranslation()

  return (
    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-green-100 bg-green-50/80 p-4">
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-green-500/15 text-green-600 ring-1 ring-green-500/20">
        <FontAwesomeIcon icon={faShieldHalved} className="size-[18px]" />
      </div>
      <div>
        <p className="text-sm font-bold text-green-900">{t('auth.security.title')}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-green-700/80">
          {t('auth.security.description')}
        </p>
      </div>
    </div>
  )
}
