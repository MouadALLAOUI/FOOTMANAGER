import { useState } from 'react'
import { Plus, Pencil, Trash2, Hotel } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { PageHeader, Button, Card, Modal, Field, Input, EmptyState, Skeleton } from '../../../components/admin/ui'
import { toast } from '../../../components/ui/Toast'

export default function Facilities() {
  const { data, loading, refetch } = useApi(() => api.get('/admin/facilities').then((r) => r.data))
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', icon: '' })
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState(null)

  const facilities = data?.facilities || []

  const submit = async () => {
    if (!form.name.trim()) return
    setBusy(true)
    try {
      if (editing) {
        const res = await api.put(`/admin/facilities/${editing}`, form)
        toast.success(res.data.message || 'تم تحديث المرفق')
      } else {
        const res = await api.post('/admin/facilities', form)
        toast.success(res.data.message || 'تمت إضافة المرفق')
      }
      setOpen(false)
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.message || 'حدث خطأ، حاول مجدداً')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id) => {
    if (!window.confirm('حذف هذا المرفق نهائياً؟')) return
    setDeleting(id)
    try {
      const res = await api.delete(`/admin/facilities/${id}`)
      toast.success(res.data.message || 'تم حذف المرفق')
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.message || 'حدث خطأ، حاول مجدداً')
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div>
      <PageHeader
        title="المرافق"
        subtitle="المرافق المتوفرة في الملاعب مثل المقاعد والإنارة والحمامات"
        actions={
          <Button onClick={() => { setEditing(null); setForm({ name: '', icon: '' }); setOpen(true) }}>
            <Plus className="size-4" />
            إضافة مرفق
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-3xl" />)}
        </div>
      ) : facilities.length === 0 ? (
        <Card>
          <EmptyState icon={Hotel} title="لا توجد مرافق" description="أضف أول مرفق لاستخدامه في الملاعب." />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {facilities.map((f, i) => (
            <div
              key={f.id}
              className="fade-in group rounded-3xl bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_12px_32px_-16px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/60 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-4">
                <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-green-500/15 to-emerald-500/15 text-3xl">
                  {f.icon || <Hotel className="size-6 text-green-600" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-black text-slate-900">{f.name}</p>
                  <p className="text-[11px] text-slate-400">مرفق ملعب</p>
                </div>
              </div>
              <div className="mt-5 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => { setEditing(f.id); setForm({ name: f.name, icon: f.icon }); setOpen(true) }}
                >
                  <Pencil className="size-3.5" />
                  تعديل
                </Button>
                <Button
                  variant="softRed"
                  size="sm"
                  className="flex-1"
                  loading={deleting === f.id}
                  disabled={deleting !== null}
                  onClick={() => remove(f.id)}
                >
                  <Trash2 className="size-3.5" />
                  حذف
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'تعديل مرفق' : 'إضافة مرفق'}
        subtitle="المرافق تُعرض في صفحة تفاصيل الملاعب"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>إلغاء</Button>
            <Button loading={busy} onClick={submit}>
              {busy ? 'جارٍ الحفظ...' : 'حفظ'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Field label="الاسم" required>
            <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="مثال: إنارة ليلية" />
          </Field>
          <Field label="الرمز (إيموجي)" hint="رمز صغير يظهر بجانب اسم المرفق">
            <Input value={form.icon} maxLength={10} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="💡" />
          </Field>
        </div>
      </Modal>
    </div>
  )
}
