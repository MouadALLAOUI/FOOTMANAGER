import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarDays, Clock, Banknote, MessageCircle, X, Loader2, Lock, Unlock } from 'lucide-react';

export default function WeeklyGrid({ calendarData, view, terrainId, today, onCloseSlot, onReopenSlot }) {
  const { t } = useTranslation();
  const [selectedBooking, setSelectedBooking] = useState(null);

  if (view === 'list') {
    return <ListView calendarData={calendarData} onSelectBooking={setSelectedBooking} selectedBooking={selectedBooking} />;
  }
  if (view === 'day') {
    return <EmptyOnlyView calendarData={calendarData} today={today} />;
  }
  return <WeekGridView calendarData={calendarData} terrainId={terrainId} today={today} onCloseSlot={onCloseSlot} onReopenSlot={onReopenSlot} onSelectBooking={setSelectedBooking} selectedBooking={selectedBooking} />;
}

function WeekGridView({ calendarData, terrainId, today, onCloseSlot, onReopenSlot, onSelectBooking, selectedBooking }) {
  const { t } = useTranslation();
  const BOOKING_TYPE_CONFIG = {
    match: { emoji: '⚽', label: t('booking.match'), badgeClass: 'bg-blue-100 text-blue-700' },
    training: { emoji: '🏃', label: t('booking.training'), badgeClass: 'bg-orange-100 text-orange-700' },
    private: { emoji: '🔒', label: t('booking.private'), badgeClass: 'bg-purple-100 text-purple-700' },
  };

  if (!calendarData?.days?.length) return null;

  const slotStarts = [...new Set(
    calendarData.days.flatMap((day) => day.slots.map((s) => s.start))
  )].sort();

  if (slotStarts.length === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Day Headers */}
          <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-gray-200">
            <div className="p-2 text-[10px] font-bold text-gray-400 text-center">{t('grid.time')}</div>
            {calendarData.days.map((day) => {
              const isToday = day.date === today;
              return (
                <div key={day.date} className={`p-2 text-center border-e border-gray-100 ${day.is_open ? '' : 'bg-red-50'} ${isToday ? 'ring-2 ring-emerald-500/50 bg-emerald-500/10' : ''}`}>
                  <div className="text-[10px] font-black text-gray-800">{day.day_name}</div>
                  <div className="text-[9px] text-gray-400 mt-0.5" style={{ fontVariantNumeric: 'tabular-nums' }}>{day.date}</div>
                  {isToday && <span className="inline-block mt-0.5 text-[8px] font-black px-1.5 py-0.5 rounded-full bg-emerald-500 text-white">{t('calendar.today')}</span>}
                  {!day.is_open && <span className="text-[8px] text-red-400 font-bold">{t('grid.closed')}</span>}
                </div>
              );
            })}
          </div>

          {/* Time Rows */}
          <div className="divide-y divide-gray-50">
            {slotStarts.map((slotStart) => (
              <div key={slotStart} className="grid grid-cols-[60px_repeat(7,1fr)] min-h-[48px]">
                <div className="p-1.5 text-[10px] font-bold text-gray-400 text-center border-e border-gray-100 flex items-start justify-center pt-2" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {slotStart}
                </div>
                {calendarData.days.map((day) => {
                  const slot = day.slots.find((s) => s.start === slotStart);
                  if (!slot) {
                    return <div key={`${day.date}-${slotStart}`} className="border-e border-gray-50 bg-gray-50/50" />;
                  }

                  const isBooked = slot.status === 'booked' && slot.booking;
                  const isClosed = slot.status === 'closed';
                  const booking = slot.booking;
                  const isSubscription = booking?.reservation_type === 'weekly_subscription';
                  const isMatch = booking?.booking_type === 'match';
                  const isPending = booking?.status === 'pending';
                  const bookingStart = booking?.start_time || slot.start;
                  const bookingEnd = booking?.end_time || slot.end;
                  const isAvailable = !isBooked && !isClosed;

                  const slotDate = new Date(`${day.date}T${slot.start}`);
                  const isPast = slotDate < new Date();

                  let cellBg, cellBorder, cellCursor, onClick, content;

                  if (isPending) {
                    cellBg = 'bg-amber-50 hover:bg-amber-100';
                    cellBorder = 'border-amber-200';
                    cellCursor = 'cursor-pointer';
                    onClick = () => onSelectBooking(booking);
                    content = (
                      <div className="text-center">
                        <div className="text-[9px] font-bold text-amber-600 mb-0.5">{'⏳ ' + t('grid.pending')}</div>
                        <div className="text-[10px] font-bold text-gray-700 truncate">{booking.team?.name || '—'}</div>
                        <div className="text-[9px] text-gray-400">{bookingStart}—{bookingEnd}</div>
                      </div>
                    );
                  } else if (isClosed) {
                    cellBg = 'bg-gray-100 hover:bg-gray-200';
                    cellBorder = 'border-gray-300';
                    cellCursor = 'cursor-pointer';
                    onClick = () => onReopenSlot?.(slot);
                    content = (
                      <div className="text-center">
                        <Lock size={12} className="mx-auto text-gray-400 mb-0.5" />
                        <div className="text-[9px] font-bold text-gray-500">{t('grid.closed')}</div>
                        {slot.closure?.reason && (
                          <div className="text-[8px] text-gray-400 truncate">{slot.closure.reason}</div>
                        )}
                      </div>
                    );
                  } else if (isBooked) {
                    cellCursor = 'cursor-pointer';
                    onClick = () => onSelectBooking(booking);
                    if (isSubscription) {
                      cellBg = 'bg-violet-50 hover:bg-violet-100';
                      cellBorder = 'border-violet-200';
                    } else if (isMatch) {
                      cellBg = 'bg-blue-50 hover:bg-blue-100';
                      cellBorder = 'border-blue-200';
                    } else {
                      cellBg = 'bg-orange-50 hover:bg-orange-100';
                      cellBorder = 'border-orange-200';
                    }
                    content = (
                      <div className="text-center">
                        <div className="text-[10px] font-bold text-gray-700 truncate">{booking.team?.name || '—'}</div>
                        <div className="text-[9px] text-gray-400">{bookingStart}—{bookingEnd}</div>
                      </div>
                    );
                  } else {
                    cellBg = 'bg-emerald-50 hover:bg-emerald-100';
                    cellBorder = 'border-emerald-200';
                    cellCursor = 'cursor-pointer';
                    onClick = () => onCloseSlot?.({ date: day.date, start: slot.start, end: slot.end });
                    content = (
                      <div className="flex items-center justify-center gap-1">
                        <span className="text-emerald-600 text-[10px] font-bold">{t('grid.available')}</span>
                        <Unlock size={10} className="text-emerald-400" />
                      </div>
                    );
                  }

                  if (isPast) {
                    onClick = undefined;
                    cellCursor = '';
                    cellBg = cellBg.replace('hover:', '');
                  }

                  return (
                    <div
                      key={`${day.date}-${slotStart}`}
                      onClick={onClick}
                      className={`border-e border-gray-50 p-1 flex items-center justify-center transition-all duration-200 ${cellBg} ${cellCursor}`}
                    >
                      {content}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 py-3 border-t border-gray-100 text-[10px] font-bold flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-300" /> {'⏳ ' + t('grid.legendPending')}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500" /> {'⚽ ' + t('grid.legendMatch')}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-violet-500" /> {'🔄 ' + t('grid.legendSubscription')}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-500" /> {'🏃 ' + t('grid.legendTraining')}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-400" /> {t('grid.closed')}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-200" /> {t('grid.legendAvailable')}</span>
      </div>

      {selectedBooking && <BookingDetailModal booking={selectedBooking} onClose={() => onSelectBooking(null)} />}
    </div>
  );
}

function ListView({ calendarData, onSelectBooking, selectedBooking }) {
  const { t } = useTranslation();
  const BOOKING_TYPE_CONFIG = {
    match: { emoji: '⚽', label: t('booking.match'), badgeClass: 'bg-blue-100 text-blue-700' },
    training: { emoji: '🏃', label: t('booking.training'), badgeClass: 'bg-orange-100 text-orange-700' },
    private: { emoji: '🔒', label: t('booking.private'), badgeClass: 'bg-purple-100 text-purple-700' },
  };

  if (!calendarData?.days?.length) return null;

  const allBooked = [];
  calendarData.days.forEach((day) => {
    day.slots.forEach((slot) => {
      if (slot.status === 'booked' && slot.booking) {
        allBooked.push({ ...slot.booking, date: day.date, dayName: day.day_name });
      }
    });
  });

  if (allBooked.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <CalendarDays size={32} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-400 font-bold">{t('grid.noBookingsWeek')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="divide-y divide-gray-100">
        {allBooked.map((b) => {
          const config = BOOKING_TYPE_CONFIG[b.booking_type] || BOOKING_TYPE_CONFIG.training;
          const isSubscription = b.reservation_type === 'weekly_subscription';
          return (
            <div
              key={`${b.id}-${b.date}-${b.start_time}`}
              onClick={() => onSelectBooking(b)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition"
            >
              <span className="text-xl">{config.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{b.team?.name || '—'}</p>
                <p className="text-[10px] text-gray-400">{b.dayName} — {b.date}</p>
              </div>
              <div className="text-start shrink-0">
                <p className="text-xs font-bold text-gray-700">{b.start_time} — {b.end_time}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${config.badgeClass}`}>{config.label}</span>
                  {isSubscription && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-violet-100 text-violet-700">🔄</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedBooking && <BookingDetailModal booking={selectedBooking} onClose={() => onSelectBooking(null)} />}
    </div>
  );
}

function EmptyOnlyView({ calendarData, today }) {
  const { t } = useTranslation();

  if (!calendarData?.days?.length) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
        {calendarData.days.map((day) => {
          const empty = day.slots.filter((s) => s.status === 'available');
          const isToday = day.date === today;
          return (
            <div key={day.date} className={`rounded-xl border p-3 ${empty.length > 0 ? 'border-emerald-200 bg-emerald-50/50' : 'border-gray-200 bg-gray-50'} ${isToday ? 'ring-2 ring-emerald-500/50 bg-emerald-500/10' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-gray-800">{day.day_name}</span>
                <span className={`flex items-center gap-1.5 ${empty.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-500'} text-[10px] font-bold px-2 py-0.5 rounded-full`}>
                  {isToday && <span className="text-emerald-600">{t('calendar.today')}</span>}
                  {`${empty.length} ${t('grid.emptySlotsOf')}`}
                </span>
              </div>
              {empty.length > 0 ? (
                <div className="space-y-1">
                  {empty.map((s) => (
                    <div key={`${s.start}-${s.end}`} className="flex items-center gap-1.5 text-[10px] text-emerald-700 font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {s.start} — {s.end}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-gray-400">{t('grid.fullyBooked')}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BookingDetailModal({ booking, onClose }) {
  const { t } = useTranslation();
  const BOOKING_TYPE_CONFIG = {
    match: { emoji: '⚽', label: t('booking.match'), badgeClass: 'bg-blue-100 text-blue-700' },
    training: { emoji: '🏃', label: t('booking.training'), badgeClass: 'bg-orange-100 text-orange-700' },
    private: { emoji: '🔒', label: t('booking.private'), badgeClass: 'bg-purple-100 text-purple-700' },
  };
  const typeConfig = BOOKING_TYPE_CONFIG[booking.booking_type] || BOOKING_TYPE_CONFIG.training;
  const isSubscription = booking.reservation_type === 'weekly_subscription';
  const managerPhone = booking.manager?.phone;
  const whatsappUrl = booking.whatsapp_notification_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 transition-opacity" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4 transition-all duration-300 scale-100 opacity-100">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-gray-800">{t('grid.bookingDetails')}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
          <span className="text-2xl">{typeConfig.emoji}</span>
          <div>
            <p className="text-sm font-black text-gray-800">{booking.team?.name || t('grid.teamLabel')}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${typeConfig.badgeClass}`}>{typeConfig.label}</span>
              {isSubscription && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-violet-100 text-violet-700">{'🔄 ' + t('booking.subscription')}</span>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex items-center gap-2"><CalendarDays size={12} className="text-gray-400" />{booking.booking_date}</div>
          <div className="flex items-center gap-2"><Clock size={12} className="text-gray-400" />{booking.start_time} — {booking.end_time}</div>
          {booking.price > 0 && <div className="flex items-center gap-2"><Banknote size={12} className="text-gray-400" /><span className="font-black">{booking.price} {t('common.currency')}</span></div>}
        </div>

        {booking.manager && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500">{t('grid.managerLabel')}: <span className="font-bold text-gray-800">{booking.manager.name}</span></p>
            {managerPhone && (
              <a
                href={whatsappUrl || `https://wa.me/212${managerPhone.replace(/^0/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#25D366] hover:bg-[#20BD5B] text-white rounded-xl text-xs font-black transition active:scale-95"
              >
                <MessageCircle size={14} />
                {t('grid.contactWhatsApp')}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
