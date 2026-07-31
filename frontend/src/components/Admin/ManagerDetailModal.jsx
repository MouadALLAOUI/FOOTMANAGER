import { formatDate, formatTime } from '../../utils/dateFormatter';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, User, Users, MessageCircle, Check, XIcon, Ban, Undo2, PhoneCall } from 'lucide-react';

export default function ManagerDetailModal({ manager, onClose, onApprove, onReject, onBlock, onUnblock }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);

  const handleAction = async (action, fn) => {
    setLoading(action);
    await fn(manager.id);
    setLoading(null);
    onClose();
  };

  const team = manager.team;

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    blocked: 'bg-gray-200 text-gray-600',
  };

  const statusLabels = {
    pending: t('common.pending'),
    approved: t('common.accepted'),
    rejected: t('common.rejected'),
    blocked: t('common.blocked'),
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-gray-800">{t('admin.accountDetails')}</h2>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusColors[manager.status] || ''}`}>
              {statusLabels[manager.status] || manager.status}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Manager Section */}
          <div>
            <div className="flex items-center gap-2 text-green-700 mb-3">
              <User size={18} />
              <span className="font-semibold text-sm">{t('admin.managerSection')}</span>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('admin.fullName')}</span>
                <span className="text-sm font-medium text-gray-800">{manager.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('admin.phoneNumber')}</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-800" dir="ltr">{manager.phone}</span>
                  {manager.is_whatsapp && (
                    <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">
                      <MessageCircle size={12} />
                      {t('booking.whatsapp')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">{t('admin.email')}</span>
                <span className="text-sm font-medium text-gray-800">{manager.email || t('admin.notSpecified')}</span>
              </div>
            </div>

            {/* Contact Buttons */}
            {manager.phone && (
              <div className="flex items-center gap-2 mt-3">
                <a
                  href={`tel:${manager.phone}`}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 py-2 rounded-lg text-sm font-medium transition"
                >
                  <PhoneCall size={16} />
                  {t('admin.call')}
                </a>
                {manager.is_whatsapp && (
                  <a
                    href={`https://wa.me/${manager.phone?.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 py-2 rounded-lg text-sm font-medium transition"
                  >
                    <MessageCircle size={16} />
                    {t('booking.whatsapp')}
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Team Section */}
          {team && (
            <div>
              <div className="flex items-center gap-2 text-green-700 mb-3">
                <Users size={18} />
                <span className="font-semibold text-sm">{t('admin.teamSection')}</span>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{t('admin.teamName')}</span>
                  <span className="text-sm font-medium text-gray-800">{team.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{t('admin.memberCount')}</span>
                  <span className="text-sm font-medium text-gray-800">{team.member_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{t('admin.ageCategory')}</span>
                  <span className="text-sm font-medium text-gray-800">{t(`categories.${team.category}`)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{t('admin.association')}</span>
                  <span className="text-sm font-medium text-gray-800">{team.association_name || t('admin.independent')}</span>
                </div>
                {team.city && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{t('terrain.city')}</span>
                    <span className="text-sm font-medium text-gray-800">{team.city}</span>
                  </div>
                )}
                {team.primary_color && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">{t('admin.teamColors')}</span>
                    <div className="flex items-center gap-1.5">
                      {team.primary_color && (
                        <span className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: team.primary_color }} />
                      )}
                      {team.secondary_color && (
                        <span className="w-5 h-5 rounded-full border border-gray-200" style={{ backgroundColor: team.secondary_color }} />
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Date */}
          <div className="text-center text-xs text-gray-400">
            {t('admin.createdAt') + ' '}{formatDate(manager.created_at)}
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100">
          {!confirmAction ? (
            <div className="flex items-center gap-3">
              {manager.status === 'pending' && (
                <>
                  <button
                    onClick={() => setConfirmAction('approve')}
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium transition"
                  >
                    <Check size={16} />
                    {t('admin.approve')}
                  </button>
                  <button
                    onClick={() => setConfirmAction('reject')}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2.5 rounded-lg text-sm font-medium transition"
                  >
                    <XIcon size={16} />
                    {t('admin.reject')}
                  </button>
                </>
              )}
              {manager.status === 'approved' && onBlock && (
                <button
                  onClick={() => setConfirmAction('block')}
                  className="flex-1 flex items-center justify-center gap-2 border border-red-300 text-red-600 hover:bg-red-50 py-2.5 rounded-lg text-sm font-medium transition"
                >
                  <Ban size={16} />
                  {t('admin.blockAccount')}
                </button>
              )}
              {manager.status === 'blocked' && onUnblock && (
                <button
                  onClick={() => setConfirmAction('unblock')}
                  className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg text-sm font-medium transition"
                >
                  <Undo2 size={16} />
                  {t('admin.unblockAccount')}
                </button>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="flex-1 text-center text-sm text-gray-600">
                {confirmAction === 'approve' && t('admin.approveConfirm')}
                {confirmAction === 'reject' && t('admin.rejectConfirm')}
                {confirmAction === 'block' && t('admin.blockConfirm')}
                {confirmAction === 'unblock' && t('admin.unblockConfirm')}
              </div>
              <button
                onClick={() => setConfirmAction(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-600 text-sm hover:bg-gray-50 transition"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => {
                  if (confirmAction === 'approve') handleAction('approve', onApprove);
                  else if (confirmAction === 'reject') handleAction('reject', onReject);
                  else if (confirmAction === 'block') handleAction('block', onBlock);
                  else if (confirmAction === 'unblock') handleAction('unblock', onUnblock);
                }}
                disabled={loading}
                className={`px-4 py-2 rounded-lg text-white text-sm font-medium transition disabled:opacity-50 ${
                  confirmAction === 'approve' || confirmAction === 'unblock' ? 'bg-green-600 hover:bg-green-700' :
                  confirmAction === 'block' ? 'bg-orange-600 hover:bg-orange-700' :
                  'bg-red-600 hover:bg-red-700'
                }`}
              >
                {loading ? '...' : t('admin.confirm')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
