import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { SectionError } from '../../../components/errors'
import { Card, SectionTitle, Button, Field, inputClass, Toggle, SkeletonCards } from '../../../components/dashboard/ui'
import ProfileImageUploader from '../../../components/profile/ProfileImageUploader'
import ProfileAppearance from '../../../components/profile/ProfileAppearance'
import { useAuth } from '../../../context/AuthContext'

export default function Profile() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { data, loading, errorState, refetch } = useApi(() => api.get('/player/profile').then((r) => r.data))
  const [form, setForm] = useState({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  const positions = ['goalkeeper', 'defender', 'midfielder', 'forward']
  const skillLevels = ['beginner', 'amateur', 'semi_pro', 'pro']

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
      setMsg(res.data.message || t('player.profile.saved'))
      refetch()
      setTimeout(() => setMsg(''), 2500)
    } catch (e) {
      setMsg(e.response?.data?.message || t('player.profile.failed'))
    } finally {
      setBusy(false)
    }
  }

  if (errorState) {
    return (
      <Card>
        <SectionError state={errorState} onRetry={refetch} />
      </Card>
    )
  }

  if (loading) return <SkeletonCards count={2} className="mx-auto max-w-2xl space-y-4" />

  return (
    <div className="mx-auto max-w-2xl">
      <SectionTitle title={t('player.profile.title')} subtitle={t('player.profile.subtitle')} />

      <div className="mb-5 flex justify-center">
        <ProfileImageUploader user={user} size="size-24" rounded="rounded-full" fontSize="text-4xl" />
      </div>

      {msg && (
        <div className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-700 ring-1 ring-green-200">{msg}</div>
      )}

      <ProfileAppearance />

      <Card noPadding>
        <div className="space-y-5 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('player.profile.name')}>
              <input className={inputClass} value={form.name || ''} onChange={set('name')} />
            </Field>
            <Field label={t('player.profile.phone')}>
              <input className={inputClass} value={form.phone || ''} onChange={set('phone')} />
            </Field>
            <Field label={t('player.profile.email')}>
              <input type="email" className={inputClass} value={form.email || ''} onChange={set('email')} />
            </Field>
            <Field label={t('player.profile.city')}>
              <input className={inputClass} value={form.city || ''} onChange={set('city')} />
            </Field>
            <Field label={t('player.profile.position')}>
              <select className={inputClass} value={form.position || 'midfielder'} onChange={set('position')}>
                {positions.map((p) => (
                  <option key={p} value={p}>{t(`player.profile.positions.${p}`)}</option>
                ))}
              </select>
            </Field>
            <Field label={t('player.profile.level')}>
              <select className={inputClass} value={form.skill_level || 'amateur'} onChange={set('skill_level')}>
                {skillLevels.map((s) => (
                  <option key={s} value={s}>{t(`player.profile.skill.${s}`)}</option>
                ))}
              </select>
            </Field>
            <Field label={t('player.profile.birthYear')}>
              <input
                type="number"
                min="1950"
                max={new Date().getFullYear()}
                className={inputClass}
                value={form.birth_year ?? ''}
                onChange={set('birth_year')}
              />
            </Field>
          </div>
          <Field label={t('player.profile.description')}>
            <textarea className={`${inputClass} h-24 resize-none py-3`} value={form.description || ''} onChange={set('description')} />
          </Field>
          <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/60 p-3">
            <Toggle
              label={t('player.profile.available')}
              checked={Boolean(form.is_available)}
              onChange={(v) => setForm((f) => ({ ...f, is_available: v }))}
            />
            <Toggle
              label={t('player.profile.whatsapp')}
              checked={Boolean(form.is_whatsapp)}
              onChange={(v) => setForm((f) => ({ ...f, is_whatsapp: v }))}
            />
          </div>
          <Button className="w-full" disabled={busy} onClick={submit}>
            {busy ? t('player.profile.saving') : t('player.profile.save')}
          </Button>
        </div>
      </Card>
    </div>
  )
}
