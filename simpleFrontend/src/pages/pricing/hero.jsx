import { useTranslation } from 'react-i18next'
import { CheckCircle2 } from 'lucide-react'

export default function PricingHero() {
  const { t } = useTranslation()

  return (
    <section className="relative flex flex-col overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-full overflow-hidden rounded-b-[48px] bg-slate-950 sm:rounded-b-[56px] lg:rounded-b-[64px]">
        <img
          src="/backgrounds/hero_section_bg.jpeg"
          alt=""
          fetchPriority="high"
          decoding="async"
          className="size-full object-cover"
        />
        <div className="absolute inset-0 bg-black/70" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-3xl px-6 pb-20 pt-28 text-center lg:pb-24 lg:pt-36">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-bold text-green-300 ring-1 ring-white/20">
          <CheckCircle2 className="size-3.5" />
          {t('pricing.page.badge')}
        </span>
        <h1 className="mt-6 text-3xl font-black text-white sm:text-4xl lg:text-5xl">{t('pricing.page.title')}</h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
          {t('pricing.page.subtitle')}
        </p>
      </div>
    </section>
  )
}
