import { useTranslation } from 'react-i18next'
import DiscountBadge from './DiscountBadge'

function formatPrice(value, locale) {
  const num = Number(value)
  return Number.isFinite(num) ? new Intl.NumberFormat(locale).format(num) : String(value ?? '')
}

export default function PriceDisplay({ plan, compact = false }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'ar' ? 'ar-MA' : 'en-US'
  const period = t(plan.billing_interval === 'yearly' ? 'pricing.page.perYear' : 'pricing.page.perMonth')
  const isFree = plan.is_free || Number(plan.price) === 0
  const size = compact ? 'text-lg' : 'text-4xl'
  const currencySize = compact ? 'text-sm' : 'text-xl'

  if (isFree) {
    return (
      <div className={`flex items-end gap-2 ${compact ? '' : 'mt-6'}`}>
        <span className={`${size} font-black tracking-tight text-slate-900`}>{t('pricing.page.freePrice')}</span>
        {period && <span className="pb-1 text-xs font-semibold text-slate-500">{period}</span>}
      </div>
    )
  }

  return (
    <div className={compact ? '' : 'mt-6'}>
      <div className="flex flex-wrap items-end gap-2">
        <span className={`${size} font-black tracking-tight text-slate-900`}>
          {formatPrice(plan.final_price, locale)}
          <span className={`${currencySize} ms-1.5 font-bold text-slate-500`}>{plan.currency}</span>
        </span>
        {period && <span className="pb-1 text-xs font-semibold text-slate-500">{period}</span>}
      </div>
      {plan.discount ? (
        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-400 line-through">
            {formatPrice(plan.price, locale)} {plan.currency}
          </span>
          <DiscountBadge discount={plan.discount} currency={plan.currency} />
        </div>
      ) : null}
    </div>
  )
}
