import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import LogoUploadModal from '../../components/Manager/LogoUploadModal';
import PlayerFormModal from '../../components/Manager/PlayerFormModal';
import {
  Camera, Save, Loader2, Shield, MapPin, Palette, Info,
  Phone, CheckCircle, User, Users, Plus, Pencil, Trash2, MessageCircle,
  AlertTriangle,
} from 'lucide-react';

const CATEGORY_OPTIONS = ['adult', 'teenager', 'children'];

export default function TeamProfile() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showLogoModal, setShowLogoModal] = useState(false);
  const [success, setSuccess] = useState('');
  const [stadiums, setStadiums] = useState([]);

  const [activeTab, setActiveTab] = useState('profile');

  const [form, setForm] = useState({
    name: '', member_count: '', category: 'adult', association_name: '',
    primary_stadium_id: '', city: '', region: '',
    description: '', primary_color: '', secondary_color: '',
  });

  const [players, setPlayers] = useState([]);
  const [playersLoading, setPlayersLoading] = useState(false);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const res = await api.get('/manager/team-profile');
      const t = res.data.team;
      setTeam(t);
      setForm({
        name: t.name || '',
        member_count: t.member_count || '',
        category: t.category || 'adult',
        association_name: t.association_name || '',
        primary_stadium_id: t.primary_stadium_id || '',
        city: t.city || '',
        region: t.region || '',
        description: t.description || '',
        primary_color: t.primary_color || '',
        secondary_color: t.secondary_color || '',
      });
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const fetchPlayers = async () => {
    setPlayersLoading(true);
    try {
      const res = await api.get('/manager/players');
      setPlayers(res.data.players || []);
    } catch {
      setPlayers([]);
    } finally {
      setPlayersLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
    fetchPlayers();
    api.get('/stadiums').then((res) => setStadiums(res.data.stadiums || [])).catch(() => {});
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');

    try {
      const res = await api.put('/manager/team-profile', form);
      setTeam(res.data.team);
      updateUser({ team: res.data.team });
      setSuccess(t('teamProfile.saved'));
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors) {
        alert(Object.values(errors).flat().join(' '));
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUploaded = (data) => {
    setTeam(data.team);
    updateUser({ team: data.team });
    setShowLogoModal(false);
  };

  const handlePlayerSaved = () => {
    setShowPlayerModal(false);
    setEditingPlayer(null);
    fetchPlayers();
  };

  const handleDeletePlayer = async (id) => {
    try {
      await api.delete(`/manager/players/${id}`);
      setPlayers((prev) => prev.filter((p) => p.id !== id));
      setDeleteConfirm(null);
    } catch {}
  };

  const tabs = [
    { key: 'profile', label: 'teamProfile.teamInfoTab', icon: Info },
    { key: 'players', label: 'players.playersTab', icon: Users },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle size={16} />
          {success}
        </div>
      )}

      {/* Hero / Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="relative group">
            <img
              src={team?.logo_url || null}
              alt={team?.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-green-100 bg-gray-100"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
            <div
              className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center"
              style={{ display: team?.logo_url ? 'none' : 'flex' }}
            >
              <Shield className="text-gray-400" size={32} />
            </div>
            <button
              onClick={() => setShowLogoModal(true)}
              className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
            >
              <Camera className="text-white" size={20} />
            </button>
          </div>

          <div className="text-center sm:text-start">
            <h2 className="text-xl font-bold text-gray-800">{team?.name}</h2>
            <div className="flex items-center gap-2 mt-1 justify-center sm:justify-start">
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                {t(`categories.${team?.category}`)}
              </span>
              {team?.city && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <MapPin size={12} /> {team.city}
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1 justify-center sm:justify-start">
              <User size={14} /> {t('teamProfile.manager')}: {user?.name}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition ${
              activeTab === tab.key
                ? 'bg-white text-green-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} />
            {tab.label === 'players.playersTab' ? t(tab.label, { count: players.length }) : t(tab.label)}
          </button>
        ))}
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Info size={18} className="text-green-600" />
              {t('teamProfile.basicInfo')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.teamNameLabel')}</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.memberCountLabel')}</label>
                <input
                  type="number"
                  name="member_count"
                  value={form.member_count}
                  onChange={handleChange}
                  required
                  min="1"
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.ageCategory')}</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none appearance-none"
                >
                  {CATEGORY_OPTIONS.map((value) => (
                    <option key={value} value={value}>{t(`categories.${value}`)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('teamProfile.associationLabel')}</label>
                <input
                  type="text"
                  name="association_name"
                  value={form.association_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-green-600" />
              {t('teamProfile.stadiumAndDetails')}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('teamProfile.mainStadium')}</label>
                <select
                  name="primary_stadium_id"
                  value={form.primary_stadium_id}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none appearance-none"
                >
                  <option value="">{t('teamProfile.noMainStadium')}</option>
                  {stadiums.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} — {s.city}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('terrain.city')}</label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('teamProfile.region')}</label>
                  <input
                    type="text"
                    name="region"
                    value={form.region}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('teamProfile.aboutTeam')}</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  maxLength={1000}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none resize-none"
                  placeholder={t('teamProfile.descriptionPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                  <Palette size={14} /> {t('teamProfile.jerseyColors')}
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{t('teamProfile.primaryColor')}</span>
                    <input
                      type="color"
                      name="primary_color"
                      value={form.primary_color || '#16a34a'}
                      onChange={handleChange}
                      className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{t('teamProfile.secondaryColor')}</span>
                    <input
                      type="color"
                      name="secondary_color"
                      value={form.secondary_color || '#ffffff'}
                      onChange={handleChange}
                      className="w-10 h-10 rounded-lg border border-gray-300 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Phone size={18} className="text-green-600" />
              {t('teamProfile.contactInfo')}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('auth.phone')}</label>
                <input
                  type="text"
                  value={user?.phone || ''}
                  disabled
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('booking.whatsapp')}</label>
                <input
                  type="text"
                  value={user?.is_whatsapp ? t('teamProfile.enabled') : t('teamProfile.disabled')}
                  disabled
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-3 rounded-lg transition disabled:opacity-50"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            {saving ? t('common.loading') : t('teamProfile.saveChanges')}
          </button>
        </form>
      )}

      {/* Players Tab */}
      {activeTab === 'players' && (
        <div className="space-y-4">
          <button
            onClick={() => { setEditingPlayer(null); setShowPlayerModal(true); }}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition"
          >
            <Plus size={16} />
            {t('players.addPlayer')}
          </button>

          {playersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-green-600" />
            </div>
          ) : players.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
              <Users className="mx-auto text-gray-300 mb-3" size={40} />
              <p className="text-gray-400">{t('players.emptyTitle')}</p>
              <p className="text-sm text-gray-400 mt-1">{t('players.emptyHint')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {players.map((player) => (
                <div key={player.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        {player.number != null ? (
                          <span className="text-sm font-bold text-green-700">{player.number}</span>
                        ) : (
                          <User size={18} className="text-green-600" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-800">{player.name}</div>
                        {player.position && (
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {t(`players.${player.position}`)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingPlayer(player); setShowPlayerModal(true); }}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(player.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {player.phone && (
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Phone size={12} />
                      <span dir="ltr">{player.phone}</span>
                      {player.is_whatsapp && (
                        <MessageCircle size={12} className="text-green-600" />
                      )}
                    </div>
                  )}

                  {deleteConfirm === player.id && (
                    <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle size={14} className="text-red-600" />
                        <span className="text-xs text-red-700 font-medium">{t('players.deleteTitle')}</span>
                      </div>
                      <p className="text-xs text-red-600 mb-2">{t('players.deleteConfirm', { name: player.name })}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="flex-1 py-1.5 border border-gray-300 rounded-lg text-gray-600 text-xs hover:bg-gray-50"
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          onClick={() => handleDeletePlayer(player.id)}
                          className="flex-1 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showLogoModal && (
        <LogoUploadModal
          currentLogo={team?.logo_url}
          onClose={() => setShowLogoModal(false)}
          onUploaded={handleLogoUploaded}
        />
      )}

      {showPlayerModal && (
        <PlayerFormModal
          player={editingPlayer}
          onClose={() => { setShowPlayerModal(false); setEditingPlayer(null); }}
          onSaved={handlePlayerSaved}
        />
      )}
    </div>
  );
}
