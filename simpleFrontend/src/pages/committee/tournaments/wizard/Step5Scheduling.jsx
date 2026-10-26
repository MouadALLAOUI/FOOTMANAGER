import { useState } from 'react'
import { AlertCircle, Calendar, CalendarClock, Check, CheckCircle2, ChevronRight, Dices, Landmark, Loader2, Play, RefreshCw, Sparkles, Swords, Users } from 'lucide-react'
import { Badge, Button, Card, Empty, Field, Modal, Skeleton } from '../../../../components/dashboard/ui'
import api from '../../../../api/client'
import { useApi } from '../../../../hooks/useApi'
import { useToast } from '../../../../components/ui/Toast'
import { toastApiError } from '../../../../lib/errors'
import { useNavigate } from 'react-router-dom'

export default function Step5Scheduling({
  tournament,
  refresh,
  onGoToFullFixtures = null,
}) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(null)

  const isGroupFormat = tournament.tournament_format === 'groups_knockout' || tournament.tournament_format === 'groups_only'

  // Fetch Draw Groups (if group format)
  const { data: drawData, loading: loadingDraw, refetch: refetchDraw } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/draw`).then((r) => r.data.data),
    [tournament.id],
    { enabled: isGroupFormat },
  )

  // Fetch Fixtures
  const { data: fixturesData, loading: loadingFixtures, refetch: refetchFixtures } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/fixtures`).then((r) => r.data.data),
    [tournament.id],
  )

  const groups = drawData || []
  const fixtures = fixturesData || []
  const hasFixtures = fixtures.length > 0

  const scheduledFixtures = fixtures.filter((f) => f.scheduled_at)
  const unscheduledFixtures = fixtures.filter((f) => !f.scheduled_at)

  // Perform Auto Draw
  const handleAutoDraw = async () => {
    setBusy('draw')
    try {
      await api.post(`/committee/tournaments/${tournament.id}/draw/auto`)
      toast.success('تمت قرعة المجموعات آلياً بنجاح')
      refetchDraw()
      refresh()
    } catch (err) {
      toastApiError(err)
    } finally {
      setBusy(null)
    }
  }

  // Generate Fixtures
  const handleGenerateFixtures = async () => {
    setBusy('generate')
    try {
      await api.post(`/committee/tournaments/${tournament.id}/fixtures`, {
        first_match_day: tournament.first_match_day || tournament.start_date,
      })
      toast.success('تم توليد جدول مباريات البطولة بنجاح')
      refetchFixtures()
      refresh()
    } catch (err) {
      toastApiError(err)
    } finally {
      setBusy(null)
    }
  }

  // Reservation Mode
  const handleModeChange = async (mode) => {
    setBusy('mode')
    try {
      await api.post(`/committee/tournaments/${tournament.id}/reservation-mode`, {
        terrain_reservation_mode: mode,
      })
      toast.success('تم تحديث نظام حجز الملاعب')
      refresh()
    } catch (err) {
      toastApiError(err)
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        {/* Draw Status (for Group Formats) */}
        {isGroupFormat && (
          <Card
            title="قرعة المجموعات"
            subtitle="توزيع الفرق المتنافسة على المجموعات الرسمية"
            action={
              <Button
                size="sm"
                variant="outline"
                loading={busy === 'draw'}
                onClick={handleAutoDraw}
              >
                <Dices className="size-3.5" />
                إجراء قرعة آلية متوازنة
              </Button>
            }
          >
            {loadingDraw ? (
              <Skeleton className="h-20" />
            ) : groups.length === 0 ? (
              <Empty
                icon={Users}
                title="لم يتم توزيع المجموعات بعد"
                description="اضغط على زر إجراء القرعة لتوزيع الفرق المسجلة على المجموعات."
                compact
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {groups.map((group) => (
                  <div key={group.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/60 p-3.5">
                    <span className="block text-xs font-black text-slate-800 mb-2">
                      {group.name || `المجموعة ${group.letter}`}
                    </span>
                    <div className="space-y-1.5">
                      {(group.teams || []).map((t) => (
                        <div key={t.id} className="flex items-center gap-2 rounded-xl bg-white px-2.5 py-1.5 border border-slate-100 text-xs font-bold text-slate-700">
                          <span className="size-2 rounded-full bg-emerald-500" />
                          <span className="truncate">{t.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Fixtures Generation & Status */}
        <Card
          title="جدول المباريات والمواجهات"
          subtitle={hasFixtures ? `إجمالي المباريات المولدة: ${fixtures.length} مباراة` : 'لم يتم توليد المباريات بعد'}
          action={
            <Button
              size="sm"
              variant={hasFixtures ? 'outline' : 'primary'}
              loading={busy === 'generate'}
              onClick={handleGenerateFixtures}
            >
              <RefreshCw className="size-3.5" />
              {hasFixtures ? 'إعادة توليد الجدول' : 'توليد جدول المباريات الآن'}
            </Button>
          }
        >
          {loadingFixtures ? (
            <Skeleton className="h-24" />
          ) : !hasFixtures ? (
            <Empty
              icon={Swords}
              title="لم يتم إنشاء المباريات بعد"
              description="اضغط على 'توليد جدول المباريات' لإنشاء مواجهات البطولة بناءً على الفرق والنظام المختار."
            />
          ) : (
            <div className="space-y-4">
              {/* Scheduling Progress Overview */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-center">
                  <span className="block text-lg font-black text-slate-900 font-mono">{fixtures.length}</span>
                  <span className="text-[11px] font-bold text-slate-500">إجمالي المباريات</span>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 text-center">
                  <span className="block text-lg font-black text-emerald-700 font-mono">{scheduledFixtures.length}</span>
                  <span className="text-[11px] font-bold text-emerald-800">مباريات محددة التوقيت</span>
                </div>
                <div className="rounded-2xl border border-amber-100 bg-amber-50/60 p-3 text-center col-span-2 sm:col-span-1">
                  <span className="block text-lg font-black text-amber-700 font-mono">{unscheduledFixtures.length}</span>
                  <span className="text-[11px] font-bold text-amber-800">مباريات بانتظار التوقيت</span>
                </div>
              </div>

              {/* Sample Fixtures List */}
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {fixtures.slice(0, 6).map((f) => {
                  const home = f.home_team || f.homeTeam || {}
                  const away = f.away_team || f.awayTeam || {}
                  return (
                    <div
                      key={f.id}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="truncate font-extrabold text-slate-800">{home.name || 'طرف 1'}</span>
                        <span className="text-slate-400 font-black">ضد</span>
                        <span className="truncate font-extrabold text-slate-800">{away.name || 'طرف 2'}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {f.scheduled_at ? (
                          <span className="rounded-xl bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-100">
                            {new Date(f.scheduled_at).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">
                            غير محددة
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (onGoToFullFixtures) onGoToFullFixtures()
                    else navigate(`/committee/tournaments/${tournament.id}?tab=fixtures`)
                  }}
                >
                  فتح غرفة التحكم وجدولة الملاعب المتقدمة
                  <ChevronRight className="size-3.5 rtl:rotate-180" />
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Pitch Reservation Mode */}
        <Card title="نظام حجز الملاعب" subtitle="طريقة تأكيد الحجوزات مع ملاك الملاعب">
          <div className="grid gap-3 sm:grid-cols-2">
            <label
              className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                tournament.terrain_reservation_mode === 'independent' || !tournament.terrain_reservation_mode
                  ? 'border-emerald-500 bg-emerald-50/40'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="terrain_mode"
                checked={tournament.terrain_reservation_mode === 'independent' || !tournament.terrain_reservation_mode}
                onChange={() => handleModeChange('independent')}
                className="mt-1 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="text-xs font-black text-slate-900 block">الحجز المستقل والمباشر</span>
                <span className="text-[11px] text-slate-500 leading-relaxed">
                  تعتمد اللجنة توقيت ومكان المباراة ذاتياً دون انتظار تأكيد خارجي من مالك الملعب.
                </span>
              </div>
            </label>

            <label
              className={`flex items-start gap-3 p-4 rounded-2xl border cursor-pointer transition-all ${
                tournament.terrain_reservation_mode === 'integrated'
                  ? 'border-emerald-500 bg-emerald-50/40'
                  : 'border-slate-200 hover:bg-slate-50'
              }`}
            >
              <input
                type="radio"
                name="terrain_mode"
                checked={tournament.terrain_reservation_mode === 'integrated'}
                onChange={() => handleModeChange('integrated')}
                className="mt-1 text-emerald-600 focus:ring-emerald-500"
              />
              <div>
                <span className="text-xs font-black text-slate-900 block">الحجز المدمج مع تقويم الملاعب</span>
                <span className="text-[11px] text-slate-500 leading-relaxed">
                  ترتبط الحصص مباشرة بنظام حجز الملعب وتخضع لتأكيد المالك لمنع أي تعارض.
                </span>
              </div>
            </label>
          </div>
        </Card>
      </div>

      {/* Guidance Sidebar */}
      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 font-black text-slate-900 text-sm">
            <CalendarClock className="size-4 text-emerald-600" />
            <span>سلامة الجدولة والملاعب</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            يحافظ المعالج على سلامة جدول المباريات: لا يتم تعديل أي مباراة مؤكدة أو كتابة حجز فوق فترة مشغولة تلقائياً.
          </p>
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs space-y-1 text-slate-600">
            <div className="flex items-center gap-1.5 font-bold text-slate-800">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              <span>فحص الحصص الشاغرة</span>
            </div>
            <p className="text-[11px] text-slate-500">
              يمكنك تعيين الملاعب والمواعيد دفعة واحدة أو بشكل يدوي عبر شاشة إدارة المباريات.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
