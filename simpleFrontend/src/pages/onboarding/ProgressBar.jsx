import { Shield, Calendar, Trophy, Users, CheckCircle2 } from 'lucide-react'

export const STEPS = [
  { id: 'team', label: 'الفريق', icon: Shield, stepNum: 1 },
  { id: 'schedule', label: 'المواعيد', icon: Calendar, stepNum: 2 },
  { id: 'tournament', label: 'البطولة', icon: Trophy, stepNum: 3 },
  { id: 'roster', label: 'اللاعبين', icon: Users, stepNum: 4 },
]

export default function ProgressBar({ currentStep, percentage = 25, onExit }) {
  const currentIdx = STEPS.findIndex((s) => s.id === currentStep)
  const activeIndex = currentIdx >= 0 ? currentIdx : STEPS.length

  return (
    <div className="w-full border-b border-slate-200/80 bg-white shadow-sm">
      <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6">
        {/* Top row: Brand & Pause action */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/15 text-lg font-black text-emerald-600">
              ⚽
            </span>
            <div>
              <h2 className="text-sm font-black text-slate-900">إعداد الفريق لأول مرة</h2>
              <p className="text-[11px] text-slate-400">خطوات بسيطة وسريعة لتجهيز ناديك</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-emerald-700 ring-1 ring-emerald-200/60 sm:inline-block">
              {percentage}% مكتمل
            </span>
            <button
              type="button"
              onClick={onExit}
              className="text-xs font-bold text-slate-400 transition-colors hover:text-slate-700"
            >
              متابعة لاحقاً ✕
            </button>
          </div>
        </div>

        {/* Progress bar line */}
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400 transition-all duration-500 ease-out"
            style={{ width: `${Math.max(percentage, 10)}%` }}
          />
        </div>

        {/* Step icons & titles */}
        <div className="mt-4 grid grid-cols-4 gap-2 text-center">
          {STEPS.map((s, idx) => {
            const isDone = idx < activeIndex
            const isCurrent = idx === activeIndex
            const Icon = s.icon

            return (
              <div
                key={s.id}
                className={`flex flex-col items-center gap-1 transition-all ${
                  isCurrent
                    ? 'text-emerald-600'
                    : isDone
                    ? 'text-slate-700'
                    : 'text-slate-300'
                }`}
              >
                <div
                  className={`flex size-8 items-center justify-center rounded-xl border text-xs font-bold transition-all sm:size-9 ${
                    isDone
                      ? 'border-emerald-500 bg-emerald-500 text-white shadow-sm'
                      : isCurrent
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-sm ring-4 ring-emerald-500/10'
                      : 'border-slate-200 bg-slate-50 text-slate-400'
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="size-4" strokeWidth={2.5} />
                  ) : (
                    <Icon className="size-4" />
                  )}
                </div>
                <span className="text-[11px] font-extrabold sm:text-xs">{s.label}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
