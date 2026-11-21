import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeftRight,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  History,
  Lock,
  MoveRight,
  Redo2,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Swords,
  Trash2,
  Undo2,
  UserCheck,
  Users,
  Wand2,
  X,
} from 'lucide-react'
import api from '../../../../api/client'
import { Button, Modal } from '../../../../components/dashboard/ui'
import { useToast } from '../../../../components/ui/Toast'
import { toastApiError } from '../../../../lib/errors'
import { TeamAvatar } from '../../../tournaments/shared'
import { formatGroupName } from '../../../../lib/groupNames'

/**
 * Constraint-Aware Deadlock Solver
 * Verifies whether the remaining unassigned teams can complete the remaining empty slots
 * without violating Rule 1 (Different groups) and Rule 2 (1st place vs 2nd place).
 */
function isDrawSolvable(fixtures, currentAssignments, teamMap, qualifiedTeams) {
  const assigned = new Set()
  for (const f of fixtures) {
    const pair = currentAssignments[f.id] || {}
    if (pair.home) assigned.add(pair.home)
    if (pair.away) assigned.add(pair.away)
  }

  const remR1 = qualifiedTeams.filter((t) => !assigned.has(t.team_id) && t.rank === 1)
  const remR2 = qualifiedTeams.filter((t) => !assigned.has(t.team_id) && t.rank === 2)

  function backtrack(idx, r1, r2) {
    if (idx >= fixtures.length) return true
    const f = fixtures[idx]
    const pair = currentAssignments[f.id] || {}
    const tHome = pair.home ? teamMap[pair.home] : null
    const tAway = pair.away ? teamMap[pair.away] : null

    // Both slots already assigned in this match
    if (tHome && tAway) {
      return backtrack(idx + 1, r1, r2)
    }

    const fixed = tHome || tAway
    if (fixed) {
      if (fixed.rank === 1) {
        // Needs a rank 2 opponent
        for (let i = 0; i < r2.length; i++) {
          if (r2[i].group_id !== fixed.group_id) {
            const nextR2 = r2.filter((_, k) => k !== i)
            if (backtrack(idx + 1, r1, nextR2)) return true
          }
        }
        return false
      } else {
        // Needs a rank 1 opponent
        for (let i = 0; i < r1.length; i++) {
          if (r1[i].group_id !== fixed.group_id) {
            const nextR1 = r1.filter((_, k) => k !== i)
            if (backtrack(idx + 1, nextR1, r2)) return true
          }
        }
        return false
      }
    } else {
      // Both slots empty in this match: pair one from r1 and one from r2
      for (let i = 0; i < r1.length; i++) {
        for (let j = 0; j < r2.length; j++) {
          if (r1[i].group_id !== r2[j].group_id) {
            const nextR1 = r1.filter((_, k) => k !== i)
            const nextR2 = r2.filter((_, k) => k !== j)
            if (backtrack(idx + 1, nextR1, nextR2)) return true
          }
        }
      }
      return false
    }
  }

  return backtrack(0, remR1, remR2)
}

export default function KnockoutDrawModal({ open, onClose, tournament, onConfirmed }) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [data, setData] = useState(null)
  const [drawMode, setDrawMode] = useState('manual') // 'manual' | 'automatic'
  const [preventSameGroup, setPreventSameGroup] = useState(true)
  const [requireFirstVsSecond, setRequireFirstVsSecond] = useState(true)
  const [assignments, setAssignments] = useState({}) // { [fixtureId]: { home: teamId, away: teamId } }
  const [selectedTeam, setSelectedTeam] = useState(null)
  const [confirmPrompt, setConfirmPrompt] = useState(false)
  const [reviewMode, setReviewMode] = useState(false)
  const [autoDrawConfirm, setAutoDrawConfirm] = useState(false)

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

      // Initialize assignments from existing fixtures or virtual slots
      const initial = {}
      const existingFixtures = d.fixtures || []
      if (existingFixtures.length > 0) {
        existingFixtures.forEach((f) => {
          initial[f.id] = {
            home: f.home_team_id || null,
            away: f.away_team_id || null,
          }
        })
      } else {
        // Fallback virtual fixtures slots
        const qCount = Math.max(Math.ceil((d.qualified_teams?.length || 8) / 2), 4)
        for (let i = 1; i <= qCount; i++) {
          initial[i] = { home: null, away: null }
        }
      }

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
      setReviewMode(false)
    }
  }, [open, tournament.id])

  const qualifiedTeams = data?.qualified_teams || []
  const rawFixtures = data?.fixtures || []
  const drawStatus = data?.draw_status || 'pending'
  const isConfirmed = drawStatus === 'confirmed'
  const groupStageDetails = data?.group_stage_details || null

  // Ensure effective fixtures are NEVER empty so destination slots are ALWAYS visible!
  const effectiveFixtures = useMemo(() => {
    if (rawFixtures && rawFixtures.length > 0) {
      return rawFixtures
    }
    const matchCount = Math.max(Math.ceil((qualifiedTeams.length || 8) / 2), 4)
    return Array.from({ length: matchCount }, (_, idx) => ({
      id: idx + 1,
      isVirtual: true,
      home_team_id: null,
      away_team_id: null,
      home_team: null,
      away_team: null,
    }))
  }, [rawFixtures, qualifiedTeams.length])

  // Only consider real incomplete groups (strictly > 0 remaining AND > 0 total)
  const realIncomplete = useMemo(() => {
    return (groupStageDetails?.incomplete_groups || []).filter(
      (grp) => (Number(grp.remaining_matches) || 0) > 0 && (Number(grp.total_matches) || 0) > 0,
    )
  }, [groupStageDetails])

  const isGroupStageComplete = realIncomplete.length === 0

  // Map team by id for quick lookup
  const teamMap = useMemo(() => {
    const map = {}
    qualifiedTeams.forEach((team) => {
      map[team.team_id] = team
    })
    return map
  }, [qualifiedTeams])

  // List of assigned team IDs
  const assignedIds = useMemo(() => {
    const set = new Set()
    Object.values(assignments).forEach((pair) => {
      if (pair.home) set.add(pair.home)
      if (pair.away) set.add(pair.away)
    })
    return set
  }, [assignments])

  // Split into Pot 1 (Rank 1) and Pot 2 (Rank 2)
  const pot1Teams = useMemo(() => {
    return qualifiedTeams.filter((t) => t.rank === 1)
  }, [qualifiedTeams])

  const pot2Teams = useMemo(() => {
    return qualifiedTeams.filter((t) => t.rank === 2)
  }, [qualifiedTeams])

  // Unassigned counts
  const unassignedTeams = qualifiedTeams.filter((tm) => !assignedIds.has(tm.team_id))
  const filledSlots = assignedIds.size
  const totalSlots = effectiveFixtures.length * 2
  const remainingCount = Math.max(0, totalSlots - filledSlots)

  // Completed matchups count
  const completedMatchups = useMemo(() => {
    return effectiveFixtures.filter((f) => assignments[f.id]?.home && assignments[f.id]?.away).length
  }, [effectiveFixtures, assignments])

  // Slot assignment click handler with Deadlock & Constraint checking
  const handleSlotClick = (fixtureId, side) => {
    if (isConfirmed) return

    const currentTeamId = assignments[fixtureId]?.[side]

    if (selectedTeam) {
      const otherSide = side === 'home' ? 'away' : 'home'
      const opponentId = assignments[fixtureId]?.[otherSide]
      const opponent = opponentId ? teamMap[opponentId] : null

      // Check Rule 1: Prevent same group
      if (preventSameGroup && opponent && opponent.group_id && selectedTeam.group_id) {
        if (opponent.group_id === selectedTeam.group_id) {
          toast.error(
            `مخالفة اللائحة (القاعدة 1): لا يمكن مواجهة فريقين من نفس المجموعة (${formatGroupName(selectedTeam.group_name, { groupId: selectedTeam.group_id, tournamentId: tournament?.id })}) في ربع النهائي!`,
          )
          return
        }
      }

      // Check Rule 2: 1st place vs 2nd place
      if (requireFirstVsSecond && opponent && opponent.rank && selectedTeam.rank) {
        if (opponent.rank === selectedTeam.rank) {
          const rankLabel = selectedTeam.rank === 1 ? 'متصدرين لمجموعتيهما' : 'وصيفين لمجموعتيهما'
          toast.error(
            `مخالفة اللائحة (القاعدة 2): لا يمكن مواجهة فريقين ${rankLabel} — تنص اللائحة على مواجهة متصدر مجموعة لوصيف مجموعة أخرى!`,
          )
          return
        }
      }

      // Candidate next assignment state
      const nextAssignments = {
        ...assignments,
        [fixtureId]: {
          ...assignments[fixtureId],
          [side]: selectedTeam.team_id,
        },
      }

      // Mathematical Deadlock / Look-ahead check
      const solvable = isDrawSolvable(effectiveFixtures, nextAssignments, teamMap, qualifiedTeams)
      if (!solvable) {
        toast.error(
          'تعذر هذا التسكين (انغلاق رياضي): هذا التسكين يجعل إكمال القرعة للفرق المتبقية مستحيلاً دون مخالفة قاعدة منع مواجهة فريقي نفس المجموعة!',
        )
        return
      }

      // Apply assignment
      pushHistory(nextAssignments)
      setSelectedTeam(null)
    } else if (currentTeamId) {
      // Clicked an occupied slot: remove team back to unassigned pool
      const nextAssignments = {
        ...assignments,
        [fixtureId]: {
          ...assignments[fixtureId],
          [side]: null,
        },
      }
      pushHistory(nextAssignments)
    }
  }

  // HTML5 Drag & Drop Support (Desktop)
  const handleDragStart = (e, team) => {
    if (isConfirmed || assignedIds.has(team.team_id)) {
      e.preventDefault()
      return
    }
    e.dataTransfer.setData('text/plain', JSON.stringify(team))
    setSelectedTeam(team)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDropOnSlot = (e, fixtureId, side) => {
    e.preventDefault()
    try {
      const dataStr = e.dataTransfer.getData('text/plain')
      if (!dataStr) return
      const team = JSON.parse(dataStr)
      if (team && team.team_id) {
        setSelectedTeam(team)
        setTimeout(() => handleSlotClick(fixtureId, side), 10)
      }
    } catch (err) {
      // Ignore parse errors
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
    effectiveFixtures.forEach((f) => {
      cleared[f.id] = { home: null, away: null }
    })
    pushHistory(cleared)
    setSelectedTeam(null)
    setClearConfirm(false)
    toast.info('تم إفراغ خانات القرعة المسودة')
  }

  // Generate Automatic Group-Based Draw Proposal
  const handleGenerateAutoDraw = async () => {
    if (filledSlots > 0 && !autoDrawConfirm) {
      setAutoDrawConfirm(true)
      return
    }

    setAutoDrawConfirm(false)
    setBusy(true)
    try {
      let proposalAssignments = null

      // Attempt backend API proposal
      try {
        const res = await api.post(`/committee/tournaments/${tournament.id}/bracket/auto-draw-proposal`)
        proposalAssignments = res.data.data?.assignments
      } catch (err) {
        // Fallback: client-side automatic pairing algorithm
        const activeGroupIds = Array.from(new Set(qualifiedTeams.map((t) => t.group_id).filter(Boolean)))
        activeGroupIds.sort((a, b) => a - b)

        const groupList = []
        for (const gId of activeGroupIds) {
          const inGroup = qualifiedTeams.filter((t) => t.group_id === gId)
          const r1 = inGroup.find((t) => t.rank === 1)
          const r2 = inGroup.find((t) => t.rank === 2)
          if (r1 && r2) {
            groupList.push({ winner: r1, runner_up: r2 })
          }
        }

        const matchups = []
        for (let i = 0; i < groupList.length; i += 2) {
          if (i + 1 < groupList.length) {
            matchups.push({ home_team: groupList[i].winner, away_team: groupList[i + 1].runner_up })
            matchups.push({ home_team: groupList[i + 1].winner, away_team: groupList[i].runner_up })
          } else {
            matchups.push({ home_team: groupList[i].winner, away_team: groupList[i].runner_up })
          }
        }

        proposalAssignments = matchups.map((m, idx) => ({
          home_team_id: m.home_team.team_id,
          away_team_id: m.away_team.team_id,
        }))
      }

      if (proposalAssignments && proposalAssignments.length > 0) {
        const newAssignments = {}
        effectiveFixtures.forEach((f, idx) => {
          const p = proposalAssignments[idx]
          newAssignments[f.id] = {
            home: p?.home_team_id || null,
            away: p?.away_team_id || null,
          }
        })
        pushHistory(newAssignments)
        toast.success('تم إنشاء التوزيع التلقائي حسب المجموعات بنجاح (مسودة قابلة للتعديل والاعتماد)!')
      }
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  // Full validation check for confirmation
  const validationErrors = []
  effectiveFixtures.forEach((f, idx) => {
    const pair = assignments[f.id] || { home: null, away: null }
    const matchLabel = `المباراة QF${idx + 1}`

    if (pair.home && pair.away) {
      const tmHome = teamMap[pair.home]
      const tmAway = teamMap[pair.away]

      if (preventSameGroup && tmHome?.group_id && tmAway?.group_id && tmHome.group_id === tmAway.group_id) {
        validationErrors.push(`${matchLabel}: (${tmHome.name}) و (${tmAway.name}) من نفس المجموعة`)
      }

      if (requireFirstVsSecond && tmHome?.rank && tmAway?.rank && tmHome.rank === tmAway.rank) {
        const rankTxt = tmHome.rank === 1 ? 'متصدرين' : 'وصيفين'
        validationErrors.push(`${matchLabel}: مواجهة بين ${rankTxt} (يجب متصدر ضد وصيف)`)
      }
    }
  })

  const isComplete =
    filledSlots === totalSlots &&
    totalSlots > 0 &&
    validationErrors.length === 0 &&
    isGroupStageComplete

  // Confirm draw submission
  const handleConfirmDraw = async () => {
    if (!isComplete || busy) return

    setBusy(true)
    try {
      // If fixtures are virtual, generate bracket first
      let activeFixtures = rawFixtures
      if (!activeFixtures || activeFixtures.length === 0) {
        await api.post(`/committee/tournaments/${tournament.id}/bracket`)
        const refreshRes = await api.get(`/committee/tournaments/${tournament.id}/bracket/draw-teams`)
        activeFixtures = refreshRes.data.data?.fixtures || []
      }

      if (activeFixtures.length === 0) {
        throw new Error('تعذر إيجاد مباريات الدور الأول لتثبيت القرعة فيها')
      }

      // Map assignments to actual fixture IDs
      const payloadAssignments = activeFixtures.map((f, idx) => {
        const key = f.id in assignments ? f.id : effectiveFixtures[idx]?.id
        const pair = assignments[key] || { home: null, away: null }
        return {
          fixture_id: f.id,
          home_team_id: pair.home,
          away_team_id: pair.away,
        }
      })

      await api.post(`/committee/tournaments/${tournament.id}/bracket/confirm-draw`, {
        assignments: payloadAssignments,
        prevent_same_group_r1: preventSameGroup,
        reason:
          drawMode === 'automatic'
            ? 'اعتماد القرعة التلقائية حسب المجموعات المتجاورة (القواعد 1 و 2)'
            : 'اعتماد القرعة اليدوية الموجهة (القواعد 1 و 2)',
      })

      toast.success('تم اعتماد القرعة الإقصائية وتثبيت مباريات ربع النهائي بنجاح!')
      setConfirmPrompt(false)
      setReviewMode(false)
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
      title="منظومة قرعة الأدوار الإقصائية (خروج المغلوب)"
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
                    : 'bg-emerald-500/15 text-[#179955] dark:bg-emerald-400/20 dark:text-[#42D889]'
                }`}
              >
                {isConfirmed ? <Lock className="size-5" /> : <Shuffle className="size-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                    ربع النهائي (Quarter-Finals)
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      isConfirmed
                        ? 'bg-[#179955]/15 text-[#179955] dark:text-[#42D889]'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {isConfirmed ? 'معتمدة ومجمدة' : 'مسودة قيد التوزيع'}
                  </span>
                </div>
                <p className="text-xs text-[#65706A] dark:text-[#B2B9B3]">
                  {isConfirmed
                    ? `تم اعتماد هذه القرعة رسمياً في ${new Date(data?.draw_confirmed_at).toLocaleDateString('ar-MA')}`
                    : 'حدد وضع القرعة المناسب (يدوية أو تلقائية) لتوزيع الفرق في خانات ربع النهائي.'}
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
                    مسح التوزيع
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

          {/* TWO DRAW MODES: Top Segmented Selector */}
          {!isConfirmed && (
            <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-3 shadow-2xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {/* Mode A: Manual Draw */}
                <button
                  type="button"
                  onClick={() => setDrawMode('manual')}
                  className={`flex items-start gap-3 rounded-xl p-3 text-start transition ${
                    drawMode === 'manual'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-[#179955] ring-2 ring-[#179955]/20'
                      : 'bg-[#F7F8F5] dark:bg-[#252B27] border border-transparent hover:border-[#E1E5DF] dark:hover:border-[#303832]'
                  }`}
                >
                  <div
                    className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                      drawMode === 'manual'
                        ? 'bg-[#179955] text-white'
                        : 'bg-white dark:bg-[#1B201D] text-[#65706A]'
                    }`}
                  >
                    <Shuffle className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-[#111313] dark:text-[#F5F7F2]">
                        القرعة اليدوية
                      </span>
                      {drawMode === 'manual' && (
                        <span className="rounded-full bg-[#179955] px-1.5 py-0.2 text-[9px] font-bold text-white">
                          مفعلة
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#65706A] dark:text-[#B2B9B3]">
                      اختر الفرق بنفسك وحدد المواجهات داخل الشجرة يدوياً.
                    </p>
                  </div>
                </button>

                {/* Mode B: Automatic Group-Based Draw */}
                <button
                  type="button"
                  onClick={() => setDrawMode('automatic')}
                  className={`flex items-start gap-3 rounded-xl p-3 text-start transition ${
                    drawMode === 'automatic'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-[#179955] ring-2 ring-[#179955]/20'
                      : 'bg-[#F7F8F5] dark:bg-[#252B27] border border-transparent hover:border-[#E1E5DF] dark:hover:border-[#303832]'
                  }`}
                >
                  <div
                    className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                      drawMode === 'automatic'
                        ? 'bg-[#179955] text-white'
                        : 'bg-white dark:bg-[#1B201D] text-[#65706A]'
                    }`}
                  >
                    <Wand2 className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-black text-[#111313] dark:text-[#F5F7F2]">
                        القرعة التلقائية حسب المجموعات
                      </span>
                      {drawMode === 'automatic' && (
                        <span className="rounded-full bg-[#179955] px-1.5 py-0.2 text-[9px] font-bold text-white">
                          مفعلة
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#65706A] dark:text-[#B2B9B3]">
                      يقوم النظام بتوزيع المتصدرين لمواجهة أوصيف المجموعات المجاورة تلقائياً.
                    </p>
                  </div>
                </button>
              </div>

              {/* Automatic Mode Action Bar */}
              {drawMode === 'automatic' && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F7F8F5] dark:bg-[#252B27] p-2.5">
                  <div className="flex items-center gap-2 text-[11px] text-[#65706A] dark:text-[#B2B9B3]">
                    <Sparkles className="size-4 text-[#179955] shrink-0" />
                    <span>
                      التوزيع التلقائي يتبع القواعد الرسمية: متصدر ضد وصيف وتفادي فريقي نفس المجموعة.
                    </span>
                  </div>
                  <Button
                    size="xs"
                    variant="primary"
                    loading={busy}
                    onClick={handleGenerateAutoDraw}
                  >
                    <Wand2 className="size-3.5" />
                    إنشاء التوزيع التلقائي
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Section C: PROGRESS & STATUS INDICATOR */}
          <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-3.5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-[#111313] dark:text-[#F5F7F2]">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="size-4 text-[#179955]" />
                حالة توزيع الفرق: تم توزيع {filledSlots} من {totalSlots} فرق
              </span>
              <span className="text-xs font-black text-[#179955]">
                {Math.round((filledSlots / Math.max(1, totalSlots)) * 100)}%
              </span>
            </div>
            {/* Progress Bar */}
            <div className="h-2 w-full overflow-hidden rounded-full bg-[#E1E5DF] dark:bg-[#303832]">
              <div
                className="h-full bg-[#179955] transition-all duration-300"
                style={{ width: `${Math.min(100, Math.round((filledSlots / Math.max(1, totalSlots)) * 100))}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-[#65706A] dark:text-[#B2B9B3] pt-0.5">
              <span>الفرق المتبقية في الأوعية: <b className="text-amber-600 dark:text-amber-400">{remainingCount}</b></span>
              <span>المواجهات المكتملة: <b className="text-[#179955] dark:text-[#42D889]">{completedMatchups} من {effectiveFixtures.length}</b></span>
            </div>
          </div>

          {/* Rules Banner */}
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 px-3.5 py-2.5 text-xs text-blue-900 dark:text-blue-300">
            <ShieldCheck className="size-4 shrink-0 text-blue-600" />
            <div className="flex-1 space-y-0.5 text-[11px]">
              <span className="font-black">قواعد القرعة الصارمة: </span>
              <span>(القاعدة 1) منع مواجهة فريقي نفس المجموعة • (القاعدة 2) يلتقي متصدر المجموعة بوصيف مجموعة أخرى • (حماية الانغلاق الرياضي مفعّلة).</span>
            </div>
          </div>

          {/* Validation Warnings */}
          {validationErrors.length > 0 && (
            <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-3 text-xs text-red-600 dark:text-red-400">
              <div className="flex items-center gap-2 font-bold">
                <AlertTriangle className="size-4 shrink-0" />
                <span>مخالفات في تسكين القرعة:</span>
              </div>
              <ul className="mt-1 list-inside list-disc space-y-0.5 pe-4">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* AREA A: QUALIFIED TEAMS POOL (Vertical & Touch/Drag-Friendly) */}
          {!isConfirmed && (
            <div className="space-y-3 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3.5 sm:p-4">
              <div className="flex items-center justify-between text-xs font-bold text-[#111313] dark:text-[#F5F7F2]">
                <span className="flex items-center gap-1.5">
                  <Users className="size-4 text-[#179955]" />
                  المنطقة أ — الفرق المتأهلة ({unassignedTeams.length} متبقي في الوعاء):
                </span>
                {selectedTeam ? (
                  <span className="text-[#179955] dark:text-[#42D889] animate-pulse">
                    محدد: {selectedTeam.name} ({selectedTeam.rank === 1 ? 'متصدر' : 'وصيف'}) — انقر على الخانة المطلوبة في ربع النهائي
                  </span>
                ) : (
                  <span className="text-[11px] text-[#65706A] dark:text-[#B2B9B3]">
                    اسحب الفريق أو اضغط عليه لتحديده ثم اضغط على الخانة الفارغة
                  </span>
                )}
              </div>

              {/* Pot 1: Group Winners (Rank 1) */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#65706A] dark:text-[#B2B9B3]">
                  الوعاء 1 — أبطال المجموعات (المركز الأول):
                </span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {pot1Teams.map((team) => {
                    const isAssigned = assignedIds.has(team.team_id)
                    const isSelected = selectedTeam?.team_id === team.team_id

                    return (
                      <div
                        key={team.team_id}
                        draggable={!isAssigned && !isConfirmed}
                        onDragStart={(e) => handleDragStart(e, team)}
                        onClick={() => {
                          if (isAssigned) return
                          setSelectedTeam(isSelected ? null : team)
                        }}
                        className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition text-start select-none ${
                          isAssigned
                            ? 'opacity-40 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                            : isSelected
                            ? 'border-[#179955] bg-[#179955]/15 text-[#179955] ring-2 ring-[#179955]/30 cursor-pointer'
                            : 'border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] hover:border-[#179955] cursor-grab'
                        }`}
                      >
                        <TeamAvatar team={team} className="size-7 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-black">{team.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="rounded bg-emerald-100 dark:bg-emerald-900/40 px-1 py-0.2 text-[9px] font-bold text-emerald-800 dark:text-emerald-300">
                              بطل
                            </span>
                            <span className="text-[10px] text-[#65706A] dark:text-[#B2B9B3]">
                              {formatGroupName(team.group_name, { groupId: team.group_id, tournamentId: tournament?.id })}
                            </span>
                          </div>
                        </div>
                        {isAssigned && (
                          <Check className="size-3.5 text-emerald-600 shrink-0" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Pot 2: Group Runners-up (Rank 2) */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-[#65706A] dark:text-[#B2B9B3]">
                  الوعاء 2 — أوصياء المجموعات (المركز الثاني):
                </span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {pot2Teams.map((team) => {
                    const isAssigned = assignedIds.has(team.team_id)
                    const isSelected = selectedTeam?.team_id === team.team_id

                    return (
                      <div
                        key={team.team_id}
                        draggable={!isAssigned && !isConfirmed}
                        onDragStart={(e) => handleDragStart(e, team)}
                        onClick={() => {
                          if (isAssigned) return
                          setSelectedTeam(isSelected ? null : team)
                        }}
                        className={`flex items-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition text-start select-none ${
                          isAssigned
                            ? 'opacity-40 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-not-allowed'
                            : isSelected
                            ? 'border-blue-600 bg-blue-50 dark:bg-blue-950/30 text-blue-700 ring-2 ring-blue-500/30 cursor-pointer'
                            : 'border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] hover:border-blue-500 cursor-grab'
                        }`}
                      >
                        <TeamAvatar team={team} className="size-7 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-black">{team.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="rounded bg-blue-100 dark:bg-blue-900/40 px-1 py-0.2 text-[9px] font-bold text-blue-800 dark:text-blue-300">
                              وصيف
                            </span>
                            <span className="text-[10px] text-[#65706A] dark:text-[#B2B9B3]">
                              {formatGroupName(team.group_name, { groupId: team.group_id, tournamentId: tournament?.id })}
                            </span>
                          </div>
                        </div>
                        {isAssigned && (
                          <Check className="size-3.5 text-blue-600 shrink-0" />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* AREA B: FIRST-ROUND MATCH SLOTS (Visible & Interactive Destination Positions) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-[#111313] dark:text-[#F5F7F2] flex items-center gap-1.5">
                <Swords className="size-4 text-[#179955]" />
                المنطقة ب — خانات مباريات ربع النهائي ({effectiveFixtures.length} مواجهات):
              </h4>
              <button
                type="button"
                onClick={() => setReviewMode(!reviewMode)}
                className="flex items-center gap-1 text-xs font-bold text-[#179955] hover:underline"
              >
                <Eye className="size-3.5" />
                {reviewMode ? 'إخفاء جدول المعاينة' : 'مراجعة جدول القرعة'}
              </button>
            </div>

            {/* Match Slots Grid */}
            <div className="grid gap-3 sm:grid-cols-2">
              {effectiveFixtures.map((fixture, idx) => {
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

                const isSameRankConflict =
                  requireFirstVsSecond &&
                  homeTeam &&
                  awayTeam &&
                  homeTeam.rank &&
                  awayTeam.rank &&
                  homeTeam.rank === awayTeam.rank

                const isCompleted = homeTeam && awayTeam && !isSameGroupConflict && !isSameRankConflict

                return (
                  <div
                    key={fixture.id}
                    className={`relative rounded-2xl border p-3.5 transition ${
                      isSameGroupConflict || isSameRankConflict
                        ? 'border-red-400 bg-red-50/50 dark:border-red-800 dark:bg-red-950/20'
                        : isCompleted
                        ? 'border-emerald-300 dark:border-emerald-900/60 bg-white dark:bg-[#1B201D] shadow-sm'
                        : 'border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D]'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between text-[11px] text-[#65706A] dark:text-[#B2B9B3]">
                      <div className="flex items-center gap-1.5">
                        <span className="rounded-lg bg-[#F7F8F5] dark:bg-[#252B27] px-2 py-0.5 font-black text-[#111313] dark:text-[#F5F7F2]">
                          QF{idx + 1}
                        </span>
                        <span className="font-bold">المباراة {idx + 1} (ربع النهائي)</span>
                      </div>

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
                      {/* Home Team Slot (Slot A) */}
                      <div
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnSlot(e, fixture.id, 'home')}
                        onClick={() => handleSlotClick(fixture.id, 'home')}
                        className={`flex items-center justify-between rounded-xl border p-2.5 text-xs transition ${
                          isConfirmed ? 'cursor-default' : 'cursor-pointer'
                        } ${
                          homeTeam
                            ? 'border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] font-bold text-[#111313] dark:text-[#F5F7F2]'
                            : selectedTeam && selectedTeam.rank === 1
                            ? 'border-dashed border-[#179955] bg-emerald-50/50 dark:bg-emerald-950/20 text-[#179955] ring-2 ring-[#179955]/30'
                            : 'border-dashed border-[#E1E5DF] dark:border-[#303832] bg-transparent text-[#65706A] hover:border-[#179955]'
                        }`}
                      >
                        {homeTeam ? (
                          <div className="flex items-center gap-2 min-w-0">
                            <TeamAvatar team={homeTeam} className="size-6 shrink-0" />
                            <div className="min-w-0">
                              <p className="truncate font-black">{homeTeam.name}</p>
                              <div className="flex items-center gap-1 text-[10px] text-[#65706A] dark:text-[#B2B9B3]">
                                <span>{formatGroupName(homeTeam.group_name, { groupId: homeTeam.group_id, tournamentId: tournament?.id })}</span>
                                <span className="font-bold">({homeTeam.rank === 1 ? 'متصدر' : 'وصيف'})</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 py-1 text-xs">
                            <span className="font-bold">الخانة 1 (متصدر):</span>
                            <span>{selectedTeam ? 'اضغط لتسكين الفريق هنا' : 'اسحب أو اضغط للتسكين'}</span>
                          </div>
                        )}
                        {!isConfirmed && homeTeam && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSlotClick(fixture.id, 'home')
                            }}
                            className="text-[#65706A] hover:text-red-500 p-1"
                            title="إزالة الفريق من الخانة"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>

                      {/* VS Divider */}
                      <div className="flex items-center justify-center">
                        <span className="rounded-full bg-[#F7F8F5] dark:bg-[#252B27] px-2.5 py-0.5 text-[10px] font-bold text-[#65706A]">
                          ضد
                        </span>
                      </div>

                      {/* Away Team Slot (Slot B) */}
                      <div
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDropOnSlot(e, fixture.id, 'away')}
                        onClick={() => handleSlotClick(fixture.id, 'away')}
                        className={`flex items-center justify-between rounded-xl border p-2.5 text-xs transition ${
                          isConfirmed ? 'cursor-default' : 'cursor-pointer'
                        } ${
                          awayTeam
                            ? 'border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] font-bold text-[#111313] dark:text-[#F5F7F2]'
                            : selectedTeam && selectedTeam.rank === 2
                            ? 'border-dashed border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 text-blue-600 ring-2 ring-blue-500/30'
                            : 'border-dashed border-[#E1E5DF] dark:border-[#303832] bg-transparent text-[#65706A] hover:border-blue-500'
                        }`}
                      >
                        {awayTeam ? (
                          <div className="flex items-center gap-2 min-w-0">
                            <TeamAvatar team={awayTeam} className="size-6 shrink-0" />
                            <div className="min-w-0">
                              <p className="truncate font-black">{awayTeam.name}</p>
                              <div className="flex items-center gap-1 text-[10px] text-[#65706A] dark:text-[#B2B9B3]">
                                <span>{formatGroupName(awayTeam.group_name, { groupId: awayTeam.group_id, tournamentId: tournament?.id })}</span>
                                <span className="font-bold">({awayTeam.rank === 1 ? 'متصدر' : 'وصيف'})</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 py-1 text-xs">
                            <span className="font-bold">الخانة 2 (وصيف):</span>
                            <span>{selectedTeam ? 'اضغط لتسكين الفريق هنا' : 'اسحب أو اضغط للتسكين'}</span>
                          </div>
                        )}
                        {!isConfirmed && awayTeam && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleSlotClick(fixture.id, 'away')
                            }}
                            className="text-[#65706A] hover:text-red-500 p-1"
                            title="إزالة الفريق من الخانة"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isSameGroupConflict && (
                      <p className="mt-2 text-center text-[10px] font-bold text-red-500">
                        ⚠️ مخالفة: الفريقان من نفس المجموعة ({formatGroupName(homeTeam.group_name, { groupId: homeTeam.group_id, tournamentId: tournament?.id })})
                      </p>
                    )}
                    {isSameRankConflict && (
                      <p className="mt-2 text-center text-[10px] font-bold text-red-500">
                        ⚠️ مخالفة: مواجهة بين فريقين من نفس الترتيب ({homeTeam.rank === 1 ? 'متصدرين' : 'وصيفين'})
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Section D: REVIEW TABLE / DRAWER (If review mode active) */}
          {reviewMode && (
            <div className="rounded-2xl border border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-4 space-y-3">
              <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="size-4" />
                جدول مراجعة مواجهات ربع النهائي قبل الاعتماد:
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-start text-xs">
                  <thead>
                    <tr className="border-b border-emerald-200 dark:border-emerald-900/40 text-[11px] text-[#65706A]">
                      <th className="py-2 pe-3 text-start">المباراة</th>
                      <th className="py-2 pe-3 text-start">الفريق الأول (المستضيف)</th>
                      <th className="py-2 pe-3 text-center">ضد</th>
                      <th className="py-2 pe-3 text-start">الفريق الثاني (الضيف)</th>
                      <th className="py-2 pe-3 text-start">طريقة القرعة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-emerald-100 dark:divide-emerald-900/20">
                    {effectiveFixtures.map((f, idx) => {
                      const pair = assignments[f.id] || {}
                      const h = pair.home ? teamMap[pair.home] : null
                      const a = pair.away ? teamMap[pair.away] : null
                      return (
                        <tr key={f.id} className="font-bold">
                          <td className="py-2.5 pe-3 font-black text-[#111313] dark:text-[#F5F7F2]">QF{idx + 1}</td>
                          <td className="py-2.5 pe-3">
                            {h ? (
                              <div className="flex items-center gap-1.5">
                                <TeamAvatar team={h} className="size-5 shrink-0" />
                                <span>{h.name}</span>
                                <span className="text-[10px] text-[#65706A]">({formatGroupName(h.group_name, { groupId: h.group_id, tournamentId: tournament?.id })})</span>
                              </div>
                            ) : (
                              <span className="text-amber-600">فارغة</span>
                            )}
                          </td>
                          <td className="py-2.5 pe-3 text-center text-[#65706A]">VS</td>
                          <td className="py-2.5 pe-3">
                            {a ? (
                              <div className="flex items-center gap-1.5">
                                <TeamAvatar team={a} className="size-5 shrink-0" />
                                <span>{a.name}</span>
                                <span className="text-[10px] text-[#65706A]">({formatGroupName(a.group_name, { groupId: a.group_id, tournamentId: tournament?.id })})</span>
                              </div>
                            ) : (
                              <span className="text-amber-600">فارغة</span>
                            )}
                          </td>
                          <td className="py-2.5 pe-3 text-[11px] text-[#65706A]">
                            {drawMode === 'automatic' ? 'تلقائية حسب المجموعات' : 'يدوية موجهة'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Section E: ACTIONS (Sticky Bottom Bar) */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#E1E5DF] dark:border-[#303832] pt-4">
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
                اعتماد وتثبيت القرعة رسمياً ({filledSlots}/{totalSlots})
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
        title="تأكيد اعتماد قرعة ربع النهائي الرسمية"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-5 shrink-0" />
            <p>
              سيتم تثبيت هذه المواجهات الأربع (QF1 إلى QF4) رسمياً وتوليد مباريات الدور الأول في السلم الإقصائي. لن يمكن تعديل القرعة بعد انطلاق المباريات.
            </p>
          </div>
          <p className="text-xs text-[#65706A] dark:text-[#B2B9B3]">
            هل راجعت كافة المواجهات وتحققت من استيفاء القواعد واللوائح وتود اعتمادها الآن؟
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

      {/* Auto-Draw Replace Confirmation Modal */}
      <Modal
        open={autoDrawConfirm}
        onClose={() => setAutoDrawConfirm(false)}
        size="sm"
        title="تأكيد استبدال التوزيع بالتلقائي"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/20 p-3 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="size-5 shrink-0" />
            <p>
              سيؤدي هذا الإجراء إلى استبدال الخانات المسكنة حالياً بتوزيع تلقائي جديد حسب ترتيب المجموعات المجاورة.
            </p>
          </div>
          <p className="text-xs text-[#65706A] dark:text-[#B2B9B3]">
            هل تريد المتابعة وتوليد التوزيع التلقائي الآن؟
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setAutoDrawConfirm(false)}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setAutoDrawConfirm(false)
                handleGenerateAutoDraw()
              }}
            >
              نعم، توليد التوزيع التلقائي
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
            هل أنت متأكد من رغبتك في إفراغ كافة الخانات المسكنة وإعادة الفرق إلى الأوعية؟
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
