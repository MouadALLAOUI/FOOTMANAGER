import { useTranslation } from 'react-i18next'
import { useEffect, useState } from 'react'
import { KeyRound, Phone, Save, UserRound } from 'lucide-react'
import api from '../../../api/client'
import { useMe } from '../../../api/queries'
import { Button, Field, FieldRow, SectionTitle, Skeleton, Toggle, inputClass } from '../../../components/dashboard/ui'
import ProfileImageUploader from '../../../components/profile/ProfileImageUploader'
import ProfileAppearance from '../../../components/profile/ProfileAppearance'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../components/ui/Toast'

export default function Profile() {
  const { t } = useTranslation()
  const { user, updateUser } = useAuth()
  const { toast } = useToast()
  const { data, loading } = useMe()
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const u = data?.user
    if (u) {
      setForm({
        name: u.name || '',
        email: u.email || '',
        phone: u.phone || '',
        is_whatsapp: Boolean(u.is_whatsapp),
        password: '',
        password_confirmation: '',
      })
    }
  }, [data])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        is_whatsapp: form.is_whatsapp,
        ...(form.password ? { password: form.password, password_confirmation: form.password_confirmation } : {}),
      }
      const res = await api.put('/me', payload)
      toast.success(res.data.message || t('dash.profileUpdated'))
      const fresh = { ...user, ...res.data.user, team: user?.team }
      updateUser(fresh)
      setForm((f) => ({ ...f, password: '', password_confirmation: '' }))
    } catch (e) {
      const msg = e.response?.data?.errors
        ? Object.values(e.response.data.errors).flat()[0]
        : e.response?.data?.message || t('dash.couldNotSave')
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <Skeleton className="h-40 rounded-[28px]" />
        <Skeleton className="h-80 rounded-3xl" />
      </div>
    )
  }

  const team = user?.team || data?.user?.team

  return (
    <div className="mx-auto max-w-2xl">
      <SectionTitle
        title={t('dash.profile2')}
        subtitle={t('dash.yourPersonalInfoAndAccount')}
        action={
          <Button onClick={save} disabled={saving}>
            <Save className="size-4" />
            {saving ? t('dash.saving') : t('dash.save')}
          </Button>
        }
      />

      <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-l from-[#0b1220] to-[#12321f] p-7 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
        <div className="pointer-events-none absolute -end-16 -top-16 size-56 rounded-full bg-green-500/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          <ProfileImageUploader user={user} size="size-20" rounded="rounded-full" fontSize="text-3xl" />
          <div className="min-w-0">
            <p className="text-xl font-black">{user?.name}</p>
            <p className="mt-1 text-xs font-semibold text-white/50">
              {user?.email || user?.phone || t('dash.noEmail')}
              {user?.is_whatsapp ? t('dash.whatsappEnabled') : ''}
            </p>
          </div>
          {team && (
            <div className="ms-auto rounded-2xl bg-white/10 px-4 py-2.5 text-center backdrop-blur">
              <p className="text-sm font-black">{team.name}</p>
              <p className="text-[10px] font-bold text-white/50">{t('dash.myTeam')}</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="mb-5 flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-green-50 text-green-600">
            <UserRound className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{t('dash.personalInformation')}</h3>
            <p className="text-[11px] font-semibold text-slate-400">{t('dash.thisInformationAppearsForYourAccountOnThePlatform')}</p>
          </div>
        </div>

        <div className="space-y-4">
          <Field label={t('dash.fullName')} required>
            <input className={inputClass} value={form.name || ''} onChange={set('name')} />
          </Field>
          <FieldRow>
            <Field label={t('dash.email')}>
              <input dir="ltr" type="email" className={inputClass} value={form.email || ''} onChange={set('email')} />
            </Field>
            <Field label={t('dash.phoneNumber')}>
              <input dir="ltr" className={inputClass} value={form.phone || ''} onChange={set('phone')} />
            </Field>
          </FieldRow>
          <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-white text-green-600 shadow-sm">
                <Phone className="size-4" />
              </span>
              <div>
                <p className="text-sm font-bold text-slate-700">{t('dash.thisNumberIsOnWhatsapp')}</p>
                <p className="text-[11px] font-semibold text-slate-400">{t('dash.soManagersCanReachYouEasily')}</p>
              </div>
            </div>
            <Toggle
              checked={Boolean(form.is_whatsapp)}
              onChange={(v) => setForm((f) => ({ ...f, is_whatsapp: v }))}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="mb-5 flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
            <KeyRound className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{t('dash.changePassword')}</h3>
            <p className="text-[11px] font-semibold text-slate-400">{t('dash.leaveBothFieldsEmptyToKeepYourCurrentPassword')}</p>
          </div>
        </div>
        <div className="space-y-4">
          <Field label={t('dash.newPassword')}>
            <input dir="ltr" type="password" className={inputClass} value={form.password || ''} onChange={set('password')} />
          </Field>
          <Field label={t('dash.confirmPassword')}>
            <input
              dir="ltr"
              type="password"
              className={inputClass}
              value={form.password_confirmation || ''}
              onChange={set('password_confirmation')}
            />
          </Field>
        </div>
      </div>

      <ProfileAppearance />

      {error && <p className="mt-4 rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600">{error}</p>}
    </div>
  )
}
