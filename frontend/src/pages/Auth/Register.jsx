import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserPlus, User, AlertTriangle, Info, ChevronLeft, ChevronRight, Shield, Users, Building, Landmark, Eye, EyeOff, Trophy } from 'lucide-react';
import api from '../../services/api';

const MANAGER_STEPS = [
  { key: 'manager', icon: User, label: 'auth.managerInfo' },
  { key: 'team', icon: Users, label: 'auth.teamInfo' },
  { key: 'association', icon: Building, label: 'auth.associationInfo' },
];

const TERRAIN_STEPS = [
  { key: 'owner', icon: Landmark, label: 'auth.personalInfo' },
];

const CATEGORIES = ['adult', 'teenager', 'children'];

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [regType, setRegType] = useState(null);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [stepErrors, setStepErrors] = useState({});

  const [form, setForm] = useState({
    name: '',
    phone: '',
    is_whatsapp: false,
    email: '',
    password: '',
    team_name: '',
    member_count: '',
    team_category: '',
    association_name: '',
  });

  const steps = regType === 'terrain_owner' ? TERRAIN_STEPS : MANAGER_STEPS;

  const inputCls = (invalid) =>
    `w-full py-2.5 px-4 bg-slate-950/60 border rounded-xl focus:ring-2 focus:ring-emerald-400/20 focus:border-emerald-400 outline-none transition text-sm text-slate-100 placeholder:text-slate-500 ${invalid ? 'border-red-500' : 'border-slate-700'}`;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (stepErrors[name]) setStepErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validateStep = () => {
    const errors = {};
    if (regType === 'terrain_owner') {
      if (!form.name.trim()) errors.name = t('auth.nameRequired');
      if (!form.phone.trim()) errors.phone = t('auth.phoneRequired');
      if (!form.password || form.password.length < 6) errors.password = t('auth.passwordMin');
    } else {
      if (step === 0) {
        if (!form.name.trim()) errors.name = t('auth.nameRequired');
        if (!form.phone.trim()) errors.phone = t('auth.phoneRequired');
        if (!form.password || form.password.length < 6) errors.password = t('auth.passwordMin');
      } else if (step === 1) {
        if (!form.team_name.trim()) errors.team_name = t('auth.teamNameRequired');
        if (!form.member_count || parseInt(form.member_count) < 1) errors.member_count = t('auth.memberCountRequired');
        if (!form.team_category) errors.team_category = t('auth.categoryRequired');
      }
    }
    setStepErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep()) {
      if (step < steps.length - 1) {
        setStep((prev) => prev + 1);
        setError('');
      }
    }
  };

  const handlePrev = () => {
    setStep((prev) => Math.max(prev - 1, 0));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep()) return;
    setError('');
    setLoading(true);

    try {
      if (regType === 'terrain_owner') {
        await api.post('/register-terrain-owner', {
          name: form.name,
          phone: form.phone,
          is_whatsapp: form.is_whatsapp,
          email: form.email || undefined,
          password: form.password,
        });
      } else {
        await api.post('/register', {
          name: form.name,
          phone: form.phone,
          is_whatsapp: form.is_whatsapp,
          email: form.email || undefined,
          password: form.password,
          team_name: form.team_name,
          member_count: parseInt(form.member_count),
          team_category: form.team_category,
          association_name: form.association_name || undefined,
        });
      }
      navigate('/pending');
    } catch (err) {
      const errors = err.response?.data?.errors;
      if (errors) {
        setError(Object.values(errors).flat().join(' '));
      } else {
        setError(err.response?.data?.message || t('common.error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const Header = ({ subtitle }) => (
    <div className="text-center mb-8">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-700 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/25">
        <Trophy size={26} className="text-white" />
      </div>
      <h1 className="text-3xl font-black text-white tracking-tight">{t('common.appName')}</h1>
      <p className="text-slate-400 mt-2">{subtitle}</p>
    </div>
  );

  const Card = ({ children }) => (
    <div className="bg-slate-900/70 backdrop-blur-md border border-slate-700/80 rounded-2xl p-8 shadow-2xl shadow-black/30">
      {children}
    </div>
  );

  if (!regType) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center px-4 py-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.06] grid-bg pointer-events-none" />
        <div className="absolute -top-24 -start-24 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -end-24 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          <Header subtitle={t('auth.register')} />
          <Card>
            <h2 className="text-lg font-bold text-white mb-6 text-center">{t('auth.chooseAccountType')}</h2>
            <div className="space-y-4">
              <button
                onClick={() => setRegType('manager')}
                className="w-full flex items-center gap-4 p-5 border-2 border-slate-700 hover:border-emerald-400 hover:bg-emerald-400/5 rounded-xl transition group"
              >
                <div className="w-14 h-14 bg-emerald-400/10 rounded-xl flex items-center justify-center group-hover:bg-emerald-400/20 transition">
                  <Users size={28} className="text-emerald-400" />
                </div>
                <div className="text-start">
                  <h3 className="font-bold text-white text-lg">{t('auth.registerAsManager')}</h3>
                  <p className="text-sm text-slate-400 mt-0.5">{t('auth.managerAccountDesc')}</p>
                </div>
                <ChevronLeft size={20} className="me-auto text-slate-500 group-hover:text-emerald-400" />
              </button>

              <button
                onClick={() => setRegType('terrain_owner')}
                className="w-full flex items-center gap-4 p-5 border-2 border-slate-700 hover:border-teal-400 hover:bg-teal-400/5 rounded-xl transition group"
              >
                <div className="w-14 h-14 bg-teal-400/10 rounded-xl flex items-center justify-center group-hover:bg-teal-400/20 transition">
                  <Landmark size={28} className="text-teal-400" />
                </div>
                <div className="text-start">
                  <h3 className="font-bold text-white text-lg">{t('auth.registerAsTerrainOwner')}</h3>
                  <p className="text-sm text-slate-400 mt-0.5">{t('auth.ownerAccountDesc')}</p>
                </div>
                <ChevronLeft size={20} className="me-auto text-slate-500 group-hover:text-teal-400" />
              </button>
            </div>
            <div className="mt-6 text-center">
              <Link to="/login" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition">
                {t('auth.hasAccount')} {t('auth.login')}
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.06] grid-bg pointer-events-none" />
      <div className="absolute -top-24 -start-24 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -end-24 w-80 h-80 rounded-full bg-teal-500/10 blur-3xl pointer-events-none" />

      <div className="w-full max-w-lg relative z-10">
        <Header subtitle={regType === 'terrain_owner' ? t('auth.registerAsTerrainOwner') : t('auth.registerAsManager')} />

        <Card>
          {steps.length > 1 && (
            <div className="flex items-center justify-between mb-8">
              {steps.map((s, i) => {
                const Icon = s.icon;
                const isActive = i === step;
                const isDone = i < step;
                return (
                  <div key={s.key} className="flex-1 flex flex-col items-center relative">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition ${
                      isDone ? 'bg-emerald-400 text-slate-950' :
                      isActive ? 'bg-emerald-400/15 text-emerald-300 ring-2 ring-emerald-400' :
                      'bg-slate-800 text-slate-500'
                    }`}>
                      {isDone ? '✓' : i + 1}
                    </div>
                    <span className={`text-xs mt-2 text-center ${isActive ? 'text-emerald-300 font-medium' : 'text-slate-500'}`}>
                      {t(s.label)}
                    </span>
                    {i < steps.length - 1 && (
                      <div className={`absolute top-5 start-full w-full h-0.5 -translate-x-1/2 ${isDone ? 'bg-emerald-400' : 'bg-slate-700'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 bg-red-500/10 text-red-300 p-3 rounded-lg mb-6 text-sm border border-red-500/20">
              <AlertTriangle size={18} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Manager Step 0 or Terrain Owner */}
          {(step === 0 || regType === 'terrain_owner') && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                {regType === 'terrain_owner' ? <Landmark size={20} /> : <User size={20} />}
                <span className="font-semibold">{regType === 'terrain_owner' ? t('auth.personalInfo') : t('auth.managerInfo')}</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('auth.fullName')}</label>
                <input type="text" name="name" value={form.name} onChange={handleChange}
                  className={inputCls(stepErrors.name)}
                  placeholder={t('auth.fullNamePlaceholder')} />
                {stepErrors.name && <p className="text-red-400 text-xs mt-1">{stepErrors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('auth.phoneLabel')}</label>
                <input type="tel" name="phone" value={form.phone} onChange={handleChange}
                  className={inputCls(stepErrors.phone)}
                  placeholder="0600000000" />
                {stepErrors.phone && <p className="text-red-400 text-xs mt-1">{stepErrors.phone}</p>}
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" name="is_whatsapp" checked={form.is_whatsapp} onChange={handleChange}
                  className="w-4 h-4 text-emerald-400 border-slate-600 rounded focus:ring-emerald-400 bg-slate-950/60" />
                <span className="text-sm text-slate-300">{t('auth.hasWhatsapp')}</span>
              </label>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('auth.emailOptional')}</label>
                <input type="email" name="email" value={form.email} onChange={handleChange}
                  className={inputCls(false)}
                  placeholder="example@email.com" />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('auth.password')} *</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                    className={`${inputCls(stepErrors.password)} pe-10`}
                    placeholder="••••••••" />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {stepErrors.password && <p className="text-red-400 text-xs mt-1">{stepErrors.password}</p>}
              </div>

              {regType === 'terrain_owner' && (
                <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-4 rounded-lg text-sm">
                  <Shield size={18} />
                  <span>{t('auth.pendingMessage')}</span>
                </div>
              )}
            </div>
          )}

          {/* Manager Step 1: Team Info */}
          {regType === 'manager' && step === 1 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <Users size={20} />
                <span className="font-semibold">{t('auth.teamInfo')}</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('auth.teamNameLabel')}</label>
                <input type="text" name="team_name" value={form.team_name} onChange={handleChange}
                  className={inputCls(stepErrors.team_name)}
                  placeholder={t('auth.teamNamePlaceholder')} />
                {stepErrors.team_name && <p className="text-red-400 text-xs mt-1">{stepErrors.team_name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('auth.memberCountLabel')}</label>
                <input type="number" name="member_count" value={form.member_count} onChange={handleChange} min="1"
                  className={inputCls(stepErrors.member_count)}
                  placeholder={t('auth.memberCountPlaceholder')} />
                {stepErrors.member_count && <p className="text-red-400 text-xs mt-1">{stepErrors.member_count}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">{t('auth.ageCategory')}</label>
                <div className="grid grid-cols-3 gap-3">
                  {CATEGORIES.map((cat) => (
                    <label key={cat}
                      className={`flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition text-sm ${
                        form.team_category === cat ? 'border-emerald-400 bg-emerald-400/10 text-emerald-300 font-medium' : 'border-slate-700 hover:border-slate-600 text-slate-400'
                      }`}>
                      <input type="radio" name="team_category" value={cat} checked={form.team_category === cat} onChange={handleChange} className="sr-only" />
                      {t(`categories.${cat}`)}
                    </label>
                  ))}
                </div>
                {stepErrors.team_category && <p className="text-red-400 text-xs mt-1">{stepErrors.team_category}</p>}
              </div>
            </div>
          )}

          {/* Manager Step 2: Association */}
          {regType === 'manager' && step === 2 && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-emerald-400 mb-2">
                <Building size={20} />
                <span className="font-semibold">{t('auth.associationInfo')}</span>
              </div>

              <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 text-blue-300 p-3 rounded-lg text-sm">
                <Info size={18} />
                <span>{t('auth.associationHint')}</span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">{t('auth.associationNameLabel')}</label>
                <input type="text" name="association_name" value={form.association_name} onChange={handleChange}
                  className={inputCls(false)}
                  placeholder={t('auth.associationNamePlaceholder')} />
              </div>

              <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 p-4 rounded-lg text-sm">
                <Shield size={18} />
                <span>{t('auth.pendingApproval')}</span>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <div className="flex gap-2">
              <button type="button" onClick={() => { setRegType(null); setStep(0); setError(''); }}
                className="px-4 py-2.5 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition text-sm">
                {t('common.back')}
              </button>
              {step > 0 && (
                <button type="button" onClick={handlePrev}
                  className="flex items-center gap-2 px-5 py-2.5 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition text-sm">
                  <ChevronRight size={16} /> {t('auth.previous')}
                </button>
              )}
            </div>

            {(step < steps.length - 1 && regType === 'manager') ? (
              <button type="button" onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-400 hover:bg-emerald-300 text-slate-950 rounded-lg transition text-sm font-bold">
                {t('common.next')} <ChevronLeft size={16} />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={loading}
                className={`flex items-center gap-2 px-5 py-2.5 text-slate-950 rounded-lg transition text-sm font-bold disabled:opacity-50 ${
                  regType === 'terrain_owner' ? 'bg-teal-400 hover:bg-teal-300' : 'bg-emerald-400 hover:bg-emerald-300'
                }`}>
                <UserPlus size={16} />
                {loading ? t('common.loading') : t('auth.submitRequest')}
              </button>
            )}
          </div>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition">
              {t('auth.hasAccount')} {t('auth.login')}
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
