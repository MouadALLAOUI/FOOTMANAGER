import { useTranslation } from 'react-i18next'
import { ArrowDown, CircleHelp } from 'lucide-react'
import { hideBrokenImage } from '../../../lib/imageErrors'

function StatPlaceholder() {
  return <span className="mx-auto block h-7 w-16 animate-pulse rounded-lg bg-white/15" />
}

export default function TournamentsHero({ stats }) {
  const { t, i18n } = useTranslation()
  const isAr = i18n.language.startsWith('ar')

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <section className="relative overflow-hidden bg-slate-950">
      <img
        src="/backgrounds/hero_section_bg.jpeg"
        alt=""
        fetchPriority="high"
        decoding="async"
        onError={hideBrokenImage}
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-slate-950/72" />
      <div className="absolute inset-0 bg-[radial-gradient(70%_120%_at_50%_0%,rgba(22,163,74,0.35),transparent_65%)]" />
      <div
        className={`pointer-events-none absolute -top-24 ${isAr ? 'start-1/3' : 'start-1/4'} size-[26rem] rounded-full bg-green-500/25 blur-[130px] animate-float`}
      />
      <div
        className={`pointer-events-none absolute -bottom-32 ${isAr ? 'end-1/4' : 'end-1/5'} size-72 rounded-full bg-emerald-400/20 blur-[110px]`}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-6 py-20 text-center md:py-24">
        <span
          className={`inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-extrabold text-green-300 backdrop-blur-md ${
            isAr ? 'tracking-normal' : 'tracking-[0.22em] uppercase'
          }`}
        >
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-green-400" />
          </span>
          {t('public.tournaments.hero.eyebrow')}
        </span>

        <h1 className="mt-6 text-4xl leading-tight font-black text-white drop-shadow-lg sm:text-5xl md:text-6xl">
          {t('public.tournaments.hero.titleLine1')}
          <br />
          <span className="text-green-400">{t('public.tournaments.hero.titleLine2')}</span>
        </h1>

        <p className="mt-5 max-w-2xl text-sm leading-relaxed text-white/80 md:text-base">
          {t('public.tournaments.hero.subtitle')}
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => scrollTo('tournaments-section')}
            className="btn-ripple flex h-12 items-center gap-2 rounded-[16px] bg-green-500 px-8 text-sm font-bold text-white shadow-[0_14px_35px_rgba(22,163,74,0.5)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-green-600 hover:shadow-[0_20px_50px_rgba(22,163,74,0.6)] active:translate-y-0"
          >
            <ArrowDown className="size-4" />
            {t('public.tournaments.hero.explore')}
          </button>
          <button
            type="button"
            onClick={() => scrollTo('how-it-works')}
            className="flex h-12 items-center gap-2 rounded-[16px] border-2 border-white/70 px-8 text-sm font-bold text-white backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-green-700 active:translate-y-0"
          >
            <CircleHelp className="size-4" />
            {t('public.tournaments.hero.howItWorks')}
          </button>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          {[
            { key: 'statTournaments', value: stats?.total },
            { key: 'statUpcoming', value: stats?.upcoming },
            { key: 'statOpen', value: stats?.open },
          ].map((s, i) => {
            const stat = (
              <div className="flex items-center gap-2.5">
                <span className="text-2xl font-black text-white tabular-nums md:text-3xl">
                  {s.value == null ? <StatPlaceholder /> : s.value}
                </span>
                <span className="max-w-24 text-start text-[11px] leading-tight font-bold text-white/60">
                  {t(`public.tournaments.hero.${s.key}`)}
                </span>
              </div>
            )
            return (
              <div key={s.key} className="flex items-center gap-8">
                {stat}
                {i < 2 && <span className="hidden h-9 w-px bg-white/15 sm:block" />}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}