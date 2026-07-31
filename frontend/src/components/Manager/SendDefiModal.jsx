import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, Swords, Calendar, MapPin, FileText, Banknote } from 'lucide-react';
import api from '../../services/api';

export default function SendDefiModal({ targetTeam, onClose, onSent }) {
  const { t } = useTranslation();
  const [stadiums, setStadiums] = useState([]);
  const [terrainMode, setTerrainMode] = useState('existing');
  const [form, setForm] = useState({
    stadium_id: '',
    custom_terrain_name: '',
    match_datetime: '',
    notes: '',
    price_per_player: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/stadiums').then((res) => setStadiums(res.data.stadiums || [])).catch(() => {});
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        target_team_id: targetTeam.id,
        match_datetime: form.match_datetime,
        notes: form.notes || '',
      };
      if (terrainMode === 'existing') {
        payload.stadium_id = form.stadium_id;
      } else {
        payload.custom_terrain_name = form.custom_terrain_name;
      }
      if (form.price_per_player !== '' && form.price_per_player !== null) {
        payload.price_per_player = parseFloat(form.price_per_player);
      }

      await api.post('/manager/challenges', payload);
      onSent();
      onClose();
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors) {
        setError(Object.values(errors).flat().join(' '));
      } else {
        setError(err.response?.data?.message || t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">
            {t('match.challengeFor', { name: targetTeam.name })}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('match.stadiumRequired')}</label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setTerrainMode('existing')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
                  terrainMode === 'existing'
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {t('match.existingTerrain')}
              </button>
              <button
                type="button"
                onClick={() => setTerrainMode('custom')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition ${
                  terrainMode === 'custom'
                    ? 'bg-green-50 border-green-300 text-green-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                {t('match.customTerrain')}
              </button>
            </div>

            {terrainMode === 'existing' ? (
              <div className="relative">
                <select
                  name="stadium_id"
                  value={form.stadium_id}
                  onChange={handleChange}
                  required
                  className="w-full pe-10 ps-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none appearance-none"
                >
                  <option value="">{t('match.chooseStadium')}</option>
                  {stadiums.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} — {s.city}</option>
                  ))}
                </select>
                <MapPin className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
              </div>
            ) : (
              <input
                type="text"
                name="custom_terrain_name"
                value={form.custom_terrain_name}
                onChange={handleChange}
                required
                placeholder={t('match.customTerrainPlaceholder')}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('match.dateTimeRequired')}</label>
            <div className="relative">
              <input
                type="datetime-local"
                name="match_datetime"
                value={form.match_datetime}
                onChange={handleChange}
                min={new Date().toISOString().slice(0, 16)}
                required
                className="w-full pe-10 ps-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
              <Calendar className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('match.pricePerPlayerLabel')}</label>
            <div className="relative">
              <input
                type="number"
                name="price_per_player"
                value={form.price_per_player}
                onChange={handleChange}
                min="0"
                step="0.50"
                placeholder={t('match.pricePerPlayerPlaceholder')}
                className="w-full pe-10 ps-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
              <Banknote className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('match.challengeMessage')}</label>
            <div className="relative">
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={2}
                maxLength={500}
                className="w-full pe-10 ps-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none"
                placeholder={t('match.challengeMessagePlaceholder')}
              />
              <FileText className="absolute start-3 top-3 text-gray-400 pointer-events-none" size={18} />
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition text-sm"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Swords size={16} />}
            {loading ? t('common.submitting') : t('match.sendChallengeNow')}
          </button>
        </div>
      </div>
    </div>
  );
}
