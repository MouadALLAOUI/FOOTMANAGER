import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, MapPin, Clock, Loader2, Building2, Pen, Banknote, Armchair, Trophy, Lightbulb, ShowerHead, Check, CalendarDays, Repeat } from 'lucide-react';
import api from '../../services/api';
import { resolveApiError } from '../../utils/apiError';
import { formatDate } from '../../utils/dateFormatter';

const TYPE_EMOJI = { minifoot: '⚽', salle: '🏟️', grass: '🌿', synthetic: '🟩', cement: '🧱' };

export default function CreateMatchModal({ onClose, onCreated }) {
  const { t } = useTranslation();
  const TYPE_LABEL = { minifoot: t('terrain.minifoot'), salle: t('terrain.salle'), grass: t('terrain.grass'), synthetic: t('terrain.synthetic'), cement: t('terrain.cement') };
  const suggestions = t('match.suggestions', { returnObjects: true });

  const [stadiums, setStadiums] = useState([]);
  const [terrainMode, setTerrainMode] = useState('existing');
  const [selectedTerrain, setSelectedTerrain] = useState(null);
  const [form, setForm] = useState({ stadium_id: '', custom_terrain_name: '', match_date: '', start_time: '', end_time: '', notes: '' });

  const [reservations, setReservations] = useState([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [reservationsError, setReservationsError] = useState('');
  const [selectedReservation, setSelectedReservation] = useState(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/stadiums').then((res) => setStadiums(res.data.stadiums || [])).catch(() => {});
  }, []);

  const today = () => new Date().toISOString().slice(0, 10);

  const fetchReservations = async (terrainId) => {
    setReservationsLoading(true);
    setReservationsError('');
    try {
      const res = await api.get(`/manager/terrains/${terrainId}/my-reservations`);
      setReservations(res.data.reservations || []);
    } catch {
      setReservationsError(t('common.error'));
    } finally {
      setReservationsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleTerrainSelect = (value) => {
    const found = stadiums.find((s) => s.id === parseInt(value));
    setSelectedTerrain(found || null);
    setSelectedReservation(null);
    setForm((prev) => ({
      ...prev,
      stadium_id: value,
      match_date: '',
      start_time: '',
      end_time: '',
    }));
    if (found) {
      fetchReservations(found.id);
    }
  };

  const handleSuggestion = (text) => {
    setForm((prev) => {
      const current = prev.notes.trim();
      if (!current) return { ...prev, notes: text };
      if (current.includes(text)) return prev;
      return { ...prev, notes: `${current} — ${text}` };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (terrainMode === 'existing') {
        if (!selectedReservation) {
          setError(t('match.reservationRequired'));
          return;
        }
        const payload = { notes: form.notes || '' };
        if (selectedReservation.reservation_type === 'weekly_subscription') {
          payload.date = selectedReservation.date;
        }
        await api.post(`/manager/match-requests/from-booking/${selectedReservation.id}`, payload);
      } else {
        if (!form.match_date || !form.start_time || !form.end_time) {
          setError(t('match.timeRequired'));
          return;
        }
        const payload = {
          match_datetime: `${form.match_date}T${form.start_time}:00`,
          start_time: form.start_time,
          end_time: form.end_time,
          custom_terrain_name: form.custom_terrain_name,
          notes: form.notes || '',
        };
        await api.post('/manager/match-requests', payload);
      }
      onCreated();
      onClose();
    } catch (err) {
      setError(resolveApiError(err, t));
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-gray-800">{t('match.createRequestTitle')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm">{error}</div>}

          {/* Stadium Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('match.stadiumRequired')}</label>
            <div className="flex gap-2 mb-3">
              <button
                type="button"
                onClick={() => {
                  setTerrainMode('existing');
                  setSelectedTerrain(null);
                  setSelectedReservation(null);
                  setForm((prev) => ({ ...prev, stadium_id: '', match_date: '', start_time: '', end_time: '' }));
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition border ${
                  terrainMode === 'existing' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Building2 size={16} /> {t('match.existingTerrain')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTerrainMode('custom');
                  setSelectedTerrain(null);
                  setSelectedReservation(null);
                  setForm((prev) => ({ ...prev, stadium_id: '', match_date: '', start_time: '', end_time: '' }));
                }}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition border ${
                  terrainMode === 'custom' ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
                }`}
              >
                <Pen size={16} /> {t('match.customTerrain')}
              </button>
            </div>

            {terrainMode === 'existing' ? (
              <>
                <select
                  name="stadium_id"
                  value={form.stadium_id}
                  onChange={(e) => handleTerrainSelect(e.target.value)}
                  className={inputCls}
                >
                  <option value="">{t('match.chooseStadium')}</option>
                  {stadiums.filter((s) => s.is_available).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.city} {s.price_per_team ? `(${t('match.stadiumPricePerTeam', { price: s.price_per_team })})` : ''}
                    </option>
                  ))}
                </select>

                {selectedTerrain && (
                  <div className="mt-3 bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{TYPE_EMOJI[selectedTerrain.type] || '⚽'}</span>
                        <div>
                          <h4 className="font-bold text-gray-800 text-sm">{selectedTerrain.name}</h4>
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                            {t('match.terrainType', { name: TYPE_LABEL[selectedTerrain.type] || t('terrain.single'), format: selectedTerrain.player_format })}
                          </span>
                        </div>
                      </div>
                      <Check size={18} className="text-emerald-600" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                      <MapPin size={12} /> {selectedTerrain.city}{selectedTerrain.address ? ` — ${selectedTerrain.address}` : ''}
                    </div>
                    <div className="flex items-center gap-4 mb-2">
                      <div className="flex items-center gap-1 text-sm">
                        <Banknote size={14} className="text-emerald-600" />
                        <span className="font-bold text-emerald-700">{t('match.stadiumPricePerTeam', { price: selectedTerrain.price_per_team })}</span>
                      </div>
                      {selectedTerrain.total_price && (
                        <div className="flex items-center gap-1 text-sm">
                          <Banknote size={14} className="text-blue-600" />
                          <span className="font-bold text-blue-700">{t('match.stadiumPricePerMatch', { price: selectedTerrain.total_price })}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTerrain.has_benches && <span className="text-xs bg-white text-gray-600 px-2 py-0.5 rounded-full border border-gray-200 flex items-center gap-0.5"><Armchair size={10} /> {t('terrain.benches')}</span>}
                      {selectedTerrain.supports_tournaments && <span className="text-xs bg-white text-gray-600 px-2 py-0.5 rounded-full border border-gray-200 flex items-center gap-0.5"><Trophy size={10} /> {t('terrain.tournaments')}</span>}
                      {selectedTerrain.has_lighting && <span className="text-xs bg-white text-gray-600 px-2 py-0.5 rounded-full border border-gray-200 flex items-center gap-0.5"><Lightbulb size={10} /> {t('terrain.lighting')}</span>}
                      {selectedTerrain.has_vestiaires && <span className="text-xs bg-white text-gray-600 px-2 py-0.5 rounded-full border border-gray-200 flex items-center gap-0.5"><ShowerHead size={10} /> {t('terrain.vestiaires')}</span>}
                    </div>
                  </div>
                )}

                {selectedTerrain && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <CalendarDays size={14} />
                      {t('match.myReservations')}
                    </label>

                    {reservationsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 size={22} className="animate-spin text-emerald-600" />
                      </div>
                    ) : reservationsError ? (
                      <div className="text-center py-6 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-sm text-red-600">{reservationsError}</p>
                      </div>
                    ) : reservations.length === 0 ? (
                      <div className="text-center py-6 bg-gray-50 border border-gray-200 rounded-xl">
                        <CalendarDays size={28} className="mx-auto text-gray-300 mb-2" />
                        <p className="text-sm text-gray-400 px-4">{t('match.noReservations')}</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {reservations.map((r) => {
                          const selected = selectedReservation?.id === r.id && selectedReservation?.date === r.date;
                          const isWeekly = r.reservation_type === 'weekly_subscription';
                          return (
                            <button
                              key={`${r.id}-${r.date}`}
                              type="button"
                              onClick={() => setSelectedReservation(r)}
                              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-start transition ${
                                selected ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-200' : 'bg-white border-gray-200 hover:border-emerald-300'
                              }`}
                            >
                              <CalendarDays size={16} className={selected ? 'text-emerald-600' : 'text-gray-400'} shrink-0 />
                              <div className="min-w-0">
                                <p className={`text-sm font-bold ${selected ? 'text-emerald-800' : 'text-gray-800'}`}>
                                  {formatDate(r.date)}
                                </p>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <Clock size={11} /> {r.start_time} — {r.end_time}
                                </p>
                              </div>
                              <div className="ms-auto flex items-center gap-2 shrink-0">
                                {isWeekly && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 flex items-center gap-1">
                                    <Repeat size={10} /> {t('match.weekly')}
                                  </span>
                                )}
                                {r.price > 0 && (
                                  <span className="text-xs font-medium text-green-700">
                                    {Number(r.price).toLocaleString('fr-FR')} {t('common.currency')}
                                  </span>
                                )}
                                {selected && <Check size={16} className="text-emerald-600" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  name="custom_terrain_name"
                  value={form.custom_terrain_name}
                  onChange={handleChange}
                  required
                  placeholder={t('match.customTerrainPlaceholder')}
                  className={inputCls}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('match.dateTimeRequired')}</label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="date"
                      name="match_date"
                      value={form.match_date}
                      min={today()}
                      onChange={handleChange}
                      required
                      className={inputCls}
                    />
                    <input
                      type="time"
                      name="start_time"
                      value={form.start_time}
                      onChange={handleChange}
                      required
                      className={inputCls}
                    />
                    <input
                      type="time"
                      name="end_time"
                      value={form.end_time}
                      onChange={handleChange}
                      required
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('match.notes')}</label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={3}
              maxLength={500}
              className="w-full py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition text-sm resize-none"
              placeholder={t('match.notesPlaceholder')}
            />
            {Array.isArray(suggestions) && suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSuggestion(s)}
                    className="text-xs bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-600 border border-gray-200 rounded-full px-3 py-1 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg transition disabled:opacity-50"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : null}
            {loading ? t('common.submitting') : t('match.publish')}
          </button>
        </form>
      </div>
    </div>
  );
}
