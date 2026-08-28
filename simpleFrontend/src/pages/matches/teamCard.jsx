import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCalendarDays,
  faClock,
  faFutbol,
  faHandshake,
  faMapPin,
  faTrophy,
} from '@fortawesome/free-solid-svg-icons'
import { matchDay } from '../../lib/adapters'
import { useProfileModal } from '../../components/profile/ProfileModalContext'

const accents = [
  { color: '#059669', soft: 'bg-emerald-50 text-emerald-700' },
  { color: '#ea580c', soft: 'bg-orange-50 text-orange-700' },
  { color: '#2563eb', soft: 'bg-blue-50 text-blue-700' },
  { color: '#7c3aed', soft: 'bg-violet-50 text-violet-700' },
]

const levelBadges = {
  beginner: 'bg-slate-100 text-slate-600',
  intermediate: 'bg-blue-100 text-blue-700',
  good: 'bg-green-100 text-green-700',
  veryGood: 'bg-teal-100 text-teal-700',
  excellent: 'bg-purple-100 text-purple-700',
}

const levelDots = {
  beginner: 'bg-slate-400',
  intermediate: 'bg-blue-500',
  good: 'bg-green-500',
  veryGood: 'bg-teal-500',
  excellent: 'bg-purple-500',
}

export default function TeamCard({ team, onChallenge }) {
  const { t, i18n } = useTranslation()
  const { openTeam } = useProfileModal()
  const accent = accents[team.id % accents.length]
  const clickable = team.teamId != null

  const openProfile = () => {
    if (!clickable) return
    openTeam({ id: team.teamId, name: team.name, city: team.city, level: team.level })
  }

  return (
    <article className="group flex h-full flex-col rounded-[28px] bg-white p-6 shadow-[0_8px_30px_rgba(17,24,39,0.08)] ring-1 ring-slate-100 transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_26px_60px_rgba(17,24,39,0.16)] hover:ring-green-500/60">
      <div onClick={openProfile} className={`relative block w-full text-center ${clickable ? 'cursor-pointer' : ''}`}>
        <div
          className={`mx-auto grid size-[88px] place-items-center rounded-[26px] transition-transform duration-300 ease-out group-hover:scale-110 ${accent.soft}`}
        >
          <FontAwesomeIcon icon={faFutbol} style={{ color: accent.color }} className="size-11" />
        </div>

        <h3 className="mt-4 text-xl font-extrabold text-slate-900">{team.name}</h3>

        <span
          className={`mt-2.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ${levelBadges[team.level]}`}
        >
          <span className={`size-1.5 rounded-full ${levelDots[team.level]}`} />
          {t(`matchesPage.teams.levels.${team.level}`)}
        </span>
      </div>

      <div className="mt-5 flex flex-col gap-2.5 border-t border-slate-100 pt-5 text-sm">
        <span className="flex items-center gap-2.5 text-slate-600">
          <FontAwesomeIcon icon={faMapPin} className="size-4 text-slate-400" />
          {team.city}
        </span>
        <span className="flex items-center gap-2.5 text-slate-600">
          <FontAwesomeIcon icon={faCalendarDays} className="size-4 text-slate-400" />
          {matchDay(team.day, i18n.language)}
        </span>
        <span className="flex items-center gap-2.5 text-slate-600">
          <FontAwesomeIcon icon={faClock} className="size-4 text-slate-400" />
          {team.time}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1.5 text-[11px] font-bold text-green-700">
          <FontAwesomeIcon icon={faFutbol} className="size-3.5" />
          {t(`matchesPage.teams.formats.${team.format}`)}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
          {t('matchesPage.teams.chips.friendly')}
        </span>
        <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-600">
          <FontAwesomeIcon icon={faTrophy} className="size-3.5 text-slate-400" />
          {t('matchesPage.teams.chips.stadium')}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onChallenge(team)}
        className="btn-ripple mt-5 flex h-[50px] w-full items-center justify-center gap-2 rounded-2xl border-2 border-green-500 text-sm font-bold text-green-600 transition-colors duration-300 ease-out hover:bg-green-500 hover:text-white"
      >
        <FontAwesomeIcon icon={faHandshake} className="size-4" />
        {t('matchesPage.teams.sendRequest')}
      </button>
    </article>
  )
}
