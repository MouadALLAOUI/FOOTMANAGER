import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Trash2, Users } from 'lucide-react'
import api from '../../../../api/client'
import { useApi } from '../../../../hooks/useApi'
import { Button, Empty, Field, Modal, Skeleton, inputClass } from '../../../../components/dashboard/ui'
import { useToast } from '../../../../components/ui/Toast'
import { toastApiError } from '../../../../lib/errors'
import { logoThumb } from '../../../../lib/thumb'
import { ContentFilePicker } from './common'

export default function CommitteePartners({ tournament, refresh }) {
  const { t } = useTranslation()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ name: '', link: '', order_index: 0 })
  const [file, setFile] = useState(null)

  const { data: partners, loading, refetch } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/partners`).then((r) => r.data.data),
    [tournament.id, refresh],
    { staleTime: 0 },
  )

  const list = (partners || []).slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'order_index' ? Number(e.target.value) : e.target.value }))

  const openCreate = () => {
    setEditing(null)
    setForm({ name: '', link: '', order_index: (list.at(-1)?.order_index ?? 0) + 1 })
    setFile(null)
    setOpen(true)
  }

  const openEdit = (item) => {
    setEditing(item)
    setForm({ name: item.name, link: item.link || '', order_index: item.order_index ?? 0 })
    setFile(null)
    setOpen(true)
  }

  const save = async () => {
    if (!form.name.trim()) {
      toast.error(t('committee.content.partners.required'))
      return
    }
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append('name', form.name)
      fd.append('link', form.link)
      fd.append('order_index', String(form.order_index))
      if (file) fd.append('logo', file)
      if (editing) {
        await api.put(`/committee/tournaments/${tournament.id}/partners/${editing.id}`, fd)
        toast.success(t('committee.content.partners.updated'))
      } else {
        await api.post(`/committee/tournaments/${tournament.id}/partners`, fd)
        toast.success(t('committee.content.partners.created'))
      }
      setOpen(false)
      refetch()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  const remove = async (item) => {
    if (!window.confirm(t('committee.content.confirmDelete'))) return
    try {
      await api.delete(`/committee/tournaments/${tournament.id}/partners/${item.id}`)
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
            <Users className="size-5" />
          </span>
          <div>
            <h3 className="text-sm font-black text-slate-900">{t('committee.content.partners.title')}</h3>
            <p className="text-[11px] font-semibold text-slate-400">{t('committee.content.partners.desc')}</p>
          </div>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="size-4" />
          {t('committee.content.partners.add')}
        </Button>
      </div>

      {loading ? (
        <Skeleton className="h-32" />
      ) : list.length === 0 ? (
        <Empty icon={Users} title={t('committee.content.partners.empty')} />
      ) : (
        <div className="space-y-3">
          {list.map((item) => (
            <div key={item.id} className="flex items-center gap-4 rounded-2xl border border-slate-200/70 bg-white p-3">
              <div className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 p-1.5">
                {item.logo_url ? (
                  <img src={logoThumb(item)} alt={item.name} className="max-h-full w-auto object-contain" />
                ) : (
                  <Users className="size-5 text-slate-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-extrabold text-slate-900">{item.name}</p>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-500">#{item.order_index ?? 0}</span>
                </div>
                {item.link && <p className="mt-0.5 truncate text-[10px] font-semibold text-sky-600">{item.link}</p>}
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

      <Modal open={open} onClose={() => setOpen(false)} title={t(editing ? 'committee.content.partners.edit' : 'committee.content.partners.add')}>
        <div className="space-y-4">
          <Field label={t('committee.content.partners.fieldName')} required>
            <input className={inputClass} value={form.name} onChange={set('name')} />
          </Field>
          <ContentFilePicker
            file={file}
            setFile={setFile}
            currentUrl={editing?.logo_url}
            label={t('committee.content.partners.fieldLogo')}
            hint={t('committee.content.partners.logoHint')}
          />
          <Field label={t('committee.content.partners.fieldLink')}>
            <input className={inputClass} value={form.link} onChange={set('link')} placeholder="https://" />
          </Field>
          <Field label={t('committee.content.partners.fieldOrder')}>
            <input type="number" min="0" className={inputClass} value={form.order_index} onChange={set('order_index')} />
          </Field>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button loading={busy} onClick={save}>
              {editing ? t('common.save') : t('committee.content.partners.add')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
