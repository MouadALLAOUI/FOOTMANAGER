import React from 'react'

export default function MatchCard({ match }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold">{match?.home_name} vs {match?.away_name}</div>
          <div className="text-xs text-slate-500">{match?.time}</div>
        </div>
        <div className="inline-flex items-center gap-1.5 text-lg font-black font-mono tabular-nums">
          <span>{match?.home_score ?? 0}</span>
          <span className="text-slate-400 font-sans">-</span>
          <span>{match?.away_score ?? 0}</span>
        </div>
      </div>
    </div>
  )
}
