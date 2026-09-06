import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Camera,
  Check,
  Image as ImageIcon,
  Loader2,
  Palette,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../ui/Toast'
import { toastApiError } from '../../lib/errors'
import { avatarThumb } from '../../lib/thumb'
import ProfileAvatar from './ProfileAvatar'
import { Button, Modal } from '../dashboard/ui'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 4 * 1024 * 1024

// Reusable profile-picture uploader for any authenticated role.
// Provides both options:
// 1. Choose from preset avatars provided by the app (added by admin).
// 2. Upload custom image from device.
export default function ProfileImageUploader({
  user,
  size = 'size-24',
  rounded = 'rounded-3xl',
  fontSize = 'text-4xl',
  onUpdated,
}) {
  const { t } = useTranslation()
  const { updateUser } = useAuth()
  const { toast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [tab, setTab] = useState('presets') // 'presets' | 'upload'
  const [presets, setPresets] = useState([])
  const [loadingPresets, setLoadingPresets] = useState(false)

  const inputRef = useRef(null)
  const [busy, setBusy] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')

  const src = avatarThumb(user)

  // Load preset avatars when modal is opened
  useEffect(() => {
    if (!modalOpen) return
    let mounted = true
    setLoadingPresets(true)
    api
      .get('/presets', { params: { category: 'profile_avatar' } })
      .then((res) => {
        if (!mounted) return
        setPresets(res.data?.data || [])
      })
      .catch((e) => {
        console.error('Failed to load preset avatars:', e)
      })
      .finally(() => {
        if (mounted) setLoadingPresets(false)
      })

    return () => {
      mounted = false
    }
  }, [modalOpen])

  const applyUser = (fresh) => {
    updateUser({ ...user, ...fresh })
    onUpdated?.(fresh)
  }

  const openModal = () => {
    setError('')
    setSelectedFile(null)
    setPreview('')
    setModalOpen(true)
  }

  // 1. Choose preset avatar
  const applyPreset = async (preset) => {
    if (busy) return
    setBusy(`preset-${preset.id}`)
    try {
      const res = await api.post('/me/avatar-preset', { preset_id: preset.id })
      applyUser(res.data.user)
      toast.success(res.data.message || t('profile.appearance.presetApplied', 'تم تطبيق الرمزية بنجاح'))
      setModalOpen(false)
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy('')
    }
  }

  // 2. Choose custom file
  const onFileSelect = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(t('profile.avatar.invalidType', 'يرجى اختيار صورة بصيغة JPG أو PNG أو WebP'))
      return
    }

    if (file.size > MAX_SIZE) {
      setError(t('profile.avatar.tooLarge', 'حجم الصورة يتجاوز الحد الأقصى (4MB)'))
      return
    }

    setError('')
    setSelectedFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const uploadCustomFile = async () => {
    if (!selectedFile || busy) return
    setBusy('upload')
    setError('')

    try {
      const fd = new FormData()
      fd.append('avatar', selectedFile)
      const res = await api.post('/me/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      applyUser(res.data.user)
      toast.success(res.data.message || t('profile.avatar.uploaded', 'تم رفع وتحديث الصورة بنجاح'))
      setModalOpen(false)
    } catch (e) {
      const msg = e.response?.data?.message || t('profile.avatar.uploadFailed', 'فشل رفع الصورة')
      setError(msg)
      toastApiError(e, t)
    } finally {
      setBusy('')
    }
  }

  // 3. Remove photo
  const remove = async () => {
    if (!src || busy) return
    setError('')
    setBusy('remove')

    try {
      const res = await api.delete('/me/avatar')
      applyUser(res.data.user)
      toast.success(res.data.message || t('profile.avatar.removed', 'تمت إزالة الصورة الشخصية'))
      setModalOpen(false)
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy('')
    }
  }

  return (
    <>
      <div className="group relative inline-block cursor-pointer" onClick={openModal}>
        <ProfileAvatar
          user={user}
          src={src}
          className={`${size} ${rounded} ring-2 ring-white/20 transition-all group-hover:ring-green-400`}
          rounded={rounded}
          fontSize={fontSize}
        />

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            openModal()
          }}
          disabled={Boolean(busy)}
          title={t('profile.avatar.upload', 'تغيير الصورة الشخصية')}
          aria-label={t('profile.avatar.upload', 'تغيير الصورة الشخصية')}
          className="absolute -bottom-2 -end-2 grid size-9 place-items-center rounded-xl bg-green-500 text-white shadow-[0_8px_20px_rgba(22,163,74,0.35)] transition-all hover:scale-105 hover:bg-green-600 active:scale-95 disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
        </button>
      </div>

      {modalOpen && (
        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="تغيير الصورة الشخصية"
          subtitle="اختر رمزية جاهزة يوفرها التطبيق أو ارفع صورة خاصة بك من جهازك"
          size="md"
        >
          <div className="space-y-5">
            {/* Tabs */}
            <div className="flex rounded-2xl border border-slate-200 bg-slate-100/70 p-1">
              <button
                type="button"
                onClick={() => setTab('presets')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                  tab === 'presets'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Palette className="size-4 text-violet-500" />
                <span>الرمزيات والصور الجاهزة</span>
              </button>
              <button
                type="button"
                onClick={() => setTab('upload')}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold transition-all ${
                  tab === 'upload'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <UploadCloud className="size-4 text-green-500" />
                <span>رفع صورة من جهازك</span>
              </button>
            </div>

            {/* Tab 1: Presets Library */}
            {tab === 'presets' && (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    الرمزيات المتوفرة في المنصة
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {presets.length} {presets.length === 1 ? 'رمزية' : 'رمزيات'}
                  </span>
                </div>

                {loadingPresets ? (
                  <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                      <span key={i} className="size-16 animate-pulse rounded-2xl bg-slate-100" />
                    ))}
                  </div>
                ) : presets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center">
                    <ImageIcon className="size-8 text-slate-300" />
                    <p className="mt-2 text-xs font-bold text-slate-600">
                      لم يتم إضافة رمزيات جاهزة بعد
                    </p>
                    <p className="mt-1 max-w-xs text-[11px] text-slate-400">
                      يقوم المشرف بإضافة الرمزيات الجاهزة من لوحة الإدارة. يمكنك الآن رفع صورتك الخاصة من جهازك.
                    </p>
                    <button
                      type="button"
                      onClick={() => setTab('upload')}
                      className="mt-3 text-xs font-bold text-green-600 underline hover:text-green-700"
                    >
                      الانتقال لرفع صورة
                    </button>
                  </div>
                ) : (
                  <div className="max-h-64 overflow-y-auto pe-1">
                    <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                      {presets.map((p) => {
                        const isSelected = busy === `preset-${p.id}`
                        return (
                          <button
                            key={p.id}
                            type="button"
                            disabled={Boolean(busy)}
                            onClick={() => applyPreset(p)}
                            title={p.name}
                            className="group relative flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-2 transition-all hover:border-violet-400 hover:shadow-md hover:ring-2 hover:ring-violet-400/20 active:scale-95 disabled:opacity-60"
                          >
                            <img
                              src={p.image_thumbnail_url || p.image_url}
                              alt={p.name}
                              loading="lazy"
                              className="size-14 rounded-xl object-contain"
                            />
                            <span className="max-w-[70px] truncate text-[10px] font-bold text-slate-600 group-hover:text-violet-700">
                              {p.name}
                            </span>
                            {isSelected && (
                              <span className="absolute inset-0 grid place-items-center rounded-2xl bg-white/70">
                                <Loader2 className="size-5 animate-spin text-violet-600" />
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Custom File Upload */}
            {tab === 'upload' && (
              <div className="space-y-4">
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={onFileSelect}
                />

                {preview ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50/50 p-5">
                    <div className="relative">
                      <img
                        src={preview}
                        alt="Preview"
                        className="size-24 rounded-full border-2 border-white object-cover shadow-md"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedFile(null)
                          setPreview('')
                        }}
                        className="absolute -top-1 -end-1 grid size-6 place-items-center rounded-full bg-slate-900/80 text-white hover:bg-rose-600"
                        title="إلغاء الصورة المحددة"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                    <p className="mt-2 text-xs font-semibold text-slate-600 truncate max-w-xs">
                      {selectedFile?.name}
                    </p>
                    <div className="mt-4 flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => inputRef.current?.click()}
                      >
                        اختيار صورة أخرى
                      </Button>
                      <Button
                        size="sm"
                        loading={busy === 'upload'}
                        onClick={uploadCustomFile}
                      >
                        <Check className="size-4" />
                        حفظ وتطبيق الصورة
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => inputRef.current?.click()}
                    className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 py-8 text-center transition-colors hover:border-green-400 hover:bg-green-50/20"
                  >
                    <div className="grid size-12 place-items-center rounded-2xl bg-green-50 text-green-600">
                      <UploadCloud className="size-6" />
                    </div>
                    <p className="mt-3 text-xs font-bold text-slate-800">
                      اضغط هنا لاختيار صورة من جهازك
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      PNG أو JPG أو WebP (الحد الأقصى 4MB)
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <p className="rounded-xl bg-rose-50 px-3 py-2 text-center text-xs font-bold text-rose-600">
                {error}
              </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              {src ? (
                <Button
                  variant="dangerSoft"
                  size="sm"
                  disabled={Boolean(busy)}
                  onClick={remove}
                  loading={busy === 'remove'}
                >
                  <Trash2 className="size-3.5" />
                  إزالة الصورة
                </Button>
              ) : (
                <div />
              )}
              <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>
                إغلاق
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

