import { useTranslation } from 'react-i18next';
import { Landmark, ShieldCheck, Sparkles, Target, Users } from 'lucide-react';
import LandingHeader from '../../components/Landing/LandingHeader';

export default function AboutUsPage() {
  const { t } = useTranslation();
  const values = t('about.values', { returnObjects: true });
  const stats = t('about.stats', { returnObjects: true });

  return (
    <div className="min-h-screen bg-slate-950">
      <LandingHeader />
      <main className="pt-24 pb-20">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-600/15 via-slate-900 to-slate-950" />
          <div className="absolute inset-0 opacity-[0.06] grid-bg pointer-events-none" />
          <div className="absolute -top-24 start-1/3 w-96 h-96 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-4xl mx-auto px-4 text-center pt-16 pb-12">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 text-xs font-semibold">
              <Sparkles size={14} />
              {t('common.appName')}
            </span>
            <h1 className="mt-5 text-4xl sm:text-6xl font-black text-white tracking-tight">{t('about.heroTitle')}</h1>
            <p className="mt-4 text-lg sm:text-xl text-slate-300">{t('about.heroSubtitle')}</p>
          </div>
        </section>

        <section className="max-w-4xl mx-auto px-4">
          <div className="rounded-3xl bg-slate-900/70 backdrop-blur-md border border-slate-800 p-8 sm:p-12 text-center shadow-2xl shadow-black/30">
            <span className="w-14 h-14 mx-auto rounded-2xl bg-emerald-400/15 flex items-center justify-center">
              <Target size={28} className="text-emerald-400" />
            </span>
            <h2 className="mt-5 text-2xl font-bold text-white">{t('about.missionTitle')}</h2>
            <p className="mt-4 text-slate-300 leading-relaxed max-w-2xl mx-auto">{t('about.missionText')}</p>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 mt-14">
          <h2 className="text-2xl font-bold text-white text-center">{t('about.statsTitle')}</h2>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl bg-slate-900/70 backdrop-blur-md border border-slate-800 p-6 text-center hover:border-emerald-400/40 transition">
                <div className="text-4xl font-black text-emerald-400">{s.value}</div>
                <div className="mt-2 text-sm text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 mt-14">
          <h2 className="text-2xl font-bold text-white text-center">{t('about.audienceTitle')}</h2>
          <div className="mt-8 grid sm:grid-cols-2 gap-5">
            <div className="rounded-2xl bg-slate-900/70 backdrop-blur-md border border-slate-800 p-7">
              <span className="w-12 h-12 rounded-xl bg-emerald-400/15 flex items-center justify-center">
                <Users size={24} className="text-emerald-400" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-white">{t('about.managersTitle')}</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">{t('about.managersDesc')}</p>
            </div>
            <div className="rounded-2xl bg-slate-900/70 backdrop-blur-md border border-slate-800 p-7">
              <span className="w-12 h-12 rounded-xl bg-emerald-400/15 flex items-center justify-center">
                <Landmark size={24} className="text-emerald-400" />
              </span>
              <h3 className="mt-4 text-lg font-bold text-white">{t('about.ownersTitle')}</h3>
              <p className="mt-2 text-sm text-slate-400 leading-relaxed">{t('about.ownersDesc')}</p>
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-4 mt-14">
          <h2 className="text-2xl font-bold text-white text-center">{t('about.valuesTitle')}</h2>
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {values.map((v) => (
              <div key={v.title} className="rounded-2xl bg-slate-900/70 backdrop-blur-md border border-slate-800 p-6 text-center hover:border-emerald-400/40 transition">
                <span className="w-12 h-12 mx-auto rounded-xl bg-emerald-400/15 flex items-center justify-center">
                  <ShieldCheck size={24} className="text-emerald-400" />
                </span>
                <h3 className="mt-4 font-bold text-white">{v.title}</h3>
                <p className="mt-2 text-sm text-slate-400 leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
