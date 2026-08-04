import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, MapPin, Banknote, Loader2, Globe, Users } from 'lucide-react';
import api from '../../services/api';

const FORMATS = ['5v5', '7v7', '9v9', '11v11'];

export default function TerrainFormModal({ terrain, onClose, onSaved }) {
  const { t } = useTranslation();
  const isEdit = !!terrain;
  const [facilities, setFacilities] = useState([]);
  const [loadingFacilities, setLoadingFacilities] = useState(true);

  const TERRAIN_TYPES = [
    { value: 'salle', label: t('terrain.salle'), icon: '🏟️', desc: t('terrain.salleDesc') },
    { value: 'synthetic', label: t('terrain.synthetic'), icon: '🟩', desc: t('terrain.syntheticDesc') },
    { value: 'cement', label: t('terrain.cement'), icon: '🧱', desc: t('terrain.cementDesc') },
  ];
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: terrain?.name || '',
    city: terrain?.city || '',
    address: terrain?.address || '',
    google_maps_url: terrain?.google_maps_url || '',
    type: terrain?.type || 'salle',
    player_format: terrain?.player_format || '7v7',
    has_benches: terrain?.has_benches || false,
    supports_tournaments: terrain?.supports_tournaments || false,
    has_lighting: terrain?.has_lighting || false,
    has_vestiaires: terrain?.has_vestiaires || false,
    price_per_team: terrain?.price_per_team || '',
    facility_ids: terrain?.facilities?.map((f) => f.id) || [],
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/facilities');
        setFacilities(res.data.facilities || []);
      } catch {} finally { setLoadingFacilities(false); }
    })();
  }, []);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const toggleFacility = (facId) => {
    setForm((prev) => {
      const ids = prev.facility_ids || [];
      const next = ids.includes(facId) ? ids.filter((id) => id !== facId) : [...ids, facId];
      return { ...prev, facility_ids: next };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = { ...form };
      if (isEdit) {
        await api.put(`/owner/terrains/${terrain.id}`, payload);
      } else {
        await api.post('/owner/terrains', payload);
      }
      onSaved();
    } catch (err) {
      setError(err.response?.data?.message || t('terrain.terrainSaveError'));
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100 rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-gray-800">{isEdit ? t('terrain.editTerrain') : t('terrain.addTerrain')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
          )}

          {/* Name & City */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('terrain.terrainName')}</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder={t('terrainForm.namePlaceholder')}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('terrain.city')}</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                placeholder={t('terrainForm.cityPlaceholder')}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('terrain.addressOptional')}</label>
            <input
              type="text"
              value={form.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder={t('terrainForm.addressPlaceholder')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Globe size={14} className="inline ms-1" />
               {t('terrainForm.googleMapsLink')}
            </label>
            <input
              type="url"
              value={form.google_maps_url}
              onChange={(e) => handleChange('google_maps_url', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder="https://maps.google.com/..."
            />
          </div>

          {/* Terrain Type - Visual Cards */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('terrain.type')}</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {TERRAIN_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleChange('type', type.value)}
                  className={`p-3 rounded-xl border-2 text-center transition ${
                    form.type === type.value
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">{type.icon}</div>
                  <div className="text-sm font-bold text-gray-800">{type.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{type.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Player Format */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users size={14} className="inline ms-1" />
               {t('terrain.playerFormat')}
            </label>
            <div className="flex gap-2">
              {FORMATS.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => handleChange('player_format', f)}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold border-2 transition ${
                    form.player_format === f
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Pricing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              <Banknote size={14} className="inline ms-1" />
              {t('terrainForm.priceLabel')}
            </label>
            <input
              type="number"
              min="0"
              step="10"
              value={form.price_per_team}
              onChange={(e) => handleChange('price_per_team', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              placeholder={t('terrainForm.pricePlaceholder')}
              required
            />
          </div>

          {/* Facilities Checkboxes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('terrainForm.facilitiesLabel')}</label>
            {loadingFacilities ? (
              <div className="flex items-center gap-2 text-gray-400 text-sm">
                <Loader2 size={14} className="animate-spin" /> {t('terrainForm.loadingFacilities')}
              </div>
            ) : facilities.length === 0 ? (
              <p className="text-xs text-gray-300">{t('terrainForm.noFacilitiesYet')}</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {facilities.map((fac) => (
                  <label
                    key={fac.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                      form.facility_ids?.includes(fac.id) ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={form.facility_ids?.includes(fac.id)}
                      onChange={() => toggleFacility(fac.id)}
                      className="sr-only"
                    />
                    <span className="text-xl">{fac.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{fac.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {isEdit ? t('terrainForm.saveEdits') : t('terrainForm.addTerrainSubmit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
