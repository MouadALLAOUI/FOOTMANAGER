import { useTranslation } from 'react-i18next'
import { Compass, ClipboardCheck, Trophy } from 'lucide-react'

const STEPS = [
  { icon: Compass, key: 'step1' },
  { icon: ClipboardCheck, key: 'step2' },
  { icon: Trophy, key: 'step3' },
]

export default function HowItWorks() {
  const { t } = useTranslation()

  return (
    <section id="how-it-works" className="scroll-mt-24">
      <div className="mb-10 text-center">
        <p className="text-[11px] font-extrabold tracking-[0.18em] text-green-600 uppercase">
          {t('common.appName')}
        </p>
        <h2 className="mt-2 text-2xl font-black text-slate-900 md:text-3xl">
          {t('public.tournaments.howItWorks.title')}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          {t('public.tournaments.howItWorks.subtitle')}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {STEPS.map(({ icon: Icon, key }, i) => {
          const connector = i < STEPS.length - 1
          return (
            <div key={key} className="relative">
              <div className="group relative h-full rounded-[28px] border border-slate-200/70 bg-white p-7 shadow-[0_8px_30px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:border-green-500/40 hover:shadow-[0_18px_40px_rgba(15,23,42,0.1)]">
                <div className="flex items-center justify-between">
                  <span className="grid size-14 place-items-center rounded-2xl bg-green-50 text-green-600 ring-1 ring-green-100 transition-transform duration-300 group-hover:scale-110">
                    <Icon className="size-6" strokeWidth={1.8} />
                  </span>
                  <span className="text-5xl font-black text-slate-100 transition-colors group-hover:text-green-100">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-base font-extrabold text-slate-900">
                  {t(`public.tournaments.howItWorks.${key}Title`)}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-slate-500">
                  {t(`public.tournaments.howItWorks.${key}Desc`)}
                </p>
              </div>

              {connector && (
                <div className="pointer-events-none absolute top-1/2 z-10 hidden -end-4 w-4 -translate-y-1/2 border-t-2 border-dashed border-slate-300 md:block" aria-hidden="true" />
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}