import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import {
  Users, CheckCircle, XCircle, Clock, Ban, Loader2, TrendingUp, Landmark, Map,
} from 'lucide-react';

export default function AdminOverview() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/stats')
      .then((res) => setStats(res.data.stats))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-green-600" />
      </div>
    );
  }

  const managerCards = [
    { label: t('admin.totalManagers'), value: stats?.total || 0, icon: Users, bg: 'bg-blue-100', textColor: 'text-blue-600', link: '/admin/managers?status=all' },
    { label: t('admin.pending'), value: stats?.pending || 0, icon: Clock, bg: 'bg-yellow-100', textColor: 'text-yellow-600', link: '/admin/managers' },
    { label: t('admin.approved'), value: stats?.approved || 0, icon: CheckCircle, bg: 'bg-green-100', textColor: 'text-green-600', link: '/admin/managers?status=approved' },
    { label: t('admin.rejected'), value: stats?.rejected || 0, icon: XCircle, bg: 'bg-red-100', textColor: 'text-red-600', link: '/admin/managers?status=rejected' },
    { label: t('admin.blocked'), value: stats?.blocked || 0, icon: Ban, bg: 'bg-gray-100', textColor: 'text-gray-600', link: '/admin/managers?status=blocked' },
  ];

  const terrainCards = [
    { label: t('admin.totalTerrainOwners'), value: stats?.terrain_owners_total || 0, icon: Landmark, bg: 'bg-emerald-100', textColor: 'text-emerald-600', link: '/admin/terrain-owners?status=all' },
    { label: t('admin.pending'), value: stats?.terrain_owners_pending || 0, icon: Clock, bg: 'bg-orange-100', textColor: 'text-orange-600', link: '/admin/terrain-owners' },
    { label: t('admin.approved'), value: stats?.terrain_owners_approved || 0, icon: CheckCircle, bg: 'bg-green-100', textColor: 'text-green-600', link: '/admin/terrain-owners?status=approved' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{t('dashboard.overview')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('admin.overviewSubtitle')}</p>
      </div>

      {/* Managers Section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Users size={14} /> {t('admin.managersTab')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {managerCards.map((card) => (
            <button
              key={card.label}
              onClick={() => navigate(card.link)}
              className="premium-glass premium-glass-hover rounded-xl p-5 text-start"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center`}>
                  <card.icon className={card.textColor} size={20} />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-800">{card.value}</div>
              <div className="text-sm text-gray-500 mt-1">{card.label}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Terrain Owners Section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Landmark size={14} /> {t('admin.terrainOwnersTab')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {terrainCards.map((card) => (
            <button
              key={card.label}
              onClick={() => navigate(card.link)}
              className="premium-glass premium-glass-hover rounded-xl p-5 text-start"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center`}>
                  <card.icon className={card.textColor} size={20} />
                </div>
              </div>
              <div className="text-2xl font-bold text-gray-800">{card.value}</div>
              <div className="text-sm text-gray-500 mt-1">{card.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} className="text-green-600" />
          <h3 className="font-bold text-gray-800">{t('admin.quickActions')}</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/admin/managers')}
            className="flex items-center gap-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 p-4 rounded-lg text-sm font-medium transition"
          >
            <Clock size={16} />
            {t('admin.reviewManagerRequests', { count: stats?.pending || 0 })}
          </button>
          <button
            onClick={() => navigate('/admin/terrain-owners')}
            className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 p-4 rounded-lg text-sm font-medium transition"
          >
            <Landmark size={16} />
            {t('admin.reviewOwnerRequests', { count: stats?.terrain_owners_pending || 0 })}
          </button>
          <button
            onClick={() => navigate('/admin/managers?status=all')}
            className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 p-4 rounded-lg text-sm font-medium transition"
          >
            <Users size={16} />
            {t('admin.allManagersLink')}
          </button>
          <button
            onClick={() => navigate('/admin/terrain-owners?status=all')}
            className="flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-gray-700 p-4 rounded-lg text-sm font-medium transition"
          >
            <Map size={16} />
            {t('admin.allTerrainOwners')}
          </button>
        </div>
      </div>
    </div>
  );
}
