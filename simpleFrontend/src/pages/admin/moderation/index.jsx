import { useState } from 'react'
import { ClipboardList, EyeOff, Eye, CheckCircle2 } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import DataTable from '../../../components/admin/DataTable'
import { PageHeader, Button, Badge, Tabs } from '../../../components/admin/ui'
import { toast } from '../../../components/ui/Toast'

const typeLabels = {
  comment: 'تعليق',
  chat_message: 'رسالة دردشة',
  player_review: 'تقييم لاعب',
  stadium_review: 'تقييم ملعب',
  team: 'فريق',
  player: 'لاعب',
  stadium: 'ملعب',
  match: 'مباراة',
  announcement: 'إعلان',
  activity: 'نشاط',
  booking: 'حجز',
}

const reportStatusMeta = {
  pending: 'بانتظار المراجعة',
  reviewed: 'تمت المراجعة',
  resolved: 'تم الحل',
  dismissed: 'مهمل',
}

export default function Moderation() {
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
      toast.success(res.data.message || 'تم تحديث حالة البلاغ')
      refetchReports()
    } catch (e) {
      toast.error(e.response?.data?.message || 'حدث خطأ، حاول مجدداً')
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
      toast.success('تم إخفاء المحتوى وحل البلاغ')
      refetchReports()
      refetchHidden()
    } catch (e) {
      toast.error(e.response?.data?.message || 'حدث خطأ، حاول مجدداً')
    } finally {
      setBusyId(null)
    }
  }

  const unhide = async (item) => {
    setBusyId(`h-${item.id}-${item.type}`)
    try {
      const res = await api.post(`/admin/moderation/unhide/${item.type}/${item.id}`)
      toast.success(res.data.message || 'تم إظهار المحتوى')
      refetchHidden()
    } catch (e) {
      toast.error(e.response?.data?.message || 'حدث خطأ، حاول مجدداً')
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
      label: 'سبب البلاغ',
      render: (r) => (
        <div className="min-w-0">
          <p className="text-sm font-bold text-slate-900">{r.reason}</p>
          {r.details && <p className="mt-0.5 max-w-xs truncate text-xs text-slate-400">{r.details}</p>}
        </div>
      ),
    },
    {
      key: 'reportable',
      label: 'المحتوى',
      render: (r) => (
        <div className="min-w-0">
          {r.reportable ? (
            <>
              <Badge tone="slate">{typeLabels[r.reportable.type] || r.reportable.type}</Badge>
              <p className="mt-1 max-w-[220px] truncate text-xs text-slate-500">{r.reportable.summary || '—'}</p>
            </>
          ) : (
            <span className="text-xs text-slate-400">المحتوى محذوف</span>
          )}
        </div>
      ),
    },
    {
      key: 'reporter',
      label: 'المبلغ',
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
      label: 'التاريخ',
      render: (r) => (
        <span className="text-[13px] text-slate-500">
          {r.created_at ? new Date(r.created_at).toLocaleDateString('ar-MA', { day: 'numeric', month: 'short' }) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'إجراءات',
      className: 'text-end',
      render: (r) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {r.status === 'pending' ? (
            <>
              <Button size="sm" variant="soft" loading={busyId === `r-${r.id}`} disabled={busyId !== null} onClick={() => hideAndResolve(r)}>
                <EyeOff className="size-3.5" />
                إخفاء وحل
              </Button>
              <Button size="sm" variant="primary" loading={busyId === `r-${r.id}`} disabled={busyId !== null} onClick={() => resolve(r.id, 'resolved')}>
                <CheckCircle2 className="size-3.5" />
                حل
              </Button>
              <Button size="sm" variant="softAmber" loading={busyId === `r-${r.id}`} disabled={busyId !== null} onClick={() => resolve(r.id, 'dismissed')}>
                إهمال
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="ghost" loading={busyId === `r-${r.id}`} disabled={busyId !== null} onClick={() => resolve(r.id, 'reviewed')}>
                مراجعة
              </Button>
              {r.reportable && (
                <Button size="sm" variant="soft" loading={busyId === `r-${r.id}`} disabled={busyId !== null} onClick={() => hideAndResolve(r)}>
                  <EyeOff className="size-3.5" />
                  إخفاء
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
      label: 'المحتوى المخفي',
      render: (it) => (
        <div className="min-w-0">
          <p className="max-w-xs truncate text-sm font-bold text-slate-900">{it.summary || 'بدون نص'}</p>
          <Badge tone="violet" className="mt-1">{typeLabels[it.type] || it.type}</Badge>
        </div>
      ),
    },
    {
      key: 'author',
      label: 'صاحب المحتوى',
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
      label: 'تاريخ الإخفاء',
      render: (it) => (
        <span className="text-[13px] text-slate-500">
          {it.hidden_at ? new Date(it.hidden_at).toLocaleDateString('ar-MA', { day: 'numeric', month: 'short' }) : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'إجراءات',
      className: 'text-end',
      render: (it) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <Button size="sm" variant="soft" loading={busyId === `h-${it.id}-${it.type}`} disabled={busyId !== null} onClick={() => unhide(it)}>
            <Eye className="size-3.5" />
            إظهار
          </Button>
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="الإشراف والبلاغات"
        subtitle="مراجعة البلاغات وإدارة المحتوى المخفي"
        actions={
          <Tabs
            value={tab}
            onChange={(v) => setTab(v)}
            items={[
              { value: 'reports', label: 'البلاغات', icon: ClipboardList },
              { value: 'hidden', label: 'المحتوى المخفي', icon: EyeOff },
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
          emptyTitle="لا توجد بلاغات في هذه الحالة"
          emptyDescription="عندما يبلّغ المستخدمون عن محتوى، ستظهر البلاغات هنا."
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
          emptyTitle="لا يوجد محتوى مخفي"
          emptyDescription="كل المحتوى مرئي حالياً."
        />
      )}
    </div>
  )
}
