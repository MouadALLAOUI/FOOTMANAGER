import { useTranslation } from 'react-i18next'

export default function PlanLimitMessage({ feature }) {
  const { t, i18n } = useTranslation()
  const locale = i18n.language === 'ar' ? 'ar-MA' : 'en-US'

  if (feature.is_unlimited) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-600">
        <span className="text-sm leading-none">∞</span>
        {t('pricing.page.unlimited')}
      </span>
    )
  }

  if (feature.value === null || feature.value === undefined) {
    return null
  }

  return (
    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
      {new Intl.NumberFormat(locale).format(Number(feature.value))}
    </span>
  )
}
