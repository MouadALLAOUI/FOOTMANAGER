import { useTranslation } from 'react-i18next'
import PlanComparison from '../../components/pricing/PlanComparison'

export default function PricingComparison({ plans }) {
  const { t } = useTranslation()

  return (
    <section className="bg-white px-6 pb-16 lg:pb-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-black text-slate-900 lg:text-3xl">{t('pricing.page.comparisonTitle')}</h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-slate-600">
            {t('pricing.page.comparisonSubtitle')}
          </p>
        </div>
        <PlanComparison plans={plans} />
      </div>
    </section>
  )
}
