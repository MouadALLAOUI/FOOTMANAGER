import { useTranslation } from 'react-i18next'
import { BadgeCheck } from 'lucide-react'

export default function SubscriptionStatus({ subscription, plan, loading }) {
  const { t, i18n } = useTranslation()

  if (loading || !plan) return null

  const active = Boolean(subscription?.is_active)
  const date = subscription?.ends_at
    ? new Date(subscription.ends_at).toLocaleDateString(
        i18n.language.startsWith('ar') ? 'ar-MA' : 'en-GB',
        { day: 'numeric', month: 'short', year: 'numeric' },
      )
    : null

  return (
    <div className="mx-auto mt-10 flex max-w-xl flex-col items-center gap-2 rounded-[26px] bg-white p-5 text-center shadow-[0_8px_30px_rgba(17,24,39,0.06)] ring-1 ring-slate-100">
      <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-4 py-1.5 text-xs font-bold text-green-700">
        <BadgeCheck className="size-4" />
        {t('pricing.page.yourPlan')}: {plan.name}
      </span>
      {active && date ? (
        <p className="text-xs text-slate-500">{t('pricing.page.subscriptionActiveUntil', { date })}</p>
      ) : (
        <p className="text-xs text-slate-500">{t('pricing.page.subscriptionFreeNote')}</p>
      )}
    </div>
  )
}
