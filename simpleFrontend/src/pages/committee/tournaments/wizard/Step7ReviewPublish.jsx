import { useState } from 'react'
import { AlertCircle, AlertTriangle, ArrowLeft, ArrowRight, ChevronRight, Check, CheckCircle2, Eye, Globe, Landmark, Play, Rocket, ShieldCheck, Sparkles, Swords, Trophy, Users, X } from 'lucide-react'
import { Button, Card, Empty } from '../../../../components/dashboard/ui'
import api from '../../../../api/client'
import { useToast } from '../../../../components/ui/Toast'
import { toastApiError } from '../../../../lib/errors'
import { Link, useNavigate } from 'react-router-dom'

export default function Step7ReviewPublish({
  tournament,
  refresh,
  onJumpToStep,
}) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(null)

  const isGroupFormat = tournament.tournament_format === 'groups_knockout' || tournament.tournament_format === 'groups_only'

  // Audit Checklist based on real backend data
  const hasBasicInfo = Boolean(tournament.name && tournament.start_date)
  const hasFormat = Boolean(tournament.tournament_format && tournament.teams_count >= 2)
  const registeredCount = Number(tournament.stats?.registered_teams || 0)
  const targetTeams = Number(tournament.teams_count || 8)
  const hasTeamsComplete = registeredCount >= targetTeams
  const hasFixtures = (tournament.stats?.fixtures || 0) > 0

  const checklist = [
    {
      id: 1,
      title: 'المعلومات الأساسية والموقع',
      desc: hasBasicInfo ? `${tournament.name} • ${tournament.start_date}` : 'اسم البطولة أو تاريخ البداية مفقود',
      isComplete: hasBasicInfo,
      stepId: 1,
    },
    {
      id: 2,
      title: 'الصيغة الرياضية والقواعد',
      desc: hasFormat ? `الصيغة: ${tournament.tournament_format} • ${tournament.teams_count} فرق` : 'لم يتم تحديد صيغة صالحة',
      isComplete: hasFormat,
      stepId: 2,
    },
    {
      id: 3,
      title: 'نصاب الفرق المشاركة',
      desc: hasTeamsComplete
        ? `اكتمل النصاب: ${registeredCount}/${targetTeams} فرق مؤكدة`
        : `غير مكتمل: ${registeredCount} من أصل ${targetTeams} فرق مطلوبة`,
      isComplete: hasTeamsComplete,
      stepId: 3,
    },
    {
      id: 4,
      title: 'جدول المباريات والقرعة',
      desc: hasFixtures
        ? `تم توليد ${tournament.stats?.fixtures} مباراة بنجاح`
        : 'لم يتم توليد جدول المباريات بعد',
      isComplete: hasFixtures,
      stepId: 5,
    },
  ]

  const allPassed = checklist.every((item) => item.isComplete)

  // Publication / Launch Action
  const handleOpenRegistration = async () => {
    setBusy('open')
    try {
      await api.post(`/committee/tournaments/${tournament.id}/open-registration`)
      toast.success('تم نشر البطولة وفتح باب التسجيل للفرق بنجاح')
      refresh()
    } catch (err) {
      toastApiError(err)
    } finally {
      setBusy(null)
    }
  }

  const handleStartTournament = async () => {
    if (!hasTeamsComplete) {
      toast.error('لا يمكن إطلاق البطولة قبل اكتمال تسجيل جميع الفرق')
      return
    }
    setBusy('start')
    try {
      await api.post(`/committee/tournaments/${tournament.id}/start`)
      toast.success('تم إطلاق البطولة رسمياً وبدء المنافسات!')
      refresh()
      navigate(`/committee/tournaments/${tournament.id}`)
    } catch (err) {
      toastApiError(err)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* Systematic Pre-Flight Audit Checklist */}
        <Card
          title="فحص الجاهزية والتدقيق الشامل (Pre-Flight Audit)"
          subtitle="مراجعة آلية دقيقة لكافة متطلبات البطولة قبل النشر والإطلاق"
        >
          <div className="space-y-3">
            {checklist.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-3 p-4 rounded-2xl border transition-all ${
                  item.isComplete
                    ? 'border-emerald-200/80 bg-emerald-50/40'
                    : 'border-amber-200/80 bg-amber-50/40'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`grid size-9 place-items-center rounded-xl text-white font-black text-xs shrink-0 ${
                      item.isComplete ? 'bg-emerald-500' : 'bg-amber-500'
                    }`}
                  >
                    {item.isComplete ? <Check className="size-4 stroke-[3]" /> : <AlertTriangle className="size-4" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black text-slate-900">{item.title}</p>
                    <p className={`text-xs ${item.isComplete ? 'text-emerald-800' : 'text-amber-800 font-semibold'}`}>
                      {item.desc}
                    </p>
                  </div>
                </div>

                {!item.isComplete && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onJumpToStep(item.stepId)}
                    className="shrink-0 text-xs text-amber-900 border-amber-300 hover:bg-amber-100/50"
                  >
                    استكمال المتطلب
                    <ArrowLeft className="size-3.5 rtl:rotate-0" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Tournament Summary Card */}
        <Card title="ملخص إعدادات البطولة المحفوظة">
          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <div className="p-3 rounded-2xl border border-slate-100 bg-slate-50/60">
              <span className="text-slate-400 font-semibold block">اسم البطولة:</span>
              <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">{tournament.name}</span>
            </div>

            <div className="p-3 rounded-2xl border border-slate-100 bg-slate-50/60">
              <span className="text-slate-400 font-semibold block">الصيغة الرياضية:</span>
              <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">
                {tournament.tournament_format === 'league' ? 'دوري بنقاط' : 'مجموعات + إقصائيات'} ({tournament.teams_count} فرق)
              </span>
            </div>

            <div className="p-3 rounded-2xl border border-slate-100 bg-slate-50/60">
              <span className="text-slate-400 font-semibold block">تاريخ الانطلاق:</span>
              <span className="font-extrabold text-slate-900 text-sm mt-0.5 block">
                {tournament.start_date || 'غير محدد'}
              </span>
            </div>

            <div className="p-3 rounded-2xl border border-slate-100 bg-slate-50/60">
              <span className="text-slate-400 font-semibold block">حالة البطولة الحالية:</span>
              <span className="font-extrabold text-emerald-700 text-sm mt-0.5 block">
                {tournament.status === 'draft'
                  ? 'مسودة قيد الإعداد'
                  : tournament.status === 'open_for_registration'
                    ? 'مفتوحة للتسجيل'
                    : tournament.status === 'registration_closed'
                      ? 'مغلقة التسجيل ومكتملة'
                      : tournament.status}
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Publication Actions Sidebar */}
      <div className="space-y-4">
        <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50/70 via-white to-sky-50/50 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-black text-emerald-950 text-base">
            <Rocket className="size-5 text-emerald-600" />
            <span>نشر وإطلاق البطولة</span>
          </div>

          <p className="text-xs leading-relaxed text-slate-600">
            {tournament.status === 'draft'
              ? 'عند نشر البطولة، ستصبح مرئية في صفحة استعراض البطولات العامة ويمكنك فتح التسجيل للفرق أو إطلاق المباريات.'
              : 'البطولة منشورة بالفعل! يمكنك التحكم في مجريات المباريات والانطلاق الرسمي.'}
          </p>

          <div className="space-y-2 pt-2 border-t border-emerald-100">
            {tournament.status === 'draft' && (
              <Button
                variant="primary"
                size="lg"
                loading={busy === 'open'}
                onClick={handleOpenRegistration}
                className="w-full text-sm font-black shadow-lg"
              >
                <Globe className="size-4" />
                نشر البطولة وفتح التسجيل
              </Button>
            )}

            {tournament.status === 'registration_closed' && (
              <Button
                variant="primary"
                size="lg"
                loading={busy === 'start'}
                disabled={!hasTeamsComplete}
                onClick={handleStartTournament}
                className="w-full text-sm font-black shadow-lg"
              >
                <Play className="size-4" />
                إطلاق البطولة رسمياً
              </Button>
            )}

            <Link
              to={`/tournaments/${tournament.id}`}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Eye className="size-4 text-slate-500" />
              معاينة الصفحة العامة للبطولة
            </Link>

            <Link
              to={`/committee/tournaments/${tournament.id}`}
              className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-transparent bg-slate-100 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors"
            >
              الانتقال للوحة إدارة البطولة المتقدمة
              <ChevronRight className="size-3.5 rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
