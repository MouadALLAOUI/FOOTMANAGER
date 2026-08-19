import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarXmark,
  faCircleExclamation,
  faMagnifyingGlass,
  faUsersSlash,
} from '@fortawesome/free-solid-svg-icons'
import Reveal from '../matches/reveal'

const icons = [faMagnifyingGlass, faUsersSlash, faCircleExclamation, faCalendarXmark]

export default function AboutProblem() {
  const { t } = useTranslation()
  const items = t('about.problem.items', { returnObjects: true })

  return (
    <section className="bg-white py-[100px] lg:py-[120px]">
      <div className="mx-auto max-w-[1400px] px-6">
        <Reveal>
          <header className="mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-1.5 text-xs font-bold text-rose-600">
              <FontAwesomeIcon icon={faCircleExclamation} className="size-3.5" />
              {t('about.problem.subtitle')}
            </span>
            <h2 className="mt-5 text-3xl font-black text-slate-900 lg:text-4xl">{t('about.problem.title')}</h2>
          </header>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-4">
          {(items || []).map((item, i) => {
            const Icon = icons[i % icons.length]
            return (
              <Reveal key={item.title} delay={i * 90}>
                <article className="group h-full rounded-[26px] bg-white p-8 shadow-[0_8px_30px_rgba(17,24,39,0.08)] ring-1 ring-slate-100 transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_24px_55px_rgba(17,24,39,0.15)] hover:ring-rose-300">
                  <div className="grid size-[62px] place-items-center rounded-2xl bg-rose-50 transition-colors duration-300 group-hover:bg-rose-100">
                    <FontAwesomeIcon
                      icon={Icon}
                      className="size-7 text-rose-500 transition-transform duration-300 ease-out group-hover:scale-110"
                    />
                  </div>
                  <h3 className="mt-6 text-lg font-extrabold text-slate-900">{item.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-500">{item.description}</p>
                </article>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
