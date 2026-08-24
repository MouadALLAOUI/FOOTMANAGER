import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Inbox, MessageSquareText, Trash2 } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Badge, Button, Card, EmptyState, PageHeader, Skeleton } from '../../../components/admin/ui'
import { useToast } from '../../../components/ui/Toast'
import { relativeTime } from '../../../lib/adapters'
import { toastApiError } from '../../../lib/errors'

const filters = [
  { key: 'all', value: null },
  { key: 'new', value: 'new' },
  { key: 'read', value: 'read' },
  { key: 'replied', value: 'replied' },
  { key: 'closed', value: 'closed' },
]

const statusTone = {
  new: 'amber',
  read: 'sky',
  replied: 'green',
  closed: 'slate',
}

export default function Messages() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const [statusFilter, setStatusFilter] = useState('all')

  const { data, loading, refetch } = useApi(
    () =>
      api
        .get('/admin/contact-messages', {
          params: statusFilter === 'all' ? {} : { status: statusFilter },
        })
        .then((r) => r.data.data),
    [statusFilter],
    { staleTime: 0 },
  )

  const list = data || []

  const setStatus = async (msg, status) => {
    try {
      await api.put(`/admin/contact-messages/${msg.id}/status`, { status })
      toast.success(t('admin.messages.statusUpdated'))
      refetch()
    } catch (e) {
      toastApiError(e, t)
    }
  }

  const removeMessage = async (msg) => {
    if (!window.confirm(t('admin.messages.deleteConfirm'))) return
    try {
      await api.delete(`/admin/contact-messages/${msg.id}`)
      toast.success(t('admin.messages.deleted'))
      refetch()
    } catch (e) {
      toastApiError(e, t)
    }
  }

  return (
    <div>
      <PageHeader title={t('admin.messages.title')} subtitle={t('admin.messages.subtitle')} />

      <Card className="overflow-visible">
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
              {t(`admin.messages.filters.${f.key}`)}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={t('admin.messages.empty')}
            description={t('admin.messages.emptyDesc')}
          />
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
                  <Badge tone={statusTone[msg.status] || 'slate'}>{t(`admin.messages.status.${msg.status}`)}</Badge>
                </div>
                <p className="mt-3 whitespace-pre-line rounded-xl bg-slate-50 p-3 text-[13px] font-semibold leading-relaxed text-slate-700">
                  {msg.message}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {msg.status !== 'read' && (
                    <Button variant="outline" size="sm" onClick={() => setStatus(msg, 'read')}>
                      {t('admin.messages.markRead')}
                    </Button>
                  )}
                  {msg.status !== 'replied' && (
                    <Button variant="outline" size="sm" onClick={() => setStatus(msg, 'replied')}>
                      {t('admin.messages.markReplied')}
                    </Button>
                  )}
                  {msg.status !== 'closed' && (
                    <Button variant="outline" size="sm" onClick={() => setStatus(msg, 'closed')}>
                      {t('admin.messages.close')}
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
