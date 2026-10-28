import React from 'react'
import { Check, ChevronDown, Clock, Plus } from 'lucide-react'
import TeamLogo from '../../../components/profile/TeamLogo'

function ScoreNumber({ value }) {
  return <span key={value} className="score-pop inline-block tabular-nums font-mono">{value}</span>
}

export default function ScoreActions({
  displayScore,
  homeTeam,
  awayTeam,
  homeName,
  awayName,
  alreadyFinished,
  isDefaultResult = false,
  halftime,
  liveMinute,
  timerText,
  activeHalf,
  matchNotStarted,
  onAddEvent,
  hideAddButton = false,
  t,
}) {
  const currentHalfLabel = activeHalf === 'second'
    ? t('committee.result.halfSecond', 'الشوط الثاني')
    : t('committee.result.halfFirst', 'الشوط الأول')

  return (
    <div className="shrink-0 p-3 sm:p-4 bg-slate-50/80 border-b border-slate-200/80">
      {/* Premium Navy Scoreboard Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#10213A] to-[#0B1F3A] p-4 sm:p-5 text-white shadow-xl border border-slate-700/50">
        {/* Subtle stadium lighting glow */}
        <div className="pointer-events-none absolute -top-12 -left-12 size-36 rounded-full bg-emerald-500/15 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 -right-12 size-36 rounded-full bg-blue-500/15 blur-2xl" />

        <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
          {/* Home Team (Host) */}
          <div className="flex flex-col items-center text-center min-w-0">
            <div className="size-13 sm:size-16 rounded-2xl bg-white/10 border border-white/15 p-1.5 flex items-center justify-center shadow-md shrink-0">
              <TeamLogo
                team={homeTeam}
                name={homeName}
                className="size-full object-contain filter drop-shadow-sm"
              />
            </div>
            <div className="mt-2 flex items-center justify-center gap-1.5 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-white truncate max-w-[105px] sm:max-w-[140px]" title={homeName}>
                {homeName}
              </span>
              {homeTeam?.status === 'withdrawn' && (
                <span className="rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.5 text-[9px] font-black">
                  منسحب
                </span>
              )}
              {homeTeam?.status === 'disqualified' && (
                <span className="rounded-md bg-rose-500/20 text-rose-300 border border-rose-400/40 px-1.5 py-0.5 text-[9px] font-black">
                  مُقصى
                </span>
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">
              {t('match.homeTeam', 'الفريق المضيف')}
            </span>
          </div>

          {/* Center Score & Match Status */}
          <div className="flex flex-col items-center text-center px-1">
            <div className="flex items-center gap-1.5 text-4xl sm:text-5xl font-black tracking-tight text-white drop-shadow font-mono">
              <ScoreNumber value={displayScore.home ?? 0} />
              <span className="text-slate-400 text-3xl font-light">-</span>
              <ScoreNumber value={displayScore.away ?? 0} />
            </div>

            {/* Status Pill */}
            {isDefaultResult ? (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/40 px-3 py-0.5 text-xs font-black text-amber-300">
                <Check className="size-3.5" />
                فوز اعتباري (3 نقاط)
              </span>
            ) : alreadyFinished ? (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 px-3 py-0.5 text-xs font-black text-emerald-300">
                <Check className="size-3.5" />
                {t('committee.result.statusFinished', 'نهاية المباراة')}
              </span>
            ) : matchNotStarted ? (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-500/20 border border-amber-400/40 px-3 py-0.5 text-xs font-black text-amber-300">
                <Clock className="size-3.5" />
                {t('committee.result.statusNotStarted', 'لم تبدأ بعد')}
              </span>
            ) : halftime ? (
              <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-sky-500/20 border border-sky-400/40 px-3 py-0.5 text-xs font-black text-sky-300">
                {t('committee.result.statusHalftime', 'استراحة الشوطين')}
              </span>
            ) : (
              <div className="mt-2 flex flex-col items-center gap-1.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600/90 border border-rose-500/60 px-3 py-0.5 text-[11px] font-black text-white shadow-sm">
                  <span className="size-2 animate-pulse rounded-full bg-white" />
                  <span>{t('committee.result.statusLive', 'مباشر')}</span>
                  <span className="font-mono tabular-nums text-rose-100 ms-1">
                    {timerText || (liveMinute > 0 ? `${liveMinute}'` : '00:00')}
                  </span>
                </span>

                {/* Period Selector / Indicator Pill */}
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 bg-white/10 border border-white/10 px-2.5 py-0.5 rounded-full">
                  <span>{currentHalfLabel}</span>
                  <ChevronDown className="size-3 text-slate-400" />
                </span>
              </div>
            )}
          </div>

          {/* Away Team (Opponent) */}
          <div className="flex flex-col items-center text-center min-w-0">
            <div className="size-13 sm:size-16 rounded-2xl bg-white/10 border border-white/15 p-1.5 flex items-center justify-center shadow-md shrink-0">
              <TeamLogo
                team={awayTeam}
                name={awayName}
                className="size-full object-contain filter drop-shadow-sm"
              />
            </div>
            <div className="mt-2 flex items-center justify-center gap-1.5 flex-wrap">
              <span className="text-xs sm:text-sm font-black text-white truncate max-w-[105px] sm:max-w-[140px]" title={awayName}>
                {awayName}
              </span>
              {awayTeam?.status === 'withdrawn' && (
                <span className="rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/40 px-1.5 py-0.5 text-[9px] font-black">
                  منسحب
                </span>
              )}
              {awayTeam?.status === 'disqualified' && (
                <span className="rounded-md bg-rose-500/20 text-rose-300 border border-rose-400/40 px-1.5 py-0.5 text-[9px] font-black">
                  مُقصى
                </span>
              )}
            </div>
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400">
              {t('match.awayTeam', 'الفريق الضيف')}
            </span>
          </div>
        </div>
      </div>

      {/* Primary Green Action Button: + إضافة حدث */}
      {!hideAddButton && onAddEvent && (
        <button
          type="button"
          onClick={onAddEvent}
          className="mt-3 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#00C853] hover:bg-[#00b047] active:scale-[0.99] text-white text-base font-black shadow-[0_6px_20px_rgba(0,200,83,0.35)] transition-all cursor-pointer select-none"
        >
          <div className="size-6 rounded-full bg-white/20 flex items-center justify-center">
            <Plus className="size-4 stroke-[3]" />
          </div>
          <span>{t('committee.result.addEvent', 'إضافة حدث')}</span>
        </button>
      )}
    </div>
  )
}
