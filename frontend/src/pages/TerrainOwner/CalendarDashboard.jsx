import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarDays, ChevronLeft, ChevronRight, Loader2, Check, X, Clock,
  MapPin, Banknote, MessageCircle, AlertCircle,
  Zap, Settings, Repeat, Plus, Power, PowerOff, CloudRain, Wrench,
  CalendarClock, Save, Lock, Unlock,
} from 'lucide-react';
import api from '../../services/api';
import WhatsAppNoticeModal from '../../components/Booking/WhatsAppNoticeModal';
import AccordionSection from '../../components/UI/AccordionSection';
import WeeklyGrid from '../../components/Calendar/WeeklyGrid';

const TYPE_EMOJI = { minifoot: '⚽', salle: '🏟️', grass: '🌿', synthetic: '🟩' };

const toDateStr = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const addDays = (dateStr, days) => {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + days);
  return toDateStr(d);
};

const weekStartFromCenter = (center) => addDays(center, -3);

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export default function CalendarDashboard() {
  const { t } = useTranslation();

  const CLOSURE_REASONS = [
    { value: t('calendar.maintenance'), icon: Wrench, emoji: '🔧' },
    { value: t('calendar.rain'), icon: CloudRain, emoji: '🌧️' },
    { value: t('calendar.privateEvent'), icon: CalendarClock, emoji: '📅' },
  ];

  const [terrains, setTerrains] = useState([]);
  const [selectedTerrainId, setSelectedTerrainId] = useState(null);
  const [centerDate, setCenterDate] = useState(() => toDateStr(new Date()));
  const [calendarData, setCalendarData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [whatsappModal, setWhatsappModal] = useState(null);

  // Terrain open/close
  const [toggleLoading, setToggleLoading] = useState(false);
  const [showCloseModal, setShowCloseModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');

  // Working hours
  const [schedule, setSchedule] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [scheduleMessage, setScheduleMessage] = useState('');

  // Cancellation requests
  const [cancelRequests, setCancelRequests] = useState([]);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelActionLoading, setCancelActionLoading] = useState(null);

  // Slot closure
  const [slotClosureModal, setSlotClosureModal] = useState(null);
  const [closeReason, setCloseReason] = useState('');
  const [closureLoading, setClosureLoading] = useState(false);

  // Quick booking
  const [quickBooking, setQuickBooking] = useState({ dayOfWeek: 1, startTime: '18:00', endTime: '19:00', type: 'training', notes: '' });
  const [quickSubmitting, setQuickSubmitting] = useState(false);
  const [quickError, setQuickError] = useState('');

  const selectedTerrain = terrains.find((tr) => tr.id === selectedTerrainId);

  const fetchCancelRequests = async () => {
    try {
      const res = await api.get('/owner/cancellation-requests');
      setCancelRequests(res.data.cancellation_requests || []);
    } catch { setCancelRequests([]); }
  };

  const handleCancelRequest = async (id, action) => {
    setCancelActionLoading(id);
    try {
      await api.put(`/owner/cancellation-requests/${id}`, { action });
      fetchCancelRequests();
      if (selectedTerrainId) fetchCalendar(false);
    } catch {}
    finally { setCancelActionLoading(null); }
  };

  useEffect(() => { fetchTerrains(); }, []);
  useEffect(() => { if (selectedTerrainId) { fetchCalendar(); fetchSchedule(); fetchCancelRequests(); } }, [selectedTerrainId, centerDate]);

  const fetchTerrains = async () => {
    try {
      const res = await api.get('/owner/terrains');
      const list = res.data.terrains || [];
      setTerrains(list);
      if (list.length > 0) setSelectedTerrainId(list[0].id);
    } catch {} finally { setLoading(false); }
  };

  const fetchCalendar = async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    try {
      const res = await api.get(`/owner/terrains/${selectedTerrainId}/calendar`, {
        params: { week_start: weekStartFromCenter(centerDate) },
      });
      setCalendarData(res.data);
    } catch {} finally { if (showSpinner) setLoading(false); }
  };

  const fetchSchedule = async () => {
    setScheduleLoading(true);
    try {
      const res = await api.get(`/owner/terrains/${selectedTerrainId}`);
      const terrain = res.data.terrain;
      const schedules = terrain.schedules || [];
      const merged = [0, 1, 2, 3, 4, 5, 6].map((d) => {
        const existing = schedules.find((s) => s.day_of_week === d);
        return {
          day_of_week: d,
          open_time: existing?.open_time || '09:00',
          close_time: existing?.close_time || '23:00',
          is_active: existing?.is_active ?? (d !== 5),
        };
      });
      setSchedule(merged);
    } catch {} finally { setScheduleLoading(false); }
  };

  const handleToggleStatus = async () => {
    if (selectedTerrain?.is_open) {
      setShowCloseModal(true);
      return;
    }
    setToggleLoading(true);
    try {
      await api.put(`/owner/terrains/${selectedTerrainId}/toggle-status`, {
        is_open: true,
      });
      setTerrains((prev) => prev.map((tr) => tr.id === selectedTerrainId ? { ...tr, is_open: true, closure_reason: null } : tr));
      if (calendarData) {
        setCalendarData({ ...calendarData, terrain: { ...calendarData.terrain, is_open: true, closure_reason: null } });
      }
    } catch {} finally { setToggleLoading(false); }
  };

  const handleConfirmClose = async () => {
    setToggleLoading(true);
    try {
      await api.put(`/owner/terrains/${selectedTerrainId}/toggle-status`, {
        is_open: false,
        closure_reason: selectedReason || null,
      });
      setTerrains((prev) => prev.map((tr) => tr.id === selectedTerrainId ? { ...tr, is_open: false, closure_reason: selectedReason || null } : tr));
      if (calendarData) {
        setCalendarData({ ...calendarData, terrain: { ...calendarData.terrain, is_open: false, closure_reason: selectedReason || null } });
      }
      setShowCloseModal(false);
      setSelectedReason('');
    } catch {} finally { setToggleLoading(false); }
  };

  const handleSaveSchedule = async () => {
    setScheduleSaving(true);
    setScheduleMessage('');
    try {
      await api.put(`/owner/terrains/${selectedTerrainId}/working-hours`, { schedule });
      setScheduleMessage(t('calendar.scheduleSaved'));
      setTimeout(() => setScheduleMessage(''), 3000);
      fetchCalendar(false);
    } catch (err) {
      setScheduleMessage(err.response?.data?.message || t('calendar.scheduleError'));
    } finally { setScheduleSaving(false); }
  };

  const updateScheduleDay = (dayOfWeek, field, value) => {
    setSchedule((prev) => prev.map((d) => d.day_of_week === dayOfWeek ? { ...d, [field]: value } : d));
  };

  const handleManageBooking = async (bookingId, action) => {
    setActionLoading(bookingId);
    try {
      const endpoint = action === 'approved'
        ? `/owner/bookings/${bookingId}/approve`
        : `/owner/bookings/${bookingId}/reject`;
      const res = await api.put(endpoint);

      if (res.data.whatsapp_notification_url) {
        setWhatsappModal({
          booking: res.data.booking,
          whatsappUrl: res.data.whatsapp_notification_url,
          status: action,
        });
      }
      await fetchCalendar(false);
    } catch {} finally { setActionLoading(null); }
  };

  const handleQuickBooking = async () => {
    setQuickSubmitting(true);
    setQuickError('');
    try {
      const today = new Date();
      const dow = today.getDay();
      const diff = quickBooking.dayOfWeek - dow;
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + (diff >= 0 ? diff : diff + 7));
      const dateStr = targetDate.toISOString().slice(0, 10);

      await api.post('/manager/bookings/training', {
        terrain_id: selectedTerrainId,
        reservation_type: 'single',
        booking_date: dateStr,
        start_time: quickBooking.startTime,
        end_time: quickBooking.endTime,
        booking_type: quickBooking.type,
        notes: quickBooking.notes || null,
      });
      await fetchCalendar(false);
    } catch (err) {
      setQuickError(err.response?.data?.message || t('common.error'));
    } finally { setQuickSubmitting(false); }
  };

  const navigateDays = (days) => {
    setCenterDate((c) => addDays(c, days));
  };

  const goToToday = () => {
    setCenterDate(toDateStr(new Date()));
  };

  const handleCloseSlot = async () => {
    if (!slotClosureModal) return;
    setClosureLoading(true);
    try {
      await api.post(`/owner/terrains/${slotClosureModal.terrainId}/slot-closures`, {
        closure_date: slotClosureModal.date,
        start_time: slotClosureModal.start,
        end_time: slotClosureModal.end,
        reason: closeReason || null,
      });
      setSlotClosureModal(null);
      setCloseReason('');
      fetchCalendar(false);
    } catch {} finally { setClosureLoading(false); }
  };

  const handleReopenSlot = async (slot) => {
    if (!slot.closure?.id) return;
    try {
      await api.delete(`/owner/terrains/${selectedTerrainId}/slot-closures/${slot.closure.id}`);
      fetchCalendar(false);
    } catch {}
  };

  const [calendarView, setCalendarView] = useState('week');

  const isOpen = selectedTerrain?.is_open ?? true;

  if (loading && !calendarData) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Master On/Off Switch */}
      {selectedTerrain && (
        <div className={`relative overflow-hidden rounded-2xl border-2 transition-all duration-300 ${
          isOpen
            ? 'border-emerald-300 bg-gradient-to-l from-emerald-50 to-emerald-100/60'
            : 'border-red-300 bg-gradient-to-l from-red-50 to-red-100/60'
        }`}>
          <div className="p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {/* Status indicator */}
              <div className="flex items-center gap-3 flex-1">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl ${
                  isOpen ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-red-500 shadow-lg shadow-red-200'
                }`}>
                  {isOpen ? '🟢' : '🔴'}
                </div>
                <div className="flex-1">
                  <h2 className={`text-lg font-black ${isOpen ? 'text-emerald-800' : 'text-red-800'}`}>
                    {isOpen ? t('calendar.terrainOpen') : t('calendar.terrainClosed')}
                  </h2>
                  <p className={`text-sm mt-0.5 ${isOpen ? 'text-emerald-600' : 'text-red-600'}`}>
                    {isOpen ? t('calendar.canBook') : t('calendar.cannotBook')}
                  </p>
                  {!isOpen && selectedTerrain.closure_reason && (
                    <span className="inline-flex items-center gap-1 mt-1.5 bg-red-200/70 text-red-700 text-xs font-bold px-2.5 py-1 rounded-full">
                      {CLOSURE_REASONS.find((r) => r.value === selectedTerrain.closure_reason)?.emoji || '❌'}
                      {selectedTerrain.closure_reason}
                    </span>
                  )}
                </div>
              </div>

              {/* Toggle Button */}
              <button
                onClick={isOpen ? () => setShowCloseModal(true) : handleToggleStatus}
                disabled={toggleLoading}
                className={`flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl text-sm font-black transition-all disabled:opacity-50 min-w-[180px] ${
                  isOpen
                    ? 'bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-200 active:scale-95'
                    : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-200 active:scale-95'
                }`}
              >
                {toggleLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : isOpen ? (
                  <PowerOff size={18} />
                ) : (
                  <Power size={18} />
                )}
                {toggleLoading ? t('common.submitting') : isOpen ? t('calendar.closeTerrain') : t('calendar.reopenTerrain')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Terrain Selector */}
      {terrains.length > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <label className="block text-xs text-gray-500 mb-1.5"><MapPin size={12} className="inline ms-1" />{t('booking.terrain')}</label>
          <select
            value={selectedTerrainId || ''}
            onChange={(e) => setSelectedTerrainId(parseInt(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          >
            {terrains.map((terrain) => (
              <option key={terrain.id} value={terrain.id}>
                {TYPE_EMOJI[terrain.type] || '⚽'} {terrain.name} {!terrain.is_open ? `🔴 ${t('common.closed')}` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Quick Stats */}
      {calendarData?.stats && (
        <div className="grid grid-cols-3 gap-4">
          <StatCard icon={CalendarDays} color="emerald" emoji="📋" label={t('calendar.totalBookings')} value={calendarData.stats.total_bookings} />
          <StatCard icon={Repeat} color="violet" emoji="🔄" label={t('calendar.activeSubscriptions')} value={calendarData.stats.active_subscriptions} />
          <StatCard icon={Clock} color="orange" emoji="🟢" label={t('calendar.emptySlots')} value={calendarData.stats.empty_slots} />
        </div>
      )}

      {/* Main 12-Column Grid: 8 + 4 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Calendar — 8 cols */}
        <div className="xl:col-span-8">
          {/* View Tabs + Navigation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 mb-3">
              <button onClick={() => navigateDays(-7)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition active:scale-95">
                <ChevronRight size={18} />
                <span>{t('calendar.previousDays')}</span>
              </button>
              <button onClick={goToToday} className={`px-4 py-2 text-sm font-black rounded-lg transition active:scale-95 ${
                centerDate === toDateStr(new Date())
                  ? 'bg-emerald-100 text-emerald-700 cursor-default'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-md shadow-emerald-200'
              }`}>
                📅 {t('calendar.jumpToToday')}
              </button>
              <button onClick={() => navigateDays(7)} className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition active:scale-95">
                <span>{t('calendar.nextDays')}</span>
                <ChevronLeft size={18} />
              </button>
            </div>
            <div className="text-center text-[11px] font-semibold text-gray-400 mb-3">
              {weekStartFromCenter(centerDate)} ← {centerDate} → {addDays(centerDate, 3)}
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'week', emoji: '📊', label: t('calendar.weekView') },
                { id: 'list', emoji: '📋', label: t('calendar.listBookingView') },
                { id: 'day', emoji: '🟢', label: t('calendar.emptySlotView') },
              ].map((view) => (
                <button
                  key={view.id}
                  onClick={() => setCalendarView(view.id)}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black transition-all duration-200 ${
                    calendarView === view.id
                      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <span>{view.emoji}</span>
                  {view.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={24} className="animate-spin text-emerald-600" />
            </div>
          ) : calendarData?.days?.length ? (
            <WeeklyGrid
              calendarData={calendarData}
              view={calendarView}
              terrainId={selectedTerrainId}
              today={toDateStr(new Date())}
              onCloseSlot={(slot) => setSlotClosureModal({ ...slot, terrainId: selectedTerrainId })}
              onReopenSlot={handleReopenSlot}
            />
          ) : (
            <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-200">
              <CalendarDays size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">{t('calendar.chooseTerrain')}</p>
            </div>
          )}
        </div>

        {/* Sidebar — 4 cols with Accordions */}
        <div className="xl:col-span-4 space-y-4">
          {/* Working Hours */}
          <AccordionSection title={'⏱️ ' + t('calendar.operatingHours')} icon={Settings} defaultOpen={false} accent="blue">
            <div className="space-y-2 pt-3">
              {scheduleLoading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 size={20} className="animate-spin text-emerald-600" />
                </div>
              ) : schedule.map((day) => (
                <DayScheduleRow
                  key={day.day_of_week}
                  day={day}
                  onChange={updateScheduleDay}
                />
              ))}
              {!scheduleLoading && (
                <div className="pt-2 space-y-2">
                  <button
                    onClick={handleSaveSchedule}
                    disabled={scheduleSaving}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition active:scale-95 disabled:opacity-50"
                  >
                    {scheduleSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                    {scheduleSaving ? t('common.saving') + '...' : '💾 ' + t('calendar.saveHours')}
                  </button>
                  {scheduleMessage && (
                    <p className={`text-xs text-center font-medium ${scheduleMessage.includes(t('common.error')) ? 'text-red-500' : 'text-emerald-600'}`}>
                      {scheduleMessage}
                    </p>
                  )}
                </div>
              )}
            </div>
          </AccordionSection>

          {/* Cancellation Requests */}
          <AccordionSection title={'❌ ' + t('booking.cancellationRequests')} icon={X} badge={cancelRequests.length} accent="red">
            <div className="space-y-3 pt-3">
              {cancelRequests.length === 0 ? (
                <div className="text-center py-6">
                  <span className="text-3xl block mb-2">✅</span>
                  <p className="text-gray-400 text-sm font-medium">{t('booking.noCancellationRequests')}</p>
                </div>
              ) : (
                cancelRequests.map((cr) => (
                  <div key={cr.id} className="bg-red-50 rounded-xl p-4 border border-red-200 space-y-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">❌</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-black text-gray-800 truncate">{cr.booking?.team?.name || '—'}</p>
                        <p className="text-[10px] text-gray-500">{cr.booking?.terrain?.name} — {cr.booking?.booking_date}</p>
                      </div>
                    </div>
                    {cr.reason && <p className="text-xs text-gray-600 bg-white rounded-lg p-2">{cr.reason}</p>}
                    <p className="text-xs text-gray-500">{t('booking.requestedBy', { name: cr.user?.name })}</p>
                    <div className="flex gap-2">
                      <button onClick={() => handleCancelRequest(cr.id, 'approve')} disabled={cancelActionLoading === cr.id}
                        className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition disabled:opacity-50">
                        {cancelActionLoading === cr.id ? <Loader2 size={12} className="animate-spin mx-auto" /> : '✅ ' + t('booking.approve')}
                      </button>
                      <button onClick={() => handleCancelRequest(cr.id, 'reject')} disabled={cancelActionLoading === cr.id}
                        className="flex-1 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl text-xs font-bold transition disabled:opacity-50">
                        ❌ {t('booking.reject')}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </AccordionSection>

          {/* Pending Approvals */}
          <AccordionSection title={'🔔 ' + t('calendar.pendingApprovals')} icon={AlertCircle} badge={calendarData?.pending_bookings?.length || 0} accent="orange">
            <div className="space-y-3 pt-3">
              {(!calendarData?.pending_bookings || calendarData.pending_bookings.length === 0) ? (
                <div className="text-center py-6">
                  <span className="text-3xl block mb-2">✅</span>
                  <p className="text-gray-400 text-sm font-medium">{t('calendar.noPending')}</p>
                </div>
              ) : (
                calendarData.pending_bookings.map((booking) => (
                  <PendingBookingCard
                    key={booking.id}
                    booking={booking}
                    onConfirm={() => handleManageBooking(booking.id, 'approved')}
                    onReject={() => handleManageBooking(booking.id, 'rejected')}
                    loading={actionLoading === booking.id}
                  />
                ))
              )}
            </div>
          </AccordionSection>

          {/* Quick Manual Reservation */}
          <AccordionSection title={'⚡ ' + t('calendar.quickBooking')} icon={Zap} defaultOpen={true} accent="emerald">
            <div className="space-y-3 pt-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('calendar.day')}</label>
                <select
                  value={quickBooking.dayOfWeek}
                  onChange={(e) => setQuickBooking({ ...quickBooking, dayOfWeek: parseInt(e.target.value) })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                >
                  {[0,1,2,3,4,5,6].map((d) => (
                    <option key={d} value={d}>{t(`weekdays.${WEEKDAY_KEYS[d]}`)}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('calendar.from')}</label>
                  <input type="time" value={quickBooking.startTime}
                    onChange={(e) => setQuickBooking({ ...quickBooking, startTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t('calendar.to')}</label>
                  <input type="time" value={quickBooking.endTime}
                    onChange={(e) => setQuickBooking({ ...quickBooking, endTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('booking.type')}</label>
                <select value={quickBooking.type}
                  onChange={(e) => setQuickBooking({ ...quickBooking, type: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none">
                  <option value="training">{'🏃 ' + t('booking.training')}</option>
                  <option value="private">{'🔒 ' + t('booking.private')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">{t('booking.notes')}</label>
                <input type="text" value={quickBooking.notes} maxLength={200}
                  onChange={(e) => setQuickBooking({ ...quickBooking, notes: e.target.value })}
                  placeholder={t('common.optional')}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" />
              </div>
              {quickError && <p className="text-xs text-red-500 font-medium">{quickError}</p>}
              <button onClick={handleQuickBooking} disabled={quickSubmitting || !isOpen}
                className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition disabled:opacity-50 active:scale-95">
                {quickSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {!isOpen ? '🔴 ' + t('common.closed') : quickSubmitting ? t('common.submitting') : '➕ ' + t('calendar.addBooking')}
              </button>
            </div>
          </AccordionSection>
        </div>
      </div>

      {/* Close Terrain Modal */}
      {showCloseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => setShowCloseModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="text-center">
              <span className="text-4xl block mb-2">🔴</span>
              <h3 className="text-lg font-black text-gray-800">{t('calendar.closeTerrain')}</h3>
              <p className="text-sm text-gray-500 mt-1">{t('calendar.closureReason') + ' (' + t('common.optional') + ')'}</p>
            </div>
            <div className="space-y-2">
              {CLOSURE_REASONS.map((reason) => (
                <button
                  key={reason.value}
                  onClick={() => setSelectedReason(selectedReason === reason.value ? '' : reason.value)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition ${
                    selectedReason === reason.value
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl">{reason.emoji}</span>
                  <span className="text-sm font-bold text-gray-800">{reason.value}</span>
                  {selectedReason === reason.value && (
                    <Check size={16} className="ms-auto text-red-500" />
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCloseModal(false)}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
                {t('common.cancel')}
              </button>
              <button onClick={handleConfirmClose} disabled={toggleLoading}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
                {toggleLoading ? <Loader2 size={14} className="animate-spin" /> : <PowerOff size={14} />}
                {toggleLoading ? t('common.submitting') : t('calendar.closeTerrain')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Slot Closure Modal */}
      {slotClosureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSlotClosureModal(null)}>
          <div className="fixed inset-0 bg-black/40" />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="text-center">
              <span className="text-4xl block mb-2">🔒</span>
              <h3 className="text-lg font-black text-gray-800">{t('calendar.closeSlot')}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {slotClosureModal.date} — {slotClosureModal.start} — {slotClosureModal.end}
              </p>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{t('calendar.reasonOptional')}</label>
              <input
                type="text"
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
                placeholder={t('calendar.reasonPlaceholder')}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setSlotClosureModal(null); setCloseReason(''); }}
                className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition">
                {t('common.cancel')}
              </button>
              <button onClick={handleCloseSlot} disabled={closureLoading}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition disabled:opacity-50 flex items-center justify-center gap-2">
                {closureLoading ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
                {closureLoading ? t('common.submitting') : t('calendar.closeSlot')}
              </button>
            </div>
          </div>
        </div>
      )}

      {whatsappModal && (
        <WhatsAppNoticeModal
          booking={whatsappModal.booking}
          whatsappUrl={whatsappModal.whatsappUrl}
          status={whatsappModal.status}
          onClose={() => setWhatsappModal(null)}
        />
      )}
    </div>
  );
}

function StatCard({ icon: Icon, color, emoji, label, value }) {
  const colorMap = {
    emerald: 'bg-emerald-100 text-emerald-600',
    violet: 'bg-violet-100 text-violet-600',
    orange: 'bg-orange-100 text-orange-600',
  };
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${colorMap[color]}`}>
          {emoji}
        </div>
        <span className="text-xs text-gray-500 font-medium">{label}</span>
      </div>
      <div className="text-2xl font-black text-gray-800">{value}</div>
    </div>
  );
}

function DayScheduleRow({ day, onChange }) {
  const { t } = useTranslation();
  const DAY_NAMES = [t('weekdays.sunday'), t('weekdays.monday'), t('weekdays.tuesday'), t('weekdays.wednesday'), t('weekdays.thursday'), t('weekdays.friday'), t('weekdays.saturday')];
  const isFriday = day.day_of_week === 5;
  const dayEmoji = ['🔴', '🟢', '🟢', '🟢', '🟢', '🔴', '🟢'][day.day_of_week];
  const label = DAY_NAMES[day.day_of_week];

  return (
    <div className={`rounded-xl border-2 p-3 transition ${
      !day.is_active ? 'border-gray-200 bg-gray-50' : 'border-emerald-200 bg-emerald-50/50'
    }`}>
      <div className="flex items-center gap-3">
        {/* Toggle */}
        <button
          onClick={() => onChange(day.day_of_week, 'is_active', !day.is_active)}
          className={`relative w-12 h-7 rounded-full transition-all duration-200 shrink-0 ${
            day.is_active ? 'bg-emerald-500' : 'bg-gray-300'
          }`}
        >
          <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all duration-200 ${
            day.is_active ? 'start-5' : 'start-0.5'
          }`} />
        </button>

        {/* Day Name */}
        <div className="flex items-center gap-1.5 min-w-[90px]">
          <span className="text-base">{dayEmoji}</span>
          <span className={`text-sm font-bold ${day.is_active ? 'text-gray-800' : 'text-gray-400'}`}>{label}</span>
        </div>

        {/* Time Inputs */}
        {day.is_active ? (
          <div className="flex items-center gap-1.5 flex-1">
            <input
              type="time"
              value={day.open_time}
              onChange={(e) => onChange(day.day_of_week, 'open_time', e.target.value)}
              className="flex-1 border border-emerald-300 rounded-lg px-2 py-1.5 text-xs font-medium text-center focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
            <span className="text-gray-400 text-xs font-bold">{t('calendar.to')}</span>
            <input
              type="time"
              value={day.close_time}
              onChange={(e) => onChange(day.day_of_week, 'close_time', e.target.value)}
              className="flex-1 border border-emerald-300 rounded-lg px-2 py-1.5 text-xs font-medium text-center focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
        ) : (
          <span className="text-xs text-gray-400 font-medium flex-1 text-center">
            {isFriday ? '🔴 ' + t('calendar.closedFriday') : '⏸️ ' + t('calendar.dayInactive')}
          </span>
        )}
      </div>
    </div>
  );
}

function PendingBookingCard({ booking, onConfirm, onReject, loading }) {
  const { t } = useTranslation();
  const BOOKING_TYPE_CONFIG = {
    match: { emoji: '⚽', label: t('booking.match'), badgeClass: 'bg-blue-100 text-blue-700' },
    training: { emoji: '🏃', label: t('booking.training'), badgeClass: 'bg-orange-100 text-orange-700' },
    private: { emoji: '🔒', label: t('booking.private'), badgeClass: 'bg-purple-100 text-purple-700' },
  };
  const config = BOOKING_TYPE_CONFIG[booking.booking_type] || BOOKING_TYPE_CONFIG.training;
  const isSubscription = booking.reservation_type === 'weekly_subscription';
  const whatsappUrl = booking.whatsapp_notification_url;
  const managerPhone = booking.manager?.phone;

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span className="text-2xl">{config.emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black text-gray-800 truncate">{booking.team?.name}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${config.badgeClass}`}>
              {config.label}
            </span>
            {isSubscription && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-violet-100 text-violet-700">
                {'🔄 ' + t('booking.subscription')}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="space-y-1 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <CalendarDays size={12} className="text-gray-400" />
          <span className="font-medium">{booking.booking_date}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={12} className="text-gray-400" />
          <span className="font-medium">{booking.start_time} — {booking.end_time}</span>
        </div>
        {booking.price > 0 && (
          <div className="flex items-center gap-2">
            <Banknote size={12} className="text-gray-400" />
            <span className="font-black text-gray-800">{booking.price} {t('common.currency')}</span>
          </div>
        )}
      </div>

      {/* Manager Name + WhatsApp */}
      {booking.manager && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="truncate">{booking.manager.name}</span>
          {managerPhone && (
            <a
              href={whatsappUrl || `https://wa.me/212${managerPhone.replace(/^0/, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 bg-[#25D366] text-white px-2.5 py-1 rounded-lg text-[10px] font-bold hover:bg-[#20BD5B] transition shrink-0 active:scale-95"
            >
              <MessageCircle size={10} />
              {t('booking.whatsapp')}
            </a>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button onClick={onConfirm} disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-black transition disabled:opacity-50 active:scale-95">
          {loading ? <Loader2 size={14} className="animate-spin" /> : <span className="text-lg">✅</span>}
          {t('booking.approve')}
        </button>
        <button onClick={onReject} disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 py-3 bg-red-50 hover:bg-red-100 text-red-600 border-2 border-red-200 rounded-xl text-sm font-black transition disabled:opacity-50 active:scale-95">
          <span className="text-lg">❌</span>
          {t('booking.reject')}
        </button>
      </div>
    </div>
  );
}
