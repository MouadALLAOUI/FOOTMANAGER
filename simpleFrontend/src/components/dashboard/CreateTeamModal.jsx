import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Shield, Plus } from 'lucide-react'
import { Modal, Field, FieldRow, Button, inputClass, selectClass } from './ui'
import { useTeam } from '../../context/TeamContext'
import { useToast } from '../ui/Toast'

export default function CreateTeamModal({ open, onClose }) {
  const { t } = useTranslation()
  const { createTeam } = useTeam()
  const { toast } = useToast()

  const [form, setForm] = useState({
    name: '',
    category: 'adult',
    city: '',
    association_name: '',
    primary_color: '#22c55e',
    secondary_color: '#0ea5e9',
    description: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return

    setBusy(true)
    setError('')
    try {
      await createTeam({
        name: form.name.trim(),
        category: form.category,
        city: form.city.trim() || null,
        association_name: form.association_name.trim() || null,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        description: form.description.trim() || null,
      })
      onClose()
      setForm({
        name: '',
        category: 'adult',
        city: '',
        association_name: '',
        primary_color: '#22c55e',
        secondary_color: '#0ea5e9',
        description: '',
      })
    } catch (err) {
      setError(
        err.response?.data?.errors
          ? Object.values(err.response.data.errors).flat()[0]
          : err.response?.data?.message || 'تعذر إنشاء الفريق',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إنشاء فريق جديد"
      subtitle="أضف فريقاً جديداً إلى حسابك لإدارته وتنظيم مبارياته وتشكيلته"
      size="md"
    >
      <form onSubmit={submit} className="flex flex-col max-h-[75vh]">
        <div className="flex-1 overflow-y-auto space-y-4 pe-1">
          <Field label="اسم الفريق" required>
          <input
            className={inputClass}
            placeholder="مثال: نسور الأطلس"
            value={form.name}
            onChange={set('name')}
            required
          />
        </Field>

        <FieldRow>
          <Field label="الفئة العمرية" required>
            <select className={selectClass} value={form.category} onChange={set('category')}>
              <option value="adult">كبار (Adults)</option>
              <option value="teenager">شباب (Teens)</option>
              <option value="children">براعم (Children)</option>
            </select>
          </Field>

          <Field label="المدينة">
            <input
              className={inputClass}
              placeholder="مثال: الدار البيضاء"
              value={form.city}
              onChange={set('city')}
            />
          </Field>
        </FieldRow>

        <Field label="اسم الجمعية / النادي (اختياري)">
          <input
            className={inputClass}
            placeholder="اسم الجمعية المنتمي إليها الفريق"
            value={form.association_name}
            onChange={set('association_name')}
          />
        </Field>

        <FieldRow>
          <Field label="اللون الأساسي">
            <div className="flex items-center gap-3">
              <input
                type="color"
                className="h-10 w-14 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
                value={form.primary_color}
                onChange={set('primary_color')}
              />
              <span className="text-xs font-semibold text-slate-500">{form.primary_color}</span>
            </div>
          </Field>
          <Field label="اللون الثانوي">
            <div className="flex items-center gap-3">
              <input
                type="color"
                className="h-10 w-14 cursor-pointer rounded-xl border border-slate-200 bg-white p-1"
                value={form.secondary_color}
                onChange={set('secondary_color')}
              />
              <span className="text-xs font-semibold text-slate-500">{form.secondary_color}</span>
            </div>
          </Field>
        </FieldRow>

        <Field label="وصف الفريق (اختياري)">
          <textarea
            rows={2}
            className={`${inputClass} h-auto py-3`}
            placeholder="نبذة موجزة عن الفريق..."
            value={form.description}
            onChange={set('description')}
          />
        </Field>

        {error && (
          <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600">{error}</p>
        )}
        </div>

        <div className="flex gap-2 pt-3 border-t border-slate-100 mt-3 shrink-0">
          <Button
            type="button"
            variant="soft"
            className="flex-1"
            onClick={onClose}
            disabled={busy}
          >
            إلغاء
          </Button>
          <Button
            type="submit"
            className="flex-1"
            disabled={busy || !form.name.trim()}
          >
            <Plus className="size-4" />
            {busy ? 'جارٍ الإنشاء...' : 'إنشاء الفريق'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

