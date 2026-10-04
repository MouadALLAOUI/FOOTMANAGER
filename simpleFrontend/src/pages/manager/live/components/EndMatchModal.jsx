import React from 'react'
import { Flag, X } from 'lucide-react'

export default function EndMatchModal({
  open,
  score,
  homeTeamName,
  awayTeamName,
  onConfirm,
  onClose,
  busy = false,
}) {
  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-match-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <Flag className="size-6" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="إغلاق"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-4">
          <h3 id="end-match-title" className="text-lg font-black text-slate-900">
            هل أنت متأكد من إنهاء المباراة؟
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed font-bold text-slate-500">
            عند إنهاء المباراة سيتم تثبيت النتيجة النهائية وحفظ كافة الأحداث، وتحديث جدول الترتيب والإحصائيات الخاصة بالفريقين.
          </p>
        </div>

        {/* Current score summary card */}
        <div className="mt-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-center">
          <p className="text-[11px] font-bold text-slate-400">النتيجة الحالية</p>
          <div className="mt-1 flex items-center justify-center gap-3">
            <span className="max-w-[120px] truncate text-xs font-black text-slate-800">
              {homeTeamName}
            </span>
            <span className="text-2xl font-black tabular-nums text-slate-900">
              {score.home} - {score.away}
            </span>
            <span className="max-w-[120px] truncate text-xs font-black text-slate-800">
              {awayTeamName}
            </span>
          </div>
        </div>

        <div className="mt-6 flex gap-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-rose-600 py-3 text-xs font-black text-white shadow-sm transition-all hover:bg-rose-700 active:scale-98 disabled:opacity-50"
          >
            <Flag className="size-4" />
            <span>{busy ? 'جارٍ الإنهاء...' : 'نعم، إنهاء المباراة الآن'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-3 text-xs font-black text-slate-700 transition-colors hover:bg-slate-50"
          >
            متابعة اللعب
          </button>
        </div>
      </div>
    </div>
  )
}
