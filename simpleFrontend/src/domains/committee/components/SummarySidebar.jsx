import React from 'react'
import { Trophy } from 'lucide-react'
import MiniStat from './MiniStat'
import { TeamAvatar } from '../../../pages/tournaments/shared'
import ShootoutCard from './ShootoutCard'
import RefereesCard from './RefereesCard'

export default function SummarySidebar({ displayScore, homeTeam, awayTeam, counts, mvp, potmOptions, mvpId, setMvpId, setMvp, mvpRating, setMvpRating, notes, setNotes, isKnockout, homeName, awayName, homePen, awayPen, setHomePen, setAwayPen, refereesProps, t }) {
  return (
    <aside className="order-3 xl:order-1 min-w-0 space-y-5">
      <div className="">
        <div className="flex items-center justify-center gap-3 py-2">
          <TeamAvatar team={homeTeam} className="size-8" />
          <span className="text-2xl font-black tabular-nums text-slate-900">{displayScore.home} - {displayScore.away}</span>
          <TeamAvatar team={awayTeam} className="size-8" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <MiniStat label={t('committee.result.goals')} value={counts.goals} />
          <MiniStat label={t('committee.result.yellowCards')} value={counts.yellows} tone="amber" />
          <MiniStat label={t('committee.result.redCards')} value={counts.reds} tone="rose" />
          <MiniStat label={t('committee.result.substitutions')} value={counts.subs} tone="sky" />
          <MiniStat label={t('committee.result.penaltyGoals')} value={counts.pens} tone="violet" />
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5">
          <Trophy className="size-4 shrink-0 text-amber-500" />
          <span className="truncate text-xs font-bold text-slate-700">{mvp || '—'}</span>
        </div>
      </div>

      {isKnockout && displayScore.home === displayScore.away && (
        <ShootoutCard
          homeName={homeName}
          awayName={awayName}
          homePen={homePen}
          awayPen={awayPen}
          setHomePen={setHomePen}
          setAwayPen={setAwayPen}
          homeTeam={homeTeam}
          awayTeam={awayTeam}
          t={t}
        />
      )}

      <div>
        <div className="relative">
          <select
            className={`${'select'} pe-9`}
            value={mvpId || ''}
            onChange={(e) => {
              const id = e.target.value
              setMvpId(id)
              const p = potmOptions.find((x) => String(x.id) === String(id))
              setMvp(p?.name || '')
            }}
          >
            <option value="">{t('committee.result.selectPlayer')}</option>
            {potmOptions.map((p) => (
              <option key={`${p.team_id}-${p.id}`} value={p.id}>
                {p.name}{p.number ? ` (${p.number})` : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500">{t('committee.result.mvpRating')}</span>
          <div className="flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setMvpRating(n)} aria-label={`${n} stars`} className="p-0.5">
                <span className={`size-4 ${n <= mvpRating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`}>★</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('committee.result.notesPlaceholder')} rows={4} className="input h-auto resize-none py-3" />
      </div>

      <RefereesCard {...refereesProps} t={t} />
    </aside>
  )
}
