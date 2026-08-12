import { useRef, useState } from 'react'
import { ImagePlus, Star, Trash2, UploadCloud } from 'lucide-react'
import api from '../../../api/client'
import { Spinner } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'

const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

const summarizeErrors = (errors) => {
  const seen = new Set()
  const list = []
  for (const msgs of Object.values(errors || {})) {
    for (const m of msgs) {
      if (!seen.has(m)) {
        seen.add(m)
        list.push(m)
      }
    }
  }
  return list.join(' • ')
}

export default function ImageGallery({ terrainId, images, onChanged }) {
  const { toast } = useToast()
  const inputRef = useRef(null)
  const [busy, setBusy] = useState(false)

  const upload = async (files) => {
    if (!files.length) return
    if (images.length + files.length > 6) {
      toast.error('الحد الأقصى 6 صور')
      return
    }
    const fileList = Array.from(files)
    const issues = fileList
      .map((f) => {
        if (!ALLOWED_TYPES.includes(f.type)) return `«${f.name}» صيغة غير مدعومة (JPG / PNG / WEBP فقط)`
        if (f.size > MAX_FILE_SIZE) return `«${f.name}» حجمه يتجاوز 5MB`
        return null
      })
      .filter(Boolean)
    if (issues.length) {
      toast.error(issues.join(' • '))
      return
    }
    setBusy(true)
    const fd = new FormData()
    fileList.forEach((f) => fd.append('images[]', f))
    try {
      await api.post(`/owner/terrains/${terrainId}/images`, fd)
      toast.success('تم رفع الصور بنجاح')
      onChanged()
    } catch (e) {
      toast.error(summarizeErrors(e.response?.data?.errors) || e.response?.data?.message || 'تعذر رفع الصور')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (imageId) => {
    setBusy(true)
    try {
      await api.delete(`/owner/terrains/${terrainId}/images/${imageId}`)
      toast.success('تم حذف الصورة')
      onChanged()
    } catch (e) {
      toast.error(e.response?.data?.message || 'تعذر حذف الصورة')
    } finally {
      setBusy(false)
    }
  }

  const setAsCover = async (image) => {
    setBusy(true)
    try {
      await api.put(`/owner/terrains/${terrainId}/cover`, { image_id: image.id })
      toast.success('تم تعيين الصورة كصورة رئيسية')
      onChanged()
    } catch (e) {
      toast.error(e.response?.data?.message || 'تعذر تعيين الصورة الرئيسية')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {busy && <Spinner className="!py-6" />}
      <div className="grid grid-cols-3 gap-2.5">
        {images.map((img) => (
          <div
            key={img.id}
            className={`group relative aspect-square overflow-hidden rounded-2xl border bg-slate-100 ${
              img.is_thumbnail ? 'border-amber-400 ring-2 ring-amber-400/60' : 'border-slate-200'
            }`}
          >
            <img loading="lazy" decoding="async" src={img.image_url} alt="" className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
            {img.is_thumbnail && (
              <span className="absolute start-1.5 top-1.5 flex items-center gap-1 rounded-lg bg-amber-400 px-2 py-1 text-[10px] font-black text-amber-950 shadow">
                <Star className="size-3 fill-current" />
                الرئيسية
              </span>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => setAsCover(img)}
              className={`absolute bottom-1.5 start-1.5 grid size-7 place-items-center rounded-lg backdrop-blur transition-colors ${
                img.is_thumbnail ? 'bg-amber-400 text-amber-950' : 'bg-slate-900/60 text-white hover:bg-amber-400 hover:text-amber-950'
              }`}
              title="تعيين كصورة رئيسية"
            >
              <Star className={`size-3.5 ${img.is_thumbnail ? 'fill-current' : ''}`} />
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => remove(img.id)}
              className="absolute end-1.5 top-1.5 grid size-7 place-items-center rounded-lg bg-slate-900/60 text-white backdrop-blur transition-colors hover:bg-rose-500"
              title="حذف"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
        {images.length < 6 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="grid aspect-square place-items-center rounded-2xl border-2 border-dashed border-slate-200 text-slate-300 transition-colors hover:border-green-300 hover:bg-green-50/40 hover:text-green-500"
          >
            <div className="flex flex-col items-center gap-1.5">
              <ImagePlus className="size-6" />
              <span className="text-[10px] font-bold">إضافة</span>
            </div>
          </button>
        )}
      </div>
      <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500 transition-colors hover:border-green-300 hover:text-green-600">
        <UploadCloud className="size-4" />
        اسحب الصور هنا أو انقر للاختيار (حتى 6 صور)
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            upload(e.target.files)
            e.target.value = ''
          }}
        />
      </label>
    </div>
  )
}
