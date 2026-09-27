import { useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  Play,
  RotateCcw,
  Unlink,
  Loader2,
  CalendarCheck,
  ChevronRight,
  Filter,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Badge, Button, Card, Empty } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'

export default function LeagueAssignmentPanel({ tournament, onRefresh, refreshKey }) {
  const { toast } = useToast()
  const [activeSubTab, setActiveSubTab] = useState('suggestions') // 'suggestions' | 'fixtures'
  const [assignBusyId, setAssignBusyId] = useState(null)
  const [unassignBusyId, setUnassignBusyId] = useState(null)
  const [genBusy, setGenBusy] = useState(false)
  const [matchdayFilter, setMatchdayFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')

  // Fetch match suggestions
  const {
    data: suggestionsData,
    loading: suggestionsLoading,
    refetch: refetchSuggestions,
  } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/league/suggestions`).then((r) => r.data),
    [tournament.id, refreshKey],
    { staleTime: 0 }
  )

  // Fetch all fixtures for the league
  const {
    data: allFixtures,
    loading: fixturesLoading,
    refetch: refetchAllFixtures,
  } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/fixtures`).then((r) => r.data.data),
    [tournament.id, refreshKey],
    { staleTime: 0 }
  )

  const suggestions = suggestionsData?.data || []
  const validSuggestions = suggestions.filter((s) => s.can_assign)

  const handleGenerate = async (regenerate = false) => {
    setGenBusy(true)
    try {
      const res = await api.post(`/committee/tournaments/${tournament.id}/fixtures`, {
        stage: 'league',
        regenerate,
      })
      toast.success(res.data?.message || 'تم إنشاء مواجهات الدوري بنجاح')
      refetchAllFixtures()
      refetchSuggestions()
      if (onRefresh) onRefresh()
    } catch (e) {
      toastApiError(e)
    } finally {
      setGenBusy(false)
    }
  }

  const handleAssign = async (suggestion) => {
    setAssignBusyId(suggestion.id)
    try {
      const res = await api.post(`/committee/tournaments/${tournament.id}/league/assign`, {
        fixture_id: suggestion.fixture.id,
        booking_id: suggestion.booking.id,
      })
      toast.success(res.data?.message || 'تم اعتماد وتثبيت موعد المباراة بنجاح')
      refetchSuggestions()
      refetchAllFixtures()
      if (onRefresh) onRefresh()
    } catch (e) {
      toastApiError(e)
    } finally {
      setAssignBusyId(null)
    }
  }

  const handleUnassign = async (fixtureId) => {
    setUnassignBusyId(fixtureId)
    try {
      const res = await api.post(`/committee/tournaments/${tournament.id}/league/unassign`, {
        fixture_id: fixtureId,
      })
      toast.success(res.data?.message || 'تم إلغاء ربط الحجز بالمباراة')
      refetchSuggestions()
      refetchAllFixtures()
      if (onRefresh) onRefresh()
    } catch (e) {
      toastApiError(e)
    } finally {
      setUnassignBusyId(null)
    }
  }

  const totalFixtures = allFixtures?.length || 0
  const scheduledFixtures = allFixtures?.filter((f) => f.scheduled_at && f.status !== 'waiting_for_booking') || []
  const waitingFixtures = allFixtures?.filter((f) => !f.scheduled_at || f.status === 'waiting_for_booking') || []

  // Filtered fixtures
  const filteredFixtures = (allFixtures || []).filter((f) => {
    if (matchdayFilter !== 'all' && String(f.matchday) !== String(matchdayFilter)) return false
    if (statusFilter === 'waiting' && (f.scheduled_at && f.status !== 'waiting_for_booking')) return false
    if (statusFilter === 'scheduled' && (!f.scheduled_at || f.status === 'waiting_for_booking')) return false
    if (statusFilter === 'played' && f.status !== 'played') return false
    return true
  })

  const matchdays = Array.from(new Set((allFixtures || []).map((f) => f.matchday).filter(Boolean))).sort((a, b) => a - b)

  return (
    <div className="space-y-6">
      {/* Top Metric Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">إجمالي المواجهات</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{totalFixtures}</p>
        </div>
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-700">في انتظار حجز</p>
          <p className="mt-1 text-2xl font-black text-amber-800">{waitingFixtures.length}</p>
        </div>
        <div className="rounded-2xl border border-green-200/80 bg-green-50/50 p-4 shadow-sm">
          <p className="text-xs font-semibold text-green-700">مباريات مجدولة</p>
          <p className="mt-1 text-2xl font-black text-green-800">{scheduledFixtures.length}</p>
        </div>
        <div className="rounded-2xl border border-blue-200/80 bg-blue-50/50 p-4 shadow-sm">
          <p className="text-xs font-semibold text-blue-700">اقتراحات الربط الجاهزة</p>
          <p className="mt-1 text-2xl font-black text-blue-800">{validSuggestions.length}</p>
        </div>
      </div>

      {/* If no fixtures created yet -> Prominent Setup Action */}
      {totalFixtures === 0 && !fixturesLoading && (
        <div className="rounded-3xl border border-green-200 bg-gradient-to-br from-green-50/90 via-white to-emerald-50/50 p-6 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-green-600 text-white shadow-md">
            <Sparkles className="size-7" />
          </div>
          <h3 className="mt-4 text-lg font-black text-slate-900">إنشاء جدول مباريات الدوري</h3>
          <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-slate-600">
            سيقوم النظام بإنشاء جميع المواجهات (دوري من دور واحد أو دورين) تلقائياً بين الفرق المسجلة.
            ستبقى المباريات في انتظار حجز الملاعب من طرف الفرق المضيفة ليتم ربطها وجدولتها باعتمادكم.
          </p>
          <div className="mt-5 flex justify-center">
            <Button
              className="bg-green-600 px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-green-700"
              onClick={() => handleGenerate(false)}
              disabled={genBusy}
            >
              {genBusy ? (
                <Loader2 className="me-2 size-4 animate-spin" />
              ) : (
                <Play className="me-2 size-4" />
              )}
              إنشاء المواجهات الآن
            </Button>
          </div>
        </div>
      )}

      {/* Sub Tabs Controls */}
      {totalFixtures > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveSubTab('suggestions')}
              className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                activeSubTab === 'suggestions'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Sparkles className="size-4 text-amber-400" />
              اقتراحات الربط مع الحجوزات
              {validSuggestions.length > 0 && (
                <span className="ms-1 flex size-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-slate-900">
                  {validSuggestions.length}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('fixtures')}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-colors ${
                activeSubTab === 'fixtures'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <CalendarDays className="size-4 text-green-500" />
              كافة مواجهات الدوري ({totalFixtures})
            </button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="text-xs text-slate-600"
              onClick={() => {
                refetchSuggestions()
                refetchAllFixtures()
              }}
            >
              <RotateCcw className="me-1.5 size-3.5" />
              تحديث
            </Button>
            <Button
              variant="outline"
              className="text-xs text-rose-600 hover:bg-rose-50"
              onClick={() => handleGenerate(true)}
              disabled={genBusy}
            >
              {genBusy ? <Loader2 className="size-3.5 animate-spin" /> : 'إعادة توليد الجدول'}
            </Button>
          </div>
        </div>
      )}

      {/* VIEW 1: SUGGESTIONS */}
      {activeSubTab === 'suggestions' && totalFixtures > 0 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <h4 className="flex items-center gap-2 text-xs font-bold text-blue-900">
              <ShieldCheck className="size-4 text-blue-600" />
              محرك التحقق ومطابقة الحجوزات
            </h4>
            <p className="mt-1 text-[11px] leading-relaxed text-blue-700">
              يقوم النظام بتحليل حجوزات الملاعب التي أنشأها مديرو الفرق المضيفة، ويتأكد تلقائياً من توفر الخصم، واستيفاء شرط الراحة الإلزامية ({tournament.rest_days_minimum ?? 1} يوم على الأقل)، وصلاحية الملعب قبل تقديم الاقتراح لاعتمادكم.
            </p>
          </div>

          {suggestionsLoading ? (
            <div className="flex justify-center p-12">
              <Loader2 className="size-8 animate-spin text-green-600" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <CalendarCheck className="mx-auto size-10 text-slate-300" />
              <h4 className="mt-3 text-sm font-bold text-slate-700">لا توجد حجوزات جديدة بانتظار الاعتماد</h4>
              <p className="mx-auto mt-1 max-w-md text-xs text-slate-400">
                بمجرد قيام أي فريق مضيف بحجز ملعب عبر المنصة داخل فترة الدوري، سيظهر الاقتراح هنا تلقائياً لربطه بالمواجهة المستحقة.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {suggestions.map((sug) => {
                const isAssigning = assignBusyId === sug.id
                return (
                  <div
                    key={sug.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all hover:shadow-md"
                  >
                    <div>
                      {/* Top Match Title */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-700">
                          الجولة {sug.fixture.matchday}
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-green-700">
                          <CheckCircle2 className="size-3.5" />
                          اقتراح موثق ومستوفٍ للشروط
                        </span>
                      </div>

                      {/* Teams versus */}
                      <div className="my-3 flex items-center justify-between px-2">
                        <div className="flex flex-1 items-center gap-2">
                          <div className="size-9 rounded-full bg-slate-100 p-1 flex items-center justify-center font-bold text-xs text-slate-700">
                            {sug.fixture.home_team?.name?.charAt(0) || 'H'}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-900">{sug.fixture.home_team?.name}</p>
                            <span className="text-[10px] font-semibold text-emerald-600">المضيف (صاحب الحجز)</span>
                          </div>
                        </div>

                        <span className="px-3 text-xs font-extrabold text-slate-400">ضد</span>

                        <div className="flex flex-1 items-center justify-end gap-2 text-end">
                          <div>
                            <p className="text-xs font-black text-slate-900">{sug.fixture.away_team?.name}</p>
                            <span className="text-[10px] font-semibold text-slate-400">الضيف</span>
                          </div>
                          <div className="size-9 rounded-full bg-slate-100 p-1 flex items-center justify-center font-bold text-xs text-slate-700">
                            {sug.fixture.away_team?.name?.charAt(0) || 'A'}
                          </div>
                        </div>
                      </div>

                      {/* Booking Metadata Pill */}
                      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-[11px]">
                        <div className="grid grid-cols-2 gap-2 text-slate-700">
                          <span className="flex items-center gap-1.5">
                            <MapPin className="size-3.5 text-slate-400" />
                            {sug.booking.terrain?.name || 'الملعب'}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <CalendarDays className="size-3.5 text-slate-400" />
                            {sug.booking.booking_date}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="size-3.5 text-slate-400" />
                            {sug.booking.start_time} - {sug.booking.end_time}
                          </span>
                          <span className="text-slate-400">
                            مرجع: #{sug.booking.reference}
                          </span>
                        </div>
                      </div>

                      {/* Explainable Checklist */}
                      <div className="mt-3 space-y-1.5">
                        {sug.validations.map((v, i) => (
                          <div key={i} className="flex items-start gap-2 text-[11px]">
                            {v.passed ? (
                              <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 mt-0.5" />
                            ) : (
                              <AlertCircle className="size-3.5 shrink-0 text-rose-600 mt-0.5" />
                            )}
                            <span className={v.passed ? 'text-slate-700' : 'font-bold text-rose-700'}>
                              {v.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <Button
                        className="bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
                        onClick={() => handleAssign(sug)}
                        disabled={!sug.can_assign || Boolean(assignBusyId)}
                      >
                        {isAssigning ? (
                          <Loader2 className="me-1.5 size-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="me-1.5 size-3.5" />
                        )}
                        اعتماد وتثبيت المباراة
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: ALL FIXTURES */}
      {activeSubTab === 'fixtures' && totalFixtures > 0 && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">الجولة:</span>
              <select
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-800"
                value={matchdayFilter}
                onChange={(e) => setMatchdayFilter(e.target.value)}
              >
                <option value="all">كافة الجولات</option>
                {matchdays.map((m) => (
                  <option key={m} value={m}>الجولة {m}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">الحالة:</span>
              <select
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-800"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">الكل</option>
                <option value="waiting">في انتظار حجز</option>
                <option value="scheduled">مجدولة ومثبتة</option>
                <option value="played">ملعوبة</option>
              </select>
            </div>
          </div>

          {/* Fixtures List */}
          <div className="space-y-2.5">
            {filteredFixtures.map((fixture) => {
              const isScheduled = Boolean(fixture.scheduled_at) && fixture.status !== 'waiting_for_booking'
              const isPlayed = fixture.status === 'played' || fixture.match?.status === 'finished'
              const isUnassigning = unassignBusyId === fixture.id

              return (
                <div
                  key={fixture.id}
                  className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:shadow"
                >
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-600">
                      ج {fixture.matchday}
                    </span>
                    <div className="flex items-center gap-2 font-bold text-xs text-slate-900">
                      <span>{fixture.home_team?.name || 'فريق مضيف'}</span>
                      <span className="text-slate-400">vs</span>
                      <span>{fixture.away_team?.name || 'فريق ضيف'}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                    {isScheduled ? (
                      <div className="text-end">
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                          <MapPin className="size-3 text-slate-400" />
                          <span>{fixture.stadium?.name || 'الملعب'}</span>
                          <span>·</span>
                          <span>{fixture.scheduled_at?.slice(0, 10)}</span>
                          <span>·</span>
                          <span>{fixture.scheduled_at?.slice(11, 16)}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-[10px] font-bold text-amber-700">
                        في انتظار حجز المضيف
                      </span>
                    )}

                    {isScheduled && !isPlayed && (
                      <Button
                        variant="outline"
                        className="text-[11px] font-bold text-rose-600 hover:bg-rose-50"
                        onClick={() => handleUnassign(fixture.id)}
                        disabled={isUnassigning}
                      >
                        {isUnassigning ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <Unlink className="size-3 me-1" />
                        )}
                        إلغاء ربط الحجز
                      </Button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
