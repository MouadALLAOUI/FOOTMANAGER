import React, { useState } from 'react'
import { ChevronDown, Info, X } from 'lucide-react'
import { formatTime, matchDay } from '../../../lib/adapters'

export default function HeaderBlock({ t, homeName, awayName, tournament, fixture, onClose }) {
  const [showMeta, setShowMeta] = useState(false)

  return (
    <header className="shrink-0 border-b border-slate-100 px-5 py-3 sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold text-slate-900">
            {homeName}
            <span className="mx-2 text-xs font-black text-slate-300">VS</span>
            {awayName}
          </p>
          <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{t('committee.result.title')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-expanded={showMeta}
            onClick={() => setShowMeta((s) => !s)}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title={t('committee.result.matchMeta')}
          >
            <Info className="size-5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {showMeta && (
        <div className="pop-in mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-xl bg-slate-50 px-3 py-2.5 text-[11px] font-semibold text-slate-500">
          {tournament?.name && (
            <span className="inline-flex min-w-0 items-center gap-1"><span>🏆</span><span className="truncate">{tournament.name}</span></span>
          )}
          {fixture.stadium?.name && (
            <span className="inline-flex min-w-0 items-center gap-1"><span>📍</span><span className="truncate">{fixture.stadium.name}</span></span>
          )}
          {fixture.scheduled_at && (
            <span className="inline-flex items-center gap-1"><span>📅</span>{matchDay(fixture.scheduled_at, 'ar')}</span>
          )}
          {fixture.scheduled_at && (
            <span className="inline-flex items-center gap-1"><span>⏱</span>{formatTime(fixture.scheduled_at)}</span>
          )}
          {fixture.round?.name || fixture.matchday ? (
            <span className="inline-flex items-center gap-1"><span>🏁</span>{fixture.round?.name || t('committee.detail.round', { n: fixture.matchday })}</span>
          ) : null}
          <ChevronDown className="ms-auto size-4 text-slate-400" />
        </div>
      )}
    </header>
  )
}