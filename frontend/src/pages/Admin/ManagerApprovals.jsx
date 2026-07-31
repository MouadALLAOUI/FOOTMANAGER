import { formatDate, formatTime } from '../../utils/dateFormatter';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import ManagerDetailModal from '../../components/Admin/ManagerDetailModal';
import TerrainOwnerDetailModal from '../../components/Admin/TerrainOwnerDetailModal';
import {
  Clock, CheckCircle, XCircle, Ban, Eye, Check, X, Search,
  MessageCircle, Phone, Users, AlertTriangle, Undo2, Landmark,
} from 'lucide-react';

const STATUS_TABS = [
  { key: 'pending', label: 'common.pending', icon: Clock, color: 'yellow' },
  { key: 'approved', label: 'common.accepted', icon: CheckCircle, color: 'green' },
  { key: 'rejected', label: 'common.rejected', icon: XCircle, color: 'red' },
  { key: 'blocked', label: 'common.blocked', icon: Ban, color: 'gray' },
  { key: 'all', label: 'common.all', icon: Users, color: 'blue' },
];

export default function ManagerApprovals() {
  const { t } = useTranslation();
  const location = useLocation();
  const isTerrainOwner = location.pathname.includes('terrain-owners');
  const [searchParams, setSearchParams] = useSearchParams();
  const activeStatus = searchParams.get('status') || 'pending';

  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedManager, setSelectedManager] = useState(null);
  const [toast, setToast] = useState(null);
  const [search, setSearch] = useState('');

  const fetchManagers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: activeStatus });
      if (search) params.append('search', search);
      const endpoint = isTerrainOwner ? 'terrain-owners' : 'managers';
      const res = await api.get(`/admin/${endpoint}?${params.toString()}`);
      setManagers(isTerrainOwner ? (res.data.owners || []) : (res.data.managers || []));
    } catch {
      setManagers([]);
    } finally {
      setLoading(false);
    }
  }, [activeStatus, search, isTerrainOwner]);

  useEffect(() => {
    fetchManagers();
  }, [fetchManagers]);

  useEffect(() => {
    setSearch('');
  }, [isTerrainOwner]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleApprove = async (id) => {
    try {
      const endpoint = isTerrainOwner ? 'terrain-owners' : 'managers';
      const res = await api.put(`/admin/${endpoint}/${id}/approve`);
      showToast(res.data.message);
      setManagers((prev) => prev.filter((m) => m.id !== id));
      setSelectedManager(null);
    } catch {
      showToast(t('admin.approvalError'), 'error');
    }
  };

  const handleReject = async (id) => {
    try {
      const endpoint = isTerrainOwner ? 'terrain-owners' : 'managers';
      const res = await api.put(`/admin/${endpoint}/${id}/reject`);
      showToast(res.data.message);
      setManagers((prev) => prev.filter((m) => m.id !== id));
      setSelectedManager(null);
    } catch {
      showToast(t('admin.rejectError'), 'error');
    }
  };

  const handleBlock = async (id) => {
    try {
      const endpoint = isTerrainOwner ? 'terrain-owners' : 'managers';
      const res = await api.put(`/admin/${endpoint}/${id}/block`);
      showToast(res.data.message);
      setManagers((prev) => prev.map((m) => m.id === id ? { ...m, status: 'blocked' } : m));
      setSelectedManager(null);
    } catch {
      showToast(t('admin.blockError'), 'error');
    }
  };

  const handleUnblock = async (id) => {
    try {
      const endpoint = isTerrainOwner ? 'terrain-owners' : 'managers';
      const res = await api.put(`/admin/${endpoint}/${id}/unblock`);
      showToast(res.data.message);
      setManagers((prev) => prev.filter((m) => m.id !== id));
      setSelectedManager(null);
    } catch {
      showToast(t('admin.unblockError'), 'error');
    }
  };

  return (
    <div>
      {toast && (
        <div className={`fixed top-4 start-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm text-white ${
          toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
        }`}>
          {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
          {toast.message}
        </div>
      )}

      <h2 className="text-xl font-bold text-gray-800 mb-4">
        {isTerrainOwner ? t('admin.manageTerrainOwners') : t('admin.manageManagers')}
      </h2>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('admin.searchPlaceholder')}
          className="w-full pe-10 ps-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto">
        {STATUS_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeStatus === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setSearchParams({ status: tab.key })}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                isActive
                  ? tab.color === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                    tab.color === 'green' ? 'bg-green-100 text-green-700' :
                    tab.color === 'red' ? 'bg-red-100 text-red-700' :
                    tab.color === 'gray' ? 'bg-gray-200 text-gray-700' :
                    'bg-blue-100 text-blue-700'
                  : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <Icon size={16} />
              {t(tab.label)}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">{t('common.loading')}</div>
      ) : managers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <Clock className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-400">{t('common.noData')}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {managers.map((manager) => (
            <div key={manager.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                      manager.status === 'blocked' ? 'bg-gray-200 text-gray-500' :
                      manager.status === 'approved' ? 'bg-green-100 text-green-700' :
                      manager.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {isTerrainOwner ? <Landmark size={16} /> : manager.name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-800 text-sm truncate">{manager.name}</div>
                      <div className="text-xs text-gray-400">
                        {isTerrainOwner
                          ? t('admin.registeredTerrainsCount', { count: manager.terrains?.length || 0 })
                          : (manager.team?.name || '—')
                        }
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Phone size={12} />
                      <span dir="ltr">{manager.phone}</span>
                      {manager.is_whatsapp && (
                        <MessageCircle size={12} className="text-green-600" />
                      )}
                    </span>
                    {!isTerrainOwner && manager.team && (
                      <>
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {t('admin.playersCount', { count: manager.team.member_count })}
                        </span>
                        <span>{t(`categories.${manager.team.category}`)}</span>
                      </>
                    )}
                    <span className="text-gray-400">
                      {formatDate(manager.created_at)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => setSelectedManager(manager)}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-xs transition"
                  >
                    <Eye size={14} />
                    {t('admin.preview')}
                  </button>
                  {activeStatus === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(manager.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs transition"
                      >
                        <Check size={14} />
                        {t('admin.approve')}
                      </button>
                      <button
                        onClick={() => handleReject(manager.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs transition"
                      >
                        <X size={14} />
                        {t('admin.reject')}
                      </button>
                    </>
                  )}
                  {activeStatus === 'approved' && (
                    <button
                      onClick={() => handleBlock(manager.id)}
                      className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs transition"
                    >
                      <Ban size={14} />
                      {t('admin.block')}
                    </button>
                  )}
                  {activeStatus === 'blocked' && (
                    <button
                      onClick={() => handleUnblock(manager.id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs transition"
                    >
                      <Undo2 size={14} />
                      {t('admin.unblock')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedManager && (
        isTerrainOwner ? (
          <TerrainOwnerDetailModal
            owner={selectedManager}
            onClose={() => setSelectedManager(null)}
            onApprove={handleApprove}
            onReject={handleReject}
            onBlock={handleBlock}
            onUnblock={handleUnblock}
          />
        ) : (
          <ManagerDetailModal
            manager={selectedManager}
            onClose={() => setSelectedManager(null)}
            onApprove={handleApprove}
            onReject={handleReject}
            onBlock={handleBlock}
            onUnblock={handleUnblock}
          />
        )
      )}
    </div>
  );
}
