import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Check,
  Image as ImageIcon,
  Loader2,
  Palette,
  Shield,
  UploadCloud,
  X,
} from 'lucide-react'
import api from '../../api/client'
import { useToast } from '../ui/Toast'
import { toastApiError } from '../../lib/errors'
import { Button, Modal } from '../dashboard/ui'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 2 * 1024 * 1024 // 2MB backend validation

export default function TeamLogoModal({ open, onClose, team, onSuccess }) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [tab, setTab] = useState('presets') // 'presets' | 'upload'
  const [presets, setPresets] = useState([])
  const [loadingPresets, setLoadingPresets] = useState(false)

  const inputRef = useRef(null)
  const [busy, setBusy] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')

  // Load preset logos when modal opens
  useEffect(() => {
    if (!open) return
    let mounted = true
    setLoadingPresets(true)
    api
      .get('/presets', { params: { category: 'team_logo' } })
      .then((res) => {
        if (!mounted) return
        setPresets(res.data?.data || [])
      })
      .catch((e) => {
        console.error('Failed to load preset logos:', e)
      })
      .finally(() => {
        if (mounted) setLoadingPresets(false)
      })

    return () => {
      mounted = false
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setError('')
      setSelectedFile(null)
      setPreview('')
      setBusy('')
    }
  }, [open])

  // 1. Choose preset logo
  const applyPreset = async (preset) => {
    if (busy) return
    setBusy(`preset-${preset.id}`)
    try {
      const res = await api.post('/manager/team-profile/logo-preset', {
        preset_id: preset.id,
      })
      toast.success(res.data.message || t('dash.logoUpdated', 'تم تطبيق شعار الفريق بنجاح!'))
      onSuccess?.(res.data)
      onClose()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy('')
    }
  }

  // 2. Custom file selection
  const onFileSelect = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(t('profile.avatar.invalidType', 'يرجى اختيار صورة بصيغة JPG أو PNG أو WebP'))
      return
    }

    if (file.size > MAX_SIZE) {
      setError(t('dash.logoTooLarge', 'حجم الشعار يتجاوز الحد الأقصى (2MB)'))
      return
    }

    setError('')
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const uploadCustom = async () => {
    if (!selectedFile || busy) return
    setBusy('upload')
    setError('')
    try {
      const fd = new FormData()
      fd.append('logo', selectedFile)
      const res = await api.post('/manager/team-profile/logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success(res.data.message || t('dash.logoUploaded', 'تم رفع الشعار بنجاح!'))
      onSuccess?.(res.data)
      onClose()
    } catch (e) {
      toastApiError(e, t)
      setError(
        e.response?.data?.errors?.logo?.[0] ||
          e.response?.data?.message ||
          t('dash.logoUploadFailed', 'تعذر رفع الشعار'),
      )
    } finally {
      setBusy('')
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('dash.changeLogoTitle', 'تغيير شعار الفريق')}
      subtitle={t('dash.changeLogoSub', 'اختر شعاراً من القائمة الجاهزة أو ارفع شعاراً مخصصاً')}
      size="lg"
    >
      <div className="space-y-4">
        {/* Navigation Tabs */}
        <div className="flex rounded-2xl bg-slate-100 p-1.5 text-xs font-bold sm:text-sm">
          <button
            type="button"
            onClick={() => {
              setTab('presets')
              setError('')
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 transition-all ${
              tab === 'presets'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Palette className="size-4 text-green-600" />
            <span>{t('dash.presetLogos', 'الشعارات الجاهزة')}</span>
            {presets.length > 0 && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {presets.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('upload')
              setError('')
            }}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 transition-all ${
              tab === 'upload'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UploadCloud className="size-4 text-sky-600" />
            <span>{t('dash.uploadCustomLogo', 'رفع شعار من جهازك')}</span>
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 text-xs font-semibold text-rose-700">
            {error}
          </div>
        )}

        {/* Tab 1: Presets */}
        {tab === 'presets' && (
          <div>
            {loadingPresets ? (
              <div className="flex h-56 items-center justify-center">
                <Loader2 className="size-8 animate-spin text-green-600" />
              </div>
            ) : presets.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-12 text-center">
                <Shield className="size-12 text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-700">
                  {t('dash.noPresetsAvailable', 'لا توجد شعارات جاهزة متاحة حالياً')}
                </p>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  {t(
                    'dash.noPresetsDesc',
                    'يمكنك رفع شعارك الخاص من خيار "رفع شعار من جهازك" أعلاه، أو سيقوم المشرف بإضافة خيارات قريباً.',
                  )}
                </p>
              </div>
            ) : (
              <div className="grid max-h-[50vh] grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3 md:grid-cols-4">
                {presets.map((preset) => {
                  const isApplying = busy === `preset-${preset.id}`
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => applyPreset(preset)}
                      className="group relative flex flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-center transition-all hover:border-green-500 hover:shadow-md active:scale-95 disabled:pointer-events-none disabled:opacity-60"
                    >
                      <div className="relative grid size-20 place-items-center overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-100">
                        {preset.image_url ? (
                          <img
                            src={preset.thumbnail_url || preset.image_url}
                            alt={preset.name}
                            className="size-full object-contain p-1 transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <ImageIcon className="size-8 text-slate-300" />
                        )}
                        {isApplying && (
                          <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px]">
                            <Loader2 className="size-6 animate-spin text-white" />
                          </div>
                        )}
                      </div>
                      <span className="line-clamp-1 text-xs font-bold text-slate-700 group-hover:text-green-700">
                        {preset.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Upload */}
        {tab === 'upload' && (
          <div className="space-y-4">
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(',')}
              className="hidden"
              onChange={onFileSelect}
            />

            {!preview ? (
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  const file = e.dataTransfer.files?.[0]
                  if (file) {
                    onFileSelect({ target: { files: [file], value: '' } })
                  }
                }}
                className="flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50/50 px-6 py-12 text-center transition-colors hover:border-green-500 hover:bg-green-50/20"
              >
                <div className="grid size-14 place-items-center rounded-2xl bg-green-50 text-green-600 shadow-sm">
                  <UploadCloud className="size-7" />
                </div>
                <p className="mt-3 text-sm font-bold text-slate-800">
                  {t('profile.avatar.dropzonePrompt', 'انقر لاختيار شعار، أو اسحبه إلى هنا')}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  JPG, PNG, WebP — {t('profile.avatar.maxSize', 'الحد الأقصى 2MB')}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 rounded-3xl border border-slate-200 bg-slate-50/60 p-6">
                <div className="relative">
                  <img
                    src={preview}
                    alt="Preview"
                    className="size-28 rounded-3xl object-contain ring-4 ring-white shadow-md bg-white p-2"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedFile(null)
                      setPreview('')
                    }}
                    className="absolute -end-2 -top-2 grid size-7 place-items-center rounded-full bg-slate-800 text-white shadow hover:bg-rose-600"
                    title={t('common.cancel', 'إلغاء')}
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <div className="text-center">
                  <p className="text-xs font-bold text-slate-700">{selectedFile?.name}</p>
                  <p className="text-[11px] text-slate-400">
                    {(selectedFile?.size / 1024).toFixed(0)} KB
                  </p>
                </div>

                <div className="flex w-full max-w-xs gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => inputRef.current?.click()}
                    disabled={busy === 'upload'}
                  >
                    {t('common.change', 'تغيير')}
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1"
                    onClick={uploadCustom}
                    loading={busy === 'upload'}
                    disabled={busy === 'upload'}
                  >
                    <Check className="size-4" />
                    {t('profile.avatar.apply', 'تأكيد الحفظ')}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}