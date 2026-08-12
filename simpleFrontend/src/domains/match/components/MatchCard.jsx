import React from 'react'

export default function MatchCard({ match }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold">{match?.home_name} vs {match?.away_name}</div>
          <div className="text-xs text-slate-500">{match?.time}</div>
        </div>
        <div className="text-lg font-black">{match?.home_score} - {match?.away_score}</div>
      </div>
    </div>
  )
}
