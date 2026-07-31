import { formatDate, formatTime } from '../../utils/dateFormatter';
import { useTranslation } from 'react-i18next';
import { X, Shield, MapPin, Calendar, Phone, MessageCircle, User, Shirt, Users, Trophy } from 'lucide-react';

export default function AcceptedMatchModal({ match, onClose }) {
  const { t } = useTranslation();
  const opponent = match.opponent_team;
  const manager = opponent?.manager;
  const stadium = match.stadium;
  const dt = new Date(match.match_datetime);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">{t('match.confirmedMatchTitle')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Match Info */}
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Calendar size={16} className="text-blue-600" />
              <span className="text-sm font-medium text-blue-700">{t('match.matchDateTime')}</span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-gray-800">
                {formatDate(dt)} — {formatTime(dt)}
              </p>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <MapPin size={14} className="text-gray-400" />
                {match.custom_terrain_name || `${stadium?.name} — ${stadium?.city}`}
              </p>
            </div>
          </div>

          {/* Opponent Team */}
          {opponent && (
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield size={16} className="text-green-600" />
                <span className="text-sm font-medium text-green-700">{t('match.opponentTeam')}</span>
              </div>

              <div className="flex items-center gap-3 mb-3">
                {opponent.logo_url ? (
                  <img src={opponent.logo_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-gray-100" />
                ) : (
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <Shield className="text-gray-400" size={20} />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{opponent.name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                      {t(`categories.${opponent.category}`) || opponent.category}
                    </span>
                    {opponent.association_name && (
                      <span className="text-xs text-gray-400">{opponent.association_name}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div className="bg-white rounded-lg p-2 flex items-center gap-1.5">
                  <Users size={13} className="text-gray-400" />
                  {t('match.playersCount', { count: opponent.member_count })}
                </div>
                <div className="bg-white rounded-lg p-2 flex items-center gap-1.5">
                  <Trophy size={13} className="text-gray-400" />
                  {t('match.points', { count: opponent.points })}
                </div>
                <div className="bg-white rounded-lg p-2 flex items-center gap-1.5">
                  <Shirt size={13} className="text-gray-400" />
                  <div className="flex gap-1">
                    <div className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: opponent.primary_color || '#16a34a' }} />
                    <div className="w-3 h-3 rounded-full border border-gray-200" style={{ backgroundColor: opponent.secondary_color || '#ffffff' }} />
                  </div>
                  {t('match.jerseyColors')}
                </div>
                <div className="bg-white rounded-lg p-2 flex items-center gap-1.5">
                  <Shield size={13} className="text-gray-400" />
                  {t('match.record', { wins: opponent.wins, losses: opponent.losses })}
                </div>
              </div>
            </div>
          )}

          {/* Manager Contact */}
          {manager && (
            <div className="bg-green-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <User size={16} className="text-green-600" />
                <span className="text-sm font-medium text-green-700">{t('match.managerContact')}</span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{t('match.nameLabel')}</span>
                  <span className="text-sm font-medium text-gray-800">{manager.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{t('match.phoneLabel')}</span>
                  <span className="text-sm font-medium text-gray-800" dir="ltr">{manager.phone}</span>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <a
                  href={`tel:${manager.phone}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium transition"
                >
                  <Phone size={14} />
                  {t('match.directCall')}
                </a>
                {manager.is_whatsapp && manager.phone && (
                  <a
                    href={`https://wa.me/${manager.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-medium transition"
                  >
                    <MessageCircle size={14} />
                    {t('match.whatsapp')}
                  </a>
                )}
              </div>
            </div>
          )}

          {!opponent && (
            <div className="text-center py-6 text-gray-400 text-sm">
              {t('match.waitingForOpponent')}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-2.5 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition text-sm"
          >
            {t('common.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
