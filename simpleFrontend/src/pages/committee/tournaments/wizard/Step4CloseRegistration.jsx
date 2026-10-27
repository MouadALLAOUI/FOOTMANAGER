import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Lock,
  LockOpen,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react'
import api from '../../../../api/client'
import { Button, Card, Empty } from '../../../../components/dashboard/ui'
import { useToast } from '../../../../components/ui/Toast'
import { toastApiError } from '../../../../lib/errors'

export default function Step4CloseRegistration({
  tournament,
  refresh,
}) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  const registeredCount = Number(tournament.stats?.registered_teams || 0)
  const targetTeams = Number(tournament.teams_count || 8)
  const isQuotaReached = registeredCount >= targetTeams

  const isClosed =
    tournament.status === 'registration_closed' ||
    tournament.status === 'in_progress' ||
    tournament.status === 'completed'

  const handleCloseRegistration = async () => {
    setBusy(true)
    try {
      await api.post(`/committee/tournaments/${tournament.id}/close-registration`)
      toast.success('تم إغلاق باب التسجيل وتثبيت الفرق المشاركة رسمياً')
      if (refresh) refresh()
    } catch (err) {
      toastApiError(err)
    } finally {
      setBusy(false)
    }
  }

  const handleReopenRegistration = async () => {
    setBusy(true)
    try {
      await api.post(`/committee/tournaments/${tournament.id}/open-registration`)
      toast.success('تمت إعادة فتح باب التسجيل للفرق')
      if (refresh) refresh()
    } catch (err) {
      toastApiError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card
        title="المرحلة الختامية: إغلاق التسجيل وتأكيد الفرق"
        subtitle="بعد اكتمال تسجيل الفرق، قم بإغلاق باب التسجيل للانتقال إلى مرحلة القرعة وجدولة المباريات."
      >
        <div className="space-y-6 py-2">
          {/* Quota Banner */}
          <div
            className={`flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl p-5 border ${
              isQuotaReached
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                : 'bg-amber-50/70 border-amber-200 text-amber-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`grid size-12 shrink-0 place-items-center rounded-2xl ${
                  isQuotaReached ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
                }`}
              >
                <Users className="size-6" />
              </div>
              <div>
                <h3 className="text-sm font-black">
                  {isQuotaReached
                    ? 'اكتمل النصاب المطلوب لفرق البطولة'
                    : `نصاب الفرق غير مكتمل بعد (${registeredCount} من أصل ${targetTeams})`}
                </h3>
                <p className="mt-0.5 text-xs text-slate-600">
                  {isQuotaReached
                    ? 'يمكنك الآن إغلاق التسجيل رسمياً وبدء مرحلة توزيع المجموعات والقرعة.'
                    : 'يمكنك إغلاق التسجيل الآن بالاكتفاء بالعدد الحالي، أو العودة لإضافة المزيد من الفرق.'}
                </p>
              </div>
            </div>

            <div className="shrink-0 font-mono text-sm font-black px-3 py-1.5 rounded-xl bg-white/80 border border-slate-200">
              {registeredCount} / {targetTeams} فرق
            </div>
          </div>

          {/* Action Decision */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col items-center text-center">
            {isClosed ? (
              <div className="space-y-4 max-w-md">
                <div className="grid size-14 place-items-center rounded-full bg-emerald-100 text-emerald-700 mx-auto">
                  <CheckCircle2 className="size-7" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    تم إغلاق باب التسجيل رسمياً
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    قائمة الفرق مثبتة ومؤكدة. يمكنك الآن التوجه مباشرة إلى مركز إدارة البطولة لتوليد القرعة وجدولة المباريات.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => navigate(`/committee/tournaments/${tournament.id}`)}
                    className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-6 shadow-md transition-all cursor-pointer"
                  >
                    <Trophy className="size-4" />
                    <span>الدخول لمركز إدارة البطولة والقرعة</span>
                    <ChevronLeft className="size-4 rtl:rotate-180" />
                  </button>

                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleReopenRegistration}
                    className="flex h-12 items-center justify-center gap-1.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 transition-colors cursor-pointer"
                  >
                    <LockOpen className="size-3.5 text-slate-500" />
                    <span>إعادة فتح التسجيل</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-md">
                <div className="grid size-14 place-items-center rounded-full bg-slate-100 text-slate-700 mx-auto">
                  <Lock className="size-6" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    تثبيت الفرق وإغلاق التسجيل
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                    بالضغط على الزر أدناه، سيتم إيقاف استقبال طلبات جديدة للفرق واعتماد القائمة الحالية للمنافسة.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={busy || registeredCount === 0}
                    onClick={handleCloseRegistration}
                    className="flex h-13 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-sm px-8 shadow-xl transition-all cursor-pointer disabled:opacity-50 mx-auto"
                  >
                    <Lock className="size-4" />
                    <span>إغلاق باب التسجيل رسمياً</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
