import React from 'react'
import { X } from 'lucide-react'
// TeamAvatar removed; header uses text and emojis now
import { formatTime, matchDay } from '../../../lib/adapters'

export default function HeaderBlock({ t, homeName, awayName, tournament, fixture, onClose }) {
  return (
    <header className="shrink-0 border-b border-slate-100 px-5 py-4 sm:px-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-extrabold tracking-tight text-slate-900">{t('committee.result.title')}</h2>
          <p className="mt-1 text-sm font-bold text-slate-700">
            {homeName}
            <span className="mx-2 text-xs font-black text-slate-300">VS</span>
            {awayName}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-semibold text-slate-500">
            {tournament?.name && (
              <span className="inline-flex items-center gap-1"><span>🏆</span>{tournament.name}</span>
            )}
            {fixture.stadium?.name && (
              <span className="inline-flex items-center gap-1"><span>📍</span>{fixture.stadium.name}</span>
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
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('common.close')}
          className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <X className="size-5" />
        </button>
      </div>
    </header>
  )
}
