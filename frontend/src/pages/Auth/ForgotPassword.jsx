import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { KeyRound, Phone, AlertTriangle, ArrowRight, Trophy } from 'lucide-react';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [account, setAccount] = useState('');
  const [submitted, setSubmitted] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.06] grid-bg pointer-events-none" />
      <div className="absolute -top-24 -start-24 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -end-24 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/25">
            <Trophy size={26} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">{t('auth.forgotTitle')}</h1>
          <p className="text-slate-400 mt-2 text-sm leading-relaxed">{t('auth.forgotSubtitle')}</p>
        </div>

        <div className="bg-slate-900/70 backdrop-blur-md border border-slate-700/80 rounded-2xl p-8 shadow-2xl shadow-black/30">
          {submitted ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center mx-auto mb-5">
                <KeyRound size={28} className="text-emerald-400" />
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{t('auth.forgotSuccess')}</p>
              <Link
                to="/login"
                className="mt-6 inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-medium text-sm transition"
              >
                {t('auth.backToLogin')}
                <ArrowRight size={16} className="rtl:rotate-180" />
              </Link>
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); if (account.trim()) setSubmitted(true); }}
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  {t('auth.email')} {t('common.or')} {t('auth.phone')}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={account}
                    onChange={(e) => setAccount(e.target.value)}
                    required
                    className="w-full pe-10 ps-10 py-2.5 bg-slate-950/60 border border-slate-700 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-xl text-slate-100 placeholder:text-slate-500 outline-none transition"
                    placeholder="example@email.com / 0600000000"
                  />
                  <Phone className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                </div>
              </div>

              <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 text-amber-300 p-3 rounded-lg text-xs leading-relaxed">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{t('auth.forgotSubtitle')}</span>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold py-2.5 rounded-xl transition"
              >
                <KeyRound size={18} />
                {t('auth.forgotSubmit')}
              </button>

              <div className="text-center">
                <Link to="/login" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition">
                  {t('auth.backToLogin')}
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
