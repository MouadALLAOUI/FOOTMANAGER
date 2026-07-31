import { formatDate, formatTime } from '../../utils/dateFormatter';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Shield, MapPin, Users, Trophy, Loader2, Swords } from 'lucide-react';
import api from '../../services/api';

export default function TeamProfileModal({ teamId, onClose, onChallenge }) {
  const { t } = useTranslation();
  const [team, setTeam] = useState(null);
  const [recentMatches, setRecentMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await api.get(`/manager/teams/${teamId}`);
        setTeam(res.data.team);
        setRecentMatches(res.data.recent_matches || []);
      } catch {
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, [teamId]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/40" />
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg p-12 text-center">
          <Loader2 size={28} className="animate-spin text-green-600 mx-auto" />
        </div>
      </div>
    );
  }

  if (!team) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-gray-800">{t('teamProfile.title')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-4">
            {team.logo_url ? (
              <img src={team.logo_url} alt="" className="w-16 h-16 rounded-full object-cover border-2 border-gray-100" />
            ) : (
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <Shield className="text-gray-400" size={24} />
              </div>
            )}
            <div>
              <h3 className="text-xl font-bold text-gray-800">{team.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  {t(`categories.${team.category}`) || team.category}
                </span>
                {team.association_name && (
                  <span className="text-xs text-gray-400">{team.association_name}</span>
                )}
              </div>
            </div>
          </div>

          {/* Jersey Colors + Specs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-2">{t('teamProfile.jerseyColors')}</p>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: team.primary_color || '#16a34a' }} />
                  <span className="text-xs text-gray-500">{t('teamProfile.primaryColor')}</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: team.secondary_color || '#ffffff' }} />
                  <span className="text-xs text-gray-500">{t('teamProfile.secondaryColor')}</span>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-2">{t('teamProfile.membersLabel')}</p>
              <div className="flex items-center gap-1">
                <Users size={16} className="text-gray-500" />
                <span className="text-sm font-medium text-gray-800">{t('teamProfile.playersCount', { count: team.member_count })}</span>
              </div>
            </div>
          </div>

          {/* Primary Stadium */}
          {team.primary_stadium && (
            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
              <MapPin size={16} className="text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">{t('teamProfile.mainStadium')}</p>
                <p className="text-sm font-medium text-gray-800">{team.primary_stadium.name} — {team.primary_stadium.city}</p>
              </div>
            </div>
          )}

          {/* City/Region */}
          {(team.city || team.region) && (
            <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
              <MapPin size={16} className="text-gray-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">{t('teamProfile.location')}</p>
                <p className="text-sm font-medium text-gray-800">
                  {[team.city, team.region].filter(Boolean).join(' — ')}
                </p>
              </div>
            </div>
          )}

          {/* Description */}
          {team.description && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">{t('teamProfile.aboutTeam')}</p>
              <p className="text-sm text-gray-700">{team.description}</p>
            </div>
          )}

          {/* Stats */}
          <div className="bg-green-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={16} className="text-green-600" />
              <span className="text-sm font-medium text-green-700">{t('teamProfile.teamStats')}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              {[
                { label: t('teamProfile.points'), value: team.points },
                { label: t('teamProfile.wins'), value: team.wins },
                { label: t('teamProfile.draws'), value: team.draws },
                { label: t('teamProfile.losses'), value: team.losses },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-lg font-bold text-gray-800">{stat.value}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Matches */}
          {recentMatches.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">{t('teamProfile.recentMatches')}</h4>
              <div className="space-y-2">
                {recentMatches.map((m) => {
                  const hasScore = m.host_score !== null && m.opponent_score !== null;
                  const isHost = m.host_team_id === team.id;
                  const otherTeam = isHost ? m.opponent_team : m.host_team;
                  const myScore = isHost ? m.host_score : m.opponent_score;
                  const oppScore = isHost ? m.opponent_score : m.host_score;
                  const isWin = hasScore && myScore > oppScore;
                  const isDraw = hasScore && myScore === oppScore;
                  const isLoss = hasScore && myScore < oppScore;
                  const resultStyle = isWin
                    ? { row: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700' }
                    : isDraw
                      ? { row: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-700' }
                      : isLoss
                        ? { row: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700' }
                        : { row: 'bg-gray-50 border-gray-100', badge: 'bg-gray-100 text-gray-500' };
                  return (
                    <div key={m.id} className={`flex items-center justify-between rounded-lg p-2.5 text-xs border ${resultStyle.row}`}>
                      <span className="text-gray-600 shrink-0">{formatDate(m.match_datetime)}</span>
                      <span className="text-gray-800 font-medium">
                        {t('teamProfile.vs')} {otherTeam?.name || '—'}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-gray-500 hidden sm:inline">{m.stadium?.name || m.custom_terrain_name}</span>
                        {hasScore ? (
                          <span className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-full font-bold ${resultStyle.badge}`}>
                              {t(isWin ? 'teamProfile.wins' : isDraw ? 'teamProfile.draws' : 'teamProfile.losses')}
                            </span>
                            <span className="font-black text-gray-800 tabular-nums">{m.host_score} - {m.opponent_score}</span>
                          </span>
                        ) : (
                          <span className="text-gray-400">{t('teamProfile.notSpecified')}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
          <button
            onClick={() => onChallenge(team)}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-lg text-sm font-medium transition"
          >
            <Swords size={16} />
            {t('teamProfile.sendChallenge')}
          </button>
        </div>
      </div>
    </div>
  );
}
