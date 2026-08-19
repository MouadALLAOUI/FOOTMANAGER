import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChartLine,
  faCircleCheck,
  faHandshake,
  faShieldHalved,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'
import Reveal from '../matches/reveal'

const values = [
  { key: 'trust', icon: faShieldHalved },
  { key: 'community', icon: faUsers },
  { key: 'professional', icon: faChartLine },
  { key: 'inclusive', icon: faHandshake },
]

export default function AboutWho() {
  const { t } = useTranslation()

  return (
    <section id="about-who" className="scroll-mt-[110px] bg-white py-[100px] lg:py-[120px]">
      <div className="mx-auto max-w-[1400px] px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <Reveal>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-green-50 px-4 py-1.5 text-xs font-bold text-green-700">
                <FontAwesomeIcon icon={faCircleCheck} className="size-3.5" />
                {t('about.who.subtitle')}
              </span>
              <h2 className="mt-5 text-3xl font-black text-slate-900 lg:text-4xl">{t('about.who.title')}</h2>
              <p className="mt-5 text-sm leading-[1.9] text-slate-600 lg:text-base">{t('about.who.p1')}</p>
              <p className="mt-4 text-sm leading-[1.9] text-slate-600 lg:text-base">{t('about.who.p2')}</p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="relative overflow-hidden rounded-[32px] bg-[#111827] p-8 shadow-[0_40px_90px_rgba(2,6,23,0.35)] ring-1 ring-white/10 sm:p-10">
              <div
                className="animate-gradient-move pointer-events-none absolute -inset-20 bg-[radial-gradient(70%_90%_at_20%_0%,rgba(16,185,129,0.2),transparent_60%)]"
                aria-hidden="true"
              />
              <FontAwesomeIcon
                icon={faShieldHalved}
                aria-hidden="true"
                className="animate-float pointer-events-none absolute -top-5 end-6 size-20 text-white/5"
              />

              <div className="relative">
                <h3 className="text-lg font-extrabold text-white">{t('about.who.valuesTitle')}</h3>
                <div className="mt-7 space-y-3">
                  {values.map(({ key, icon: Icon }) => (
                    <div
                      key={key}
                      className="flex items-center gap-4 rounded-2xl bg-white/5 px-5 py-4 ring-1 ring-white/10 transition-colors duration-300 hover:bg-white/10"
                    >
                      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-green-500/15 text-green-400">
                        <FontAwesomeIcon icon={Icon} className="size-5" />
                      </span>
                      <span className="text-sm font-bold text-white">{t(`about.who.values.${key}`)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
