import { formatDate, formatTime } from '../../utils/dateFormatter';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { X, Trophy, Minus, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';

export default function ReportScoreModal({ match, onClose, onSubmitted }) {
  const { t } = useTranslation();
  const [hostScore, setHostScore] = useState('');
  const [opponentScore, setOpponentScore] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const hostTeam = match.host_team;
  const opponentTeam = match.opponent_team;

  const handleSubmit = async (e) => {
    e.preventDefault();

    const hScore = parseInt(hostScore, 10);
    const oScore = parseInt(opponentScore, 10);

    if (isNaN(hScore) || isNaN(oScore) || hScore < 0 || oScore < 0) {
      setToast({ type: 'error', message: t('score.invalidScore') });
      return;
    }

    setLoading(true);
    try {
      const res = await api.post(`/manager/matches/${match.id}/submit-score`, {
        host_score: hScore,
        opponent_score: oScore,
      });
      setToast({ type: 'success', message: res.data.message });
      setTimeout(() => {
        onSubmitted();
        onClose();
      }, 1500);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || t('common.error') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Toast */}
        {toast && (
          <div className={`absolute -top-14 start-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white z-10 ${
            toast.type === 'error' ? 'bg-red-600' : 'bg-green-600'
          }`}>
            {toast.type === 'error' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
            {toast.message}
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Trophy className="text-green-600" size={18} />
            <h2 className="text-lg font-bold text-gray-800">{t('score.reportScoreTitle')}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Match Info */}
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <div className="text-xs text-gray-400 mb-2">
              {formatDate(match.match_datetime)}{' '}
              {formatTime(match.match_datetime)}
            </div>
            <div className="flex items-center justify-center gap-3">
              <span className="text-sm font-bold text-gray-800">{hostTeam?.name}</span>
              <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded-full">{t('score.vs')}</span>
              <span className="text-sm font-bold text-gray-800">{opponentTeam?.name}</span>
            </div>
          </div>

          {/* Score Inputs */}
          <div className="flex items-center gap-4">
            <div className="flex-1 text-center">
              <label className="block text-xs text-gray-500 mb-2">{hostTeam?.name}</label>
              <input
                type="number"
                min="0"
                value={hostScore}
                onChange={(e) => setHostScore(e.target.value)}
                className="w-full text-center text-2xl font-bold border border-gray-300 rounded-xl py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
                required
              />
            </div>

            <div className="flex flex-col items-center pt-6">
              <Minus size={20} className="text-gray-400" />
            </div>

            <div className="flex-1 text-center">
              <label className="block text-xs text-gray-500 mb-2">{opponentTeam?.name}</label>
              <input
                type="number"
                min="0"
                value={opponentScore}
                onChange={(e) => setOpponentScore(e.target.value)}
                className="w-full text-center text-2xl font-bold border border-gray-300 rounded-xl py-3 focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="0"
                required
              />
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center">
            {t('score.willNotifyOpponent')}
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-lg text-gray-600 text-sm hover:bg-gray-50 transition"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || hostScore === '' || opponentScore === ''}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Trophy size={16} />}
              {t('score.submitScore')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
