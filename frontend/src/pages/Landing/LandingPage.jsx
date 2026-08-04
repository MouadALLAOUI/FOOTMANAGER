import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar, CheckCircle2, ChevronDown, Clock, HelpCircle, Mail, MapPin,
  MessageSquare, Phone, Send, ShieldCheck, Sparkles, Trophy, Users,
} from 'lucide-react';
import LandingHeader from '../../components/Landing/LandingHeader';

const SLOT_ROWS = [
  ['booked', 'closed', 'avail', 'avail', 'booked', 'closed', 'closed'],
  ['avail', 'avail', 'booked', 'avail', 'avail', 'booked', 'closed'],
  ['closed', 'avail', 'avail', 'booked', 'closed', 'avail', 'avail'],
  ['avail', 'closed', 'avail', 'avail', 'avail', 'avail', 'booked'],
];

const RANKINGS = [
  { rank: 1, team: 'landing.samples.alAhlyCasablanca', pts: 32, gold: true },
  { rank: 2, team: 'landing.samples.atlasLions', pts: 28 },
  { rank: 3, team: 'landing.samples.rajaaTaza', pts: 25 },
];

function Section({ id, from = 'from-emerald-600/20', children }) {
  return (
    <section id={id} className="min-h-screen w-full snap-start flex flex-col relative overflow-hidden bg-slate-950">
      <div className={`absolute inset-0 bg-gradient-to-br ${from} via-slate-900 to-slate-950`} />
      <div className="absolute inset-0 opacity-[0.06] grid-bg pointer-events-none" />
      <div className="absolute -top-24 -start-24 w-80 h-80 rounded-full bg-emerald-500/15 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -end-24 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />
      <div className="relative z-10 flex-1 w-full">
        <div className="min-h-full m-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 flex flex-col justify-center">
          {children}
        </div>
      </div>
    </section>
  );
}

function FloatBadge({ icon: Icon, value, delay = false, slow = false }) {
  const anim = slow ? 'animate-float-slow' : delay ? 'animate-float-delayed' : 'animate-float';
  return (
    <div className={`${anim} flex items-center gap-3 px-5 py-3 rounded-2xl bg-slate-900/70 backdrop-blur-md border border-slate-700/80 shadow-xl shadow-black/30`}>
      <span className="w-9 h-9 rounded-lg bg-emerald-400/15 flex items-center justify-center">
        <Icon size={18} className="text-emerald-400" />
      </span>
      <span className="text-sm font-semibold text-slate-100">{value}</span>
    </div>
  );
}

function FeatureOne({ t }) {
  return (
    <div className="grid lg:grid-cols-5 gap-6 items-stretch">
      <div className="lg:col-span-3 rounded-2xl bg-slate-900/70 backdrop-blur-md border border-slate-700/80 p-6 shadow-2xl shadow-black/30">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-slate-100">{t('landing.features.match.cardTitle')}</span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 bg-emerald-400/10 border border-emerald-400/30 rounded-full px-3 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {t('landing.features.match.cardStatus')}
          </span>
        </div>
        <div className="mt-6 grid grid-cols-3 items-center gap-2">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center">
              <Users size={20} className="text-emerald-400" />
            </div>
            <p className="mt-2 text-sm font-semibold text-white">{t('landing.samples.atlasCasablanca')}</p>
            <p className="text-[11px] text-slate-400">56 pts</p>
          </div>
          <div className="text-center text-slate-500 text-xs font-bold uppercase">{t('landing.features.match.cardVs')}</div>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 border border-dashed border-slate-600 flex items-center justify-center">
              <HelpCircle size={20} className="text-slate-500" />
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-300">{t('landing.features.match.cardOpponent')}</p>
            <p className="text-[11px] text-slate-500">-</p>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-between text-xs text-slate-400">
          <span className="flex items-center gap-1.5"><MapPin size={14} /> {t('landing.features.match.cardStadium')}</span>
          <span className="flex items-center gap-1.5"><Clock size={14} /> {t('landing.features.match.cardTime')}</span>
        </div>
        <div className="mt-5 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-sm font-bold transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer">
          <MessageSquare size={16} />
          {t('landing.features.match.cardCta')}
        </div>
      </div>

      <div className="lg:col-span-2 rounded-2xl bg-slate-900/70 backdrop-blur-md border border-slate-700/80 p-6 shadow-2xl shadow-black/30">
        <span className="flex items-center gap-2 text-sm font-bold text-slate-100">
          <Trophy size={16} className="text-amber-400" />
          {t('landing.features.match.rankTitle')}
        </span>
        <div className="mt-5 space-y-3">
          {RANKINGS.map((r) => (
            <div key={r.rank} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-slate-800">
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${r.gold ? 'bg-amber-400/20 text-amber-300' : 'bg-slate-800 text-slate-400'}`}>
                {r.rank}
              </span>
              <span className="flex-1 text-sm font-medium text-slate-200 truncate">{t(r.team)}</span>
              <span className="text-sm font-bold text-emerald-400">{r.pts}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureTwo({ t }) {
  const days = t('landing.features.terrain.shortDays', { returnObjects: true });
  const facilities = t('landing.features.terrain.facilities', { returnObjects: true });

  const cellClass = {
    avail: 'bg-emerald-400/20 text-emerald-300',
    booked: 'bg-amber-400/20 text-amber-300',
    closed: 'bg-slate-800/80 text-slate-600',
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6 items-stretch">
      <div className="lg:col-span-3 rounded-2xl bg-slate-900/70 backdrop-blur-md border border-slate-700/80 p-6 shadow-2xl shadow-black/30">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="flex items-center gap-2 text-sm font-bold text-slate-100">
            <Calendar size={16} className="text-emerald-400" />
            {t('landing.features.terrain.calendarTitle')}
          </span>
          <span className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400/70" /> {t('landing.features.terrain.available')}
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-400/70 ms-1" /> {t('landing.features.terrain.booked')}
            <span className="w-2.5 h-2.5 rounded-sm bg-slate-700 ms-1" /> {t('landing.features.terrain.closed')}
          </span>
        </div>
        <div className="mt-5 overflow-x-auto">
          <table className="w-full border-separate border-spacing-1 min-w-[320px]">
            <thead>
              <tr>
                <th className="text-[11px] text-slate-500 font-medium py-1" />
                {days.map((d) => (
                  <th key={d} className="text-[11px] text-slate-400 font-medium py-1">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {SLOT_ROWS.map((row, idx) => (
                <tr key={idx}>
                  <td className="text-[11px] text-slate-500 py-1">{18 + idx}:00</td>
                  {row.map((cell, ci) => (
                    <td key={ci} className={`w-9 h-9 rounded-lg text-[10px] font-semibold text-center ${cellClass[cell]}`}>
                      {cell === 'avail' ? '✓' : cell === 'booked' ? '●' : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 flex items-center gap-2 px-4 py-3 rounded-xl bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] text-sm font-semibold">
          <MessageSquare size={16} />
          {t('landing.features.terrain.whatsapp')}
        </div>
      </div>

      <div className="lg:col-span-2 rounded-2xl bg-slate-900/70 backdrop-blur-md border border-slate-700/80 p-6 shadow-2xl shadow-black/30">
        <span className="flex items-center gap-2 text-sm font-bold text-slate-100">
          <ShieldCheck size={16} className="text-emerald-400" />
          {t('landing.features.terrain.facilitiesTitle')}
        </span>
        <div className="mt-5 space-y-3">
          {facilities.map((f) => (
            <div key={f} className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/[0.03] border border-slate-800">
              <span className="w-8 h-8 rounded-lg bg-emerald-400/10 flex items-center justify-center">
                <CheckCircle2 size={16} className="text-emerald-400" />
              </span>
              <span className="text-sm text-slate-200">{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FeatureThree({ t }) {
  const steps = [
    { icon: CheckCircle2, label: t('landing.features.scoring.stepReport'), state: 'done' },
    { icon: Clock, label: t('landing.features.scoring.stepConfirm'), state: 'active' },
    { icon: Trophy, label: t('landing.features.scoring.stepRank'), state: 'pending' },
  ];

  const stats = [
    { label: t('landing.features.scoring.wins'), value: 5 },
    { label: t('landing.features.scoring.draws'), value: 2 },
    { label: t('landing.features.scoring.losses'), value: 1 },
    { label: t('landing.features.scoring.goalsFor'), value: 18 },
    { label: t('landing.features.scoring.goalsAgainst'), value: 9 },
  ];

  const stepStyle = {
    done: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/30',
    active: 'bg-amber-400/15 text-amber-300 border-amber-400/30',
    pending: 'bg-slate-800/80 text-slate-500 border-slate-700',
  };

  return (
    <div className="grid lg:grid-cols-5 gap-6 items-stretch">
      <div className="lg:col-span-3 rounded-2xl bg-slate-900/70 backdrop-blur-md border border-slate-700/80 p-6 shadow-2xl shadow-black/30">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="text-sm font-bold text-slate-100">{t('landing.samples.atlasCasablanca')} <span className="text-slate-500">{t('match.vs')}</span> {t('landing.samples.atlasLions')}</span>
          <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-300 bg-amber-400/10 border border-amber-400/30 rounded-full px-3 py-1">
            <Clock size={12} />
            {t('landing.features.scoring.pendingStatus')}
          </span>
        </div>
        <div className="mt-6 flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-400/15 border border-emerald-400/30 flex items-center justify-center">
              <Users size={20} className="text-emerald-400" />
            </div>
            <p className="mt-2 text-sm font-semibold text-white">{t('landing.samples.atlasCasablanca')}</p>
            <p className="text-3xl font-black text-white mt-1">2</p>
          </div>
          <span className="text-2xl font-black text-slate-600">-</span>
          <div className="text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
              <Users size={20} className="text-slate-400" />
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-300">{t('landing.samples.atlasLions')}</p>
            <p className="text-3xl font-black text-slate-400 mt-1">1</p>
          </div>
        </div>
        <div className="mt-6 flex items-start gap-1">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="flex-1 flex flex-col items-center gap-2">
                <div className="flex w-full items-center">
                  {i > 0 && <span className="flex-1 h-px bg-slate-800" />}
                  <span className={`w-9 h-9 rounded-full border flex items-center justify-center ${stepStyle[s.state]}`}>
                    <Icon size={16} />
                  </span>
                  {i < steps.length - 1 && <span className="flex-1 h-px bg-slate-800" />}
                </div>
                <span className="text-[11px] text-slate-400 text-center leading-tight">{s.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-2 rounded-2xl bg-slate-900/70 backdrop-blur-md border border-slate-700/80 p-6 shadow-2xl shadow-black/30">
        <span className="flex items-center gap-2 text-sm font-bold text-slate-100">
          <Trophy size={16} className="text-amber-400" />
          {t('landing.features.match.rankTitle')}
        </span>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {stats.map((st) => (
            <div key={st.label} className="rounded-xl bg-white/[0.03] border border-slate-800 p-3 text-center">
              <div className="text-xl font-black text-emerald-400">{st.value}</div>
              <div className="mt-0.5 text-[11px] text-slate-400">{st.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function ContactForm({ t }) {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleChange = (e) => setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  const inputCls = 'w-full bg-slate-950/60 border border-slate-700 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition';

  if (sent) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center py-12">
        <span className="w-16 h-16 rounded-full bg-emerald-400/15 flex items-center justify-center">
          <CheckCircle2 size={32} className="text-emerald-400" />
        </span>
        <p className="mt-5 text-lg font-bold text-white">✓</p>
        <p className="mt-2 text-sm text-slate-400 max-w-xs">{t('landing.contact.success')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="grid sm:grid-cols-2 gap-4">
      <Field label={t('landing.contact.name')}>
        <input name="name" value={form.name} onChange={handleChange} required className={inputCls} placeholder={t('landing.contact.name')} />
      </Field>
      <Field label={t('landing.contact.email')}>
        <input name="email" type="email" value={form.email} onChange={handleChange} required className={inputCls} placeholder="example@email.com" />
      </Field>
      <Field label={t('landing.contact.phone')}>
        <input name="phone" type="tel" value={form.phone} onChange={handleChange} className={inputCls} placeholder="0600000000" />
      </Field>
      <Field label={t('landing.contact.subject')}>
        <input name="subject" value={form.subject} onChange={handleChange} required className={inputCls} placeholder={t('landing.contact.subject')} />
      </Field>
      <div className="sm:col-span-2">
        <Field label={t('landing.contact.message')}>
          <textarea name="message" rows={4} value={form.message} onChange={handleChange} required className={inputCls} placeholder={t('landing.contact.messagePlaceholder')} />
        </Field>
      </div>
      <button
        type="submit"
        className="sm:col-span-2 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold transition-all duration-300 transform hover:-translate-y-1"
      >
        <Send size={18} />
        {t('landing.contact.submit')}
      </button>
    </form>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-slate-900/70 backdrop-blur-md border border-slate-700/80 p-5">
      <span className="w-11 h-11 rounded-xl bg-emerald-400/15 flex items-center justify-center shrink-0">
        <Icon size={20} className="text-emerald-400" />
      </span>
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm font-semibold text-white truncate">{value}</p>
      </div>
    </div>
  );
}

function QuickLinks({ t }) {
  const links = [
    { label: t('landing.contact.quickAbout'), to: '/about' },
    { label: t('landing.contact.quickFaq'), to: '/faq' },
    { label: t('landing.contact.quickLogin'), to: '/login' },
    { label: t('landing.contact.quickRegister'), to: '/register' },
  ];
  return (
    <div className="rounded-2xl bg-slate-900/70 backdrop-blur-md border border-slate-700/80 p-6">
      <span className="text-sm font-bold text-slate-100">{t('landing.contact.quickLinks')}</span>
      <ul className="mt-4 space-y-2.5">
        {links.map((l) => (
          <li key={l.label}>
            <Link to={l.to} className="group flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition">
              <ChevronDown size={14} className="text-slate-600 group-hover:text-emerald-400 -rotate-90 rtl:rotate-90 transition" />
              {l.label}
            </Link>
          </li>
        ))}
        <li className="flex items-center gap-2 text-sm text-slate-500 cursor-not-allowed">
          <ChevronDown size={14} className="text-slate-700 -rotate-90 rtl:rotate-90" />
          {t('landing.contact.quickTerms')}
        </li>
      </ul>
    </div>
  );
}

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const id = location.hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, [location.hash]);

  return (
    <div className="h-screen overflow-y-scroll snap-none lg:snap-y lg:snap-mandatory scroll-smooth bg-slate-950">
      <LandingHeader />

      <Section id="home">
        <div className="max-w-5xl mx-auto text-center w-full">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 text-xs font-semibold">
            <Sparkles size={14} />
            {t('landing.hero.badge')}
          </span>
          <h1 className="mt-6 text-4xl sm:text-5xl lg:text-7xl font-black text-white leading-[1.15] tracking-tight">
            {t('landing.hero.title')}{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              {t('landing.hero.titleHighlight')}
            </span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {t('landing.hero.subtitle')}
          </p>

          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-base shadow-xl shadow-emerald-500/25 transition-all duration-300 transform hover:-translate-y-1"
            >
              <Trophy size={20} />
              {t('landing.hero.ctaMatch')}
            </Link>
            <button
              onClick={() => document.getElementById('terrains')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-slate-700 text-white font-semibold text-base transition-all duration-300 transform hover:-translate-y-1"
            >
              <MapPin size={20} />
              {t('landing.hero.ctaTerrains')}
            </button>
            <Link
              to="/login"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-xl text-slate-300 hover:text-white font-medium text-base transition-all duration-300 transform hover:-translate-y-1"
            >
              {t('landing.hero.ctaSignIn')}
            </Link>
          </div>

          <div className="mt-14 flex flex-wrap items-center justify-center gap-5">
            <FloatBadge icon={Users} value={t('landing.hero.badgeTeams')} />
            <FloatBadge icon={Trophy} value={t('landing.hero.badgeMatches')} delay />
            <FloatBadge icon={ShieldCheck} value={t('landing.hero.badgeStadiums')} slow />
          </div>
        </div>
      </Section>

      <Section id="features" from="from-emerald-500/10">
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">{t('landing.features.sectionLabel')}</span>
          <h2 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
            {t('landing.features.match.title')}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
            {t('landing.features.match.desc')}
          </p>
        </div>
        <div className="mt-10 lg:mt-14">
          <FeatureOne t={t} />
        </div>
      </Section>

      <Section id="terrains" from="from-emerald-500/10">
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">{t('landing.features.sectionLabel')}</span>
          <h2 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
            {t('landing.features.terrain.title')}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
            {t('landing.features.terrain.desc')}
          </p>
        </div>
        <div className="mt-10 lg:mt-14">
          <FeatureTwo t={t} />
        </div>
      </Section>

      <Section id="scoring" from="from-emerald-500/10">
        <div className="max-w-2xl">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">{t('landing.features.sectionLabel')}</span>
          <h2 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
            {t('landing.features.scoring.title')}
          </h2>
          <p className="mt-4 text-base sm:text-lg text-slate-300 leading-relaxed">
            {t('landing.features.scoring.desc')}
          </p>
        </div>
        <div className="mt-10 lg:mt-14">
          <FeatureThree t={t} />
        </div>
      </Section>

      <Section id="contact" from="from-emerald-600/15">
        <div className="text-center max-w-2xl mx-auto">
          <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">{t('landing.nav.contact')}</span>
          <h2 className="mt-2 text-3xl sm:text-4xl lg:text-5xl font-black text-white">{t('landing.contact.title')}</h2>
          <p className="mt-4 text-slate-300">{t('landing.contact.subtitle')}</p>
        </div>

        <div className="mt-12 grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 rounded-2xl bg-slate-900/70 backdrop-blur-md border border-slate-700/80 p-6 sm:p-8 shadow-2xl shadow-black/30">
            <ContactForm t={t} />
          </div>
          <div className="lg:col-span-2 space-y-4">
            <InfoRow icon={Phone} label={t('landing.contact.supportLabel')} value={t('landing.contact.supportPhone')} />
            <InfoRow icon={Phone} label={t('landing.contact.supportLabel')} value={t('landing.contact.supportPhone2')} />
            <InfoRow icon={Mail} label={t('landing.contact.emailLabel')} value={t('landing.contact.supportEmail')} />
            <InfoRow icon={MapPin} label={t('landing.contact.locationLabel')} value={t('landing.contact.location')} />
            <QuickLinks t={t} />
          </div>
        </div>

        <footer className="mt-12 pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-sm text-slate-500 text-center sm:text-start">{t('landing.footer.tagline')}</p>
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} {t('common.appName')}. {t('landing.footer.rights')}
          </p>
        </footer>
      </Section>
    </div>
  );
}
