import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, Inbox } from 'lucide-react'
import api from '../../api/client'
import { queryClient } from '../../api/queryClient'
import { SectionTitle, Button, Empty, Skeleton } from '../dashboard/ui'
import { useToast } from '../ui/Toast'
import NotificationItem from './NotificationItem'

const FILTERS = ['', 'unread', 'read', 'important', 'pinned']

export default function NotificationList({ containerClassName = 'mx-auto max-w-3xl' }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [filter, setFilter] = useState('')
  const [category, setCategory] = useState('')
  const [notifs, setNotifs] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [busyId, setBusyId] = useState(null)

  const load = (p = 1, replace = false) => {
    setLoading(true)
    api
      .get('/notifications', { params: { filter, category, page: p } })
      .then((r) => {
        setNotifs((prev) => (replace ? r.data.notifications : [...prev, ...r.data.notifications]))
        setHasMore(r.data.has_more)
        setPage(p)
        if (r.data.categories?.length) setCategories(r.data.categories)
      })
      .catch(() => toast.error(t('notifications.loadFailed')))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, category])

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['notifications'] })
  }

  const run = async (fn, msg, id) => {
    setBusyId(id)
    try {
      await fn()
      toast.success(msg)
      refresh()
      load(page, true)
    } catch (e) {
      toast.error(e.response?.data?.message || t('notifications.failed'))
    } finally {
      setBusyId(null)
    }
  }

  const markAllRead = () =>
    run(() => api.put('/notifications/read-all'), t('notifications.markedAllRead'))

  const markRead = (n) => {
    api.put(`/notifications/${n.id}/read`).then(() => {
      setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
      refresh()
    })
  }

  return (
    <div className={containerClassName}>
      <SectionTitle
        title={t('notifications.title')}
        subtitle={t('notifications.subtitle')}
        action={
          <Button variant="outline" size="sm" onClick={markAllRead}>
            <CheckCircle2 className="size-3.5" />
            {t('notifications.markAllRead')}
          </Button>
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${
              filter === f
                ? 'bg-slate-900 text-white shadow'
                : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300'
            }`}
          >
            {t(`notifications.filters.${f || 'all'}`)}
          </button>
        ))}
      </div>

      {categories.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setCategory('')}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all ${
              category === ''
                ? 'bg-green-500 text-white shadow'
                : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300'
            }`}
          >
            {t('notifications.filters.all')}
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[11px] font-bold transition-all ${
                category === c
                  ? 'bg-green-500 text-white shadow'
                  : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              {t(`notifications.categories.${c}`)}
            </button>
          ))}
        </div>
      )}

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 rounded-3xl" />
            ))}
          </div>
        ) : notifs.length === 0 ? (
          <Empty
            icon={Inbox}
            title={t('notifications.empty')}
            description={t('notifications.emptyDesc')}
            action={
              (filter || category) && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setFilter('')
                    setCategory('')
                  }}
                >
                  {t('notifications.clearFilters')}
                </Button>
              )
            }
          />
        ) : (
          notifs.map((n) => (
            <NotificationItem
              key={n.id}
              notification={n}
              busy={busyId === n.id}
              onMarkRead={markRead}
              onTogglePin={(item) =>
                run(
                  () => api.put(`/notifications/${item.id}/pin`),
                  item.is_pinned ? t('notifications.unpin') : t('notifications.pin'),
                  item.id,
                )
              }
              onToggleImportant={(item) =>
                run(
                  () => api.put(`/notifications/${item.id}/important`),
                  item.is_important ? t('notifications.unmarkImportant') : t('notifications.markImportant'),
                  item.id,
                )
              }
              onDelete={(item) =>
                run(() => api.delete(`/notifications/${item.id}`), t('notifications.deleted'), item.id)
              }
            />
          ))
        )}
      </div>

      {hasMore && !loading && (
        <div className="mt-6 text-center">
          <Button variant="outline" size="sm" onClick={() => load(page + 1)}>
            {t('notifications.loadMore')}
          </Button>
        </div>
      )}
    </div>
  )
}
