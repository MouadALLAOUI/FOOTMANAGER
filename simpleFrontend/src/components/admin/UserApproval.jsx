import { useMemo, useState } from 'react'
import { Eye, Check, X, Ban, ShieldCheck, CalendarDays } from 'lucide-react'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import DataTable from './DataTable'
import { PageHeader, Drawer, Button, StatusBadge, Avatar, Skeleton } from './ui'
import { toast } from '../ui/Toast'

const actionMeta = {
  approve: { label: 'قبول', tone: 'primary', icon: Check },
  reject: { label: 'رفض', tone: 'softRed', icon: X },
  block: { label: 'حظر', tone: 'softRed', icon: Ban },
  unblock: { label: 'إلغاء الحظر', tone: 'primary', icon: ShieldCheck },
}

function allowedActions(status) {
  if (status === 'pending') return ['approve', 'reject']
  if (status === 'approved') return ['block']
  if (status === 'rejected') return ['approve', 'block']
  if (status === 'blocked') return ['unblock']
  return []
}

export default function UserApproval({
  endpoint,
  dataKey,
  title,
  subtitle,
  tabs = [],
  detailTitle = 'تفاصيل الحساب',
  extraColumns = [],
  renderDetail,
}) {
  const [tab, setTab] = useState('pending')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState([])
  const [busyId, setBusyId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)

  const params = useMemo(
    () => ({ status: tab, search, page, per_page: 15 }),
    [tab, search, page],
  )

  const { data, loading, refetch } = useApi(
    () => api.get(endpoint, { params }).then((r) => r.data),
    [endpoint, tab, search, page],
  )

  const rows = data?.[dataKey] || []
  const pagination = data?.pagination || {}

  const openDetail = async (row) => {
    setDetail({ row, detail: null })
    setDetailLoading(true)
    try {
      const res = await api.get(`${endpoint}/${row.id}`)
      setDetail((d) => ({ ...d, detail: res.data }))
    } finally {
      setDetailLoading(false)
    }
  }

  const act = async (id, action) => {
    setBusyId(id)
    try {
      const res = await api.put(`${endpoint}/${id}/${action}`)
      toast.success(res.data.message || 'تمت العملية بنجاح')
      refetch()
      if (detail?.row?.id === id) {
        setDetail((d) => ({ ...d, row: { ...d.row, status: res.data.user?.status || d.row.status } }))
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'حدث خطأ، حاول مجدداً')
    } finally {
      setBusyId(null)
    }
  }

  const bulk = async (action) => {
    try {
      const res = await api.post(`${endpoint}/bulk`, { ids: selected, action })
      toast.success(res.data.message || `تم تنفيذ ${action}`)
      setSelected([])
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.message || 'حدث خطأ، حاول مجدداً')
    }
  }

  const columns = [
    {
      key: 'name',
      label: 'الاسم',
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.name} className="size-10" />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-slate-900">{u.name}</p>
            <p className="text-[11px] text-slate-400" dir="ltr">{u.email || '—'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'الهاتف',
      render: (u) => (
        <div>
          <p className="text-sm font-semibold text-slate-700" dir="ltr">{u.phone || '—'}</p>
          {u.is_whatsapp ? (
            <span className="text-[11px] text-green-600">متوفر على واتساب</span>
          ) : null}
        </div>
      ),
    },
    ...extraColumns,
    {
      key: 'created_at',
      label: 'تاريخ التسجيل',
      render: (u) => (
        <span className="inline-flex items-center gap-1.5 text-[13px] text-slate-500">
          <CalendarDays className="size-4 text-slate-400" />
          {u.created_at ? new Date(u.created_at).toLocaleDateString('ar-MA', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'الحالة',
      render: (u) => <StatusBadge status={u.status} />,
    },
    {
      key: 'actions',
      label: 'إجراءات',
      className: 'text-end',
      render: (u) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          {allowedActions(u.status).slice(0, 2).map((action) => {
            const meta = actionMeta[action]
            const Icon = meta.icon
            return (
              <Button
                key={action}
                size="sm"
                variant={meta.tone}
                loading={busyId === u.id}
                disabled={busyId !== null}
                onClick={() => act(u.id, action)}
              >
                <Icon className="size-3.5" />
                {meta.label}
              </Button>
            )
          })}
          <Button size="sm" variant="ghost" onClick={() => openDetail(u)}>
            <Eye className="size-3.5" />
          </Button>
        </div>
      ),
    },
  ]

  const detailRow = detail?.row
  const detailInfo = detail?.detail
  const detailTarget = detailInfo?.[dataKey] || detailInfo?.owner || detailInfo?.user || detailInfo?.manager || detailInfo?.player

  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />

      <DataTable
        rows={rows}
        loading={loading}
        columns={columns}
        filterTabs={tabs}
        tabValue={tab}
        onTabChange={(t) => { setTab(t); setPage(1); setSelected([]) }}
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="بحث بالاسم أو الهاتف أو البريد..."
        selectable
        selected={selected}
        onSelectedChange={setSelected}
        bulkActions={[
          { action: 'approve', label: 'قبول المحدد', tone: 'primary' },
          { action: 'reject', label: 'رفض المحدد', tone: 'softRed' },
          { action: 'block', label: 'حظر المحدد', tone: 'softRed' },
          { action: 'unblock', label: 'إلغاء حظر المحدد', tone: 'primary' },
        ]}
        onBulk={(action) => bulk(action)}
        onRowClick={openDetail}
        page={pagination.current_page || 1}
        lastPage={pagination.last_page || 1}
        total={pagination.total || 0}
        perPage={pagination.per_page || 15}
        onPageChange={setPage}
        emptyTitle="لا توجد حسابات في هذه الحالة"
        emptyDescription="غيّر الفلتر أو ابحث بكلمة أخرى."
      />

      <Drawer
        open={Boolean(detail)}
        onClose={() => setDetail(null)}
        title={detailTitle}
        subtitle={detailRow?.name}
        footer={
          detailRow && (
            <>
              {allowedActions(detailRow.status).map((action) => {
                const meta = actionMeta[action]
                const Icon = meta.icon
                return (
                  <Button
                    key={action}
                    variant={meta.tone}
                    loading={busyId === detailRow.id}
                    onClick={() => act(detailRow.id, action)}
                  >
                    <Icon className="size-4" />
                    {meta.label}
                  </Button>
                )
              })}
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
              <Avatar name={detailRow?.name} className="size-16 text-xl" />
              <div className="min-w-0">
                <p className="text-lg font-black text-slate-900">{detailRow?.name}</p>
                <p className="mt-0.5 text-xs text-slate-400" dir="ltr">{detailRow?.email}</p>
                <div className="mt-2"><StatusBadge status={detailRow?.status} /></div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">الهاتف</p>
                <p className="mt-1 text-sm font-bold text-slate-800" dir="ltr">{detailRow?.phone || '—'}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">واتساب</p>
                <p className="mt-1 text-sm font-bold text-slate-800">{detailRow?.is_whatsapp ? 'مفعل' : 'غير مفعل'}</p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">تاريخ التسجيل</p>
                <p className="mt-1 text-sm font-bold text-slate-800">
                  {detailRow?.created_at ? new Date(detailRow.created_at).toLocaleDateString('ar-MA', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-100 p-4">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">الحالة الحالية</p>
                <p className="mt-1"><StatusBadge status={detailRow?.status} /></p>
              </div>
            </div>

            {renderDetail && renderDetail(detailRow, detailTarget)}
          </div>
        )}
      </Drawer>
    </div>
  )
}
