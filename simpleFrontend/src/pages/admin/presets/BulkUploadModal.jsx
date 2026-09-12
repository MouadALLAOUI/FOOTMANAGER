import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  UploadCloud,
  X,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileImage,
  FolderUp,
} from 'lucide-react'
import api from '../../../api/client'
import { Modal } from '../../../components/dashboard/ui'
import { Button, cn } from '../../../components/admin/ui'
import { toast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'

const CATEGORIES = ['team_logo', 'profile_avatar']
const CHUNK_SIZE = 20 // upload in batches to avoid PHP post_max_size / timeout issues

function extractName(filename) {
  // Strip extension
  const withoutExt = filename.replace(/\.[^/.]+$/, '')
  // Replace underscores, dashes, dots with spaces and trim
  const cleaned = withoutExt.replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim()
  return cleaned || withoutExt
}

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export default function BulkUploadModal({
  open,
  onClose,
  onSuccess,
  defaultCategory = 'team_logo',
}) {
  const { t } = useTranslation()
  const [category, setCategory] = useState(defaultCategory)
  const [items, setItems] = useState([])
  const [busy, setBusy] = useState(false)
  const [progressText, setProgressText] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)

  // Sync category with defaultCategory when modal opens
  useEffect(() => {
    if (open) {
      setCategory(defaultCategory || 'team_logo')
    }
  }, [open, defaultCategory])

  // Revoke object URLs on cleanup
  const cleanupItems = useCallback((list) => {
    list.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl)
      }
    })
  }, [])

  const handleClose = () => {
    if (busy) return
    cleanupItems(items)
    setItems([])
    setProgressText('')
    onClose()
  }

  const addFiles = useCallback((files) => {
    if (!files || files.length === 0) return

    const newItems = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) continue

      newItems.push({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${i}`,
        file,
        name: extractName(file.name),
        previewUrl: URL.createObjectURL(file),
        size: file.size,
      })
    }

    if (newItems.length > 0) {
      setItems((prev) => [...prev, ...newItems])
    }
  }, [])

  const handleFileChange = (e) => {
    const files = e.target.files
    addFiles(files)
    e.target.value = ''
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const files = e.dataTransfer.files
    addFiles(files)
  }

  const updateItemName = (id, newName) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, name: newName } : item)),
    )
  }

  const removeItem = (id) => {
    setItems((prev) => {
      const target = prev.find((item) => item.id === id)
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl)
      }
      return prev.filter((item) => item.id !== id)
    })
  }

  const clearAll = () => {
    cleanupItems(items)
    setItems([])
  }

  const handleUpload = async () => {
    if (items.length === 0 || busy) return
    setBusy(true)

    let totalUploaded = 0
    try {
      // Chunk items to avoid PHP post_max_size / timeout issues
      const chunks = []
      for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        chunks.push(items.slice(i, i + CHUNK_SIZE))
      }

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i]
        setProgressText(
          `${t('admin.presets.uploading')} (${totalUploaded + chunk.length}/${items.length})`,
        )

        const fd = new FormData()
        fd.append('category', category)
        chunk.forEach((item, index) => {
          fd.append(`images[${index}]`, item.file)
          fd.append(`names[${index}]`, item.name.trim() || extractName(item.file.name))
        })

        const res = await api.post('/admin/presets/bulk', fd)
        totalUploaded += res.data?.count || chunk.length
      }

      toast.success(t('admin.presets.bulkSuccess', { count: totalUploaded }))
      cleanupItems(items)
      setItems([])
      onSuccess?.()
      onClose()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
      setProgressText('')
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={t('admin.presets.bulkTitle')}
      subtitle={t('admin.presets.bulkDesc')}
      size="xl"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="text-xs font-semibold text-slate-500">
            {items.length > 0 && t('admin.presets.selectedCount', { count: items.length })}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" disabled={busy} onClick={handleClose}>
              {t('common.cancel', 'إلغاء')}
            </Button>
            <Button
              disabled={items.length === 0 || busy}
              loading={busy}
              onClick={handleUpload}
            >
              <UploadCloud className="size-4" />
              {busy
                ? progressText || t('admin.presets.uploading')
                : t('admin.presets.uploadAll', { count: items.length })}
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {/* Category selector */}
        <div>
          <label className="mb-1.5 block text-xs font-bold text-slate-700">
            {t('admin.presets.category')}
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                disabled={busy}
                className={cn(
                  'rounded-xl px-4 py-2 text-xs font-bold transition-all',
                  category === cat
                    ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80',
                )}
              >
                {t(`admin.presets.categories.${cat}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Drag and Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !busy && fileInputRef.current?.click()}
          className={cn(
            'group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition-all',
            isDragging
              ? 'border-emerald-500 bg-emerald-50/60 ring-4 ring-emerald-100'
              : 'border-slate-200 bg-slate-50/70 hover:border-slate-300 hover:bg-slate-100/50',
            busy && 'pointer-events-none opacity-50',
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/jpg,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
          <div className="mb-2 grid size-12 place-items-center rounded-full bg-emerald-100/80 text-emerald-600 transition-transform group-hover:scale-105">
            <FolderUp className="size-6" />
          </div>
          <p className="text-sm font-bold text-slate-800">
            {t('admin.presets.dropzone')}
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {t('admin.presets.dropzoneHint')}
          </p>
        </div>

        {/* Selected Items List */}
        {items.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">
                {t('admin.presets.selectedCount', { count: items.length })}
              </span>
              <button
                type="button"
                onClick={clearAll}
                disabled={busy}
                className="font-semibold text-rose-500 hover:text-rose-600 hover:underline"
              >
                {t('admin.presets.clearAll')}
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              {t('admin.presets.editNameHint')}
            </p>

            <div className="max-h-72 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/40 p-2 space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 rounded-lg border border-slate-200/80 bg-white p-2.5 shadow-sm transition hover:border-slate-300"
                >
                  <img
                    src={item.previewUrl}
                    alt={item.name}
                    className="size-11 shrink-0 rounded-lg bg-slate-100 object-contain ring-1 ring-slate-200"
                  />
                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={item.name}
                      disabled={busy}
                      onChange={(e) => updateItemName(item.id, e.target.value)}
                      placeholder={item.file.name}
                      className="w-full rounded-md border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200"
                    />
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="truncate max-w-[200px]" title={item.file.name}>
                        {item.file.name}
                      </span>
                      <span>•</span>
                      <span>{formatBytes(item.size)}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    disabled={busy}
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition"
                    title={t('common.delete', 'حذف')}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
