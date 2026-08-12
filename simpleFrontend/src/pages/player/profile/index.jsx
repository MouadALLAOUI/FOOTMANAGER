import { useState, useEffect } from 'react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Spinner, SectionTitle, Button, Field, inputClass, Toggle } from '../../../components/dashboard/ui'

const skillLevels = { beginner: 'مبتدئ', amateur: 'هواة', semi_pro: 'شبه محترف', pro: 'محترف' }

export default function Profile() {
  const { data, loading, refetch } = useApi(() => api.get('/player/profile').then((r) => r.data))
  const [form, setForm] = useState({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (data) {
      setForm({
        name: data.user?.name || '',
        phone: data.user?.phone || '',
        email: data.user?.email || '',
        position: data.profile?.position || 'midfielder',
        skill_level: data.profile?.skill_level || 'amateur',
        birth_year: data.profile?.birth_year ?? '',
        city: data.profile?.city || '',
        description: data.profile?.description || '',
        is_available: data.profile?.is_available ?? true,
        is_whatsapp: Boolean(data.user?.is_whatsapp),
      })
    }
  }, [data])

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }))

  const submit = async () => {
    setBusy(true)
    setMsg('')
    try {
      const res = await api.put('/player/profile', {
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        is_whatsapp: form.is_whatsapp,
        position: form.position,
        skill_level: form.skill_level,
        birth_year: form.birth_year ? Number(form.birth_year) : null,
        city: form.city,
        description: form.description,
        is_available: form.is_available,
      })
      setMsg(res.data.message || 'تم الحفظ')
      refetch()
      setTimeout(() => setMsg(''), 2500)
    } catch (e) {
      setMsg(e.response?.data?.message || 'تعذر الحفظ')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <div className="mx-auto max-w-2xl">
      <SectionTitle title="ملفي الشخصي" subtitle="عرّف عن نفسك ليتمكن المسيرون من اختيارك" />

      {msg && (
        <div className="mb-4 rounded-xl bg-green-500/15 px-4 py-3 text-sm font-semibold text-green-400">{msg}</div>
      )}

      <div className="space-y-5 rounded-3xl bg-[#101a2b] p-6 ring-1 ring-white/10">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="الاسم">
            <input className={inputClass} value={form.name || ''} onChange={set('name')} />
          </Field>
          <Field label="الهاتف">
            <input className={inputClass} value={form.phone || ''} onChange={set('phone')} />
          </Field>
          <Field label="البريد الإلكتروني">
            <input type="email" className={inputClass} value={form.email || ''} onChange={set('email')} />
          </Field>
          <Field label="المدينة">
            <input className={inputClass} value={form.city || ''} onChange={set('city')} />
          </Field>
          <Field label="المركز">
            <select className={inputClass} value={form.position || 'midfielder'} onChange={set('position')}>
              <option value="goalkeeper" className="bg-[#0e1726]">حارس</option>
              <option value="defender" className="bg-[#0e1726]">مدافع</option>
              <option value="midfielder" className="bg-[#0e1726]">وسط</option>
              <option value="forward" className="bg-[#0e1726]">مهاجم</option>
            </select>
          </Field>
          <Field label="المستوى">
            <select className={inputClass} value={form.skill_level || 'amateur'} onChange={set('skill_level')}>
              {Object.entries(skillLevels).map(([k, v]) => (
                <option key={k} value={k} className="bg-[#0e1726]">{v}</option>
              ))}
            </select>
          </Field>
          <Field label="سنة الميلاد">
            <input type="number" min="1950" max={new Date().getFullYear()} className={inputClass} value={form.birth_year ?? ''} onChange={set('birth_year')} />
          </Field>
        </div>
        <Field label="وصف قصير">
          <textarea className={`${inputClass} h-24 resize-none py-3`} value={form.description || ''} onChange={set('description')} />
        </Field>
        <div className="space-y-2 rounded-xl bg-white/5 p-3">
          <Toggle label="متاح للانضمام للمباريات" checked={Boolean(form.is_available)} onChange={(v) => setForm((f) => ({ ...f, is_available: v }))} />
          <Toggle label="رقم واتساب" checked={Boolean(form.is_whatsapp)} onChange={(v) => setForm((f) => ({ ...f, is_whatsapp: v }))} />
        </div>
        <Button className="w-full" disabled={busy} onClick={submit}>
          {busy ? 'جارٍ الحفظ...' : 'حفظ الملف'}
        </Button>
      </div>
    </div>
  )
}
