import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Clock, ShieldPlus, Users, XCircle } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { SectionError } from '../../../components/errors'
import { Card, SectionTitle, Button, Empty, StatusBadge, Modal, SkeletonCards } from '../../../components/dashboard/ui'
import { ConfirmDialog, useConfirm } from '../../../components/ui/ConfirmDialog'
import { toast } from '../../../components/ui/Toast'

const statusMeta = {
  pending: { icon: Clock, color: 'bg-amber-50 text-amber-600', descKey: 'pendingDesc' },
  approved: { icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600', descKey: 'approvedDesc' },
  rejected: { icon: XCircle, color: 'bg-rose-50 text-rose-600', descKey: 'rejectedDesc' },
  cancelled: { icon: XCircle, color: 'bg-slate-100 text-slate-500', descKey: 'cancelled' },
}

export default function Requests() {
  const { t, i18n } = useTranslation()
  const { data, loading, errorState, refetch } = useApi(() => api.get('/player/overview').then((r) => r.data))

  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState({ team_name: '', message: '' })
  const [busy, setBusy] = useState(false)

  const confirm = useConfirm()

  const teamRequest = data?.team_request || null
  const locale = i18n.language?.startsWith('en') ? 'en-GB' : 'ar-MA'

  const fmtDate = (dt) =>
    dt ? new Date(dt).toLocaleString(locale, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

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
      toast.error(e.response?.data?.message || t('player.teamRequest.failed'))
    } finally {
      setBusy(false)
    }
  }

  const cancelRequest = async () => {
    try {
      await api.put(`/player/team-requests/${teamRequest.id}/cancel`)
      toast.success(t('playerTeamRequest.cancelledSuccess'))
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.message || t('player.teamRequest.failed'))
    }
  }

  const confirmCancel = () => {
    confirm.run(cancelRequest, {
      title: t('playerTeamRequest.cancelConfirm'),
      confirmLabel: t('playerTeamRequest.cancel'),
    })
  }

  if (errorState) {
    return (
      <Card>
        <SectionError state={errorState} onRetry={refetch} />
      </Card>
    )
  }

  if (loading) return <SkeletonCards count={2} className="space-y-3" />

  const hasRequest = Boolean(teamRequest)
  const status = teamRequest?.status || null
  const meta = status ? statusMeta[status] : null
  const StatusIcon = meta?.icon || Clock

  return (
    <div>
      <SectionTitle
        title={t('playerTeamRequest.title')}
        subtitle={t('playerTeamRequest.subtitle')}
        action={
          (!hasRequest || status === 'rejected' || status === 'cancelled') && (
            <Button onClick={() => setFormOpen(true)}>
              <Users className="size-4" />
              {t('playerTeamRequest.submitNew')}
            </Button>
          )
        }
      />

      {!hasRequest ? (
        <Card>
          <Empty
            icon={Users}
            title={t('playerTeamRequest.noRequest')}
            action={
              <Button onClick={() => setFormOpen(true)}>
                <Users className="size-4" />
                {t('playerTeamRequest.submitNew')}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <div className="flex items-start gap-4">
              <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${meta?.color || 'bg-slate-100 text-slate-500'}`}>
                <StatusIcon className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base font-extrabold text-slate-900">
                    {t(`playerTeamRequest.${status}`)}
                  </p>
                  <StatusBadge status={status} />
                </div>
                <p className="mt-1 text-sm text-slate-500">
                  {t(`playerTeamRequest.${meta?.descKey || 'pendingDesc'}`)}
                </p>
              </div>
            </div>
          </Card>

          <Card>
            <div className="space-y-3">
              {teamRequest.team_name && (
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <span className="text-xs font-bold text-slate-500">{t('playerTeamRequest.teamName')}</span>
                  <span className="text-sm font-extrabold text-slate-900">{teamRequest.team_name}</span>
                </div>
              )}

              {teamRequest.message && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <span className="block text-xs font-bold text-slate-500">{t('playerTeamRequest.message')}</span>
                  <p className="mt-1 text-sm text-slate-700">{teamRequest.message}</p>
                </div>
              )}

              <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <span className="text-xs font-bold text-slate-500">{t('playerTeamRequest.submittedAt')}</span>
                <span className="text-sm font-semibold text-slate-700">{fmtDate(teamRequest.created_at)}</span>
              </div>

              {teamRequest.handled_by && (
                <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                  <span className="text-xs font-bold text-slate-500">{t('playerTeamRequest.handledBy')}</span>
                  <span className="text-sm font-semibold text-slate-700">{teamRequest.handled_by}</span>
                </div>
              )}

              {status === 'rejected' && teamRequest.rejection_reason && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
                  <span className="block text-xs font-bold text-rose-600">{t('playerTeamRequest.rejectionReason')}</span>
                  <p className="mt-1 text-sm font-semibold text-rose-700">{teamRequest.rejection_reason}</p>
                </div>
              )}
            </div>
          </Card>

          {status === 'pending' && (
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-extrabold text-slate-900">{t('playerTeamRequest.pending')}</p>
                  <p className="text-xs text-slate-500">{t('playerTeamRequest.pendingDesc')}</p>
                </div>
                <Button variant="danger" onClick={confirmCancel}>
                  {t('playerTeamRequest.cancel')}
                </Button>
              </div>
            </Card>
          )}

          {(status === 'rejected' || status === 'cancelled') && (
            <Card>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-extrabold text-slate-900">{t('playerTeamRequest.rejectedDesc')}</p>
                </div>
                <Button onClick={() => setFormOpen(true)}>
                  <Users className="size-4" />
                  {t('playerTeamRequest.submitNew')}
                </Button>
              </div>
            </Card>
          )}
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
