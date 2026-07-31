import { formatDate, formatTime } from '../../utils/dateFormatter';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { resolveApiError } from '../../utils/apiError';
import CreateMatchModal from '../../components/Manager/CreateMatchModal';
import TeamProfileModal from '../../components/Manager/TeamProfileModal';
import AcceptedMatchModal from '../../components/Manager/AcceptedMatchModal';
import ReportScoreModal from '../../components/Manager/ReportScoreModal';
import ConfirmScoreModal from '../../components/Manager/ConfirmScoreModal';
import SkeletonCard from '../../components/UI/SkeletonCard';
import {
  Trophy, Target, TrendingUp, Plus, Clock, CheckCircle, Loader2, XCircle,
  Swords, MapPin, Calendar, PenLine, ShieldCheck, ChevronDown, ChevronUp, Banknote,
  X, Shield, MessageCircle,
} from 'lucide-react';

const STATUS_BADGE = {
  open: { labelKey: 'dashboard.badges.open', color: 'bg-yellow-100 text-yellow-700' },
  accepted: { labelKey: 'dashboard.badges.accepted', color: 'bg-blue-100 text-blue-700' },
  completed: { labelKey: 'dashboard.badges.completed', color: 'bg-gray-100 text-gray-600' },
  cancelled: { labelKey: 'dashboard.badges.cancelled', color: 'bg-red-100 text-red-600' },
  declined: { labelKey: 'dashboard.badges.declined', color: 'bg-red-100 text-red-600' },
};

export default function Dashboard() {
  const { t } = useTranslation();
  const [matchRequests, setMatchRequests] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [profileTeamId, setProfileTeamId] = useState(null);
  const [acceptedMatch, setAcceptedMatch] = useState(null);
  const [scoreMatch, setScoreMatch] = useState(null);
  const [confirmMatch, setConfirmMatch] = useState(null);
  const [pendingScores, setPendingScores] = useState([]);
  const [pendingConfirmations, setPendingConfirmations] = useState([]);
  const [showCompleted, setShowCompleted] = useState(false);
  const [detailRequest, setDetailRequest] = useState(null);
  const [teamStats, setTeamStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [convertingId, setConvertingId] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const [reqRes, chalRes, scoreRes, confRes, teamRes, bookingRes] = await Promise.all([
        api.get('/manager/my-match-requests'),
        api.get('/manager/received-challenges'),
        api.get('/manager/matches/pending-scores'),
        api.get('/manager/matches/pending-confirmations'),
        api.get('/manager/team-profile'),
        api.get('/manager/bookings'),
      ]);
      setMatchRequests(reqRes.data.match_requests);
      setChallenges(chalRes.data.challenges);
      setPendingScores(scoreRes.data.matches);
      setPendingConfirmations(confRes.data.matches);
      setTeamStats(teamRes.data.team);
      setBookings(bookingRes.data.bookings || []);
    } catch {
      setMatchRequests([]);
      setChallenges([]);
      setPendingScores([]);
      setPendingConfirmations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  useEffect(() => {
    if (!detailRequest) return;
    const stillExists = matchRequests.some((r) => r.id === detailRequest.id);
    if (!stillExists) setDetailRequest(null);
  }, [matchRequests]);

  const handleCancel = async (id) => {
    setCancellingId(id);
    try {
      await api.delete(`/manager/match-requests/${id}`);
      setDetailRequest(null);
      await fetchRequests();
    } catch (err) {
      alert(resolveApiError(err, t));
    } finally {
      setCancellingId(null);
    }
  };

  const handleChallengeResponse = async (id, action) => {
    try {
      await api.put(`/manager/challenges/${id}/respond`, { action });
      fetchRequests();
    } catch {}
  };

  const handleStartMatchFromBooking = async (bookingId) => {
    setConvertingId(bookingId);
    try {
      await api.post(`/manager/match-requests/from-booking/${bookingId}`);
      fetchRequests();
    } catch (err) {
      alert(resolveApiError(err, t));
    } finally {
      setConvertingId(null);
    }
  };

  const upcoming = matchRequests.filter((r) => r.status === 'accepted');
  const active = matchRequests.filter((r) => r.status === 'open');
  const completed = matchRequests.filter((r) => r.status === 'completed');
  const currentRequests = matchRequests.filter((r) => r.status === 'open' || r.status === 'accepted');

  const formResults = completed
    .filter((r) => r.host_score !== null && r.opponent_score !== null)
    .slice(-5)
    .map((r) => {
      const myId = teamStats?.id;
      const isHost = !myId || r.host_team_id === myId;
      const myScore = isHost ? r.host_score : r.opponent_score;
      const oppScore = isHost ? r.opponent_score : r.host_score;
      if (myScore > oppScore) return 'W';
      if (myScore < oppScore) return 'L';
      return 'D';
    });

  return (
    <div className="space-y-6">
      {/* Pending Confirmations Banner */}
      {pendingConfirmations.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <ShieldCheck className="text-orange-600" size={18} />
            <h3 className="font-bold text-orange-800">{t('dashboard.pendingConfirmationsTitle', { count: pendingConfirmations.length })}</h3>
          </div>
          <div className="space-y-3">
            {pendingConfirmations.map((m) => (
              <div key={m.id} className="premium-glass rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-700 mb-1">
                      {t('dashboard.scoreSubmittedBy', { name: m.score_submitted_by?.name })}
                    </div>
                    <div className="flex items-center justify-center gap-3 text-lg font-bold text-gray-800 my-2">
                      <span>{m.host_team?.name}</span>
                      <span className="bg-gray-100 px-3 py-0.5 rounded-lg text-sm">
                        {m.host_score} - {m.opponent_score}
                      </span>
                      <span>{m.opponent_team?.name}</span>
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-2">
                      <Calendar size={12} />
                      {formatDate(m.match_datetime)}{' '}
                      {formatTime(m.match_datetime)}
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmMatch(m)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-medium transition flex-shrink-0"
                  >
                    <ShieldCheck size={14} />
                    {t('dashboard.reviewAndConfirm')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Scores Banner */}
      {pendingScores.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <PenLine className="text-blue-600" size={18} />
            <h3 className="font-bold text-blue-800">{t('dashboard.pendingScoresTitle', { count: pendingScores.length })}</h3>
          </div>
          <div className="space-y-3">
            {pendingScores.map((m) => (
              <div key={m.id} className="premium-glass rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-gray-800">{m.host_team?.name}</span>
                      <span className="text-xs text-gray-400">{t('match.vs')}</span>
                      <span className="text-sm font-bold text-gray-800">{m.opponent_team?.name}</span>
                    </div>
                    <div className="text-xs text-gray-400 flex items-center gap-2">
                      <MapPin size={12} />
                      {m.custom_terrain_name || `${m.stadium?.name} — ${m.stadium?.city}`}
                      <span className="mx-1">·</span>
                      <Calendar size={12} />
                      {formatDate(m.match_datetime)}
                    </div>
                  </div>
                  <button
                    onClick={() => setScoreMatch(m)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition flex-shrink-0"
                  >
                    <PenLine size={14} />
                    {t('dashboard.reportScore')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Received Challenges Banner */}
      {challenges.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Swords className="text-orange-600" size={18} />
            <h3 className="font-bold text-orange-800">{t('dashboard.incomingChallenges', { count: challenges.length })}</h3>
          </div>
          <div className="space-y-3">
            {challenges.map((ch) => (
              <div key={ch.id} className="premium-glass rounded-lg p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <button
                        onClick={() => setProfileTeamId(ch.host_team?.id)}
                        className="text-sm font-bold text-gray-800 hover:text-green-600 transition"
                      >
                        {ch.host_team?.name}
                      </button>
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                        {t('dashboard.directChallenge')}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {ch.custom_terrain_name || `${ch.stadium?.name} — ${ch.stadium?.city}`}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatDate(ch.match_datetime)}{' '}
                        {formatTime(ch.match_datetime)}
                      </span>
                    </div>
                    {ch.notes && (
                      <p className="text-xs text-gray-400 mt-1">{ch.notes}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleChallengeResponse(ch.id, 'decline')}
                      className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs transition"
                    >
                      <XCircle size={14} />
                      {t('actions.reject')}
                    </button>
                    <button
                      onClick={() => handleChallengeResponse(ch.id, 'accept')}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs transition"
                    >
                      <CheckCircle size={14} />
                      {t('actions.accept')}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="premium-glass premium-glass-hover rounded-xl p-5 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Trophy className="text-blue-600" size={20} />
            </div>
            <span className="text-sm text-gray-500">{t('dashboard.upcomingMatches')}</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{upcoming.length}</div>
        </div>

        <div className="premium-glass premium-glass-hover rounded-xl p-5 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Target className="text-yellow-600" size={20} />
            </div>
            <span className="text-sm text-gray-500">{t('dashboard.activeRequests')}</span>
          </div>
          <div className="text-2xl font-bold text-gray-800">{active.length}</div>
        </div>

        <div className="premium-glass premium-glass-hover rounded-xl p-5 relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-400" />
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="text-green-600" size={20} />
            </div>
            <span className="text-sm text-gray-500">{t('dashboard.teamStats')}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <span>{teamStats?.points || 0} {t('dashboard.points')}</span>
            <span>{teamStats?.wins || 0} {t('dashboard.wins')}</span>
            <span>{teamStats?.draws || 0} {t('dashboard.draws')}</span>
            <span>{teamStats?.losses || 0} {t('dashboard.losses')}</span>
          </div>
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span>{teamStats?.matches_played || 0} {t('dashboard.matchesPlayed')}</span>
            <span>|</span>
            <span>{t('leaderboard.forShort')} {teamStats?.goals_for || 0}</span>
            <span>{t('leaderboard.againstShort')} {teamStats?.goals_against || 0}</span>
            <span>{t('leaderboard.diffShort')} {teamStats?.goal_difference ?? 0}</span>
          </div>
          {formResults.length > 0 && (
            <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
              <span className="text-xs text-gray-400 me-1">{t('dashboard.form')}</span>
              {formResults.map((res, i) => (
                <span
                  key={i}
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${
                    res === 'W' ? 'bg-green-500' : res === 'L' ? 'bg-red-500' : 'bg-gray-400'
                  }`}
                >
                  {res}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Action */}
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition"
      >
        <Plus size={18} />
        {t('dashboard.addFriendlyRequest')} +
      </button>

      {/* My Terrain Bookings */}
      {bookings.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('dashboard.myTerrainBookings')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {bookings.map((b) => (
              <div key={b.id} className="premium-glass rounded-xl p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin size={14} className="text-gray-400 shrink-0" />
                      <span className="text-sm font-medium text-gray-800 truncate">{b.terrain?.name}</span>
                    </div>
                    <div className="text-xs text-gray-500" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {formatDate(b.next_date || b.booking_date)} {b.start_time} - {b.end_time}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium inline-block mt-1 ${
                      b.status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {b.status === 'approved' ? t('dashboard.confirmed') : t('dashboard.pendingBooking')}
                    </span>
                  </div>
                  <button
                    onClick={() => handleStartMatchFromBooking(b.id)}
                    disabled={convertingId === b.id}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 text-white rounded-lg text-xs font-medium transition flex-shrink-0"
                  >
                    {convertingId === b.id ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Swords size={14} />
                    )}
                    {convertingId === b.id ? t('dashboard.converting') : t('dashboard.friendlyMatch')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* My Match Requests */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{t('dashboard.myRequests')}</h2>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SkeletonCard avatar lines={3} />
            <SkeletonCard avatar lines={3} />
            <SkeletonCard avatar lines={3} />
            <SkeletonCard avatar lines={3} />
          </div>
        ) : currentRequests.length === 0 ? (
          <div className="text-center py-12 premium-glass rounded-xl">
            <Clock className="mx-auto text-gray-300 mb-3" size={40} />
            <p className="text-gray-400">{t('common.noData')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {currentRequests.map((req) => {
              const badge = STATUS_BADGE[req.status] || STATUS_BADGE.open;
              return (
                <div
                  key={req.id}
                  onClick={() => setDetailRequest(req)}
                  className="premium-glass premium-glass-hover rounded-xl p-4 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${badge.color}`}>
                          {t(badge.labelKey)}
                        </span>
                        {req.type === 'direct_challenge' && (
                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                            {t('dashboard.directChallenge')}
                          </span>
                        )}
                        <span className="text-sm text-gray-500">
                          {req.custom_terrain_name || `${req.stadium?.name} — ${req.stadium?.city}`}
                        </span>
                      </div>

                      <div className="text-sm text-gray-700">
                        {formatDate(req.match_datetime)}{' '}
                        {formatTime(req.match_datetime)}
                      </div>

                      {req.target_team && (
                        <div className="text-sm text-orange-600 mt-1">
                          {t('dashboard.challengeForTeam', { name: req.target_team.name })}
                        </div>
                      )}

                      {req.opponent_team && (
                        <div className="text-sm text-blue-600 mt-1">
                          {t('dashboard.opponentTeam', { name: req.opponent_team.name })}
                        </div>
                      )}

                      {req.notes && (
                        <div className="text-xs text-gray-400 mt-1 truncate">{req.notes}</div>
                      )}

                      {req.price_per_player && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Banknote size={12} className="text-green-600" />
                          <span className="text-xs font-medium text-green-700">
                            {t('dashboard.perPlayerPrice', { price: Number(req.price_per_player).toLocaleString('ar-MA') })}
                          </span>
                        </div>
                      )}
                    </div>

                    {req.status === 'open' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCancel(req.id); }}
                        className="flex items-center gap-1 px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-xs transition flex-shrink-0"
                      >
                        <XCircle size={14} />
                        {t('dashboard.cancel')}
                      </button>
                    )}

                    {req.status === 'accepted' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setAcceptedMatch(req); }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs transition flex-shrink-0"
                      >
                        <CheckCircle size={14} />
                        {t('dashboard.viewDetails')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Completed Matches */}
      {completed.length > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-800 mb-3"
          >
            <Trophy size={16} />
            {t('dashboard.completedMatches', { count: completed.length })}
            {showCompleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showCompleted && (
            <div className="space-y-3">
              {completed.map((req) => (
                <div key={req.id} className="premium-glass rounded-xl p-4 opacity-75">
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                      {t('dashboard.ended')}
                    </span>
                    <span className="text-sm font-bold text-gray-800">{req.host_team?.name}</span>
                    {req.host_score !== null && req.opponent_score !== null && (
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-sm font-bold text-gray-700">
                        {req.host_score} - {req.opponent_score}
                      </span>
                    )}
                    {req.opponent_team && (
                      <span className="text-sm font-bold text-gray-800">{req.opponent_team?.name}</span>
                    )}
                    <span className="text-xs text-gray-400">
                      {formatDate(req.match_datetime)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <CreateMatchModal
          onClose={() => setShowModal(false)}
          onCreated={fetchRequests}
        />
      )}

      {profileTeamId && (
        <TeamProfileModal
          teamId={profileTeamId}
          onClose={() => setProfileTeamId(null)}
          onChallenge={() => setProfileTeamId(null)}
        />
      )}

      {acceptedMatch && (
        <AcceptedMatchModal
          match={acceptedMatch}
          onClose={() => setAcceptedMatch(null)}
        />
      )}

      {scoreMatch && (
        <ReportScoreModal
          match={scoreMatch}
          onClose={() => setScoreMatch(null)}
          onSubmitted={fetchRequests}
        />
      )}

      {confirmMatch && (
        <ConfirmScoreModal
          match={confirmMatch}
          onClose={() => setConfirmMatch(null)}
          onConfirmed={fetchRequests}
          onDisputed={fetchRequests}
        />
      )}

      {detailRequest && (
        <DemandFollowUpModal
          request={detailRequest}
          onClose={() => setDetailRequest(null)}
          onCancel={handleCancel}
          cancellingId={cancellingId}
          onViewAccepted={(req) => { setDetailRequest(null); setAcceptedMatch(req); }}
        />
      )}
    </div>
  );
}

function DemandFollowUpModal({ request, onClose, onCancel, onViewAccepted, cancellingId }) {
  const { t } = useTranslation();
  const badge = STATUS_BADGE[request.status] || STATUS_BADGE.open;
  const managerPhone = request.opponent_team?.manager?.phone || request.host_team?.manager?.phone;

  const whatsappUrl = managerPhone
    ? `https://wa.me/212${managerPhone.replace(/^0/, '')}?text=${encodeURIComponent(
        t('dashboard.whatsappGreeting', {
          host: request.host_team?.name || t('dashboard.myRequests'),
          opp: request.opponent_team?.name || t('dashboard.myRequests'),
          date: formatDate(request.match_datetime),
        })
      )}`
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-base font-black text-gray-800">{t('dashboard.requestDetails')}</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
            <X size={16} className="text-gray-400" />
          </button>
        </div>

        <div className={`px-3 py-2 rounded-xl text-center text-sm font-bold ${badge.color}`}>
          {t(badge.labelKey)}
        </div>

        <div className="space-y-3 text-sm">
          {request.custom_terrain_name && (
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-gray-400" />
              <span className="text-gray-700">{request.custom_terrain_name}</span>
            </div>
          )}
          {request.stadium && (
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-gray-400" />
              <span className="text-gray-700">{request.stadium.name} — {request.stadium.city}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Calendar size={14} className="text-gray-400" />
            <span className="text-gray-700" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {formatDate(request.match_datetime)}{' '}
              {formatTime(request.match_datetime)}
            </span>
          </div>

          {request.opponent_team && (
            <div className="flex items-center gap-2">
              <Swords size={14} className="text-blue-500" />
              <span className="text-blue-700 font-medium">{t('dashboard.opponentLabel', { name: request.opponent_team.name })}</span>
            </div>
          )}

          {request.target_team && (
            <div className="flex items-center gap-2">
              <Target size={14} className="text-orange-500" />
              <span className="text-orange-700 font-medium">{t('dashboard.targetedChallenge', { name: request.target_team.name })}</span>
            </div>
          )}

          {request.host_team && request.status === 'accepted' && (
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-green-500" />
              <span className="text-green-700 font-medium">{t('dashboard.hostLabel', { name: request.host_team.name })}</span>
            </div>
          )}

          {request.notes && (
            <div className="bg-gray-50 rounded-lg p-3 text-gray-600 text-xs">
              {request.notes}
            </div>
          )}

          {request.price_per_player && (
            <div className="flex items-center gap-1">
              <Banknote size={14} className="text-green-600" />
              <span className="text-sm font-medium text-green-700">
                {t('dashboard.perPlayerPrice', { price: Number(request.price_per_player).toLocaleString('ar-MA') })}
              </span>
            </div>
          )}

          {request.host_score !== null && request.opponent_score !== null && (
            <div className="text-center py-3">
              <span className="text-lg font-black text-gray-800 bg-gray-100 px-6 py-2 rounded-xl">
                {request.host_score} - {request.opponent_score}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 pt-2">
          {request.status === 'open' && (
            <button
              onClick={() => onCancel(request.id)}
              disabled={cancellingId === request.id}
              className="w-full flex items-center justify-center gap-2 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-sm font-bold transition"
            >
              {cancellingId === request.id ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <XCircle size={16} />
              )}
              {cancellingId === request.id ? t('common.submitting') : t('dashboard.cancelRequest')}
            </button>
          )}

          {request.status === 'accepted' && (
            <button
              onClick={() => onViewAccepted(request)}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold transition"
            >
              <CheckCircle size={16} />
              {t('dashboard.viewFullDetails')}
            </button>
          )}

          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#25D366] hover:bg-[#20BD5B] text-white rounded-xl text-sm font-bold transition"
            >
              <MessageCircle size={16} />
              {t('dashboard.continueWhatsApp')}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
