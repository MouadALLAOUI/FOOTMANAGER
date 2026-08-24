import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faEye,
  faFutbol,
  faLandmark,
  faLocationDot,
} from '@fortawesome/free-solid-svg-icons'
import { hideBrokenImage } from '../../lib/imageErrors'

const accents = ['#22c55e', '#f59e0b', '#38bdf8', '#a78bfa', '#fb7185', '#34d399']

function TeamLogo({ color }) {
  return (
    <div
      style={{ borderColor: color }}
      className="grid size-14 place-items-center rounded-2xl border-2 bg-white/10 backdrop-blur-sm transition-transform duration-300 ease-out group-hover:scale-110 md:size-16"
    >
      <FontAwesomeIcon icon={faFutbol} style={{ color }} className="size-7 md:size-8" />
    </div>
  )
}

export default function LiveMatchCard({ match }) {
  const { t } = useTranslation()
  const accentA = accents[match.id % accents.length]
  const accentB = accents[(match.id + 3) % accents.length]

  return (
    <article className="group relative h-[260px] w-[min(420px,86vw)] shrink-0 snap-start overflow-hidden rounded-[28px] shadow-[0_14px_45px_rgba(17,24,39,0.2)] ring-1 ring-slate-200 transition-all duration-300 ease-out hover:-translate-y-2 hover:shadow-[0_32px_75px_rgba(17,24,39,0.38)]">
      <img
        src={match.image}
        alt=""
        loading="lazy"
        decoding="async"
        onError={hideBrokenImage}
        className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/60 to-slate-950/40" />

      <span className="absolute top-4 start-4 rounded-full bg-black/45 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/15 backdrop-blur-sm">
        {match.minute}&#39;
      </span>

      <span className="live-badge absolute top-4 end-4 flex items-center gap-1.5 rounded-full bg-red-600 px-3.5 py-1 text-xs font-bold text-white">
        <span className="size-1.5 rounded-full bg-white" />
        {t('matchesPage.live.badge')}
      </span>

      <div className="absolute inset-x-0 top-14 flex flex-col items-center justify-center px-6 text-center">
        <div className="flex items-center gap-3 md:gap-4">
          <TeamLogo color={accentA} />
          <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-black text-white backdrop-blur-sm">
            {t('matchesPage.live.vs')}
          </span>
          <TeamLogo color={accentB} />
        </div>

        <h3 className="mt-2.5 flex items-center gap-2.5 text-sm font-extrabold text-white md:text-base">
          <span className="max-w-[110px] truncate">{match.home}</span>
          <span className="text-white/40">·</span>
          <span className="max-w-[110px] truncate">{match.away}</span>
        </h3>

        <p key={match.id} className="score-pop mt-1 text-3xl font-black tabular-nums text-white drop-shadow-lg">
          {match.homeScore} — {match.awayScore}
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-4">
        <div className="flex flex-col gap-1 text-[11px] font-semibold text-white/85">
          <span className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={faLocationDot} className="size-3 text-green-400" />
            {match.city}
          </span>
          <span className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={faLandmark} className="size-3 text-green-400" />
            {match.stadium}
          </span>
          <span className="flex items-center gap-1.5">
            <FontAwesomeIcon icon={faFutbol} className="size-3 text-green-400" />
            {t(`matchesPage.teams.formats.${match.format}`)}
          </span>
        </div>

        <button
          type="button"
          className="flex h-10 shrink-0 items-center gap-2 rounded-[14px] bg-white/10 px-4 text-xs font-bold text-white ring-1 ring-white/20 backdrop-blur-sm transition-all duration-300 ease-out hover:bg-green-500 hover:shadow-[0_12px_30px_rgba(22,163,74,0.5)] hover:ring-green-500"
        >
          <FontAwesomeIcon icon={faEye} className="size-3.5" />
          {t('matchesPage.live.details')}
        </button>
      </div>
    </article>
  )
}
