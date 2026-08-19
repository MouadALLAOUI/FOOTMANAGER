import { useTranslation } from 'react-i18next'
import { Check, Minus } from 'lucide-react'
import PriceDisplay from './PriceDisplay'

function featureByKey(plan, key) {
  return (plan.features || []).find((feature) => feature.key === key)
}

function CellValue({ feature }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'ar' ? 'ar-MA' : 'en-US'

  if (!feature || !feature.enabled) {
    return <Minus className="size-4 text-slate-300" />
  }

  if (feature.type === 'limit') {
    if (feature.is_unlimited) {
      return (
        <span className="inline-flex items-center gap-1 text-sm font-bold text-green-600">
          <span className="text-base leading-none">∞</span>
          <span className="text-xs font-bold">{t('pricing.page.unlimited')}</span>
        </span>
      )
    }
    return (
      <span className="text-sm font-bold text-slate-800">
        {new Intl.NumberFormat(locale).format(Number(feature.value))}
      </span>
    )
  }

  return <Check className="mx-auto size-4 text-green-500" strokeWidth={3} />
}

export default function PlanComparison({ plans }) {
  const { t } = useTranslation()

  const keys = []
  plans.forEach((plan) =>
    (plan.features || []).forEach((feature) => {
      if (!keys.includes(feature.key)) keys.push(feature.key)
    }),
  )

  return (
    <div className="mt-10 overflow-x-auto rounded-[26px] bg-white p-4 shadow-[0_8px_30px_rgba(17,24,39,0.08)] ring-1 ring-slate-100 lg:p-6">
      <table className="w-full min-w-[680px] border-separate border-spacing-0 text-start">
        <thead>
          <tr>
            <th className="sticky start-0 z-10 bg-white p-3 text-start text-xs font-bold uppercase tracking-widest text-slate-400">
              {t('pricing.page.feature')}
            </th>
            {plans.map((plan) => (
              <th key={plan.slug} className="p-3 text-center align-bottom">
                <span className="block text-sm font-black text-slate-900">{plan.name}</span>
                <span className="mt-1 block">
                  <PriceDisplay plan={plan} compact />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const meta = plans.map((plan) => featureByKey(plan, key)).find(Boolean)

            return (
              <tr key={key}>
                <td className="sticky start-0 z-10 border-t border-slate-100 bg-white p-3 text-start text-sm font-semibold text-slate-700">
                  {meta?.name ?? key}
                </td>
                {plans.map((plan) => (
                  <td key={plan.slug} className="border-t border-slate-100 p-3 text-center">
                    <CellValue feature={featureByKey(plan, key)} />
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
