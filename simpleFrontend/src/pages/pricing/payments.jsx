import { useTranslation } from 'react-i18next'
import { Banknote, CircleSlash2 } from 'lucide-react'

export default function PricingPayments() {
  const { t } = useTranslation()

  return (
    <section className="bg-[#f6f7fb] px-6 pb-16 pt-2 lg:pb-24 lg:pt-4">
      <div className="mx-auto max-w-2xl text-center">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-200">
          <Banknote className="size-7" />
        </span>
        <h2 className="mt-5 text-2xl font-black text-slate-900 lg:text-3xl">{t('pricing.page.paymentsTitle')}</h2>
        <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-slate-600">
          {t('pricing.page.paymentsSubtitle')}
        </p>

        <div className="mt-8 space-y-4 rounded-[26px] bg-white p-8 text-start shadow-[0_8px_30px_rgba(17,24,39,0.08)] ring-1 ring-slate-100">
          <p className="flex items-start gap-3 text-sm leading-relaxed text-slate-700">
            <CircleSlash2 className="mt-0.5 size-5 shrink-0 text-amber-500" />
            <span>{t('pricing.page.paymentsLine1')}</span>
          </p>
          <p className="flex items-start gap-3 text-sm leading-relaxed text-slate-700">
            <CircleSlash2 className="mt-0.5 size-5 shrink-0 text-amber-500" />
            <span>{t('pricing.page.paymentsLine2')}</span>
          </p>
        </div>
      </div>
    </section>
  )
}
