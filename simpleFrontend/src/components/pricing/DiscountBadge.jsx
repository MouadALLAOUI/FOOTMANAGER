import { useTranslation } from 'react-i18next'

export default function DiscountBadge({ discount, currency }) {
  const { i18n } = useTranslation()
  const locale = i18n.language === 'ar' ? 'ar-MA' : 'en-US'
  const format = (value) => new Intl.NumberFormat(locale).format(Number(value))

  const label =
    discount?.type === 'percentage'
      ? `-${format(discount.value)}%`
      : `-${format(discount.value)} ${currency ?? ''}`

  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full bg-green-500 px-2.5 py-1 text-[11px] font-bold text-white">
      {label}
    </span>
  )
}
