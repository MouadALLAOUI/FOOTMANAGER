import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import useSeo from '../../hooks/useSeo'
import usePricingData from './usePricingData'
import PricingHero from './hero'
import PricingPlans from './plans'
import PricingComparison from './comparison'
import PricingPayments from './payments'
import PricingLegalLinks from './legalLinks'
import PricingCta from './cta'

export default function Pricing() {
  const { t } = useTranslation()
  const data = usePricingData()

  useSeo({
    title: t('pricing.page.title'),
    description: t('pricing.page.subtitle'),
  })

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  return (
    <main id="main-content">
      <PricingHero />
      <PricingPlans {...data} />
      {data.plans.length > 0 ? <PricingComparison plans={data.plans} /> : null}
      <PricingPayments />
      <PricingLegalLinks />
      <PricingCta />
    </main>
  )
}
