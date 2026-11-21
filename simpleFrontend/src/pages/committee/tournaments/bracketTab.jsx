import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  Eye,
  Info,
  Layers,
  Lock,
  Network,
  Play,
  RefreshCw,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Shuffle,
  Sparkles,
  Swords,
  Trophy,
  UserCheck,
  Users,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Button, Empty, Modal, Skeleton } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import CommitteeBracket from '../../../domains/committee/components/CommitteeBracket'
import KnockoutOptionModal from '../../../domains/committee/components/KnockoutOptionModal'
import KnockoutDrawModal from './draw/KnockoutDrawModal'
import DisciplinaryModal from './DisciplinaryModal'
import TournamentStageBar from '../../../components/tournaments/TournamentStageBar'
import { ODD_KO_OPTIONS, ODD_KO_TITLE_KEYS } from '../../../domains/committee/lib/knockoutOptions'
import { formatGroupName } from '../../../lib/groupNames'
import { TeamAvatar } from '../../tournaments/shared'

const WORKFLOW_STEPS = [
  { id: 1, title: 'المتأهلون', desc: 'اكتمال دور المجموعات (8 فرق)' },
  { id: 2, title: 'إعداد السلم', desc: 'هيكل أدوار ربع ونصف والنهائي' },
  { id: 3, title: 'القرعة اليدوية', desc: 'تسكين مواجهات ربع النهائي (QF1..QF4)' },
  { id: 4, title: 'الاعتماد والتثبيت', desc: 'تجميد القرعة وتوليد المباريات' },
  { id: 5, title: 'المباريات والانضباط', desc: 'سير المواجهات والرقابة' },
  { id: 6, title: 'التتويج وبطل الدوري', desc: 'تأكيد البطل واختتام السلم' },
]

export default function BracketTab({ tournament, refresh, refreshKey, setActive }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [busy, setBusy] = useState(null)
  const [optionModal, setOptionModal] = useState(false)
  const [drawModal, setDrawModal] = useState(false)
  const [disciplinaryModal, setDisciplinaryModal] = useState(false)
  const [oddChoice, setOddChoice] = useState(false)
  const [invalidNotice, setInvalidNotice] = useState(null)

  // Bidirectional Navigation State: null means track actualCurrentStep automatically
  const [activeNavStep, setActiveNavStep] = useState(null)
  const [destructivePrompt, setDestructivePrompt] = useState(null)

  const hasKnockout = !['groups_only', 'league'].includes(tournament.tournament_format)
  const bracketUrl = `/committee/tournaments/${tournament.id}/bracket`

  const { data, loading, refetch } = useApi(
    () => api.get(bracketUrl).then((r) => r.data),
    [tournament.id, refreshKey],
    { enabled: hasKnockout },
  )

  const { data: validation } = useApi(
    () => api.get(`${bracketUrl}/validation`).then((r) => r.data.data),
    [tournament.id, refreshKey],
    { enabled: hasKnockout },
  )

  const { data: drawData, refetch: refetchDraw } = useApi(
    () => api.get(`${bracketUrl}/draw-teams`).then((r) => r.data.data),
    [tournament.id, refreshKey],
    { enabled: hasKnockout },
  )

  const rounds = data?.data || []
  const meta = data?.meta || null
  const isGroups6 = meta?.mode === 'groups6'
  const isOddMode = ['playin', 'bye_final'].includes(meta?.mode)
  const currentValidation = validation || invalidNotice
  const oddOptions = (currentValidation?.options || []).includes('bye_final')

  const qualifiedTeams = drawData?.qualified_teams || []
  const drawFixtures = drawData?.fixtures || []
  const drawStatus = drawData?.draw_status || meta?.draw_status || 'pending'
  const isDrawConfirmed = drawStatus === 'confirmed'
  const groupStageDetails = drawData?.group_stage_details || null
  const realIncompleteGroups = useMemo(() => {
    return (groupStageDetails?.incomplete_groups || []).filter(
      (grp) => (Number(grp.remaining_matches) || 0) > 0 && (Number(grp.total_matches) || 0) > 0,
    )
  }, [groupStageDetails])
  const isGroupStageComplete = realIncompleteGroups.length === 0
  const activeAvailableGroups = useMemo(() => {
    return (groupStageDetails?.groups || []).filter(
      (grp) => (Number(grp.total_matches) || 0) > 0,
    )
  }, [groupStageDetails])

  // Find final fixture and champion if completed
  const finalRound = useMemo(() => {
    if (!rounds || rounds.length === 0) return null
    return rounds.find((r) => r.stage === 'final' || r.fixtures?.length === 1) || rounds[rounds.length - 1]
  }, [rounds])

  const championTeam = useMemo(() => {
    if (!finalRound || !finalRound.fixtures || finalRound.fixtures.length === 0) return null
    const finalMatch = finalRound.fixtures[0]
    if (finalMatch && (finalMatch.status === 'finished' || finalMatch.status === 'completed')) {
      if (finalMatch.winner_team_id) {
        if (finalMatch.home_team?.id === finalMatch.winner_team_id) return finalMatch.home_team
        if (finalMatch.away_team?.id === finalMatch.winner_team_id) return finalMatch.away_team
      }
    }
    return null
  }, [finalRound])

  // Derive Current Official Workflow Step (1 through 6)
  const actualCurrentStep = useMemo(() => {
    if (championTeam) return 6
    if (!rounds || rounds.length === 0) {
      if (currentValidation?.status === 'ok' || currentValidation?.status === 'choice') {
        return 2
      }
      return 1
    }
    if (drawStatus !== 'confirmed') {
      return 3
    }
    // Draw is confirmed, matches are live / scheduled
    return 5
  }, [championTeam, rounds, currentValidation, drawStatus])

  // Effective displayed step for bidirectional navigation
  const displayStep = activeNavStep !== null ? activeNavStep : actualCurrentStep
  const isViewingPrevious = activeNavStep !== null && activeNavStep < actualCurrentStep
  const isViewingFuture = activeNavStep !== null && activeNavStep > actualCurrentStep

  const goToStep = (stepId) => {
    setActiveNavStep(stepId)
    // Scroll smoothly to top of stage area
    window.scrollTo({ top: 120, behavior: 'smooth' })
  }

  const fetchValidation = async () => api.get(`${bracketUrl}/validation`).then((r) => r.data.data)

  const createBracket = async () => {
    if (busy) return

    if (rounds.length > 0) {
      setDestructivePrompt({
        title: 'تأكيد إعادة إنشاء السلم الإقصائي',
        desc: 'سيؤدي هذا الإجراء إلى حذف مباريات السلم الحالية وإلغاء أي قرعة معتمدة سابقة وتوليد سلم جديد فارغ.',
        action: performCreateBracket,
      })
      return
    }

    await performCreateBracket()
  }

  const performCreateBracket = async () => {
    setBusy('create')
    try {
      const gate = await fetchValidation()

      const realIncomplete = (gate.incomplete_groups || []).filter(
        (grp) => grp.remaining_matches > 0 && grp.total_matches > 0,
      )

      if (gate.status === 'incomplete_groups' && realIncomplete.length > 0) {
        toast.error(gate.explanation || 'لا يمكن إنشاء السلم قبل اكتمال دور المجموعات')
        setInvalidNotice(gate)
        return
      }

      if (gate.status === 'invalid') {
        setInvalidNotice(gate)
        refetch()
        return
      }

      if (gate.status === 'choice') {
        setInvalidNotice(null)
        setOddChoice((gate.options || []).includes('bye_final') || (gate.options || []).includes('playin'))
        setOptionModal(true)
        refetch()
        return
      }

      setInvalidNotice(null)
      await api.post(bracketUrl)
      toast.success(t('committee.detail.bracketCreated'))
      setDestructivePrompt(null)
      refresh()
      refetch()
      refetchDraw()
      goToStep(3)
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  const confirmOption = async (mode) => {
    if (busy) return
    setBusy('option')
    try {
      await api.post(bracketUrl, { mode })
      toast.success(t('committee.detail.bracketCreated'))
      setOptionModal(false)
      refresh()
      refetch()
      refetchDraw()
      goToStep(3)
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  const syncBracket = async () => {
    if (busy) return
    setBusy('sync')
    try {
      await api.post(`${bracketUrl}/sync`)
      toast.success(t('committee.detail.bracketSynced'))
      refetch()
      refetchDraw()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  if (!hasKnockout) {
    return (
      <Empty
        icon={Network}
        title={t('committee.detail.noBracket')}
        description={t('committee.detail.noBracketDesc')}
      />
    )
  }

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-28" />
        <Skeleton className="h-40" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 1. Bidirectional Guided Workflow Progress Bar */}
      <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-[#179955] dark:text-[#42D889]" />
            <h3 className="text-xs font-black uppercase tracking-wider text-[#111313] dark:text-[#F5F7F2]">
              مسار إدارة السلم الإقصائي والقرعة
            </h3>
          </div>

          {/* Forward / Backward Navigation Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={displayStep <= 1}
              onClick={() => goToStep(Math.max(1, displayStep - 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-2.5 py-1 text-xs font-bold text-[#111313] dark:text-[#F5F7F2] transition disabled:opacity-40 hover:border-[#179955] cursor-pointer"
            >
              <ChevronRight className="size-3.5" />
              المرحلة السابقة
            </button>

            <button
              type="button"
              disabled={displayStep >= 6}
              onClick={() => goToStep(Math.min(6, displayStep + 1))}
              className="inline-flex items-center gap-1 rounded-lg border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-2.5 py-1 text-xs font-bold text-[#111313] dark:text-[#F5F7F2] transition disabled:opacity-40 hover:border-[#179955] cursor-pointer"
            >
              المرحلة التالية
              <ChevronLeft className="size-3.5" />
            </button>

            <span className="rounded-full bg-[#179955]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#179955] dark:text-[#42D889]">
              المرحلة {displayStep} من 6
            </span>
          </div>
        </div>

        {/* Step progress track with Clickable Stage Navigation */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {WORKFLOW_STEPS.map((step) => {
            const isDone = actualCurrentStep > step.id
            const isCurrentActive = actualCurrentStep === step.id
            const isSelected = displayStep === step.id

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => goToStep(step.id)}
                className={`relative flex items-center gap-2.5 rounded-xl border p-2.5 transition text-start cursor-pointer ${
                  isSelected
                    ? 'border-[#179955] bg-[#179955]/15 text-[#179955] dark:border-[#42D889] dark:bg-[#42D889]/15 dark:text-[#42D889] ring-2 ring-[#179955]/30'
                    : isDone
                    ? 'border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] text-[#111313] dark:text-[#F5F7F2] hover:border-[#179955]'
                    : isCurrentActive
                    ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/20 text-blue-800 dark:text-blue-300'
                    : 'border-[#E1E5DF]/60 dark:border-[#303832]/60 bg-transparent text-[#65706A]/70 dark:text-[#B2B9B3]/50 hover:border-[#179955]'
                }`}
              >
                <div
                  className={`grid size-6 shrink-0 place-items-center rounded-lg text-xs font-black ${
                    isSelected
                      ? 'bg-[#179955] text-white dark:bg-[#42D889] dark:text-black'
                      : isDone
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#E1E5DF] dark:bg-[#303832] text-[#65706A]'
                  }`}
                >
                  {isDone ? <Check className="size-3.5" /> : step.id}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold leading-tight">{step.title}</p>
                  <p className="truncate text-[10px] opacity-75">{step.desc}</p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Safe Inspection Notice when viewing non-current stage */}
        {(isViewingPrevious || isViewingFuture) && (
          <div className="mt-3 flex items-center justify-between gap-2 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50 dark:bg-sky-950/20 px-3.5 py-2.5 text-xs text-sky-800 dark:text-sky-300">
            <div className="flex items-center gap-2">
              <Eye className="size-4 shrink-0 text-sky-600" />
              <span>
                أنت تستعرض حالياً <strong>المرحلة {displayStep}: {WORKFLOW_STEPS[displayStep - 1]?.title}</strong> (تصفح آمن دون حذف أو تعديل أي بيانات). المرحلة الحالية الرسمية للبطولة هي <strong>المرحلة {actualCurrentStep}</strong>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setActiveNavStep(null)}
              className="shrink-0 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-700 transition cursor-pointer"
            >
              العودة للمرحلة الفعلية ({actualCurrentStep})
            </button>
          </div>
        )}
      </div>

      {/* =========================================================================
          STAGE SPECIFIC CONTENT VIEWS (Rendered dynamically based on displayStep)
          ========================================================================= */}

      {/* ----------------- STAGE 1: المتأهلون من دور المجموعات ----------------- */}
      {displayStep === 1 && (
        <div className="space-y-4 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E1E5DF] dark:border-[#303832] pb-4">
            <div>
              <h3 className="text-base font-black text-[#111313] dark:text-[#F5F7F2] flex items-center gap-2">
                <Users className="size-5 text-[#179955]" />
                المرحلة 1 — الفرق المتأهلة من دور المجموعات
              </h3>
              <p className="text-xs text-[#65706A] dark:text-[#B2B9B3] mt-1">
                تأهل أول وثاني كل مجموعة (4 مجموعات × 2 = 8 فرق متأهلة إلى ربع النهائي).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  isGroupStageComplete
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                }`}
              >
                {isGroupStageComplete ? 'دور المجموعات مكتمل 100%' : 'المجموعات قيد الاستكمال'}
              </span>
            </div>
          </div>

          {/* Group completion warning / details (TEST B) */}
          {!isGroupStageComplete && realIncompleteGroups.length > 0 && (
            <div className="rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50 dark:bg-amber-950/20 p-4 text-xs">
              <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200 font-bold mb-1.5">
                <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                <span>المباريات المتبقية لحسم التأهل النهائي:</span>
              </div>
              <p className="text-amber-800 dark:text-amber-300 text-[11px] mb-3">
                {groupStageDetails.explanation}
              </p>
              <div className="grid gap-2 sm:grid-cols-2">
                {realIncompleteGroups.map((grp) => (
                  <div
                    key={grp.group_id}
                    className="flex items-center justify-between rounded-lg bg-white dark:bg-[#252B27] p-2.5 ring-1 ring-amber-200 dark:ring-amber-900/40"
                  >
                    <span className="font-bold text-[#111313] dark:text-[#F5F7F2]">{formatGroupName(grp.group_name, { groupId: grp.group_id, tournamentId: tournament?.id })}</span>
                    <span className="text-[11px] text-amber-700 dark:text-amber-300 font-bold">
                      متبقي {grp.remaining_matches} من أصل {grp.total_matches} مباريات
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex justify-end">
                <Button size="xs" variant="outline" onClick={() => setActive?.('fixtures')}>
                  <Swords className="size-3.5" />
                  الانتقال إلى جدول مباريات المجموعات
                </Button>
              </div>
            </div>
          )}

          {/* Available Groups for this tournament */}
          {activeAvailableGroups?.length > 0 && (
            <div className="space-y-2 pt-1">
              <h4 className="text-xs font-black text-[#111313] dark:text-[#F5F7F2] flex items-center gap-1.5">
                <Layers className="size-4 text-[#179955]" />
                المجموعات المتوفرة في هذه البطولة ({activeAvailableGroups.length} مجموعات):
              </h4>
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {activeAvailableGroups.map((grp) => (
                  <div
                    key={grp.group_id}
                    className="flex items-center justify-between rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3 shadow-2xs"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-black text-[#111313] dark:text-[#F5F7F2]">
                        {formatGroupName(grp.group_name, { groupId: grp.group_id, tournamentId: tournament?.id })}
                      </p>
                      <p className="text-[11px] text-[#65706A] dark:text-[#B2B9B3]">
                        {grp.total_matches > 0 ? `${grp.total_matches} مباريات مسجلة` : 'لم تُجدول المباريات'}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        grp.is_complete
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                      }`}
                    >
                      {grp.is_complete ? 'مكتملة 100%' : grp.total_matches === 0 ? 'غير مجدولة' : `متبقي ${grp.remaining_matches}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Qualified Teams Cards */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-black text-[#111313] dark:text-[#F5F7F2]">
              الفرق المؤهلة رسمياً ({qualifiedTeams.length} فرق):
            </h4>

            {qualifiedTeams.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#E1E5DF] dark:border-[#303832] py-8 text-center text-xs text-[#65706A]">
                بانتظار ختام مباريات المجموعات لاستخراج المتأهلين.
              </div>
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                {qualifiedTeams.map((team) => (
                  <div
                    key={team.team_id}
                    className="flex items-center gap-3 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3 transition hover:border-[#179955]"
                  >
                    <TeamAvatar team={team} className="size-8 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-black text-[#111313] dark:text-[#F5F7F2]">
                        {team.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[10px]">
                        <span
                          className={`rounded px-1.5 py-0.2 font-bold ${
                            team.rank === 1
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                          }`}
                        >
                          {team.rank === 1 ? 'بطل المجموعة' : 'وصيف المجموعة'}
                        </span>
                        <span className="text-[#65706A] dark:text-[#B2B9B3]">
                          {formatGroupName(team.group_name, { groupId: team.group_id, tournamentId: tournament?.id })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stage 1 Footer Navigation */}
          <div className="flex items-center justify-between border-t border-[#E1E5DF] dark:border-[#303832] pt-4 mt-6">
            <span className="text-xs text-[#65706A] dark:text-[#B2B9B3]">
              المرحلة 1 من 6
            </span>
            <Button
              variant="primary"
              size="sm"
              onClick={() => goToStep(2)}
            >
              الانتقال إلى إعداد السلم (المرحلة 2)
              <ChevronLeft className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ----------------- STAGE 2: إعداد السلم وخانات الباي ----------------- */}
      {displayStep === 2 && (
        <div className="space-y-4 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E1E5DF] dark:border-[#303832] pb-4">
            <div>
              <h3 className="text-base font-black text-[#111313] dark:text-[#F5F7F2] flex items-center gap-2">
                <Network className="size-5 text-[#179955]" />
                المرحلة 2 — إعداد السلم الإقصائي (خروج المغلوب)
              </h3>
              <p className="text-xs text-[#65706A] dark:text-[#B2B9B3] mt-1">
                توليد هيكل الأدوار الثلاثة تلقائياً بناءً على الـ 8 متأهلين: ربع النهائي ← نصف النهائي ← النهائي.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {rounds.length > 0 ? (
                <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-3 py-1 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5" />
                  السلم مهيأ (3 أدوار)
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  loading={busy === 'create'}
                  onClick={createBracket}
                >
                  <Network className="size-4" />
                  إنشاء السلم الإقصائي الآن
                </Button>
              )}
            </div>
          </div>

          {/* Knockout Architecture Diagram */}
          <div className="grid gap-3 sm:grid-cols-3 pt-2">
            <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-4 text-center space-y-1">
              <span className="rounded-full bg-[#179955]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#179955] dark:text-[#42D889]">
                الدور 1
              </span>
              <h4 className="text-sm font-black text-[#111313] dark:text-[#F5F7F2]">ربع النهائي</h4>
              <p className="text-xs text-[#65706A] dark:text-[#B2B9B3]">8 فرق • 4 مباريات</p>
              <div className="pt-2 text-[10px] text-[#65706A] font-mono">
                QF1 • QF2 • QF3 • QF4
              </div>
            </div>

            <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-4 text-center space-y-1">
              <span className="rounded-full bg-blue-500/15 px-2.5 py-0.5 text-[11px] font-bold text-blue-600 dark:text-blue-400">
                الدور 2
              </span>
              <h4 className="text-sm font-black text-[#111313] dark:text-[#F5F7F2]">نصف النهائي</h4>
              <p className="text-xs text-[#65706A] dark:text-[#B2B9B3]">4 فرق متأهلة • مباراتان</p>
              <div className="pt-2 text-[10px] text-[#65706A] font-mono">
                SF1 (فائز QF1 ضد QF2) • SF2
              </div>
            </div>

            <div className="rounded-2xl border border-amber-300 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/20 p-4 text-center space-y-1">
              <span className="rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 dark:text-amber-400">
                النهائي
              </span>
              <h4 className="text-sm font-black text-[#111313] dark:text-[#F5F7F2]">المباراة النهائية</h4>
              <p className="text-xs text-[#65706A] dark:text-[#B2B9B3]">فريقان • مباراة التتويج</p>
              <div className="pt-2 text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                تحديد بطل البطولة الرسمي
              </div>
            </div>
          </div>

          {/* Action options */}
          {rounds.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F7F8F5] dark:bg-[#252B27] p-3 text-xs">
              <span className="text-[#65706A] dark:text-[#B2B9B3]">
                تم ربط مصادر التأهل التلقائي: فائز QF1 و QF2 إلى SF1، وفائز QF3 و QF4 إلى SF2، وفائزا نصف النهائي إلى النهائي.
              </span>
              <Button size="xs" variant="outline" onClick={createBracket}>
                <RefreshCw className="size-3.5" />
                إعادة تهيئة السلم
              </Button>
            </div>
          )}

          {/* Stage 2 Footer Navigation */}
          <div className="flex items-center justify-between border-t border-[#E1E5DF] dark:border-[#303832] pt-4 mt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToStep(1)}
            >
              <ChevronRight className="size-4" />
              العودة إلى المتأهلين (المرحلة 1)
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => goToStep(3)}
            >
              الانتقال إلى القرعة اليدوية (المرحلة 3)
              <ChevronLeft className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ----------------- STAGE 3: القرعة اليدوية وتسكين ربع النهائي ----------------- */}
      {displayStep === 3 && (
        <div className="space-y-4 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E1E5DF] dark:border-[#303832] pb-4">
            <div>
              <h3 className="text-base font-black text-[#111313] dark:text-[#F5F7F2] flex items-center gap-2">
                <Shuffle className="size-5 text-[#179955]" />
                المرحلة 3 — منظومة القرعة اليدوية الموجهة
              </h3>
              <p className="text-xs text-[#65706A] dark:text-[#B2B9B3] mt-1">
                تسكين الفرق يدوياً في خانات ربع النهائي مع الالتزام التام بالقاعدتين 1 و 2 ومنع الانغلاق الرياضي.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setDrawModal(true)}
              >
                <Shuffle className="size-4" />
                {isDrawConfirmed ? 'مراجعة وتعديل القرعة' : 'فتح واجهة القرعة اليدوية'}
              </Button>
            </div>
          </div>

          {/* Rules overview callout */}
          <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 p-3 text-xs text-blue-900 dark:text-blue-300">
            <ShieldCheck className="size-4 shrink-0 text-blue-600" />
            <span className="text-[11px]">
              <strong>قواعد التسكين: </strong>
              (1) يمنع تواجه فريقين من نفس المجموعة • (2) يواجه متصدر المجموعة وصيف مجموعة أخرى • (3) التحقق من عدم الانغلاق الرياضي التلقائي.
            </span>
          </div>

          {/* Current Matchups Grid Preview */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black text-[#111313] dark:text-[#F5F7F2]">
                مباريات ربع النهائي الأربع (QF1 إلى QF4):
              </h4>
              <span className="text-xs text-[#65706A] dark:text-[#B2B9B3]">
                الحالة: <strong>{isDrawConfirmed ? 'معتمدة رسمياً' : 'مسودة'}</strong>
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {drawFixtures.map((f, idx) => (
                <div
                  key={f.id}
                  className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3.5 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs text-[#65706A]">
                    <span className="font-mono font-black text-[#111313] dark:text-[#F5F7F2]">
                      QF{idx + 1}
                    </span>
                    <span>المباراة {idx + 1}</span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-2 rounded-xl bg-white dark:bg-[#1B201D] p-2 border border-[#E1E5DF] dark:border-[#303832]">
                      {f.home_team ? (
                        <>
                          <TeamAvatar team={f.home_team} className="size-5 shrink-0" />
                          <span className="font-bold truncate">{f.home_team.name}</span>
                        </>
                      ) : (
                        <span className="text-[#65706A] text-dashed">خانة المستضيف (شاغرة)</span>
                      )}
                    </div>

                    <div className="text-center text-[10px] text-[#65706A] font-bold">ضد</div>

                    <div className="flex items-center gap-2 rounded-xl bg-white dark:bg-[#1B201D] p-2 border border-[#E1E5DF] dark:border-[#303832]">
                      {f.away_team ? (
                        <>
                          <TeamAvatar team={f.away_team} className="size-5 shrink-0" />
                          <span className="font-bold truncate">{f.away_team.name}</span>
                        </>
                      ) : (
                        <span className="text-[#65706A] text-dashed">خانة الضيف (شاغرة)</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stage 3 Footer Navigation */}
          <div className="flex items-center justify-between border-t border-[#E1E5DF] dark:border-[#303832] pt-4 mt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToStep(2)}
            >
              <ChevronRight className="size-4" />
              العودة إلى إعداد السلم (المرحلة 2)
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => goToStep(4)}
            >
              الانتقال إلى الاعتماد والتثبيت (المرحلة 4)
              <ChevronLeft className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ----------------- STAGE 4: الاعتماد والتثبيت الرسمي ----------------- */}
      {displayStep === 4 && (
        <div className="space-y-4 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E1E5DF] dark:border-[#303832] pb-4">
            <div>
              <h3 className="text-base font-black text-[#111313] dark:text-[#F5F7F2] flex items-center gap-2">
                <UserCheck className="size-5 text-[#179955]" />
                المرحلة 4 — مراجعة واعتماد القرعة الرسمية
              </h3>
              <p className="text-xs text-[#65706A] dark:text-[#B2B9B3] mt-1">
                تثبيت مواجهات ربع النهائي رسمياً، وتجميد القرعة، وتفعيل السلم الإقصائي.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isDrawConfirmed ? (
                <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 px-3 py-1 text-xs font-bold flex items-center gap-1.5">
                  <Lock className="size-3.5" />
                  القرعة معتمدة ومقفلة رسمياً
                </span>
              ) : (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setDrawModal(true)}
                >
                  <UserCheck className="size-4" />
                  مراجعة واعتماد القرعة
                </Button>
              )}
            </div>
          </div>

          {/* Confirmation Status Banner */}
          {isDrawConfirmed ? (
            <div className="rounded-xl border border-emerald-300 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/20 p-4 text-xs text-emerald-900 dark:text-emerald-200 space-y-1">
              <div className="flex items-center gap-2 font-black">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span>تم اعتماد وتثبيت القرعة الإقصائية بنجاح!</span>
              </div>
              <p className="text-[11px] opacity-90">
                مباريات ربع النهائي مجدولة وثابتة ولا يمكن تعديلها بعد بدء المباريات. يمكنك طلب التراجع في حال الضرورة عبر زر التراجع الآمن في نافذة القرعة.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 p-4 text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <div className="flex items-center gap-2 font-black">
                <AlertCircle className="size-4 text-amber-600" />
                <span>القرعة في وضع المسودة وبانتظار الاعتماد الرسمي.</span>
              </div>
              <p className="text-[11px] opacity-90">
                يرجى تسكين جميع الفرق الـ 8 في مواجهات ربع النهائي الأربع واستيفاء الشروط لاعتماد القرعة.
              </p>
            </div>
          )}

          {/* Confirmed / Draft Matchups Display */}
          <div className="grid gap-3 sm:grid-cols-2 pt-2">
            {drawFixtures.map((f, idx) => (
              <div
                key={f.id}
                className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-3.5 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between text-[11px] text-[#65706A]">
                  <span className="font-mono font-black text-[#111313] dark:text-[#F5F7F2]">
                    QF{idx + 1}
                  </span>
                  <span>المباراة {idx + 1}</span>
                </div>
                <div className="flex items-center justify-between gap-2 rounded-xl bg-[#F7F8F5] dark:bg-[#252B27] p-2 text-xs font-bold">
                  <span>{f.home_team?.name || 'شاغر'}</span>
                  <span className="text-[#65706A] text-[10px]">ضد</span>
                  <span>{f.away_team?.name || 'شاغر'}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Stage 4 Footer Navigation */}
          <div className="flex items-center justify-between border-t border-[#E1E5DF] dark:border-[#303832] pt-4 mt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToStep(3)}
            >
              <ChevronRight className="size-4" />
              العودة إلى القرعة اليدوية (المرحلة 3)
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => goToStep(5)}
            >
              الانتقال إلى المباريات والانضباط (المرحلة 5)
              <ChevronLeft className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ----------------- STAGE 5: المباريات والانضباط ----------------- */}
      {displayStep === 5 && (
        <div className="space-y-4">
          {/* Main Action Header for Stage 5 */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setDisciplinaryModal(true)}
                className="border-purple-300 dark:border-purple-800 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/20"
              >
                <ShieldAlert className="size-4 text-purple-600 dark:text-purple-400" />
                سجل الانضباط والبطاقات (A, B, C)
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" loading={busy === 'sync'} onClick={syncBracket}>
                <RefreshCw className="size-4" />
                {t('committee.detail.syncBracket')}
              </Button>

              <Button size="sm" variant="outline" onClick={() => setDrawModal(true)}>
                <Shuffle className="size-4" />
                مراجعة القرعة الإقصائية وسجل النسخ
              </Button>
            </div>
          </div>

          {/* Full Interactive Knockout Bracket Hierarchy */}
          {rounds.length === 0 ? (
            <Empty
              icon={Network}
              title={t('committee.detail.bracketEmpty')}
              description={t('committee.detail.bracketEmptyDesc')}
            />
          ) : (
            <>
              <TournamentStageBar rounds={rounds} />
              <CommitteeBracket rounds={rounds} />
            </>
          )}

          {/* Stage 5 Footer Navigation */}
          <div className="flex items-center justify-between border-t border-[#E1E5DF] dark:border-[#303832] pt-4 mt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToStep(4)}
            >
              <ChevronRight className="size-4" />
              العودة إلى اعتماد القرعة (المرحلة 4)
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => goToStep(6)}
            >
              الانتقال إلى التتويج وبطل الدوري (المرحلة 6)
              <ChevronLeft className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ----------------- STAGE 6: التتويج وبطل الدوري ----------------- */}
      {displayStep === 6 && (
        <div className="space-y-4">
          {championTeam ? (
            <div className="relative overflow-hidden rounded-3xl border border-amber-300 dark:border-amber-700/60 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-500/15 p-8 text-center shadow-lg">
              <Crown className="mx-auto size-16 text-amber-500 animate-bounce" />
              <h2 className="mt-3 text-2xl font-black text-[#111313] dark:text-[#F5F7F2]">
                بطل دوري خروج المغلوب الرسمي
              </h2>
              <div className="mt-4 inline-flex items-center gap-4 rounded-2xl bg-white/95 dark:bg-[#1B201D]/95 px-6 py-3.5 shadow-md ring-2 ring-amber-400 dark:ring-amber-600">
                {championTeam.logo_url && (
                  <img src={championTeam.logo_url} alt="" className="size-12 rounded-full object-contain" />
                )}
                <span className="text-xl font-black text-[#179955] dark:text-[#42D889]">
                  {championTeam.name}
                </span>
              </div>
              <p className="mt-3 text-xs font-bold text-[#65706A] dark:text-[#B2B9B3]">
                توج باللقب بعد فوزه في كافة الأدوار الإقصائية وحسم المباراة النهائية!
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-8 text-center space-y-2">
              <Trophy className="mx-auto size-12 text-[#65706A]/40" />
              <h4 className="text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                المباراة النهائية لم تحسم بعد
              </h4>
              <p className="text-xs text-[#65706A] dark:text-[#B2B9B3]">
                سيتم إعلان وتكريم البطل تلقائياً في هذه الصفحة فور انتهاء واعتماد نتيجة المباراة النهائية.
              </p>
            </div>
          )}

          {/* Final Match Summary */}
          {finalRound && finalRound.fixtures?.length > 0 && (
            <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-5">
              <h4 className="text-xs font-black text-[#111313] dark:text-[#F5F7F2] mb-3">
                المباراة النهائية:
              </h4>
              <div className="flex items-center justify-between rounded-xl bg-[#F7F8F5] dark:bg-[#252B27] p-4 text-xs font-bold">
                <div className="flex items-center gap-2">
                  <TeamAvatar team={finalRound.fixtures[0].home_team} className="size-6" />
                  <span>{finalRound.fixtures[0].home_team?.name || 'بانتظار المتأهل'}</span>
                </div>
                <div className="text-base font-black font-mono">
                  {finalRound.fixtures[0].status === 'finished'
                    ? `${finalRound.fixtures[0].home_score ?? 0} - ${finalRound.fixtures[0].away_score ?? 0}`
                    : 'vs'}
                </div>
                <div className="flex items-center gap-2">
                  <span>{finalRound.fixtures[0].away_team?.name || 'بانتظار المتأهل'}</span>
                  <TeamAvatar team={finalRound.fixtures[0].away_team} className="size-6" />
                </div>
              </div>
            </div>
          )}

          {/* Stage 6 Footer Navigation */}
          <div className="flex items-center justify-between border-t border-[#E1E5DF] dark:border-[#303832] pt-4 mt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => goToStep(5)}
            >
              <ChevronRight className="size-4" />
              العودة إلى مباريات السلم (المرحلة 5)
            </Button>
            <span className="text-xs text-[#65706A] dark:text-[#B2B9B3]">
              المرحلة الختامية 6 من 6
            </span>
          </div>
        </div>
      )}

      {/* Modals & Dialogs */}
      <KnockoutOptionModal
        open={optionModal}
        onClose={() => setOptionModal(false)}
        onConfirm={confirmOption}
        busy={busy === 'option'}
        options={oddChoice ? ODD_KO_OPTIONS : undefined}
        titleKey={oddChoice ? ODD_KO_TITLE_KEYS.titleKey : undefined}
        descKey={oddChoice ? ODD_KO_TITLE_KEYS.descKey : undefined}
        recommendedKey={oddChoice ? ODD_KO_TITLE_KEYS.recommendedKey : undefined}
        trail={oddChoice ? currentValidation?.trail : undefined}
      />

      <KnockoutDrawModal
        open={drawModal}
        onClose={() => {
          setDrawModal(false)
          refetchDraw()
        }}
        tournament={tournament}
        onConfirmed={() => {
          refresh()
          refetch()
          refetchDraw()
        }}
      />

      <DisciplinaryModal
        open={disciplinaryModal}
        onClose={() => setDisciplinaryModal(false)}
        tournament={tournament}
        onUpdated={() => {
          refresh()
          refetch()
          refetchDraw()
        }}
      />

      {/* Destructive Reconfigure Safety Dialog (TEST G) */}
      <Modal
        open={Boolean(destructivePrompt)}
        onClose={() => setDestructivePrompt(null)}
        size="sm"
        title={destructivePrompt?.title || 'تأكيد التعديل على مرحلة سابقة'}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-3 text-xs text-red-700 dark:text-red-400">
            <AlertTriangle className="size-5 shrink-0" />
            <p>{destructivePrompt?.desc}</p>
          </div>
          <p className="text-xs text-[#65706A] dark:text-[#B2B9B3]">
            هل أنت متأكد من رغبتك في المتابعة وتطبيق هذه التغييرات على السلم؟
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setDestructivePrompt(null)}>
              إلغاء
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (destructivePrompt?.action) {
                  destructivePrompt.action()
                }
              }}
            >
              نعم، متابعة التعديل
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
