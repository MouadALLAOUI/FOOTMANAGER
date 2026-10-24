import React, { useState, useEffect } from 'react'
import { AlertTriangle, ShieldAlert, CheckCircle2, X } from 'lucide-react'
import { Button } from '../../../components/dashboard/ui'

/**
 * OverrideWarningModal:
 * Dedicated confirmation modal when committee chooses to proceed past an advisory scheduling rule.
 * Requires typing the exact Arabic word "تأكيد" to enable proceeding.
 */
export default function OverrideWarningModal({
  isOpen,
  onClose,
  onConfirm,
  warningTitle = 'تحذير في برمجة المباراة',
  warningMessage = 'يوجد تعارض تنظيمي في الموعد أو فترة الراحة المحددة.',
  affectedTeam = null,
  busy = false,
}) {
  const [confirmWord, setConfirmWord] = useState('')

  useEffect(() => {
    if (isOpen) {
      setConfirmWord('')
    }
  }, [isOpen])

  if (!isOpen) return null

  const isConfirmed = confirmWord.trim() === 'تأكيد'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      dir="rtl"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-amber-200 overflow-hidden flex flex-col p-6 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Warning Icon & Header */}
        <div className="flex items-start gap-4">
          <div className="size-12 rounded-2xl bg-amber-100 text-amber-600 border border-amber-200 grid place-items-center shrink-0">
            <AlertTriangle className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-black text-slate-900 leading-snug">
              {warningTitle}
            </h3>
            <p className="text-xs font-bold text-slate-500 mt-1">
              تنبيه تنظيمي للجنة المنظمة
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="size-8 rounded-xl grid place-items-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Warning Details Box */}
        <div className="mt-4 rounded-2xl border border-amber-200/90 bg-amber-50/70 p-3.5 space-y-2">
          <p className="text-xs font-bold text-amber-950 leading-relaxed">
            {warningMessage}
          </p>

          {affectedTeam && (
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-800 pt-1 border-t border-amber-200/60">
              <span>الفريق المعني:</span>
              <span className="underline decoration-amber-400 underline-offset-2">{affectedTeam}</span>
            </div>
          )}
        </div>

        {/* Committee Responsibility Note */}
        <div className="mt-3 flex items-start gap-2 text-[11px] font-bold text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
          <ShieldAlert className="size-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            تتحمل اللجنة المنظمة المسؤولية التنظيمية عند تجاوز هذا التحذير، وسيتم توثيق القرار في سجل تدقيق العمليات.
          </span>
        </div>

        {/* Confirmation Word Input */}
        <div className="mt-5 space-y-2">
          <label className="block text-xs font-black text-slate-700">
            لتأكيد المتابعة وتجاوز التحذير، اكتب كلمة <span className="text-rose-600 font-black px-1">تأكيد</span> أدناه:
          </label>
          <input
            type="text"
            value={confirmWord}
            onChange={(e) => setConfirmWord(e.target.value)}
            placeholder="اكتب: تأكيد"
            disabled={busy}
            autoFocus
            className="w-full h-11 px-3.5 rounded-xl border-2 border-slate-200 focus:border-amber-500 focus:outline-none text-sm font-black text-slate-900 bg-white placeholder-slate-400 transition-colors text-center"
          />
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center gap-2.5">
          <Button
            type="button"
            variant="danger"
            disabled={!isConfirmed || busy}
            loading={busy}
            onClick={onConfirm}
            className="flex-1 h-11 text-xs font-black shadow-md shadow-rose-600/20"
          >
            <CheckCircle2 className="size-4" />
            <span>تأكيد المتابعة وتجاوز التحذير</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
            className="h-11 px-4 text-xs font-bold text-slate-600"
          >
            <span>إلغاء واختيار موعد آخر</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
