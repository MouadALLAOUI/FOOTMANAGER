import i18n from '../../../i18n'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, Check, X, CalendarDays, Users, MessageSquare } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import DataTable from '../../../components/admin/DataTable'
import { PageHeader, Button, Card, Input, Badge, Avatar, Skeleton } from '../../../components/admin/ui'
import Drawer from '../../../components/dashboard/Drawer'
import { toast } from '../../../components/ui/Toast'
import { ConfirmDialog, useConfirm } from '../../../components/ui/ConfirmDialog'
import { toastApiError } from '../../../lib/errors'

const statusLabels = {
  get pending() { return i18n.t('dash.underReview') },
  get approved() { return i18n.t('dash.approved') },
  get rejected() { return i18n.t('dash.rejected') },
  get cancelled() { return i18n.t('dash.cancelled3') },
}

const statusTones = {
  pending: 'amber',
  approved: 'green',
  rejected: 'red',
  cancelled: 'slate',
}

function ApproveModal({ request, onClose, onApprove }) {
  const { t } = useTranslation()
  const [teamName, setTeamName] = useState(request?.team_name || '')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await onApprove(request.id, teamName.trim() || undefined)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">{t('dash.approveRequest')}</h3>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100">
            <X className="size-4" />
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
          <p className="text-xs text-slate-500">{t('dash.player3')}</p>
          <p className="mt-1 text-sm font-bold text-slate-800">{request?.player?.name}</p>
          <p className="mt-0.5 text-xs text-slate-400">{t('dash.aNewTeamWillBeCreatedAndThePlayerLinkedToIt2')}</p>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-xs font-bold text-slate-500">{t('dash.newTeamNameOptional')}</label>
          <Input
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder={t('dash.enterTeamName')}
          />
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose}>{t('dash.cancel')}</Button>
          <Button className="flex-1" loading={loading} onClick={handleSubmit}>
            <Check className="size-4" />
            {t('dash.approve')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function RejectModal({ request, onClose, onReject }) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await onReject(request.id, reason.trim() || undefined)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">{t('dash.rejectRequest')}</h3>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100">
            <X className="size-4" />
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
          <p className="text-xs text-slate-500">{t('dash.player3')}</p>
          <p className="mt-1 text-sm font-bold text-slate-800">{request?.player?.name}</p>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-xs font-bold text-slate-500">{t('dash.rejectionReason')}</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-rose-400 focus:bg-white focus:ring-2 focus:ring-rose-100"
            placeholder={t('dash.enterRejectionReason')}
          />
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose}>{t('dash.cancel')}</Button>
          <Button variant="red" className="flex-1" loading={loading} onClick={handleSubmit}>
            <X className="size-4" />
            {t('dash.reject')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function Requests() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('pending')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState([])
  const [busyId, setBusyId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [approveModal, setApproveModal] = useState(null)
  const [rejectModal, setRejectModal] = useState(null)

  const params = useMemo(
    () => ({ status: tab, search, page, per_page: 15 }),
    [tab, search, page],
  )

  const { data, loading, refetch } = useApi(
    () => api.get('/admin/player-team-requests', { params }).then((r) => r.data),
    [tab, search, page],
  )

  const rows = data?.requests || []
  const pagination = data?.pagination || {}

  const tabs = [
    { value: 'pending', label: t('dash.underReview') },
    { value: 'approved', label: t('dash.approved') },
    { value: 'rejected', label: t('dash.rejected') },
    { value: 'cancelled', label: t('dash.cancelled3') },
    { value: 'all', label: t('dash.all') },
  ]

  const openDetail = async (row) => {
    setDetail({ row, detail: null })
    setDetailLoading(true)
    try {
      const res = await api.get(`/admin/player-team-requests/${row.id}`)
      setDetail((d) => ({ ...d, detail: res.data }))
    } catch (e) {
      toastApiError(e, t)
      setDetail(null)
    } finally {
      setDetailLoading(false)
    }
  }

  const approve = async (id, teamName) => {
    setBusyId(id)
    try {
      const body = teamName ? { team_name: teamName } : {}
      const res = await api.put(`/admin/player-team-requests/${id}/approve`, body)
      toast.success(res.data.message || t('dash.requestApprovedSuccessfully'))
      refetch()
      if (detail?.row?.id === id) {
        setDetail((d) => ({ ...d, row: { ...d.row, status: 'approved' } }))
      }
      return true
    } catch (e) {
      toastApiError(e, t)
      return false
    } finally {
      setBusyId(null)
    }
  }

  const reject = async (id, reason) => {
    setBusyId(id)
    try {
      const body = reason ? { rejection_reason: reason } : {}
      const res = await api.put(`/admin/player-team-requests/${id}/reject`, body)
      toast.success(res.data.message || t('dash.requestRejected'))
      refetch()
      if (detail?.row?.id === id) {
        setDetail((d) => ({ ...d, row: { ...d.row, status: 'rejected' } }))
      }
      return true
    } catch (e) {
      toastApiError(e, t)
      return false
    } finally {
      setBusyId(null)
    }
  }

  const confirm = useConfirm()

  const actApprove = (row) => {
    confirm.run(() => approve(row.id), {
      title: t('dash.approveThisRequest'),
      description: t('dash.aNewTeamWillBeCreatedAndThePlayerLinkedToIt'),
      confirmLabel: t('dash.approve'),
    })
  }

  const actReject = (row) => {
    setRejectModal(row)
  }

  const columns = [
    {
      key: 'player',
      label: t('dash.player3'),
      render: (r) => (
        <div className="flex items-center gap-3">
          <Avatar name={r.player?.name} className="size-10" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{r.player?.name || '—'}</p>
            <p className="text-[11px] text-slate-400">{r.player?.phone || r.player?.email || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'team_name',
      label: t('dash.teamName'),
      render: (r) => (
        <span className="text-sm font-semibold text-slate-700">
          {r.team_name || (
            <span className="text-slate-400">—</span>
          )}
        </span>
      ),
    },
    {
      key: 'status',
      label: t('dash.status'),
      render: (r) => (
        <Badge tone={statusTones[r.status] || 'slate'}>
          {statusLabels[r.status] || r.status}
        </Badge>
      ),
    },
    {
      key: 'created_at',
      label: t('dash.submittedOn'),
      render: (r) => (
        <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-500">
          <CalendarDays className="size-4 text-slate-400" />
          {r.created_at ? new Date(r.created_at).toLocaleDateString('ar-MA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: t('dash.actions'),
      className: 'text-end',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {r.status === 'pending' && (
            <>
              <Button
                size="sm"
                variant="primary"
                loading={busyId === r.id}
                disabled={busyId !== null}
                onClick={() => setApproveModal(r)}
              >
                <Check className="size-3.5" />
                {t('dash.approve')}
              </Button>
              <Button
                size="sm"
                variant="softRed"
                loading={busyId === r.id}
                disabled={busyId !== null}
                onClick={() => actReject(r)}
              >
                <X className="size-3.5" />
                {t('dash.reject')}
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => openDetail(r)}>
            <Eye className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  const detailRow = detail?.row
  const detailInfo = detail?.detail
  const request = detailInfo?.request

  return (
    <div>
      <PageHeader
        title={t('dash.playerRequests')}
        subtitle={t('dash.managePlayersRequestsToJoinTeams')}
      />

      <DataTable
        rows={rows}
        loading={loading}
        columns={columns}
        filterTabs={tabs}
        tabValue={tab}
        onTabChange={(t) => { setTab(t); setPage(1); setSelected([]) }}
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder={t('dash.searchByName')}
        selectable
        selected={selected}
        onSelectedChange={setSelected}
        onRowClick={openDetail}
        page={pagination.current_page || 1}
        lastPage={pagination.last_page || 1}
        total={pagination.total || 0}
        perPage={pagination.per_page || 15}
        onPageChange={setPage}
        emptyTitle={t('dash.noRequestsRightNow')}
        emptyDescription={t('dash.changeTheFilterOrSearchForSomethingElse')}
      />

      <Drawer
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={t('dash.playerRequestDetails')}
        subtitle={detailRow?.player?.name}
        footer={
          detailRow?.status === 'pending' && (
            <>
              <Button
                variant="softRed"
                loading={busyId === detailRow?.id}
                onClick={() => { setDetail(null); actReject(detailRow) }}
              >
                <X className="size-4" />
                {t('dash.reject')}
              </Button>
              <Button
                loading={busyId === detailRow?.id}
                onClick={() => { setDetail(null); setApproveModal(detailRow) }}
              >
                <Check className="size-4" />
                {t('dash.approve')}
              </Button>
            </>
          )
        }
      >
        {detailLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-24 rounded-3xl" />
            <Skeleton className="h-40 rounded-3xl" />
            <Skeleton className="h-32 rounded-3xl" />
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-4 rounded-3xl bg-slate-50 p-5">
              <Avatar name={detailRow?.player?.name} className="size-16 text-xl" />
              <div className="min-w-0">
                <p className="text-lg font-black text-slate-900">{detailRow?.player?.name}</p>
                <p className="mt-0.5 text-xs text-slate-400">{detailRow?.player?.email || '—'}</p>
                <div className="mt-2">
                  <Badge tone={statusTones[detailRow?.status] || 'slate'}>
                    {statusLabels[detailRow?.status] || detailRow?.status}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{t('dash.teamName')}</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{detailRow?.team_name || '—'}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{t('dash.submittedOn')}</p>
                <p className="mt-1 text-sm font-bold text-slate-800">
                  {detailRow?.created_at ? new Date(detailRow.created_at).toLocaleDateString('ar-MA', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                </p>
              </div>
            </div>

            {request?.message && (
              <div className="rounded-2xl border border-slate-100 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare className="size-4 text-slate-400" />
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{t('dash.playerMessage')}</p>
                </div>
                <p className="text-sm leading-relaxed text-slate-700">{request.message}</p>
              </div>
            )}

            {request?.handled_by && (
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">{t('dash.reviewedBy')}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Avatar name={request.handled_by.name} className="size-8" />
                  <div>
                    <p className="text-sm font-bold text-slate-800">{request.handled_by.name}</p>
                    {request.handled_by.email && <p className="text-[11px] text-slate-400">{request.handled_by.email}</p>}
                  </div>
                </div>
              </div>
            )}

            {request?.rejection_reason && (
              <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4">
                <p className="text-[11px] font-black uppercase tracking-wider text-rose-400">{t('dash.rejectionReason')}</p>
                <p className="mt-1 text-sm leading-relaxed text-rose-700">{request.rejection_reason}</p>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={confirm.open}
        loading={confirm.loading}
        title={confirm.options.title}
        description={confirm.options.description}
        confirmLabel={confirm.options.confirmLabel}
        onConfirm={confirm.confirm}
        onClose={confirm.close}
      />

      {approveModal && (
        <ApproveModal
          request={approveModal}
          onClose={() => setApproveModal(null)}
          onApprove={approve}
        />
      )}

      {rejectModal && (
        <RejectModal
          request={rejectModal}
          onClose={() => setRejectModal(null)}
          onReject={reject}
        />
      )}
    </div>
  )
}
