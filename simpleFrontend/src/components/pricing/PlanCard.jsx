import { useTranslation } from 'react-i18next'
import PriceDisplay from './PriceDisplay'
import PlanFeature from './PlanFeature'
import UpgradeButton from './UpgradeButton'

export default function PlanCard({
  plan,
  isCurrentPlan,
  isAuthenticated,
  actionLabel,
  comingSoon,
  onSubscribe,
}) {
  const { t } = useTranslation()
  const features = (plan.features || []).filter((feature) => feature.enabled)

  return (
    <div
      className={`relative flex w-full flex-col rounded-[26px] bg-white p-8 shadow-[0_8px_30px_rgba(17,24,39,0.08)] lg:p-10 ${
        isCurrentPlan ? 'ring-2 ring-green-500' : 'ring-1 ring-slate-100'
      }`}
    >
      {isCurrentPlan ? (
        <span className="absolute -top-3.5 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-green-500 px-4 py-1.5 text-xs font-bold text-white shadow-[0_8px_20px_rgba(22,163,74,0.4)] rtl:translate-x-1/2">
          {t('pricing.page.currentPlan')}
        </span>
      ) : plan.badge ? (
        <span className="absolute -top-3.5 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-slate-900 px-4 py-1.5 text-xs font-bold text-white rtl:translate-x-1/2">
          {plan.badge}
        </span>
      ) : null}

      <h3 className="text-xl font-black text-slate-900">{plan.name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{plan.description}</p>

      <PriceDisplay plan={plan} />

      <ul className="mt-8 flex-1 space-y-3.5 border-t border-slate-100 pt-8">
        {features.map((feature) => (
          <PlanFeature key={feature.key} feature={feature} />
        ))}
      </ul>

      <div className="mt-8 flex flex-col gap-3 pt-2">
        <UpgradeButton
          isCurrentPlan={isCurrentPlan}
          isAuthenticated={isAuthenticated}
          actionLabel={actionLabel}
          onSubscribe={() => onSubscribe(plan)}
        />
        {comingSoon ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 text-xs font-semibold leading-relaxed text-amber-700 ring-1 ring-amber-200">
            {t('pricing.page.comingSoon')} {t('pricing.page.comingSoonHint')}
          </p>
        ) : null}
      </div>
    </div>
  )
}
