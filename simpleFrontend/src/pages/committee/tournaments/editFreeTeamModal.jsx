import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Save, X } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Button, Field, inputClass, Modal } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import { BRAND_COLORS } from '../../../lib/brandColors'

export default function EditFreeTeamModal({
  open,
  onClose,
  team,
  tournamentId: passedTournamentId,
  tournament,
  onSaved,
  onUpdated,
  locked = false,
}) {
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

  const tournamentId = passedTournamentId || tournament?.id
  const isOpen = open !== undefined ? Boolean(open) : Boolean(team && tournamentId)

  const { data: presets, loading: presetsLoading } = useApi(
    () => api.get('/presets', { params: { category: 'team_logo' } }).then((r) => r.data?.data || []),
    [isOpen],
    { enabled: Boolean(isOpen), staleTime: 5 * 60 * 1000 },
  )

  useEffect(() => {
    if (!isOpen) return
    setName(team?.name ?? '')
    setCity(team?.city ?? '')
    setLogoFile(null)
    setLogoPreview(null)
    setSelectedPreset(null)
    setRemoving(false)
    setPrimaryColor(team?.primary_color ?? '')
    setSecondaryColor(team?.secondary_color ?? '')
  }, [isOpen, team])

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
      toast.error(t('committee.detail.editFreeTeamNameRequired') || 'اسم الفريق مطلوب')
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
      toast.success(t('committee.detail.editFreeTeamSaved') || 'تم حفظ بيانات الفريق بنجاح')
      if (onSaved) onSaved()
      if (onUpdated) onUpdated()
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
      open={isOpen}
      onClose={onClose}
      title={t('committee.detail.editFreeTeam') || 'تعديل بيانات الفريق'}
      subtitle={t('committee.detail.editFreeTeamDesc') || 'تعديل اسم الفريق والشعار والألوان الأساسية'}
    >
      <div className="space-y-4" dir="rtl">
        <div className="flex justify-center">
          <div className="relative">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative grid size-24 place-items-center overflow-hidden rounded-3xl bg-slate-100 dark:bg-slate-800 ring-2 ring-slate-200 dark:ring-slate-700 transition-colors hover:ring-green-400 cursor-pointer"
              aria-label={t('committee.detail.editFreeTeamLogo') || 'تغيير الشعار'}
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
                {t('committee.detail.editFreeTeamChangeLogo') || 'تغيير'}
              </span>
            </button>
            {(shownLogo || removing) && (
              <button
                type="button"
                onClick={clearLogoChoice}
                title={t('committee.detail.editFreeTeamRemoveLogo') || 'إزالة الشعار'}
                aria-label={t('committee.detail.editFreeTeamRemoveLogo') || 'إزالة الشعار'}
                className="absolute -bottom-2 -start-2 grid size-8 place-items-center rounded-full bg-white dark:bg-slate-800 text-rose-500 shadow-[0_8px_20px_rgba(15,23,42,0.14)] ring-1 ring-rose-100 dark:ring-rose-900 transition-all hover:bg-rose-50 active:scale-95 cursor-pointer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/jpg,image/webp" className="hidden" onChange={onPick} />
        <p className="text-center text-[11px] font-semibold text-slate-400">
          {logoFile ? logoFile.name : t('committee.detail.settingsBrandingLogoHint') || 'اختر ملف صورة بدقة واضحة'}
        </p>

        {locked && (
          <p className="rounded-xl bg-amber-50 dark:bg-amber-950/40 px-3.5 py-2.5 text-center text-[11px] font-bold text-amber-700 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800">
            {t('committee.detail.editFreeTeamLockedNote') || 'تم قفل بعض الإعدادات نظراً لوجود نتائج مسجلة'}
          </p>
        )}

        {presetsLoading ? (
          <div className="flex justify-center gap-2 py-2">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="size-12 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800" />
            ))}
          </div>
        ) : (presets || []).length > 0 ? (
          <div>
            <p className="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400">{t('committee.detail.editFreeTeamPresetLabel') || 'شعارات جاهزة للاختيار السريع:'}</p>
            <div className="flex flex-wrap gap-2">
              {(presets || []).map((p) => {
                const active = selectedPreset?.id === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPreset((prev) => (prev?.id === p.id ? null : p))}
                    title={p.name}
                    className={`relative grid size-12 place-items-center overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-800 transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                      active ? 'ring-2 ring-emerald-500 ring-offset-2' : 'ring-1 ring-slate-200 dark:ring-slate-700'
                    }`}
                  >
                    <img src={p.image_thumbnail_url || p.image_url} alt={p.name} loading="lazy" className="size-full object-contain" />
                    {active && (
                      <span className="absolute grid size-4 place-items-center rounded-full bg-emerald-600 text-white">
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
                <p className="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400">{t('committee.detail.editFreeTeamPrimaryColor') || 'اللون الأساسي'}</p>
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
                        className={`grid size-7 place-items-center rounded-full transition-all hover:scale-110 active:scale-95 cursor-pointer ${
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
                <p className="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400">{t('committee.detail.editFreeTeamSecondaryColor') || 'اللون الثانوي'}</p>
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
                        className={`grid size-7 place-items-center rounded-full transition-all hover:scale-110 active:scale-95 cursor-pointer ${
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

          <Field label={t('committee.detail.freeTeamName') || 'اسم الفريق'} required>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </Field>

          {!locked && (
            <Field label={t('committee.detail.editFreeTeamCity') || 'المدينة أو المنطقة'}>
              <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} maxLength={255} />
            </Field>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold" loading={busy} onClick={save}>
            <Save className="size-4" />
            {t('common.save') || 'حفظ التعديلات'}
          </Button>
          <Button variant="outline" className="px-4 font-bold" onClick={onClose}>
            <X className="size-4" />
            {t('common.cancel') || 'إلغاء'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
