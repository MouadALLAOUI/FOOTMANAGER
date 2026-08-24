import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Images, Pencil, Plus, Trash2 } from 'lucide-react'
import api from '../../../../api/client'
import { useApi } from '../../../../hooks/useApi'
import { Button, Empty, Field, Modal, Skeleton, inputClass } from '../../../../components/dashboard/ui'
import { useToast } from '../../../../components/ui/Toast'
import { toastApiError } from '../../../../lib/errors'
import { ContentFilePicker } from './common'

export default function CommitteeGallery({ tournament, refresh }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [caption, setCaption] = useState('')
  const [orderIndex, setOrderIndex] = useState(0)
  const [file, setFile] = useState(null)

  const { data: gallery, loading, refetch } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/gallery`).then((r) => r.data.data),
    [tournament.id, refresh],
    { staleTime: 0 },
  )

  const images = (gallery || []).slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))

  const openCreate = () => {
    setEditing(null)
    setCaption('')
    setOrderIndex((images.at(-1)?.order_index ?? 0) + 1)
    setFile(null)
    setOpen(true)
  }

  const openEdit = (img) => {
    setEditing(img)
    setCaption(img.caption || '')
    setOrderIndex(img.order_index ?? 0)
    setFile(null)
    setOpen(true)
  }

  const save = async () => {
    if (!editing && !file) {
      toast.error(t('committee.content.gallery.requiredImage'))
      return
    }
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('caption', caption)
      fd.append('order_index', String(orderIndex))
      if (file) fd.append('image', file)
      if (editing) {
        await api.put(`/committee/tournaments/${tournament.id}/gallery/${editing.id}`, fd)
        toast.success(t('committee.content.gallery.updated'))
      } else {
        await api.post(`/committee/tournaments/${tournament.id}/gallery`, fd)
        toast.success(t('committee.content.gallery.created'))
      }
      setOpen(false)
      refetch()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (img) => {
    if (!window.confirm(t('committee.content.confirmDelete'))) return
    try {
      await api.delete(`/committee/tournaments/${tournament.id}/gallery/${img.id}`)
      toast.success(t('committee.content.deleted'))
      refetch()
    } catch (e) {
      toastApiError(e, t)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-green-50 text-green-600">
            <Images className="size-5" />
          </span>
          <div>
            <h3 className="text-sm font-black text-slate-900">{t('committee.content.gallery.title')}</h3>
            <p className="text-[11px] font-semibold text-slate-400">
              {t('committee.content.gallery.desc')} ({images.length} / {t('committee.content.gallery.limit')})
            </p>
          </div>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          {t('committee.content.gallery.add')}
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-32" />
      ) : images.length === 0 ? (
        <Empty icon={Images} title={t('committee.content.gallery.empty')} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <div key={img.id} className="group relative overflow-hidden rounded-2xl bg-slate-100">
              <img src={img.thumbnail_url || img.image_url} alt={img.caption || ''} className="aspect-square w-full object-cover" loading="lazy" />
              <div className="absolute inset-0 flex flex-col justify-between bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent p-2.5 opacity-0 transition-opacity group-hover:opacity-100">
                <span className="w-fit rounded-full bg-white/90 px-2 py-0.5 text-[9px] font-black text-slate-700">
                  #{img.order_index ?? 0}
                </span>
                <div className="flex items-center justify-end gap-1.5">
                  <Button variant="outline" size="sm" className="!bg-white/90" onClick={() => openEdit(img)}>
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button variant="danger" size="sm" onClick={() => remove(img)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title={t(editing ? 'committee.content.gallery.edit' : 'committee.content.gallery.add')}>
        <div className="space-y-4">
          <ContentFilePicker
            file={file}
            setFile={setFile}
            currentUrl={editing?.image_url}
            label={t('committee.content.gallery.fieldImage')}
            hint={t('committee.content.gallery.imageHint')}
          />
          <Field label={t('committee.content.gallery.fieldCaption')}>
            <input className={inputClass} value={caption} onChange={(e) => setCaption(e.target.value)} />
          </Field>
          <Field label={t('committee.content.gallery.fieldOrder')}>
            <input type="number" min="0" className={inputClass} value={orderIndex} onChange={(e) => setOrderIndex(Number(e.target.value))} />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button loading={busy} onClick={save}>
              {editing ? t('common.save') : t('committee.content.gallery.add')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
