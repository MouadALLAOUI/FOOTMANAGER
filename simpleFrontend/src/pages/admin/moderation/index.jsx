import i18n from '../../../i18n'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ClipboardList, EyeOff, Eye, CheckCircle2 } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import DataTable from '../../../components/admin/DataTable'
import { PageHeader, Button, Badge, Tabs } from '../../../components/admin/ui'
import { toast } from '../../../components/ui/Toast'
import { ConfirmDialog, useConfirm } from '../../../components/ui/ConfirmDialog'
import { toastApiError } from '../../../lib/errors'

const typeLabels = {
  get comment() { return i18n.t('dash.comment') },
  get chat_message() { return i18n.t('dash.chatMessage') },
  get player_review() { return i18n.t('dash.playerReview') },
  get stadium_review() { return i18n.t('dash.fieldReview') },
  get team() { return i18n.t('dash.team') },
  get player() { return i18n.t('dash.player') },
  get stadium() { return i18n.t('dash.field3') },
  get match() { return i18n.t('dash.match') },
  get announcement() { return i18n.t('dash.announcement') },
  get activity() { return i18n.t('dash.activity') },
  get booking() { return i18n.t('dash.booking') },
}

const reportStatusMeta = {
  get pending() { return i18n.t('dash.pendingReview') },
  get reviewed() { return i18n.t('dash.reviewed') },
  get resolved() { return i18n.t('dash.resolved') },
  get dismissed() { return i18n.t('dash.dismissed') },
}

export default function Moderation() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('reports')
  const [reportStatus, setReportStatus] = useState('pending')
  const [reportPage, setReportPage] = useState(1)
  const [hiddenPage, setHiddenPage] = useState(1)
  const [busyId, setBusyId] = useState(null)

  const { data: reports, loading: reportsLoading, refetch: refetchReports } = useApi(
    () => api.get('/admin/moderation/reports', { params: { status: reportStatus, page: reportPage, per_page: 15 } }).then((r) => r.data),
    [reportStatus, reportPage],
  )

  const { data: hidden, loading: hiddenLoading, refetch: refetchHidden } = useApi(
    () => api.get('/admin/moderation/hidden', { params: { page: hiddenPage, per_page: 15 } }).then((r) => r.data),
    [hiddenPage],
  )

  const resolve = async (id, status) => {
    setBusyId(`r-${id}`)
    try {
      const res = await api.put(`/admin/moderation/reports/${id}`, { status })
      toast.success(res.data.message || t('dash.reportStatusUpdated'))
      refetchReports()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusyId(null)
    }
  }

  const hideAndResolve = async (report) => {
    setBusyId(`r-${report.id}`)
    try {
      if (report.reportable) {
        await api.post(`/admin/moderation/hide/${report.reportable.type}/${report.reportable.id}`)
      }
      await api.put(`/admin/moderation/reports/${report.id}`, { status: 'resolved' })
      toast.success(t('dash.contentHiddenAndReportResolved'))
      refetchReports()
      refetchHidden()
      return true
    } catch (e) {
      toastApiError(e, t)
      return false
    } finally {
      setBusyId(null)
    }
  }

  const confirm = useConfirm()
  const confirmHide = (report) => {
    if (!report) return
    confirm.run(() => hideAndResolve(report), {
      title: t('dash.hideContentAndResolveReport'),
      description: t('dash.theReportedContentWillBeHiddenFromEveryoneAndTheReportResolved'),
      confirmLabel: t('dash.hideResolve'),
    })
  }

  const unhide = async (item) => {
    setBusyId(`h-${item.id}-${item.type}`)
    try {
      const res = await api.post(`/admin/moderation/unhide/${item.type}/${item.id}`)
      toast.success(res.data.message || t('dash.contentIsVisibleAgain'))
      refetchHidden()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusyId(null)
    }
  }

  const reportRows = reports?.data || []
  const reportMeta = reports?.meta || {}
  const hiddenRows = hidden?.items || []
  const hiddenMeta = hidden?.pagination || {}

  const reportColumns = [
    {
      key: 'reason',
      label: t('dash.reportReason'),
      render: (r) => (
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">{r.reason}</p>
          {r.details && <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">{r.details}</p>}
        </div>
      ),
    },
    {
      key: 'reportable',
      label: t('dash.content'),
      render: (r) => (
        <div className="min-w-0">
          {r.reportable ? (
            <>
              <Badge tone="slate">{typeLabels[r.reportable.type] || r.reportable.type}</Badge>
              <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500">{r.reportable.summary || '—'}</p>
            </>
          ) : (
            <span className="text-xs text-slate-400">{t('dash.contentDeleted')}</span>
          )}
        </div>
      ),
    },
    {
      key: 'reporter',
      label: t('dash.reportedBy'),
      render: (r) => (
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-500">
            {r.reporter?.name?.charAt(0) || '؟'}
          </div>
          <span className="text-[13px] font-semibold text-slate-700">{r.reporter?.name || '—'}</span>
        </div>
      ),
    },
    {
      key: 'created_at',
      label: t('dash.date'),
      render: (r) => (
        <span className="text-[13px] text-slate-500">
          {r.created_at ? new Date(r.created_at).toLocaleDateString('ar-MA', { day: 'numeric', month: 'short' }) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: t('dash.actions'),
      className: 'text-end',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {r.status === 'pending' ? (
            <>
                <Button size="sm" variant="soft" loading={busyId === `r-${r.id}`} disabled={busyId !== null} onClick={() => confirmHide(r)}>
                <EyeOff className="size-3.5" />
                {t('dash.hideResolve')}
              </Button>
              <Button size="sm" variant="primary" loading={busyId === `r-${r.id}`} disabled={busyId !== null} onClick={() => resolve(r.id, 'resolved')}>
                <CheckCircle2 className="size-3.5" />
                {t('dash.resolve')}
              </Button>
              <Button size="sm" variant="softAmber" loading={busyId === `r-${r.id}`} disabled={busyId !== null} onClick={() => resolve(r.id, 'dismissed')}>
                {t('dash.dismiss')}
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" loading={busyId === `r-${r.id}`} disabled={busyId !== null} onClick={() => resolve(r.id, 'reviewed')}>
                {t('dash.review')}
              </Button>
              {r.reportable && (
              <Button size="sm" variant="soft" loading={busyId === `r-${r.id}`} disabled={busyId !== null} onClick={() => confirmHide(r)}>
                  <EyeOff className="size-3.5" />
                  {t('dash.hide')}
                </Button>
              )}
            </>
          )}
        </div>
      ),
    },
  ]

  const hiddenColumns = [
    {
      key: 'summary',
      label: t('dash.hiddenContent'),
      render: (it) => (
        <div className="min-w-0">
          <p className="max-w-xs truncate text-sm font-bold text-slate-900">{it.summary || t('dash.noText')}</p>
          <Badge tone="violet" className="mt-1">{typeLabels[it.type] || it.type}</Badge>
        </div>
      ),
    },
    {
      key: 'author',
      label: t('dash.contentOwner'),
      render: (it) => (
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-full bg-slate-100 text-xs font-black text-slate-500">
            {it.author?.name?.charAt(0) || '؟'}
          </div>
          <span className="text-[13px] font-semibold text-slate-700">{it.author?.name || '—'}</span>
        </div>
      ),
    },
    {
      key: 'hidden_at',
      label: t('dash.hiddenOn'),
      render: (it) => (
        <span className="text-[13px] text-slate-500">
          {it.hidden_at ? new Date(it.hidden_at).toLocaleDateString('ar-MA', { day: 'numeric', month: 'short' }) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: t('dash.actions'),
      className: 'text-end',
      render: (it) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="soft" loading={busyId === `h-${it.id}-${it.type}`} disabled={busyId !== null} onClick={() => unhide(it)}>
            <Eye className="size-3.5" />
            {t('dash.show')}
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('dash.moderationReports')}
        subtitle={t('dash.reviewReportsAndManageHiddenContent')}
        actions={
          <Tabs
            value={tab}
            onChange={(v) => setTab(v)}
            items={[
              { value: 'reports', label: t('dash.reports'), icon: ClipboardList },
              { value: 'hidden', label: t('dash.hiddenContent'), icon: EyeOff },
            ]}
          />
        }
      />

      {tab === 'reports' ? (
        <DataTable
          rows={reportRows}
          loading={reportsLoading}
          columns={reportColumns}
          filterTabs={Object.keys(reportStatusMeta).map((k) => ({ value: k, label: reportStatusMeta[k] }))}
          tabValue={reportStatus}
          onTabChange={(v) => { setReportStatus(v); setReportPage(1) }}
          onRowClick={() => {}}
          page={reportMeta.current_page || 1}
          lastPage={reportMeta.last_page || 1}
          total={reportMeta.total || 0}
          perPage={reportMeta.per_page || 15}
          onPageChange={setReportPage}
          emptyTitle={t('dash.noReportsInThisState')}
          emptyDescription={t('dash.whenUsersReportContentTheReportsAppearHere')}
        />
      ) : (
        <DataTable
          rows={hiddenRows}
          loading={hiddenLoading}
          columns={hiddenColumns}
          onRowClick={() => {}}
          page={hiddenMeta.current_page || 1}
          lastPage={hiddenMeta.last_page || 1}
          total={hiddenMeta.total || 0}
          perPage={hiddenMeta.per_page || 15}
          onPageChange={setHiddenPage}
          emptyTitle={t('dash.noHiddenContent')}
          emptyDescription={t('dash.allContentIsCurrentlyVisible')}
        />
      )}

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
