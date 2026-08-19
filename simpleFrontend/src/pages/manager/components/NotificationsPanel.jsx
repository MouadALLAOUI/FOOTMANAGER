import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, CheckCheck, Inbox, X } from 'lucide-react'
import api from '../../../api/client'
import { Button } from '../../../components/dashboard/ui'
import { useCommandCenter } from './CommandCenterContext'
import { timeAgo } from './shared'

const typeIcons = {
  score_submitted: 'text-amber-600 bg-amber-50',
  score_confirmed: 'text-emerald-600 bg-emerald-50',
  match_accepted: 'text-green-600 bg-green-50',
  challenge_received: 'text-sky-600 bg-sky-50',
  player_invite_received: 'text-violet-600 bg-violet-50',
  player_application_accepted: 'text-emerald-600 bg-emerald-50',
  cancellation_requested: 'text-orange-600 bg-orange-50',
  booking_confirmation: 'text-emerald-600 bg-emerald-50',
}

export default function NotificationsPanel() {
  const { t } = useTranslation()
  const { toast, reload, notifs, unread, notifOpen, setNotifOpen } = useCommandCenter()

  useEffect(() => {
    if (!notifOpen) return
    const onKey = (e) => e.key === 'Escape' && setNotifOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [notifOpen, setNotifOpen])

  if (!notifOpen) return null

  const markAllRead = async () => {
    try {
      await api.put('/notifications/read-all')
      toast.success(t('ov.common.markAllReadToast'))
      reload()
    } catch {
      toast.error(t('ov.common.operationFailed'))
    }
  }

  return (
    <div className="fixed inset-0 z-[95]">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" onClick={() => setNotifOpen(false)} />
      <div
        className="absolute inset-y-0 start-0 flex w-full max-w-sm flex-col bg-white shadow-2xl"
        style={{ transform: 'none' }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-2xl bg-green-50 text-green-600">
              <Bell className="size-5" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">{t('ov.notif.title')}</h3>
              <p className="text-[11px] font-semibold text-slate-400">
                {unread > 0 ? t('ov.notif.unread', { count: unread }) : t('ov.notif.allRead')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNotifOpen(false)}
            aria-label={t('common.close')}
            className="grid size-9 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {notifs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="grid size-14 place-items-center rounded-3xl bg-slate-50 text-slate-300">
                <Inbox className="size-6" strokeWidth={1.6} />
              </span>
              <p className="text-sm font-bold text-slate-700">{t('ov.notif.emptyTitle')}</p>
              <p className="text-xs text-slate-400">{t('ov.notif.emptyDesc')}</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {notifs.slice(0, 30).map((n) => {
                const color = typeIcons[n.type] || 'text-slate-500 bg-slate-100'
                return (
                  <div key={n.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-white p-3.5">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${color}`}>
                      <Bell className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-extrabold leading-snug text-slate-900">{n.title}</p>
                      {n.body && <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">{n.body}</p>}
                      <p className="mt-1 text-[10px] font-bold text-slate-400">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.is_read && <span className="mt-1 size-2 shrink-0 rounded-full bg-green-500" />}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {notifs.length > 0 && (
          <div className="border-t border-slate-100 px-5 py-3.5">
            <Button variant="soft" className="w-full" onClick={markAllRead}>
              <CheckCheck className="size-4" />
              {t('ov.common.markAllRead')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
