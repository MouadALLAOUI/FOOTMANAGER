import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Clock, XCircle, Users, CalendarDays, MessageSquare, UserCheck, ShieldPlus } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { SectionError } from '../../../components/errors'
import { Card, SectionTitle, Button, Empty, StatusBadge, Modal, SkeletonCards } from '../../../components/dashboard/ui'
import { ConfirmDialog, useConfirm } from '../../../components/ui/ConfirmDialog'
import { toast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'

const TABS = ['all', 'pending', 'approved', 'rejected', 'cancelled']

const statusMeta = {
  pending: { icon: Clock, color: 'bg-amber-50 text-amber-600' },
  approved: { icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
  rejected: { icon: XCircle, color: 'bg-rose-50 text-rose-600' },
  cancelled: { icon: XCircle, color: 'bg-slate-100 text-slate-500' },
}

function RequestCard({ req, onCancel, locale }) {
  const { t } = useTranslation()
  const meta = statusMeta[req.status] || statusMeta.pending
  const StatusIcon = meta.icon

  const fmtDate = (dt) =>
    dt ? new Date(dt).toLocaleString(locale, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

  return (
    <Card>
      <div className="flex items-start gap-4">
        <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${meta.color}`}>
          <StatusIcon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-base font-extrabold text-slate-900">
              {req.team_name || t('playerTeamRequest.noTeamName')}
            </p>
            <StatusBadge status={req.status} />
          </div>
          <p className="mt-1 text-xs text-slate-500">{t(`playerTeamRequest.${req.status}`)}</p>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {req.message && (
          <div className="flex items-start gap-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <MessageSquare className="mt-0.5 size-4 shrink-0 text-slate-400" />
            <div>
              <span className="block text-xs font-bold text-slate-500">{t('playerTeamRequest.message')}</span>
              <p className="mt-1 text-sm text-slate-700">{req.message}</p>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
          <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
            <CalendarDays className="size-3.5" />
            {t('playerTeamRequest.submittedAt')}
          </span>
          <span className="text-sm font-semibold text-slate-700">{fmtDate(req.created_at)}</span>
        </div>

        {req.handled_by_name && (
          <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <UserCheck className="size-3.5" />
              {t('playerTeamRequest.handledBy')}
            </span>
            <span className="text-sm font-semibold text-slate-700">{req.handled_by_name}</span>
          </div>
        )}

        {req.handled_at && (
          <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <CalendarDays className="size-3.5" />
              {t('playerTeamRequest.responseDate')}
            </span>
            <span className="text-sm font-semibold text-slate-700">{fmtDate(req.handled_at)}</span>
          </div>
        )}

        {req.status === 'rejected' && req.rejection_reason && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
            <span className="block text-xs font-bold text-rose-600">{t('playerTeamRequest.rejectionReason')}</span>
            <p className="mt-1 text-sm font-semibold text-rose-700">{req.rejection_reason}</p>
          </div>
        )}

        {req.status === 'approved' && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <span className="block text-xs font-bold text-emerald-600">{t('playerTeamRequest.approvedMessage')}</span>
          </div>
        )}
      </div>

      {req.status === 'pending' && (
        <div className="mt-4 flex justify-end">
          <Button variant="danger" size="sm" onClick={() => onCancel(req)}>
            {t('playerTeamRequest.cancel')}
          </Button>
        </div>
      )}
    </Card>
  )
}

export default function Requests() {
  const { t, i18n } = useTranslation()
  const [tab, setTab] = useState('all')
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ team_name: '', message: '' })
  const [busy, setBusy] = useState(false)

  const confirm = useConfirm()

  const { data, loading, errorState, refetch } = useApi(
    () => api.get('/player/team-requests').then((r) => r.data),
    [],
  )

  const locale = i18n.language?.startsWith('en') ? 'en-GB' : 'ar-MA'
  const allRequests = data?.requests || []
  const requests = tab === 'all' ? allRequests : allRequests.filter((r) => r.status === tab)

  const hasPending = allRequests.some((r) => r.status === 'pending')

  const submit = async () => {
    setBusy(true)
    try {
      const res = await api.post('/player/team-requests', {
        team_name: form.team_name || undefined,
        message: form.message || undefined,
      })
      toast.success(res.data.message || t('playerTeamRequest.requestSubmitted'))
      setFormOpen(false)
      setForm({ team_name: '', message: '' })
      refetch()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  const cancelRequest = async (req) => {
    try {
      await api.put(`/player/team-requests/${req.id}/cancel`)
      toast.success(t('playerTeamRequest.cancelledSuccess'))
      refetch()
    } catch (e) {
      toastApiError(e, t)
    }
  }

  const confirmCancel = (req) => {
    confirm.run(() => cancelRequest(req), {
      title: t('playerTeamRequest.cancelConfirm'),
      confirmLabel: t('playerTeamRequest.cancel'),
    })
  }

  const tabCounts = {
    all: allRequests.length,
    pending: allRequests.filter((r) => r.status === 'pending').length,
    approved: allRequests.filter((r) => r.status === 'approved').length,
    rejected: allRequests.filter((r) => r.status === 'rejected').length,
    cancelled: allRequests.filter((r) => r.status === 'cancelled').length,
  }

  if (errorState) {
    return (
      <Card>
        <SectionError state={errorState} onRetry={refetch} />
      </Card>
    )
  }

  return (
    <div>
      <SectionTitle
        title={t('playerTeamRequest.title')}
        subtitle={t('playerTeamRequest.subtitle')}
        action={
          !hasPending && (
            <Button onClick={() => setFormOpen(true)}>
              <Users className="size-4" />
              {t('playerTeamRequest.submitNew')}
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tKey) => (
          <button
            key={tKey}
            onClick={() => setTab(tKey)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              tab === tKey
                ? 'bg-green-600 text-white shadow'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t(`playerTeamRequest.tab.${tKey}`)} ({tabCounts[tKey]})
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonCards count={3} className="space-y-4" />
      ) : requests.length === 0 ? (
        <Card>
          <Empty
            icon={Users}
            title={tab === 'all' ? t('playerTeamRequest.noRequest') : t('playerTeamRequest.emptyTab')}
            action={
              !hasPending && (
                <Button onClick={() => setFormOpen(true)}>
                  <Users className="size-4" />
                  {t('playerTeamRequest.submitNew')}
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <RequestCard key={req.id} req={req} onCancel={confirmCancel} locale={locale} />
          ))}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={t('playerTeamRequest.submitNew')} subtitle={t('playerTeamRequest.subtitle')}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">{t('playerTeamRequest.teamName')}</label>
            <input
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
              placeholder={t('playerTeamRequest.teamNamePlaceholder')}
              value={form.team_name}
              onChange={(e) => setForm((p) => ({ ...p, team_name: e.target.value }))}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-600">{t('playerTeamRequest.message')}</label>
            <textarea
              className="h-24 w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
              placeholder={t('playerTeamRequest.messagePlaceholder')}
              value={form.message}
              onChange={(e) => setForm((p) => ({ ...p, message: e.target.value }))}
            />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setFormOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button className="flex-1" disabled={busy} onClick={submit}>
              {busy ? t('player.teamRequest.sending') : t('player.teamRequest.send')}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={confirm.open}
        loading={confirm.loading}
        title={confirm.options.title}
        description={confirm.options.description}
        confirmLabel={confirm.options.confirmLabel}
        cancelLabel={confirm.options.cancelLabel}
        tone={confirm.options.tone}
        onConfirm={confirm.confirm}
        onClose={confirm.close}
      />
    </div>
  )
}
