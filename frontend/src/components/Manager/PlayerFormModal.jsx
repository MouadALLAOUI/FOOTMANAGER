import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, User, Hash, Phone, MessageCircle, FileText, Loader2 } from 'lucide-react';
import api from '../../services/api';

export default function PlayerFormModal({ player, onClose, onSaved }) {
  const { t } = useTranslation();
  const POSITION_OPTIONS = [
    { value: 'goalkeeper', label: t('players.goalkeeper') },
    { value: 'defender', label: t('players.defender') },
    { value: 'midfielder', label: t('players.midfielder') },
    { value: 'forward', label: t('players.forward') },
  ];
  const [form, setForm] = useState({
    name: '',
    position: '',
    number: '',
    phone: '',
    is_whatsapp: false,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (player) {
      setForm({
        name: player.name || '',
        position: player.position || '',
        number: player.number ?? '',
        phone: player.phone || '',
        is_whatsapp: player.is_whatsapp || false,
        notes: player.notes || '',
      });
    }
  }, [player]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm({ ...form, [name]: type === 'checkbox' ? checked : value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        name: form.name,
        position: form.position || null,
        number: form.number !== '' ? parseInt(form.number, 10) : null,
        phone: form.phone || null,
        is_whatsapp: form.is_whatsapp,
        notes: form.notes || null,
      };

      if (player) {
        await api.put(`/manager/players/${player.id}`, payload);
      } else {
        await api.post('/manager/players', payload);
      }
      onSaved();
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
            {player ? t('players.editTitle') : t('players.addTitle')}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('players.nameLabel')}</label>
            <div className="relative">
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder={t('players.namePlaceholder')}
                className="w-full pe-10 ps-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
              <User className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('players.positionLabel')}</label>
              <select
                name="position"
                value={form.position}
                onChange={handleChange}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none appearance-none"
              >
                <option value="">{t('players.choosePosition')}</option>
                {POSITION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('players.jerseyNumber')}</label>
              <div className="relative">
                <input
                  type="number"
                  name="number"
                  value={form.number}
                  onChange={handleChange}
                  min="0"
                  max="99"
                  placeholder="—"
                  className="w-full pe-10 ps-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
                <Hash className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('players.phoneLabel')}</label>
            <div className="relative">
              <input
                type="text"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder={t('players.phonePlaceholder')}
                className="w-full pe-10 ps-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
              />
              <Phone className="absolute start-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              name="is_whatsapp"
              checked={form.is_whatsapp}
              onChange={handleChange}
              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
            />
            <label className="text-sm text-gray-700 flex items-center gap-1">
              <MessageCircle size={14} className="text-green-600" />
              {t('players.hasWhatsapp')}
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('players.notesLabel')}</label>
            <div className="relative">
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={2}
                maxLength={500}
                placeholder={t('players.notesPlaceholder')}
                className="w-full pe-10 ps-10 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none"
              />
              <FileText className="absolute start-3 top-3 text-gray-400 pointer-events-none" size={14} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-600 text-sm hover:bg-gray-50 transition"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {player ? t('players.saveEdit') : t('players.saveAdd')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
