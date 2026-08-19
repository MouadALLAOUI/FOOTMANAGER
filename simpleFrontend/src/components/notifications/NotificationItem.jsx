import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Flag, Pin, PinOff, Trash2 } from 'lucide-react'
import { colorFor, iconFor } from './constants'
import { actionTarget, timeAgo } from './utils'

export default function NotificationItem({ notification, busy, onMarkRead, onTogglePin, onToggleImportant, onDelete }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const n = notification
  const Icon = iconFor(n.type, n.category)
  const color = colorFor(n.type, n.category)
  const target = actionTarget(n.action_url)

  const handleOpen = () => {
    if (!n.is_read) onMarkRead(n)
    if (target) navigate(target)
  }

  return (
    <div
      className={`group rounded-3xl border bg-white p-4 text-start shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all ${
        n.is_read ? 'border-slate-200/70' : 'border-green-200 bg-green-50/30'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <button
          type="button"
          onClick={handleOpen}
          className="flex min-w-0 flex-1 items-start gap-3.5 text-start"
        >
          <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${color}`}>
            <Icon className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="truncate text-sm font-extrabold text-slate-900">{n.title}</span>
              {!n.is_read && <span className="size-2 shrink-0 rounded-full bg-green-500" />}
            </span>
            {n.body && <span className="mt-1 block text-xs leading-relaxed text-slate-500">{n.body}</span>}
            <span className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold text-slate-400">{timeAgo(n.created_at, t, i18n.language)}</span>
              {n.is_important && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-600 ring-1 ring-amber-200">
                  {t('notifications.importantBadge')}
                </span>
              )}
              {n.is_pinned && (
                <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-bold text-violet-600 ring-1 ring-violet-200">
                  {t('notifications.pinnedBadge')}
                </span>
              )}
            </span>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-1 opacity-100 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100">
          <button
            type="button"
            disabled={busy}
            onClick={() => onTogglePin(n)}
            title={n.is_pinned ? t('notifications.unpin') : t('notifications.pin')}
            aria-label={n.is_pinned ? t('notifications.unpin') : t('notifications.pin')}
            className={`grid size-8 place-items-center rounded-xl border transition-colors ${
              n.is_pinned
                ? 'border-violet-200 bg-violet-50 text-violet-600'
                : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
            }`}
          >
            {n.is_pinned ? <Pin className="size-3.5" /> : <PinOff className="size-3.5" />}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onToggleImportant(n)}
            title={t('notifications.markImportant')}
            aria-label={t('notifications.markImportant')}
            className={`grid size-8 place-items-center rounded-xl border transition-colors ${
              n.is_important
                ? 'border-amber-200 bg-amber-50 text-amber-600'
                : 'border-slate-200 bg-white text-slate-400 hover:bg-slate-50'
            }`}
          >
            <Flag className="size-3.5" />
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onDelete(n)}
            title={t('notifications.delete')}
            aria-label={t('notifications.delete')}
            className="grid size-8 place-items-center rounded-xl border border-slate-200 bg-white text-rose-500 transition-colors hover:bg-rose-50"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
