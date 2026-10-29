import { useState, useEffect } from 'react'
import {
  CalendarDays,
  ArrowLeftRight,
  RefreshCw,
  Clock,
  MapPin,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  X,
  Loader2,
  Home,
  Users,
  Shield,
  ChevronRight,
  RotateCcw,
  Calendar,
} from 'lucide-react'
import api from '../../../api/client'
import { Button } from '../../../components/dashboard/ui'
import TeamLogo from '../../../components/profile/TeamLogo'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import OverrideWarningModal from './OverrideWarningModal'

export default function MatchManagementModal({
  tournament,
  fixture,
  onClose,
  onSuccess,
  onOpenManualReschedule,
}) {
  const { toast } = useToast()

  // Actions: 'menu' | 'swap_schedule' | 'change_side' | 'swap_roles' | 'host_slot_suggestions'
  const [activeView, setActiveView] = useState('menu')

  // Action 1 State: Swap Schedule
  const [scheduleData, setScheduleData] = useState({ eligible_matches: [], pending_candidates: [] })
  const [loadingSchedule, setLoadingSchedule] = useState(false)
  const [selectedSwapMatchId, setSelectedSwapMatchId] = useState('')
  const [selectedPendingFixtureId, setSelectedPendingFixtureId] = useState('')
  const [scheduleSubTab, setScheduleSubTab] = useState('scheduled') // 'scheduled' | 'pending'
  const [swapScheduleBusy, setSwapScheduleBusy] = useState(false)

  // Action 2 State: Change Side
  const [selectedSide, setSelectedSide] = useState('away') // 'home' | 'away'
  const [eligibleTeams, setEligibleTeams] = useState([])
  const [loadingTeams, setLoadingTeams] = useState(false)
  const [selectedNewTeamId, setSelectedNewTeamId] = useState('')
  const [changeSideBusy, setChangeSideBusy] = useState(false)

  // Host Slot Suggestions State (Follow-up for Action 2 Host Change or Action 3 Role Swap)
  const [pendingFollowUp, setPendingFollowUp] = useState(null)
  const [hostSlots, setHostSlots] = useState([])
  const [loadingHostSlots, setLoadingHostSlots] = useState(false)
  const [applyingSlotId, setApplyingSlotId] = useState(null)

  // Action 3 State: Swap Roles
  const [swapRolesBusy, setSwapRolesBusy] = useState(false)
  const [warningModalData, setWarningModalData] = useState(null)

  // Action 4 State: Reschedule / Available Slots
  const [slotSuggestions, setSlotSuggestions] = useState([])
  const [loadingSlotSuggestions, setLoadingSlotSuggestions] = useState(false)
  const [applyingSuggestionId, setApplyingSuggestionId] = useState(null)

  // Helper: Trigger Undo Toast
  const triggerUndoToast = (message, updatedFixture) => {
    toast.success(message, {
      duration: 9000,
      action: {
        label: 'تراجع ↩',
        onClick: async () => {
          try {
            const res = await api.post(
              `/committee/tournaments/${tournament.id}/league/fixtures/${updatedFixture.id}/undo-change`
            )
            toast.info(res.data?.message || 'تم التراجع عن التعديل بنجاح')
            if (onSuccess) onSuccess()
          } catch (err) {
            toastApiError(err)
          }
        },
      },
    })
  }

  // Load Action 1 Data
  const loadScheduleCandidates = async () => {
    setLoadingSchedule(true)
    try {
      const res = await api.get(
        `/committee/tournaments/${tournament.id}/league/fixtures/${fixture.id}/swap-schedule-candidates`
      )
      setScheduleData(res.data?.data || { eligible_matches: [], pending_candidates: [] })
    } catch (err) {
      toastApiError(err)
    } finally {
      setLoadingSchedule(false)
    }
  }

  // Load Action 2 Data
  const loadEligibleTeams = async (side) => {
    setLoadingTeams(true)
    setSelectedNewTeamId('')
    try {
      const res = await api.get(
        `/committee/tournaments/${tournament.id}/league/fixtures/${fixture.id}/eligible-teams?side=${side}`
      )
      setEligibleTeams(res.data?.data || [])
    } catch (err) {
      toastApiError(err)
    } finally {
      setLoadingTeams(false)
    }
  }

  // Load Host Slots
  const loadHostSlots = async (hostTeamId) => {
    setLoadingHostSlots(true)
    setHostSlots([])
    try {
      const res = await api.get(
        `/committee/tournaments/${tournament.id}/league/fixtures/${fixture.id}/host-slot-suggestions?host_team_id=${hostTeamId}`
      )
      setHostSlots(res.data?.data || [])
    } catch (err) {
      toastApiError(err)
    } finally {
      setLoadingHostSlots(false)
    }
  }

  // Action 1: Execute Swap with Another Match
  const handleSwapScheduleSubmit = async () => {
    if (!selectedSwapMatchId) return
    setSwapScheduleBusy(true)
    try {
      const res = await api.post(
        `/committee/tournaments/${tournament.id}/league/fixtures/${fixture.id}/swap-schedule`,
        { target_fixture_id: Number(selectedSwapMatchId) }
      )
      triggerUndoToast(res.data?.message || 'تم تبديل الموعد بنجاح', res.data?.data?.fixture || fixture)
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      toastApiError(err)
    } finally {
      setSwapScheduleBusy(false)
    }
  }

  // Action 1: Execute Replace with Pending Match
  const handleReplaceWithPendingSubmit = async () => {
    if (!selectedPendingFixtureId) return
    setSwapScheduleBusy(true)
    try {
      const res = await api.post(
        `/committee/tournaments/${tournament.id}/league/fixtures/${fixture.id}/replace-with-pending`,
        { pending_fixture_id: Number(selectedPendingFixtureId) }
      )
      triggerUndoToast(res.data?.message || 'تم استبدال الموعد بالمباراة المعلقة بنجاح', res.data?.data?.fixture || fixture)
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      toastApiError(err)
    } finally {
      setSwapScheduleBusy(false)
    }
  }

  // Action 2: Execute Change Side
  const handleChangeSideSubmit = async (override = false) => {
    if (!selectedNewTeamId) return
    setChangeSideBusy(true)
    const isOverride = override === true
    try {
      // If side is host, check if we need to offer host slots or apply directly
      const res = await api.put(
        `/committee/tournaments/${tournament.id}/league/fixtures/${fixture.id}/change-side`,
        {
          side: selectedSide,
          new_team_id: Number(selectedNewTeamId),
          override_warnings: isOverride,
        }
      )

      const updatedFixture = res.data?.data?.fixture || fixture
      setWarningModalData(null)

      if (selectedSide === 'home') {
        // Host changed: show host slots suggestions
        setPendingFollowUp({
          type: 'host_change',
          newHostId: Number(selectedNewTeamId),
          updatedFixture,
        })
        loadHostSlots(Number(selectedNewTeamId))
        setActiveView('host_slot_suggestions')
      } else {
        triggerUndoToast(res.data?.message || 'تم تغيير الفريق الخصم بنجاح', updatedFixture)
        if (onSuccess) onSuccess()
        onClose()
      }
    } catch (err) {
      if (err.response?.data?.requires_override) {
        setWarningModalData({
          title: err.response.data.warning_title || 'تحذير في برمجة المباراة',
          message: err.response.data.message,
          affectedTeam: err.response.data.affected_team,
          action: 'change_side',
        })
      } else {
        toastApiError(err)
      }
    } finally {
      setChangeSideBusy(false)
    }
  }

  // Action 4: Load Postpone Suggestions
  const loadPostponeSuggestions = async () => {
    setLoadingSlotSuggestions(true)
    setSlotSuggestions([])
    try {
      const res = await api.get(
        '/committee/tournaments/' + tournament.id + '/league/fixtures/' + fixture.id + '/postpone-suggestions'
      )
      setSlotSuggestions(res.data?.data || [])
    } catch (err) {
      toastApiError(err)
    } finally {
      setLoadingSlotSuggestions(false)
    }
  }

  const handleApplySlotSuggestion = async (sug) => {
    setApplyingSuggestionId(sug.id)
    try {
      const res = await api.post(
        '/committee/tournaments/' + tournament.id + '/league/fixtures/' + fixture.id + '/reschedule-suggestion',
        {
          booking_id: sug.booking_id,
          date: sug.date,
          override_warnings: Boolean(sug.has_rest_warning),
          override_reason: 'تثبيت موعد المباراة من المواعيد المتاحة بقرار اللجنة المنظمة',
        }
      )
      triggerUndoToast(res.data?.message || 'تمت إعادة جدولة وتثبيت المباراة بنجاح', res.data?.data || fixture)
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      toastApiError(err)
    } finally {
      setApplyingSuggestionId(null)
    }
  }

  // Action 3: Execute Swap Roles
  const handleSwapRolesSubmit = async () => {
    setSwapRolesBusy(true)
    try {
      const res = await api.put(
        `/committee/tournaments/${tournament.id}/league/fixtures/${fixture.id}/swap-roles`
      )
      const updatedFixture = res.data?.data?.fixture || fixture

      // Offer follow up to move to new host's slot
      setPendingFollowUp({
        type: 'role_swap',
        newHostId: Number(fixture.away_team_id),
        updatedFixture,
      })
      loadHostSlots(Number(fixture.away_team_id))
      setActiveView('host_slot_suggestions')
    } catch (err) {
      toastApiError(err)
    } finally {
      setSwapRolesBusy(false)
    }
  }

  // Apply Selected Host Slot Suggestion
  const handleApplyHostSlot = async (slot, override = false) => {
    setApplyingSlotId(slot.id)
    try {
      if (pendingFollowUp?.type === 'host_change') {
        const res = await api.put(
          `/committee/tournaments/${tournament.id}/league/fixtures/${pendingFollowUp.updatedFixture.id}/change-side`,
          {
            side: 'home',
            new_team_id: pendingFollowUp.newHostId,
            new_booking_id: slot.booking_id,
            new_slot_date: slot.date,
            override_warnings: override,
          }
        )
        setWarningModalData(null)
        triggerUndoToast('تم نقل المباراة وتثبيتها في موعد المضيف الجديد بنجاح', res.data?.data?.fixture || fixture)
      } else if (pendingFollowUp?.type === 'role_swap') {
        const res = await api.put(
          `/committee/tournaments/${tournament.id}/league/fixtures/${pendingFollowUp.updatedFixture.id}/swap-roles`,
          {
            new_booking_id: slot.booking_id,
            new_slot_date: slot.date,
            override_warnings: override,
          }
        )
        setWarningModalData(null)
        triggerUndoToast('تم نقل المباراة وتثبيتها في موعد المضيف الجديد بنجاح', res.data?.data?.fixture || fixture)
      }
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      if (err.response?.data?.requires_override) {
        setWarningModalData({
          title: err.response.data.warning_title || 'تحذير في برمجة المباراة',
          message: err.response.data.message,
          affectedTeam: err.response.data.affected_team,
          action: 'apply_host_slot',
          slot,
        })
      } else {
        toastApiError(err)
      }
    } finally {
      setApplyingSlotId(null)
    }
  }

  // Skip Host Slot and keep default placement
  const handleSkipHostSlot = () => {
    if (pendingFollowUp?.updatedFixture) {
      triggerUndoToast('تم حفظ التعديل والإبقاء على موعد المباراة الحالي', pendingFollowUp.updatedFixture)
    }
    if (onSuccess) onSuccess()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-center justify-center p-3 sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-700">
              <RefreshCw className="size-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900">تعديل المباراة</h3>
              <p className="text-[11px] font-semibold text-slate-400">
                {fixture.home_team?.name} ضد {fixture.away_team?.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Current Match Info Strip */}
        <div className="border-b border-slate-100 bg-white px-5 py-3 text-xs">
          <div className="flex items-center justify-between text-slate-700 font-bold">
            <div className="flex items-center gap-1.5">
              <Home className="size-3.5 text-emerald-600" />
              <span>المضيف:</span>
              <span className="text-slate-900 font-extrabold">{fixture.home_team?.name}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="size-3.5 text-rose-500" />
              <span>الضيف:</span>
              <span className="text-slate-900 font-extrabold">{fixture.away_team?.name}</span>
            </div>
          </div>
          {fixture.scheduled_at && (
            <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <Clock className="size-3 text-slate-400" />
                <span dir="ltr">{fixture.scheduled_at}</span>
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3 text-slate-400" />
                <span>{fixture.stadium?.name || 'الملعب المعتمد'}</span>
              </span>
            </div>
          )}
          {fixture.slot_note && (
            <div className="mt-1.5 inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              <Sparkles className="size-3 text-amber-600" />
              <span>{fixture.slot_note}</span>
            </div>
          )}
        </div>

        {/* Body View Container */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* VIEW: MAIN MENU (Choose 1 of 3 Actions) */}
          {activeView === 'menu' && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-600 mb-2">
                اختر الإجراء المطلوب لتعديل المباراة وفقاً لقواعد نزاهة الدوري والراحة الإلزامية:
              </p>

              {/* ACTION 1 TILE */}
              <button
                type="button"
                className="w-full text-start rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-emerald-400 hover:bg-emerald-50/20 transition-all flex items-start gap-3.5 group"
                onClick={() => {
                  setActiveView('swap_schedule')
                  loadScheduleCandidates()
                }}
              >
                <div className="size-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <CalendarDays className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-emerald-800">
                      الإجراء 1: تبديل الموعد مع مباراة أخرى
                    </h4>
                    <ChevronRight className="size-4 text-slate-400 group-hover:text-emerald-700 rotate-180" />
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 mt-1 leading-relaxed">
                    مبادلة التوقيت والملعب بالكامل مع مواجهة أخرى مؤهلة، أو استبدال الموعد بمباراة معلقة/مؤجلة (تأجيل هذه المباراة).
                  </p>
                </div>
              </button>

              {/* ACTION 2 TILE */}
              <button
                type="button"
                className="w-full text-start rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-emerald-400 hover:bg-emerald-50/20 transition-all flex items-start gap-3.5 group"
                onClick={() => {
                  setActiveView('change_side')
                  loadEligibleTeams(selectedSide)
                }}
              >
                <div className="size-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Users className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-emerald-800">
                      الإجراء 2: تغيير أحد طرفي المباراة (المضيف أو الضيف)
                    </h4>
                    <ChevronRight className="size-4 text-slate-400 group-hover:text-emerald-700 rotate-180" />
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 mt-1 leading-relaxed">
                    استبدال المضيف أو الضيف بفريق مؤهل مع التبادل التلقائي للمواجهات المقابلة للحفاظ على نزاهة الدوري دورة واحدة.
                  </p>
                </div>
              </button>

              {/* ACTION 3 TILE */}
              <button
                type="button"
                className="w-full text-start rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs hover:border-emerald-400 hover:bg-emerald-50/20 transition-all flex items-start gap-3.5 group"
                onClick={() => setActiveView('swap_roles')}
              >
                <div className="size-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <ArrowLeftRight className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-purple-800">
                      الإجراء 3: عكس الأدوار (المضيف ⇄ الضيف)
                    </h4>
                    <ChevronRight className="size-4 text-slate-400 group-hover:text-purple-700 rotate-180" />
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 mt-1 leading-relaxed">
                    عكس دور الاستضافة بين الفريقين مع بقاء التاريخ والملعب، أو النقل الاختياري لموعد المضيف الجديد.
                  </p>
                </div>
              </button>

              {/* ACTION 4 TILE */}
              <button
                type="button"
                className="w-full text-start rounded-2xl border border-emerald-200/90 bg-emerald-50/30 p-4 shadow-2xs hover:border-emerald-500 hover:bg-emerald-50/60 transition-all flex items-start gap-3.5 group"
                onClick={() => {
                  setActiveView('reschedule_slot')
                  loadPostponeSuggestions()
                }}
              >
                <div className="size-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Sparkles className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 group-hover:text-emerald-900">
                      الإجراء 4: أقرب المواعيد الشاغرة والحجوزات المتاحة
                    </h4>
                    <ChevronRight className="size-4 text-emerald-700 rotate-180" />
                  </div>
                  <p className="text-[11px] font-medium text-slate-500 mt-1 leading-relaxed">
                    اكتشاف أقرب المواعيد المحررة وحجوزات طرفي المواجهة المتاحة تلقائياً، أو الانتقال لتحديد موعد يدوي مخصص.
                  </p>
                </div>
              </button>
            </div>
          )}

          {/* VIEW: ACTION 1 (SWAP SCHEDULE) */}
          {activeView === 'swap_schedule' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-800">تبديل الموعد:</span>
                <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    className={`rounded-lg px-3 py-1 font-bold text-xs transition ${
                      scheduleSubTab === 'scheduled'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    onClick={() => setScheduleSubTab('scheduled')}
                  >
                    مباراة مبرمجة ({scheduleData.eligible_matches?.length || 0})
                  </button>
                  <button
                    type="button"
                    className={`rounded-lg px-3 py-1 font-bold text-xs transition ${
                      scheduleSubTab === 'pending'
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    onClick={() => setScheduleSubTab('pending')}
                  >
                    مباراة معلقة ({scheduleData.pending_candidates?.length || 0})
                  </button>
                </div>
              </div>

              {loadingSchedule ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="size-6 animate-spin text-emerald-600" />
                  <p className="text-slate-400 font-bold">جاري فحص المباريات المؤهلة للتبادل...</p>
                </div>
              ) : scheduleSubTab === 'scheduled' ? (
                <div>
                  {scheduleData.eligible_matches.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500 font-bold">
                      لا توجد خيارات متاحة حالياً
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pe-1">
                      {scheduleData.eligible_matches.map((item) => {
                        const isSelected = String(item.fixture_id) === String(selectedSwapMatchId)
                        return (
                          <div
                            key={item.fixture_id}
                            className={`rounded-2xl border p-3 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-emerald-500 bg-emerald-50/70 shadow-xs'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                            onClick={() => setSelectedSwapMatchId(item.fixture_id)}
                          >
                            <div className="flex items-center justify-between font-extrabold text-slate-900 mb-1">
                              <span>
                                {item.home_team.name} ضد {item.away_team.name}
                              </span>
                              <span className="text-[11px] font-black rounded-lg bg-slate-100 px-2 py-0.5 text-slate-700">
                                جولة {item.matchday}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 font-medium">
                              <span className="flex items-center gap-1 text-emerald-800 font-bold">
                                <Clock className="size-3 text-emerald-600" />
                                {item.day_name} {item.scheduled_at}
                              </span>
                              <span>{item.stadium?.name}</span>
                            </div>
                            {item.is_borrowed && (
                              <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-purple-700 font-bold">
                                <Sparkles className="size-2.5 text-purple-500" /> موعد مستعار
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                    <Button variant="outline" className="text-xs" onClick={() => setActiveView('menu')}>
                      العودة للقائمة
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4"
                      disabled={!selectedSwapMatchId || swapScheduleBusy}
                      onClick={handleSwapScheduleSubmit}
                    >
                      {swapScheduleBusy && <Loader2 className="me-1.5 size-3.5 animate-spin" />}
                      تأكيد تبديل الموعد فوراً
                    </Button>
                  </div>
                </div>
              ) : (
                /* Subtab: Pending Matches */
                <div>
                  <div className="rounded-xl bg-amber-50 border border-amber-200 p-2.5 mb-3 text-[11px] text-amber-900 leading-relaxed font-semibold">
                    ستأخذ المباراة المعلقة موعد وملعب هذه المباراة، بينما تصبح هذه المباراة بحالة "مؤجلة" ولن تُحذف.
                  </div>

                  {scheduleData.pending_candidates.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500 font-bold">
                      لا توجد خيارات متاحة حالياً
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-72 overflow-y-auto pe-1">
                      {scheduleData.pending_candidates.map((item) => {
                        const isSelected = String(item.fixture_id) === String(selectedPendingFixtureId)
                        return (
                          <div
                            key={item.fixture_id}
                            className={`rounded-2xl border p-3 cursor-pointer transition-all ${
                              isSelected
                                ? 'border-amber-500 bg-amber-50/70 shadow-xs'
                                : 'border-slate-200 bg-white hover:border-slate-300'
                            }`}
                            onClick={() => setSelectedPendingFixtureId(item.fixture_id)}
                          >
                            <div className="flex items-center justify-between font-extrabold text-slate-900 mb-1">
                              <span>
                                {item.home_team.name} ضد {item.away_team.name}
                              </span>
                              <span className="text-[11px] font-bold rounded-lg bg-amber-100 text-amber-900 px-2 py-0.5">
                                {item.status_label}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500">الجولة {item.matchday}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                    <Button variant="outline" className="text-xs" onClick={() => setActiveView('menu')}>
                      العودة للقائمة
                    </Button>
                    <Button
                      className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-4"
                      disabled={!selectedPendingFixtureId || swapScheduleBusy}
                      onClick={handleReplaceWithPendingSubmit}
                    >
                      {swapScheduleBusy && <Loader2 className="me-1.5 size-3.5 animate-spin" />}
                      استبدال وتأجيل هذه المباراة
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* VIEW: ACTION 2 (CHANGE SIDE) */}
          {activeView === 'change_side' && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-black text-slate-800 mb-2">
                  اختر الطرف المراد تغييره:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    className={`rounded-2xl border p-3 text-start transition-all ${
                      selectedSide === 'home'
                        ? 'border-emerald-500 bg-emerald-50/80 text-emerald-950 font-black shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold'
                    }`}
                    onClick={() => {
                      setSelectedSide('home')
                      loadEligibleTeams('home')
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-500">
                      <Home className="size-3 text-emerald-600" />
                      <span>تغيير المضيف</span>
                    </div>
                    <span className="truncate block font-black text-slate-900">
                      {fixture.home_team?.name}
                    </span>
                  </button>

                  <button
                    type="button"
                    className={`rounded-2xl border p-3 text-start transition-all ${
                      selectedSide === 'away'
                        ? 'border-emerald-500 bg-emerald-50/80 text-emerald-950 font-black shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold'
                    }`}
                    onClick={() => {
                      setSelectedSide('away')
                      loadEligibleTeams('away')
                    }}
                  >
                    <div className="flex items-center gap-1.5 mb-1 text-[11px] text-slate-500">
                      <Shield className="size-3 text-rose-500" />
                      <span>تغيير الضيف</span>
                    </div>
                    <span className="truncate block font-black text-slate-900">
                      {fixture.away_team?.name}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    اختر الفريق الجديد المؤهل:
                  </label>
                  {loadingTeams && (
                    <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                      <Loader2 className="size-3 animate-spin" /> جاري الفحص...
                    </span>
                  )}
                </div>

                {loadingTeams ? (
                  <div className="py-8 text-center text-slate-400 font-bold">جاري جلب الفرق المؤهلة...</div>
                ) : eligibleTeams.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-slate-500 font-bold">
                    لا توجد خيارات متاحة
                  </div>
                ) : (
                  <select
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:outline-none"
                    value={selectedNewTeamId}
                    onChange={(e) => setSelectedNewTeamId(e.target.value)}
                    disabled={changeSideBusy}
                  >
                    <option value="">-- اضغط للاختيار ({eligibleTeams.length} متاح) --</option>
                    {eligibleTeams.map((team) => (
                      <option key={team.team_id} value={team.team_id}>
                        {team.team_name}
                        {team.other_fixture
                          ? ` (مواجهة الجولة ${team.other_fixture.matchday} ستُستبدل تلقائياً)`
                          : ''}
                        {team.has_rest_warning ? ' ⚠️ (تعارض فترة راحة - قابل للفرض)' : ''}
                      </option>
                    ))}
                  </select>
                )}

                <p className="mt-2 text-[11px] text-slate-400 leading-relaxed">
                  يُطبق التبديل الفوري مع مقايضة المواجهة المقابلة لمنع أي تكرار والحفاظ على نزاهة جدول دوري الدورة الواحدة.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <Button variant="outline" className="text-xs" onClick={() => setActiveView('menu')}>
                  العودة للقائمة
                </Button>
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4"
                  disabled={!selectedNewTeamId || changeSideBusy || loadingTeams}
                  onClick={() => handleChangeSideSubmit(false)}
                >
                  {changeSideBusy && <Loader2 className="me-1.5 size-3.5 animate-spin" />}
                  تأكيد التغيير والمقايضة
                </Button>
              </div>
            </div>
          )}

          {/* VIEW: ACTION 3 (SWAP ROLES) */}
          {activeView === 'swap_roles' && (
            <div className="space-y-4 text-xs">
              <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-4 space-y-2">
                <div className="flex items-center gap-2 font-black text-purple-900 text-sm">
                  <ArrowLeftRight className="size-4 text-purple-700" />
                  <span>عكس أدوار الاستضافة</span>
                </div>
                <p className="text-slate-700 leading-relaxed font-medium">
                  سيصبح <strong className="text-slate-900">{fixture.away_team?.name}</strong> هو الفريق المضيف، و{' '}
                  <strong className="text-slate-900">{fixture.home_team?.name}</strong> هو الفريق الضيف.
                </p>
                <p className="text-[11px] text-slate-500">
                  سيبقى التاريخ والتوقيت والملعب كما هو تلقائياً، مع وضع الملاحظة "الموعد يخص {fixture.home_team?.name} (الضيف)".
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <Button variant="outline" className="text-xs" onClick={() => setActiveView('menu')}>
                  العودة للقائمة
                </Button>
                <Button
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold px-4"
                  disabled={swapRolesBusy}
                  onClick={handleSwapRolesSubmit}
                >
                  {swapRolesBusy && <Loader2 className="me-1.5 size-3.5 animate-spin" />}
                  تأكيد عكس الأدوار (نقرة واحدة)
                </Button>
              </div>
            </div>
          )}

          {/* VIEW: ACTION 4 (RESCHEDULE / AVAILABLE SLOTS) */}
          {activeView === 'reschedule_slot' && (
            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-slate-800">
                  المواعيد المتاحة المناسبة لهذه المواجهة (أقرب موعد أولاً):
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold text-slate-600"
                  onClick={() => setActiveView('menu')}
                >
                  العودة للقائمة
                </Button>
              </div>

              {loadingSlotSuggestions ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="size-6 animate-spin text-emerald-600" />
                  <p className="text-slate-400 font-bold">جاري البحث عن أقرب المواعيد الشاغرة وحجوزات الفريقين...</p>
                </div>
              ) : slotSuggestions.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center space-y-2">
                  <CalendarDays className="size-8 mx-auto text-slate-300" />
                  <p className="text-slate-600 font-bold">لا توجد مواعيد شاغرة أو حجوزات متاحة حالياً تطابق الشروط.</p>
                  <p className="text-[11px] text-slate-400">يمكنك تحديد تاريخ ووقت مخصص يدوياً باستخدام نافذة إعادة الجدولة.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pe-1">
                  {slotSuggestions.map((sug, idx) => (
                    <div
                      key={sug.id || idx}
                      className={
                        'rounded-2xl border p-3.5 shadow-2xs flex items-center justify-between gap-3 transition-all ' +
                        (idx === 0
                          ? 'border-emerald-300 bg-emerald-50/40 ring-1 ring-emerald-200'
                          : 'border-slate-200 bg-white hover:border-slate-300')
                      }
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {idx === 0 && (
                            <span className="rounded-lg bg-emerald-600 text-white px-2 py-0.5 text-[10px] font-black">
                              ⭐ أقرب موعد
                            </span>
                          )}
                          <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-black text-slate-800">
                            {sug.day_name ? sug.day_name + ' • ' : ''}{sug.date}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                            <Clock className="size-3 text-slate-400" />
                            {sug.time}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-700 font-bold">
                          <MapPin className="size-3 text-slate-400" />
                          <span>{sug.stadium_name || sug.stadium?.name || 'الملعب المعتمد'}</span>
                        </div>
                        {sug.has_rest_warning && (
                          <div className="pt-0.5">
                            <span className="inline-flex items-center gap-1 rounded bg-amber-100 text-amber-900 px-1.5 py-0.5 text-[10px] font-bold">
                              ⚠️ {sug.warning_message || 'تنبيه: تعارض مع فترة الراحة المحددة'}
                            </span>
                          </div>
                        )}
                      </div>

                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 shrink-0"
                        disabled={Boolean(applyingSuggestionId)}
                        onClick={() => handleApplySlotSuggestion(sug)}
                      >
                        {applyingSuggestionId === sug.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          'تثبيت الموعد'
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Manual Reschedule Option */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 flex items-center justify-between gap-3">
                <div className="text-slate-600 text-[11px] font-medium">
                  هل تفضل تحديد تاريخ ووقت مخصصين يدوياً للمباراة؟
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs font-bold shrink-0 border-slate-300"
                  onClick={() => {
                    if (onOpenManualReschedule) onOpenManualReschedule(fixture)
                    onClose()
                  }}
                >
                  موعد مخصص ⚙️
                </Button>
              </div>

              <div className="flex items-center justify-end border-t border-slate-100 pt-3">
                <Button variant="outline" className="text-xs" onClick={() => setActiveView('menu')}>
                  العودة للقائمة الرئيسية
                </Button>
              </div>
            </div>
          )}

          {/* VIEW: FOLLOW-UP HOST SLOTS SUGGESTIONS */}
          {activeView === 'host_slot_suggestions' && (
            <div className="space-y-4 text-xs">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-1">
                <div className="flex items-center gap-1.5 font-black text-emerald-900">
                  <Sparkles className="size-4 text-emerald-600" />
                  <span>مواعيد شاغرة للمضيف الجديد</span>
                </div>
                <p className="text-[11px] text-slate-700 font-medium leading-relaxed">
                  يمكنك نقل المباراة لأحد المواعيد الشاغرة للمضيف الجديد فوراً، أو إبقاؤها في موعدها الحالي.
                </p>
              </div>

              {loadingHostSlots ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="size-6 animate-spin text-emerald-600" />
                  <p className="text-slate-400 font-bold">جاري جلب مواعيد المضيف...</p>
                </div>
              ) : hostSlots.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-center space-y-2">
                  <p className="text-sm font-black text-slate-700">لا يملك موعداً شاغراً حالياً</p>
                  <p className="text-[11px] text-slate-500">
                    يمكنك إبقاء المباراة في موعدها الحالي كموعد مستعار، أو تحديد موعد وملعب يدوياً.
                  </p>
                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      className="text-xs"
                      onClick={() => {
                        onClose()
                        if (onOpenManualReschedule) onOpenManualReschedule(fixture)
                      }}
                    >
                      <Calendar className="me-1.5 size-3.5" />
                      تحديد موعد وملعب يدوياً
                    </Button>
                    <Button
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                      onClick={handleSkipHostSlot}
                    >
                      الإبقاء على الموعد الحالي
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto pe-1">
                  {hostSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs flex items-center justify-between gap-3 hover:border-emerald-300 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-black text-emerald-800">
                            {slot.day_name} • {slot.date}
                          </span>
                          <span className="flex items-center gap-1 text-[11px] font-bold text-slate-600">
                            <Clock className="size-3 text-slate-400" />
                            {slot.time}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-700 font-bold">
                          <MapPin className="size-3 text-slate-400" />
                          <span>{slot.stadium?.name}</span>
                        </div>
                      </div>

                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 shrink-0"
                        disabled={Boolean(applyingSlotId)}
                        onClick={() => handleApplyHostSlot(slot)}
                      >
                        {applyingSlotId === slot.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          'نقل وتثبيت'
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {hostSlots.length > 0 && (
                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[11px] text-slate-400 font-medium">
                    عدم الاختيار سيبقي المباراة في موعدها الحالي
                  </span>
                  <Button variant="outline" className="text-xs font-bold" onClick={handleSkipHostSlot}>
                    إبقاء الموعد الحالي
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <OverrideWarningModal
        isOpen={Boolean(warningModalData)}
        onClose={() => setWarningModalData(null)}
        onConfirm={() => {
          if (warningModalData?.action === 'change_side') {
            handleChangeSideSubmit(true)
          } else if (warningModalData?.action === 'apply_host_slot') {
            handleApplyHostSlot(warningModalData.slot, true)
          }
        }}
        warningTitle={warningModalData?.title}
        warningMessage={warningModalData?.message}
        affectedTeam={warningModalData?.affectedTeam}
        busy={changeSideBusy || Boolean(applyingSlotId)}
      />
    </div>
  )
}
