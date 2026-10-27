import { AlertCircle, Calendar, Check, CheckCheck, FileText, Loader2, Rocket, ShieldCheck, Sliders, UserPlus } from 'lucide-react'

export const WIZARD_STEPS = [
  { id: 1, key: 'basic', label: 'المعلومات الأساسية والقواعد', icon: FileText, desc: 'الاسم، التواريخ، الملعب، والصيغة مع النصائح والإرشادات' },
  { id: 2, key: 'publish', label: 'نشر البطولة', icon: Rocket, desc: 'فتح باب التسجيل العام للفرق والجمهور' },
  { id: 3, key: 'teams', label: 'إدارة وتسجيل الفرق', icon: UserPlus, desc: 'الإضافة المباشرة، الفريق الحر، ورابط الواتساب' },
  { id: 4, key: 'finalize', label: 'إغلاق التسجيل', icon: CheckCheck, desc: 'تثبيت الفرق والانتقال لمركز الإدارة والقرعة' },
]

export default function ProgressHeader({
  currentStep,
  onStepClick,
  stepStates,
  saving = false,
  lastSavedAt = null,
  tournamentName = '',
}) {
  const completedCount = Object.values(stepStates).filter((s) => s.completed).length
  const totalSteps = WIZARD_STEPS.length
  const progressPct = Math.round((completedCount / totalSteps) * 100)

  return (
    <div className="sticky top-16 z-20 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      {/* Top Bar with Name, Progress % and Auto-save indicator */}
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#0B1F3A] text-white">
            <span className="font-mono text-sm font-black">{currentStep}</span>
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-black text-slate-900">
              {tournamentName || 'إنشاء بطولة جديدة'}
            </h2>
            <p className="text-[11px] font-semibold text-slate-500">
              المرحلة {currentStep} من {totalSteps}: {WIZARD_STEPS[currentStep - 1]?.label}
            </p>
          </div>
        </div>

        {/* Save status & progress bar */}
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end text-end">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
              {saving ? (
                <span className="inline-flex items-center gap-1.5 text-sky-600">
                  <Loader2 className="size-3.5 animate-spin" />
                  جاري الحفظ كمسودة...
                </span>
              ) : lastSavedAt ? (
                <span className="inline-flex items-center gap-1 text-emerald-600">
                  <Check className="size-3.5" />
                  تم الحفظ في قاعدة البيانات
                </span>
              ) : (
                <span className="text-slate-400">مسودة جديدة</span>
              )}
            </div>
            <span className="text-[10px] text-slate-400">
              {completedCount} من {totalSteps} مراحل مكتملة ({progressPct}%)
            </span>
          </div>

          <div className="w-24 sm:w-32">
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/60">
              <div
                className="h-full rounded-full bg-gradient-to-l from-emerald-500 to-green-500 transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stepper Navigation (Horizontal Scrolling for Mobile) */}
      <div className="border-t border-slate-100 bg-slate-50/50">
        <div className="mx-auto flex max-w-7xl items-center gap-1.5 overflow-x-auto px-4 py-2 sm:px-6 scrollbar-none">
          {WIZARD_STEPS.map((step) => {
            const state = stepStates[step.id] || {}
            const isCurrent = currentStep === step.id
            const isCompleted = state.completed
            const needsAttention = state.attention && !isCurrent
            const isAccessible = state.accessible || isCompleted || step.id <= currentStep
            const Icon = step.icon

            let badgeClass = 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            let iconClass = 'bg-slate-100 text-slate-500'

            if (isCurrent) {
              badgeClass = 'bg-white border-emerald-500 text-emerald-700 shadow-sm ring-2 ring-emerald-500/20'
              iconClass = 'bg-emerald-600 text-white'
            } else if (isCompleted) {
              badgeClass = 'bg-emerald-50/60 border-emerald-200 text-emerald-800 hover:bg-emerald-50'
              iconClass = 'bg-emerald-500 text-white'
            } else if (needsAttention) {
              badgeClass = 'bg-amber-50/70 border-amber-300 text-amber-800'
              iconClass = 'bg-amber-500 text-white'
            }

            return (
              <button
                key={step.id}
                type="button"
                disabled={!isAccessible}
                onClick={() => isAccessible && onStepClick(step.id)}
                className={`group flex shrink-0 items-center gap-2 rounded-2xl border px-3.5 py-2 text-start transition-all disabled:opacity-50 disabled:cursor-not-allowed ${badgeClass}`}
                title={step.desc}
              >
                <span className={`grid size-6 shrink-0 place-items-center rounded-xl text-xs font-black transition-colors ${iconClass}`}>
                  {isCompleted && !isCurrent ? (
                    <Check className="size-3.5 stroke-[3]" />
                  ) : needsAttention ? (
                    <AlertCircle className="size-3.5" />
                  ) : (
                    <Icon className="size-3.5" />
                  )}
                </span>
                <div className="min-w-0">
                  <span className="block truncate text-xs font-bold">
                    {step.label}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
