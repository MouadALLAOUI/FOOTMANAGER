import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Ban,
  CalendarClock,
  Check,
  CheckCheck,
  DoorClosed,
  Eye,
  Globe,
  Loader2,
  Play,
  Trash2,
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

  const doneCount = (progress?.stages || []).filter((s) => s.done).length
  const totalCount = (progress?.stages || []).length
  const pct = totalCount ? Math.round((doneCount / totalCount) * 100) : 0

  const registered = tournament.stats?.registered_teams ?? 0
  const maxTeams = tournament.teams_count ?? 0
  const remaining = Math.max(0, maxTeams - registered)
  const requiresFee = tournament.requires_registration_fee ?? false

  const stats = [
    { label: t('committee.detail.stat.teams'), value: registered },
    { label: t('committee.detail.stat.groups'), value: tournament.stats?.groups ?? 0 },
    { label: t('committee.detail.stat.fixtures'), value: tournament.stats?.fixtures ?? 0 },
    { label: t('committee.detail.stat.finished'), value: tournament.stats?.finished_matches ?? 0 },
  ]

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
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <p className="text-2xl font-black tracking-tight text-slate-900">{s.value}</p>
            <p className="mt-0.5 text-xs font-semibold text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      <LiveMatchActivity
        load={() => api.get(`/committee/tournaments/${tournament.id}/live`).then((r) => r.data.data)}
        deps={[tournament.id]}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card
          title={t('committee.detail.registrationInfo')}
          className="lg:col-span-2"
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                <CalendarClock className="size-3.5" />
                {t('committee.detail.registrationPeriod')}
              </div>
              <p className="mt-1 text-sm font-bold text-slate-800">
                {periodStart || periodEnd
                  ? `${periodStart || '—'} → ${periodEnd || '—'}`
                  : t('committee.detail.noRegistrationPeriod')}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                <Wallet className="size-3.5" />
                {t('committee.detail.registrationFee')}
              </div>
              <p className="mt-1 text-sm font-bold text-slate-800">
                {requiresFee ? `${tournament.registration_fee} DH` : t('committee.detail.feeFree')}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                <Users className="size-3.5" />
                {t('committee.detail.capacity')}
              </div>
              <p className="mt-1 text-sm font-bold text-slate-800">
                {t('committee.detail.capacity', { count: registered, max: maxTeams })}
              </p>
              {remaining > 0 && <p className="text-[11px] font-semibold text-slate-400">{t('manager.tournaments.remaining', { count: remaining })}</p>}
            </div>
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
                <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-3.5 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">{r.team?.name}</p>
                    {r.team?.city && <p className="text-[11px] text-slate-400">{r.team.city}</p>}
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

      <Card title={t('committee.detail.progress')} subtitle={t('committee.detail.progressDesc')}>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-2" />
            <Skeleton className="h-10" />
            <Skeleton className="h-10" />
          </div>
        ) : (
          <>
            <div className="mb-5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500">
                <span>{t('committee.detail.progressLabel')}</span>
                <span>{doneCount}/{totalCount} • {pct}%</span>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-green-500 transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {(progress?.stages || []).map((stage) => (
                <button
                  key={stage.key}
                  type="button"
                  onClick={() => stage.action && setActive?.(stage.action)}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-start transition-colors ${
                    stage.done
                      ? 'border-green-200/70 bg-green-50/60 hover:bg-green-50'
                      : 'border-slate-100 bg-slate-50/60 hover:border-green-200 hover:bg-green-50/40'
                  }`}
                >
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-full ${
                      stage.done ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-400'
                    }`}
                  >
                    {stage.done ? <Check className="size-4" /> : <Loader2 className="size-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-700">{t(`committee.detail.stages.${stage.key}`)}</p>
                    <p className="text-[11px] text-slate-400">{t(`committee.detail.stageDescs.${stage.key}`)}</p>
                    {stage.meta?.registered != null && (
                      <p className="text-[11px] font-semibold text-slate-500">{stage.meta.registered}/{stage.meta.expected}</p>
                    )}
                    {stage.meta?.fixtures != null && (
                      <p className="text-[11px] font-semibold text-slate-500">{stage.meta.fixtures}</p>
                    )}
                    {!stage.done && stage.action && (
                      <p className="mt-0.5 text-[11px] font-bold text-green-600">{t(`committee.detail.stageAction.${stage.key}`)}</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        {editable ? (
          <>
            {tournament.status === 'draft' && (
              <>
                <Button
                  loading={busy === 'openRegistration'}
                  onClick={() => runAction('openRegistration', '/open-registration', 'committee.detail.openRegistrationToast', 'committee.detail.openRegistrationConfirm')}
                >
                  <Globe className="size-4" />
                  {t('committee.detail.openRegistration')}
                </Button>
                <Button variant="dangerSoft" loading={busy === 'delete'} onClick={remove}>
                  <Trash2 className="size-4" />
                  {t('committee.detail.delete')}
                </Button>
              </>
            )}
            {tournament.status === 'open_for_registration' && (
              <Button
                loading={busy === 'closeRegistration'}
                onClick={() => runAction('closeRegistration', '/close-registration', 'committee.detail.closeRegistrationToast', 'committee.detail.closeRegistrationConfirm')}
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
                onClick={() => runAction('startTournament', '/start', 'committee.detail.startTournamentToast', 'committee.detail.startTournamentConfirm')}
              >
                <Play className="size-4" />
                {t('committee.detail.startTournament')}
              </Button>
            )}
            {!['completed', 'cancelled'].includes(tournament.status) && (
              <Button
                variant="dangerSoft"
                loading={busy === 'cancelTournament'}
                onClick={() => runAction('cancelTournament', '/cancel', 'committee.detail.cancelToast', 'committee.detail.cancelTournamentConfirm')}
              >
                <Ban className="size-4" />
                {t('committee.detail.cancelTournament')}
              </Button>
            )}
          </>
        ) : (
          <Link
            to={`/tournaments/${tournament.id}`}
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-green-500 px-5 text-sm font-bold text-white shadow-[0_8px_20px_rgba(22,163,74,0.28)] transition-colors hover:bg-green-600"
          >
            <Eye className="size-4" />
            {t('committee.detail.viewPublic')}
          </Link>
        )}
      </div>
    </div>
  )
}
