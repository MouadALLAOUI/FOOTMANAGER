import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLandmark, faTrophy, faUser, faUsers } from '@fortawesome/free-solid-svg-icons'
import Reveal from '../matches/reveal'

const roles = [
  { key: 'players', icon: faUser, soft: 'bg-emerald-50 text-emerald-600', hover: 'group-hover:bg-emerald-100', ring: 'hover:ring-emerald-400' },
  { key: 'managers', icon: faUsers, soft: 'bg-green-50 text-green-600', hover: 'group-hover:bg-green-100', ring: 'hover:ring-green-400' },
  { key: 'owners', icon: faLandmark, soft: 'bg-sky-50 text-sky-600', hover: 'group-hover:bg-sky-100', ring: 'hover:ring-sky-400' },
  { key: 'committees', icon: faTrophy, soft: 'bg-violet-50 text-violet-600', hover: 'group-hover:bg-violet-100', ring: 'hover:ring-violet-400' },
]

export default function AboutAudience() {
  const { t } = useTranslation()
  const data = t('about.audience.roles', { returnObjects: true }) || {}

  return (
    <section className="bg-white py-[100px] lg:py-[120px]">
      <div className="mx-auto max-w-[1400px] px-6">
        <Reveal>
          <header className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-black text-slate-900 lg:text-4xl">{t('about.audience.title')}</h2>
            <p className="mt-4 text-sm leading-relaxed text-slate-500 lg:text-base">{t('about.audience.subtitle')}</p>
          </header>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-4">
          {roles.map(({ key, icon: Icon, soft, hover, ring }, i) => (
            <Reveal key={key} delay={i * 90}>
              <article
                className={`group h-full rounded-[26px] bg-white p-8 text-center shadow-[0_8px_30px_rgba(17,24,39,0.08)] ring-1 ring-slate-100 transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_24px_55px_rgba(17,24,39,0.15)] ${ring}`}
              >
                <div className={`mx-auto grid size-[70px] place-items-center rounded-[22px] ${soft} transition-colors duration-300 ${hover}`}>
                  <FontAwesomeIcon icon={Icon} className="size-8 transition-transform duration-300 ease-out group-hover:scale-110" />
                </div>
                <h3 className="mt-6 text-lg font-extrabold text-slate-900">{data[key]?.title}</h3>
                <p className="mx-auto mt-2.5 max-w-[250px] text-sm leading-relaxed text-slate-500">
                  {data[key]?.description}
                </p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
