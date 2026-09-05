import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Save, X } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Button, Field, inputClass, Modal } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import { BRAND_COLORS } from '../../../lib/brandColors'

export default function EditFreeTeamModal({ open, onClose, team, tournamentId, onSaved, locked = false }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const fileRef = useRef(null)
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [removing, setRemoving] = useState(false)
  const [primaryColor, setPrimaryColor] = useState('')
  const [secondaryColor, setSecondaryColor] = useState('')
  const [busy, setBusy] = useState(false)

  const { data: presets, loading: presetsLoading } = useApi(
    () => api.get('/presets', { params: { category: 'team_logo' } }).then((r) => r.data?.data || []),
    [open],
    { enabled: Boolean(open), staleTime: 5 * 60 * 1000 },
  )

  useEffect(() => {
    if (!open) return
    setName(team?.name ?? '')
    setCity(team?.city ?? '')
    setLogoFile(null)
    setLogoPreview(null)
    setSelectedPreset(null)
    setRemoving(false)
    setPrimaryColor(team?.primary_color ?? '')
    setSecondaryColor(team?.secondary_color ?? '')
  }, [open, team])

  const onPick = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
    setRemoving(false)
  }

  const presetPreview = selectedPreset ? selectedPreset.image_thumbnail_url || selectedPreset.image_url : null
  const shownLogo = logoPreview || presetPreview || (!removing ? team?.logo_url : null)

  const clearLogoChoice = () => {
    if (logoFile) {
      setLogoFile(null)
      setLogoPreview(null)
    } else if (selectedPreset) {
      setSelectedPreset(null)
    } else if (removing) {
      setRemoving(false)
    } else if (team?.logo_url) {
      setRemoving(true)
    }
  }

  const save = async () => {
    if (busy) return
    if (!name.trim()) {
      toast.error(t('committee.detail.editFreeTeamNameRequired'))
      return
    }
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('_method', 'PUT')
      fd.append('name', name.trim())
      if (!locked) {
        fd.append('city', city.trim())
        fd.append('primary_color', primaryColor || '')
        fd.append('secondary_color', secondaryColor || '')
      }
      if (logoFile) {
        fd.append('logo', logoFile)
      } else if (selectedPreset) {
        fd.append('logo_preset_id', selectedPreset.id)
      } else if (removing) {
        fd.append('remove_logo', 1)
      }
      await api.post(`/committee/tournaments/${tournamentId}/teams/${team?.id}`, fd)
      toast.success(t('committee.detail.editFreeTeamSaved'))
      onSaved?.()
      onClose()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  const initialsName = name.trim() || team?.name || ''

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('committee.detail.editFreeTeam')}
      subtitle={t('committee.detail.editFreeTeamDesc')}
    >
      <div className="space-y-4">
        <div className="flex justify-center">
          <div className="relative">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative grid size-24 place-items-center overflow-hidden rounded-3xl bg-slate-100 ring-2 ring-slate-200 transition-colors hover:ring-green-400"
              aria-label={t('committee.detail.editFreeTeamLogo')}
            >
              {shownLogo ? (
                <img
                  src={shownLogo}
                  alt={initialsName}
                  className="size-full object-contain"
                />
              ) : (
                <span
                  style={{ backgroundColor: primaryColor || '#16a34a' }}
                  className="grid size-full place-items-center text-3xl font-black text-white"
                >
                  {initialsName.trim().charAt(0) || '؟'}
                </span>
              )}
              <span className="absolute inset-x-0 bottom-0 bg-black/50 py-1 text-center text-[9px] font-black text-white">
                {t('committee.detail.editFreeTeamChangeLogo')}
              </span>
            </button>
            {(shownLogo || removing) && (
              <button
                type="button"
                onClick={clearLogoChoice}
                title={t('committee.detail.editFreeTeamRemoveLogo')}
                aria-label={t('committee.detail.editFreeTeamRemoveLogo')}
                className="absolute -bottom-2 -start-2 grid size-8 place-items-center rounded-full bg-white text-rose-500 shadow-[0_8px_20px_rgba(15,23,42,0.14)] ring-1 ring-rose-100 transition-all hover:bg-rose-50 active:scale-95"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/jpg,image/webp" className="hidden" onChange={onPick} />
        <p className="text-center text-[11px] font-semibold text-slate-400">
          {logoFile ? logoFile.name : t('committee.detail.settingsBrandingLogoHint')}
        </p>

        {locked && (
          <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-center text-[11px] font-bold text-amber-700 ring-1 ring-amber-200">
            {t('committee.detail.editFreeTeamLockedNote')}
          </p>
        )}

        {presetsLoading ? (
          <div className="flex justify-center gap-2 py-2">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="size-12 animate-pulse rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : (presets || []).length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-bold text-slate-500">{t('committee.detail.editFreeTeamPresetLabel')}</p>
            <div className="flex flex-wrap gap-2">
              {(presets || []).map((p) => {
                const active = selectedPreset?.id === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPreset((prev) => (prev?.id === p.id ? null : p))}
                    title={p.name}
                    className={`relative grid size-12 place-items-center overflow-hidden rounded-2xl bg-slate-100 transition-all hover:scale-105 active:scale-95 ${
                      active ? 'ring-2 ring-violet-500 ring-offset-2' : 'ring-1 ring-slate-200'
                    }`}
                  >
                    <img src={p.image_thumbnail_url || p.image_url} alt={p.name} loading="lazy" className="size-full object-contain" />
                    {active && (
                      <span className="absolute grid size-4 place-items-center rounded-full bg-violet-600 text-white">
                        <Check className="size-2.5" strokeWidth={3.5} />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        <div className="space-y-3">
          {!locked && (
            <>
              <div>
                <p className="mb-2 text-xs font-bold text-slate-500">{t('committee.detail.editFreeTeamPrimaryColor')}</p>
                <div className="flex flex-wrap gap-2">
                  {BRAND_COLORS.map((c) => {
                    const active = c.value.toLowerCase() === (primaryColor || '').toLowerCase()
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setPrimaryColor(c.value)}
                        aria-label={c.id}
                        title={c.id}
                        className={`grid size-7 place-items-center rounded-full transition-all hover:scale-110 active:scale-95 ${
                          active ? 'ring-2 ring-slate-400 ring-offset-1' : ''
                        }`}
                        style={{ backgroundColor: c.value }}
                      >
                        {active && <Check className="size-3 text-white" strokeWidth={3} />}
                      </button>
                    )
                  })}
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold text-slate-500">{t('committee.detail.editFreeTeamSecondaryColor')}</p>
                <div className="flex flex-wrap gap-2">
                  {BRAND_COLORS.map((c) => {
                    const active = c.value.toLowerCase() === (secondaryColor || '').toLowerCase()
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSecondaryColor(c.value)}
                        aria-label={c.id}
                        title={c.id}
                        className={`grid size-7 place-items-center rounded-full transition-all hover:scale-110 active:scale-95 ${
                          active ? 'ring-2 ring-slate-400 ring-offset-1' : ''
                        }`}
                        style={{ backgroundColor: c.value }}
                      >
                        {active && <Check className="size-3 text-white" strokeWidth={3} />}
                      </button>
                    )
                  })}
                </div>
              </div>
            </>
          )}

          <Field label={t('committee.detail.freeTeamName')} required>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </Field>

          {!locked && (
            <Field label={t('committee.detail.editFreeTeamCity')}>
              <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} maxLength={255} />
            </Field>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <Button className="flex-1" loading={busy} onClick={save}>
            <Save className="size-4" />
            {t('common.save')}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            <X className="size-4" />
            {t('common.cancel')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}