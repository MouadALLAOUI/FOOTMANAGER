import React, { useState } from 'react'
import { Check, Users, X } from 'lucide-react'
import Jersey from './Jersey'

export default function RosterSelectionModal({
  open,
  teamName,
  variant = 'home',
  presentPlayers = [],
  initialSelectedIds = [],
  matchRosterLimit = 8,
  onSave,
  onClose,
}) {
  const [selectedIds, setSelectedIds] = useState(() => new Set(initialSelectedIds))

  if (!open) return null

  const togglePlayer = (id) => {
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      if (next.size >= matchRosterLimit) return
      next.add(id)
    }
    setSelectedIds(next)
  }

  const handleSave = () => {
    onSave(Array.from(selectedIds))
  }

  const count = selectedIds.size

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="roster-select-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <Users className="size-4" />
            </span>
            <div>
              <h3 id="roster-select-title" className="text-base font-black text-slate-800">
                تحديد لاعبي المباراة
              </h3>
              <p className="text-[11px] font-bold text-slate-400">{teamName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100"
            aria-label="إغلاق"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center justify-between rounded-2xl bg-emerald-50/60 px-4 py-2.5">
          <span className="text-xs font-bold text-emerald-800">
            عدد اللاعبين الحاضرين يتجاوز الحد المسموح به في البطولة
          </span>
          <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-xs font-black text-white">
            {count}/{matchRosterLimit}
          </span>
        </div>

        <div className="mt-4 grid max-h-72 grid-cols-2 gap-2 overflow-y-auto pe-1 sm:grid-cols-3">
          {presentPlayers.map((p) => {
            const isChecked = selectedIds.has(p.id)
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => togglePlayer(p.id)}
                className={`flex flex-col items-center justify-between rounded-2xl border p-2.5 text-center transition-all ${
                  isChecked
                    ? 'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/20 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="relative">
                  <Jersey
                    number={p.number}
                    variant={variant}
                    className="h-10 w-9"
                  />
                  {isChecked && (
                    <span className="absolute -top-1 -end-1 grid size-4 place-items-center rounded-full bg-emerald-600 text-[10px] text-white">
                      ✓
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-1 text-xs font-bold text-slate-800">
                  {p.name}
                </p>
              </button>
            )
          })}
        </div>

        <div className="mt-5 flex gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            disabled={count === 0}
            onClick={handleSave}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-3 text-xs font-black text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-98 disabled:opacity-50"
          >
            <Check className="size-4" />
            <span>حفظ القائمة ({count} لاعبين)</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-600 hover:bg-slate-50"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}
