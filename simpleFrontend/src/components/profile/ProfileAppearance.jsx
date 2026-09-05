import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Loader2, Palette } from 'lucide-react'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../ui/Toast'
import { toastApiError } from '../../lib/errors'
import { BRAND_COLORS } from '../../lib/brandColors'
import ProfileAvatar from './ProfileAvatar'

// "Appearance" section for any logged-in role: pick a fixed brand color
// (users.avatar_color) and/or apply a ready-made avatar from the preset
// library. Coexists with the manual photo upload.
export default function ProfileAppearance({ className = 'mt-6' }) {
  const { t } = useTranslation()
  const { user, updateUser } = useAuth()
  const { toast } = useToast()
  const { data, loading } = useApi(
    () => api.get('/presets', { params: { category: 'profile_avatar' } }).then((r) => r.data?.data || []),
    [],
    { staleTime: 5 * 60 * 1000 },
  )

  const [color, setColor] = useState(user?.avatar_color || '')
  const [busy, setBusy] = useState('')

  useEffect(() => {
    setColor(user?.avatar_color || '')
  }, [user?.avatar_color])

  const applyColor = async (hex) => {
    if (busy) return
    setBusy('color')
    const prev = color
    setColor(hex)
    try {
      const res = await api.put('/me/avatar-color', { color: hex })
      updateUser({ ...user, ...res.data.user })
      setColor(res.data.user?.avatar_color || '')
      toast.success(res.data.message || t('profile.appearance.colorSaved'))
    } catch (e) {
      setColor(prev)
      toastApiError(e, t)
    } finally {
      setBusy('')
    }
  }

  const applyPreset = async (preset) => {
    if (busy) return
    setBusy(`p${preset.id}`)
    try {
      const res = await api.post('/me/avatar-preset', { preset_id: preset.id })
      updateUser({ ...user, ...res.data.user })
      toast.success(res.data.message || t('profile.appearance.presetApplied'))
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy('')
    }
  }

  const previewUser = { ...user, avatar_color: color }

  return (
    <section className={`${className} rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]`}>
      <div className="mb-5 flex items-center gap-2">
        <span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600">
          <Palette className="size-4" />
        </span>
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">{t('profile.appearance.title')}</h3>
          <p className="text-[11px] font-semibold text-slate-400">{t('profile.appearance.subtitle')}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-6">
        <ProfileAvatar user={previewUser} className="size-20" rounded="rounded-full" fontSize="text-3xl" />

        <div className="min-w-0 flex-1 space-y-5">
          <div>
            <p className="mb-2 text-xs font-bold text-slate-500">{t('profile.appearance.colorLabel')}</p>
            <div className="flex flex-wrap gap-2">
              {BRAND_COLORS.map((c) => {
                const active = c.value.toLowerCase() === (color || '').toLowerCase()
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => applyColor(c.value)}
                    disabled={busy === 'color'}
                    aria-label={c.id}
                    title={c.id}
                    className={`grid size-8 place-items-center rounded-full transition-all hover:scale-110 active:scale-95 disabled:opacity-50 ${
                      active ? 'ring-2 ring-slate-400 ring-offset-2' : ''
                    }`}
                    style={{ backgroundColor: c.value }}
                  >
                    {active && <Check className="size-4 text-white" strokeWidth={3} />}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold text-slate-500">{t('profile.appearance.presetLabel')}</p>
            {loading ? (
              <div className="flex flex-wrap gap-2">
                {[0, 1, 2, 3].map((i) => (
                  <span key={i} className="size-14 animate-pulse rounded-full bg-slate-100" />
                ))}
              </div>
            ) : (data || []).length === 0 ? (
              <p className="max-w-sm rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-400">
                {t('profile.appearance.presetEmpty')}
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {(data || []).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    disabled={Boolean(busy) || Boolean(busy.startsWith('p'))}
                    onClick={() => applyPreset(p)}
                    title={p.name}
                    className="relative grid size-14 place-items-center overflow-hidden rounded-full ring-1 ring-slate-200 transition-all hover:scale-110 hover:ring-violet-300 active:scale-95 disabled:opacity-60"
                  >
                    <img
                      src={p.image_thumbnail_url || p.image_url}
                      alt={p.name}
                      loading="lazy"
                      className="size-full rounded-full object-cover"
                    />
                    {busy === `p${p.id}` && (
                      <span className="absolute inset-0 grid place-items-center bg-white/60">
                        <Loader2 className="size-5 animate-spin text-violet-600" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}