import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  Camera,
  Check,
  Image as ImageIcon,
  Loader2,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react'
import api from '../../api/client'
import { useToast } from '../ui/Toast'
import { toastApiError } from '../../lib/errors'
import { Button, Modal } from '../dashboard/ui'

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

export default function TeamPhotoModal({ open, onClose, team, onSuccess }) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const inputRef = useRef(null)
  const [busy, setBusy] = useState('')
  const [selectedFile, setSelectedFile] = useState(null)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const currentPhotoUrl = team?.cover_image_url || null

  useEffect(() => {
    if (!open) {
      setError('')
      setSelectedFile(null)
      setPreview('')
      setBusy('')
      setConfirmDelete(false)
    }
  }, [open])

  const onFileSelect = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('يرجى اختيار صورة بصيغة JPG أو PNG أو WebP')
      return
    }

    if (file.size > MAX_SIZE) {
      setError('حجم الصورة يتجاوز الحد الأقصى (5MB)')
      return
    }

    setError('')
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result || '')
    reader.readAsDataURL(file)
  }

  const cancelSelection = () => {
    setSelectedFile(null)
    setPreview('')
    setError('')
  }

  const handleUpload = async () => {
    if (!selectedFile || busy) return
    setBusy('upload')
    setError('')
    try {
      const fd = new FormData()
      fd.append('photo', selectedFile)
      const res = await api.post('/manager/team-profile/photo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success(res.data?.message || 'تم حفظ الصورة الجماعية بنجاح!')
      onSuccess?.(res.data)
      onClose()
    } catch (e) {
      toastApiError(e, t)
      setError(
        e.response?.data?.errors?.photo?.[0] ||
          e.response?.data?.message ||
          'تعذر حفظ الصورة الجماعية',
      )
    } finally {
      setBusy('')
    }
  }

  const handleDelete = async () => {
    if (busy) return
    setBusy('delete')
    setError('')
    try {
      const res = await api.delete('/manager/team-profile/photo')
      toast.success(res.data?.message || 'تم حذف الصورة الجماعية بنجاح!')
      onSuccess?.(res.data)
      onClose()
    } catch (e) {
      toastApiError(e, t)
      setError(e.response?.data?.message || 'تعذر حذف الصورة الجماعية')
    } finally {
      setBusy('')
      setConfirmDelete(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="الصورة الجماعية للفريق"
      subtitle="تظهر الصورة الجماعية في ملف الفريق الرسمي والبطاقة التعريفية"
    >
      <div className="space-y-4" dir="rtl">
        {error && (
          <div className="flex items-center gap-2 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">
            <AlertTriangle className="size-4 shrink-0 text-rose-600 dark:text-rose-400" />
            <p className="flex-1">{error}</p>
          </div>
        )}

        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          className="hidden"
          onChange={onFileSelect}
        />

        {/* Selected File Preview Mode */}
        {preview ? (
          <div className="space-y-3">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-slate-900 shadow-inner">
              <img
                src={preview}
                alt="معاينة الصورة الجديدة"
                className="size-full object-cover"
              />
              <span className="absolute top-2.5 start-2.5 rounded-full bg-black/60 backdrop-blur-xs px-2.5 py-1 text-[11px] font-black text-white">
                معاينة الصورة الجديدة
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={Boolean(busy)}
                onClick={cancelSelection}
                className="cursor-pointer"
              >
                <X className="size-3.5" />
                <span>إلغاء</span>
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={Boolean(busy)}
                onClick={handleUpload}
                className="bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313] hover:brightness-95 cursor-pointer font-black"
              >
                {busy === 'upload' ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>جارٍ الحفظ...</span>
                  </>
                ) : (
                  <>
                    <Check className="size-3.5" />
                    <span>حفظ الصورة الجماعية</span>
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : currentPhotoUrl ? (
          /* Current Photo Mode */
          <div className="space-y-3">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-slate-900 shadow-sm">
              <img
                src={currentPhotoUrl}
                alt={`الصورة الجماعية لفريق ${team?.name || ''}`}
                className="size-full object-cover"
              />
            </div>

            {confirmDelete ? (
              <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30 p-3.5 space-y-2.5">
                <p className="text-xs font-bold text-rose-800 dark:text-rose-200">
                  هل أنت متأكد من حذف الصورة الجماعية الحالية للفريق؟
                </p>
                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={Boolean(busy)}
                    onClick={() => setConfirmDelete(false)}
                    className="cursor-pointer"
                  >
                    تراجع
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={Boolean(busy)}
                    onClick={handleDelete}
                    className="cursor-pointer"
                  >
                    {busy === 'delete' ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5" />
                    )}
                    <span>نعم، حذف الصورة</span>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(true)}
                  className="text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                >
                  <Trash2 className="size-3.5" />
                  <span>حذف الصورة</span>
                </Button>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => inputRef.current?.click()}
                  className="bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313] hover:brightness-95 cursor-pointer font-black"
                >
                  <Camera className="size-3.5" />
                  <span>تغيير الصورة</span>
                </Button>
              </div>
            )}
          </div>
        ) : (
          /* Empty Upload Dropzone */
          <div
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                inputRef.current?.click()
              }
            }}
            className="group relative flex aspect-[16/9] w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-6 text-center transition-all hover:border-[#179955] dark:hover:border-[#D0FF38] hover:bg-[#F7F8F5]/80 cursor-pointer"
          >
            <div className="grid size-14 place-items-center rounded-2xl bg-white dark:bg-[#1B201D] border border-[#E1E5DF] dark:border-[#303832] text-[#179955] dark:text-[#D0FF38] shadow-xs group-hover:scale-105 transition-transform">
              <UploadCloud className="size-7" />
            </div>
            <p className="mt-3 text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
              إضافة صورة جماعية
            </p>
            <p className="mt-1 text-xs font-semibold text-[#65706A] dark:text-[#B2B9B3]">
              اضغط هنا لاختيار صورة من جهازك (نسبة 16:9 مستحسنة)
            </p>
            <span className="mt-2 text-[10px] font-bold text-[#65706A]/75 dark:text-[#B2B9B3]/75">
              JPG, PNG, WebP حتى 5MB
            </span>
          </div>
        )}
      </div>
    </Modal>
  )
}
