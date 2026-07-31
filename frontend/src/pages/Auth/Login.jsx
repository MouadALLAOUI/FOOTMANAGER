import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { LogIn, User, Lock, AlertTriangle, Eye, EyeOff, Trophy } from 'lucide-react';

export default function Login() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [loginInput, setLoginInput] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const userData = await login(loginInput, password);
      if (userData.status === 'pending') {
        navigate('/pending');
      } else if (userData.role === 'admin') {
        navigate('/admin');
      } else if (userData.role === 'terrain_owner') {
        navigate('/terrain');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-3xl font-black text-white tracking-tight">
            {t('common.appName')}
          </h1>
          <p className="text-slate-400 mt-2">{t('auth.login')}</p>
        </div>

        <div className="bg-slate-900/70 backdrop-blur-md border border-slate-700/80 rounded-2xl p-8 shadow-2xl shadow-black/30">
          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 text-red-300 p-3 rounded-lg mb-6 text-sm border border-red-500/20">
              <AlertTriangle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('auth.email')} {t('common.or')} {t('auth.phone')}</label>
              <div className="relative">
                <input
                  type="text"
                  value={loginInput}
                  onChange={(e) => setLoginInput(e.target.value)}
                  required
                  className="w-full pe-10 ps-10 py-2.5 bg-slate-950/60 border border-slate-700 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-xl text-slate-100 placeholder:text-slate-500 outline-none transition"
                  placeholder="example@email.com / 0600000000"
                />
                <User className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-slate-300">{t('auth.password')}</label>
                <Link to="/forgot-password" className="text-xs text-emerald-400 hover:text-emerald-300 transition">
                  {t('auth.forgotPassword')}
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full pe-10 ps-10 py-2.5 bg-slate-950/60 border border-slate-700 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-xl text-slate-100 placeholder:text-slate-500 outline-none transition"
                  placeholder="••••••••"
                />
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold py-2.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <LogIn size={18} />
              {loading ? t('common.loading') : t('auth.login')}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/register" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition">
              {t('auth.noAccount')} {t('auth.register')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
