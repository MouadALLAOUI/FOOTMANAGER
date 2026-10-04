import React from 'react'
import Jersey from './Jersey'

export default function PlayerCard({
  player,
  variant = 'home',
  selected = false,
  onClick,
  goals = 0,
  yellowCards = 0,
  redCards = 0,
  isSentOff = false,
  disabled = false,
}) {
  const isRed = redCards > 0 || isSentOff

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isRed}
      aria-pressed={selected}
      className={`group relative flex flex-col items-center justify-between rounded-2xl border p-2.5 transition-all text-center select-none w-full min-h-[118px] sm:min-h-[126px] ${
        selected
          ? 'border-2 border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-md scale-[1.02]'
          : isRed
            ? 'border-rose-200 bg-rose-50/50 opacity-60 cursor-not-allowed'
            : 'border-slate-200/80 bg-white hover:border-emerald-300 hover:bg-slate-50/50 hover:shadow-sm active:scale-[0.98]'
      }`}
    >
      {/* Event badges (Goals / Cards) in corners */}
      <div className="absolute top-1.5 start-1.5 flex items-center gap-1">
        {goals > 0 && (
          <span className="flex items-center gap-0.5 rounded-full bg-slate-900/90 px-1.5 py-0.5 text-[10px] font-black text-white shadow-sm">
            <span>⚽</span>
            {goals > 1 && <span className="tabular-nums">{goals}</span>}
          </span>
        )}
      </div>

      <div className="absolute top-1.5 end-1.5 flex items-center gap-1">
        {yellowCards > 0 && (
          <span
            className="flex items-center justify-center rounded-sm bg-amber-400 px-1 py-0.5 text-[9px] font-black text-slate-900 shadow-sm"
            title="بطاقة صفراء"
          >
            🟨
          </span>
        )}
        {redCards > 0 && (
          <span
            className="flex items-center justify-center rounded-sm bg-rose-600 px-1 py-0.5 text-[9px] font-black text-white shadow-sm"
            title="بطاقة حمراء - طرد"
          >
            🟥
          </span>
        )}
      </div>

      {/* Jersey visual with number or photo */}
      <div className="mt-1 flex items-center justify-center">
        <Jersey
          number={player.number}
          photoUrl={player.photo_thumbnail_url || player.photo_url}
          variant={variant}
          className="h-14 w-12 sm:h-16 sm:w-14"
        />
      </div>

      {/* Player name */}
      <div className="mt-2 w-full px-1">
        <p
          className={`truncate text-xs font-bold leading-tight ${
            selected
              ? 'text-emerald-950 font-black'
              : isRed
                ? 'text-rose-700'
                : 'text-slate-800'
          }`}
          title={player.name}
        >
          {player.name}
        </p>
      </div>

      {/* Sent off banner if red card */}
      {isRed && (
        <span className="mt-0.5 text-[10px] font-black text-rose-600">
          مطرود
        </span>
      )}
    </button>
  )
}
