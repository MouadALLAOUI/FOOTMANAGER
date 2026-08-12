import { useEffect, useState } from 'react'
import { Save, ShieldCheck, Phone, Mail, Lock, UserRound, CheckCircle2 } from 'lucide-react'
import api from '../../../api/client'
import { useAuth } from '../../../context/AuthContext'
import { PageHeader, Button, Card, Field, Input, Toggle, Badge, Skeleton } from '../../../components/admin/ui'
import { toast } from '../../../components/ui/Toast'

const roleLabels = {
  admin: 'مدير النظام',
  manager: 'مسير فريق',
  terrain_owner: 'صاحب تيران',
  player: 'لاعب',
  committee: 'اللجنة المنظمة',
}

export default function Profile() {
  const { user, updateUser } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', phone: '', is_whatsapp: false })
  const [password, setPassword] = useState({ password: '', password_confirmation: '' })
  const [busy, setBusy] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        is_whatsapp: Boolean(user.is_whatsapp),
      })
      setLoaded(true)
    }
  }, [user])

  const save = async () => {
    setBusy(true)
    try {
      const payload = { ...form }
      if (password.password) {
        payload.password = password.password
        payload.password_confirmation = password.password_confirmation
      }
      const res = await api.put('/me', payload)
      updateUser({ ...user, ...res.data.user })
      setPassword({ password: '', password_confirmation: '' })
      toast.success(res.data.message || 'تم تحديث الملف الشخصي')
    } catch (e) {
      toast.error(e.response?.data?.message || 'تعذر الحفظ، تحقق من البيانات')
    } finally {
      setBusy(false)
    }
  }

  if (!loaded) {
    return (
      <div>
        <PageHeader title="الملف الشخصي" subtitle="معلومات حسابك في لوحة الإدارة" />
        <div className="space-y-5"><Skeleton className="h-32 rounded-3xl" /><Skeleton className="h-64 rounded-3xl" /></div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title="الملف الشخصي"
        subtitle="إدارة معلومات حسابك وكلمة المرور"
        actions={<Badge tone="green"><ShieldCheck className="size-3.5" /> {roleLabels[user?.role] || user?.role}</Badge>}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card title="المعلومات الأساسية">
            <div className="space-y-4">
              <Field label="الاسم الكامل" required>
                <div className="relative">
                  <UserRound className="absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <Input className="ps-10" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="البريد الإلكتروني" required>
                  <div className="relative">
                    <Mail className="absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input className="ps-10" dir="ltr" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                  </div>
                </Field>
                <Field label="رقم الهاتف" required>
                  <div className="relative">
                    <Phone className="absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input className="ps-10" dir="ltr" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                  </div>
                </Field>
              </div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-4">
                <div>
                  <p className="text-sm font-bold text-slate-800">رقم واتساب</p>
                  <p className="text-xs text-slate-400">عرض رقمك للتواصل عبر واتساب</p>
                </div>
                <Toggle checked={form.is_whatsapp} onChange={(v) => setForm((f) => ({ ...f, is_whatsapp: v }))} />
              </div>
            </div>
          </Card>

          <div className="mt-6">
            <Card title="تغيير كلمة المرور">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="كلمة المرور الجديدة" hint="8 أحرف على الأقل">
                  <div className="relative">
                    <Lock className="absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      className="ps-10" dir="ltr" type="password" placeholder="••••••••"
                      value={password.password}
                      onChange={(e) => setPassword((p) => ({ ...p, password: e.target.value }))}
                    />
                  </div>
                </Field>
                <Field label="تأكيد كلمة المرور">
                  <Input
                    dir="ltr" type="password" placeholder="••••••••"
                    value={password.password_confirmation}
                    onChange={(e) => setPassword((p) => ({ ...p, password_confirmation: e.target.value }))}
                  />
                </Field>
              </div>
              <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
                <CheckCircle2 className="size-3.5" />
                اتركها فارغة إذا لم ترد تغيير كلمة المرور
              </p>
            </Card>
          </div>

          <div className="mt-6 flex justify-end">
            <Button size="lg" loading={busy} onClick={save}>
              <Save className="size-4" />
              حفظ التغييرات
            </Button>
          </div>
        </div>

        <div>
          <Card title="حسابك">
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-green-500 to-emerald-600 text-3xl font-black text-white shadow-[0_16px_36px_rgba(34,197,94,0.4)]">
                {user?.name?.charAt(0) || 'A'}
              </div>
              <div>
                <p className="text-base font-black text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-400" dir="ltr">{user?.email}</p>
              </div>
              <Badge tone="green">{roleLabels[user?.role] || user?.role}</Badge>
            </div>
            <div className="mt-2 space-y-2 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-slate-400">الحالة</span>
                <span className="font-bold text-emerald-600">نشط</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-slate-400">الهاتف</span>
                <span className="font-bold text-slate-700" dir="ltr">{user?.phone || '—'}</span>
              </div>
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-slate-400">واتساب</span>
                <span className="font-bold text-slate-700">{user?.is_whatsapp ? 'مفعل' : '—'}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
