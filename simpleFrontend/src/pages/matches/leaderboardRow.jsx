import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCrown, faFutbol, faMapPin, faMedal } from '@fortawesome/free-solid-svg-icons'
import { useProfileModal } from '../../components/profile/ProfileModalContext'
import TeamLogo from '../../components/profile/TeamLogo'

const podium = {
  1: {
    badge: 'from-amber-300 to-amber-500',
    ring: 'ring-amber-300',
    row: 'bg-gradient-to-r from-amber-50 via-white to-emerald-50 shadow-[inset_0_0_0_1px_rgba(245,158,11,0.35)]',
    text: 'text-amber-600',
    medal: faCrown,
  },
  2: {
    badge: 'from-slate-200 to-slate-400',
    ring: 'ring-slate-300',
    row: 'bg-gradient-to-r from-slate-50 via-white to-emerald-50 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.45)]',
    text: 'text-slate-500',
    medal: faMedal,
  },
  3: {
    badge: 'from-orange-300 to-orange-500',
    ring: 'ring-orange-300',
    row: 'bg-gradient-to-r from-orange-50 via-white to-emerald-50 shadow-[inset_0_0_0_1px_rgba(251,146,60,0.4)]',
    text: 'text-orange-600',
    medal: faMedal,
  },
}

const accents = [
  { color: '#059669', soft: 'bg-emerald-50 text-emerald-700' },
  { color: '#ea580c', soft: 'bg-orange-50 text-orange-700' },
  { color: '#2563eb', soft: 'bg-blue-50 text-blue-700' },
  { color: '#7c3aed', soft: 'bg-violet-50 text-violet-700' },
  { color: '#0284c7', soft: 'bg-sky-50 text-sky-700' },
  { color: '#db2777', soft: 'bg-pink-50 text-pink-700' },
]

const gridClass =
  'grid grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-4 md:grid-cols-[64px_minmax(0,1.3fr)_minmax(0,1fr)_88px_88px_88px_96px] md:gap-4 md:px-8'

export default function LeaderboardRow({ row }) {
  const { t } = useTranslation()
  const { openTeam } = useProfileModal()
  const accent = accents[row.id % accents.length]
  const top = podium[row.id]
  const clickable = row.team_id != null

  return (
    <div
      onClick={clickable ? () => openTeam({ id: row.team_id, name: row.name, city: row.city, logo_url: row.logo_url }) : undefined}
      className={`${gridClass} ${clickable ? 'cursor-pointer' : ''} transition-colors duration-300 ${
        top ? `${top.row} ${top.ring} ring-1` : 'hover:bg-slate-50'
      }`}
    >
      <div className="relative">
        <span
          className={`grid size-11 place-items-center rounded-2xl bg-gradient-to-br text-sm font-black text-white shadow-md ${top ? top.badge : 'bg-slate-100 text-slate-500'}`}
        >
          {row.id}
        </span>
        {top && (
          <FontAwesomeIcon
            icon={top.medal}
            className={`absolute -top-2 -end-2 size-5 ${top.text}`}
          />
        )}
      </div>

      <div className="flex min-w-0 items-center gap-3">
        {row.logo_url ? (
          <TeamLogo team={{ name: row.name, logo_url: row.logo_url }} className="size-11" fontSize="text-base" />
        ) : (
          <div
            className={`grid size-11 shrink-0 place-items-center rounded-2xl transition-transform duration-300 ease-out hover:scale-110 ${accent.soft}`}
          >
            <FontAwesomeIcon icon={faFutbol} style={{ color: accent.color }} className="size-6" />
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-slate-900">{row.name}</p>
          <p className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] text-slate-500 md:hidden">
            <FontAwesomeIcon icon={faMapPin} className="size-3 shrink-0 text-slate-400" />
            <span className="truncate">{row.city}</span>
          </p>
        </div>
      </div>

      <span className="hidden items-center gap-1.5 text-sm font-semibold text-slate-500 md:flex">
        <FontAwesomeIcon icon={faMapPin} className="size-3.5 text-slate-400" />
        {row.city}
      </span>

      <span className="hidden text-center text-sm font-semibold tabular-nums text-slate-600 md:block">
        {row.played}
      </span>
      <span className="hidden text-center text-sm font-semibold tabular-nums text-slate-600 md:block">
        {row.wins}
      </span>
      <span className="hidden text-center text-sm font-semibold tabular-nums text-slate-600 md:block">
        {row.goals}
      </span>

      <span className="text-center text-base font-black tabular-nums text-green-600">{row.points}</span>

      <div className="col-span-3 mt-2.5 md:hidden">
        <div className="flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
          {[
            { key: 'played', value: row.played },
            { key: 'wins', value: row.wins },
            { key: 'goals', value: row.goals },
          ].map(({ key, value }, i) => (
            <Fragment key={key}>
              {i > 0 && <span className="text-[11px] text-slate-300">·</span>}
              <span className="flex min-w-0 items-baseline gap-1">
                <span className="text-[13px] font-black tabular-nums text-slate-800">{value}</span>
                <span className="text-[11px] font-semibold text-slate-400">
                  {t(`matchesPage.leaderboard.${key}`)}
                </span>
              </span>
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  )
}
