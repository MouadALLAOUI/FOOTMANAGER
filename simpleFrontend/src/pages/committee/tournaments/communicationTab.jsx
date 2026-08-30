import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Inbox, MessageSquareText, Save, Trash2 } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Badge, Button, Card, Empty, Field, Skeleton, inputClass } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import { relativeTime } from '../../../lib/adapters'

const filters = [
  { key: 'all', value: null },
  { key: 'new', value: 'new' },
  { key: 'read', value: 'read' },
  { key: 'replied', value: 'replied' },
  { key: 'closed', value: 'closed' },
]

const statusBadge = {
  new: 'warning',
  read: 'info',
  replied: 'success',
  closed: 'neutral',
}

const emptyContact = {
  contact_phone: '',
  contact_email: '',
  whatsapp_number: '',
  facebook_url: '',
  instagram_url: '',
  tiktok_url: '',
  youtube_url: '',
}

export default function CommunicationTab({ tournament, refresh }) {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const editable = tournament.settings_editable ?? ['draft', 'open_for_registration', 'registration_closed'].includes(tournament.status)
  const [statusFilter, setStatusFilter] = useState('all')
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState(emptyContact)

  const { data: contact, loading: contactLoading, refetch: refetchContact } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/contact`).then((r) => r.data.data),
    [tournament.id, refresh],
    { staleTime: 0 },
  )

  const { data: messages, loading: messagesLoading, refetch: refetchMessages } = useApi(
    () =>
      api
        .get(`/committee/tournaments/${tournament.id}/messages`, {
          params: statusFilter === 'all' ? {} : { status: statusFilter },
        })
        .then((r) => r.data.data),
    [tournament.id, refresh, statusFilter],
    { staleTime: 0 },
  )

  useEffect(() => {
    if (!contact) return
    setForm(() => {
      const next = { ...emptyContact }
      for (const key of Object.keys(emptyContact)) next[key] = contact[key] ?? ''
      return next
    })
  }, [contact])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const saveContact = async () => {
    setBusy(true)
    try {
      const payload = { ...form }
      for (const key of Object.keys(payload)) if (payload[key] === '') payload[key] = null
      await api.put(`/committee/tournaments/${tournament.id}/contact`, payload)
      toast.success(t('committee.communication.contactSaved'))
      refetchContact()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  const setStatus = async (msg, status) => {
    try {
      await api.put(`/committee/tournaments/${tournament.id}/messages/${msg.id}`, { status })
      toast.success(t('committee.communication.statusUpdated'))
      refetchMessages()
    } catch (e) {
      toastApiError(e, t)
    }
  }

  const removeMessage = async (msg) => {
    if (!window.confirm(t('committee.communication.deleteConfirm'))) return
    try {
      await api.delete(`/committee/tournaments/${tournament.id}/messages/${msg.id}`)
      toast.success(t('committee.communication.deleted'))
      refetchMessages()
    } catch (e) {
      toastApiError(e, t)
    }
  }

  const list = messages || []

  return (
    <div className="space-y-5">
      <Card title={t('committee.communication.contactTitle')} subtitle={t('committee.communication.contactDesc')}>
        {!editable && (
          <div className="mb-4 rounded-xl bg-amber-50 px-4 py-2.5 text-xs font-bold text-amber-700">
            {t('committee.detail.settingsLocked')}
          </div>
        )}
        <div className="grid gap-4 lg:grid-cols-2">
          <Field label={t('committee.communication.phone')} hint={t('committee.communication.phoneHint')}>
            <input dir="ltr" className={inputClass} value={form.contact_phone} onChange={set('contact_phone')} disabled={!editable} maxLength={30} />
          </Field>
          <Field label={t('committee.communication.email')}>
            <input dir="ltr" type="email" className={inputClass} value={form.contact_email} onChange={set('contact_email')} disabled={!editable} maxLength={255} />
          </Field>
          <Field label={t('committee.communication.whatsapp')} hint={t('committee.communication.whatsappHint')}>
            <input dir="ltr" className={inputClass} value={form.whatsapp_number} onChange={set('whatsapp_number')} disabled={!editable} maxLength={30} />
          </Field>
          <Field label={t('committee.communication.facebook')}>
            <input dir="ltr" className={inputClass} value={form.facebook_url} onChange={set('facebook_url')} disabled={!editable} placeholder="https://facebook.com/..." maxLength={255} />
          </Field>
          <Field label={t('committee.communication.instagram')}>
            <input dir="ltr" className={inputClass} value={form.instagram_url} onChange={set('instagram_url')} disabled={!editable} placeholder="https://instagram.com/..." maxLength={255} />
          </Field>
          <Field label={t('committee.communication.tiktok')}>
            <input dir="ltr" className={inputClass} value={form.tiktok_url} onChange={set('tiktok_url')} disabled={!editable} placeholder="https://tiktok.com/..." maxLength={255} />
          </Field>
          <Field label={t('committee.communication.youtube')}>
            <input dir="ltr" className={inputClass} value={form.youtube_url} onChange={set('youtube_url')} disabled={!editable} placeholder="https://youtube.com/..." maxLength={255} />
          </Field>
        </div>
        <div className="mt-4 flex justify-end">
          <Button loading={busy} disabled={!editable} onClick={saveContact}>
            <Save className="size-4" />
            {t('common.save')}
          </Button>
        </div>
      </Card>

      <Card title={t('committee.communication.messagesTitle')} subtitle={t('committee.communication.messagesDesc')}>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {filters.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setStatusFilter(f.key)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-black transition ${
                statusFilter === f.key ? 'bg-slate-900 text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-800'
              }`}
            >
              {t(`committee.communication.filters.${f.key}`)}
            </button>
          ))}
        </div>

        {contactLoading || messagesLoading ? (
          <Skeleton className="h-40" />
        ) : list.length === 0 ? (
          <Empty icon={Inbox} title={t('committee.communication.empty')} description={t('committee.communication.emptyDesc')} />
        ) : (
          <div className="space-y-3">
            {list.map((msg) => (
              <div key={msg.id} className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600">
                    <MessageSquareText className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold text-slate-900">{msg.subject}</p>
                    <p className="truncate text-[10px] font-semibold text-slate-400">
                      {msg.name} · <span dir="ltr">{msg.email}</span>
                      {msg.phone ? ` · ${msg.phone}` : ''} · {relativeTime(msg.created_at, i18n.language)}
                    </p>
                  </div>
                  <Badge variant={statusBadge[msg.status] || 'neutral'}>{t(`committee.communication.status.${msg.status}`)}</Badge>
                </div>
                <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-[13px] font-semibold leading-relaxed text-slate-700">{msg.message}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {msg.status !== 'read' && (
                    <Button variant="outline" size="sm" onClick={() => setStatus(msg, 'read')}>
                      {t('committee.communication.markRead')}
                    </Button>
                  )}
                  {msg.status !== 'replied' && (
                    <Button variant="outline" size="sm" onClick={() => setStatus(msg, 'replied')}>
                      {t('committee.communication.markReplied')}
                    </Button>
                  )}
                  {msg.status !== 'closed' && (
                    <Button variant="outline" size="sm" onClick={() => setStatus(msg, 'closed')}>
                      {t('committee.communication.close')}
                    </Button>
                  )}
                  <Button variant="danger" size="sm" onClick={() => removeMessage(msg)}>
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
