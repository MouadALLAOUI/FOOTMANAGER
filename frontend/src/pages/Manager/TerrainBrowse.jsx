import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Banknote, Search, Filter, X, Loader2, Building2 } from 'lucide-react';
import api from '../../services/api';
import TerrainActionCard from '../../components/Terrain/TerrainActionCard';
import SlotPickerModal from '../../components/Terrain/SlotPickerModal';

const TYPE_EMOJI = { minifoot: '⚽', salle: '🏟️', grass: '🌿', synthetic: '🟩' };
const FORMAT_OPTIONS = ['5v5', '7v7', '9v9', '11v11'];

export default function TerrainBrowse() {
  const { t } = useTranslation();
  const [terrains, setTerrains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterFormat, setFilterFormat] = useState('');
  const [selectedTerrain, setSelectedTerrain] = useState(null);
  const [flowType, setFlowType] = useState(null);

  const TYPE_LABEL = {
    minifoot: t('terrain.minifoot'),
    salle: t('terrain.salle'),
    grass: t('terrain.grass'),
    synthetic: t('terrain.synthetic'),
  };

  useEffect(() => {
    fetchTerrains();
  }, []);

  const fetchTerrains = async () => {
    setLoading(true);
    try {
      const res = await api.get('/terrains/public');
      setTerrains(res.data.terrains || []);
    } catch {
      setTerrains([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = terrains.filter((terrain) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!terrain.name?.toLowerCase().includes(q) && !terrain.city?.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (filterType && terrain.type !== filterType) return false;
    if (filterFormat && terrain.player_format !== filterFormat) return false;
    return true;
  });

  const handleAmicalMatch = (terrain) => {
    setSelectedTerrain(terrain);
    setFlowType('amical');
  };

  const handleDirectBooking = (terrain) => {
    setSelectedTerrain(terrain);
    setFlowType('direct');
  };

  const handleCloseModal = () => {
    setSelectedTerrain(null);
    setFlowType(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-800">{t('terrainBrowse.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('terrainBrowse.subtitle')}</p>
      </div>

      {/* Search + Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="relative">
          <Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t('terrainBrowse.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pe-4 ps-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="">{t('terrainBrowse.allTypes')}</option>
            {Object.entries(TYPE_LABEL).map(([key, label]) => (
              <option key={key} value={key}>{TYPE_EMOJI[key]} {label}</option>
            ))}
          </select>
          <select
            value={filterFormat}
            onChange={(e) => setFilterFormat(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-xs font-bold text-gray-600 focus:ring-2 focus:ring-emerald-500 outline-none"
          >
            <option value="">{t('terrainBrowse.allFormats')}</option>
            {FORMAT_OPTIONS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
          {(filterType || filterFormat || searchQuery) && (
            <button
              onClick={() => { setFilterType(''); setFilterFormat(''); setSearchQuery(''); }}
              className="flex items-center gap-1 px-3 py-2 text-xs font-bold text-red-500 hover:bg-red-50 rounded-lg transition"
            >
              <X size={12} />
              {t('terrainBrowse.clearFilter')}
            </button>
          )}
        </div>
      </div>

      {/* Terrain Cards */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
          <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-400 font-bold">{t('terrainBrowse.noTerrainsAvailable')}</p>
          <p className="text-xs text-gray-300 mt-1">{t('terrainBrowse.tryDifferent')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((terrain) => (
            <TerrainCard
              key={terrain.id}
              terrain={terrain}
              onAmicalMatch={() => handleAmicalMatch(terrain)}
              onDirectBooking={() => handleDirectBooking(terrain)}
            />
          ))}
        </div>
      )}

      {/* SlotPickerModal */}
      {selectedTerrain && flowType && (
        <SlotPickerModal
          terrain={selectedTerrain}
          flowType={flowType}
          onClose={handleCloseModal}
          onBooked={handleCloseModal}
        />
      )}
    </div>
  );
}

function TerrainCard({ terrain, onAmicalMatch, onDirectBooking }) {
  const { t } = useTranslation();
  const features = [];
  if (terrain.has_benches) features.push(t('terrain.benches'));
  if (terrain.has_lighting) features.push(t('terrain.lighting'));
  if (terrain.has_vestiaires) features.push(t('terrain.vestiaires'));
  if (terrain.supports_tournaments) features.push(t('terrain.tournaments'));

  const TYPE_LABEL = {
    minifoot: t('terrain.minifoot'),
    salle: t('terrain.salle'),
    grass: t('terrain.grass'),
    synthetic: t('terrain.synthetic'),
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-all duration-300">
      <div className="p-4 space-y-3">
        <div className="flex items-start gap-3">
          <span className="text-3xl">{TYPE_EMOJI[terrain.type] || '⚽'}</span>
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-gray-800 text-sm truncate">{terrain.name}</h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500">
              <MapPin size={11} className="text-gray-400 shrink-0" />
              <span>{terrain.city}</span>
              <span className="text-gray-300">·</span>
              <span>{TYPE_LABEL[terrain.type]}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {terrain.player_format && (
            <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
              {terrain.player_format}
            </span>
          )}
          {terrain.price_per_team && (
            <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Banknote size={9} /> {terrain.price_per_team} {t('terrainBrowse.perTeam')}
            </span>
          )}
        </div>

        {features.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {features.map((f) => (
              <span key={f} className="text-[9px] bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded">{f}</span>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 pb-4">
        <TerrainActionCard
          terrain={terrain}
          onAmicalMatch={onAmicalMatch}
          onDirectBooking={onDirectBooking}
        />
      </div>
    </div>
  );
}
