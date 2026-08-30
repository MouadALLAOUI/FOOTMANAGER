import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ImagePlus, Save, X } from 'lucide-react'
import api from '../../../api/client'
import { Button, Field, inputClass, Modal } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'

export default function EditFreeTeamModal({ open, onClose, team, tournamentId, onSaved }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const fileRef = useRef(null)
  const [name, setName] = useState('')
  const [city, setCity] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(team?.name ?? '')
    setCity(team?.city ?? '')
    setLogoFile(null)
    setLogoPreview(null)
  }, [open, team])

  const onPick = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
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
      fd.append('city', city.trim())
      if (logoFile) fd.append('logo', logoFile)
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('committee.detail.editFreeTeam')}
      subtitle={t('committee.detail.editFreeTeamDesc')}
    >
      <div className="space-y-4">
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative grid size-24 place-items-center overflow-hidden rounded-3xl bg-slate-100 ring-2 ring-slate-200 transition-colors hover:ring-green-400"
            aria-label={t('committee.detail.editFreeTeamLogo')}
          >
            {logoPreview || team?.logo_url ? (
              <img
                src={logoPreview || team?.logo_url}
                alt={name}
                className="size-full object-cover"
              />
            ) : (
              <ImagePlus className="size-8 text-slate-400" />
            )}
            <span className="absolute inset-x-0 bottom-0 bg-black/50 py-1 text-center text-[9px] font-black text-white">
              {t('committee.detail.editFreeTeamChangeLogo')}
            </span>
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/jpg,image/webp" className="hidden" onChange={onPick} />
        <p className="text-center text-[11px] font-semibold text-slate-400">
          {logoFile ? logoFile.name : t('committee.detail.settingsBrandingLogoHint')}
        </p>

        <Field label={t('committee.detail.freeTeamName')} required>
          <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        </Field>

        <Field label={t('committee.detail.editFreeTeamCity')}>
          <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} maxLength={255} />
        </Field>

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
