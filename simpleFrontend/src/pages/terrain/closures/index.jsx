import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Ban, CalendarOff, Clock, Plus, X } from 'lucide-react'
import api from '../../../api/client'
import { queryClient } from '../../../api/queryClient'
import { useApi } from '../../../hooks/useApi'
import { mapHttpError } from '../../../lib/errorState'
import { SectionError } from '../../../components/errors'
import { Badge, Button, Empty, SectionTitle, SkeletonCards, Spinner } from '../../../components/dashboard/ui'
import { ConfirmDialog, useConfirm } from '../../../components/ui/ConfirmDialog'
import { useToast } from '../../../components/ui/Toast'
import ClosureDrawer from '../components/ClosureDrawer'

const weekdayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export default function Closures() {
  const { toast } = useToast()
  const [params, setParams] = useSearchParams()
  const { data: terrainsData, loading: loadingTerrains } = useApi(() => api.get('/owner/terrains').then((r) => r.data))
  const terrains = terrainsData?.terrains || []

  const [terrainId, setTerrainId] = useState(null)
  const [closures, setClosures] = useState([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (terrains.length && !terrainId) setTerrainId(terrains[0].id)
  }, [terrains, terrainId])

  // Handle ?new=1 query param
  useEffect(() => {
    if (params.get('new') === '1' && terrainId) {
      setDrawerOpen(true)
      setParams({}, { replace: true })
    }
  }, [params, terrainId, setParams])

  const fetchClosures = useCallback(
    async (id) => {
      if (!id) return
      setLoading(true)
      setFailed(null)
      try {
        const r = await api.get(`/owner/terrains/${id}/slot-closures`)
        setClosures(r.data?.closures || r.data?.data || [])
      } catch (e) {
        setFailed(mapHttpError(e))
        toast.error(e.response?.data?.message || 'تعذر تحميل الإغلاقات')
      } finally {
        setLoading(false)
      }
    },
    [toast],
  )

  useEffect(() => {
    if (terrainId) fetchClosures(terrainId)
  }, [terrainId, fetchClosures])

  const grouped = useMemo(() => {
    const m = {}
    for (const c of closures) {
      const k = c.closure_date || c.date
      if (!m[k]) m[k] = []
      m[k].push(c)
    }
    return Object.entries(m).sort((a, b) => (a[0] < b[0] ? 1 : -1))
  }, [closures])

  const today = new Date().toISOString().slice(0, 10)

  const removeConfirm = useConfirm()

  const removeClosure = useCallback(
    (id) => {
      removeConfirm.run(async () => {
        try {
          await api.delete(`/owner/terrains/${terrainId}/slot-closures/${id}`)
          toast.success('تم حذف الإغلاق')
          fetchClosures(terrainId)
          queryClient.invalidateQueries({ queryKey: ['owner', 'terrain-calendar'] })
          return true
        } catch (e) {
          toast.error(e.response?.data?.message || 'تعذر الحذف')
          return false
        }
      }, {
        title: 'حذف هذا الإغلاق؟',
        description: 'سيتم فتح هذا التوقيت مرة أخرى.',
        confirmLabel: 'حذف',
      })
    },
    [terrainId, fetchClosures, toast, removeConfirm],
  )

  return (
    <div>
      <SectionTitle
        title="إغلاقات المواعيد"
        subtitle="حظر مواعيد محددة من الحجز مسبقًا"
        action={
          <Button onClick={() => setDrawerOpen(true)}>
            <Plus className="size-4" /> إغلاق موعد
          </Button>
        }
      />

      {/* Terrain selector */}
      <div className="mb-5">
        {loadingTerrains ? (
          <Spinner className="!py-6" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {terrains.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTerrainId(t.id)}
                className={`rounded-2xl border px-4 py-2 text-sm font-bold transition-all ${terrainId === t.id ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {failed ? (
        <SectionError state={failed} onRetry={() => fetchClosures(terrainId)} />
      ) : loading ? (
        <SkeletonCards count={3} />
      ) : grouped.length === 0 ? (
        <Empty title="لا توجد إغلاقات" description="أضف إغلاقًا لموعد معين أو ليوم كامل" icon={Ban} />
      ) : (
        <div className="space-y-3">
          {grouped.map(([date, items]) => {
            const d = new Date(date + 'T00:00:00')
            const isPast = date < today
            return (
              <div key={date} className={`rounded-3xl border bg-white p-5 shadow-sm ${isPast ? 'opacity-60' : 'border-slate-100'}`}>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid size-10 place-items-center rounded-2xl bg-red-50 text-red-500">
                      <CalendarOff className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-extrabold text-slate-900">{weekdayNames[d.getDay()]}</p>
                      <p className="text-[11px] font-bold text-slate-400" dir="ltr">{date}</p>
                    </div>
                  </div>
                  <Badge variant="danger">{items.length} موعد</Badge>
                </div>
                <div className="space-y-2">
                  {items.map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50/70 p-3">
                      <div className="flex items-center gap-2.5">
                        <Clock className="size-4 text-slate-400" />
                        <span className="text-sm font-extrabold text-slate-700" dir="ltr">{c.start_time} — {c.end_time}</span>
                        {c.reason && <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-[10px] font-bold text-red-500">{c.reason}</span>}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeClosure(c.id)}
                        className="grid size-8 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
                        title="حذف"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <ClosureDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        terrainId={terrainId}
        terrainName={terrains.find((t) => t.id === terrainId)?.name}
        onSaved={() => fetchClosures(terrainId)}
      />

      <ConfirmDialog
        open={removeConfirm.open}
        loading={removeConfirm.loading}
        title={removeConfirm.options.title}
        description={removeConfirm.options.description}
        confirmLabel={removeConfirm.options.confirmLabel}
        cancelLabel={removeConfirm.options.cancelLabel}
        onConfirm={removeConfirm.confirm}
        onClose={removeConfirm.close}
      />
    </div>
  )
}
