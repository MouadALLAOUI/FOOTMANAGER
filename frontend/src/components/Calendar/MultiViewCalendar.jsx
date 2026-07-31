import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, Grid3X3, List, Filter } from 'lucide-react';

const COLOR_CLASSES = {
  blue: {
    border: 'border-blue-300',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    badge: 'bg-blue-100 text-blue-700',
    cellBorder: 'border-blue-400 bg-blue-50',
  },
  orange: {
    border: 'border-orange-300',
    bg: 'bg-orange-50',
    text: 'text-orange-700',
    badge: 'bg-orange-100 text-orange-700',
    cellBorder: 'border-orange-400 bg-orange-50',
  },
  purple: {
    border: 'border-purple-300',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    badge: 'bg-purple-100 text-purple-700',
    cellBorder: 'border-purple-400 bg-purple-50',
  },
};

export default function MultiViewCalendar({ days = [], weekStart, weekEnd }) {
  const { t } = useTranslation();
  const [view, setView] = useState('grid');

  const BOOKING_TYPE_CONFIG = {
    match: { emoji: '⚽', label: t('booking.match'), color: 'blue' },
    training: { emoji: '🏃', label: t('booking.training'), color: 'orange' },
    private: { emoji: '🔒', label: t('booking.private'), color: 'purple' },
  };

  const RESERVATION_CONFIG = {
    single: { emoji: '📌', label: t('booking.singleReservation'), dotClass: 'bg-blue-500' },
    weekly_subscription: { emoji: '🔄', label: t('booking.weeklySubscription'), dotClass: 'bg-violet-500' },
  };

  const VIEW_TABS = [
    { id: 'grid', label: t('calendar.gridView'), emoji: '📊', icon: Grid3X3, activeClass: 'border-blue-500 text-blue-700 bg-blue-50' },
    { id: 'list', label: t('calendar.listView'), emoji: '📋', icon: List, activeClass: 'border-orange-500 text-orange-700 bg-orange-50' },
    { id: 'empty', label: t('calendar.emptyView'), emoji: '🟢', icon: Filter, activeClass: 'border-emerald-500 text-emerald-700 bg-emerald-50' },
  ];

  const dayLabels = [t('weekdays.sunday'), t('weekdays.monday'), t('weekdays.tuesday'), t('weekdays.wednesday'), t('weekdays.thursday'), t('weekdays.friday'), t('weekdays.saturday')];

  const allBooked = [];
  const allEmpty = [];
  days.forEach((day) => {
    day.slots.forEach((slot) => {
      if (slot.status === 'booked') {
        allBooked.push({ ...slot, date: day.date, dayName: day.day_name });
      } else {
        allEmpty.push({ ...slot, date: day.date, dayName: day.day_name });
      }
    });
  });

  const displaySlots = view === 'empty' ? allEmpty : view === 'list' ? allBooked : null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* View Tabs — Icon-First with Color Coding */}
      <div className="flex border-b border-gray-200">
        {VIEW_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`flex-1 flex flex-col items-center gap-1 py-3.5 text-xs font-bold transition border-b-3 ${
              view === tab.id
                ? tab.activeClass
                : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span className="text-lg">{tab.emoji}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="p-4">
        {view === 'grid' && (
          <GridView days={days} dayLabels={dayLabels} />
        )}
        {view === 'list' && (
          <ListView slots={displaySlots} empty={allBooked.length === 0} />
        )}
        {view === 'empty' && (
          <EmptyView slots={displaySlots} empty={allEmpty.length === 0} />
        )}
      </div>
    </div>
  );
}

function GridView({ days, dayLabels }) {
  const { t } = useTranslation();

  if (!days.length) {
    return (
      <div className="text-center py-8">
        <span className="text-4xl block mb-2">📊</span>
        <p className="text-gray-400 text-sm font-medium">{t('common.noData')}</p>
      </div>
    );
  }

  const timeSet = new Set();
  days.forEach((day) => day.slots.forEach((s) => { timeSet.add(s.start); }));
  const times = Array.from(timeSet).sort();

  const lookup = {};
  days.forEach((day) => {
    lookup[day.date] = {};
    day.slots.forEach((slot) => {
      lookup[day.date][slot.start] = slot;
    });
  });

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-start px-2 py-2 text-gray-400 font-medium w-16">⏰</th>
            {days.map((day, i) => (
              <th key={day.date} className={`text-center px-2 py-2 font-bold ${day.date === today ? 'text-emerald-700 bg-emerald-50' : 'text-gray-600'}`}>
                <div className="flex flex-col items-center gap-0.5">
                  <span className="text-sm">{!day.is_open ? '🔴' : day.date === today ? '📍' : '🟢'}</span>
                  <span className="text-[10px]">{dayLabels[new Date(day.date + 'T00:00:00').getDay()]}</span>
                  <span className="text-[9px] text-gray-400 font-normal">{day.date.slice(5)}</span>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {times.map((time) => (
            <tr key={time} className="border-t border-gray-100">
              <td className="px-2 py-1.5 text-gray-500 font-bold text-center">{time}</td>
              {days.map((day) => {
                const slot = lookup[day.date]?.[time];
                if (!slot) return <td key={day.date} className="px-1 py-1.5" />;

                return (
                  <td key={day.date} className="px-1 py-1.5">
                    <SlotCell slot={slot} />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ListView({ slots, empty }) {
  const { t } = useTranslation();

  const BOOKING_TYPE_CONFIG = {
    match: { emoji: '⚽', label: t('booking.match'), color: 'blue' },
    training: { emoji: '🏃', label: t('booking.training'), color: 'orange' },
    private: { emoji: '🔒', label: t('booking.private'), color: 'purple' },
  };

  const RESERVATION_CONFIG = {
    single: { emoji: '📌', label: t('booking.singleReservation'), dotClass: 'bg-blue-500' },
    weekly_subscription: { emoji: '🔄', label: t('booking.weeklySubscription'), dotClass: 'bg-violet-500' },
  };

  if (empty) {
    return (
      <div className="text-center py-8">
        <span className="text-4xl block mb-2">📋</span>
        <p className="text-sm text-gray-400 font-medium">{t('grid.noBookingsWeek')}</p>
      </div>
    );
  }

  const grouped = {};
  slots.forEach((s) => {
    if (!grouped[s.date]) grouped[s.date] = [];
    grouped[s.date].push(s);
  });

  return (
    <div className="space-y-4 max-h-[500px] overflow-y-auto">
      {Object.entries(grouped).map(([date, daySlots]) => (
        <div key={date}>
          <div className="text-xs font-black text-gray-500 mb-2 sticky top-0 bg-white py-1 flex items-center gap-1.5">
            <span>📅</span>
            {daySlots[0]?.dayName} — {date}
          </div>
          <div className="space-y-2">
            {daySlots.map((slot, i) => {
              const booking = slot.booking;
              const typeConfig = booking ? BOOKING_TYPE_CONFIG[booking.booking_type] : null;
              const resConfig = booking ? RESERVATION_CONFIG[booking.reservation_type] || RESERVATION_CONFIG.single : null;
              const colors = typeConfig ? COLOR_CLASSES[typeConfig.color] : null;

              return (
                <div key={i} className={`flex items-center gap-3 px-3 py-3 rounded-xl text-xs ${
                  slot.status === 'booked'
                    ? `${colors?.bg || 'bg-gray-50'} border-2 ${colors?.border || 'border-gray-200'}`
                    : 'bg-emerald-50 border-2 border-emerald-200'
                }`}>
                  <span className="text-lg">
                    {slot.status === 'booked' ? (typeConfig?.emoji || '📋') : '🟢'}
                  </span>
                  <div className="flex-1">
                    <span className="font-bold">{slot.start} ➔ {slot.end}</span>
                    {slot.status === 'booked' && booking && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${colors?.badge || 'bg-gray-100 text-gray-700'}`}>
                          {typeConfig?.label}
                        </span>
                        {resConfig && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 font-bold">
                            {resConfig.emoji} {resConfig.label}
                          </span>
                        )}
                        <span className="text-gray-600 font-medium truncate">{booking.team?.name}</span>
                      </div>
                    )}
                  </div>
                  {slot.status === 'booked' && booking?.status === 'pending' && (
                    <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-bold">{'⏳ ' + t('common.pending')}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyView({ slots, empty }) {
  const { t } = useTranslation();

  if (empty) {
    return (
      <div className="text-center py-8">
        <span className="text-5xl block mb-3">🔥</span>
        <p className="text-sm text-gray-600 font-bold">{t('grid.fullyBooked')}</p>
        <p className="text-xs text-gray-400 mt-1">{t('grid.noBookingsWeek')}</p>
      </div>
    );
  }

  const grouped = {};
  slots.forEach((s) => {
    if (!grouped[s.date]) grouped[s.date] = [];
    grouped[s.date].push(s);
  });

  return (
    <div className="space-y-4 max-h-[500px] overflow-y-auto">
      {Object.entries(grouped).map(([date, daySlots]) => (
        <div key={date}>
          <div className="text-xs font-black text-emerald-600 mb-2 sticky top-0 bg-white py-1 flex items-center gap-1.5">
            <span>🟢</span>
            {daySlots[0]?.dayName} — {date}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {daySlots.map((slot, i) => (
              <div key={i} className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3 text-center">
                <span className="text-xl block mb-1">✅</span>
                <span className="text-base font-black text-emerald-700 block">{slot.start}</span>
                <span className="text-[10px] text-emerald-600">{t('calendar.to')} {slot.end}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function SlotCell({ slot }) {
  const { t } = useTranslation();

  const BOOKING_TYPE_CONFIG = {
    match: { emoji: '⚽', label: t('booking.match'), color: 'blue' },
    training: { emoji: '🏃', label: t('booking.training'), color: 'orange' },
    private: { emoji: '🔒', label: t('booking.private'), color: 'purple' },
  };

  const RESERVATION_CONFIG = {
    single: { emoji: '📌', label: t('booking.singleReservation'), dotClass: 'bg-blue-500' },
    weekly_subscription: { emoji: '🔄', label: t('booking.weeklySubscription'), dotClass: 'bg-violet-500' },
  };

  const isBooked = slot.status === 'booked';
  const booking = slot.booking;
  const typeConfig = booking ? BOOKING_TYPE_CONFIG[booking.booking_type] : null;
  const resConfig = booking ? RESERVATION_CONFIG[booking.reservation_type] || RESERVATION_CONFIG.single : null;
  const colors = typeConfig ? COLOR_CLASSES[typeConfig.color] : null;

  if (!isBooked) {
    return (
      <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50 px-1.5 py-2 text-center">
        <span className="text-sm block mb-0.5">🟢</span>
        <span className="text-[10px] text-emerald-700 font-bold">{t('grid.available')}</span>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border-2 ${colors?.cellBorder || 'border-gray-300 bg-gray-50'} px-1.5 py-2 text-center`}>
      <div className="flex items-center justify-center gap-0.5 mb-0.5">
        <span className="text-sm">{typeConfig?.emoji || '📋'}</span>
        {resConfig && (
          <span className={`w-2 h-2 rounded-full ${resConfig.dotClass}`} title={resConfig.label} />
        )}
      </div>
      <span className="text-[10px] font-bold truncate block">{booking?.team?.name || '—'}</span>
      {booking?.status === 'pending' && (
        <span className="text-[8px] bg-orange-100 text-orange-600 px-1 rounded font-bold">⏳</span>
      )}
    </div>
  );
}
