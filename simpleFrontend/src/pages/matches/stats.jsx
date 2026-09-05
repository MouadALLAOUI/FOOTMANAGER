import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarCheck,
  faFutbol,
  faShieldHalved,
  faUserGroup,
} from '@fortawesome/free-solid-svg-icons'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { formatCount } from '../../lib/adapters'
import Reveal from './reveal'

const items = [
  { key: 'matches', icon: faFutbol, color: '#22c55e', soft: 'bg-green-50', field: 'matches' },
  { key: 'teams', icon: faShieldHalved, color: '#f59e0b', soft: 'bg-amber-50', field: 'teams' },
  { key: 'players', icon: faUserGroup, color: '#2563eb', soft: 'bg-blue-50', field: 'players' },
  { key: 'upcoming', icon: faCalendarCheck, color: '#7c3aed', soft: 'bg-violet-50', field: 'upcoming_matches' },
]

export default function CommunityStats() {
  const { t, i18n } = useTranslation()
  const { data } = useApi(() => api.get('/v1/stats').then((r) => r.data))

  return (
    <section className="bg-slate-50 py-[100px] lg:py-[120px]">
      <div className="mx-auto max-w-[1400px] px-6">
        <div className="grid grid-cols-2 gap-5 lg:grid-cols-4 lg:gap-7">
          {items.map(({ key, icon: Icon, color, soft, field }, i) => {
            const value = data?.[field]
            return (
              <Reveal key={key} delay={i * 90}>
                <article className="group relative overflow-hidden rounded-[24px] bg-white p-8 shadow-[0_8px_30px_rgba(17,24,39,0.08)] ring-1 ring-slate-100 transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_26px_60px_rgba(17,24,39,0.14)]">
                  <div
                    aria-hidden="true"
                    className="absolute -end-10 -top-10 size-32 rounded-full bg-[radial-gradient(circle,rgba(34,197,94,0.12),transparent_70%)] transition-transform duration-500 ease-out group-hover:scale-150"
                  />
                  <div
                    className={`grid size-[68px] place-items-center rounded-[20px] transition-transform duration-300 ease-out group-hover:scale-110 ${soft}`}
                  >
                    <FontAwesomeIcon icon={Icon} style={{ color }} className="size-8" />
                  </div>
                  <p className="mt-6 text-4xl font-black tabular-nums text-slate-900">
                    {value == null ? '…' : formatCount(value, i18n.language)}
                  </p>
                  <p className="mt-1.5 text-sm font-semibold text-slate-500">
                    {t(`matchesPage.stats.${key}.label`)}
                  </p>
                </article>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
