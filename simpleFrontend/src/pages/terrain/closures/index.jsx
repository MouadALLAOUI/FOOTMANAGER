import { useCallback, useEffect, useMemo, useState } from 'react'
import { Ban, CalendarOff, Clock, Plus, X } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { mapHttpError } from '../../../lib/errorState'
import { SectionError } from '../../../components/errors'
import { queryClient } from '../../../api/queryClient'
import { Badge, Button, Empty, Field, SectionTitle, SkeletonCards, Spinner, inputClass } from '../../../components/dashboard/ui'
import Drawer from '../../../components/dashboard/Drawer'
import TimePicker from '../../../components/TimePicker'
import { useToast } from '../../../components/ui/Toast'

const weekdayNames = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export default function Closures() {
  const { toast } = useToast()
  const { data: terrainsData, loading: loadingTerrains } = useApi(() => api.get('/owner/terrains').then((r) => r.data))
  const terrains = terrainsData?.terrains || []

  const [terrainId, setTerrainId] = useState(null)
  const [closures, setClosures] = useState([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(null)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ closure_date: '', start_time: '', end_time: '', reason: '' })
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (terrains.length && !terrainId) setTerrainId(terrains[0].id)
  }, [terrains, terrainId])

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

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const invalidateCalendar = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['owner', 'terrain-calendar'] })
    queryClient.invalidateQueries({ queryKey: ['owner', 'terrains'] })
  }, [])

  const addClosure = async () => {
    if (!form.closure_date || !form.start_time || !form.end_time) {
      toast.error('التاريخ ووقتا البداية والنهاية مطلوبة')
      return
    }
    setBusy(true)
    try {
      await api.post(`/owner/terrains/${terrainId}/slot-closures`, {
        closure_date: form.closure_date,
        start_time: form.start_time,
        end_time: form.end_time,
        reason: form.reason || null,
      })
      toast.success('تم إضافة الإغلاق')
      setOpen(false)
      setForm({ closure_date: '', start_time: '', end_time: '', reason: '' })
      fetchClosures(terrainId)
      invalidateCalendar()
    } catch (e) {
      toast.error(e.response?.data?.message || 'تعذر إضافة الإغلاق')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id) => {
    if (!window.confirm('حذف هذا الإغلاق؟')) return
    try {
      await api.delete(`/owner/terrains/${terrainId}/slot-closures/${id}`)
      toast.success('تم حذف الإغلاق')
      fetchClosures(terrainId)
      invalidateCalendar()
    } catch (e) {
      toast.error(e.response?.data?.message || 'تعذر الحذف')
    }
  }

  const today = new Date().toISOString().slice(0, 10)

  return (
    <div>
      <SectionTitle
        title="إغلاقات المواعيد"
        subtitle="حظر مواعيد محددة من الحجز مسبقًا"
        action={
          <Button onClick={() => setOpen(true)}>
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
                        onClick={() => remove(c.id)}
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

      {/* Add modal */}
      <Drawer open={open} onClose={() => setOpen(false)} title="إغلاق موعد" subtitle="حدد يومًا ووقتًا للحظر">
        <div className="space-y-4">
          <Field label="التاريخ" required>
            <input type="date" min={today} className={inputClass} value={form.closure_date} onChange={set('closure_date')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="من" required>
              <TimePicker value={form.start_time} onChange={(v) => setForm((f) => ({ ...f, start_time: v }))} labels={{ ok: 'موافق', cancel: 'إلغاء' }} />
            </Field>
            <Field label="إلى" required>
              <TimePicker value={form.end_time} onChange={(v) => setForm((f) => ({ ...f, end_time: v }))} labels={{ ok: 'موافق', cancel: 'إلغاء' }} />
            </Field>
          </div>
          <Field label="السبب (اختياري)">
            <input className={inputClass} value={form.reason} onChange={set('reason')} placeholder="مثال: صيانة" />
          </Field>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" disabled={busy} onClick={addClosure}>
              {busy ? 'جارٍ…' : 'تأكيد الإغلاق'}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>إلغاء</Button>
          </div>
        </div>
      </Drawer>
    </div>
  )
}
