import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Ban, Check, Inbox, Search, X } from 'lucide-react'
import api from '../../../api/client'
import { toastApiError } from '../../../lib/errors'
import { useApi } from '../../../hooks/useApi'
import { SectionError } from '../../../components/errors'
import { Button, Empty, SectionTitle, SkeletonCards, StatusBadge } from '../../../components/dashboard/ui'
import Drawer from '../../../components/dashboard/Drawer'
import { useToast } from '../../../components/ui/Toast'
import { ConfirmDialog, useConfirm } from '../../../components/ui/ConfirmDialog'
import BookingTimeline from '../components/BookingTimeline'

export default function Cancellations() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const { data, loading, errorState, refetch } = useApi(() => api.get('/owner/cancellation-requests').then((r) => r.data))
  const { data: terrainsData } = useApi(() => api.get('/owner/terrains').then((r) => r.data))

  const requests = useMemo(() => data?.cancellation_requests || data?.data || [], [data])
  const terrains = terrainsData?.terrains || []

  const [selected, setSelected] = useState(null)
  const [busy, setBusy] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [terrainFilter, setTerrainFilter] = useState('')
  const [query, setQuery] = useState('')

  const counts = useMemo(() => {
    const c = { all: requests.length, pending: 0, approved: 0, rejected: 0 }
    for (const r of requests) {
      const s = r.status || 'pending'
      c[s] = (c[s] || 0) + 1
    }
    return c
  }, [requests])

  const filtered = requests.filter((r) => {
    const status = r.status || 'pending'
    if (statusFilter !== 'all' && status !== statusFilter) return false
    if (terrainFilter && r.booking?.terrain?.id !== Number(terrainFilter)) return false
    if (query) {
      const q = query.trim().toLowerCase()
      const hay = [r.booking?.team?.name, r.user?.name, r.reason, r.booking?.terrain?.name].filter(Boolean).join(' ').toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })

  const act = async (action) => {
    if (!selected) return false
    setBusy(true)
    try {
      await api.put(`/owner/cancellation-requests/${selected.id}`, { action })
      toast.success(action === 'approve' ? t('terrain.cancellations.approvedToast') : t('terrain.cancellations.rejectedToast'))
      setSelected(null)
      refetch()
      return true
    } catch (e) {
      toastApiError(e, t)
      return false
    } finally {
      setBusy(false)
    }
  }

  const confirm = useConfirm()
  const confirmReject = () => {
    if (!selected) return
    confirm.run(() => act('reject'), {
      title: t('terrain.cancellations.rejectTitle'),
      description: t('terrain.cancellations.rejectDesc'),
      confirmLabel: t('terrain.cancellations.rejectConfirm'),
    })
  }

  const stats = [
    { label: t('terrain.cancellations.statRequests'), value: counts.all || 0, icon: Inbox, color: 'bg-sky-50 text-sky-600' },
    { label: t('terrain.common.pending'), value: counts.pending || 0, icon: AlertTriangle, color: 'bg-amber-50 text-amber-600' },
    { label: t('terrain.cancellations.statApproved'), value: counts.approved || 0, icon: Check, color: 'bg-green-50 text-green-600' },
    { label: t('terrain.cancellations.statRejected'), value: counts.rejected || 0, icon: Ban, color: 'bg-rose-50 text-rose-600' },
  ]

  const statusTabs = [
    { key: 'all', label: t('terrain.common.all') },
    { key: 'pending', label: t('terrain.common.pending') },
    { key: 'approved', label: t('terrain.cancellations.statApproved') },
    { key: 'rejected', label: t('terrain.cancellations.statRejected') },
  ]

  return (
    <div>
      <SectionTitle title={t('terrain.cancellations.title')} subtitle={t('terrain.cancellations.subtitle')} />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${s.color}`}>
              <s.icon className="size-5" />
            </span>
            <div>
              <p className="text-2xl font-black leading-6 text-slate-900">{s.value}</p>
              <p className="mt-0.5 text-xs font-bold text-slate-400">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-56 flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('terrain.cancellations.searchPlaceholder')}
            aria-label={t('terrain.cancellations.searchLabel')}
            className="h-11 w-full rounded-xl border border-slate-200 bg-white ps-11 pe-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
          />
          <Search className="absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        </div>
        <select
          className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 outline-none"
          value={terrainFilter}
          onChange={(e) => setTerrainFilter(e.target.value)}
        >
          <option value="">{t('terrain.common.allFields')}</option>
          {terrains.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
          {statusTabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setStatusFilter(t.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${statusFilter === t.key ? 'bg-green-500 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {t.label}
              <span className="ms-1 text-[10px] opacity-70">{counts[t.key] || 0}</span>
            </button>
          ))}
        </div>
      </div>

      {errorState ? (
        <SectionError state={errorState} onRetry={refetch} />
      ) : loading ? (
        <SkeletonCards count={3} />
      ) : filtered.length === 0 ? (
        <Empty title={t('terrain.empty.noCancellationRequests')} description={t('terrain.cancellations.emptyDesc', 'Cancellation requests will appear here')} />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <span className={`grid size-10 shrink-0 place-items-center rounded-2xl ${r.status === 'pending' || !r.status ? 'bg-amber-50 text-amber-600' : r.status === 'approved' ? 'bg-green-50 text-green-600' : 'bg-rose-50 text-rose-500'}`}>
                  {r.status === 'approved' ? <Check className="size-5" /> : r.status === 'rejected' ? <X className="size-5" /> : <AlertTriangle className="size-5" />}
                </span>
                <div>
                  <p className="text-sm font-extrabold text-slate-900">
                    {r.booking?.team?.name || r.team?.name || t('terrain.cancellations.booking')}
                    <span className="ms-1.5 text-slate-400">#{r.booking_id || r.id}</span>
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                    {typeof r.booking?.terrain?.name === 'string' ? r.booking.terrain.name : t('terrain.cancellations.fieldFallback')} • {r.reason || t('terrain.cancellations.noReason')} {r.created_at ? `• ${r.created_at.slice(0, 10)}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={r.status || 'pending'} />
                <button
                  type="button"
                  onClick={() => setSelected(r)}
                  className="rounded-xl bg-slate-50 px-3 py-1.5 text-xs font-extrabold text-slate-600 transition-colors hover:bg-slate-100"
                >
                  {t('terrain.cancellations.details')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <Drawer open onClose={() => setSelected(null)} title={t('terrain.cancellations.requestN', { id: selected.id })} subtitle={selected.created_at ? `قُدّم ${new Date(selected.created_at).toLocaleDateString('ar-MA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}` : 'تفاصيل الطلب'} size="520">
          <div className="space-y-6">
            <div className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
              <div>
                <p className="text-xs font-bold text-slate-400">{t('terrain.cancellations.teamManager')}</p>
                <p className="mt-0.5 text-sm font-extrabold text-slate-900">
                  {selected.booking?.team?.name || selected.team?.name || '—'}
                  {selected.user?.name ? ` • ${selected.user.name}` : ''}
                </p>
              </div>
              <StatusBadge status={selected.status || 'pending'} />
            </div>

            {selected.booking && (
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { label: t('terrain.common.field'), value: selected.booking.terrain?.name || '—' },
                  { label: t('terrain.common.date'), value: selected.booking.booking_date || selected.booking.date || '—' },
                  { label: t('terrain.common.time'), value: selected.booking.start_time ? `${selected.booking.start_time} - ${selected.booking.end_time}` : '—' },
                  { label: t('terrain.common.price'), value: `${Number(selected.booking.price || 0).toLocaleString(i18n.language.startsWith('ar') ? 'ar-MA' : 'en-GB')} ${t('terrain.common.mad')}` },
                ].map((f) => (
                  <div key={f.label} className="rounded-2xl border border-slate-100 bg-white p-3.5">
                    <p className="text-[10px] font-bold text-slate-400">{f.label}</p>
                    <p className="mt-0.5 truncate text-sm font-extrabold text-slate-800">{f.value}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-xs font-bold text-slate-400">{t('terrain.cancellations.reason')}</p>
              <p className="mt-1.5 text-sm font-bold text-slate-700">{selected.reason || '—'}</p>
            </div>

            <div className="rounded-2xl border border-slate-100 bg-white p-4">
              <p className="mb-3 text-xs font-extrabold text-slate-700">{t('terrain.cancellations.log')}</p>
              <BookingTimeline booking={{ status: selected.status || 'pending', created_at: selected.created_at, whatsapp_notification_url: null }} />
            </div>

            {(selected.status === 'pending' || !selected.status) && (
              <div className="flex gap-2">
                <Button className="flex-1" disabled={busy} onClick={() => act('approve')}>
                  <Check className="size-4" /> {t('terrain.cancellations.accept')}
                </Button>
                <Button variant="dangerSoft" className="flex-1" disabled={busy} onClick={confirmReject}>
                  <X className="size-4" /> رفض الطلب
                </Button>
              </div>
            )}
          </div>
        </Drawer>
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
