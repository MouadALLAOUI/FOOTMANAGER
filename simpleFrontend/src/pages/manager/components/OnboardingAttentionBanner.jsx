import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, ArrowLeft, X } from 'lucide-react'
import { useCommandCenter } from './CommandCenterContext'

export default function OnboardingAttentionBanner() {
  const { team } = useCommandCenter()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState(false)

  // Only show if players count is less than 8 or roster not completed
  const count = team?.members_count ?? team?.players?.length ?? 0
  const isSetupIncomplete = count < 8

  if (dismissed || !isSetupIncomplete) return null

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-50 to-orange-50/50 p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-amber-500/20 text-amber-700">
          <AlertCircle className="size-5" />
        </div>
        <div>
          <h4 className="text-xs font-black text-slate-900">
            اللائحة الرسمية لفريقك لم تكتمل بعد ({count} من 8 لاعبين مطلوبين)
          </h4>
          <p className="mt-0.5 text-[11px] text-slate-500">
            للمشاركة في البطولة والمباريات الرسمية، أكمل إضافة تشكيلة اللاعبين الأساسيين.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end sm:self-center">
        <button
          type="button"
          onClick={() => navigate('/onboarding')}
          className="flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-black text-slate-950 shadow-xs transition-colors hover:bg-amber-400"
        >
          <span>وجد اللائحة دابا</span>
          <ArrowLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
        </button>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-200/60 transition-colors"
          title="إغلاق التنبيه"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  )
}
