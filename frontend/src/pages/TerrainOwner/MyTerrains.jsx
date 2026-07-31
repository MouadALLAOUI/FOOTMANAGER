import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Eye, Map, Plus, Loader2, Trash2, Pencil, CheckCircle, XCircle, Banknote } from 'lucide-react';
import api from '../../services/api';
import TerrainFormModal from '../../components/TerrainOwner/TerrainFormModal';

const TYPE_MAP = {
  minifoot: { color: 'bg-green-100 text-green-700' },
  salle: { color: 'bg-blue-100 text-blue-700' },
  grass: { color: 'bg-emerald-100 text-emerald-700' },
  synthetic: { color: 'bg-teal-100 text-teal-700' },
};

export default function MyTerrains() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [terrains, setTerrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTerrain, setEditingTerrain] = useState(null);

  const fetchTerrains = async () => {
    setLoading(true);
    try {
      const res = await api.get('/owner/terrains');
      setTerrains(res.data.terrains || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchTerrains(); }, []);

  const handleDelete = async (id) => {
    if (!confirm(t('terrain.deleteConfirm'))) return;
    try { await api.delete(`/owner/terrains/${id}`); fetchTerrains(); } catch {}
  };

  const handleToggleAvailability = async (terrain) => {
    try {
      await api.put(`/owner/terrains/${terrain.id}`, { is_available: !terrain.is_available });
      fetchTerrains();
    } catch {}
  };

  const handleEdit = (terrain) => {
    setEditingTerrain(terrain);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setEditingTerrain(null);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t('terrain.myTerrains')}</h2>
          <p className="text-sm text-gray-500 mt-1">{terrains.length} {t('terrain.totalTerrains')}</p>
        </div>
        <button
          onClick={() => { setEditingTerrain(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition"
        >
          <Plus size={18} /> {t('terrain.addTerrain')}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-emerald-600" />
        </div>
      ) : terrains.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Map className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-400 text-lg">{t('terrain.noTerrains')}</p>
          <p className="text-gray-300 text-sm mt-1">{t('terrain.noTerrainsHint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {terrains.map((terrain) => {
            const typeInfo = TYPE_MAP[terrain.type] || TYPE_MAP.minifoot;
            return (
              <div key={terrain.id} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeInfo.color}`}>
                        {t(`terrain.${terrain.type}`)}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {terrain.player_format}
                      </span>
                    </div>
                    <button
                      onClick={() => handleToggleAvailability(terrain)}
                      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium transition ${
                        terrain.is_available ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-600 hover:bg-red-200'
                      }`}
                    >
                      {terrain.is_available ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {terrain.is_available ? t('common.available') : t('common.unavailable')}
                    </button>
                  </div>
                  <h3 className="text-lg font-bold text-gray-800 mb-1">{terrain.name}</h3>
                  <p className="text-sm text-gray-500 mb-3">{terrain.city}{terrain.address ? ` — ${terrain.address}` : ''}</p>

                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Banknote size={14} className="text-emerald-600" />
                      <span className="font-bold text-emerald-700">{terrain.price_per_team} {t('common.currency')}</span>
                      <span className="text-gray-400 text-xs">{t('common.perTeam')}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Banknote size={14} className="text-blue-600" />
                      <span className="font-bold text-blue-700">{terrain.total_price} {t('common.currency')}</span>
                      <span className="text-gray-400 text-xs">{t('common.perMatch')}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(terrain.facilities || []).map((fac) => (
                      <span key={fac.id} className="flex items-center gap-1 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-lg">
                        <span>{fac.icon}</span> {fac.name}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="px-5 pb-5 flex gap-2">
                  <button
                    onClick={() => navigate(`/terrain/my-terrains/${terrain.id}`)}
                    className="flex items-center justify-center gap-1 px-3 py-2 border border-emerald-200 text-emerald-600 hover:bg-emerald-50 rounded-lg text-sm transition"
                  >
                    <Eye size={14} /> {t('admin.preview')}
                  </button>
                  <button
                    onClick={() => handleEdit(terrain)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg text-sm transition"
                  >
                    <Pencil size={14} /> {t('common.edit')}
                  </button>
                  <button
                    onClick={() => handleDelete(terrain.id)}
                    className="flex items-center justify-center gap-1 px-3 py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm transition"
                  >
                    <Trash2 size={14} /> {t('common.delete')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <TerrainFormModal
          terrain={editingTerrain}
          onClose={handleFormClose}
          onSaved={() => { handleFormClose(); fetchTerrains(); }}
        />
      )}
    </div>
  );
}
