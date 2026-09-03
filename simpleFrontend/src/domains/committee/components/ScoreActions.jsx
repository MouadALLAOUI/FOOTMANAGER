import React from 'react'
import { Check, Clock, Plus } from 'lucide-react'
import TeamScore from './TeamScore'

function ScoreNumber({ value }) {
  return <span key={value} className="score-pop inline-block tabular-nums">{value}</span>
}

export default function ScoreActions({ displayScore, homeTeam, awayTeam, homeName, awayName, alreadyFinished, halftime, liveMinute, timerText, activeHalf, matchNotStarted, onAddEvent, t }) {
  return (
    <div className="shrink-0 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-3">
        <TeamScore side="home" team={homeTeam} name={homeName} />
        <div className="flex flex-col items-center">
          <div className="flex items-end gap-1 text-5xl font-black tracking-tight text-slate-900 sm:text-6xl">
            <ScoreNumber value={displayScore.home} />
            <span className="mx-1 pb-1 text-2xl font-black text-slate-200">-</span>
            <ScoreNumber value={displayScore.away} />
          </div>
          {alreadyFinished ? (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700 ring-1 ring-emerald-200">
              <Check className="size-3.5" />
              {t('committee.result.statusFinished')}
            </span>
          ) : matchNotStarted ? (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700 ring-1 ring-amber-200">
              <Clock className="size-3.5" />
              {t('committee.result.statusNotStarted', 'لم تبدأ بعد')}
            </span>
          ) : halftime ? (
            <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-black text-sky-700 ring-1 ring-sky-200">
              {t('committee.result.statusHalftime')}
            </span>
          ) : (
            <span className="live-badge mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-black text-rose-600 ring-1 ring-rose-200">
              <span className="size-1.5 animate-pulse rounded-full bg-rose-500" />
              {t('committee.result.statusLive')}
              {timerText ? (
                <>
                  <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-black ${activeHalf === 'second' ? 'bg-rose-600 text-white' : 'bg-slate-700 text-white'}`}>
                    {activeHalf === 'second' ? t('committee.result.halfSecondShort') : t('committee.result.halfFirstShort')}
                  </span>
                  <span className="tabular-nums">{timerText}</span>
                </>
              ) : (
                liveMinute > 0 && <span className="tabular-nums">{liveMinute}'</span>
              )}
            </span>
          )}
        </div>
        <TeamScore side="away" team={awayTeam} name={awayName} />
      </div>

      <button
        type="button"
        onClick={onAddEvent}
        className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-green-500 px-4 text-sm font-black text-white shadow-[0_8px_20px_rgba(22,163,74,0.3)] transition-all hover:bg-green-600 active:scale-[0.99]"
      >
        <Plus className="size-5" />
        {t('committee.result.addEvent')}
      </button>
    </div>
  )
}