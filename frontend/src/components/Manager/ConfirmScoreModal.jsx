import { formatDate, formatTime } from '../../utils/dateFormatter';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';
import { X, AlertTriangle, CheckCircle, Loader2, Shield, XCircle } from 'lucide-react';

export default function ConfirmScoreModal({ match, onClose, onConfirmed, onDisputed }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const hostTeam = match.host_team;
  const opponentTeam = match.opponent_team;
  const submittedBy = match.score_submitted_by;

  const handleConfirm = async () => {
    setLoading('confirm');
    try {
      const res = await api.post(`/manager/matches/${match.id}/confirm-score`);
      setToast({ type: 'success', message: res.data.message });
      setTimeout(() => {
        onConfirmed();
        onClose();
      }, 1500);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || t('common.error') });
    } finally {
      setLoading(null);
    }
  };

  const handleDispute = async () => {
    setLoading('dispute');
    try {
      const res = await api.post(`/manager/matches/${match.id}/dispute-score`);
      setToast({ type: 'success', message: res.data.message });
      setTimeout(() => {
        onDisputed();
        onClose();
      }, 1500);
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || t('common.error') });
    } finally {
      setLoading(null);
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
            <Shield className="text-orange-600" size={18} />
            <h2 className="text-lg font-bold text-gray-800">{t('score.confirmScoreTitle')}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Alert */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="text-orange-600 mt-0.5 flex-shrink-0" size={16} />
              <div className="text-sm text-orange-800">
                {t('score.confirmAlertByName', { name: submittedBy?.name || '—' })}
              </div>
            </div>
          </div>

          {/* Score Display */}
          <div className="bg-gray-50 rounded-xl p-5">
            <div className="text-xs text-gray-400 text-center mb-3">
              {formatDate(match.match_datetime)}
            </div>
            <div className="flex items-center justify-center gap-6">
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-800 mb-2">{hostTeam?.name}</div>
                <div className="text-3xl font-bold text-gray-800 bg-white border border-gray-200 rounded-xl w-16 h-16 flex items-center justify-center">
                  {match.host_score}
                </div>
              </div>
              <div className="text-gray-400 text-lg">—</div>
              <div className="text-center">
                <div className="text-sm font-semibold text-gray-800 mb-2">{opponentTeam?.name}</div>
                <div className="text-3xl font-bold text-gray-800 bg-white border border-gray-200 rounded-xl w-16 h-16 flex items-center justify-center">
                  {match.opponent_score}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleDispute}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {loading === 'dispute' ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
              {t('score.dispute')}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              {loading === 'confirm' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              {t('score.confirmScore')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
