import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import TeamProfileModal from '../../components/Manager/TeamProfileModal';
import PodiumLeaderboard from '../../components/Leaderboard/PodiumLeaderboard';
import SkeletonCard from '../../components/UI/SkeletonCard';
import { Trophy, Medal, Users } from 'lucide-react';

const CATEGORY_TABS = [
  { value: '', labelKey: 'categories.all' },
  { value: 'adult', labelKey: 'categories.adult' },
  { value: 'teenager', labelKey: 'categories.teenager' },
  { value: 'children', labelKey: 'categories.children' },
];

const RANK_ICONS = {
  1: { color: 'text-yellow-500', bg: 'bg-yellow-50', icon: Trophy },
  2: { color: 'text-gray-400', bg: 'bg-gray-50', icon: Medal },
  3: { color: 'text-amber-600', bg: 'bg-amber-50', icon: Medal },
};

export default function Leaderboard() {
  const { t } = useTranslation();
  const [category, setCategory] = useState('');
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [profileTeamId, setProfileTeamId] = useState(null);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      const params = {};
      if (category) params.category = category;
      const res = await api.get('/leaderboard', { params });
      setTeams(res.data.teams || []);
    } catch {
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [category]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <Trophy className="text-yellow-500" size={24} />
          {t('leaderboard.title')}
        </h2>
        <p className="text-sm text-gray-500 mt-1">{t('leaderboard.subtitle')}</p>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1 w-fit">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setCategory(tab.value)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
              category === tab.value
                ? 'bg-white text-green-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
          <SkeletonCard lines={4} />
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-16 premium-glass rounded-xl">
          <Trophy className="mx-auto text-gray-300 mb-3" size={40} />
          <p className="text-gray-400">{t('common.noData')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('leaderboard.noResultsYet')}</p>
        </div>
      ) : (
        <>
          <PodiumLeaderboard teams={teams} onTeamClick={setProfileTeamId} />

          {/* Desktop Table */}
          <div className="hidden md:block premium-glass rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 w-12">#</th>
                  <th className="px-4 py-3 text-end text-xs font-semibold text-gray-500">{t('leaderboard.team')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">{t('leaderboard.playedShort')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">{t('leaderboard.winsShort')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">{t('leaderboard.drawsShort')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">{t('leaderboard.lossesShort')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">{t('leaderboard.goalsFor')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">{t('leaderboard.goalsAgainst')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">{t('leaderboard.goalDifference')}</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-green-700 bg-green-50">{t('leaderboard.points')}</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team, idx) => {
                  const rank = idx + 1;
                  const rankStyle = RANK_ICONS[rank];
                  return (
                    <tr
                      key={team.id}
                      className="border-b border-gray-50 hover:bg-gray-50/50 transition cursor-pointer"
                      onClick={() => setProfileTeamId(team.id)}
                    >
                      <td className="px-4 py-3 text-center">
                        {rankStyle ? (
                          <div className={`inline-flex items-center justify-center w-7 h-7 rounded-full ${rankStyle.bg}`}>
                            <rankStyle.icon size={16} className={rankStyle.color} />
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">{rank}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                            {team.logo_path ? (
                              <img
                                src={team.logo_url}
                                alt={team.name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-sm font-bold text-gray-500">{team.name?.charAt(0)}</span>
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-800">{team.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <div className="flex gap-0.5">
                                <span className="w-2.5 h-2.5 rounded-full border border-gray-200" style={{ backgroundColor: team.primary_color || '#16a34a' }} />
                                {team.secondary_color && (
                                  <span className="w-2.5 h-2.5 rounded-full border border-gray-200" style={{ backgroundColor: team.secondary_color }} />
                                )}
                              </div>
                              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                <Users size={10} />
                                {team.member_count}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center text-sm text-gray-700">{team.matches_played}</td>
                      <td className="px-4 py-3 text-center text-sm text-green-600 font-medium">{team.wins}</td>
                      <td className="px-4 py-3 text-center text-sm text-yellow-600">{team.draws}</td>
                      <td className="px-4 py-3 text-center text-sm text-red-500">{team.losses}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-700">{team.goals_for}</td>
                      <td className="px-4 py-3 text-center text-sm text-gray-700">{team.goals_against}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-0.5 text-sm font-medium ${
                          team.goal_difference > 0 ? 'text-green-600' : team.goal_difference < 0 ? 'text-red-500' : 'text-gray-400'
                        }`}>
                          {team.goal_difference > 0 ? '+' : ''}{team.goal_difference}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center bg-green-50/50">
                        <span className="text-lg font-bold text-green-700">{team.points}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {teams.map((team, idx) => {
              const rank = idx + 1;
              const rankStyle = RANK_ICONS[rank];
              return (
                <div
                  key={team.id}
                  className="premium-glass premium-glass-hover rounded-xl p-4"
                  onClick={() => setProfileTeamId(team.id)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {rankStyle ? (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${rankStyle.bg}`}>
                        <rankStyle.icon size={16} className={rankStyle.color} />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                        <span className="text-xs font-bold text-gray-500">{rank}</span>
                      </div>
                    )}
                    <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
                      {team.logo_path ? (
                        <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="font-bold text-gray-500">{team.name?.charAt(0)}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-gray-800 text-sm truncate">{team.name}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="flex gap-0.5">
                          <span className="w-2 h-2 rounded-full border border-gray-200" style={{ backgroundColor: team.primary_color || '#16a34a' }} />
                          {team.secondary_color && (
                            <span className="w-2 h-2 rounded-full border border-gray-200" style={{ backgroundColor: team.secondary_color }} />
                          )}
                        </div>
                        <span className="text-xs text-gray-400">{t('leaderboard.playerCount', { count: team.member_count })}</span>
                      </div>
                    </div>
                    <div className="text-end">
                      <div className="text-xl font-bold text-green-700">{team.points}</div>
                      <div className="text-xs text-gray-400">{t('leaderboard.pointsUnit')}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-gray-50 rounded-lg py-1.5">
                      <div className="text-xs text-gray-400">{t('leaderboard.playedShort')}</div>
                      <div className="text-sm font-semibold text-gray-700">{team.matches_played}</div>
                    </div>
                    <div className="bg-green-50 rounded-lg py-1.5">
                      <div className="text-xs text-gray-400">{t('leaderboard.won')}</div>
                      <div className="text-sm font-semibold text-green-600">{team.wins}</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg py-1.5">
                      <div className="text-xs text-gray-400">{t('leaderboard.drew')}</div>
                      <div className="text-sm font-semibold text-yellow-600">{team.draws}</div>
                    </div>
                    <div className="bg-red-50 rounded-lg py-1.5">
                      <div className="text-xs text-gray-400">{t('leaderboard.lost')}</div>
                      <div className="text-sm font-semibold text-red-500">{team.losses}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center mt-2">
                    <div className="text-xs text-gray-400">
                      {t('leaderboard.forShort')} <span className="font-semibold text-gray-700">{team.goals_for}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {t('leaderboard.againstShort')} <span className="font-semibold text-gray-700">{team.goals_against}</span>
                    </div>
                    <div className="text-xs text-gray-400">
                      {t('leaderboard.diffShort')}{' '}
                      <span className={`font-semibold ${
                        team.goal_difference > 0 ? 'text-green-600' : team.goal_difference < 0 ? 'text-red-500' : 'text-gray-500'
                      }`}>
                        {team.goal_difference > 0 ? '+' : ''}{team.goal_difference}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {profileTeamId && (
        <TeamProfileModal
          teamId={profileTeamId}
          onClose={() => setProfileTeamId(null)}
          onChallenge={() => setProfileTeamId(null)}
        />
      )}
    </div>
  );
}
