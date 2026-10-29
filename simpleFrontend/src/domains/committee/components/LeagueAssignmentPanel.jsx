import { useState, useMemo, useEffect } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Clock4,
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
  ChevronLeft,
  ChevronDown,
  Calendar,
  Filter,
  ArrowLeftRight,
  X,
  Zap,
  SlidersHorizontal,
  Info,
  Layers,
  ArrowRight,
  Check,
  Share2,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Badge, Button, Card } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import LeagueMatchCard from './LeagueMatchCard'
import LeagueWeekSelector from './LeagueWeekSelector'
import MatchManagementModal from './MatchManagementModal'
import DelegatedMatchLinkModal from './DelegatedMatchLinkModal'
import DelegatedSubmissionReviewModal from './DelegatedSubmissionReviewModal'
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
  const [activeSubTab, setActiveSubTab] = useState('fixtures') // 'fixtures' | 'suggestions' | 'slot_pool'
  const [viewMode, setViewMode] = useState('chronological') // 'chronological' | 'rounds' | 'action_required'
  const [assignBusyId, setAssignBusyId] = useState(null)
  const [unassignBusyId, setUnassignBusyId] = useState(null)
  const [genBusy, setGenBusy] = useState(false)
  const [autoScheduleBusy, setAutoScheduleBusy] = useState(false)
  const [swapBusy, setSwapBusy] = useState(false)
  const [opponentSwapFixture, setOpponentSwapFixture] = useState(null)
  const [selectedNewOpponentId, setSelectedNewOpponentId] = useState('')
  const [managingFixture, setManagingFixture] = useState(null)
  const [delegateFixture, setDelegateFixture] = useState(null)
  const [reviewSubmissionFixture, setReviewSubmissionFixture] = useState(null)
  const [eligibleOpponents, setEligibleOpponents] = useState([])
  const [loadingEligibles, setLoadingEligibles] = useState(false)

  // Bottom sheets
  const [filterSheetOpen, setFilterSheetOpen] = useState(false)
  const [schedulingToolsOpen, setSchedulingToolsOpen] = useState(false)
  const [engineInfoOpen, setEngineInfoOpen] = useState(false)

  // Filters
  const [matchdayFilter, setMatchdayFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('scheduled') // 'all' | 'scheduled' | 'played' | 'waiting'
  const [teamFilter, setTeamFilter] = useState('all')
  const [dayFilter, setDayFilter] = useState('all')

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
  const [postponeReason, setPostponeReason] = useState('team_circumstances')
  const [postponeNote, setPostponeNote] = useState('')
  const [postponeBusy, setPostponeBusy] = useState(false)

  // Step 2 & 3 State
  const [freedAction, setFreedAction] = useState('freed')
  const [moveToOwnSlotFixture, setMoveToOwnSlotFixture] = useState(null)
  const [moveToOwnSlotsList, setMoveToOwnSlotsList] = useState([])
  const [loadingMoveToOwnSlots, setLoadingMoveToOwnSlots] = useState(false)
  const [quickAssignFixture, setQuickAssignFixture] = useState(null)
  const [quickAssignSlot, setQuickAssignSlot] = useState(null)
  const [selectedQuickHostId, setSelectedQuickHostId] = useState(null)
  const [quickAssignBusy, setQuickAssignBusy] = useState(false)
  const [slotPoolFixturePicker, setSlotPoolFixturePicker] = useState(null)
  const [showSecondaryPool, setShowSecondaryPool] = useState(false)

  // Reschedule suggestions modal state
  const [rescheduleFixture, setRescheduleFixture] = useState(null)
  const [postponeSuggestions, setPostponeSuggestions] = useState([])
  const [postponeSuggestionsLoading, setPostponeSuggestionsLoading] = useState(false)
  const [applyingSuggestionId, setApplyingSuggestionId] = useState(null)
  const [pendingConfirmSuggestion, setPendingConfirmSuggestion] = useState(null)

  // Early match advancement state
  const [advanceCandidateModal, setAdvanceCandidateModal] = useState(null)
  const [advanceBusy, setAdvanceBusy] = useState(false)
  const [overrideRest, setOverrideRest] = useState(false)

  // Fetch match suggestions
  const {
    data: suggestionsData,
    loading: suggestionsLoading,
    refetch: refetchSuggestions,
  } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/league/suggestions`).then((r) => r.data),
    [tournament.id, refreshKey, activeSubTab],
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

  const [optimisticFixtureUpdates, setOptimisticFixtureUpdates] = useState({})

  useEffect(() => {
    setOptimisticFixtureUpdates({})
  }, [allFixtures])

  const effectiveFixtures = useMemo(() => {
    if (!allFixtures) return []
    if (!Object.keys(optimisticFixtureUpdates).length) return allFixtures
    return allFixtures.map((f) => {
      const update = optimisticFixtureUpdates[f.id]
      return update ? { ...f, ...update } : f
    })
  }, [allFixtures, optimisticFixtureUpdates])

  // Fetch unused slot pool
  const {
    data: slotPoolData,
    loading: slotPoolLoading,
    refetch: refetchSlotPool,
  } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/league/unused-slot-pool`).then((r) => r.data?.data),
    [tournament.id, refreshKey],
    { staleTime: 0 }
  )

  const defaultPool = slotPoolData?.default_pool || []
  const secondaryPool = slotPoolData?.secondary_pool || []
  const allAvailableSlots = useMemo(() => [...defaultPool, ...secondaryPool], [defaultPool, secondaryPool])

  // Pre-calculate nearest available slot for pending/postponed fixtures
  const nearestSlotMap = useMemo(() => {
    if (!allAvailableSlots.length || !effectiveFixtures?.length) return {}
    const map = {}
    effectiveFixtures.forEach((f) => {
      const isUnscheduled = !f.scheduled_at || f.status === 'waiting_for_booking' || f.status === 'rescheduling_required' || f.status === 'postponed'
      if (isUnscheduled) {
        map[f.id] = allAvailableSlots[0]
      }
    })
    return map
  }, [allAvailableSlots, effectiveFixtures])

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
      refetchSlotPool()
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
      setSchedulingToolsOpen(false)
      refetchAllFixtures()
      refetchSuggestions()
      refetchCapacity()
      refetchSlotPool()
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
      refetchSlotPool()
      if (onRefresh) onRefresh()
    } catch (e) {
      toastApiError(e)
    } finally {
      setAssignBusyId(null)
    }
  }

  const handleUnassign = async (fixtureId) => {
    setOptimisticFixtureUpdates((prev) => ({
      ...prev,
      [fixtureId]: {
        scheduled_at: null,
        stadium_id: null,
        stadium: null,
        status: 'waiting_for_booking',
      },
    }))
    toast.success('تم إلغاء ربط الحجز بالمباراة')

    try {
      await api.post(`/committee/tournaments/${tournament.id}/league/unassign`, {
        fixture_id: fixtureId,
      })
      refetchSuggestions()
      refetchAllFixtures()
      refetchCapacity()
      refetchSlotPool()
      if (onRefresh) onRefresh()
    } catch (e) {
      setOptimisticFixtureUpdates((prev) => {
        const next = { ...prev }
        delete next[fixtureId]
        return next
      })
      toastApiError(e)
    }
  }

  const handlePostponeSubmit = async () => {
    if (!postponeFixture) return
    const targetFixture = postponeFixture
    const targetReason = postponeReason
    const targetNote = postponeNote
    const targetFreedAction = freedAction

    setPostponeFixture(null)
    setPostponeNote('')
    setPostponeReason('team_circumstances')
    setFreedAction('freed')

    setOptimisticFixtureUpdates((prev) => ({
      ...prev,
      [targetFixture.id]: {
        status: 'postponed',
        scheduled_at: null,
        stadium_id: null,
        stadium: null,
        postponement_reason: targetReason,
        postponement_note: targetNote || null,
      },
    }))

    toast.success('تم تأجيل المباراة بنجاح')

    try {
      await api.post(`/committee/tournaments/${tournament.id}/league/fixtures/${targetFixture.id}/postpone`, {
        reason: targetReason,
        note: targetNote || undefined,
        freed_action: targetFreedAction,
      })
      refetchAllFixtures()
      refetchSuggestions()
      refetchCapacity()
      refetchSlotPool()
      if (onRefresh) onRefresh()
    } catch (e) {
      setOptimisticFixtureUpdates((prev) => {
        const next = { ...prev }
        delete next[targetFixture.id]
        return next
      })
      toastApiError(e)
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
          override_warnings: Boolean(suggestion.has_rest_warning),
          override_reason: 'تثبيت موعد المباراة من المقترحات بقرار اللجنة المنظمة',
        }
      )
      toast.success(res.data?.message || 'تمت إعادة جدولة وتثبيت المباراة بنجاح')
      setPendingConfirmSuggestion(null)
      setRescheduleFixture(null)
      refetchAllFixtures()
      refetchSuggestions()
      refetchCapacity()
      refetchSlotPool()
      if (onRefresh) onRefresh()
    } catch (e) {
      toastApiError(e)
    } finally {
      setApplyingSuggestionId(null)
    }
  }

  const handleConfirmAdvance = async () => {
    if (!advanceCandidateModal) return
    const { fixture, slot } = advanceCandidateModal
    setAdvanceBusy(true)
    try {
      const res = await api.post(
        `/committee/tournaments/${tournament.id}/league/fixtures/${fixture.id}/advance-match`,
        {
          booking_id: slot.booking_id,
          date: slot.date,
          override_warnings: overrideRest,
          override_reason: 'تقديم موعد المباراة لتقليص مدة الدوري بقرار اللجنة المنظمة',
        }
      )
      toast.success(res.data?.message || 'تم تقديم موعد المباراة بنجاح')
      setAdvanceCandidateModal(null)
      setOverrideRest(false)
      refetchAllFixtures()
      refetchSuggestions()
      refetchSlotPool()
      refetchCapacity()
      if (onRefresh) onRefresh()
    } catch (err) {
      toastApiError(err)
    } finally {
      setAdvanceBusy(false)
    }
  }

  const handleOpenMoveToOwnSlot = async (fixture) => {
    setMoveToOwnSlotFixture(fixture)
    setLoadingMoveToOwnSlots(true)
    setMoveToOwnSlotsList([])
    try {
      const [resHome, resAway] = await Promise.all([
        api.get(`/committee/tournaments/${tournament.id}/league/fixtures/${fixture.id}/host-slot-suggestions?host_team_id=${fixture.home_team_id}`),
        api.get(`/committee/tournaments/${tournament.id}/league/fixtures/${fixture.id}/host-slot-suggestions?host_team_id=${fixture.away_team_id}`)
      ])
      const homeSlots = (resHome.data?.data || []).map(s => ({ ...s, team_name: fixture.home_team?.name }))
      const awaySlots = (resAway.data?.data || []).map(s => ({ ...s, team_name: fixture.away_team?.name }))
      setMoveToOwnSlotsList([...homeSlots, ...awaySlots])
    } catch (err) {
      toastApiError(err)
    } finally {
      setLoadingMoveToOwnSlots(false)
    }
  }

  const handleApplyMoveToOwnSlot = async (slot) => {
    if (!moveToOwnSlotFixture) return
    try {
      const res = await api.post(`/committee/tournaments/${tournament.id}/league/fixtures/${moveToOwnSlotFixture.id}/move-to-own-slot`, {
        booking_id: slot.booking_id,
        date: slot.date,
      })
      toast.success(res.data?.message || 'تم نقل المباراة بنجاح')
      setMoveToOwnSlotFixture(null)
      refetchAllFixtures()
      refetchSuggestions()
      refetchSlotPool()
      if (onRefresh) onRefresh()
    } catch (err) {
      toastApiError(err)
    }
  }

  const handleQuickAssignClick = (fixture, slot) => {
    setQuickAssignFixture(fixture)
    setQuickAssignSlot(slot)
    if (slot.owner_team_id === fixture.home_team_id || slot.owner_team_id === fixture.away_team_id) {
      setSelectedQuickHostId(slot.owner_team_id)
    } else {
      setSelectedQuickHostId(fixture.home_team_id)
    }
  }

  const handleDirectAssignSlotToFixture = async (fixture, slot) => {
    try {
      const hostTeamId = (slot.owner_team_id === fixture.home_team_id || slot.owner_team_id === fixture.away_team_id)
        ? slot.owner_team_id
        : (fixture.home_team_id || fixture.home_team?.id)

      const res = await api.post(`/committee/tournaments/${tournament.id}/league/fixtures/${fixture.id}/quick-assign`, {
        booking_id: slot.booking_id,
        date: slot.date,
        host_team_id: hostTeamId,
      })
      const updatedFixture = res.data?.data
      refetchAllFixtures()
      refetchSuggestions()
      refetchSlotPool()
      refetchCapacity()
      if (onRefresh) onRefresh()

      toast.success(res.data?.message || 'تم تعيين الموعد للمواجهة بنجاح', {
        duration: 9000,
        action: {
          label: 'تراجع ↩',
          onClick: async () => {
            try {
              const undoRes = await api.post(`/committee/tournaments/${tournament.id}/league/fixtures/${updatedFixture.id}/undo-change`)
              toast.info(undoRes.data?.message || 'تم التراجع بنجاح')
              refetchAllFixtures()
              refetchSuggestions()
              refetchSlotPool()
              refetchCapacity()
              if (onRefresh) onRefresh()
            } catch (err) {
              toastApiError(err)
            }
          },
        },
      })
    } catch (e) {
      toastApiError(e)
    }
  }

  const handleConfirmQuickAssign = async () => {
    if (!quickAssignFixture || !quickAssignSlot) return
    setQuickAssignBusy(true)
    try {
      const res = await api.post(`/committee/tournaments/${tournament.id}/league/fixtures/${quickAssignFixture.id}/quick-assign`, {
        booking_id: quickAssignSlot.booking_id,
        date: quickAssignSlot.date,
        host_team_id: selectedQuickHostId,
      })
      const updatedFixture = res.data?.data
      setQuickAssignFixture(null)
      setQuickAssignSlot(null)
      refetchAllFixtures()
      refetchSuggestions()
      refetchSlotPool()
      if (onRefresh) onRefresh()

      toast.success(res.data?.message || 'تم تعيين الموعد بنجاح', {
        duration: 9000,
        action: {
          label: 'تراجع ↩',
          onClick: async () => {
            try {
              const undoRes = await api.post(`/committee/tournaments/${tournament.id}/league/fixtures/${updatedFixture.id}/undo-change`)
              toast.info(undoRes.data?.message || 'تم التراجع بنجاح')
              refetchAllFixtures()
              refetchSuggestions()
              refetchSlotPool()
              if (onRefresh) onRefresh()
            } catch (err) {
              toastApiError(err)
            }
          }
        }
      })
    } catch (err) {
      toastApiError(err)
    } finally {
      setQuickAssignBusy(false)
    }
  }

  const handleReclaimOccurrence = async (occurrenceId) => {
    try {
      const res = await api.post(`/committee/tournaments/${tournament.id}/league/occurrences/${occurrenceId}/reclaim`)
      toast.success(res.data?.message || 'تم استرجاع الموعد لصاحبه')
      refetchSlotPool()
      refetchSuggestions()
      if (onRefresh) onRefresh()
    } catch (err) {
      toastApiError(err)
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

  const [activeWeekId, setActiveWeekId] = useState('all')

  const { weeks: leagueWeeks, unscheduled: leagueUnscheduled, chronologicalNumberMap } = useMemo(() => {
    return computeLeagueWeeks(effectiveFixtures || [], 'ar')
  }, [effectiveFixtures])

  const defaultWeekId = useMemo(() => {
    return getDefaultWeekId(leagueWeeks, leagueUnscheduled)
  }, [leagueWeeks, leagueUnscheduled])

  useEffect(() => {
    // If activeWeekId is unset, default to 'all' so that upcoming scheduled matches appear directly
    if (!activeWeekId) {
      setActiveWeekId('all')
      return
    }
    // Only reset if an invalid week was selected that does not exist in leagueWeeks
    if (activeWeekId !== 'all' && activeWeekId !== 'unscheduled' && leagueWeeks && leagueWeeks.length > 0) {
      if (!leagueWeeks.some((w) => w.id === activeWeekId)) {
        setActiveWeekId('all')
      }
    }
  }, [leagueWeeks, activeWeekId])

  const totalFixtures = effectiveFixtures?.length || 0
  const scheduledFixtures = effectiveFixtures?.filter((f) => f.scheduled_at && f.status !== 'waiting_for_booking') || []
  const waitingFixtures = effectiveFixtures?.filter((f) => !f.scheduled_at || f.status === 'waiting_for_booking') || []

  const actionRequiredFixtures = useMemo(() => {
    return (effectiveFixtures || []).filter(
      (f) =>
        !f.scheduled_at ||
        f.status === 'postponed' ||
        f.status === 'waiting_for_booking' ||
        f.status === 'rescheduling_required' ||
        Boolean(f.unscheduled_reason) ||
        f.delegated_submission?.status === 'pending'
    )
  }, [effectiveFixtures])
  const actionRequiredCount = actionRequiredFixtures.length

  const teamsList = useMemo(() => {
    const map = new Map()
    ;(effectiveFixtures || []).forEach((f) => {
      const h = f.home_team || f.homeTeam
      const a = f.away_team || f.awayTeam
      const hName = h?.name || h?.team_name
      const aName = a?.name || a?.team_name
      if (h?.id && hName) map.set(String(h.id), { id: h.id, name: hName })
      if (a?.id && aName) map.set(String(a.id), { id: a.id, name: aName })
    })
    return Array.from(map.values()).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'))
  }, [effectiveFixtures])

  // Active filter count indicator for the "تصفية" button
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (teamFilter !== 'all') count++
    if (dayFilter !== 'all') count++
    if (viewMode === 'rounds') count++
    if (viewMode === 'action_required') count++
    if (activeWeekId === 'all') count++
    return count
  }, [teamFilter, dayFilter, viewMode, activeWeekId])

  // Filtered fixtures logic
  const filteredFixtures = useMemo(() => {
    let list = effectiveFixtures || []

    if (viewMode === 'action_required') {
      list = actionRequiredFixtures
    } else if (viewMode === 'rounds') {
      if (matchdayFilter !== 'all') {
        list = list.filter((f) => String(f.matchday) === String(matchdayFilter))
      }
    } else {
      // chronological mode
      if (activeWeekId === 'unscheduled') {
        list = leagueUnscheduled
      } else if (activeWeekId && activeWeekId !== 'all') {
        const found = leagueWeeks.find((w) => w.id === activeWeekId)
        list = found ? found.fixtures : []
      } else {
        // activeWeekId === 'all': all fixtures
        list = effectiveFixtures || []
      }
    }

    // Status filter
    if (statusFilter !== 'all') {
      list = list.filter((f) => {
        const isScheduled = Boolean(f.scheduled_at) && f.status !== 'waiting_for_booking'
        const isPlayed = f.status === 'played' || f.match?.status === 'finished'
        const isWaitingOrException =
          !f.scheduled_at ||
          f.status === 'waiting_for_booking' ||
          f.status === 'postponed' ||
          f.status === 'rescheduling_required' ||
          Boolean(f.unscheduled_reason)

        if (statusFilter === 'scheduled') return isScheduled && !isPlayed
        if (statusFilter === 'played') return isPlayed
        if (statusFilter === 'waiting') return isWaitingOrException && !isPlayed
        return true
      })
    }

    // Universal Team Filter
    if (teamFilter !== 'all') {
      const targetTeamId = String(teamFilter)
      list = list.filter((f) => {
        const hId = String(f.home_team_id ?? f.home_team?.id ?? f.homeTeam?.id ?? '')
        const aId = String(f.away_team_id ?? f.away_team?.id ?? f.awayTeam?.id ?? '')
        return hId === targetTeamId || aId === targetTeamId
      })
    }

    // Universal Day Filter
    if (dayFilter !== 'all') {
      const targetDay = String(dayFilter)
      list = list.filter((f) => {
        if (!f.scheduled_at) return false
        const datePart = String(f.scheduled_at).split(' ')[0].split('T')[0]
        const d = new Date(datePart + 'T12:00:00')
        return String(d.getDay()) === targetDay
      })
    }

    return list
  }, [effectiveFixtures, viewMode, activeWeekId, leagueWeeks, leagueUnscheduled, matchdayFilter, statusFilter, teamFilter, dayFilter, actionRequiredFixtures])

  const dayGroups = useMemo(() => {
    return groupFixturesByDay(filteredFixtures, 'ar')
  }, [filteredFixtures])

  const matchdays = Array.from(new Set((effectiveFixtures || []).map((f) => f.matchday).filter(Boolean))).sort((a, b) => a - b)

  const currentWeekIndex = leagueWeeks.findIndex((w) => w.id === activeWeekId)
  const hasUpcomingWeek = currentWeekIndex !== -1 && currentWeekIndex < leagueWeeks.length - 1

  const handleResetFilters = () => {
    setTeamFilter('all')
    setDayFilter('all')
    setStatusFilter('scheduled')
    setMatchdayFilter('all')
    setViewMode('chronological')
    setActiveWeekId(defaultWeekId)
  }

  const handleNextWeekAction = () => {
    if (hasUpcomingWeek) {
      setActiveWeekId(leagueWeeks[currentWeekIndex + 1].id)
      setStatusFilter('scheduled')
      setTeamFilter('all')
      setDayFilter('all')
    }
  }

  return (
    <div className="space-y-4">
      {/* 1. Header & Navigation: Compact League Matches Header */}
      <div className="rounded-2xl border border-[#D7E0EA] bg-white p-3.5 sm:p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3">
          {/* Right side (RTL): Title & Tournament Name & Summary */}
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-black text-[#102A43] leading-tight">المباريات</h1>
            <p className="text-xs font-semibold text-[#52657A] truncate mt-0.5" title={tournament.name}>
              {tournament.name}
            </p>
            {/* Single Summary Line */}
            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
              {actionRequiredCount === 0 ? (
                <span className="text-xs font-semibold text-[#52657A]">
                  {totalFixtures} مباراة · لا شيء يحتاج إجراء ✓
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setViewMode(viewMode === 'action_required' ? 'chronological' : 'action_required')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 text-xs font-bold text-amber-900 transition active:scale-95"
                  title="عرض المباريات التي تحتاج إجراء"
                >
                  <span>{totalFixtures} مباراة</span>
                  <span>·</span>
                  <span className="font-black text-rose-600">{actionRequiredCount} تحتاج إجراء ⚠️</span>
                </button>
              )}
            </div>
          </div>

          {/* Left side (RTL): Actions: تصفية & أدوات الجدولة */}
          <div className="flex items-center gap-2 shrink-0">
            {/* 1. تصفية (Filter) Button with Active Badge */}
            <button
              type="button"
              onClick={() => setFilterSheetOpen(true)}
              aria-label="تصفية المباريات"
              className="relative flex h-11 items-center gap-1.5 rounded-xl border border-[#D7E0EA] bg-[#F3F6FA] hover:bg-slate-200 px-3 text-xs font-black text-[#102A43] transition active:scale-95"
            >
              <Filter className="size-4 text-[#52657A]" />
              <span className="hidden sm:inline">تصفية</span>
              {activeFiltersCount > 0 && (
                <span className="flex size-5 items-center justify-center rounded-full bg-[#00C853] text-[10px] font-black text-white shadow-2xs">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* 2. أدوات الجدولة (Scheduling Tools) Button */}
            <button
              type="button"
              onClick={() => setSchedulingToolsOpen(true)}
              aria-label="أدوات الجدولة"
              className="flex h-11 items-center gap-1.5 rounded-xl bg-[#102A43] hover:bg-[#1a3a5a] px-3.5 text-xs font-black text-white shadow-xs transition active:scale-95"
            >
              <Sparkles className="size-4 text-[#00C853]" />
              <span>أدوات الجدولة</span>
            </button>
          </div>
        </div>
      </div>

      {/* Subtab Back Banner (if viewing suggestions or slot pool) */}
      {activeSubTab !== 'fixtures' && (
        <div className="flex items-center justify-between rounded-2xl bg-slate-900 text-white p-3.5 shadow-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-[#00C853]" />
            <div>
              <p className="text-xs font-black">
                {activeSubTab === 'suggestions' ? 'اقتراحات الربط مع الحجوزات' : 'المواعيد الشاغرة والبديلة (Slot Pool)'}
              </p>
              <p className="text-[11px] text-slate-300">
                {activeSubTab === 'suggestions'
                  ? 'مراجعة وتثبيت حجوزات الفرق المستوفية للشروط'
                  : `${capacityData?.available_slots ?? 0} فترة متاحة لجدولة المباريات المعلقة`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveSubTab('fixtures')}
            className="flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-bold text-white transition active:scale-95"
          >
            <span>العودة للمباريات</span>
            <ChevronLeft className="size-4 rtl:rotate-0" />
          </button>
        </div>
      )}

      {/* Initial Setup if zero fixtures created yet */}
      {totalFixtures === 0 && !fixturesLoading && (
        <div className="rounded-3xl border border-green-200 bg-gradient-to-br from-green-50/90 via-white to-emerald-50/50 p-6 text-center shadow-sm">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-green-600 text-white shadow-md">
            <Sparkles className="size-7" />
          </div>
          <h3 className="mt-4 text-lg font-black text-slate-900">إنشاء جدول مباريات الدوري</h3>
          <p className="mx-auto mt-2 max-w-lg text-xs leading-relaxed text-slate-600">
            سيقوم النظام بإنشاء جميع المواجهات تلقائياً بين الفرق المسجلة، مع إمكانية تحديد الملاعب والمواعيد لاحقاً أو اعتماد حجوزات الفرق المضيفة.
          </p>
          <div className="mt-5 flex justify-center">
            <Button
              className="bg-green-600 px-6 py-2.5 text-sm font-bold text-white shadow hover:bg-green-700"
              onClick={() => handleGenerate(false)}
              disabled={genBusy}
            >
              {genBusy ? <Loader2 className="me-2 size-4 animate-spin" /> : <Play className="me-2 size-4" />}
              إنشاء المواجهات الآن
            </Button>
          </div>
        </div>
      )}

      {/* VIEW 1: FIXTURES (Standard League View) */}
      {activeSubTab === 'fixtures' && totalFixtures > 0 && (
        <div className="space-y-3.5">
          {/* If Round View Mode is selected via filter sheet, show Round Selector chips */}
          {viewMode === 'rounds' && matchdays.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setMatchdayFilter('all')}
                className={`h-11 rounded-full px-4 text-xs font-black transition-all ${
                  matchdayFilter === 'all'
                    ? 'bg-[#102A43] text-white shadow-xs'
                    : 'bg-[#F3F6FA] text-[#52657A] border border-[#D7E0EA] hover:bg-slate-200'
                }`}
              >
                كل الجولات
              </button>
              {matchdays.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMatchdayFilter(String(m))}
                  className={`h-11 rounded-full px-4 text-xs font-black transition-all ${
                    String(matchdayFilter) === String(m)
                      ? 'bg-[#1769FF] text-white shadow-xs'
                      : 'bg-[#F3F6FA] text-[#52657A] border border-[#D7E0EA] hover:bg-slate-200'
                  }`}
                >
                  الجولة {m}
                </button>
              ))}
            </div>
          )}

          {/* 2. Week Stepper: Single Week Control Component */}
          {viewMode === 'chronological' && leagueWeeks.length > 0 && (
            <LeagueWeekSelector
              weeks={leagueWeeks}
              activeWeekId={activeWeekId}
              onChangeWeek={setActiveWeekId}
              unscheduledCount={leagueUnscheduled.length}
              totalCount={totalFixtures}
              onOpenFilterSheet={() => setFilterSheetOpen(true)}
            />
          )}

          {/* 3. Match Status Chips: One Horizontally Scrollable Row */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {[
              { id: 'scheduled', label: 'القادمة' },
              { id: 'played', label: 'المنتهية' },
              { id: 'waiting', label: 'المؤجلة' },
              { id: 'all', label: 'الكل' },
            ].map((chip) => {
              const active = statusFilter === chip.id
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setStatusFilter(chip.id)}
                  className={`flex h-11 shrink-0 items-center justify-center rounded-full px-5 text-xs font-black transition-all active:scale-95 ${
                    active
                      ? 'bg-[#00C853] text-white shadow-xs'
                      : 'bg-[#F3F6FA] text-[#52657A] border border-[#D7E0EA] hover:bg-slate-200 hover:text-[#102A43]'
                  }`}
                >
                  {chip.label}
                </button>
              )
            })}
          </div>

          {/* 4. Day-Grouped Match List */}
          {fixturesLoading ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Loader2 className="size-8 animate-spin text-[#00C853] mb-2" />
              <p className="text-xs font-bold text-[#52657A]">جاري تحميل جدول المباريات...</p>
            </div>
          ) : filteredFixtures.length === 0 ? (
            /* Useful Empty State */
            <div className="rounded-3xl border border-dashed border-[#D7E0EA] bg-white p-8 text-center space-y-3">
              <Calendar className="mx-auto size-10 text-slate-300" />
              <h4 className="text-sm font-black text-[#102A43]">لا توجد مباريات مطابقة للفلتر المحدد</h4>
              <p className="text-xs text-[#52657A] max-w-sm mx-auto leading-relaxed">
                جرب تعديل الفلتر أو إزالته لعرض المباريات.
              </p>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="flex h-11 items-center justify-center gap-1.5 rounded-xl bg-[#102A43] hover:bg-[#1a3a5a] px-4 text-xs font-bold text-white shadow-2xs transition active:scale-95"
                >
                  <RotateCcw className="size-3.5" />
                  <span>إزالة الفلاتر</span>
                </button>
                {hasUpcomingWeek && (
                  <button
                    type="button"
                    onClick={handleNextWeekAction}
                    className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[#D7E0EA] bg-[#F3F6FA] hover:bg-slate-200 px-4 text-xs font-bold text-[#102A43] transition active:scale-95"
                  >
                    <span>عرض الأسبوع القادم</span>
                    <ChevronLeft className="size-4 rtl:rotate-0" />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {dayGroups.map((dayGroup) => {
                const dayConfig = dayGroup.dayConfig
                return (
                  <div key={dayGroup.dayKey} className="space-y-2.5">
                    {dayGroup.headerLabel && (
                      <div
                        className={`flex items-center justify-between rounded-2xl px-4 py-2.5 text-white shadow-xs ${dayConfig?.headerBg || 'bg-[#102A43]'}`}
                        style={{ backgroundColor: dayConfig?.primary }}
                      >
                        {/* Right side in RTL: Calendar icon + Date */}
                        <div className="flex items-center gap-2.5 min-w-0">
                          <CalendarDays className="size-5 shrink-0 text-white" />
                          <h3 className="text-xs sm:text-base font-black text-white truncate leading-tight">
                            {dayGroup.headerLabel}
                          </h3>
                        </div>

                        {/* Left side in RTL: Match count pill */}
                        <span
                          className="shrink-0 rounded-xl px-3 py-1 text-xs font-black text-white shadow-2xs"
                          style={{ backgroundColor: dayConfig?.headerPillBg || 'rgba(0,0,0,0.22)' }}
                        >
                          {dayGroup.matches.length} {dayGroup.matches.length === 1 ? 'مباراة' : 'مباريات'}
                        </span>
                      </div>
                    )}

                    <div className="space-y-2.5">
                      {dayGroup.matches.map((fixture) => (
                        <LeagueMatchCard
                          key={fixture.id}
                          fixture={fixture}
                          dayConfig={dayConfig}
                          onManageMatch={(f) => setManagingFixture(f)}
                          onResult={onResult}
                          onDetails={onDetails}
                          onDelegatedLink={(f) => setDelegateFixture(f)}
                          onPostpone={(f) => {
                            setPostponeFixture(f)
                            setPostponeReason('team_circumstances')
                            setFreedAction('freed')
                            setPostponeNote('')
                          }}
                          onRescheduleSuggestion={(f) => openRescheduleSuggestions(f)}
                          onMoveToOwnSlot={(f) => handleOpenMoveToOwnSlot(f)}
                          onRefresh={onRefresh}
                        />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: SUGGESTIONS */}
      {activeSubTab === 'suggestions' && totalFixtures > 0 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
            <h4 className="flex items-center gap-2 text-xs font-bold text-blue-900">
              <ShieldCheck className="size-4 text-blue-600" />
              محرك مطابقة الحجوزات
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
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-700">
                          الجولة {sug.fixture.matchday}
                        </span>
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-green-700">
                          <CheckCircle2 className="size-3.5" />
                          اقتراح موثق ومستوفٍ للشروط
                        </span>
                      </div>

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

      {/* VIEW 3: UNUSED SLOT POOL */}
      {activeSubTab === 'slot_pool' && (
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                <Sparkles className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">مجموعة المواعيد المحررة والبديلة للبطولة</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  مواعيد محررة تلبي قواعد الراحة وصلاحية الملاعب، مخصصة لجدولة المباريات المعلقة أو المؤجلة بنقرة واحدة.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs font-bold text-slate-600">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-emerald-800">
                <CheckCircle2 className="size-3.5 text-emerald-600" />
                المواعيد المؤكدة المتاحة: {defaultPool.length}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-1.5 text-amber-800">
                <AlertTriangle className="size-3.5 text-amber-600" />
                مواعيد لفرق لم تنه مبارياتها: {secondaryPool.length}
              </span>
            </div>
          </div>

          {/* Section 1: Default Pool */}
          <div className="space-y-3">
            <h4 className="text-xs font-black text-slate-700 flex items-center gap-1.5">
              <span>المواعيد الجاهزة للاستعمال فوراً</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                {defaultPool.length}
              </span>
            </h4>

            {slotPoolLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2">
                <Loader2 className="size-7 animate-spin text-emerald-600" />
                <p className="text-xs font-bold text-slate-400">جاري فحص مجموعة المواعيد وصلاحيتها...</p>
              </div>
            ) : defaultPool.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center space-y-2">
                <CalendarCheck className="mx-auto size-9 text-slate-300" />
                <h4 className="text-sm font-black text-slate-700">لا توجد مواعيد شاغرة حالياً في المجموعة الأساسية</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                  تظهر هنا المواعيد بعد انتهاء مباريات أي فريق أو عند إتاحة المواعيد للبطولة أو بعد تأجيل المباريات.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {defaultPool.map((slot) => (
                  <div
                    key={slot.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-emerald-300 transition-all space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-lg bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-800">
                          {slot.day_name} • {slot.date}
                        </span>
                        <span className="flex items-center gap-1 text-xs font-bold text-slate-600">
                          <Clock className="size-3 text-slate-400" />
                          {slot.time}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                          <MapPin className="size-3.5 text-slate-400 shrink-0" />
                          <span>{slot.stadium?.name}</span>
                        </div>
                        <span className="text-[11px] font-bold text-slate-500">
                          يخص: <strong className="text-slate-800">{slot.owner_team_name}</strong>
                        </span>
                      </div>

                      {slot.source_label && (
                        <div className="pt-0.5">
                          <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black ${
                            slot.pool_tag === 'postpone_freed'
                              ? 'bg-amber-100 text-amber-900 border border-amber-200'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            <Sparkles className="size-2.5 text-amber-600" />
                            <span>{slot.source_label}</span>
                          </span>
                        </div>
                      )}

                      {/* Eligible matches */}
                      {slot.eligible_fixtures && slot.eligible_fixtures.length > 0 ? (
                        <div className="mt-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-2.5 space-y-2">
                          <div className="flex items-center justify-between text-xs font-black text-emerald-950">
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="size-3.5 text-emerald-600" />
                              <span>المواجهات المتاحة ({slot.eligible_fixtures.length}):</span>
                            </div>
                            <span className="text-[10px] text-emerald-700 font-bold">جاهزة للبرمجة المباشرة ✅</span>
                          </div>

                          <div className="space-y-1.5 max-h-48 overflow-y-auto pe-0.5">
                            {slot.eligible_fixtures.map((ef) => (
                              <div
                                key={ef.id}
                                className="flex items-center justify-between gap-2 rounded-xl bg-white p-2 border border-emerald-100 shadow-2xs"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 flex-wrap">
                                    <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-black text-slate-600 shrink-0">
                                      جولة {ef.matchday}
                                    </span>
                                    <span className="truncate">{ef.home_team?.name} ضد {ef.away_team?.name}</span>
                                    {ef.has_rest_warning && (
                                      <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-black text-amber-800 shrink-0" title="تعارض مع فترة الراحة ولكن يمكن فرضه">
                                        ⚠️ راحة
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <Button
                                  size="sm"
                                  className="shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold h-7 px-2.5 shadow-2xs"
                                  onClick={() => handleDirectAssignSlotToFixture(ef, slot)}
                                >
                                  <Zap className="size-3 me-1" />
                                  برمجة
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-2 rounded-xl bg-slate-50 border border-slate-200/60 p-2 text-center text-[11px] font-semibold text-slate-500">
                          لا توجد مباريات معلقة حالياً تتطابق مع شروط هذا الموعد
                        </div>
                      )}

                      {/* Advancement Candidates (تقديم المباريات لتسريع البطولة) */}
                      {slot.advancement_candidates && slot.advancement_candidates.length > 0 && (
                        <div className="mt-2.5 rounded-xl border border-sky-200/90 bg-sky-50/50 p-2.5 space-y-2">
                          <div className="flex items-center justify-between text-xs font-black text-sky-950">
                            <div className="flex items-center gap-1.5">
                              <Sparkles className="size-3.5 text-sky-600" />
                              <span>مباريات مؤهلة للتقديم ({slot.advancement_candidates.length}):</span>
                            </div>
                            <span className="text-[10px] text-sky-700 font-bold">تسريع البطولة ⚡</span>
                          </div>

                          <div className="space-y-1.5 max-h-48 overflow-y-auto pe-0.5">
                            {slot.advancement_candidates.map((cand) => (
                              <div
                                key={cand.id}
                                className="flex items-center justify-between gap-2 rounded-xl bg-white p-2 border border-sky-100 shadow-2xs"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 flex-wrap">
                                    <span className="rounded bg-sky-100 text-sky-900 px-1.5 py-0.2 text-[10px] font-black shrink-0">
                                      جولة {cand.matchday}
                                    </span>
                                    <span className="truncate">{cand.home_team?.name} ضد {cand.away_team?.name}</span>
                                    {cand.days_saved > 0 && (
                                      <span className="rounded bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[10px] font-black shrink-0">
                                        وفر {cand.days_saved} يوم
                                      </span>
                                    )}
                                    {cand.has_rest_warning && (
                                      <span className="rounded bg-amber-100 px-1 py-0.2 text-[9px] font-black text-amber-800 shrink-0" title={cand.rest_warning_message}>
                                        ⚠️ راحة
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    الموعد الحالي: {cand.current_date} • {cand.current_time}
                                  </div>
                                </div>

                                <Button
                                  size="sm"
                                  className="shrink-0 bg-sky-600 hover:bg-sky-700 text-white text-[11px] font-bold h-7 px-2.5 shadow-2xs"
                                  onClick={() => {
                                    setAdvanceCandidateModal({ fixture: cand, slot })
                                    setOverrideRest(Boolean(cand.has_rest_warning))
                                  }}
                                >
                                  <Sparkles className="size-3 me-1" />
                                  تقديم
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2.5">
                      {slot.pool_tag === 'released' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs text-slate-600 hover:bg-slate-100"
                          onClick={() => handleReclaimOccurrence(slot.booking_id)}
                        >
                          استرجاع الموعد
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs font-bold px-3.5 border-slate-200 text-slate-700 hover:bg-slate-50"
                        onClick={() => setSlotPoolFixturePicker(slot)}
                      >
                        اختيار مواجهة أخرى
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* BOTTOM SHEET 1: FILTER BOTTOM SHEET (تصفية)                   */}
      {/* ============================================================== */}
      {filterSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setFilterSheetOpen(false)}
          />

          <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Sheet Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Filter className="size-5 text-[#00C853]" />
                <h3 className="text-base font-black text-[#102A43]">تصفية المباريات</h3>
              </div>
              <button
                type="button"
                onClick={() => setFilterSheetOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Filter Controls */}
            <div className="space-y-4 pt-1">
              {/* 1. View Mode (الترتيب الزمني / حسب الجولات / تحتاج لإجراء) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-[#102A43]">طريقة العرض</label>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200/60">
                  <button
                    type="button"
                    onClick={() => setViewMode('chronological')}
                    className={`h-10 rounded-xl text-xs font-black transition ${
                      viewMode === 'chronological' ? 'bg-white text-[#102A43] shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    الترتيب الزمني
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('rounds')}
                    className={`h-10 rounded-xl text-xs font-black transition ${
                      viewMode === 'rounds' ? 'bg-white text-[#102A43] shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    حسب الجولات
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('action_required')}
                    className={`h-10 rounded-xl text-xs font-black transition ${
                      viewMode === 'action_required' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    تحتاج إجراء
                  </button>
                </div>
              </div>

              {/* 2. Week Select */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-[#102A43]">الأسبوع</label>
                <div className="relative">
                  <select
                    value={activeWeekId || 'all'}
                    onChange={(e) => setActiveWeekId(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-[#D7E0EA] bg-[#F3F6FA] py-2.5 pe-8 ps-3 text-xs font-bold text-[#102A43] focus:border-[#00C853] focus:outline-none"
                  >
                    <option value="all">كل الأسابيع ({totalFixtures} مباراة)</option>
                    {leagueWeeks.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.label} ({w.count} مباريات)
                      </option>
                    ))}
                    {leagueUnscheduled.length > 0 && (
                      <option value="unscheduled">غير محددة الموعد ({leagueUnscheduled.length})</option>
                    )}
                  </select>
                  <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* 3. Team Select */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-[#102A43]">الفريق</label>
                <div className="relative">
                  <select
                    value={teamFilter}
                    onChange={(e) => setTeamFilter(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-[#D7E0EA] bg-[#F3F6FA] py-2.5 pe-8 ps-3 text-xs font-bold text-[#102A43] focus:border-[#00C853] focus:outline-none"
                  >
                    <option value="all">كل الفرق ({teamsList.length})</option>
                    {teamsList.map((tm) => (
                      <option key={tm.id} value={tm.id}>
                        {tm.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* 4. Day Select */}
              <div className="space-y-1.5">
                <label className="block text-xs font-black text-[#102A43]">اليوم</label>
                <div className="relative">
                  <select
                    value={dayFilter}
                    onChange={(e) => setDayFilter(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-[#D7E0EA] bg-[#F3F6FA] py-2.5 pe-8 ps-3 text-xs font-bold text-[#102A43] focus:border-[#00C853] focus:outline-none"
                  >
                    <option value="all">كل الأيام</option>
                    <option value="5">الجمعة</option>
                    <option value="6">السبت</option>
                    <option value="0">الأحد</option>
                    <option value="1">الإثنين</option>
                    <option value="2">الثلاثاء</option>
                    <option value="3">الأربعاء</option>
                    <option value="4">الخميس</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Bottom Actions: تطبيق و إعادة الضبط */}
            <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={handleResetFilters}
                className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-[#D7E0EA] bg-white px-4 text-xs font-bold text-[#52657A] hover:bg-slate-50 transition active:scale-95"
              >
                <RotateCcw className="size-3.5" />
                <span>إعادة الضبط</span>
              </button>

              <button
                type="button"
                onClick={() => setFilterSheetOpen(false)}
                className="flex-1 flex h-11 items-center justify-center rounded-xl bg-[#00C853] hover:bg-[#008F46] px-5 text-xs font-black text-white shadow-xs transition active:scale-95"
              >
                تطبيق الفلاتر
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* BOTTOM SHEET 2: SCHEDULING TOOLS (أدوات الجدولة)               */}
      {/* ============================================================== */}
      {schedulingToolsOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setSchedulingToolsOpen(false)}
          />

          <div className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-white p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Sheet Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-[#00C853]" />
                <div>
                  <h3 className="text-base font-black text-[#102A43]">أدوات الجدولة</h3>
                  <p className="text-[11px] font-semibold text-[#52657A]">
                    خيارات التنظيم والبرمجة التلقائية لمباريات الدوري
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSchedulingToolsOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Clean Action List */}
            <div className="space-y-2 pt-1">
              {/* Tool 1: الجدولة التلقائية */}
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3.5 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                      <Zap className="size-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs sm:text-sm font-black text-[#102A43]">الجدولة التلقائية</p>
                        <button
                          type="button"
                          onClick={() => setEngineInfoOpen(!engineInfoOpen)}
                          className="text-slate-400 hover:text-slate-600"
                          title="شرح عمل المحرك"
                        >
                          <Info className="size-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] text-[#52657A]">
                        مطابقة المواجهات مع فترات الملاعب وتطبيق فترات الراحة
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={openAutoScheduleConfirm}
                    disabled={autoScheduleBusy || waitingFixtures.length === 0}
                    className="flex h-10 items-center justify-center rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 text-xs font-bold text-white shadow-2xs transition active:scale-95 disabled:opacity-50"
                  >
                    {autoScheduleBusy ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <span>بدء ({waitingFixtures.length})</span>
                    )}
                  </button>
                </div>

                {/* Engine Info Accordion */}
                {engineInfoOpen && (
                  <div className="rounded-xl bg-white p-3 border border-emerald-200/80 text-[11px] text-slate-700 leading-relaxed space-y-1">
                    <p className="font-bold text-emerald-800">قواعد محرك الجدولة التلقائية:</p>
                    <p>• مطابقة المواجهات مع فترات الملاعب المتاحة داخل نطاق الدوري.</p>
                    <p>• اعتماد الفريق صاحب الحجز كمستضيف للمواجهة.</p>
                    <p>• تطبيق فترة الراحة الإلزامية ({tournament.rest_days_minimum ?? 1} يوم على الأقل بين مباريات كل فريق).</p>
                    <p>• استثمار الفترات المستعارة عند راحة الفريق المالك بعد موافقته.</p>
                  </div>
                )}
              </div>

              {/* Tool 2: اقتراحات الربط مع الحجوزات */}
              <button
                type="button"
                onClick={() => {
                  setSchedulingToolsOpen(false)
                  setActiveSubTab('suggestions')
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-[#D7E0EA] hover:bg-[#F3F6FA] text-start transition active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs sm:text-sm font-black text-[#102A43]">اقتراحات الربط مع الحجوزات</p>
                      {validSuggestions.length > 0 && (
                        <span className="flex size-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-black text-slate-900">
                          {validSuggestions.length}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#52657A]">مراجعة وتثبيت حجوزات الفرق الجاهزة للاعتماد</p>
                  </div>
                </div>
                <ChevronLeft className="size-4 text-slate-400 rtl:rotate-0" />
              </button>

              {/* Tool 3: المواعيد المتاحة للحجز (Single Place for Slot Count e.g. 91) */}
              <button
                type="button"
                onClick={() => {
                  setSchedulingToolsOpen(false)
                  setActiveSubTab('slot_pool')
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-[#D7E0EA] hover:bg-[#F3F6FA] text-start transition active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#1769FF]">
                    <Clock className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs sm:text-sm font-black text-[#102A43]">المواعيد المتاحة للحجز</p>
                      <span className="rounded-lg bg-blue-100 px-2 py-0.5 text-[10px] font-black text-blue-800">
                        {capacityData?.available_slots ?? 0} فترة متاحة
                      </span>
                    </div>
                    <p className="text-[11px] text-[#52657A]">فحص مجموعة المواعيد الشاغرة والبديلة للبطولة</p>
                  </div>
                </div>
                <ChevronLeft className="size-4 text-slate-400 rtl:rotate-0" />
              </button>

              {/* Tool 4: جدول الجولات والبطاقات */}
              <button
                type="button"
                onClick={() => {
                  setSchedulingToolsOpen(false)
                  setViewMode('rounds')
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-[#D7E0EA] hover:bg-[#F3F6FA] text-start transition active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                    <Layers className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-black text-[#102A43]">جدول الجولات والبطاقات</p>
                    <p className="text-[11px] text-[#52657A]">استعراض المباريات مقسمة وفقاً للجولات المقررة</p>
                  </div>
                </div>
                <ChevronLeft className="size-4 text-slate-400 rtl:rotate-0" />
              </button>

              {/* Tool 5: تحديث البيانات */}
              <button
                type="button"
                onClick={() => {
                  refetchAllFixtures()
                  refetchSuggestions()
                  refetchCapacity()
                  refetchSlotPool()
                  if (onRefresh) onRefresh()
                  toast.success('تم تحديث بيانات المباريات والحجوزات بنجاح')
                  setSchedulingToolsOpen(false)
                }}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-[#D7E0EA] hover:bg-[#F3F6FA] text-start transition active:scale-98"
              >
                <div className="flex items-center gap-3">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <RotateCcw className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-black text-[#102A43]">تحديث البيانات</p>
                    <p className="text-[11px] text-[#52657A]">إعادة مزامنة الحجوزات والمباريات مع الخادم</p>
                  </div>
                </div>
                <ChevronLeft className="size-4 text-slate-400 rtl:rotate-0" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ALL PRESERVED MODALS & OPERATIONS                              */}
      {/* ============================================================== */}

      {/* Auto-Schedule Confirmation Modal */}
      {confirmModalData && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
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

            <div className="space-y-3 text-xs leading-relaxed text-slate-600">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 space-y-2">
                <div className="flex justify-between font-bold text-slate-700">
                  <span>المواجهات بانتظار البرمجة:</span>
                  <span className="text-amber-800 font-black">{confirmModalData.unscheduledCount} مواجهة</span>
                </div>
                <div className="flex justify-between font-bold text-slate-700">
                  <span>فترات الحجز المتاحة:</span>
                  <span className="text-emerald-700 font-black">{confirmModalData.availableSlots} فترة</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-black text-slate-700">اليوم الأول للدوري:</label>
                <input
                  type="date"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                  value={firstMatchDay}
                  min={new Date().toISOString().split('T')[0]}
                  max={tournament.end_date || undefined}
                  onChange={handleFirstDayChange}
                />
              </div>

              {!confirmModalData.hasExactSlot && confirmModalData.firstAvailDate && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-2.5 text-blue-900 font-semibold text-[11px] flex items-start gap-1.5">
                  <Clock className="size-4 shrink-0 text-blue-600 mt-0.5" />
                  <span>
                    لا تتوفر فترات حجز في اليوم المختار مباشرة؛ ستبدأ أول مباراة من: {confirmModalData.firstAvailDate} ({confirmModalData.firstAvailTime}).
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <Button variant="outline" className="text-xs" onClick={() => setConfirmModalData(null)}>
                إلغاء
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4"
                disabled={autoScheduleBusy || Boolean(firstDayError)}
                onClick={() => executeAutoSchedule(false)}
              >
                {autoScheduleBusy ? <Loader2 className="me-1.5 size-3.5 animate-spin" /> : null}
                تأكيد وبدء البرمجة
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Backend Confirmation Modal (if existing schedules will be overwritten) */}
      {regenConfirmData && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setRegenConfirmData(null)}
          />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-600 border-b border-slate-100 pb-3">
              <AlertTriangle className="size-5 shrink-0" />
              <h3 className="text-sm font-black text-slate-900">تأكيد إعادة البرمجة</h3>
            </div>
            <p className="text-xs leading-relaxed text-slate-600">
              {regenConfirmData.message || 'توجد مباريات مجدولة مسبقاً، هل ترغب في إعادة برمجتها بالكامل؟'}
            </p>
            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <Button variant="outline" className="text-xs" onClick={() => setRegenConfirmData(null)}>
                إلغاء
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4"
                disabled={autoScheduleBusy}
                onClick={() => executeAutoSchedule(true)}
              >
                {autoScheduleBusy ? <Loader2 className="me-1.5 size-3.5 animate-spin" /> : null}
                متابعة وإعادة البرمجة
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Opponent Swap Modal Dialog */}
      {opponentSwapFixture && (() => {
        const eligibleList = eligibleOpponents.filter((t) => t.is_eligible)
        const ineligibleList = eligibleOpponents.filter((t) => !t.is_eligible)
        const selectedTeamData = eligibleList.find((t) => String(t.team_id) === String(selectedNewOpponentId))

        return (
          <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
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
                      </>
                    )}
                  </select>

                  {selectedTeamData && (
                    <div className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs space-y-1.5">
                      <div className="flex items-center gap-1.5 font-black text-emerald-800">
                        <CheckCircle2 className="size-4 text-emerald-600" />
                        <span>معاينة نتيجة تبادل المواجهتين بين الجولتين:</span>
                      </div>
                      <div className="space-y-1 text-slate-700 ps-5 font-medium text-[11px] leading-relaxed">
                        <p>
                          • <span className="text-slate-900 font-bold">هذه المباراة:</span> ستصبح بين{' '}
                          <span className="font-bold text-slate-900">{opponentSwapFixture.home_team?.name}</span> و{' '}
                          <span className="font-bold text-emerald-700">{selectedTeamData.team_name}</span>.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <Button variant="outline" className="text-xs" onClick={() => setOpponentSwapFixture(null)}>
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

      {/* Unified Match Management Modal */}
      {managingFixture && (
        <MatchManagementModal
          tournament={tournament}
          fixture={managingFixture}
          onClose={() => setManagingFixture(null)}
          onSuccess={() => {
            refetchAllFixtures()
            refetchSuggestions()
            refetchCapacity()
            if (onRefresh) onRefresh()
          }}
          onOpenManualReschedule={(f) => {
            if (onReschedule) onReschedule(f)
          }}
        />
      )}

      {/* Delegated Match Link Modal */}
      {delegateFixture && (
        <DelegatedMatchLinkModal
          isOpen={Boolean(delegateFixture)}
          onClose={() => setDelegateFixture(null)}
          tournamentId={tournament.id}
          fixture={delegateFixture}
          onTokenRegenerated={() => {
            refetchAllFixtures()
            if (onRefresh) onRefresh()
          }}
          onTokenRevoked={() => {
            refetchAllFixtures()
            if (onRefresh) onRefresh()
          }}
        />
      )}

      {/* Delegated Submission Review Modal */}
      {reviewSubmissionFixture && (
        <DelegatedSubmissionReviewModal
          isOpen={Boolean(reviewSubmissionFixture)}
          onClose={() => setReviewSubmissionFixture(null)}
          tournamentId={tournament.id}
          fixture={reviewSubmissionFixture}
          onSuccess={() => {
            setReviewSubmissionFixture(null)
            refetchAllFixtures()
            if (onRefresh) onRefresh()
          }}
        />
      )}

      {/* Postpone Fixture Modal */}
      {postponeFixture && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setPostponeFixture(null)}
          />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-amber-600" />
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

            <div className="space-y-3 text-xs">
              <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3 font-bold text-slate-800">
                {postponeFixture.home_team?.name} ضد {postponeFixture.away_team?.name}
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">سبب التأجيل:</label>
                <select
                  value={postponeReason}
                  onChange={(e) => setPostponeReason(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800 focus:border-amber-500 focus:outline-none"
                >
                  <option value="team_circumstances">ظروف طارئة للفرق</option>
                  <option value="rain">أحوال جوية وأمطار</option>
                  <option value="pitch_condition">أعمال صيانة بالملعب</option>
                  <option value="other">أسباب أخرى</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1">ملاحظات إضافية:</label>
                <textarea
                  value={postponeNote}
                  onChange={(e) => setPostponeNote(e.target.value)}
                  placeholder="ملاحظة حول سبب التأجيل (اختياري)..."
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800 focus:border-amber-500 focus:outline-none"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <Button variant="outline" className="text-xs" onClick={() => setPostponeFixture(null)}>
                إلغاء
              </Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4"
                disabled={postponeBusy}
                onClick={handlePostponeSubmit}
              >
                {postponeBusy ? <Loader2 className="me-1.5 size-3.5 animate-spin" /> : null}
                تأكيد التأجيل
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Move to Own Slot Modal */}
      {moveToOwnSlotFixture && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setMoveToOwnSlotFixture(null)}
          />
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-purple-600" />
                <h3 className="text-sm font-black text-slate-900">نقل المباراة إلى موعد حجز أحد الفريقين</h3>
              </div>
              <button
                type="button"
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setMoveToOwnSlotFixture(null)}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3">
              {loadingMoveToOwnSlots ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="size-7 animate-spin text-purple-600" />
                </div>
              ) : moveToOwnSlotsList.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  لا تتوفر مواعيد حجز خاصة بالفريقين مطابقة لشروط الراحة والمواعيد.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {moveToOwnSlotsList.map((slot, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 p-3 hover:border-purple-300 transition"
                    >
                      <div>
                        <p className="text-xs font-black text-slate-900">
                          {slot.date} • {slot.time}
                        </p>
                        <p className="text-[11px] text-slate-500">{slot.stadium_name} (حجز {slot.team_name})</p>
                      </div>
                      <Button
                        size="sm"
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold"
                        onClick={() => handleApplyMoveToOwnSlot(slot)}
                      >
                        اعتماد ونقل
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Advance Match Confirmation Modal */}
      {advanceCandidateModal && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setAdvanceCandidateModal(null)}
          />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-sky-600" />
                <h3 className="text-sm font-black text-slate-900">تقديم موعد المباراة (تسريع البطولة)</h3>
              </div>
              <button
                type="button"
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setAdvanceCandidateModal(null)}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-2xl bg-sky-50 border border-sky-100 p-3.5 space-y-2">
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span className="rounded bg-sky-100 text-sky-900 px-2 py-0.5 text-[11px] font-black">
                    جولة {advanceCandidateModal.fixture.matchday}
                  </span>
                  <span>{advanceCandidateModal.fixture.home_team?.name} ضد {advanceCandidateModal.fixture.away_team?.name}</span>
                </div>
                {advanceCandidateModal.fixture.days_saved > 0 && (
                  <div className="text-emerald-700 font-extrabold flex items-center gap-1">
                    <Zap className="size-3.5 text-emerald-600" />
                    <span>تقليص مدة الدوري بمقدار {advanceCandidateModal.fixture.days_saved} يوم كامل!</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-600">
                <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                  <span className="block text-[10px] text-slate-400 font-bold mb-1">الموعد الحالي السابق:</span>
                  <p className="font-extrabold text-slate-700">{advanceCandidateModal.fixture.current_date}</p>
                  <p className="text-[11px] font-bold text-slate-500">{advanceCandidateModal.fixture.current_time}</p>
                </div>
                <div className="rounded-xl bg-emerald-50/70 p-2.5 border border-emerald-100">
                  <span className="block text-[10px] text-emerald-700 font-bold mb-1">الموعد الجديد المتقدم:</span>
                  <p className="font-extrabold text-emerald-900">{advanceCandidateModal.slot.date}</p>
                  <p className="text-[11px] font-bold text-emerald-700">{advanceCandidateModal.slot.time} • {advanceCandidateModal.slot.stadium?.name}</p>
                </div>
              </div>

              {advanceCandidateModal.fixture.has_rest_warning && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 space-y-2">
                  <div className="flex items-center gap-1.5 text-amber-900 font-black">
                    <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                    <span>تنبيه بشأن فترة الراحة:</span>
                  </div>
                  <p className="text-[11px] text-amber-800 font-medium">
                    {advanceCandidateModal.fixture.rest_warning_message}
                  </p>
                  <label className="flex items-center gap-2 cursor-pointer pt-1">
                    <input
                      type="checkbox"
                      checked={overrideRest}
                      onChange={(e) => setOverrideRest(e.target.checked)}
                      className="size-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                    />
                    <span className="text-xs font-black text-amber-950">
                      موافقة اللجنة المنظمة على تجاوز فترة الراحة لتقديم المباراة
                    </span>
                  </label>
                </div>
              )}

              <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-2 rounded-xl">
                ℹ️ عند تأكيد التقديم، سيتم حجز الموعد المتقدم للمباراة تلقائياً، وتحرير الموعد السابق للمباراة ليعود إلى مجموعة المواعيد الشاغرة للبطولة ليتاح لتقديم مباريات أخرى!
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                size="sm"
                className="text-xs font-bold"
                onClick={() => setAdvanceCandidateModal(null)}
                disabled={advanceBusy}
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-4"
                onClick={handleConfirmAdvance}
                disabled={advanceBusy}
              >
                {advanceBusy ? (
                  <Loader2 className="size-3.5 animate-spin me-1.5" />
                ) : (
                  <Sparkles className="size-3.5 me-1.5" />
                )}
                تأكيد تقديم المباراة
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reschedule Suggestions Modal */}
      {rescheduleFixture && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setRescheduleFixture(null)}
          />
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900">اقتراحات إعادة الجدولة</h3>
              </div>
              <button
                type="button"
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setRescheduleFixture(null)}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3">
              {postponeSuggestionsLoading ? (
                <div className="py-8 flex justify-center">
                  <Loader2 className="size-7 animate-spin text-emerald-600" />
                </div>
              ) : postponeSuggestions.length === 0 ? (
                <p className="text-xs text-slate-500 py-6 text-center">
                  لا توجد اقتراحات مطابقة حالياً لهذه المواجهة.
                </p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {postponeSuggestions.map((sug) => (
                    <div
                      key={sug.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-200 p-3 hover:border-emerald-300 transition"
                    >
                      <div>
                        <p className="text-xs font-black text-slate-900">
                          {sug.date} • {sug.time}
                        </p>
                        <p className="text-[11px] text-slate-500">{sug.stadium_name || sug.stadium?.name || 'الملعب المعتمد'}</p>
                        {sug.has_rest_warning && (
                          <span className="inline-block mt-1 rounded bg-amber-100 text-amber-900 px-1.5 py-0.5 text-[10px] font-bold">
                            ⚠️ {sug.warning_message || 'تنبيه: تعارض مع فترة الراحة المحددة'}
                          </span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                        onClick={() => handleApplySuggestion(sug)}
                        disabled={Boolean(applyingSuggestionId)}
                      >
                        {applyingSuggestionId === sug.id ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          'تثبيت الموعد'
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Assign Dialog */}
      {quickAssignFixture && quickAssignSlot && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => { setQuickAssignFixture(null); setQuickAssignSlot(null); }}
          />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="size-5 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900">تعيين الموعد واختيار المضيف</h3>
              </div>
              <button
                type="button"
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => { setQuickAssignFixture(null); setQuickAssignSlot(null); }}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="rounded-2xl bg-slate-50 p-3 font-bold text-slate-800">
                <p>{quickAssignFixture.home_team?.name} ضد {quickAssignFixture.away_team?.name}</p>
                <p className="text-[11px] text-emerald-700 mt-1 font-semibold">
                  الموعد: {quickAssignSlot.date} ({quickAssignSlot.time}) - {quickAssignSlot.stadium?.name}
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-black text-slate-700 mb-1.5">اختر الفريق المضيف:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedQuickHostId(quickAssignFixture.home_team_id)}
                    className={`rounded-xl border p-2 text-center font-bold text-xs transition ${selectedQuickHostId === quickAssignFixture.home_team_id ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                  >
                    {quickAssignFixture.home_team?.name} (مضيف)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedQuickHostId(quickAssignFixture.away_team_id)}
                    className={`rounded-xl border p-2 text-center font-bold text-xs transition ${selectedQuickHostId === quickAssignFixture.away_team_id ? "border-emerald-600 bg-emerald-50 text-emerald-900 shadow-2xs" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                  >
                    {quickAssignFixture.away_team?.name} (مضيف)
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => { setQuickAssignFixture(null); setQuickAssignSlot(null); }}
              >
                إلغاء
              </Button>
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4"
                disabled={quickAssignBusy}
                onClick={handleConfirmQuickAssign}
              >
                {quickAssignBusy ? <Loader2 className="me-1.5 size-3.5 animate-spin" /> : null}
                تأكيد التعيين
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Slot Pool Fixture Picker Modal */}
      {slotPoolFixturePicker && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
            onClick={() => setSlotPoolFixturePicker(null)}
          />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-emerald-600" />
                <h3 className="text-sm font-black text-slate-900">اختر مباراة لتعيينها على هذا الموعد</h3>
              </div>
              <button
                type="button"
                className="rounded-xl p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                onClick={() => setSlotPoolFixturePicker(null)}
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {(effectiveFixtures || [])
                .filter(f => !f.scheduled_at || f.status === 'waiting_for_booking' || f.status === 'rescheduling_required' || f.status === 'postponed')
                .map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      const chosenSlot = slotPoolFixturePicker;
                      setSlotPoolFixturePicker(null);
                      handleQuickAssignClick(f, chosenSlot);
                    }}
                    className="w-full flex items-center justify-between rounded-2xl border border-slate-200 p-3 hover:border-emerald-400 hover:bg-emerald-50/40 transition text-start text-xs font-bold"
                  >
                    <span>{f.home_team?.name} ضد {f.away_team?.name}</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">اختيار</span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
