import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import PlanCard from '../../components/pricing/PlanCard'
import SubscriptionStatus from '../../components/pricing/SubscriptionStatus'
import PlanSkeleton from './planSkeleton'
import PlansErrorState from './errorState'

export default function PricingPlans({
  plans,
  plansLoading,
  plansError,
  plansRefetch,
  subscription,
  subscriptionLoading,
  isAuthenticated,
}) {
  const { t } = useTranslation()
  const [subscribeIntent, setSubscribeIntent] = useState(null)

  const currentPlanSlug = subscription?.plan?.slug ?? null
  const currentPlanPrice =
    subscription?.plan == null ? null : Number(subscription.plan.final_price ?? subscription.plan.price)

  const handleSubscribe = (plan) => {
    setSubscribeIntent((current) => (current === plan.slug ? null : plan.slug))
  }

  return (
    <section className="bg-[#f6f7fb] px-6 pb-16 pt-16 lg:pb-24 lg:pt-24">
      <div className="mx-auto max-w-6xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-black text-slate-900 lg:text-3xl">{t('pricing.page.plansTitle')}</h2>
          <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-slate-600">
            {t('pricing.page.plansSubtitle')}
          </p>
        </div>

        {isAuthenticated ? (
          <SubscriptionStatus
            subscription={subscription?.subscription ?? null}
            plan={subscription?.plan ?? null}
            loading={subscriptionLoading}
          />
        ) : null}

        <div className="mt-12">
          {plansLoading ? (
            <PlanSkeleton />
          ) : plansError ? (
            <PlansErrorState message={plansError} onRetry={plansRefetch} />
          ) : plans.length === 0 ? (
            <div className="mx-auto max-w-md rounded-[26px] bg-white p-10 text-center shadow-[0_8px_30px_rgba(17,24,39,0.08)] ring-1 ring-slate-100">
              <p className="text-sm font-semibold text-slate-500">{t('pricing.page.plansError')}</p>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-8">
              {plans.map((plan) => {
                const isCurrentPlan = plan.slug === currentPlanSlug
                const planPrice = Number(plan.final_price ?? plan.price)
                const actionLabel =
                  currentPlanPrice === null || planPrice === currentPlanPrice
                    ? t('pricing.page.subscribe')
                    : planPrice > currentPlanPrice
                      ? t('pricing.page.upgrade')
                      : t('pricing.page.downgrade')

                return (
                  <div key={plan.slug} className="w-full max-w-lg">
                    <PlanCard
                      plan={plan}
                      isCurrentPlan={isCurrentPlan}
                      isAuthenticated={isAuthenticated}
                      actionLabel={actionLabel}
                      comingSoon={subscribeIntent === plan.slug}
                      onSubscribe={handleSubscribe}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
