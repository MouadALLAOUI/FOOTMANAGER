import React from 'react'
import { Check } from 'lucide-react'
import TeamScore from './TeamScore'

function ScoreNumber({ value }) {
  return <span key={value} className="score-pop inline-block tabular-nums">{value}</span>
}

export default function ScoreActions({ displayScore, homeTeam, awayTeam, homeName, awayName, alreadyFinished, liveMinute, openForm, quickActions, t }) {
  return (
    <div className="shrink-0 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-6">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <TeamScore side="home" team={homeTeam} name={homeName} score={displayScore.home} />
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
          ) : (
            <span className="live-badge mt-2 inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-black text-rose-600 ring-1 ring-rose-200">
              <span className="size-1.5 animate-pulse rounded-full bg-rose-500" />
              {t('committee.result.statusLive')}
              {liveMinute > 0 && <span className="tabular-nums">{liveMinute}'</span>}
            </span>
          )}
        </div>
        <TeamScore side="away" team={awayTeam} name={awayName} score={displayScore.away} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {quickActions.map((qa) => (
          <button
            key={qa.type}
            type="button"
            onClick={() => openForm(qa.type)}
            className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-3.5 text-xs font-bold transition-all active:scale-[0.97] ${qa.primary
              ? 'bg-green-500 text-white shadow-[0_6px_16px_rgba(22,163,74,0.28)] hover:bg-green-600'
              : 'border border-slate-200/80 bg-slate-50 text-slate-700 hover:border-slate-300 hover:bg-white'
              }`}
          >
            <span className="text-sm leading-none">{qa.icon}</span>
            {t(qa.labelKey)}
          </button>
        ))}
      </div>
    </div>
  )
}
