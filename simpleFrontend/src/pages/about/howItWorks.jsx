import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCalendarCheck, faHandshake, faTrophy, faVolleyballBall } from '@fortawesome/free-solid-svg-icons'
import Reveal from '../matches/reveal'

const icons = [faCalendarCheck, faHandshake, faTrophy, faVolleyballBall]

export default function AboutHow() {
  const { t } = useTranslation()
  const steps = t('about.how.steps', { returnObjects: true })

  return (
    <section className="bg-[#f6f7fb] py-[100px] lg:py-[120px]">
      <div className="mx-auto max-w-[1400px] px-6">
        <Reveal>
          <header className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-black text-slate-900 lg:text-4xl">{t('about.how.title')}</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-500 lg:text-base">{t('about.how.subtitle')}</p>
          </header>
        </Reveal>

        <div className="relative mt-16 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4">
          <div
            aria-hidden="true"
            className="absolute left-[12.5%] right-[12.5%] top-[46px] hidden h-0.5 bg-gradient-to-r from-green-500/10 via-green-500/60 to-green-500/10 lg:block"
          />
          {(steps || []).map((step, i) => {
            const Icon = icons[i % icons.length]
            return (
              <Reveal key={step.title} delay={i * 110}>
                <article className="group relative h-full rounded-[26px] bg-white p-8 pt-0 text-center shadow-[0_8px_30px_rgba(17,24,39,0.08)] ring-1 ring-slate-100 transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_24px_55px_rgba(17,24,39,0.15)] hover:ring-green-500">
                  <span className="relative z-10 mx-auto grid size-[92px] -translate-y-1/2 place-items-center rounded-[26px] bg-white ring-1 ring-slate-100 shadow-[0_14px_36px_rgba(17,24,39,0.14)] transition-colors duration-300 group-hover:ring-green-200">
                    <span className="absolute -top-2 start-1/2 flex size-6 -translate-x-1/2 items-center justify-center rounded-full bg-green-500 text-[11px] font-black text-white rtl:translate-x-1/2">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <FontAwesomeIcon
                      icon={Icon}
                      className="size-8 text-green-600 transition-transform duration-300 ease-out group-hover:scale-110"
                    />
                  </span>
                  <h3 className="-mt-4 text-lg font-extrabold text-slate-900">{step.title}</h3>
                  <p className="mx-auto mt-2.5 max-w-[240px] text-sm leading-relaxed text-slate-500">{step.description}</p>
                </article>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
