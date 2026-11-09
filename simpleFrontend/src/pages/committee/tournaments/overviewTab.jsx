import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Ban,
  CalendarClock,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  DoorClosed,
  Eye,
  FileEdit,
  Globe,
  LayoutGrid,
  ListChecks,
  Megaphone,
  Play,
  Swords,
  Trash2,
  Trophy,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Button, Card, Empty, Skeleton } from '../../../components/dashboard/ui'
import LiveMatchActivity from '../../../components/LiveMatchActivity'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'

const fmtDate = (value) => {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString()
}

export default function OverviewTab({ tournament, refresh, refreshKey, editable, setActive }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [busy, setBusy] = useState(null)

  const { data: progress, loading } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/progress`).then((r) => r.data.data),
    [tournament.id, refreshKey],
  )

  const { data: registrations, loading: regLoading } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/registrations`).then((r) => r.data.data),
    [tournament.id, refreshKey],
  )

  const pending = (registrations || []).filter((r) => r.status === 'pending')

  const registered = tournament.stats?.registered_teams ?? 0
  const maxTeams = tournament.teams_count ?? 0
  const remaining = Math.max(0, maxTeams - registered)
  const requiresFee = tournament.requires_registration_fee ?? false
  const isLeague = tournament.tournament_format === 'league'
  const groupsCount = tournament.stats?.groups ?? 0
  const fixturesCount = tournament.stats?.fixtures ?? 0
  const finishedCount = tournament.stats?.finished_matches ?? 0

  // Compute the 5 guided organization steps matching Reference Image 3
  const teamsAndGroupsDone = isLeague
    ? registered >= maxTeams && maxTeams > 0
    : Boolean(tournament.draw_confirmed) || (groupsCount > 0 && registered >= maxTeams && maxTeams > 0)
  const programmingDone = fixturesCount > 0
  const scheduleReadyDone = fixturesCount > 0 && ['in_progress', 'completed'].includes(tournament.status)
  const resultsStartedDone = finishedCount > 0
  const publishedDone = tournament.status !== 'draft'

  const guidedSteps = [
    {
      key: 'teams_groups',
      title: isLeague ? 'الفرق المشاركة' : 'الفرق والمجموعات',
      subtitle: isLeague ? 'إضافة واعتماد الفرق المشاركة في الدوري' : 'إضافة الفرق وتوزيعها على المجموعات',
      icon: Users,
      done: teamsAndGroupsDone,
      targetTab: registered < maxTeams && maxTeams > 0 ? 'teams' : isLeague ? 'teams' : 'draw',
    },
    {
      key: 'programming',
      title: 'برمجة المباريات',
      subtitle: 'إنشاء البرنامج أو إدخاله يدوياً',
      icon: CalendarDays,
      done: programmingDone,
      targetTab: 'fixtures',
    },
    {
      key: 'schedule_table',
      title: 'جدول المباريات',
      subtitle: 'مراجعة وتعديل ونشر البرنامج',
      icon: ListChecks,
      done: scheduleReadyDone,
      targetTab: 'fixtures',
    },
    {
      key: 'results_entry',
      title: 'إدخال النتائج',
      subtitle: 'تسجيل النتائج وتحديث الترتيب',
      icon: Trophy,
      done: resultsStartedDone,
      targetTab: 'fixtures',
    },
    {
      key: 'publish_follow',
      title: 'النشر والمتابعة',
      subtitle: 'إتاحة البطولة للجمهور',
      icon: Megaphone,
      done: publishedDone,
      targetTab: 'content',
    },
  ]

  const completedStepsCount = guidedSteps.filter((s) => s.done).length
  const totalStepsCount = guidedSteps.length
  const stepsPct = Math.round((completedStepsCount / totalStepsCount) * 100)
  const activeStepIndex = guidedSteps.findIndex((s) => !s.done)

  const runAction = async (key, endpoint, toastKey, confirmKey) => {
    if (confirmKey && !window.confirm(t(confirmKey))) return
    setBusy(key)
    try {
      await api.post(`/committee/tournaments/${tournament.id}${endpoint}`)
      toast.success(t(toastKey))
      refresh()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  const respond = async (teamId, action) => {
    setBusy(`respond-${teamId}`)
    try {
      await api.post(`/committee/tournaments/${tournament.id}/teams/${teamId}/${action}`)
      toast.success(t(action === 'approve' ? 'committee.detail.approveRequestToast' : 'committee.detail.rejectRequestToast'))
      refresh()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  const remove = async () => {
    if (!window.confirm(t('committee.detail.deleteConfirm'))) return
    setBusy('delete')
    try {
      await api.delete(`/committee/tournaments/${tournament.id}`)
      toast.success(t('committee.detail.deletedToast'))
      window.location.href = '/committee/tournaments'
    } catch (e) {
      toastApiError(e, t)
      setBusy(null)
    }
  }

  const periodStart = fmtDate(tournament.registration_start_at)
  const periodEnd = fmtDate(tournament.registration_end_at)

  return (
    <div className="space-y-5">
      {/* Compact 4-Column Statistics Card */}
      <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-3 sm:p-4 shadow-2xs">
        <div className="grid grid-cols-4 divide-x divide-x-reverse divide-[#E1E5DF] dark:divide-[#303832] text-center">
          <button
            type="button"
            onClick={() => setActive?.('teams')}
            className="flex flex-col items-center justify-center px-1 sm:px-2 hover:opacity-80 transition cursor-pointer"
          >
            <div className="flex size-8 items-center justify-center rounded-xl bg-[#F7F8F5] dark:bg-[#252B27] text-[#111313] dark:text-[#D0FF38] mb-1">
              <Users className="size-4" />
            </div>
            <span className="text-lg sm:text-2xl font-black tracking-tight text-[#111313] dark:text-[#F5F7F2] font-mono tabular-nums">
              {registered}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] mt-0.5 truncate max-w-full">
              {t('committee.detail.stat.teams') || 'الفرق'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActive?.(isLeague ? 'teams' : 'draw')}
            className="flex flex-col items-center justify-center px-1 sm:px-2 hover:opacity-80 transition cursor-pointer"
          >
            <div className="flex size-8 items-center justify-center rounded-xl bg-[#F7F8F5] dark:bg-[#252B27] text-[#111313] dark:text-[#D0FF38] mb-1">
              <LayoutGrid className="size-4" />
            </div>
            <span className="text-lg sm:text-2xl font-black tracking-tight text-[#111313] dark:text-[#F5F7F2] font-mono tabular-nums">
              {groupsCount}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] mt-0.5 truncate max-w-full">
              {t('committee.detail.stat.groups') || 'المجموعات'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActive?.('fixtures')}
            className="flex flex-col items-center justify-center px-1 sm:px-2 hover:opacity-80 transition cursor-pointer"
          >
            <div className="flex size-8 items-center justify-center rounded-xl bg-[#F7F8F5] dark:bg-[#252B27] text-[#111313] dark:text-[#D0FF38] mb-1">
              <Swords className="size-4" />
            </div>
            <span className="text-lg sm:text-2xl font-black tracking-tight text-[#111313] dark:text-[#F5F7F2] font-mono tabular-nums">
              {fixturesCount}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] mt-0.5 truncate max-w-full">
              {t('committee.detail.stat.fixtures') || 'المباريات'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActive?.('standings')}
            className="flex flex-col items-center justify-center px-1 sm:px-2 hover:opacity-80 transition cursor-pointer"
          >
            <div className="flex size-8 items-center justify-center rounded-xl bg-[#1F9D55]/10 dark:bg-[#30D158]/15 text-[#1F9D55] dark:text-[#30D158] mb-1">
              <CheckCheck className="size-4" />
            </div>
            <span className="text-lg sm:text-2xl font-black tracking-tight text-[#111313] dark:text-[#F5F7F2] font-mono tabular-nums">
              {finishedCount}
            </span>
            <span className="text-[10px] sm:text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] mt-0.5 truncate max-w-full">
              {t('committee.detail.stat.finished') || 'المنجزة'}
            </span>
          </button>
        </div>
      </div>

      {/* خطوات تنظيم البطولة (Matches Reference Image 3 Left Screen) */}
      <div className="rounded-3xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4 sm:p-5 shadow-2xs">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <h2 className="text-base sm:text-lg font-black text-[#111313] dark:text-[#F5F7F2]">
            خطوات تنظيم البطولة
          </h2>
          <span className="text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] tabular-nums">
            {completedStepsCount} من {totalStepsCount} مكتملة
          </span>
        </div>

        {/* Lime Progress Bar */}
        <div className="mb-4 h-2.5 w-full overflow-hidden rounded-full bg-[#E9ECE7] dark:bg-[#252B27]">
          <div
            className="h-full rounded-full bg-[#B8F000] dark:bg-[#D0FF38] transition-all duration-500"
            style={{ width: `${stepsPct}%` }}
          />
        </div>

        {loading ? (
          <div className="space-y-2.5">
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
            <Skeleton className="h-16 rounded-2xl" />
          </div>
        ) : (
          <div className="space-y-2.5">
            {guidedSteps.map((step, idx) => {
              const Icon = step.icon
              const isCurrent = idx === activeStepIndex
              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setActive?.(step.targetTab)}
                  className={`w-full flex items-center justify-between gap-3 rounded-2xl border p-3.5 sm:p-4 text-start transition-all active:scale-[0.99] cursor-pointer ${
                    isCurrent
                      ? 'border-[#B8F000] dark:border-[#D0FF38] bg-[#B8F000]/15 dark:bg-[#D0FF38]/10 shadow-2xs'
                      : 'border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5]/60 dark:bg-[#252B27]/50 hover:bg-[#F7F8F5] dark:hover:bg-[#252B27]'
                  }`}
                >
                  {/* Right Side in RTL: Step Icon + Title & Subtitle */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`flex size-10 shrink-0 items-center justify-center rounded-xl border ${
                        isCurrent
                          ? 'border-[#111313]/15 dark:border-[#D0FF38]/30 bg-white dark:bg-[#1B201D] text-[#111313] dark:text-[#D0FF38]'
                          : 'border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] text-[#111313] dark:text-[#F5F7F2]'
                      }`}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-black text-[#111313] dark:text-[#F5F7F2] truncate">
                        {step.title}
                      </p>
                      <p className="text-xs font-semibold text-[#65706A] dark:text-[#B2B9B3] mt-0.5 truncate">
                        {step.subtitle}
                      </p>
                    </div>
                  </div>

                  {/* Left Side in RTL: Completion Check + Chevron */}
                  <div className="flex items-center gap-2 shrink-0">
                    {step.done && (
                      <span className="flex size-6 items-center justify-center rounded-full bg-[#1F9D55] dark:bg-[#30D158] text-white">
                        <Check className="size-3.5 stroke-[3]" />
                      </span>
                    )}
                    <ChevronLeft className="size-4 text-[#65706A] dark:text-[#B2B9B3] rtl:rotate-0" />
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <LiveMatchActivity
        load={() => api.get(`/committee/tournaments/${tournament.id}/live`).then((r) => r.data.data)}
        deps={[tournament.id]}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title={t('committee.detail.registrationInfo')} className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-4 py-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
                <CalendarClock className="size-3.5" />
                {t('committee.detail.registrationPeriod')}
              </div>
              <p className="mt-1 text-sm font-bold text-[#111313] dark:text-[#F5F7F2]">
                {periodStart || periodEnd
                  ? `${periodStart || '—'} → ${periodEnd || '—'}`
                  : t('committee.detail.noRegistrationPeriod')}
              </p>
            </div>
            <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-4 py-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
                <Wallet className="size-3.5" />
                {t('committee.detail.registrationFee')}
              </div>
              <p className="mt-1 text-sm font-bold text-[#111313] dark:text-[#F5F7F2]">
                {requiresFee ? `${tournament.registration_fee} DH` : t('committee.detail.feeFree')}
              </p>
            </div>
            <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-4 py-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
                <Users className="size-3.5" />
                {t('committee.detail.capacity')}
              </div>
              <p className="mt-1 text-sm font-bold text-[#111313] dark:text-[#F5F7F2]">
                {t('committee.detail.capacity', { count: registered, max: maxTeams })}
              </p>
              {remaining > 0 && (
                <p className="text-[11px] font-semibold text-[#65706A] dark:text-[#B2B9B3]">
                  {t('manager.tournaments.remaining', { count: remaining })}
                </p>
              )}
            </div>
            {tournament.first_match_day && (
              <div className="rounded-2xl border border-[#B8F000]/50 dark:border-[#D0FF38]/30 bg-[#B8F000]/10 dark:bg-[#D0FF38]/10 px-4 py-3.5 sm:col-span-3">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#1F9D55] dark:text-[#D0FF38]">
                  <CalendarDays className="size-3.5" />
                  اليوم الأول للدوري (المعتمد للجدولة)
                </div>
                <p className="mt-1 text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                  {tournament.first_match_day}
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card title={t('committee.detail.pendingRequests')} subtitle={t('committee.detail.pendingRequestsDesc')}>
          {regLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : pending.length === 0 ? (
            <Empty icon={CheckCheck} title={t('committee.detail.noPendingRequests')} compact />
          ) : (
            <div className="space-y-2.5">
              {pending.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-3.5 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-[#111313] dark:text-[#F5F7F2]">{r.team?.name}</p>
                    {r.team?.city && <p className="text-[11px] text-[#65706A] dark:text-[#B2B9B3]">{r.team.city}</p>}
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0"
                    loading={busy === `respond-${r.team?.id}`}
                    onClick={() => respond(r.team?.id, 'approve')}
                  >
                    <Check className="size-3.5" />
                    {t('committee.detail.approveRequest')}
                  </Button>
                  <Button
                    size="sm"
                    variant="dangerSoft"
                    className="shrink-0"
                    loading={busy === `respond-${r.team?.id}`}
                    onClick={() => {
                      if (!window.confirm(t('committee.detail.rejectRequestConfirm'))) return
                      respond(r.team?.id, 'reject')
                    }}
                  >
                    <X className="size-3.5" />
                    {t('committee.detail.rejectRequest')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Tournament Lifecycle Actions */}
      <div className="flex flex-wrap gap-2">
        {editable ? (
          <>
            {tournament.status === 'draft' && (
              <>
                <Button
                  loading={busy === 'openRegistration'}
                  onClick={() =>
                    runAction(
                      'openRegistration',
                      '/open-registration',
                      'committee.detail.openRegistrationToast',
                      'committee.detail.openRegistrationConfirm',
                    )
                  }
                >
                  <Globe className="size-4" />
                  {t('committee.detail.openRegistration')}
                </Button>
                <Link
                  to={'/committee/tournaments/wizard?id=' + tournament.id}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#F7F8F5] dark:bg-[#252B27] px-4 text-sm font-bold text-[#111313] dark:text-[#F5F7F2] border border-[#E1E5DF] dark:border-[#303832] hover:bg-[#E9ECE7] dark:hover:bg-[#303832] transition-colors"
                >
                  <FileEdit className="size-4" />
                  متابعة معالج البطولة
                </Link>
                <Button variant="dangerSoft" loading={busy === 'delete'} onClick={remove}>
                  <Trash2 className="size-4" />
                  {t('committee.detail.delete')}
                </Button>
              </>
            )}
            {tournament.status === 'open_for_registration' && (
              <Button
                loading={busy === 'closeRegistration'}
                onClick={() =>
                  runAction(
                    'closeRegistration',
                    '/close-registration',
                    'committee.detail.closeRegistrationToast',
                    'committee.detail.closeRegistrationConfirm',
                  )
                }
              >
                <DoorClosed className="size-4" />
                {t('committee.detail.closeRegistration')}
              </Button>
            )}
            {tournament.status === 'registration_closed' && (
              <Button
                loading={busy === 'startTournament'}
                disabled={remaining > 0}
                title={remaining > 0 ? t('committee.detail.startRequired') : undefined}
                onClick={() =>
                  runAction(
                    'startTournament',
                    '/start',
                    'committee.detail.startTournamentToast',
                    'committee.detail.startTournamentConfirm',
                  )
                }
              >
                <Play className="size-4" />
                {t('committee.detail.startTournament')}
              </Button>
            )}
            {!['completed', 'cancelled'].includes(tournament.status) && (
              <Button
                variant="dangerSoft"
                loading={busy === 'cancelTournament'}
                onClick={() =>
                  runAction(
                    'cancelTournament',
                    '/cancel',
                    'committee.detail.cancelToast',
                    'committee.detail.cancelTournamentConfirm',
                  )
                }
              >
                <Ban className="size-4" />
                {t('committee.detail.cancelTournament')}
              </Button>
            )}
          </>
        ) : (
          <Link
            to={`/tournaments/${tournament.id}`}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#B8F000] dark:bg-[#D0FF38] px-5 text-sm font-black text-[#111313] shadow-xs transition-colors hover:opacity-90"
          >
            <Eye className="size-4" />
            {t('committee.detail.viewPublic')}
          </Link>
        )}
      </div>
    </div>
  )
}
