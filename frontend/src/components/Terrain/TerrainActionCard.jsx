import { useTranslation } from 'react-i18next';
import { Swords, Building2 } from 'lucide-react';

export default function TerrainActionCard({ terrain, onAmicalMatch, onDirectBooking }) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <button
        onClick={onAmicalMatch}
        className="group relative overflow-hidden rounded-2xl border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/60 p-6 text-start transition-all duration-300 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100 hover:scale-[1.02] active:scale-[0.98]"
      >
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-blue-500 shadow-lg shadow-blue-200 flex items-center justify-center text-2xl shrink-0 transition-transform duration-300 group-hover:scale-110">
            <Swords size={26} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-black text-blue-800 mb-1">{t('booking.amicalMatch')}</h3>
            <p className="text-xs text-blue-600 leading-relaxed">
              {t('terrain.amicalDescription')}
            </p>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="bg-blue-200/70 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">⚔️ {t('match.challengeDarija')}</span>
              <span className="bg-blue-200/70 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full">🏟️ {t('booking.terrain')}</span>
            </div>
          </div>
        </div>
      </button>

      <button
        onClick={onDirectBooking}
        className="group relative overflow-hidden rounded-2xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/60 p-6 text-start transition-all duration-300 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-100 hover:scale-[1.02] active:scale-[0.98]"
      >
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-emerald-500 shadow-lg shadow-emerald-200 flex items-center justify-center text-2xl shrink-0 transition-transform duration-300 group-hover:scale-110">
            <Building2 size={26} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-black text-emerald-800 mb-1">{t('booking.directBooking')}</h3>
            <p className="text-xs text-emerald-600 leading-relaxed">
              {t('terrain.directDescription')}
            </p>
            <div className="flex items-center gap-1.5 mt-3">
              <span className="bg-emerald-200/70 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">🏃 {t('booking.training')}</span>
              <span className="bg-emerald-200/70 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full">🔒 {t('booking.private')}</span>
            </div>
          </div>
        </div>
      </button>
    </div>
  );
}
