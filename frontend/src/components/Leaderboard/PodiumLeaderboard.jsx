import { useTranslation } from 'react-i18next';
import { Medal, Trophy } from 'lucide-react';

const MEDAL_CONFIG = {
  1: {
    icon: Trophy,
    color: 'text-yellow-500',
    ring: 'ring-yellow-400/40',
    bar: 'bg-gradient-to-b from-yellow-400 to-yellow-600',
    barHeight: 'h-32',
    glow: 'shadow-lg shadow-yellow-400/20',
  },
  2: {
    icon: Medal,
    color: 'text-slate-400',
    ring: 'ring-slate-300/40',
    bar: 'bg-gradient-to-b from-slate-300 to-slate-500',
    barHeight: 'h-24',
    glow: 'shadow-lg shadow-slate-400/20',
  },
  3: {
    icon: Medal,
    color: 'text-amber-600',
    ring: 'ring-amber-500/40',
    bar: 'bg-gradient-to-b from-amber-400 to-amber-700',
    barHeight: 'h-20',
    glow: 'shadow-lg shadow-amber-500/20',
  },
};

export default function PodiumLeaderboard({ teams = [], onTeamClick }) {
  const { t } = useTranslation();

  if (teams.length === 0) return null;

  const top = teams.slice(0, 3);
  const ordered = [
    { rank: 2, team: top[1] },
    { rank: 1, team: top[0] },
    { rank: 3, team: top[2] },
  ].filter((x) => x.team);

  return (
    <div className="premium-glass rounded-2xl p-6 sm:p-8">
      <div className="flex items-center justify-center gap-2 mb-8">
        <Trophy size={20} className="text-yellow-500" />
        <h3 className="text-base font-black text-gray-800">{t('leaderboard.topThree')}</h3>
      </div>

      <div className="flex items-end justify-center gap-3 sm:gap-6">
        {ordered.map(({ rank, team }) => {
          const cfg = MEDAL_CONFIG[rank];
          const RankIcon = cfg.icon;
          return (
            <div
              key={rank}
              onClick={() => onTeamClick?.(team.id)}
              className={`flex flex-col items-center flex-1 max-w-[160px] ${onTeamClick ? 'cursor-pointer' : ''}`}
            >
              <div className="relative">
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-white ring-2 ${cfg.ring} ${cfg.glow} flex items-center justify-center overflow-hidden`}>
                  {team.logo_url ? (
                    <img src={team.logo_url} alt={team.name} className="w-full h-full object-cover" />
                  ) : (
                    <span className={`text-2xl font-black ${cfg.color}`}>{team.name?.charAt(0)}</span>
                  )}
                </div>
                <span className={`absolute -bottom-1 -end-1 w-7 h-7 rounded-full ${cfg.bar} flex items-center justify-center shadow-md`}>
                  <RankIcon size={14} className="text-white" />
                </span>
              </div>

              <div className="text-center mt-4 mb-3 max-w-[140px]">
                <div className="text-sm font-bold text-gray-800 truncate">{team.name}</div>
                <div className="text-xs text-gray-400 mt-0.5">{team.matches_played} {t('leaderboard.played')}</div>
                <div className="text-base font-black text-emerald-600 mt-1">{team.points} {t('leaderboard.pointsUnit')}</div>
              </div>

              <div className={`w-full ${cfg.barHeight} ${cfg.bar} rounded-t-xl flex items-start justify-center pt-3`}>
                <div className="w-8 h-8 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-sm font-black text-white">{rank}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
