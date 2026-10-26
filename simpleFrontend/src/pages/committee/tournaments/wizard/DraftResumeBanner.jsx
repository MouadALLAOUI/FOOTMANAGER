import { Calendar, ChevronRight, FileEdit, Plus, Sparkles, Trash2, Trophy } from 'lucide-react'
import { Button, Card } from '../../../../components/dashboard/ui'

export default function DraftResumeBanner({
  drafts = [],
  onResumeDraft,
  onStartFresh,
  onDeleteDraft = null,
}) {
  if (!drafts.length) return null

  return (
    <Card className="mb-6 border-sky-200/80 bg-gradient-to-br from-sky-50/50 via-white to-emerald-50/30">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-sky-100">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-sky-500/10 text-sky-600">
            <Sparkles className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">
              لديك مسودات بطولات محفوظة سابقة
            </h3>
            <p className="text-xs text-slate-500">
              يمكنك استئناف العمل على مسودتك الحالية من حيث توقفت أو إنشاء بطولة جديدة مستقلة.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onStartFresh}
          className="shrink-0 text-xs"
        >
          <Plus className="size-3.5" />
          بدء بطولة جديدة كلياً
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {drafts.slice(0, 3).map((draft) => {
          const step = draft.plan?.wizard?.current_step || 1
          const completedSteps = draft.plan?.wizard?.completed_steps?.length || 0

          return (
            <div
              key={draft.id}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 transition-all hover:border-sky-300 hover:shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                    <FileEdit className="size-3" />
                    مسودة قيد الإعداد
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {draft.start_date || 'تاريخ غير محدد'}
                  </span>
                </div>

                <h4 className="mt-2 text-sm font-extrabold text-slate-900 truncate">
                  {draft.name}
                </h4>

                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <span>الخطوة {step} من 7</span>
                  <span>•</span>
                  <span>{draft.tournament_format === 'league' ? 'دوري' : 'مجموعات وإقصائيات'}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => onResumeDraft(draft)}
                  className="w-full text-xs"
                >
                  استئناف هذه المسودة
                  <ChevronRight className="size-3.5 rtl:rotate-180" />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
