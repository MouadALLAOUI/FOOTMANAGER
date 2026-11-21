import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  Clock,
  History,
  Lock,
  Redo2,
  RefreshCw,
  RotateCcw,
  Shield,
  Shuffle,
  Undo2,
  UserCheck,
  X,
} from 'lucide-react'
import api from '../../../../api/client'
import { Button, Modal } from '../../../../components/dashboard/ui'
import { useToast } from '../../../../components/ui/Toast'
import { toastApiError } from '../../../../lib/errors'
import { TeamAvatar } from '../../../tournaments/shared'

export default function KnockoutDrawModal({ open, onClose, tournament, onConfirmed }) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [data, setData] = useState(null)
  const [preventSameGroup, setPreventSameGroup] = useState(true)
  const [assignments, setAssignments] = useState({}) // { [fixtureId]: { home: teamId, away: teamId } }
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [confirmPrompt, setConfirmPrompt] = useState(false)

  // Undo / Redo history stack for draft assignments
  const [history, setHistory] = useState([])
  const [historyIdx, setHistoryIdx] = useState(-1)

  // Clear slots confirm dialog
  const [clearConfirm, setClearConfirm] = useState(false)

  // Version History Modal / View
  const [showHistory, setShowHistory] = useState(false)
  const [versions, setVersions] = useState([])
  const [loadingVersions, setLoadingVersions] = useState(false)

  // Rollback dialog
  const [rollbackPrompt, setRollbackPrompt] = useState(false)
  const [rollbackReason, setRollbackReason] = useState('')
  const [rollbackBusy, setRollbackBusy] = useState(false)

  // Push new state to history
  const pushHistory = (newAssignments) => {
    setHistory((prev) => {
      const slice = prev.slice(0, historyIdx + 1)
      return [...slice, JSON.parse(JSON.stringify(newAssignments))]
    })
    setHistoryIdx((prev) => prev + 1)
    setAssignments(newAssignments)
  }

  const handleUndo = () => {
    if (historyIdx > 0) {
      const prevIdx = historyIdx - 1
      setHistoryIdx(prevIdx)
      setAssignments(JSON.parse(JSON.stringify(history[prevIdx])))
      setSelectedTeam(null)
    }
  }

  const handleRedo = () => {
    if (historyIdx < history.length - 1) {
      const nextIdx = historyIdx + 1
      setHistoryIdx(nextIdx)
      setAssignments(JSON.parse(JSON.stringify(history[nextIdx])))
      setSelectedTeam(null)
    }
  }

  const loadDrawData = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/committee/tournaments/${tournament.id}/bracket/draw-teams`)
      const d = res.data.data
      setData(d)
      setPreventSameGroup(d.rules?.prevent_same_group_r1 ?? true)

      // Initialize assignments from existing fixtures
      const initial = {}
      ;(d.fixtures || []).forEach((f) => {
        initial[f.id] = {
          home: f.home_team_id || null,
          away: f.away_team_id || null,
        }
      })
      setAssignments(initial)
      setHistory([JSON.parse(JSON.stringify(initial))])
      setHistoryIdx(0)
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setLoading(false)
    }
  }

  const loadVersions = async () => {
    setLoadingVersions(true)
    try {
      const res = await api.get(`/committee/tournaments/${tournament.id}/bracket/draw-versions`)
      setVersions(res.data.data?.versions || [])
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setLoadingVersions(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadDrawData()
      setShowHistory(false)
      setSelectedTeam(null)
    }
  }, [open, tournament.id])

  const qualifiedTeams = data?.qualified_teams || []
  const fixtures = data?.fixtures || []
  const drawStatus = data?.draw_status || 'pending'
  const isConfirmed = drawStatus === 'confirmed'

  // Map team by id for quick lookup
  const teamMap = {}
  qualifiedTeams.forEach((team) => {
    teamMap[team.team_id] = team
  })

  // List of assigned team IDs
  const assignedIds = new Set()
  Object.values(assignments).forEach((pair) => {
    if (pair.home) assignedIds.add(pair.home)
    if (pair.away) assignedIds.add(pair.away)
  })

  // Available teams in pool
  const unassignedTeams = qualifiedTeams.filter((tm) => !assignedIds.has(tm.team_id))

  // Assign or slot click logic
  const handleSlotClick = (fixtureId, side) => {
    if (isConfirmed) return

    const currentTeamId = assignments[fixtureId]?.[side]

    if (selectedTeam) {
      // If a team is currently selected from pool
      const updated = {
        ...assignments,
        [fixtureId]: {
          ...assignments[fixtureId],
          [side]: selectedTeam.team_id,
        },
      }
      pushHistory(updated)
      setSelectedTeam(null)
    } else if (currentTeamId) {
      // Clicked an occupied slot: remove team back to pool
      const updated = {
        ...assignments,
        [fixtureId]: {
          ...assignments[fixtureId],
          [side]: null,
        },
      }
      pushHistory(updated)
    }
  }

  // Swap home and away in a fixture
  const handleSwapMatch = (fixtureId) => {
    if (isConfirmed) return
    const current = assignments[fixtureId] || { home: null, away: null }
    const updated = {
      ...assignments,
      [fixtureId]: {
        home: current.away,
        away: current.home,
      },
    }
    pushHistory(updated)
  }

  // Clear all assignments (with confirmation)
  const handleReset = () => {
    if (isConfirmed) return
    const cleared = {}
    fixtures.forEach((f) => {
      cleared[f.id] = { home: null, away: null }
    })
    pushHistory(cleared)
    setSelectedTeam(null)
    setClearConfirm(false)
    toast.info('تم إفراغ خانات القرعة المسودة')
  }

  // Validation checks
  const validationErrors = []
  let filledSlots = 0
  const totalSlots = fixtures.length * 2

  fixtures.forEach((f, idx) => {
    const pair = assignments[f.id] || { home: null, away: null }
    if (pair.home) filledSlots++
    if (pair.away) filledSlots++

    if (pair.home && pair.away && preventSameGroup) {
      const tmHome = teamMap[pair.home]
      const tmAway = teamMap[pair.away]
      if (tmHome?.group_id && tmAway?.group_id && tmHome.group_id === tmAway.group_id) {
        validationErrors.push(`المباراة ${idx + 1}: (${tmHome.name}) و (${tmAway.name}) من نفس المجموعة`)
      }
    }
  })

  const isComplete = filledSlots === totalSlots && totalSlots > 0 && validationErrors.length === 0

  // Confirm draw submission
  const handleConfirmDraw = async () => {
    if (!isComplete || busy) return

    setBusy(true)
    try {
      const payloadAssignments = fixtures.map((f) => ({
        fixture_id: f.id,
        home_team_id: assignments[f.id].home,
        away_team_id: assignments[f.id].away,
      }))

      await api.post(`/committee/tournaments/${tournament.id}/bracket/confirm-draw`, {
        assignments: payloadAssignments,
        prevent_same_group_r1: preventSameGroup,
        reason: 'اعتماد القرعة اليدوية الأولى',
      })

      toast.success('تم اعتماد القرعة الإقصائية وتثبيت المباريات بنجاح!')
      setConfirmPrompt(false)
      if (onConfirmed) onConfirmed()
      loadDrawData()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  // Rollback draw
  const handleRollbackDraw = async () => {
    if (!rollbackReason.trim()) {
      toast.error('يرجى توضيح سبب التراجع عن القرعة')
      return
    }

    setRollbackBusy(true)
    try {
      await api.post(`/committee/tournaments/${tournament.id}/bracket/draw-rollback`, {
        reason: rollbackReason.trim(),
      })
      toast.success('تم إلغاء اعتماد القرعة وإعادتها لمسودة قابلة للتعديل بنجاح')
      setRollbackPrompt(false)
      setRollbackReason('')
      if (onConfirmed) onConfirmed()
      loadDrawData()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setRollbackBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="منظومة القرعة الإقصائية اليدوية (خروج المغلوب)"
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#65706A]">
          <RefreshCw className="size-8 animate-spin text-[#179955]" />
          <p className="mt-3 text-sm font-bold">جاري تحميل بيانات السلم والفرق المتأهلة...</p>
        </div>
      ) : showHistory ? (
        /* Version History View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-[#111313] dark:text-[#F5F7F2] flex items-center gap-2">
              <History className="size-4 text-[#179955]" />
              سجل نسخ واعتمادات القرعة
            </h4>
            <Button size="xs" variant="outline" onClick={() => setShowHistory(false)}>
              العودة للقرعة
            </Button>
          </div>

          {loadingVersions ? (
            <div className="flex items-center justify-center py-10 text-xs text-[#65706A]">
              <RefreshCw className="size-4 animate-spin me-2 text-[#179955]" />
              جاري تحميل سجل النسخ...
            </div>
          ) : versions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#E1E5DF] dark:border-[#303832] py-10 text-center text-xs text-[#65706A]">
              لا توجد نسخ معتمدة سابقة مسجلة لهذه البطولة حتى الآن.
            </div>
          ) : (
            <div className="space-y-2 max-h-[420px] overflow-y-auto pe-1">
              {versions.map((ver, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-black text-[#111313] dark:text-[#F5F7F2]">
                      النسخة #{ver.version} {ver.action === 'rollback' ? '(إلغاء وتراجع)' : '(اعتماد رسمي)'}
                    </span>
                    <span className="text-[11px] text-[#65706A] dark:text-[#B2B9B3]">
                      {ver.timestamp ? new Date(ver.timestamp).toLocaleString('ar-MA') : ''}
                    </span>
                  </div>
                  {ver.reason && (
                    <p className="text-[11px] text-[#65706A] dark:text-[#B2B9B3]">
                      <span className="font-bold">السبب المدوّن: </span>
                      {ver.reason}
                    </p>
                  )}
                  {ver.assignments_count !== undefined && (
                    <p className="text-[10px] text-[#179955] dark:text-[#42D889] font-bold">
                      عدد المواجهات المسكنة: {ver.assignments_count} مباراة
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Header Info Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3.5 sm:p-4">
            <div className="flex items-center gap-3">
              <div
                className={`grid size-11 place-items-center rounded-xl font-bold ${
                  isConfirmed
                    ? 'bg-[#179955]/15 text-[#179955] dark:bg-[#42D889]/20 dark:text-[#42D889]'
                    : 'bg-amber-500/15 text-amber-600 dark:bg-amber-400/20 dark:text-amber-400'
                }`}
              >
                {isConfirmed ? <Lock className="size-5" /> : <Shuffle className="size-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                    {data?.first_round?.name || 'الدور الإقصائي الأول'}
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      isConfirmed
                        ? 'bg-[#179955]/15 text-[#179955] dark:text-[#42D889]'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {isConfirmed ? 'معتمدة ومجمدة' : 'سحب يدوي — مسودة'}
                  </span>
                </div>
                <p className="text-xs text-[#65706A] dark:text-[#B2B9B3]">
                  {isConfirmed
                    ? `تم اعتماد هذه القرعة رسمياً في ${new Date(data?.draw_confirmed_at).toLocaleDateString('ar-MA')}`
                    : `انقر لاختيار الفريق ثم انقر على الخانة المرغوبة (${qualifiedTeams.length} فرق متأهلة).`}
                </p>
              </div>
            </div>

            {/* Actions strip */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Button
                variant="outline"
                size="xs"
                onClick={() => {
                  setShowHistory(true)
                  loadVersions()
                }}
              >
                <History className="size-3.5" />
                سجل النسخ
              </Button>

              {!isConfirmed ? (
                <>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleUndo}
                    disabled={historyIdx <= 0}
                    title="تراجع عن آخر حركة"
                  >
                    <Undo2 className="size-3.5" />
                    تراجع
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={handleRedo}
                    disabled={historyIdx >= history.length - 1}
                    title="إعادة آخر حركة"
                  >
                    <Redo2 className="size-3.5" />
                    إعادة
                  </Button>
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setClearConfirm(true)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    <RotateCcw className="size-3.5" />
                    إفراغ الخانات
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="xs"
                  onClick={() => setRollbackPrompt(true)}
                  className="text-amber-600 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                >
                  <RotateCcw className="size-3.5" />
                  طلب التراجع عن الاعتماد
                </Button>
              )}
            </div>
          </div>

          {/* Constraint toggle */}
          <div className="flex items-center justify-between rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] px-4 py-3">
            <div className="flex items-center gap-2.5">
              <Shield className="size-4 text-[#179955] dark:text-[#42D889]" />
              <div>
                <p className="text-xs font-bold text-[#111313] dark:text-[#F5F7F2]">
                  قاعدة تجنب مواجهة فريقي نفس المجموعة
                </p>
                <p className="text-[11px] text-[#65706A] dark:text-[#B2B9B3]">
                  تنبيه تلقائي عند تسكين فريقين من نفس المجموعة في مواجهة واحدة
                </p>
              </div>
            </div>
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={preventSameGroup}
                disabled={isConfirmed}
                onChange={(e) => setPreventSameGroup(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-5 w-9 rounded-full bg-gray-200 after:absolute after:start-[2px] after:top-[2px] after:size-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-[#179955] peer-checked:after:translate-x-full peer-checked:after:border-white dark:bg-gray-700" />
            </label>
          </div>

          {/* Validation Warnings */}
          {validationErrors.length > 0 && (
            <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-3 text-xs text-red-600 dark:text-red-400">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="size-4 shrink-0" />
                <span>تنبيهات توافق القرعة:</span>
              </div>
              <ul className="mt-1 list-inside list-disc space-y-0.5 pe-4">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Unassigned Teams Pool (Only if not confirmed) */}
          {!isConfirmed && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#65706A] dark:text-[#B2B9B3]">
                <span>وعاء الفرق المتأهلة غير المسكنة ({unassignedTeams.length}):</span>
                {selectedTeam && (
                  <span className="text-[#179955] dark:text-[#42D889] animate-pulse">
                    الفريق المحدد: {selectedTeam.name} — انقر على أي خانة فارغة لتسكينه
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 rounded-xl border border-dashed border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5]/60 dark:bg-[#252B27]/40 p-3 min-h-[58px]">
                {unassignedTeams.length === 0 ? (
                  <div className="flex w-full items-center justify-center gap-2 py-1 text-xs font-bold text-[#179955] dark:text-[#42D889]">
                    <CheckCircle2 className="size-4" />
                    تم تسكين كافة الفرق المتأهلة بنجاح في خانات الدور الأول!
                  </div>
                ) : (
                  unassignedTeams.map((team) => {
                    const isSelected = selectedTeam?.team_id === team.team_id
                    return (
                      <button
                        key={team.team_id}
                        type="button"
                        onClick={() => setSelectedTeam(isSelected ? null : team)}
                        className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 text-xs font-bold transition ${
                          isSelected
                            ? 'border-[#179955] bg-[#179955]/10 text-[#179955] dark:border-[#42D889] dark:bg-[#42D889]/15 dark:text-[#42D889] ring-2 ring-[#179955]/30'
                            : 'border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] text-[#111313] dark:text-[#F5F7F2] hover:border-[#179955]'
                        }`}
                      >
                        <TeamAvatar team={team} className="size-5 shrink-0" />
                        <span>{team.name}</span>
                        {team.group_name && (
                          <span className="rounded bg-[#F7F8F5] dark:bg-[#252B27] px-1.5 py-0.5 text-[10px] text-[#65706A] dark:text-[#B2B9B3]">
                            {team.group_name} ({team.rank === 1 ? 'الأول' : 'الثاني'})
                          </span>
                        )}
                      </button>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* Fixtures Slots Grid */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#65706A] dark:text-[#B2B9B3]">
              مواجهات الدور الأول ({fixtures.length} مباريات):
            </h4>

            <div className="grid gap-3 sm:grid-cols-2">
              {fixtures.map((fixture, idx) => {
                const pair = assignments[fixture.id] || { home: null, away: null }
                const homeTeam = pair.home ? teamMap[pair.home] : null
                const awayTeam = pair.away ? teamMap[pair.away] : null

                const isSameGroupConflict =
                  preventSameGroup &&
                  homeTeam &&
                  awayTeam &&
                  homeTeam.group_id &&
                  awayTeam.group_id &&
                  homeTeam.group_id === awayTeam.group_id

                return (
                  <div
                    key={fixture.id}
                    className={`relative rounded-2xl border p-3.5 transition ${
                      isSameGroupConflict
                        ? 'border-red-400 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'
                        : 'border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D]'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between text-[11px] text-[#65706A] dark:text-[#B2B9B3]">
                      <span className="font-bold">المباراة {idx + 1}</span>
                      {!isConfirmed && (homeTeam || awayTeam) && (
                        <button
                          type="button"
                          onClick={() => handleSwapMatch(fixture.id)}
                          className="flex items-center gap-1 text-[10px] text-[#179955] dark:text-[#42D889] hover:underline"
                        >
                          <ArrowLeftRight className="size-3" />
                          تبديل المستضيف
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      {/* Home Team Slot */}
                      <div
                        onClick={() => handleSlotClick(fixture.id, 'home')}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs transition ${
                          isConfirmed ? 'cursor-default' : 'cursor-pointer hover:border-[#179955]'
                        } ${
                          homeTeam
                            ? 'border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] font-bold text-[#111313] dark:text-[#F5F7F2]'
                            : 'border-dashed border-[#E1E5DF] dark:border-[#303832] bg-transparent text-[#65706A]'
                        }`}
                      >
                        {homeTeam ? (
                          <div className="flex items-center gap-2 min-w-0">
                            <TeamAvatar team={homeTeam} className="size-5 shrink-0" />
                            <span className="truncate">{homeTeam.name}</span>
                            {homeTeam.group_name && (
                              <span className="text-[10px] text-[#65706A] dark:text-[#B2B9B3]">
                                ({homeTeam.group_name})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-dashed">انقر لتسكين الفريق المستضيف</span>
                        )}
                        {!isConfirmed && homeTeam && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSlotClick(fixture.id, 'home')
                            }}
                            className="text-[#65706A] hover:text-red-500"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>

                      {/* VS Divider */}
                      <div className="flex items-center justify-center">
                        <span className="rounded-full bg-[#F7F8F5] dark:bg-[#252B27] px-2 py-0.5 text-[10px] font-bold text-[#65706A]">
                          ضد
                        </span>
                      </div>

                      {/* Away Team Slot */}
                      <div
                        onClick={() => handleSlotClick(fixture.id, 'away')}
                        className={`flex items-center justify-between rounded-xl border px-3 py-2 text-xs transition ${
                          isConfirmed ? 'cursor-default' : 'cursor-pointer hover:border-[#179955]'
                        } ${
                          awayTeam
                            ? 'border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] font-bold text-[#111313] dark:text-[#F5F7F2]'
                            : 'border-dashed border-[#E1E5DF] dark:border-[#303832] bg-transparent text-[#65706A]'
                        }`}
                      >
                        {awayTeam ? (
                          <div className="flex items-center gap-2 min-w-0">
                            <TeamAvatar team={awayTeam} className="size-5 shrink-0" />
                            <span className="truncate">{awayTeam.name}</span>
                            {awayTeam.group_name && (
                              <span className="text-[10px] text-[#65706A] dark:text-[#B2B9B3]">
                                ({awayTeam.group_name})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-dashed">انقر لتسكين الفريق الضيف</span>
                        )}
                        {!isConfirmed && awayTeam && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSlotClick(fixture.id, 'away')
                            }}
                            className="text-[#65706A] hover:text-red-500"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isSameGroupConflict && (
                      <p className="mt-2 text-center text-[10px] font-bold text-red-500">
                        ⚠️ مخالفة: الفريقان من نفس المجموعة ({homeTeam.group_name})
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Sticky Bottom Bar */}
          <div className="flex items-center justify-between border-t border-[#E1E5DF] dark:border-[#303832] pt-4">
            <Button variant="ghost" onClick={onClose}>
              إغلاق
            </Button>

            {!isConfirmed ? (
              <Button
                variant="primary"
                disabled={!isComplete || busy}
                onClick={() => setConfirmPrompt(true)}
              >
                <UserCheck className="size-4" />
                اعتماد وتثبيت القرعة ({filledSlots}/{totalSlots})
              </Button>
            ) : (
              <div className="flex items-center gap-2 text-xs font-bold text-[#179955] dark:text-[#42D889]">
                <Check className="size-4" />
                القرعة معتمدة ومقفلة رسمياً
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Guard Dialog */}
      <Modal
        open={confirmPrompt}
        onClose={() => setConfirmPrompt(false)}
        size="sm"
        title="تأكيد اعتماد القرعة الإقصائية"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-5 shrink-0" />
            <p>
              سيتم تثبيت هذه المواجهات رسمياً في السلم الإقصائي وتوليد مباريات الدور الأول. لن يمكن تعديل القرعة بعد
              بدء المباريات.
            </p>
          </div>
          <p className="text-xs text-[#65706A] dark:text-[#B2B9B3]">
            هل راجعت كافة المواجهات وتود تثبيت القرعة رسمياً الآن؟
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setConfirmPrompt(false)} disabled={busy}>
              إلغاء
            </Button>
            <Button variant="primary" loading={busy} onClick={handleConfirmDraw}>
              نعم، اعتمد القرعة رسمياً
            </Button>
          </div>
        </div>
      </Modal>

      {/* Clear Slots Confirmation Modal */}
      <Modal
        open={clearConfirm}
        onClose={() => setClearConfirm(false)}
        size="sm"
        title="تأكيد إفراغ خانات القرعة"
      >
        <div className="space-y-4">
          <p className="text-xs text-[#65706A] dark:text-[#B2B9B3]">
            هل أنت متأكد من رغبتك في إفراغ كافة الخانات المسكنة وإعادة الفرق إلى الوعاء؟
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setClearConfirm(false)}>
              إلغاء
            </Button>
            <Button variant="danger" onClick={handleReset}>
              نعم، إفراغ الخانات
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rollback Prompt Modal */}
      <Modal
        open={rollbackPrompt}
        onClose={() => setRollbackPrompt(false)}
        size="sm"
        title="طلب التراجع عن القرعة المعتمدة"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-5 shrink-0" />
            <p>
              سيتم إرجاع القرعة إلى وضع المسودة غير المعتمدة لمسح التسكين وتعديله. لن يتاح هذا الإجراء إذا كانت أي مباراة إقصائية قد لُعبت بالفعل.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#111313] dark:text-[#F5F7F2] mb-1">
              سبب التراجع وإعادة السحب (إلزامي للتوثيق):
            </label>
            <textarea
              value={rollbackReason}
              onChange={(e) => setRollbackReason(e.target.value)}
              rows={3}
              placeholder="مثال: رصد خطأ في تسكين الفرق، قرار اللجنة المنظمة بإعادة القرعة..."
              className="w-full rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-3 text-xs text-[#111313] dark:text-[#F5F7F2] focus:border-[#179955] focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setRollbackPrompt(false)} disabled={rollbackBusy}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              loading={rollbackBusy}
              disabled={!rollbackReason.trim()}
              onClick={handleRollbackDraw}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              تأكيد التراجع عن القرعة
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  )
}
