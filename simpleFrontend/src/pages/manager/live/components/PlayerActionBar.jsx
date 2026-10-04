import React from 'react'
import { RefreshCw, X } from 'lucide-react'
import Jersey from './Jersey'

export default function PlayerActionBar({
  player,
  teamName,
  variant = 'home',
  onGoal,
  onYellowCard,
  onRedCard,
  onSubstitution,
  onClose,
  busy = null,
}) {
  if (!player) return null

  return (
    <aside
      aria-label="إجراءات اللاعب المحدد"
      className="fixed inset-x-0 bottom-16 z-40 px-3 sm:bottom-20 sm:px-6"
    >
      <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-slate-200/90 bg-white/95 p-2.5 shadow-2xl backdrop-blur-md transition-all sm:p-3.5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Selected Player Info */}
          <div className="flex items-center gap-3 pe-2">
            <div className="shrink-0">
              <Jersey
                number={player.number}
                variant={variant}
                className="h-12 w-10 sm:h-14 sm:w-12"
              />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="truncate text-sm font-black text-slate-900 sm:text-base">
                {player.name}
              </h4>
              <p className="truncate text-[11px] font-bold text-slate-400">
                {teamName || '—'}
              </p>
            </div>

            {/* Mobile close button */}
            <button
              type="button"
              onClick={onClose}
              className="grid size-8 place-items-center rounded-xl bg-slate-100 text-slate-400 transition-colors hover:bg-slate-200 hover:text-slate-700 sm:hidden"
              aria-label="إلغاء التحديد"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:gap-2 sm:overflow-visible sm:pb-0">
            {/* Goal button */}
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={onGoal}
              className="group flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-black text-slate-800 shadow-sm transition-all hover:border-emerald-400 hover:bg-emerald-50 hover:text-emerald-700 active:scale-95 disabled:opacity-50"
            >
              <span className="text-base leading-none">⚽</span>
              <span>هدف</span>
            </button>

            {/* Yellow Card button */}
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={onYellowCard}
              className="group flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-2xl border border-amber-200 bg-amber-50/70 px-3.5 py-2.5 text-xs font-black text-amber-900 shadow-sm transition-all hover:bg-amber-100 active:scale-95 disabled:opacity-50"
            >
              <span className="text-base leading-none">🟨</span>
              <span>بطاقة صفراء</span>
            </button>

            {/* Red Card button */}
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={onRedCard}
              className="group flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-2xl border border-rose-200 bg-rose-50/70 px-3.5 py-2.5 text-xs font-black text-rose-900 shadow-sm transition-all hover:bg-rose-100 active:scale-95 disabled:opacity-50"
            >
              <span className="text-base leading-none">🟥</span>
              <span>بطاقة حمراء</span>
            </button>

            {/* Substitution button */}
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={onSubstitution}
              className="group flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-2xl border border-sky-200 bg-sky-50/80 px-3.5 py-2.5 text-xs font-black text-sky-900 shadow-sm transition-all hover:bg-sky-100 active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className="size-3.5" />
              <span>تبديل</span>
            </button>

            {/* Desktop close button */}
            <button
              type="button"
              onClick={onClose}
              className="hidden sm:grid size-10 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="إلغاء التحديد"
              title="إلغاء التحديد"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
