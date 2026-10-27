import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Dices,
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

export default function Step5FinalizeAndLaunch({
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
      {/* Step Header Card */}
      <Card
        title="المرحلة الخامسة: إغلاق التسجيل وبداية البطولة"
        subtitle="تثبيت قائمة الفرق المتنافسة والانتقال المباشر لتدبير القرعة، جدولة المواعيد، وغرفة العمليات"
      >
        <div className="space-y-6 py-2">
          {/* Quota Status Banner */}
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
                  isQuotaReached ? 'bg-[#10B981] text-white' : 'bg-amber-500 text-white'
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
                    ? 'يمكنك الآن إغلاق باب التسجيل رسمياً والبدء في إجراء القرعة وجدولة المباريات.'
                    : 'يمكنك إغلاق التسجيل الآن واعتماد الفرق الحالية، أو العودة للمرحلة السابقة لإضافة فرق إضافية.'}
                </p>
              </div>
            </div>

            <div className="shrink-0 font-mono text-sm font-black px-3.5 py-1.5 rounded-xl bg-white/90 border border-slate-200 text-slate-800 shadow-2xs">
              {registeredCount} / {targetTeams} فرق
            </div>
          </div>

          {/* Action Decision: Close or Reopen */}
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-xs flex flex-col items-center text-center">
            {isClosed ? (
              <div className="space-y-4 max-w-lg">
                <div className="grid size-14 place-items-center rounded-2xl bg-emerald-100 text-[#10B981] mx-auto shadow-xs">
                  <CheckCircle2 className="size-8" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    تم إغلاق باب التسجيل وتثبيت الفرق رسمياً
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed font-medium">
                    قائمة الفرق المعتمدة جاهزة للانطلاق. استخدم خيارات التوجيه أدناه لتوزيع المجموعات، برمجة المواعيد، وإدارة مباريات البطولة.
                  </p>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={handleReopenRegistration}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs px-4 transition-colors cursor-pointer"
                  >
                    <LockOpen className="size-3.5 text-slate-500" />
                    <span>إعادة فتح باب التسجيل</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 max-w-lg">
                <div className="grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-700 mx-auto">
                  <Lock className="size-7" />
                </div>
                <div>
                  <h4 className="text-base font-black text-slate-900">
                    إغلاق التسجيل وتأكيد الفرق المتنافسة
                  </h4>
                  <p className="mt-1 text-xs text-slate-500 leading-relaxed font-medium">
                    بالضغط على الزر أدناه، سيتم قفل استقبال أي طلبات جديدة وتثبيت الفرق المشاركة للبدء الفوري في إجراءات القرعة وجدولة المباريات.
                  </p>
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    disabled={busy || registeredCount === 0}
                    onClick={handleCloseRegistration}
                    className="flex h-13 w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#10B981] to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-sm px-8 shadow-xl shadow-[#10B981]/25 transition-all hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50 mx-auto"
                  >
                    <Lock className="size-4" />
                    <span>إغلاق باب التسجيل وبدء مرحلة المنافسة</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Smart Operational Guidance: 3 Direct Control Actions */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5 text-[#10B981]" />
          <h3 className="text-base font-black text-slate-900">
            مكان تدبير وإدارة المباريات والجولات
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Direction Card 1: Draw & Groups */}
          <div className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-xs hover:border-[#10B981] hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-600 mb-3 group-hover:scale-110 transition-transform">
                <Dices className="size-6" />
              </div>
              <h4 className="text-sm font-black text-slate-900 mb-1">
                1. إجراء القرعة وتوزيع المجموعات
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                توزيع الفرق المسجلة على المجموعات وتوليد جدول مواجهات الدور الأول تلقائياً أو بالسحب المباشر.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/committee/tournaments/${tournament.id}?tab=draw`)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-white font-black text-xs shadow-sm transition-all cursor-pointer"
            >
              <span>بدء مراسم القرعة</span>
              <ChevronLeft className="size-4 rtl:rotate-180" />
            </button>
          </div>

          {/* Direction Card 2: Schedule & Fixtures */}
          <div className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-xs hover:border-[#10B981] hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="grid size-12 place-items-center rounded-2xl bg-sky-50 text-sky-600 mb-3 group-hover:scale-110 transition-transform">
                <Calendar className="size-6" />
              </div>
              <h4 className="text-sm font-black text-slate-900 mb-1">
                2. جدولة وبرمجة مواعيد المباريات
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                تحديد تواريخ وساعات انطلاق المباريات، الملاعب المعتمدة لكل مواجهة، وتعيين الحكام والمنسقين.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/committee/tournaments/${tournament.id}?tab=fixtures`)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-white font-black text-xs shadow-sm transition-all cursor-pointer"
            >
              <span>برمجة جدول المباريات</span>
              <ChevronLeft className="size-4 rtl:rotate-180" />
            </button>
          </div>

          {/* Direction Card 3: Match Control Room & Live Operations */}
          <div className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-xs hover:border-[#10B981] hover:shadow-md transition-all flex flex-col justify-between">
            <div>
              <div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-[#10B981] mb-3 group-hover:scale-110 transition-transform">
                <Activity className="size-6" />
              </div>
              <h4 className="text-sm font-black text-slate-900 mb-1">
                3. غرفة العمليات ومركز التحكم
              </h4>
              <p className="text-xs text-slate-500 leading-relaxed mb-4">
                تسجيل الأهداف المباشرة، البطاقات والتبديلات، ومتابعة جدول ترتيب الفرق والإحصائيات لحظة بلحظة.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate(`/committee/tournaments/${tournament.id}`)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#10B981] to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-xs shadow-md shadow-[#10B981]/25 transition-all cursor-pointer"
            >
              <Trophy className="size-4" />
              <span>دخول مركز التحكم المباشر</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
