import React, { useEffect } from 'react'
import { AlertTriangle, Check, X } from 'lucide-react'
import TeamLogo from '../../../components/profile/TeamLogo'
import useScrollLock from '../../../components/useScrollLock'

export default function CumulativePenaltyModal({
  open,
  data,
  onScore,
  onMiss,
  onClose,
}) {
  useScrollLock(open)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open || !data) return null

  const {
    offenderName,
    offenderTeam,
    beneficiaryName,
    beneficiaryTeam,
    threshold,
  } = data

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        dir="rtl"
        className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-900/10 text-center animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Top Warning Badge */}
        <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3.5 py-1 text-xs font-black text-amber-900 mb-3 border border-amber-200">
          <AlertTriangle className="size-3.5 text-amber-600 shrink-0" />
          <span>الخطأ التراكمي المكتمل ({threshold}/{threshold})</span>
        </div>

        {/* Modal Header */}
        <h3 className="text-xl sm:text-2xl font-black text-slate-900">
          ركلة جزاء (ضربة جزاء)
        </h3>
        <p className="mt-1 text-xs sm:text-sm font-bold text-slate-500">
          بلغ فريق <span className="text-slate-900 font-black">{offenderName}</span> الحد الأقصى للأخطاء في هذا الشوط ({threshold}/{threshold}).
        </p>

        {/* Matchup Banner */}
        <div className="my-5 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
          <div className="flex items-center justify-between gap-3">
            {/* Offender */}
            <div className="flex-1 flex flex-col items-center text-center">
              <TeamLogo team={offenderTeam} name={offenderName} className="size-12 rounded-2xl ring-2 ring-amber-400 bg-white" />
              <span className="mt-1.5 text-xs font-black text-slate-800 line-clamp-1">{offenderName}</span>
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full mt-0.5">
                المرتكب للخطأ ({threshold})
              </span>
            </div>

            {/* Indicator */}
            <div className="flex flex-col items-center px-2">
              <span className="text-2xl">🥅</span>
              <span className="text-[10px] font-black text-emerald-600 mt-0.5">ركلة جزاء لصالح</span>
            </div>

            {/* Beneficiary */}
            <div className="flex-1 flex flex-col items-center text-center">
              <TeamLogo team={beneficiaryTeam} name={beneficiaryName} className="size-12 rounded-2xl ring-2 ring-emerald-500 bg-white" />
              <span className="mt-1.5 text-xs font-black text-slate-800 line-clamp-1">{beneficiaryName}</span>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mt-0.5">
                المسدد للركلة
              </span>
            </div>
          </div>
        </div>

        {/* The Two Main Action Choices (Scored and Missed) */}
        <div className="grid grid-cols-2 gap-3.5 my-2">
          {/* Choice 1: Scored */}
          <button
            type="button"
            onClick={onScore}
            className="group flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black p-4 shadow-lg shadow-emerald-600/25 transition cursor-pointer"
          >
            <div className="size-12 rounded-2xl bg-white/20 grid place-items-center text-2xl group-hover:scale-110 transition-transform">
              ⚽
            </div>
            <span className="text-base font-black">سُجلت (هدف)</span>
            <span className="text-[11px] font-semibold text-emerald-100 opacity-90 leading-tight">
              احتساب هدف لـ {beneficiaryName}
            </span>
          </button>

          {/* Choice 2: Missed */}
          <button
            type="button"
            onClick={onMiss}
            className="group flex flex-col items-center justify-center gap-1.5 rounded-2xl bg-rose-500 hover:bg-rose-600 active:scale-95 text-white font-black p-4 shadow-lg shadow-rose-500/25 transition cursor-pointer"
          >
            <div className="size-12 rounded-2xl bg-white/20 grid place-items-center text-2xl group-hover:scale-110 transition-transform">
              ❌
            </div>
            <span className="text-base font-black">ضاعت</span>
            <span className="text-[11px] font-semibold text-rose-100 opacity-90 leading-tight">
              إعادة العداد إلى (0/{threshold})
            </span>
          </button>
        </div>

        {/* Footer cancel / close */}
        <div className="mt-4 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-400 hover:text-slate-600 transition"
          >
            إلغاء وإغلاق بدون تسجيل ركلة الجزاء الآن
          </button>
        </div>
      </div>
    </div>
  )
}
