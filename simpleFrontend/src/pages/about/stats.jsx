import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLandmark, faTrophy, faUsers } from '@fortawesome/free-solid-svg-icons'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { formatCount } from '../../lib/adapters'

function PulseDot() {
  return (
    <span className="relative flex size-3 shrink-0">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-green-400 opacity-75" />
      <span className="relative inline-flex size-3 rounded-full bg-green-400" />
    </span>
  )
}

export default function AboutStats() {
  const { t, i18n } = useTranslation()
  const { data } = useApi(() => api.get('/v1/stats').then((r) => r.data))

  const values = data || {}

  const rows = [
    { key: 'teams', icon: faUsers, label: t('about.stats.teams') },
    { key: 'stadiums', icon: faLandmark, label: t('about.stats.stadiums') },
    { key: 'matches', icon: faTrophy, label: t('about.stats.matches') },
    { key: 'live', icon: null, label: t('about.stats.live') },
  ]

  return (
    <section className="bg-[#f6f7fb] py-[100px] lg:py-[120px]">
      <div className="mx-auto max-w-[1400px] px-6">
        <div className="relative overflow-hidden rounded-[32px] bg-[#111827] px-6 py-14 shadow-[0_45px_100px_rgba(2,6,23,0.35)] ring-1 ring-white/10 sm:p-[56px]">
          <div
            className="animate-gradient-move pointer-events-none absolute -inset-24 bg-[radial-gradient(60%_80%_at_18%_15%,rgba(16,185,129,0.18),transparent_60%),radial-gradient(50%_70%_at_92%_100%,rgba(16,185,129,0.12),transparent_60%)]"
            aria-hidden="true"
          />
          <svg
            className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.05]"
            viewBox="0 0 1440 400"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
            aria-hidden="true"
          >
            <g stroke="#ffffff" strokeWidth="2">
              <line x1="0" y1="200" x2="1440" y2="200" />
              <line x1="720" y1="0" x2="720" y2="400" />
              <circle cx="720" cy="200" r="120" />
            </g>
          </svg>

          <div className="relative">
            <header className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-black text-white lg:text-3xl">{t('about.stats.title')}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400 lg:text-base">
                {t('about.stats.subtitle')}
              </p>
            </header>

            <div className="mt-12 grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4 lg:gap-6">
              {rows.map(({ key, icon: Icon, label }) => (
                <div
                  key={key}
                  className="flex flex-col items-center gap-3 rounded-3xl bg-white/5 px-4 py-8 text-center ring-1 ring-white/10 transition-colors duration-300 hover:bg-white/10"
                >
                  {Icon ? (
                    <span className="grid size-12 place-items-center rounded-2xl bg-green-500/15 text-green-400">
                      <FontAwesomeIcon icon={Icon} className="size-6" />
                    </span>
                  ) : (
                    <span className="grid size-12 place-items-center rounded-2xl bg-red-500/15">
                      <PulseDot />
                    </span>
                  )}
                  <span className="text-3xl font-black text-white lg:text-4xl">
                    {values[key] == null ? '…' : formatCount(values[key], i18n.language)}
                  </span>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
