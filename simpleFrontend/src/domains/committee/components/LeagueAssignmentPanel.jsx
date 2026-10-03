import { useState, useMemo, useEffect } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  Sparkles,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Unlink,
  Loader2,
  CalendarCheck,
  ChevronRight,
  ChevronDown,
  Calendar,
  Filter,
  ArrowLeftRight,
  X,
  Zap,
  Eye,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Badge, Button, Card, Empty } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import TournamentMatchCard from './TournamentMatchCard'
import LeagueWeekSelector from './LeagueWeekSelector'
import { computeLeagueWeeks, getDefaultWeekId, groupFixturesByDay } from '../utils/leagueWeeks'

export default function LeagueAssignmentPanel({
  tournament,
  onRefresh,
  refreshKey,
  onReschedule,
  onResult,
  onDetails,
}) {
  const { toast } = useToast()
  const [activeSubTab, setActiveSubTab] = useState('suggestions') // 'suggestions' | 'fixtures'
  const [assignBusyId, setAssignBusyId] = useState(null)
  const [unassignBusyId, setUnassignBusyId] = useState(null)
  const [genBusy, setGenBusy] = useState(false)
  const [autoScheduleBusy, setAutoScheduleBusy] = useState(false)
  const [swapBusy, setSwapBusy] = useState(false)
  const [opponentSwapFixture, setOpponentSwapFixture] = useState(null)
  const [selectedNewOpponentId, setSelectedNewOpponentId] = useState('')
  const [eligibleOpponents, setEligibleOpponents] = useState([])
  const [loadingEligibles, setLoadingEligibles] = useState(false)
  const [matchdayFilter, setMatchdayFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('scheduled')

  useEffect(() => {
    if (!opponentSwapFixture) {
      setEligibleOpponents([])
      setSelectedNewOpponentId('')
      return
    }

    let isMounted = true
    setLoadingEligibles(true)
    api
      .get(`/committee/tournaments/${tournament.id}/league/fixtures/${opponentSwapFixture.id}/eligible-opponents`)
      .then((res) => {
        if (isMounted) {
          setEligibleOpponents(res.data?.data || [])
        }
      })
      .catch((err) => {
        if (isMounted) {
          toastApiError(err)
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingEligibles(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [opponentSwapFixture, tournament.id])

  // First match day state
  const defaultFirstDay = tournament.first_match_day || tournament.start_date || ''
  const [firstMatchDay, setFirstMatchDay] = useState(defaultFirstDay)
  const [firstDayError, setFirstDayError] = useState('')
  const [confirmModalData, setConfirmModalData] = useState(null)
  const [regenConfirmData, setRegenConfirmData] = useState(null)

  // Postponement state
  const [postponeFixture, setPostponeFixture] = useState(null)
  const [postponeReason, setPostponeReason] = useState('rain') // 'rain' | 'pitch_condition' | 'team_circumstances' | 'other'
  const [postponeNote, setPostponeNote] = useState('')
  const [postponeBusy, setPostponeBusy] = useState(false)

  // Reschedule suggestions modal state
  const [rescheduleFixture, setRescheduleFixture] = useState(null)
  const [postponeSuggestions, setPostponeSuggestions] = useState([])
  const [postponeSuggestionsLoading, setPostponeSuggestionsLoading] = useState(false)
  const [applyingSuggestionId, setApplyingSuggestionId] = useState(null)
  const [pendingConfirmSuggestion, setPendingConfirmSuggestion] = useState(null)

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

  // Pre-check scheduling capacity against available slots, taking firstMatchDay into account
  const {
    data: capacityData,
    loading: capacityLoading,
    refetch: refetchCapacity,
  } = useApi(
    () =>
      api
        .get(`/committee/tournaments/${tournament.id}/league/capacity-check`, {
          params: firstMatchDay ? { first_match_day: firstMatchDay } : {},
        })
        .then((r) => r.data.data),
    [tournament.id, refreshKey, firstMatchDay],
    { staleTime: 0 }
  )

  const suggestions = suggestionsData?.data || []
  const validSuggestions = suggestions.filter((s) => s.can_assign)

  const validateFirstDay = (dateStr) => {
    if (!dateStr) return 'يرجى تحديد اليوم الأول للدوري'
    const chosen = new Date(dateStr)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (chosen < today) {
      return 'لا يمكن اختيار تاريخ في الماضي لليوم الأول للدوري'
    }
    if (tournament.end_date) {
      const end = new Date(tournament.end_date)
      end.setHours(23, 59, 59, 999)
      if (chosen >= end) {
        return `اليوم الأول يجب أن يكون ضمن فترة الدوري وقبل تاريخ النهاية (${tournament.end_date})`
      }
    }
    return ''
  }

  const handleFirstDayChange = (e) => {
    const val = e.target.value
    setFirstMatchDay(val)
    const err = validateFirstDay(val)
    setFirstDayError(err)
  }

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
      refetchCapacity()
      if (onRefresh) onRefresh()
    } catch (e) {
      toastApiError(e)
    } finally {
      setGenBusy(false)
    }
  }

  const openAutoScheduleConfirm = () => {
    const err = validateFirstDay(firstMatchDay)
    if (err) {
      setFirstDayError(err)
      toast.error(err)
      return
    }

    // Prepare confirmation data
    const chosenDate = firstMatchDay || defaultFirstDay
    const hasExactSlot = capacityData?.has_slot_on_chosen_day
    const firstAvailDate = capacityData?.first_available_date
    const firstAvailTime = capacityData?.first_available_time

    setConfirmModalData({
      chosenDate,
      hasExactSlot,
      firstAvailDate,
      firstAvailTime,
      availableSlots: capacityData?.available_slots ?? 0,
      unscheduledCount: waitingFixtures.length,
      sufficient: capacityData?.sufficient,
    })
  }

  const executeAutoSchedule = async (force = false) => {
    setAutoScheduleBusy(true)
    try {
      const res = await api.post(`/committee/tournaments/${tournament.id}/league/auto-schedule`, {
        first_match_day: firstMatchDay || undefined,
        force,
      })
      toast.success(res.data?.message || 'تمت البرمجة التلقائية بنجاح')
      setConfirmModalData(null)
      setRegenConfirmData(null)
      refetchAllFixtures()
      refetchSuggestions()
      refetchCapacity()
      if (onRefresh) onRefresh()
    } catch (e) {
      if (e?.response?.data?.requires_confirmation) {
        setConfirmModalData(null)
        setRegenConfirmData(e.response.data)
      } else {
        toastApiError(e)
      }
    } finally {
      setAutoScheduleBusy(false)
    }
  }

  const handleAssign = async (suggestion) => {
    setAssignBusyId(suggestion.id)
    try {
      const res = await api.post(`/committee/tournaments/${tournament.id}/league/assign`, {
        fixture_id: suggestion.fixture.id,
        booking_id: suggestion.booking.id,
        date: suggestion.booking.booking_date,
      })
      toast.success(res.data?.message || 'تم اعتماد وتثبيت موعد المباراة بنجاح')
      refetchSuggestions()
      refetchAllFixtures()
      refetchCapacity()
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
      refetchCapacity()
      if (onRefresh) onRefresh()
    } catch (e) {
      toastApiError(e)
    } finally {
      setUnassignBusyId(null)
    }
  }

  const handlePostponeSubmit = async () => {
    if (!postponeFixture) return
    setPostponeBusy(true)
    try {
      const res = await api.post(`/committee/tournaments/${tournament.id}/league/fixtures/${postponeFixture.id}/postpone`, {
        reason: postponeReason,
        note: postponeNote || undefined,
      })
      toast.success(res.data?.message || 'تم تأجيل المباراة بنجاح')
      const targetFixture = postponeFixture
      setPostponeFixture(null)
      setPostponeNote('')
      setPostponeReason('rain')
      refetchAllFixtures()
      refetchSuggestions()
      refetchCapacity()
      if (onRefresh) onRefresh()

      // Immediately fetch and display suggestions for the postponed match
      openRescheduleSuggestions(targetFixture)
    } catch (e) {
      toastApiError(e)
    } finally {
      setPostponeBusy(false)
    }
  }

  const openRescheduleSuggestions = async (fixture) => {
    setRescheduleFixture(fixture)
    setPostponeSuggestionsLoading(true)
    setPostponeSuggestions([])
    try {
      const res = await api.get(`/committee/tournaments/${tournament.id}/league/fixtures/${fixture.id}/postpone-suggestions`)
      setPostponeSuggestions(res.data?.data || [])
    } catch (e) {
      toastApiError(e)
    } finally {
      setPostponeSuggestionsLoading(false)
    }
  }

  const handleApplySuggestion = async (suggestion) => {
    if (!rescheduleFixture) return
    setApplyingSuggestionId(suggestion.id)
    try {
      const res = await api.post(
        `/committee/tournaments/${tournament.id}/league/fixtures/${rescheduleFixture.id}/reschedule-suggestion`,
        {
          booking_id: suggestion.booking_id,
          date: suggestion.date,
        }
      )
      toast.success(res.data?.message || 'تمت إعادة جدولة وتثبيت المباراة بنجاح')
      setPendingConfirmSuggestion(null)
      setRescheduleFixture(null)
      refetchAllFixtures()
      refetchSuggestions()
      refetchCapacity()
      if (onRefresh) onRefresh()
    } catch (e) {
      toastApiError(e)
    } finally {
      setApplyingSuggestionId(null)
    }
  }

  const handleSwapOpponentSubmit = async () => {
    if (!opponentSwapFixture || !selectedNewOpponentId) return
    setSwapBusy(true)
    try {
      const res = await api.put(
        `/committee/tournaments/${tournament.id}/league/fixtures/${opponentSwapFixture.id}/change-opponent`,
        {
          new_opponent_id: Number(selectedNewOpponentId),
        }
      )
      toast.success(res.data?.message || 'تم تغيير الفريق الخصم بنجاح')
      setOpponentSwapFixture(null)
      setSelectedNewOpponentId('')
      refetchAllFixtures()
      refetchSuggestions()
      if (onRefresh) onRefresh()
    } catch (e) {
      toastApiError(e)
    } finally {
      setSwapBusy(false)
    }
  }

  // Derive all unique participating teams from fixtures
  const participatingTeams = useMemo(() => {
    const map = new Map()
    ;(allFixtures || []).forEach((f) => {
      if (f.home_team?.id) map.set(f.home_team.id, f.home_team)
      if (f.away_team?.id) map.set(f.away_team.id, f.away_team)
    })
    return Array.from(map.values())
  }, [allFixtures])

  const [activeWeekId, setActiveWeekId] = useState(null)

  const { weeks: leagueWeeks, unscheduled: leagueUnscheduled, chronologicalNumberMap } = useMemo(() => {
    return computeLeagueWeeks(allFixtures || [], 'ar')
  }, [allFixtures])

  useEffect(() => {
    if (leagueWeeks && leagueWeeks.length > 0) {
      if (!activeWeekId || (activeWeekId !== 'unscheduled' && !leagueWeeks.some((w) => w.id === activeWeekId))) {
        setActiveWeekId(getDefaultWeekId(leagueWeeks, leagueUnscheduled))
      }
    } else if ((!leagueWeeks || leagueWeeks.length === 0) && (!activeWeekId || activeWeekId !== 'unscheduled')) {
      setActiveWeekId('unscheduled')
    }
  }, [leagueWeeks, leagueUnscheduled, activeWeekId])

  const totalFixtures = allFixtures?.length || 0
  const scheduledFixtures = allFixtures?.filter((f) => f.scheduled_at && f.status !== 'waiting_for_booking') || []
  const waitingFixtures = allFixtures?.filter((f) => !f.scheduled_at || f.status === 'waiting_for_booking') || []
  const exceptionsFixtures = allFixtures?.filter((f) => Boolean(f.unscheduled_reason) || f.status === 'rescheduling_required') || []

  // Filtered fixtures
  const filteredFixtures = useMemo(() => {
    let list = allFixtures || []
    if (activeWeekId === 'unscheduled') {
      list = leagueUnscheduled
    } else if (activeWeekId) {
      const found = leagueWeeks.find((w) => w.id === activeWeekId)
      list = found ? found.fixtures : []
    }

    if (matchdayFilter !== 'all') {
      list = list.filter((f) => String(f.matchday) === String(matchdayFilter))
    }

    return list.filter((f) => {
      const isScheduled = Boolean(f.scheduled_at) && f.status !== 'waiting_for_booking'
      const isPlayed = f.status === 'played' || f.match?.status === 'finished'
      const isWaitingOrException = !f.scheduled_at || f.status === 'waiting_for_booking' || f.status === 'postponed' || f.status === 'rescheduling_required' || Boolean(f.unscheduled_reason)

      if (statusFilter === 'scheduled') return isScheduled && !isPlayed
      if (statusFilter === 'played') return isPlayed
      if (statusFilter === 'waiting') return isWaitingOrException && !isPlayed
      if (statusFilter === 'unscheduled') return Boolean(f.unscheduled_reason) || f.status === 'rescheduling_required'
      if (statusFilter === 'all') return true
      return true
    })
  }, [allFixtures, activeWeekId, leagueWeeks, leagueUnscheduled, matchdayFilter, statusFilter])

  const dayGroups = useMemo(() => {
    return groupFixturesByDay(filteredFixtures, 'ar')
  }, [filteredFixtures])

  const matchdays = Array.from(new Set((allFixtures || []).map((f) => f.matchday).filter(Boolean))).sort((a, b) => a - b)

  const getReasonLabel = (reason) => {
    switch (reason) {
      case 'no_available_slots':
        return 'عدم توفر فترات حجز كافية'
      case 'rest_conflict':
        return 'تعارض مع فترة الراحة الإلزامية'
      case 'rest_or_schedule_conflict':
        return 'تعارض في المواعيد أو فترة الراحة'
      default:
        return 'تتطلب تحديد موعد يدوي'
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Metric Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-slate-500">إجمالي المواجهات</p>
          <p className="mt-1 text-2xl font-black text-slate-900">{totalFixtures}</p>
        </div>
        <div className="rounded-2xl border border-green-200/80 bg-green-50/50 p-4 shadow-sm">
          <p className="text-xs font-semibold text-green-700">مباريات مجدولة ومثبتة</p>
          <p className="mt-1 text-2xl font-black text-green-800">{scheduledFixtures.length}</p>
        </div>
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-4 shadow-sm">
          <p className="text-xs font-semibold text-amber-700">بانتظار تحديد الموعد</p>
          <p className="mt-1 text-2xl font-black text-amber-800">{waitingFixtures.length}</p>
        </div>
        <div className="rounded-2xl border border-rose-200/80 bg-rose-50/50 p-4 shadow-sm">
          <p className="text-xs font-semibold text-rose-700">تتطلب البرمجة (استثناءات)</p>
          <p className="mt-1 text-2xl font-black text-rose-800">{exceptionsFixtures.length}</p>
        </div>
        <div className="rounded-2xl border border-blue-200/80 bg-blue-50/50 p-4 shadow-sm">
          <p className="text-xs font-semibold text-blue-700">الفترات المتاحة للحجز</p>
          <p className="mt-1 text-2xl font-black text-blue-800">{capacityData?.available_slots ?? '-'}</p>
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
            سيقوم النظام بإنشاء جميع المواجهات (دوري من دور واحد أو دورين) تلقائياً بين الفرق المسجلة، مع إمكانية تحديد الملاعب والمواعيد مباشرة أو اعتماد حجوزات الفرق المضيفة.
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

      {/* Prominent Auto-Schedule Action Bar */}
      {totalFixtures > 0 && waitingFixtures.length > 0 && (
        <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-xl bg-emerald-600 text-white">
                  <Zap className="size-4" />
                </span>
                <h4 className="text-sm font-black text-slate-900">البرمجة التلقائية لكافة المباريات</h4>
              </div>
              <p className="text-xs leading-relaxed text-slate-600 max-w-2xl">
                يقوم المحرك تلقائياً بمطابقة المواجهات مع فترات الحجز المتاحة، مع اعتماد صاحب الحجز كمضيف، وتطبيق فترة الراحة الإلزامية ({tournament.rest_days_minimum ?? 1} يوم على الأقل)، واستثمار الفترات المستعارة عند راحة المالك.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <Button
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5 py-2.5 shadow-sm"
                onClick={openAutoScheduleConfirm}
                disabled={autoScheduleBusy || waitingFixtures.length === 0 || Boolean(firstDayError)}
              >
                {autoScheduleBusy ? (
                  <Loader2 className="me-2 size-4 animate-spin" />
                ) : (
                  <Sparkles className="me-2 size-4 text-amber-300" />
                )}
                بدء البرمجة التلقائية ({waitingFixtures.length} مواجهة)
              </Button>
            </div>
          </div>

          {/* First match day selector & capacity check preview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 rounded-2xl border border-emerald-100 bg-white/80 p-3.5 text-xs">
            <div className="space-y-1">
              <label className="block text-[11px] font-black text-slate-700">
                اليوم الأول للدوري
              </label>
              <input
                type="date"
                className={`w-full rounded-xl border ${
                  firstDayError ? 'border-rose-300 bg-rose-50/40' : 'border-slate-200 bg-white'
                } px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none`}
                value={firstMatchDay}
                min={new Date().toISOString().split('T')[0]}
                max={tournament.end_date || undefined}
                onChange={handleFirstDayChange}
              />
              {firstDayError && (
                <p className="text-[10px] font-bold text-rose-600">{firstDayError}</p>
              )}
            </div>

            <div className="space-y-1">
              <span className="block text-[11px] font-black text-slate-700">
                فحص السعة والمواعيد من هذا التاريخ
              </span>
              <div className="flex items-center gap-2 pt-1 font-bold">
                <span className="rounded-lg bg-emerald-100/80 px-2 py-0.5 text-emerald-800">
                  {capacityData?.available_slots ?? 0} فترة متاحة
                </span>
                <span className="text-slate-400">مقابل</span>
                <span className="rounded-lg bg-amber-100/80 px-2 py-0.5 text-amber-800">
                  {waitingFixtures.length} مواجهة مطلوبة
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="block text-[11px] font-black text-slate-700">
                حالة أول موعد متاح
              </span>
              <div className="pt-1 text-[11px]">
                {capacityData?.has_slot_on_chosen_day ? (
                  <span className="flex items-center gap-1 font-bold text-emerald-700">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    يتوفر حجز في نفس اليوم المحدد
                  </span>
                ) : capacityData?.first_available_date ? (
                  <span className="flex items-center gap-1 font-bold text-blue-700">
                    <Clock className="size-3.5 text-blue-600" />
                    أول موعد متاح: {capacityData.first_available_date} ({capacityData.first_available_time})
                  </span>
                ) : (
                  <span className="text-slate-400">لا توجد مواعيد متاحة بعد هذا التاريخ</span>
                )}
              </div>
            </div>
          </div>

          {/* Capacity warning alert if available slots are insufficient */}
          {capacityData?.warning && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/90 p-3 text-xs text-amber-900">
              <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
              <p className="leading-relaxed font-semibold">{capacityData.warning}</p>
            </div>
          )}
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
                refetchCapacity()
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
          {/* Header Row: Title & Subtitle */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-600 shadow-2xs">
                <Calendar className="size-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 leading-tight">المباريات</h3>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">جدول مباريات الدوري وإدارتها بالأسابيع</p>
              </div>
            </div>
          </div>

          {/* Week Selector */}
          {leagueWeeks.length > 0 && (
            <LeagueWeekSelector
              weeks={leagueWeeks}
              activeWeekId={activeWeekId}
              onChangeWeek={setActiveWeekId}
              unscheduledCount={leagueUnscheduled.length}
              totalCount={totalFixtures}
            />
          )}

          {/* Segmented Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {[
              { id: 'scheduled', label: 'القادمة' },
              { id: 'played', label: 'المنتهية' },
              { id: 'waiting', label: 'المؤجلة' },
              { id: 'all', label: 'الكل' },
            ].map((tab) => {
              const active = statusFilter === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`rounded-full px-4 py-1.5 text-xs font-black transition-all duration-150 ${
                    active
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Fixtures List */}
          {filteredFixtures.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
              <Calendar className="mx-auto size-8 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-500">لا توجد مباريات مطابقة للفلتر المحدد</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dayGroups.map((dayGroup) => (
                <div key={dayGroup.dayKey} className="space-y-2.5">
                  {dayGroup.headerLabel && (
                    <div className="flex items-center justify-between rounded-2xl bg-slate-100/90 px-4 py-2.5 text-slate-800 border border-slate-200/60 mb-1">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="size-4 text-emerald-600" />
                        <h4 className="text-xs sm:text-sm font-black text-slate-900">{dayGroup.headerLabel}</h4>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-0.5 text-[11px] font-black text-slate-600 shadow-2xs border border-slate-200/60">
                        {dayGroup.matches.length} مباراة
                      </span>
                    </div>
                  )}
                  {dayGroup.matches.map((fixture) => (
                    <TournamentMatchCard
                      key={fixture.id}
                      fixture={fixture}
                      index={chronologicalNumberMap.get(fixture.id) || 0}
                      isUnassigning={unassignBusyId === fixture.id}
                      onResult={onResult}
                      onDetails={onDetails}
                      onReschedule={onReschedule}
                      onUnassign={handleUnassign}
                      onSwapOpponent={(f) => {
                        setOpponentSwapFixture(f)
                        setSelectedNewOpponentId('')
                      }}
                      onPostpone={(f) => {
                        setPostponeFixture(f)
                        setPostponeReason('rain')
                        setPostponeNote('')
                      }}
                      onRescheduleSuggestion={(f) => openRescheduleSuggestions(f)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Opponent Swap Modal Dialog */}
      {opponentSwapFixture && (() => {
        const eligibleList = eligibleOpponents.filter((t) => t.is_eligible)
        const ineligibleList = eligibleOpponents.filter((t) => !t.is_eligible)
        const selectedTeamData = eligibleList.find((t) => String(t.team_id) === String(selectedNewOpponentId))

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
              onClick={() => setOpponentSwapFixture(null)}
            />
            <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ArrowLeftRight className="size-5 text-emerald-600" />
                  <h3 className="text-sm font-black text-slate-900">تبديل الفريق الخصم للمواجهة</h3>
                </div>
                <button
                  type="button"
                  className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  onClick={() => setOpponentSwapFixture(null)}
                >
                  <X className="size-5" />
                </button>
              </div>

              <div className="my-4 space-y-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-700">
                    <span>الفريق المضيف:</span>
                    <span className="text-slate-900">{opponentSwapFixture.home_team?.name}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between font-bold text-slate-700">
                    <span>الخصم الحالي:</span>
                    <span className="text-rose-600 font-black">{opponentSwapFixture.away_team?.name}</span>
                  </div>
                  {opponentSwapFixture.matchday && (
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
                      <span>الجولة:</span>
                      <span className="font-bold text-slate-700">الجولة {opponentSwapFixture.matchday}</span>
                    </div>
                  )}
                  {opponentSwapFixture.scheduled_at && (
                    <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                      <span>موعد المباراة الحالي:</span>
                      <span className="font-bold text-slate-700">{opponentSwapFixture.scheduled_at}</span>
                    </div>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      اختر الفريق الخصم الجديد:
                    </label>
                    {loadingEligibles && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                        <Loader2 className="size-3 animate-spin" />
                        جاري فحص الفرق المؤهلة...
                      </span>
                    )}
                  </div>

                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none disabled:bg-slate-50"
                    value={selectedNewOpponentId}
                    onChange={(e) => setSelectedNewOpponentId(e.target.value)}
                    disabled={loadingEligibles || swapBusy}
                  >
                    {loadingEligibles ? (
                      <option value="">-- جاري فحص الفرق المؤهلة وفقاً لقواعد الدوري... --</option>
                    ) : eligibleList.length === 0 ? (
                      <option value="">-- لا توجد فرق مؤهلة حالياً للتبديل --</option>
                    ) : (
                      <>
                        <option value="">-- اضغط للاختيار من الفرق المؤهلة ({eligibleList.length} متاح) --</option>
                        {eligibleList.map((team) => (
                          <option key={team.team_id} value={team.team_id}>
                            {team.team_name} {team.other_fixture ? `(مواجهة الجولة ${team.other_fixture.matchday}${team.other_fixture.scheduled_at ? ` - ${team.other_fixture.scheduled_at}` : ''})` : ''}
                          </option>
                        ))}
                        {ineligibleList.length > 0 && (
                          <optgroup label="فرق غير متاحة للتبديل">
                            {ineligibleList.map((team) => (
                              <option key={team.team_id} value={team.team_id} disabled>
                                {team.team_name} {team.ineligibility_reasons?.[0] ? `(${team.ineligibility_reasons[0]})` : '(غير متاح)'}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </>
                    )}
                  </select>

                  {!loadingEligibles && eligibleList.length === 0 && (
                    <div className="mt-2.5 rounded-xl border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 flex items-start gap-2">
                      <AlertCircle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                      <span className="leading-relaxed">
                        لا توجد فرق مؤهلة للتبديل حالياً (بسبب تعارضات فترات الراحة الإلزامية أو كون المباريات المقابلة قد لُعبت بالفعل).
                      </span>
                    </div>
                  )}

                  {selectedTeamData && (
                    <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 font-black text-emerald-800">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        <span>معاينة نتيجة تبادل المواجهتين بين الجولتين:</span>
                      </div>
                      <div className="space-y-1 text-slate-700 ps-5 font-medium text-[11px] leading-relaxed">
                        <p>
                          • <span className="text-slate-900 font-bold">هذه المباراة (الجولة {opponentSwapFixture.matchday || '-'}):</span> ستصبح بين{' '}
                          <span className="font-bold text-slate-900">{opponentSwapFixture.home_team?.name}</span> و{' '}
                          <span className="font-bold text-emerald-700">{selectedTeamData.team_name}</span>.
                        </p>
                        {selectedTeamData.other_fixture && (
                          <p>
                            • <span className="text-slate-900 font-bold">المواجهة المقابلة (الجولة {selectedTeamData.other_fixture.matchday}):</span> ستصبح بين{' '}
                            <span className="font-bold text-slate-900">{opponentSwapFixture.home_team?.name}</span> و{' '}
                            <span className="font-bold text-rose-600">{opponentSwapFixture.away_team?.name}</span>.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                    يعتمد التبديل نظام مقايضة المواجهتين (Fixture Swap) للحفاظ التام على سلامة نظام الدوري (دورة واحدة) والتحقق من عدم تعارض فترات الراحة.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <Button
                  variant="outline"
                  className="text-xs"
                  onClick={() => setOpponentSwapFixture(null)}
                >
                  إلغاء
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4"
                  disabled={!selectedNewOpponentId || swapBusy || loadingEligibles}
                  onClick={handleSwapOpponentSubmit}
                >
                  {swapBusy ? <Loader2 className="me-1.5 size-3.5 animate-spin" /> : null}
                  تأكيد تبديل الخصم
                </Button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Auto-Schedule Confirmation Modal */}
      {confirmModalData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setConfirmModalData(null)}
          />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-5 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900">تأكيد بدء برمجة الدوري</h3>
              </div>
              <button
                type="button"
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setConfirmModalData(null)}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-700">
                  <span>اليوم الأول المختار:</span>
                  <span className="font-black text-emerald-700">{confirmModalData.chosenDate}</span>
                </div>
                <div className="flex items-center justify-between font-bold text-slate-700">
                  <span>المواجهات المطلوب برمجتها:</span>
                  <span className="text-slate-900">{confirmModalData.unscheduledCount} مواجهة</span>
                </div>
                <div className="flex items-center justify-between font-bold text-slate-700">
                  <span>الفترات المتاحة من هذا التاريخ:</span>
                  <span className="text-slate-900">{confirmModalData.availableSlots} فترة حجز</span>
                </div>
              </div>

              {/* Slot availability note */}
              {confirmModalData.hasExactSlot ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 flex items-center gap-2 text-emerald-800 font-bold">
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                  <span>يتوفر حجز مؤكد للفرق في نفس اليوم الأول المختار.</span>
                </div>
              ) : confirmModalData.firstAvailDate ? (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-3 flex items-start gap-2 text-blue-900 font-bold">
                  <Clock className="size-4 shrink-0 text-blue-600 mt-0.5" />
                  <div>
                    <p>لا يوجد حجز لفريق في نفس اليوم المحدد.</p>
                    <p className="mt-0.5 text-blue-700 font-black">
                      أول موعد متاح: {confirmModalData.firstAvailDate} ({confirmModalData.firstAvailTime})
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-3 flex items-center gap-2 text-amber-800 font-bold">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                  <span>لا تتوفر فترات حجز بعد هذا التاريخ.</span>
                </div>
              )}

              {!confirmModalData.sufficient && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-3 text-rose-800 font-semibold text-[11px]">
                  تنبيه: عدد الفترات المتاحة أقل من عدد المباريات. سيتم وضع المباريات المتبقية في قائمة المباريات التي تتطلب البرمجة.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                className="text-xs"
                onClick={() => setConfirmModalData(null)}
              >
                تراجع
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-5"
                disabled={autoScheduleBusy}
                onClick={() => executeAutoSchedule(false)}
              >
                {autoScheduleBusy ? <Loader2 className="me-1.5 size-3.5 animate-spin" /> : null}
                تأكيد الجدولة
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Regeneration Guard Modal: Preserves finished matches */}
      {regenConfirmData && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setRegenConfirmData(null)}
          />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-600" />
                <h3 className="text-sm font-black text-slate-900">تأكيد تغيير اليوم الأول للدوري</h3>
              </div>
              <button
                type="button"
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setRegenConfirmData(null)}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="font-semibold text-slate-700 leading-relaxed">
                {regenConfirmData.message}
              </p>

              {regenConfirmData.preserved_matches && regenConfirmData.preserved_matches.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-3 space-y-2">
                  <span className="block font-black text-amber-900">المباريات المحفوظة ونتائجها:</span>
                  <div className="max-h-32 overflow-y-auto space-y-1 divide-y divide-amber-200/40">
                    {regenConfirmData.preserved_matches.map((m) => (
                      <div key={m.id} className="pt-1 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-slate-800">{m.teams}</span>
                        <span className="rounded bg-white px-1.5 py-0.5 text-emerald-800 shadow-2xs">
                          {m.score || 'مكتملة'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                className="text-xs"
                onClick={() => setRegenConfirmData(null)}
              >
                إلغاء
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4"
                disabled={autoScheduleBusy}
                onClick={() => executeAutoSchedule(true)}
              >
                {autoScheduleBusy ? <Loader2 className="me-1.5 size-3.5 animate-spin" /> : null}
                تأكيد ومتابعة الجدولة
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL A: Postpone Match Dialog with Reason Selector */}
      {postponeFixture && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setPostponeFixture(null)}
          />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Clock4 className="size-5 text-amber-600" />
                <h3 className="text-sm font-black text-slate-900">تأجيل المباراة</h3>
              </div>
              <button
                type="button"
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setPostponeFixture(null)}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 space-y-1.5 font-bold">
                <div className="flex items-center justify-between text-slate-700">
                  <span>المواجهة:</span>
                  <span className="text-slate-900">
                    {postponeFixture.home_team?.name} ضد {postponeFixture.away_team?.name}
                  </span>
                </div>
                {postponeFixture.scheduled_at && (
                  <div className="flex items-center justify-between text-slate-500 text-[11px]">
                    <span>الموعد الأصلي:</span>
                    <span dir="ltr">{postponeFixture.scheduled_at}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">
                  سبب التأجيل:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'rain', label: 'أمطار 🌧️' },
                    { id: 'pitch_condition', label: 'ظروف الملعب 🏟️' },
                    { id: 'team_circumstances', label: 'ظروف أحد الفريقين 👥' },
                    { id: 'other', label: 'أخرى 📝' },
                  ].map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setPostponeReason(r.id)}
                      className={`rounded-xl border p-2.5 text-xs font-bold text-center transition-all ${
                        postponeReason === r.id
                          ? 'border-amber-500 bg-amber-50/80 text-amber-900 shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  ملاحظة إضافية (اختياري):
                </label>
                <textarea
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none"
                  rows={2}
                  placeholder="أدخل أي تفاصيل أو أسباب إضافية..."
                  value={postponeNote}
                  onChange={(e) => setPostponeNote(e.target.value)}
                />
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-3 text-[11px] leading-relaxed text-amber-900 font-semibold">
                سيتم حفظ سبب التأجيل على المباراة، وإلغاء حجز الملعب ليعود متاحاً فوراً، وإشعار مديري الفريقين عبر الواتساب والمنصة، وفتح نافذة الاقتراحات المتاحة لإعادة الجدولة.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                className="text-xs"
                onClick={() => setPostponeFixture(null)}
              >
                إلغاء
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4"
                disabled={postponeBusy}
                onClick={handlePostponeSubmit}
              >
                {postponeBusy ? <Loader2 className="me-1.5 size-3.5 animate-spin" /> : null}
                تأكيد التأجيل وعرض المواعيد
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL B: Suggestions Modal for Rescheduling Postponed Match */}
      {rescheduleFixture && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setRescheduleFixture(null)}
          />
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col rounded-3xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Sparkles className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">مواعيد مقترحة لإعادة الجدولة</h3>
                  <p className="text-[11px] text-slate-400 font-semibold">
                    {rescheduleFixture.home_team?.name} ضد {rescheduleFixture.away_team?.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setRescheduleFixture(null)}
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Body: Suggestions List */}
            <div className="p-5 overflow-y-auto space-y-3.5 flex-1">
              {postponeSuggestionsLoading ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="size-7 animate-spin text-emerald-600" />
                  <p className="text-xs font-bold text-slate-400">جاري فحص حجوزات الفريقين وفترات الراحة...</p>
                </div>
              ) : postponeSuggestions.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center space-y-3">
                  <CalendarCheck className="mx-auto size-9 text-slate-300" />
                  <h4 className="text-sm font-black text-slate-700">لا توجد مواعيد متاحة حالياً</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                    لم نجد فترات حجز شاغرة للفريقين بعد التاريخ الأصلي تلبي قاعدة الراحة الإلزامية وخلو الملاعب.
                  </p>
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      className="text-xs w-full sm:w-auto"
                      onClick={() => {
                        setRescheduleFixture(null)
                        if (onReschedule) onReschedule(rescheduleFixture)
                      }}
                    >
                      <CalendarDays className="me-1.5 size-3.5" />
                      تحديد موعد وملعب يدوياً
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold w-full sm:w-auto"
                      onClick={() => {
                        window.open('/fields', '_blank')
                      }}
                    >
                      حجز موعد جديد لأحد الفريقين
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-[11px] font-bold text-slate-500 leading-relaxed">
                    اختر أحد المواعيد المتاحة أدناه (حجوزات مؤكدة للفريقين تلبي قواعد الراحة). نقرة واحدة لاعتماد الموعد وتثبيته:
                  </p>

                  {postponeSuggestions.map((sug) => (
                    <div
                      key={sug.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-emerald-300 transition-all"
                    >
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-800">
                            {sug.day_name} • {sug.date}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                            <Clock className="size-3 text-slate-400" />
                            {sug.time}
                          </span>
                          {sug.is_weekly && (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                              اشتراك أسبوعي
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <MapPin className="size-3.5 text-slate-400 shrink-0" />
                          <span>{sug.stadium?.name || 'الملعب'}</span>
                          {sug.stadium?.city && (
                            <span className="text-slate-400 text-[11px]">({sug.stadium.city})</span>
                          )}
                        </div>

                        {/* Host Team indicator */}
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-[11px] font-extrabold text-slate-700">
                            يستضيف: <strong className="text-emerald-700">{sug.host_team?.name}</strong>
                          </span>
                          {sug.is_host_changed && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black text-amber-800">
                              {sug.host_changed_note}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center justify-end">
                        <Button
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2"
                          disabled={Boolean(applyingSuggestionId)}
                          onClick={() => setPendingConfirmSuggestion(sug)}
                        >
                          {applyingSuggestionId === sug.id ? (
                            <Loader2 className="me-1.5 size-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="me-1.5 size-3.5" />
                          )}
                          اختيار واعتماد
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 p-4 bg-slate-50/70">
              <span className="text-[11px] text-slate-400 font-semibold">
                ستبقى المباراة بحالة مؤجلة إذا تم إغلاق النافذة دون اختيار
              </span>
              <Button
                variant="outline"
                className="text-xs"
                onClick={() => setRescheduleFixture(null)}
              >
                إغلاق
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL C: Final One-Tap Confirmation for Selected Suggestion */}
      {pendingConfirmSuggestion && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setPendingConfirmSuggestion(null)}
          />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h4 className="text-xs font-black text-slate-900">تأكيد الموعد الجديد</h4>
              <button
                type="button"
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100"
                onClick={() => setPendingConfirmSuggestion(null)}
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 space-y-1.5 text-xs font-bold text-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">اليوم والتاريخ:</span>
                <span className="text-emerald-700">
                  {pendingConfirmSuggestion.day_name} {pendingConfirmSuggestion.date}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">التوقيت:</span>
                <span>{pendingConfirmSuggestion.time}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">الملعب:</span>
                <span>{pendingConfirmSuggestion.stadium?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">المضيف (صاحب الحجز):</span>
                <span className="text-emerald-800">{pendingConfirmSuggestion.host_team?.name}</span>
              </div>
              {pendingConfirmSuggestion.is_host_changed && (
                <p className="mt-1 text-[11px] text-amber-700 font-bold">
                  {pendingConfirmSuggestion.host_changed_note}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => setPendingConfirmSuggestion(null)}
              >
                تراجع
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4"
                disabled={Boolean(applyingSuggestionId)}
                onClick={() => handleApplySuggestion(pendingConfirmSuggestion)}
              >
                {applyingSuggestionId ? <Loader2 className="me-1.5 size-3.5 animate-spin" /> : null}
                تأكيد التثبيت فوراً
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
