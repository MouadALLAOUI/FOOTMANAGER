import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Loader2, Pencil, Trash2, X, Check, Tag } from 'lucide-react';
import api from '../../services/api';

export default function AdminFacilities() {
  const { t } = useTranslation();
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', icon: '' });

  const fetchFacilities = async () => {
    setLoading(true);
    try {
      const res = await api.get('/facilities');
      setFacilities(res.data.facilities || []);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchFacilities(); }, []);

  const resetForm = () => { setForm({ name: '', icon: '' }); setEditing(null); };

  const openAdd = () => { resetForm(); setShowModal(true); };

  const openEdit = (fac) => { setForm({ name: fac.name, icon: fac.icon }); setEditing(fac); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.icon.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/admin/facilities/${editing.id}`, form);
      } else {
        await api.post('/admin/facilities', form);
      }
      setShowModal(false);
      fetchFacilities();
    } catch {} finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm(t('admin.deleteFacilityConfirm'))) return;
    try {
      await api.delete(`/admin/facilities/${id}`);
      fetchFacilities();
    } catch {}
  };

  const EMOJIS = ['🪑', '🏆', '💡', '🚿', '🅿️', '☕', '📹', '🛋️', '🎯', '🔊', '🧊', '🔥', '🌡️', '🧹', '🔧', '🎪', '🏋️', '🧘', '🎵', '📺', '🖥️', '📡', '🔌', '🚰', '🚻', '♿', '🧑‍🍼', '🎮', '📚', '🧪'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t('admin.manageFacilities')}</h2>
          <p className="text-sm text-gray-500 mt-1">{facilities.length} {t('admin.facilitiesCount')}</p>
        </div>
        <button onClick={openAdd}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition">
          <Plus size={18} /> {t('admin.addFacility')}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-emerald-600" /></div>
      ) : facilities.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Tag className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-400 text-lg">{t('admin.noFacilities')}</p>
          <p className="text-gray-300 text-sm mt-1">{t('admin.noFacilitiesHint')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-end px-6 py-3 text-gray-500 font-medium">{t('admin.facilityIconLabel')}</th>
                <th className="text-end px-6 py-3 text-gray-500 font-medium">{t('admin.facilityNameLabel')}</th>
                <th className="text-end px-6 py-3 text-gray-500 font-medium">{t('admin.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {facilities.map((fac) => (
                <tr key={fac.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 text-xl">{fac.icon}</td>
                  <td className="px-6 py-4 font-medium text-gray-800">{fac.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(fac)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(fac.id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40" onClick={() => { setShowModal(false); resetForm(); }} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">{editing ? t('admin.editFacility') : t('admin.addFacilityNew')}</h3>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600 transition"><X size={20} /></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('admin.facilityNameLabel')}</label>
                <input type="text" value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder={t('admin.facilityNamePlaceholder')} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('admin.facilityIconLabel')}</label>
                <div className="grid grid-cols-6 gap-2 mb-2">
                  {EMOJIS.map((emoji) => (
                    <button key={emoji} type="button" onClick={() => setForm((p) => ({ ...p, icon: emoji }))}
                      className={`w-10 h-10 flex items-center justify-center text-lg rounded-lg border-2 transition ${form.icon === emoji ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}>
                      {emoji}
                    </button>
                  ))}
                </div>
                <input type="text" value={form.icon}
                  onChange={(e) => setForm((p) => ({ ...p, icon: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-center focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  placeholder={t('admin.facilityIconPlaceholder')} maxLength={5} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition">
                  {t('common.cancel')}
                </button>
                <button type="submit" disabled={saving || !form.name.trim()}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {editing ? t('admin.saveEdits') : t('admin.addFacility')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
