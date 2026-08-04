import { useTranslation } from 'react-i18next';
import { X, Check, XIcon, Ban, Undo2, Phone, MessageCircle, Landmark, MapPin, Banknote, Armchair, Trophy, Lightbulb, ShowerHead } from 'lucide-react';

export default function TerrainOwnerDetailModal({ owner, onClose, onApprove, onReject, onBlock, onUnblock }) {
  const { t } = useTranslation();

  const TYPE_MAP = {
    minifoot: { label: t('terrain.minifoot'), color: 'bg-green-100 text-green-700' },
    salle: { label: t('terrain.salle'), color: 'bg-blue-100 text-blue-700' },
    grass: { label: t('terrain.grass'), color: 'bg-emerald-100 text-emerald-700' },
    synthetic: { label: t('terrain.synthetic'), color: 'bg-teal-100 text-teal-700' },
    cement: { label: t('terrain.cement'), color: 'bg-orange-100 text-orange-700' },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-800">{t('admin.ownerInfo')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition"><X size={20} /></button>
        </div>
        <div className="p-6 space-y-5">
          {/* Owner Info */}
          <div className="bg-emerald-50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold">
                <Landmark size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">{owner.name}</h3>
                <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${
                  owner.status === 'approved' ? 'bg-green-100 text-green-700' :
                  owner.status === 'blocked' ? 'bg-gray-200 text-gray-600' :
                  owner.status === 'rejected' ? 'bg-red-100 text-red-600' :
                  'bg-yellow-100 text-yellow-700'
                }`}>
                  {owner.status === 'approved' ? t('common.accepted') : owner.status === 'blocked' ? t('common.blocked') : owner.status === 'rejected' ? t('common.rejected') : t('common.pending')}
                </span>
              </div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-2">
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <Phone size={16} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">{t('admin.phoneNumber')}</p>
                <p className="text-sm font-medium text-gray-800" dir="ltr">{owner.phone}</p>
              </div>
              {owner.is_whatsapp && (
                <div className="me-auto">
                  <MessageCircle size={16} className="text-green-600" />
                </div>
              )}
            </div>
          </div>

          {/* Terrains */}
          {owner.terrains && owner.terrains.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-gray-700 mb-2">{t('admin.terrainCount', { count: owner.terrains.length })}</h4>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {owner.terrains.map((terrain) => {
                  const typeInfo = TYPE_MAP[terrain.type] || TYPE_MAP.minifoot;
                  return (
                    <div key={terrain.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                        <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full">
                          {terrain.player_format}
                        </span>
                      </div>
                      <div className="font-medium text-sm text-gray-800">{terrain.name}</div>
                      <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> {terrain.city}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                          <Banknote size={10} /> {terrain.price_per_team} {t('common.currency')}{t('common.perTeam')}
                        </span>
                        {terrain.total_price && (
                          <span className="text-xs text-blue-700 font-medium flex items-center gap-1">
                            <Banknote size={10} /> {terrain.total_price} {t('common.currency')}{t('common.perMatch')}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {terrain.has_benches && <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Armchair size={8} /> {t('terrainForm.benches')}</span>}
                        {terrain.supports_tournaments && <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Trophy size={8} /> {t('terrainForm.tournaments')}</span>}
                        {terrain.has_lighting && <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Lightbulb size={8} /> {t('terrainForm.lighting')}</span>}
                        {terrain.has_vestiaires && <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded flex items-center gap-0.5"><ShowerHead size={8} /> {t('terrainForm.vestiaires')}</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2">
          {owner.status === 'pending' && (
            <>
              <button onClick={() => { onApprove(owner.id); onClose(); }} className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition">
                <Check size={16} /> {t('actions.approve')}
              </button>
              <button onClick={() => { onReject(owner.id); onClose(); }} className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition">
                <XIcon size={16} /> {t('actions.reject')}
              </button>
            </>
          )}
          {owner.status === 'approved' && (
            <button onClick={() => { onBlock(owner.id); onClose(); }} className="flex-1 flex items-center justify-center gap-1 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition">
              <Ban size={16} /> {t('admin.blockAccount')}
            </button>
          )}
          {owner.status === 'blocked' && (
            <button onClick={() => { onUnblock(owner.id); onClose(); }} className="flex-1 flex items-center justify-center gap-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition">
              <Undo2 size={16} /> {t('admin.unblockAccount')}
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg text-sm transition">
            {t('actions.close')}
          </button>
        </div>
      </div>
    </div>
  );
}
