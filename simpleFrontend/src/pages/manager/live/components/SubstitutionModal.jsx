import React, { useState } from 'react'
import { Check, RefreshCw, X } from 'lucide-react'
import Jersey from './Jersey'

export default function SubstitutionModal({
  open,
  playerOut,
  availableSubstitutes = [],
  teamName,
  variant = 'home',
  onConfirm,
  onClose,
  busy = false,
}) {
  const [selectedSubId, setSelectedSubId] = useState(null)

  if (!open || !playerOut) return null

  const handleConfirm = () => {
    const playerIn = availableSubstitutes.find((p) => p.id === selectedSubId)
    if (!playerIn) return
    onConfirm(playerOut, playerIn)
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="substitution-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
    >
      <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 shadow-2xl sm:rounded-3xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-xl bg-sky-50 text-sky-600">
              <RefreshCw className="size-4" />
            </span>
            <div>
              <h3 id="substitution-title" className="text-base font-black text-slate-800">
                إجراء تبديل
              </h3>
              <p className="text-[11px] font-bold text-slate-400">{teamName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label="إغلاق"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Player Out (اللاعب الخارج) */}
        <div className="mt-4 rounded-2xl border border-rose-100 bg-rose-50/50 p-3">
          <p className="mb-2 text-[11px] font-black text-rose-700">
            اللاعب الخارج (مغادر أرضية الملعب) ⬅️
          </p>
          <div className="flex items-center gap-3">
            <Jersey
              number={playerOut.number}
              variant={variant}
              className="h-12 w-10 shrink-0"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-black text-slate-800">
                {playerOut.name}
              </p>
              <p className="text-[11px] font-semibold text-slate-400">
                رقم القميص {playerOut.number || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* Player In (اللاعب البديل الداخل) */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-black text-slate-700">
              اختر اللاعب البديل (الداخل) ➡️
            </p>
            <span className="text-[11px] font-bold text-slate-400">
              {availableSubstitutes.length} بدلاء متاحين
            </span>
          </div>

          {availableSubstitutes.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-6 text-center text-xs font-semibold text-slate-400">
              لا يوجد بدلاء مؤهلين متاحين على دكة الاحتياط لهذا الفريق
            </div>
          ) : (
            <div className="grid max-h-56 grid-cols-2 gap-2 overflow-y-auto pe-1 sm:grid-cols-3">
              {availableSubstitutes.map((sub) => {
                const isSelected = selectedSubId === sub.id
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setSelectedSubId(sub.id)}
                    className={`flex flex-col items-center justify-between rounded-2xl border p-2 text-center transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/20 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <Jersey
                      number={sub.number}
                      variant={variant}
                      className="h-10 w-9 shrink-0"
                    />
                    <p className="mt-1 line-clamp-1 text-xs font-bold text-slate-800">
                      {sub.name}
                    </p>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-5 flex gap-2 border-t border-slate-100 pt-3">
          <button
            type="button"
            disabled={!selectedSubId || busy}
            onClick={handleConfirm}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 py-3 text-xs font-black text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-98 disabled:opacity-50"
          >
            <Check className="size-4" />
            <span>{busy ? 'جارٍ الحفظ...' : 'تأكيد التبديل'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-600 transition-colors hover:bg-slate-100"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}
