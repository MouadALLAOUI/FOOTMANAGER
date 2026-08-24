import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, Check, X, Ban, ShieldCheck, CalendarDays, Trash2, KeyRound, Lock, Unlock } from 'lucide-react'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import DataTable from './DataTable'
import { PageHeader, Button, StatusBadge, Avatar, Skeleton } from './ui'
import Drawer from '../dashboard/Drawer'
import { toast } from '../ui/Toast'
import { ConfirmDialog, useConfirm } from '../ui/ConfirmDialog'
import { toastApiError } from '../../lib/errors'

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

function LockReasonModal({ user, onClose, onLock }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!reason.trim()) return
    setLoading(true)
    try {
      await onLock(user.id, reason.trim())
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">تقييد نشاط الحساب</h3>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100">
            <X className="size-4" />
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
          <p className="text-xs text-slate-500">المستخدم</p>
          <p className="mt-1 text-sm font-bold text-slate-800">{user.name}</p>
          <p className="mt-0.5 text-xs text-slate-400" dir="ltr">{user.phone}</p>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-xs font-bold text-slate-500">سبب التقييد</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-100"
            placeholder="اكتب سبب تقييد النشاط..."
          />
        </div>

        <div className="flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onClose}>إلغاء</Button>
          <Button variant="amber" className="flex-1" loading={loading} disabled={!reason.trim()} onClick={handleSubmit}>
            <Lock className="size-4" />
            تقييد النشاط
          </Button>
        </div>
      </div>
    </div>
  )
}

function RecoveryTokenModal({ recovery, onClose }) {
  const [copied, setCopied] = useState(false)

  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(recovery.token)
      setCopied(true)
      toast.success('تم نسخ الرمز')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('فشل النسخ')
    }
  }

  const expiresAt = new Date(recovery.expires_at)
  const isExpired = expiresAt < new Date()

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-black text-slate-900">رمز استرداد الحساب</h3>
          <button onClick={onClose} className="grid size-8 place-items-center rounded-xl text-slate-400 hover:bg-slate-100">
            <X className="size-4" />
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
          <p className="text-xs text-slate-500">المستخدم</p>
          <p className="mt-1 text-sm font-bold text-slate-800">{recovery.user.name}</p>
          <p className="mt-0.5 text-xs text-slate-400" dir="ltr">{recovery.user.phone}</p>
        </div>

        <div className="mb-4">
          <p className="mb-2 text-xs font-bold text-slate-500">الرمز</p>
          <div className="flex items-center gap-2">
            <code dir="ltr" className="flex-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-mono text-slate-800">
              {recovery.token}
            </code>
            <Button size="sm" variant={copied ? 'green' : 'primary'} onClick={copyToken}>
              {copied ? 'تم النسخ' : 'نسخ'}
            </Button>
          </div>
        </div>

        <div className="mb-5 flex items-center gap-2 text-xs text-slate-500">
          <CalendarDays className="size-3.5" />
          <span>
            ينتهي الصلاحية: {expiresAt.toLocaleDateString('ar-MA', { day: 'numeric', month: 'long', year: 'numeric' })}
            {' '}
            {expiresAt.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {isExpired ? (
          <div className="mb-4 rounded-xl bg-red-50 p-3 text-xs font-bold text-red-600">
            انتهت صلاحية هذا الرمز
          </div>
        ) : null}

        <div className="rounded-xl bg-amber-50 p-3 text-xs leading-relaxed text-amber-700">
          أعطِ هذا الرمز للمستخدم ليُدخله في صفحة استرداد الحساب لتغيير كلمة المرور وتفعيل الحساب.
        </div>

        <Button className="mt-5 w-full" variant="ghost" onClick={onClose}>إغلاق</Button>
      </div>
    </div>
  )
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
  const { t } = useTranslation()
  const [tab, setTab] = useState('pending')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState([])
  const [busyId, setBusyId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [recoveryToken, setRecoveryToken] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [lockModal, setLockModal] = useState(null)

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
    } catch (e) {
      toastApiError(e, t)
      setDetail(null)
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
      return true
    } catch (e) {
      toastApiError(e, t)
      return false
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
      return true
    } catch (e) {
      toastApiError(e, t)
      return false
    }
  }

  const confirm = useConfirm()
  const needsConfirm = (action) => action === 'reject' || action === 'block'

  const actWithConfirm = (id, action) => {
    if (!needsConfirm(action)) {
      act(id, action)
      return
    }
    const target = detail?.row?.id === id ? detail.row : rows.find((r) => r.id === id)
    const name = target?.name || ''
    const isBlock = action === 'block'
    confirm.run(() => act(id, action), {
      title: isBlock ? 'حظر الحساب؟' : 'رفض الطلب؟',
      description: isBlock
        ? `سيتم حظر حساب «${name}» ولن يتمكن من تسجيل الدخول.`
        : `سيتم رفض حساب «${name}».`,
      confirmLabel: isBlock ? 'حظر' : 'رفض',
    })
  }

  const bulkWithConfirm = (action) => {
    if (!needsConfirm(action)) {
      bulk(action)
      return
    }
    const isBlock = action === 'block'
    confirm.run(() => bulk(action), {
      title: isBlock ? 'حظر الحسابات المحددة؟' : 'رفض الحسابات المحددة؟',
      description: `سيتم ${isBlock ? 'حظر' : 'رفض'} ${selected.length} حساب.`,
      confirmLabel: isBlock ? 'حظر' : 'رفض',
    })
  }

  const deleteUser = async (id) => {
    const target = rows.find((r) => r.id === id) || detail?.row
    confirm.run(async () => {
      setDeleting(true)
      try {
        const res = await api.delete(`/admin/accounts/${id}`)
        toast.success(res.data.message || 'تم حذف الحساب')
        refetch()
        setDetail(null)
      } catch (e) {
        toastApiError(e, t)
      } finally {
        setDeleting(false)
      }
    }, {
      title: 'حذف الحساب؟',
      description: `سيتم حذف حساب «${target?.name}» نهائياً. هذا الإجراء لا يمكن التراجع عنه.`,
      confirmLabel: 'حذف',
      tone: 'red',
    })
  }

  const generateRecovery = async (id) => {
    setBusyId(id)
    try {
      const res = await api.post(`/admin/accounts/${id}/recovery`)
      toast.success(res.data.message || 'تم إنشاء رمز الاسترداد')
      setRecoveryToken(res.data.recovery)
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusyId(null)
    }
  }

  const lockActivity = async (id, reason) => {
    setBusyId(id)
    try {
      const res = await api.put(`/admin/accounts/${id}/lock-activity`, { reason })
      toast.success(res.data.message || 'تم تقييد النشاط')
      refetch()
      if (detail?.row?.id === id) {
        setDetail((d) => ({
          ...d,
          row: { ...d.row, activity_locked: true, activity_lock_reason: reason },
        }))
      }
      return true
    } catch (e) {
      toastApiError(e, t)
      return false
    } finally {
      setBusyId(null)
    }
  }

  const unlockActivity = async (id) => {
    setBusyId(id)
    try {
      const res = await api.put(`/admin/accounts/${id}/unlock-activity`)
      toast.success(res.data.message || 'تم رفع التقييد')
      refetch()
      if (detail?.row?.id === id) {
        setDetail((d) => ({
          ...d,
          row: { ...d.row, activity_locked: false, activity_lock_reason: null },
        }))
      }
      return true
    } catch (e) {
      toastApiError(e, t)
      return false
    } finally {
      setBusyId(null)
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
                onClick={() => actWithConfirm(u.id, action)}
              >
                <Icon className="size-3.5" />
                {meta.label}
              </Button>
            )
          })}
          {u.status === 'approved' && (
            u.activity_locked ? (
              <Button
                size="sm"
                variant="primary"
                loading={busyId === u.id}
                disabled={busyId !== null}
                onClick={() => unlockActivity(u.id)}
              >
                <Unlock className="size-3.5" />
                رفع التقييد
              </Button>
            ) : (
              <Button
                size="sm"
                variant="amber"
                loading={busyId === u.id}
                disabled={busyId !== null}
                onClick={() => setLockModal(u)}
              >
                <Lock className="size-3.5" />
                تقييد
              </Button>
            )
          )}
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
        onBulk={(action) => bulkWithConfirm(action)}
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
                    onClick={() => actWithConfirm(detailRow.id, action)}
                  >
                    <Icon className="size-4" />
                    {meta.label}
                  </Button>
                )
              })}
              <Button
                variant="softViolet"
                loading={busyId === detailRow.id}
                onClick={() => generateRecovery(detailRow.id)}
              >
                <KeyRound className="size-4" />
                استرداد
              </Button>
              {detailRow.status === 'approved' && (
                detailRow.activity_locked ? (
                  <Button
                    variant="primary"
                    loading={busyId === detailRow.id}
                    onClick={() => unlockActivity(detailRow.id)}
                  >
                    <Unlock className="size-4" />
                    رفع التقييد
                  </Button>
                ) : (
                  <Button
                    variant="amber"
                    loading={busyId === detailRow.id}
                    onClick={() => setLockModal(detailRow)}
                  >
                    <Lock className="size-4" />
                    تقييد النشاط
                  </Button>
                )
              )}
              <Button
                variant="red"
                loading={deleting}
                onClick={() => deleteUser(detailRow.id)}
              >
                <Trash2 className="size-4" />
                حذف
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

            {detailRow?.activity_locked && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-center gap-2">
                  <Lock className="size-4 text-amber-600" />
                  <p className="text-sm font-bold text-amber-800">النشاط مقيد</p>
                </div>
                {detailRow.activity_lock_reason && (
                  <p className="mt-2 text-xs leading-relaxed text-amber-600">{detailRow.activity_lock_reason}</p>
                )}
              </div>
            )}

            {renderDetail && renderDetail(detailRow, detailTarget)}
          </div>
        )}
      </Drawer>

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

      {recoveryToken && (
        <RecoveryTokenModal
          recovery={recoveryToken}
          onClose={() => setRecoveryToken(null)}
        />
      )}

      {lockModal && (
        <LockReasonModal
          user={lockModal}
          onClose={() => setLockModal(null)}
          onLock={lockActivity}
        />
      )}
    </div>
  )
}
