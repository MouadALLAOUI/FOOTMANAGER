import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Ban,
  CalendarClock,
  CheckCheck,
  Clock,
  PlusCircle,
  Shield,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { SectionError } from '../../../components/errors'
import { Badge, Button, Empty, SectionTitle, SkeletonCards, StatusBadge } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'

const fmtDate = (value) => {
  if (!value) return null
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString()
}

export default function ManagerTournaments() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [busy, setBusy] = useState(null)

  const { data, loading, errorState, refetch } = useApi(() => api.get('/manager/tournaments').then((r) => r.data), [])
  const { data: me } = useApi(() => api.get('/me').then((r) => r.data), [])

  const tournaments = data?.data ?? []
  const myTeam = me?.user?.team ?? null
  const hasTeam = Boolean(myTeam)

  const register = async (tournament) => {
    setBusy(`register-${tournament.id}`)
    try {
      await api.post(`/manager/tournaments/${tournament.id}/register`)
      toast.success(t('manager.tournaments.registerSuccess'))
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.message || t('manager.tournaments.registerError'))
    } finally {
      setBusy(null)
    }
  }

  const cancelRequest = async (tournament) => {
    if (!window.confirm(t('manager.tournaments.cancelConfirm'))) return
    setBusy(`cancel-${tournament.id}`)
    try {
      await api.delete(`/manager/tournaments/${tournament.id}/register`)
      toast.success(t('manager.tournaments.cancelSuccess'))
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.message || t('manager.tournaments.registerError'))
    } finally {
      setBusy(null)
    }
  }

  const registrationBadge = (reg) => {
    if (!reg) return null
    const styles = {
      registered: 'bg-green-50 text-green-700 ring-green-200',
      pending: 'bg-amber-50 text-amber-700 ring-amber-200',
      rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
      cancelled: 'bg-slate-100 text-slate-500 ring-slate-200',
    }
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold ring-1 ${styles[reg.status] || styles.pending}`}>
        <span className="size-1.5 rounded-full bg-current" />
        {t(`manager.tournaments.status.${reg.status}`)}
      </span>
    )
  }

  const actions = (tour) => {
    const reg = tour.my_registration
    if (reg?.status === 'registered') {
      return (
        <Badge variant="success">
          <CheckCheck className="size-3.5" />
          {t('manager.tournaments.registered')}
        </Badge>
      )
    }
    if (reg?.status === 'pending') {
      return (
        <div className="flex w-full flex-col gap-2">
          <Badge variant="warning">{t('manager.tournaments.pending')}</Badge>
          <Button size="sm" variant="dangerSoft" loading={busy === `cancel-${tour.id}`} onClick={() => cancelRequest(tour)}>
            <Ban className="size-3.5" />
            {t('manager.tournaments.cancelRequest')}
          </Button>
        </div>
      )
    }
    if (tour.status === 'open_for_registration') {
      const label =
        reg?.status === 'rejected'
          ? t('manager.tournaments.rejected')
          : reg?.status === 'cancelled'
            ? t('manager.tournaments.cancelled')
            : null
      return (
        <div className="flex w-full flex-col gap-2">
          {label && <Badge variant="danger">{label}</Badge>}
          <Button
            size="sm"
            className="w-full"
            disabled={!hasTeam}
            loading={busy === `register-${tour.id}`}
            onClick={() => register(tour)}
          >
            <PlusCircle className="size-4" />
            {reg?.status ? t('manager.tournaments.registerAgain') : t('manager.tournaments.register')}
          </Button>
          {!hasTeam && <p className="text-center text-[11px] font-semibold text-slate-400">{t('manager.tournaments.needTeam')}</p>}
        </div>
      )
    }
    if (tour.status === 'registration_closed') {
      return (
        <Badge variant="neutral">
          <Clock className="size-3.5" />
          {t('manager.tournaments.closed')}
        </Badge>
      )
    }
    return (
      <Badge variant="info">
        <Shield className="size-3.5" />
        {t('manager.tournaments.inProgress')}
      </Badge>
    )
  }

  return (
    <div>
      <SectionTitle title={t('manager.tournaments.title')} subtitle={t('manager.tournaments.subtitle')} />

      {errorState ? (
        <SectionError state={errorState} onRetry={refetch} />
      ) : loading ? (
        <SkeletonCards count={6} />
      ) : tournaments.length === 0 ? (
        <Empty icon={Trophy} title={t('manager.tournaments.empty')} description={t('manager.tournaments.emptyDesc')} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {tournaments.map((tour) => {
            const registered = tour.registered_teams ?? 0
            const max = tour.teams_count ?? 0
            const remaining = Math.max(0, max - registered)
            const start = fmtDate(tour.registration_start_at)
            const end = fmtDate(tour.registration_end_at)
            return (
              <div
                key={tour.id}
                className="flex flex-col rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-green-50 text-green-600">
                      <Trophy className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-slate-900">{tour.name}</p>
                      <p className="text-[11px] font-semibold text-slate-400">
                        {tour.edition || ''} {tour.category || ''} • {t(`committee.tournaments.formats.${tour.tournament_format}`)}
                      </p>
                    </div>
                  </div>
                  <StatusBadge status={tour.status} />
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2.5 text-xs font-bold text-slate-600">
                    <Users className="size-4 text-slate-400" />
                    {t('committee.detail.teamsCount', { count: registered })}
                    <span className="text-slate-300">/</span>
                    {max}
                    {remaining > 0 && <span className="text-slate-400">• {t('manager.tournaments.remaining', { count: remaining })}</span>}
                  </div>
                  {(start || end) && (
                    <div className="flex items-center gap-2.5 text-xs font-bold text-slate-600">
                      <CalendarClock className="size-4 text-slate-400" />
                      {`${start || '—'} → ${end || '—'}`}
                    </div>
                  )}
                  <div className="flex items-center gap-2.5 text-xs font-bold text-slate-600">
                    <Wallet className="size-4 text-slate-400" />
                    {tour.requires_registration_fee ? `${tour.registration_fee} DH` : t('manager.tournaments.free')}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
                  {registrationBadge(tour.my_registration)}
                  <Link
                    to={`/tournaments/${tour.id}`}
                    className="text-xs font-extrabold text-green-600 transition-colors hover:text-green-700"
                  >
                    {t('ov.common.view')} ←
                  </Link>
                </div>

                <div className="mt-3">{actions(tour)}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
