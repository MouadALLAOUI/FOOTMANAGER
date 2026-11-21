import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  Award,
  Check,
  CheckCircle2,
  ChevronLeft,
  Crown,
  Layers,
  Network,
  RefreshCw,
  ShieldAlert,
  Shuffle,
  Swords,
  Trophy,
  UserCheck,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Button, Empty, Skeleton } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import CommitteeBracket from '../../../domains/committee/components/CommitteeBracket'
import KnockoutOptionModal from '../../../domains/committee/components/KnockoutOptionModal'
import KnockoutDrawModal from './draw/KnockoutDrawModal'
import DisciplinaryModal from './DisciplinaryModal'
import TournamentStageBar from '../../../components/tournaments/TournamentStageBar'
import { ODD_KO_OPTIONS, ODD_KO_TITLE_KEYS } from '../../../domains/committee/lib/knockoutOptions'
import { formatGroupName } from '../../../lib/groupNames'

const WORKFLOW_STEPS = [
  { id: 1, title: 'المتأهلون', desc: 'اكتمال تأهل الفرق' },
  { id: 2, title: 'إعداد السلم', desc: 'تحديد الأدوار وخانات الباي' },
  { id: 3, title: 'القرعة اليدوية', desc: 'تسكين المواجهات يدوياً' },
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

  const rounds = data?.data || []
  const meta = data?.meta || null
  const isGroups6 = meta?.mode === 'groups6'
  const isOddMode = ['playin', 'bye_final'].includes(meta?.mode)
  const currentValidation = validation || invalidNotice
  const oddOptions = (currentValidation?.options || []).includes('bye_final')

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

  // Derive Current Guided Workflow Step (1 through 6)
  const currentStep = useMemo(() => {
    if (championTeam) return 6
    if (!rounds || rounds.length === 0) {
      if (currentValidation?.status === 'ready' || currentValidation?.status === 'choice') {
        return 2
      }
      return 1
    }
    if (meta?.draw_status !== 'confirmed') {
      return 3
    }
    // Draw is confirmed, matches are live / scheduled
    return 5
  }, [championTeam, rounds, currentValidation, meta?.draw_status])

  const fetchValidation = async () => api.get(`${bracketUrl}/validation`).then((r) => r.data.data)

  const createBracket = async () => {
    if (busy) return
    setBusy('create')
    try {
      const gate = await fetchValidation()

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
      refresh()
      refetch()
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
      {/* 1. Guided Workflow Progress Bar */}
      <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-[#179955] dark:text-[#42D889]" />
            <h3 className="text-xs font-black uppercase tracking-wider text-[#111313] dark:text-[#F5F7F2]">
              مسار إدارة السلم الإقصائي والقرعة
            </h3>
          </div>
          <span className="rounded-full bg-[#179955]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#179955] dark:text-[#42D889]">
            المرحلة {currentStep} من 6
          </span>
        </div>

        {/* Step progress track */}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {WORKFLOW_STEPS.map((step) => {
            const isDone = currentStep > step.id
            const isActive = currentStep === step.id
            return (
              <div
                key={step.id}
                className={`relative flex items-center gap-2.5 rounded-xl border p-2.5 transition ${
                  isActive
                    ? 'border-[#179955] bg-[#179955]/10 text-[#179955] dark:border-[#42D889] dark:bg-[#42D889]/15 dark:text-[#42D889] ring-2 ring-[#179955]/20'
                    : isDone
                    ? 'border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] text-[#111313] dark:text-[#F5F7F2]'
                    : 'border-[#E1E5DF]/60 dark:border-[#303832]/60 bg-transparent text-[#65706A]/70 dark:text-[#B2B9B3]/50'
                }`}
              >
                <div
                  className={`grid size-6 shrink-0 place-items-center rounded-lg text-xs font-black ${
                    isActive
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
              </div>
            )
          })}
        </div>

        {/* Dynamic Contextual Action Banner */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#F7F8F5] dark:bg-[#252B27] p-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="flex size-2 rounded-full bg-[#179955] animate-ping" />
            <span className="font-bold text-[#111313] dark:text-[#F5F7F2]">
              {currentStep === 1 && 'المجموعات قيد الاستكمال: بانتظار حسم تأهل الفرق رسمياً.'}
              {currentStep === 2 && 'الفرق المتأهلة جاهزة: اضغط على إنشاء السلم لتهيئة أدوار خروج المغلوب.'}
              {currentStep === 3 && 'السلم مهيأ: قم بإجراء القرعة اليدوية لتسكين الفرق في مواجهات الدور الأول.'}
              {currentStep === 4 && 'القرعة جاهزة للاعتماد: راجع المواجهات وثبت القرعة رسمياً.'}
              {currentStep === 5 && 'مباريات خروج المغلوب جارية: تابع نتائج المباريات وتأهل الفائزين وسجل الانضباط.'}
              {currentStep === 6 && `اكتملت البطولة رسمياً وتوج (${championTeam?.name}) باللقب!`}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {currentStep <= 2 && rounds.length === 0 && (
              <Button size="xs" variant="primary" loading={busy === 'create'} onClick={createBracket}>
                <Network className="size-3.5" />
                إنشاء السلم الإقصائي
              </Button>
            )}
            {rounds.length > 0 && meta?.draw_status !== 'confirmed' && (
              <Button size="xs" variant="primary" onClick={() => setDrawModal(true)}>
                <Shuffle className="size-3.5" />
                إجراء القرعة اليدوية
              </Button>
            )}
            {rounds.length > 0 && meta?.draw_status === 'confirmed' && (
              <Button size="xs" variant="outline" onClick={() => setDrawModal(true)}>
                <Shuffle className="size-3.5" />
                مراجعة القرعة المعتمدة
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Champion Banner (If Tournament Completed) */}
      {championTeam && (
        <div className="relative overflow-hidden rounded-3xl border border-amber-300 dark:border-amber-700/60 bg-gradient-to-r from-amber-500/15 via-amber-400/10 to-amber-500/15 p-6 text-center shadow-lg">
          <Crown className="mx-auto size-12 text-amber-500 animate-bounce" />
          <h2 className="mt-2 text-xl font-black text-[#111313] dark:text-[#F5F7F2]">
            بطل دوري خروج المغلوب
          </h2>
          <div className="mt-3 inline-flex items-center gap-3 rounded-2xl bg-white/90 dark:bg-[#1B201D]/90 px-5 py-2.5 shadow-md ring-1 ring-amber-300 dark:ring-amber-700">
            {championTeam.logo_url && (
              <img src={championTeam.logo_url} alt="" className="size-9 rounded-full object-contain" />
            )}
            <span className="text-lg font-black text-[#179955] dark:text-[#42D889]">
              {championTeam.name}
            </span>
          </div>
          <p className="mt-2 text-xs font-bold text-[#65706A] dark:text-[#B2B9B3]">
            تهانينا للفريق الفائز بلقب البطولة وتأهله عبر كافة الأدوار الإقصائية!
          </p>
        </div>
      )}

      {/* Validation Warnings / Gate Banner */}
      {currentValidation?.status === 'invalid' && (
        <div className="flex flex-wrap items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-500" />
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-sm font-black text-red-800">
              {t('committee.detail.knockout6.invalidTeams', { count: currentValidation.count })}
            </p>
            <p className="text-xs leading-relaxed text-red-600">
              {t('committee.detail.knockout6.invalidTeamsDesc')}
            </p>
          </div>
        </div>
      )}

      {currentValidation?.status === 'choice' && oddOptions && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <Crown className="size-5 shrink-0 text-amber-600" />
          <p className="text-sm font-black text-amber-900">
            {t('committee.detail.oddKo.banner', { count: currentValidation.count })}
          </p>
          <span className="flex flex-wrap items-center gap-1 font-black text-amber-800">
            {(currentValidation?.trail || [1]).map((step, i) => (
              <span key={step} className="flex items-center gap-1">
                {i > 0 && <span className="text-amber-400">←</span>}
                <span className="rounded-lg bg-white px-1.5 py-0.5 ring-1 ring-amber-200">{step}</span>
              </span>
            ))}
          </span>
          <Button size="sm" variant="outline" className="ms-auto" loading={busy === 'create'} onClick={createBracket}>
            <Network className="size-4" />
            {t('committee.detail.createBracket')}
          </Button>
        </div>
      )}

      {isOddMode && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <Crown className="size-5 shrink-0 text-emerald-600" />
          <p className="text-sm font-black text-emerald-900">{t(`committee.detail.oddKo.active.${meta.mode}`)}</p>
          <span className="flex flex-wrap items-center gap-1 font-black text-emerald-800">
            {(currentValidation?.trail || (validation?.trail || [1])).map((step, i) => (
              <span key={step} className="flex items-center gap-1">
                {i > 0 && <span className="text-emerald-400">←</span>}
                <span className="rounded-lg bg-white px-1.5 py-0.5 ring-1 ring-emerald-200">{step}</span>
              </span>
            ))}
          </span>
          <p className="text-xs leading-relaxed text-emerald-700">{t('committee.detail.oddKo.activeHint')}</p>
        </div>
      )}

      {isGroups6 && meta?.groups?.length > 0 && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <Layers className="size-5 text-blue-600" />
            <p className="text-sm font-black text-blue-900">{t('committee.detail.knockout6.groupsBanner')}</p>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {meta.groups.map((group) => (
              <div key={group.id} className="rounded-xl bg-white/70 p-3 ring-1 ring-blue-100">
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-500">
                  {formatGroupName(group.name, { groupId: group.id, tournamentId: tournament.id })}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {group.teams.map((team) => (
                    <span
                      key={team.id}
                      className="inline-flex items-center gap-1 rounded-lg bg-blue-100 px-2 py-1 text-[11px] font-bold text-blue-900"
                    >
                      {team.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => setActive?.('fixtures')}>
              <Swords className="size-4" />
              {t('committee.detail.knockout6.goToFixtures')}
            </Button>
            <p className="text-xs text-blue-700">{t('committee.detail.knockout6.populateHint')}</p>
          </div>
        </div>
      )}

      {/* Main Committee Action Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
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

          {rounds.length === 0 ? (
            <Button size="sm" variant="primary" loading={busy === 'create'} onClick={createBracket}>
              <Network className="size-4" />
              {t('committee.detail.createBracket')}
            </Button>
          ) : (
            <Button size="sm" variant="primary" onClick={() => setDrawModal(true)}>
              <Shuffle className="size-4" />
              {meta?.draw_status === 'confirmed' ? 'مراجعة القرعة الإقصائية وسجل النسخ' : 'إجراء القرعة اليدوية'}
            </Button>
          )}
        </div>
      </div>

      {/* Bracket Rounds Hierarchy */}
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

      {/* Dialogs */}
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
        onClose={() => setDrawModal(false)}
        tournament={tournament}
        onConfirmed={() => {
          refresh()
          refetch()
        }}
      />

      <DisciplinaryModal
        open={disciplinaryModal}
        onClose={() => setDisciplinaryModal(false)}
        tournament={tournament}
        onUpdated={() => {
          refresh()
          refetch()
        }}
      />
    </div>
  )
}
