import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { UserPlus } from 'lucide-react'

const PRIMARY_BUTTON =
  'inline-flex h-[52px] w-full items-center justify-center gap-2.5 rounded-2xl bg-green-500 px-7 text-sm font-bold text-white shadow-[0_16px_40px_rgba(22,163,74,0.45)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-green-400 active:translate-y-0'

export default function UpgradeButton({ isCurrentPlan, isAuthenticated, actionLabel, onSubscribe }) {
  const { t } = useTranslation()

  if (!isAuthenticated) {
    return (
      <Link to="/register" className={PRIMARY_BUTTON}>
        <UserPlus className="size-5" />
        {t('pricing.page.signUpCta')}
      </Link>
    )
  }

  if (isCurrentPlan) {
    return (
      <button
        type="button"
        disabled
        className="inline-flex h-[52px] w-full items-center justify-center rounded-2xl bg-slate-100 px-7 text-sm font-bold text-slate-500"
      >
        {t('pricing.page.currentPlan')}
      </button>
    )
  }

  return (
    <button type="button" onClick={() => onSubscribe()} className={PRIMARY_BUTTON}>
      {actionLabel}
    </button>
  )
}
