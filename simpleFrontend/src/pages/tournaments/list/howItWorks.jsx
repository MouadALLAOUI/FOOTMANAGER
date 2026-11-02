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
        <p className="text-[11px] font-extrabold tracking-[0.18em] text-[#16834A] dark:text-[#D0FF38] uppercase">
          {t('common.appName')}
        </p>
        <h2 className="mt-2 text-2xl font-black text-[#111313] dark:text-[#D0FF38] md:text-3xl">
          {t('public.tournaments.howItWorks.title')}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#65706A] dark:text-[#B2B9B3]">
          {t('public.tournaments.howItWorks.subtitle')}
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {STEPS.map(({ icon: Icon, key }, i) => {
          const connector = i < STEPS.length - 1
          return (
            <div key={key} className="relative">
              <div className="group relative h-full rounded-[28px] border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-7 shadow-xs transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <span className="grid size-14 place-items-center rounded-2xl bg-[#B8F000]/20 dark:bg-[#D0FF38]/20 text-[#16834A] dark:text-[#D0FF38] ring-1 ring-[#B8F000]/30 transition-transform duration-300 group-hover:scale-110">
                    <Icon className="size-6" strokeWidth={1.8} />
                  </span>
                  <span className="text-5xl font-black text-slate-200 dark:text-[#252B27] transition-colors group-hover:text-[#B8F000]/40">
                    {i + 1}
                  </span>
                </div>
                <h3 className="mt-5 text-base font-extrabold text-[#111313] dark:text-[#F5F7F2]">
                  {t(`public.tournaments.howItWorks.${key}Title`)}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-[#65706A] dark:text-[#B2B9B3]">
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