import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Newspaper, Pencil, Plus, Trash2 } from 'lucide-react'
import api from '../../../../api/client'
import { useApi } from '../../../../hooks/useApi'
import { Badge, Button, Empty, Field, Modal, Skeleton, inputClass, selectClass } from '../../../../components/dashboard/ui'
import { useToast } from '../../../../components/ui/Toast'
import { coverThumb } from '../../../../lib/thumb'
import { ContentFilePicker } from './common'

const MAX_COVER_KB = 5120

export default function CommitteeNews({ tournament, refresh }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', status: 'draft', published_at: '' })
  const [coverFile, setCoverFile] = useState(null)

  const { data: news, loading, refetch } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/news`).then((r) => r.data.data),
    [tournament.id, refresh],
    { staleTime: 0 },
  )

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const openCreate = () => {
    setEditing(null)
    setForm({ title: '', content: '', status: 'draft', published_at: '' })
    setCoverFile(null)
    setOpen(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({
      title: item.title,
      content: item.content,
      status: item.status || 'draft',
      published_at: (item.published_at || '').slice(0, 16),
    })
    setCoverFile(null)
    setOpen(true)
  }

  const payload = () => {
    const fd = new FormData()
    fd.append('title', form.title)
    fd.append('content', form.content)
    fd.append('status', form.status)
    if (coverFile) fd.append('cover', coverFile)
    if (form.published_at) fd.append('published_at', form.published_at)
    return fd
  }

  const errMessage = (e) => {
    const err = e.response?.data?.errors
    const first = err ? Object.values(err)[0]?.[0] : null
    return first || e.response?.data?.message || t('committee.detail.actionFailed')
  }

  const save = async () => {
    if (!form.title.trim()) {
      toast.error(t('committee.content.news.required'))
      return
    }
    if (coverFile && coverFile.size > MAX_COVER_KB * 1024) {
      toast.error(t('committee.content.news.coverTooLarge'))
      return
    }
    setBusy(true)
    try {
      if (editing) {
        await api.put(`/committee/tournaments/${tournament.id}/news/${editing.id}`, payload())
        toast.success(t('committee.content.news.updated'))
      } else {
        await api.post(`/committee/tournaments/${tournament.id}/news`, payload())
        toast.success(t('committee.content.news.created'))
      }
      setOpen(false)
      refetch()
    } catch (e) {
      toast.error(errMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const remove = async (item) => {
    if (!window.confirm(t('committee.content.confirmDelete'))) return
    try {
      await api.delete(`/committee/tournaments/${tournament.id}/news/${item.id}`)
      toast.success(t('committee.content.deleted'))
      refetch()
    } catch (e) {
      toast.error(errMessage(e))
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-green-50 text-green-600">
            <Newspaper className="size-5" />
          </span>
          <div>
            <h3 className="text-sm font-black text-slate-900">{t('committee.content.news.title')}</h3>
            <p className="text-[11px] font-semibold text-slate-400">{t('committee.content.news.desc')}</p>
          </div>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          {t('committee.content.news.add')}
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-32" />
      ) : (news || []).length === 0 ? (
        <Empty icon={Newspaper} title={t('committee.content.news.empty')} />
      ) : (
        <div className="space-y-3">
          {(news || []).map((item) => (
            <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-white p-3">
              <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100">
                {item.cover_url ? (
                  <img src={coverThumb(item, 'cover_url')} alt="" className="size-full object-cover" />
                ) : (
                  <Newspaper className="size-5 text-slate-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-extrabold text-slate-900">{item.title}</p>
                  <Badge variant={item.status === 'published' ? 'success' : 'warning'}>
                    {t(item.status === 'published' ? 'committee.content.statusPublished' : 'committee.content.statusDraft')}
                  </Badge>
                </div>
                <p className="mt-0.5 line-clamp-1 text-[11px] font-semibold text-slate-400">
                  {item.published_at || t('committee.content.news.notPublished')}
                </p>
              </div>
              <div className="flex shrink-0 gap-1.5">
                <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                  <Pencil className="size-3.5" />
                </Button>
                <Button variant="danger" size="sm" onClick={() => remove(item)}>
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t(editing ? 'committee.content.news.edit' : 'committee.content.news.add')}
      >
        <div className="space-y-4">
          <Field label={t('committee.content.news.fieldTitle')} required>
            <input className={inputClass} value={form.title} onChange={set('title')} />
          </Field>
          <ContentFilePicker
            file={coverFile}
            setFile={setCoverFile}
            currentUrl={editing?.cover_url}
            label={t('committee.content.news.fieldCover')}
            hint={t('committee.content.news.coverHint')}
          />
          <Field label={t('committee.content.news.fieldContent')} required>
            <textarea className={`${inputClass} h-32 resize-none !h-auto py-3`} value={form.content} onChange={set('content')} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('committee.content.news.fieldStatus')}>
              <select className={selectClass} value={form.status} onChange={set('status')}>
                <option value="draft">{t('committee.content.statusDraft')}</option>
                <option value="published">{t('committee.content.statusPublished')}</option>
              </select>
            </Field>
            <Field label={t('committee.content.news.fieldPublishedAt')}>
              <input type="datetime-local" className={inputClass} value={form.published_at} onChange={set('published_at')} />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button loading={busy} onClick={save}>
              {editing ? t('common.save') : t('committee.content.news.add')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
