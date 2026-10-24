import { useTranslation } from 'react-i18next'
import { ArrowDown, Trophy } from 'lucide-react'
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
    <header className="relative overflow-hidden bg-slate-950">
      <img
        src="/backgrounds/hero_section_bg.jpeg"
        alt=""
        fetchPriority="high"
        decoding="async"
        onError={hideBrokenImage}
        className="absolute inset-0 size-full object-cover"
      />
      <div className="absolute inset-0 bg-slate-950/75" />
      <div className="absolute inset-0 bg-[radial-gradient(70%_120%_at_50%_0%,rgba(22,163,74,0.38),transparent_65%)]" />
      <div
        className={`pointer-events-none absolute -top-24 ${isAr ? 'start-1/3' : 'start-1/4'} size-[26rem] rounded-full bg-green-500/25 blur-[130px] animate-float`}
      />
      <div
        className={`pointer-events-none absolute -bottom-32 ${isAr ? 'end-1/4' : 'end-1/5'} size-72 rounded-full bg-emerald-400/20 blur-[110px]`}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center justify-center px-4 py-14 text-center sm:px-6 sm:py-20 md:py-24">
        <span
          className={`inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-extrabold text-green-300 backdrop-blur-md ${
            isAr ? 'tracking-normal' : 'tracking-[0.22em] uppercase'
          }`}
        >
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex size-1.5 rounded-full bg-green-400" />
          </span>
          {t('public.tournaments.hero.eyebrow', 'دليل بطولات ودوريات كرة القدم بالمغرب')}
        </span>

        <h1 className="mt-5 text-3xl leading-[1.25] font-black text-white drop-shadow-lg sm:text-5xl md:text-6xl">
          {t('public.tournaments.hero.titleLine1', 'منصة بطولات ودوريات')}
          <br />
          <span className="text-green-400">
            {t('public.tournaments.hero.titleLine2', 'كرة القدم في المغرب')}
          </span>
        </h1>

        <p className="mt-4 max-w-2xl text-xs leading-relaxed text-white/80 sm:mt-5 sm:text-sm md:text-base">
          {t(
            'public.tournaments.hero.subtitle',
            'اكتشف دوريات الأحياء وبطولات الهواة عبر مدن المملكة. تابع نتائج المباريات المباشرة، المجموعات، والترتيب المباشر أو نظّم بطولتك باحترافية كاملة.',
          )}
        </p>

        <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:items-center sm:gap-4">
          <button
            type="button"
            onClick={() => scrollTo('tournaments-directory')}
            className="btn-ripple flex h-12 items-center justify-center gap-2 rounded-[16px] bg-green-500 px-7 text-sm font-bold text-white shadow-[0_14px_35px_rgba(22,163,74,0.5)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-green-600 hover:shadow-[0_20px_50px_rgba(22,163,74,0.6)] active:translate-y-0"
          >
            <ArrowDown className="size-4" />
            {t('public.tournaments.hero.explore', 'استكشف البطولات')}
          </button>
          <button
            type="button"
            onClick={() => scrollTo('organizer-section')}
            className="flex h-12 items-center justify-center gap-2 rounded-[16px] border-2 border-white/70 px-7 text-sm font-bold text-white backdrop-blur-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-white hover:bg-white hover:text-green-700 active:translate-y-0"
          >
            <Trophy className="size-4" />
            {t('public.tournaments.hero.organize', 'نظّم بطولتك معنا')}
          </button>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-4 sm:gap-x-8">
          {[
            { key: 'statTournaments', value: stats?.total, fallback: 'إجمالي البطولات' },
            { key: 'statUpcoming', value: stats?.upcoming, fallback: 'بطولات قادمة' },
            { key: 'statOpen', value: stats?.open, fallback: 'التسجيل مفتوح' },
          ].map((s, i) => {
            const stat = (
              <div key={s.key} className="flex items-center gap-2 sm:gap-2.5">
                <span className="text-xl font-black text-white tabular-nums sm:text-2xl md:text-3xl">
                  {s.value == null ? <StatPlaceholder /> : s.value}
                </span>
                <span className="max-w-24 text-start text-[11px] leading-tight font-bold text-white/70">
                  {t(`public.tournaments.hero.${s.key}`, s.fallback)}
                </span>
              </div>
            )
            return (
              <div key={s.key} className="flex items-center gap-5 sm:gap-8">
                {stat}
                {i < 2 && <span className="hidden h-9 w-px bg-white/15 sm:block" />}
              </div>
            )
          })}
        </div>
      </div>
    </header>
  )
}
