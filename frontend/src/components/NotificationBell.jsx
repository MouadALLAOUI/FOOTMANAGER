import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, CheckCheck, Pin, PinOff, Star, Loader2 } from 'lucide-react';
import api from '../services/api';

export default function NotificationBell() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState('unread');
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const fetchNotifications = async (f = filter) => {
    setLoading(true);
    try {
      const res = await api.get('/notifications', { params: { filter: f === 'all' ? undefined : f } });
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unread_count || 0);
    } catch { setNotifications([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, filter]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMarkRead = async (id) => {
    try { await api.put(`/notifications/${id}/read`); fetchNotifications(); } catch {}
  };

  const handleMarkAllRead = async () => {
    try { await api.put('/notifications/read-all'); fetchNotifications(); } catch {}
  };

  const handleTogglePin = async (id) => {
    try { await api.put(`/notifications/${id}/pin`); fetchNotifications(); } catch {}
  };

  const handleToggleImportant = async (id) => {
    try { await api.put(`/notifications/${id}/important`); fetchNotifications(); } catch {}
  };

  const FILTERS = [
    { id: 'unread', label: t('notifications.unread') },
    { id: 'all', label: t('notifications.all') },
    { id: 'important', label: t('notifications.important') },
    { id: 'pinned', label: t('notifications.pinned') },
  ];

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="relative p-2 hover:bg-gray-100 rounded-lg transition">
        <Bell size={20} className="text-gray-500" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -end-0.5 w-4.5 h-4.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 max-h-[70vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h3 className="text-sm font-black text-gray-800">{t('notifications.title')}</h3>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} className="text-[10px] text-blue-600 hover:text-blue-800 font-bold flex items-center gap-1">
                <CheckCheck size={12} /> {t('notifications.markAllRead')}
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-1 px-3 py-2 border-b border-gray-100 overflow-x-auto">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`text-[10px] px-2.5 py-1 rounded-full font-bold transition shrink-0 ${
                  filter === f.id ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* List */}
          <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
            {loading ? (
              <div className="flex items-center justify-center py-10"><Loader2 size={20} className="animate-spin text-gray-300" /></div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10 text-gray-300 text-sm">{t('notifications.empty')}</div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className={`px-4 py-3 transition ${n.is_read ? 'opacity-60' : 'bg-blue-50/30'}`}>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {n.is_important && <Star size={10} className="text-yellow-500 fill-yellow-500 shrink-0" />}
                        {n.is_pinned && <Pin size={10} className="text-blue-500 shrink-0" />}
                        <p className="text-xs font-bold text-gray-800 truncate">{n.title}</p>
                      </div>
                      {n.body && <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>}
                      <p className="text-[9px] text-gray-300 mt-1">{new Date(n.created_at).toLocaleString('ar-MA', { hour12: false })}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {!n.is_read && (
                        <button onClick={() => handleMarkRead(n.id)} className="p-1 hover:bg-gray-100 rounded transition" title={t('notifications.markRead')}>
                          <CheckCheck size={12} className="text-blue-500" />
                        </button>
                      )}
                      <button onClick={() => handleTogglePin(n.id)} className="p-1 hover:bg-gray-100 rounded transition" title={n.is_pinned ? t('notifications.unpin') : t('notifications.pin')}>
                        {n.is_pinned ? <PinOff size={12} className="text-gray-400" /> : <Pin size={12} className="text-gray-300" />}
                      </button>
                      <button onClick={() => handleToggleImportant(n.id)} className="p-1 hover:bg-gray-100 rounded transition" title={n.is_important ? t('notifications.unmarkImportant') : t('notifications.markImportant')}>
                        <Star size={12} className={n.is_important ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'} />
                      </button>
                    </div>
                  </div>
                  {n.action_url && (
                    <a href={n.action_url} className="text-[9px] text-blue-600 font-bold mt-1 inline-block hover:underline" onClick={() => setOpen(false)}>
                      {t('notifications.viewDetails')}
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
