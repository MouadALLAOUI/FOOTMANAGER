import { formatDate, formatTime } from '../../utils/dateFormatter';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, Calendar, Clock, StickyNote, Filter, X, Users, Info, Shirt, Eye, Banknote, Armchair, Trophy, Lightbulb, ShowerHead } from 'lucide-react';
import api from '../../services/api';
import AcceptMatchModal from '../../components/Manager/AcceptMatchModal';
import TeamProfileModal from '../../components/Manager/TeamProfileModal';
import SendDefiModal from '../../components/Manager/SendDefiModal';
import SkeletonCard from '../../components/UI/SkeletonCard';

const CATEGORY_KEYS = { adult: 'categories.adult', teenager: 'categories.teenager', children: 'categories.children' };
const TYPE_EMOJI = { minifoot: '⚽', salle: '🏟️', grass: '🌿', synthetic: '🟩', cement: '🧱' };
const TYPE_LABEL_KEYS = { minifoot: 'terrain.minifoot', salle: 'terrain.salle', grass: 'terrain.grass', synthetic: 'terrain.synthetic', cement: 'terrain.cement' };

const CATEGORY_TABS = [
  { value: '', labelKey: 'categories.all' },
  { value: 'adult', labelKey: 'categories.adult' },
  { value: 'teenager', labelKey: 'categories.teenager' },
  { value: 'children', labelKey: 'categories.children' },
];

export default function MatchFeed() {
  const { t } = useTranslation();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ stadium_id: '', category: '', date: '' });
  const [stadiums, setStadiums] = useState([]);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [detailsMatch, setDetailsMatch] = useState(null);
  const [profileTeamId, setProfileTeamId] = useState(null);
  const [defiTeam, setDefiTeam] = useState(null);

  const fetchStadiums = async () => {
    try {
      const res = await api.get('/stadiums');
      setStadiums(res.data.stadiums || []);
    } catch {}
  };

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.stadium_id) params.stadium_id = filters.stadium_id;
      if (filters.category) params.category = filters.category;
      if (filters.date) params.date = filters.date;

      const res = await api.get('/manager/match-feed', { params });
      setMatches(res.data.matches || []);
    } catch {
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStadiums(); }, []);
  useEffect(() => { fetchMatches(); }, [filters]);

  const handleAccepted = () => {
    setSelectedMatch(null);
    fetchMatches();
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">{t('matchFeed.title')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('matchFeed.subtitle')}</p>
      </div>

      <div className="premium-glass rounded-xl p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
          <Filter size={16} />
          {t('matchFeed.filterResults')}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <select
            value={filters.stadium_id}
            onChange={(e) => setFilters({ ...filters, stadium_id: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
          >
            <option value="">{t('matchFeed.selectStadium')}</option>
            {stadiums.map((s) => (
              <option key={s.id} value={s.id}>{s.name} — {s.city}</option>
            ))}
          </select>

          <input
            type="date"
            value={filters.date}
            min={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setFilters({ ...filters, date: e.target.value })}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
          />

          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {CATEGORY_TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilters({ ...filters, category: tab.value })}
                className={`flex-1 py-1.5 rounded-md text-xs font-medium transition ${
                  filters.category === tab.value
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <SkeletonCard avatar lines={4} />
          <SkeletonCard avatar lines={4} />
          <SkeletonCard avatar lines={4} />
          <SkeletonCard avatar lines={4} />
          <SkeletonCard avatar lines={4} />
          <SkeletonCard avatar lines={4} />
        </div>
      ) : matches.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">{t('matchFeed.noMatches')}</p>
          <p className="text-sm mt-1">{t('matchFeed.noMatchesHint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {matches.map((match) => (
            <MatchCard
              key={match.id}
              match={match}
              onAccept={() => setSelectedMatch(match)}
              onViewDetails={() => setDetailsMatch(match)}
              onViewProfile={() => setProfileTeamId(match.host_team?.id)}
            />
          ))}
        </div>
      )}

      {selectedMatch && (
        <AcceptMatchModal
          match={selectedMatch}
          onClose={() => setSelectedMatch(null)}
          onAccepted={handleAccepted}
        />
      )}

      {detailsMatch && (
        <MatchDetailsModal match={detailsMatch} onClose={() => setDetailsMatch(null)} />
      )}

      {profileTeamId && (
        <TeamProfileModal
          teamId={profileTeamId}
          onClose={() => setProfileTeamId(null)}
          onChallenge={(team) => { setProfileTeamId(null); setDefiTeam(team); }}
        />
      )}

      {defiTeam && (
        <SendDefiModal
          targetTeam={defiTeam}
          onClose={() => setDefiTeam(null)}
          onSent={() => setDefiTeam(null)}
        />
      )}
    </div>
  );
}

function MatchCard({ match, onAccept, onViewDetails, onViewProfile }) {
  const { t } = useTranslation();
  const team = match.host_team;
  const stadium = match.stadium;
  const dt = new Date(match.match_datetime);

  return (
    <div className="premium-glass premium-glass-hover rounded-xl overflow-hidden flex flex-col">
      <div className="p-5 flex-1 space-y-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium text-gray-400">{t('matchFeed.hostTeam')}</span>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                {t(CATEGORY_KEYS[team?.category]) || team?.category}
              </span>
            </div>
            <h3 className="text-lg font-bold text-gray-800">{team?.name}</h3>
            {team?.association_name && (
              <p className="text-xs text-gray-400 mt-0.5">{team.association_name}</p>
            )}
          </div>
        </div>

        {/* Jersey Colors + Roster */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Shirt size={14} className="text-gray-400" />
            <div className="flex gap-1">
              <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: team?.primary_color || '#16a34a' }} />
              <div className="w-4 h-4 rounded-full border border-gray-200" style={{ backgroundColor: team?.secondary_color || '#ffffff' }} />
            </div>
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Users size={13} className="text-gray-400" />
            {team?.member_count ? t('matchFeed.playersCount', { count: team.member_count }) : '—'}
          </div>
        </div>

        <div className="space-y-2 text-sm text-gray-600">
          {/* Terrain visual card */}
          {stadium && !match.custom_terrain_name ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{TYPE_EMOJI[stadium.type] || '⚽'}</span>
                <span className="font-bold text-gray-800 text-sm">{stadium.name}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                <MapPin size={11} /> {stadium.city}
                {stadium.player_format && <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full text-xs">{stadium.player_format}</span>}
              </div>
              {(stadium.price_per_team || stadium.total_price) && (
                <div className="flex items-center gap-3 mt-1">
                  {stadium.price_per_team && <span className="text-xs text-emerald-700 font-medium flex items-center gap-0.5"><Banknote size={10} /> {t('matchFeed.perTeam', { price: stadium.price_per_team })}</span>}
                  {stadium.total_price && <span className="text-xs text-blue-700 font-medium flex items-center gap-0.5"><Banknote size={10} /> {t('matchFeed.perMatch', { price: stadium.total_price })}</span>}
                </div>
              )}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {stadium.has_benches && <span className="text-xs bg-white text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 flex items-center gap-0.5"><Armchair size={8} /> {t('matchFeed.benches')}</span>}
                {stadium.supports_tournaments && <span className="text-xs bg-white text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 flex items-center gap-0.5"><Trophy size={8} /> {t('matchFeed.tournaments')}</span>}
                {stadium.has_lighting && <span className="text-xs bg-white text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 flex items-center gap-0.5"><Lightbulb size={8} /> {t('matchFeed.lighting')}</span>}
                {stadium.has_vestiaires && <span className="text-xs bg-white text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 flex items-center gap-0.5"><ShowerHead size={8} /> {t('matchFeed.vestiaires')}</span>}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <MapPin size={15} className="text-gray-400 shrink-0" />
              <span>{match.custom_terrain_name || `${stadium?.name} — ${stadium?.city}`}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar size={15} className="text-gray-400 shrink-0" />
            <span>{formatDate(dt)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock size={15} className="text-gray-400 shrink-0" />
            <span>{formatTime(dt)}</span>
          </div>
        </div>

        {match.notes && (
          <div className="flex items-start gap-2 bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
            <StickyNote size={14} className="text-gray-400 shrink-0 mt-0.5" />
            <p>{match.notes}</p>
          </div>
        )}

        {match.price_per_player && (
          <div className="flex items-center gap-2 bg-green-50 rounded-lg p-3">
            <Banknote size={14} className="text-green-600 shrink-0" />
            <span className="text-sm font-medium text-green-700">
              {t('matchFeed.perPlayer', { price: Number(match.price_per_player).toLocaleString('ar-MA') })}
            </span>
          </div>
        )}
      </div>

      <div className="px-5 pb-5 flex gap-2">
        <button
          onClick={onViewProfile}
          className="flex items-center justify-center gap-1 px-3 py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg text-xs font-medium transition"
        >
          <Eye size={14} />
          {t('matchFeed.profile')}
        </button>
        <button
          onClick={onViewDetails}
          className="flex-1 border border-gray-300 text-gray-600 hover:bg-gray-50 py-2.5 rounded-lg text-sm font-medium transition"
        >
          {t('matchFeed.details')}
        </button>
        <button
          onClick={onAccept}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium transition"
        >
          {t('matchFeed.acceptMatch')}
        </button>
      </div>
    </div>
  );
}

function MatchDetailsModal({ match, onClose }) {
  const { t } = useTranslation();
  const team = match.host_team;
  const stadium = match.stadium;
  const dt = new Date(match.match_datetime);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">{t('matchFeed.matchDetails')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="bg-green-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-green-600" />
              <span className="text-sm font-medium text-green-700">{t('matchFeed.hostTeam')}</span>
            </div>
            <h3 className="text-xl font-bold text-gray-800">{team?.name}</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                {t(CATEGORY_KEYS[team?.category]) || team?.category}
              </span>
              {team?.association_name && (
                <span className="text-xs text-gray-500">{team.association_name}</span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {/* Terrain visual info in details modal */}
            {stadium && !match.custom_terrain_name ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{TYPE_EMOJI[stadium.type] || '⚽'}</span>
                  <div>
                    <p className="text-xs text-gray-400">{t('matchFeed.stadium')}</p>
                    <p className="text-sm font-bold text-gray-800">{stadium.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
                  <MapPin size={11} /> {stadium.city}{stadium.address ? ` — ${stadium.address}` : ''}
                  {stadium.player_format && <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{t(TYPE_LABEL_KEYS[stadium.type]) || t('matchFeed.stadium')} · {stadium.player_format}</span>}
                </div>
                <div className="flex items-center gap-3 mb-2">
                  {stadium.price_per_team && <span className="text-xs text-emerald-700 font-medium flex items-center gap-0.5"><Banknote size={10} /> {t('matchFeed.perTeam', { price: stadium.price_per_team })}</span>}
                  {stadium.total_price && <span className="text-xs text-blue-700 font-medium flex items-center gap-0.5"><Banknote size={10} /> {t('matchFeed.perMatch', { price: stadium.total_price })}</span>}
                </div>
                <div className="flex flex-wrap gap-1">
                  {stadium.has_benches && <span className="text-xs bg-white text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 flex items-center gap-0.5"><Armchair size={8} /> {t('matchFeed.benches')}</span>}
                  {stadium.supports_tournaments && <span className="text-xs bg-white text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 flex items-center gap-0.5"><Trophy size={8} /> {t('matchFeed.tournaments')}</span>}
                  {stadium.has_lighting && <span className="text-xs bg-white text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 flex items-center gap-0.5"><Lightbulb size={8} /> {t('matchFeed.lighting')}</span>}
                  {stadium.has_vestiaires && <span className="text-xs bg-white text-gray-500 px-1.5 py-0.5 rounded border border-gray-200 flex items-center gap-0.5"><ShowerHead size={8} /> {t('matchFeed.vestiaires')}</span>}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <MapPin size={18} className="text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">{t('matchFeed.stadium')}</p>
                  <p className="text-sm font-medium text-gray-800">
                    {match.custom_terrain_name || `${stadium?.name} — ${stadium?.city}`}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Calendar size={18} className="text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">{t('matchFeed.date')}</p>
                <p className="text-sm font-medium text-gray-800">{formatDate(dt)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Clock size={18} className="text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">{t('matchFeed.time')}</p>
                <p className="text-sm font-medium text-gray-800">
                  {formatTime(dt)}
                </p>
              </div>
            </div>

            {match.notes && (
              <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <Info size={18} className="text-gray-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-gray-400">{t('matchFeed.notes')}</p>
                  <p className="text-sm text-gray-700 mt-1">{match.notes}</p>
                </div>
              </div>
            )}

            {match.price_per_player && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <Banknote size={18} className="text-green-600 shrink-0" />
                <div>
                  <p className="text-xs text-green-600">{t('matchFeed.pricePerPlayer')}</p>
                  <p className="text-sm font-bold text-green-700">
              {t('matchFeed.perPlayer', { price: Number(match.price_per_player).toLocaleString('ar-MA') })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition text-sm"
          >
            {t('matchFeed.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
