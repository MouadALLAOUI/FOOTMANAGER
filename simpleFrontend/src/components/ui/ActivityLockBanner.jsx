import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import { useActivityLock } from '../../context/AuthContext'

export default function ActivityLockBanner() {
  const { t } = useTranslation()
  const { locked, reason } = useActivityLock()

  if (!locked) return null

  return (
    <div className="mx-auto max-w-[1400px] px-5 lg:px-8">
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl bg-amber-100">
          <Lock className="size-4.5 text-amber-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-amber-800">{t('activityLock.title')}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-amber-600">
            {reason || t('activityLock.defaultReason')}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-amber-500">{t('activityLock.hint')}</p>
        </div>
      </div>
    </div>
  )
}
