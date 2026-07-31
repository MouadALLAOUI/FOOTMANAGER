import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight } from 'lucide-react';

export default function PendingApproval() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.06] grid-bg pointer-events-none" />
      <div className="absolute -top-24 -start-24 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -end-24 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md text-center relative z-10">
        <div className="bg-slate-900/70 backdrop-blur-md border border-slate-700/80 rounded-2xl p-8 shadow-2xl shadow-black/30">
          <div className="w-20 h-20 rounded-2xl bg-amber-400/15 border border-amber-400/30 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/10">
            <Clock size={40} className="text-amber-300" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-4">{t('auth.pendingApproval')}</h1>

          <p className="text-slate-400 leading-relaxed mb-8">
            {t('auth.pendingReviewMessage')}
          </p>

          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium transition"
          >
            <ArrowRight size={18} className="rtl:rotate-180" />
            {t('auth.login')}
          </Link>
        </div>
      </div>
    </div>
  );
}
