import { formatDate, formatTime } from '../../utils/dateFormatter';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Map, Landmark, CalendarDays, Banknote, Loader2, Plus, Eye, EyeOff, TrendingUp } from 'lucide-react';
import api from '../../services/api';

export default function TerrainOwnerDashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, bookingsRes] = await Promise.all([
          api.get('/owner/stats'),
          api.get('/owner/bookings'),
        ]);
        setStats(statsRes.data.stats);
        setBookings(bookingsRes.data.bookings);
      } catch {} finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 size={28} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{t('dashboard.overview')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('dashboard.welcomeTerrainOwner')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <Map className="text-emerald-600" size={20} />
            </div>
            <span className="text-sm text-gray-500">{t('dashboard.totalTerrains')}</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{stats?.total_terrains || 0}</div>
          <div className="text-xs text-gray-400 mt-1">
            <span className="text-green-600">{stats?.available_terrains || 0}</span> {t('common.available')}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Landmark className="text-blue-600" size={20} />
            </div>
            <span className="text-sm text-gray-500">{t('dashboard.bookedMatches')}</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{stats?.booked_matches || 0}</div>
          <div className="text-xs text-gray-400 mt-1">
            <span className="text-orange-600">{stats?.pending_matches || 0}</span> {t('dashboard.pendingMatches')}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Banknote className="text-yellow-600" size={20} />
            </div>
            <span className="text-sm text-gray-500">{t('dashboard.estimatedRevenue')}</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {Number(stats?.total_revenue || 0).toLocaleString('ar-MA')} <span className="text-sm font-normal text-gray-400">{t('common.currency')}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-green-600" size={20} />
            </div>
            <span className="text-sm text-gray-500">{t('dashboard.dailyAverage')}</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">
            {bookings.length > 0 ? Math.round(bookings.length / 7) : 0}
            <span className="text-sm font-normal text-gray-400"> {t('dashboard.matchesPerDay')}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <CalendarDays size={18} className="text-emerald-600" />
          <h3 className="font-bold text-gray-800">{t('dashboard.upcomingBookings')}</h3>
        </div>
        {bookings.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-8">{t('dashboard.noUpcomingBookings')}</p>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${b.status === 'accepted' ? 'bg-green-500' : 'bg-orange-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 truncate">
                    {t('terrain.single')} #{b.stadium_id}
                    {b.custom_terrain_name && ` — ${b.custom_terrain_name}`}
                  </div>
                  <div className="text-xs text-gray-400">
                    {formatDate(b.match_datetime)}{' '}
                    {formatTime(b.match_datetime)}
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  b.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {b.status === 'accepted' ? t('common.accepted') : t('common.open')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
