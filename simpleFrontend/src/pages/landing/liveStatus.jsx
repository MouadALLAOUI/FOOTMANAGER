import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faLandmark, faFutbol } from '@fortawesome/free-solid-svg-icons'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { formatCount } from '../../lib/adapters'

const stats = [
  { key: 'teams', icon: faFutbol },
  { key: 'fields', icon: faLandmark },
  { key: 'matches', icon: faFutbol },
]

function LivePulseDot() {
  return (
    <span className="relative flex size-2.5 shrink-0">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-500 opacity-75" />
      <span className="relative inline-flex size-2.5 rounded-full bg-red-500" />
    </span>
  )
}

function Equalizer({ barClass = 'bg-green-400' }) {
  return (
    <span className="flex h-4 items-end gap-[3px]" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`eq-bar w-[3px] rounded-full ${barClass}`}
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  )
}

export default function LiveStatus() {
  const { t, i18n } = useTranslation()
  const { data } = useApi(() => api.get('/v1/stats').then((r) => r.data))

  const values = data || {
    teams: null,
    stadiums: null,
    matches: null,
    live_matches: null,
  }

  const valueFor = (key) => {
    if (key === 'teams') return values.teams
    if (key === 'fields') return values.stadiums
    if (key === 'matches') return values.matches
    if (key === 'live') return values.live_matches
    return null
  }

  const liveCount = valueFor('live')

  return (
    <div className="mx-auto mt-8 w-[92%] max-w-6xl lg:mt-10">
      <div className="overflow-hidden rounded-[22px] bg-slate-900/85 shadow-2xl shadow-black/40 ring-1 ring-white/10 backdrop-blur-md">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:h-[90px] lg:flex-row lg:items-center lg:gap-0 lg:p-0">
          <div className="grid flex-1 grid-cols-3 gap-4 sm:gap-6 lg:gap-0">
            {stats.map(({ key, icon: Icon }) => (
              <div
                key={key}
                className="flex items-center justify-center gap-3 text-center lg:justify-center"
              >
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white/10 text-green-400">
                  <FontAwesomeIcon icon={Icon} className="size-5" />
                </span>
                <span className="flex flex-col">
                  <span className="text-[11px] leading-tight text-slate-400">
                    {t(`landing.hero.live.${key}Label`)}
                  </span>
                  <span className="text-lg font-extrabold text-white">
                    {valueFor(key) == null ? '…' : formatCount(valueFor(key), i18n.language)}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-center lg:border-s lg:border-white/10 lg:ps-8 lg:pe-6">
            <Link
              to="/matches"
              className="group flex items-center gap-2.5 rounded-full bg-red-500/10 py-2.5 ps-4 pe-5 ring-1 ring-red-500/35 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-red-500/20 hover:ring-red-500/60 active:translate-y-0"
            >
              <LivePulseDot />
              <span className="text-xl font-extrabold leading-none tabular-nums text-white">
                {liveCount == null ? '…' : formatCount(liveCount, i18n.language)}
              </span>
              <span className="text-xs font-bold text-red-300">
                {t('landing.hero.live.badge')}
              </span>
              <Equalizer barClass="bg-red-400" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
