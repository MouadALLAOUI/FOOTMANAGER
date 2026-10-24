import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  Ban,
  Calendar,
  CheckCircle2,
  Clock,
  DoorOpen,
  HelpCircle,
  Info,
  Loader2,
  Lock,
  MapPin,
  RotateCcw,
  ShieldAlert,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import api from '../../../api/client'
import { Badge, Button, Modal, Skeleton } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import TeamLogo from '../../../components/profile/TeamLogo'

export default function TeamDisciplinePreviewModal({
  open,
  onClose,
  tournamentId,
  team,
  actionType = 'withdraw', // 'withdraw' | 'disqualify'
  onSuccess,
}) {
  const { toast } = useToast()
  const isWithdraw = actionType === 'withdraw'
  const actionLabel = isWithdraw ? 'انسحاب' : 'طرد'
  const newStatusLabel = isWithdraw ? 'منسحب' : 'مُقصى'

  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [data, setData] = useState(null)
  const [reason, setReason] = useState('')

  useEffect(() => {
    if (open && tournamentId && team?.id) {
      setLoading(true)
      setReason('')
      api
        .get(`/committee/tournaments/${tournamentId}/teams/${team.id}/discipline-preview`)
        .then((res) => {
          setData(res.data?.data || null)
        })
        .catch((err) => {
          toastApiError(err)
        })
        .finally(() => {
          setLoading(false)
        })
    }
  }, [open, tournamentId, team?.id])

  if (!open) return null

  const handleConfirm = async () => {
    if (!team?.id || submitting) return
    setSubmitting(true)
    try {
      const endpoint = isWithdraw ? 'withdraw' : 'disqualify'
      const res = await api.post(`/committee/tournaments/${tournamentId}/teams/${team.id}/${endpoint}`, {
        reason: reason.trim() || undefined,
      })
      toast.success(res.data?.message || `تم تسجيل ${actionLabel} الفريق بنجاح`)
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      toastApiError(err)
    } finally {
      setSubmitting(false)
    }
  }

  const remainingMatches = data?.remaining_matches || []
  const completedMatches = data?.completed_matches || []
  const inProgressMatches = data?.in_progress_matches || []
  const defaultWinScore = data?.tournament?.default_win_score || '3-0'
  const pointsForWin = data?.tournament?.points_for_win || 3

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isWithdraw ? 'تأكيد انسحاب الفريق من البطولة' : 'تأكيد طرد الفريق من البطولة'}
      subtitle="معاينة التبعات الرياضية والإدارية قبل الاعتماد النهائي"
    >
      <div className="space-y-5" dir="rtl">
        {/* Selected Team Identification */}
        <div className={`flex items-center gap-3.5 rounded-2xl border p-4 ${
          isWithdraw ? 'border-amber-200 bg-amber-50/60' : 'border-rose-200 bg-rose-50/60'
        }`}>
          <TeamLogo team={team} className="size-12 rounded-xl" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="truncate text-base font-black text-slate-900">{team?.name || '—'}</h4>
              <Badge variant={isWithdraw ? 'warning' : 'danger'}>
                الحالة المرتقبة: {newStatusLabel}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">
              {team?.city ? `${team.city} • ` : ''}معرف الفريق: #{team?.id}
            </p>
          </div>
        </div>

        {/* Live Match Alert if any */}
        {inProgressMatches.length > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-rose-300 bg-rose-100/80 p-3.5 text-xs font-bold text-rose-900">
            <ShieldAlert className="size-5 shrink-0 text-rose-600 mt-0.5" />
            <div>
              <p className="font-black text-rose-950">تنبيه: توجد مباراة جارية حالياً للفريق!</p>
              <p className="mt-0.5 text-[11px] text-rose-800 leading-relaxed">
                سيتم تسجيل قرار {actionLabel} في حالة الفريق، ولكن لن يتم تطبيق أي تبعات رياضية أو نتائج اعتبارية على المباريات المتبقية إلا بعد انتهاء المباراة الجارية وتسجيل نتيجتها عبر مسار المباريات المعتاد.
              </p>
            </div>
          </div>
        )}

        {/* Consequences Preview Checklist */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
          <p className="text-xs font-black text-slate-800 flex items-center gap-2">
            <Info className="size-4 text-emerald-600" />
            التبعات المترتبة على هذا القرار:
          </p>

          <div className="space-y-2 text-xs font-semibold text-slate-600">
            <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-2.5">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>
                <strong className="text-slate-900">المباريات المكتملة السابقة ({completedMatches.length}):</strong> ستبقى جميع نتائجها وأحداثها وإحصائياتها ملعوبة ومحفوظة بنسبة 100% دون أي تغيير.
              </span>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-2.5">
              <CheckCircle2 className="size-4 shrink-0 text-amber-600 mt-0.5" />
              <span>
                <strong className="text-slate-900">المباريات المتبقية ({remainingMatches.length}):</strong> لن تُعتمد النتائج الاعتبارية بالجملة تلقائياً؛ بل تتطلب كل مباراة مراجعة واعتماداً فردياً منفصلاً من اللجنة المنظمة.
              </span>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-2.5">
              <CheckCircle2 className="size-4 shrink-0 text-blue-600 mt-0.5" />
              <span>
                <strong className="text-slate-900">نقاط الفوز فقط:</strong> النتيجة الاعتبارية المعتمدة هي ({defaultWinScore}) وتمنح ({pointsForWin}) نقاط للفوز فقط، دون إضافة أي أهداف لحصيلة الأهداف المسجلة أو المستقبلة، ولا تؤثر على فارق الأهداف.
              </span>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-2.5">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>
                <strong className="text-slate-900">إحصائيات اللاعبين:</strong> إحصائيات وأهداف لاعبي الفريق والخصوم في المباريات التي تم لعبها فعلياً لن يُعاد كتابتها أو المساس بها.
              </span>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-2.5">
              <CheckCircle2 className="size-4 shrink-0 text-indigo-600 mt-0.5" />
              <span>
                <strong className="text-slate-900">حجوزات الملاعب:</strong> لا يتم إلغاء أو تحويل الحجوزات الخاصة بالفريق، بينما يتم تحرير الحجوزات المستعارة أو المخصصة، وتُحال الحالات غير المحددة أو المتعارضة للمراجعة اليدوية.
              </span>
            </div>

            <div className="flex items-start gap-2.5 rounded-xl bg-slate-50 p-2.5">
              <CheckCircle2 className="size-4 shrink-0 text-slate-700 mt-0.5" />
              <span>
                <strong className="text-slate-900">إمكانية التراجع:</strong> يمكن للجنة التراجع عن هذا القرار واستعادة نشاط الفريق طالما لم يتم تطبيق نتيجة اعتبارية على أي من المباريات المتبقية. بمجرد تطبيق أول نتيجة اعتبارية يصبح القرار نهائياً.
              </span>
            </div>
          </div>
        </div>

        {/* Affected Remaining Matches List */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h5 className="text-xs font-black text-slate-800">
              المباريات المتبقية التي ستتطلب مراجعة فردية ({remainingMatches.length})
            </h5>
            <span className="text-[11px] text-slate-400 font-medium">مراجعة فردية لكل مباراة</span>
          </div>

          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-14 rounded-xl" />
              <Skeleton className="h-14 rounded-xl" />
            </div>
          ) : remainingMatches.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-4 text-center text-xs font-bold text-slate-400">
              لا توجد مباريات متبقية للفريق في هذا الدور.
            </p>
          ) : (
            <div className="max-h-48 space-y-2 overflow-y-auto pe-1">
              {remainingMatches.map((m) => (
                <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 text-xs">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-slate-900">
                        {m.is_home ? `${m.team_name} ضد ${m.opponent?.name || '—'}` : `${m.opponent?.name || '—'} ضد ${m.team_name}`}
                      </span>
                      <span className="text-[10px] text-slate-400">الجولة {m.matchday || '—'}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                      {m.scheduled_at && <span className="flex items-center gap-1"><Calendar className="size-3" />{m.scheduled_at}</span>}
                      {m.stadium_name && <span className="flex items-center gap-1"><MapPin className="size-3" />{m.stadium_name}</span>}
                    </div>
                    {m.booking_info && (
                      <p className="mt-1 text-[10px] font-bold text-indigo-700 bg-indigo-50/70 px-2 py-0.5 rounded-md inline-block">
                        الملعب: {m.booking_info.status_label}
                      </p>
                    )}
                  </div>
                  <Badge variant="neutral">تتطلب اعتماداً لاحقاً</Badge>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reason / Internal Committee Note */}
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-700">
            ملاحظات أو سبب {actionLabel} (سجل داخلي للجنة المنظمة)
          </label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={`اذكر سبب قرار ${actionLabel} لتوثيقه في سجل التدقيق الداخلي...`}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
          />
        </div>

        {/* Action Buttons: Confirm & Cancel */}
        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <Button
            type="button"
            className="flex-1"
            variant={isWithdraw ? 'warning' : 'danger'}
            loading={submitting}
            onClick={handleConfirm}
          >
            {isWithdraw ? <DoorOpen className="size-4" /> : <Ban className="size-4" />}
            تأكيد {actionLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            disabled={submitting}
            onClick={onClose}
          >
            تراجع
          </Button>
        </div>
      </div>
    </Modal>
  )
}
