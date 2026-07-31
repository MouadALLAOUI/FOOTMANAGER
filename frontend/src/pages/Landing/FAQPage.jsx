import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarCheck, ChevronDown, HelpCircle, Landmark, Trophy, Users } from 'lucide-react';
import LandingHeader from '../../components/Landing/LandingHeader';

const CATEGORY_ICONS = {
  general: Users,
  managers: Trophy,
  owners: Landmark,
  bookings: CalendarCheck,
};

function FaqAccordion({ items }) {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div
            key={item.q}
            className={`rounded-2xl border transition ${
              isOpen ? 'border-emerald-400/40 bg-slate-900/80' : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
            }`}
          >
            <button
              onClick={() => setOpenIndex(isOpen ? null : i)}
              className="w-full flex items-center gap-3 px-5 py-4 text-start"
            >
              <span className="flex-1 text-sm sm:text-base font-semibold text-white">{item.q}</span>
              <ChevronDown
                size={18}
                className={`shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180 text-emerald-400' : 'text-slate-400'}`}
              />
            </button>
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-sm text-slate-400 leading-relaxed">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function FAQPage() {
  const { t } = useTranslation();
  const categories = t('faq.categories', { returnObjects: true });

  return (
    <div className="min-h-screen bg-slate-950">
      <LandingHeader />
      <main className="pt-24 pb-20">
        <section className="max-w-3xl mx-auto px-4 text-center pt-10 pb-12">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-400/30 bg-emerald-400/10 text-emerald-300 text-xs font-semibold">
            <HelpCircle size={14} />
            {t('landing.nav.faq')}
          </span>
          <h1 className="mt-4 text-4xl sm:text-5xl font-black text-white tracking-tight">{t('faq.heroTitle')}</h1>
          <p className="mt-4 text-slate-400">{t('faq.heroSubtitle')}</p>
        </section>

        <section className="max-w-3xl mx-auto px-4 space-y-8">
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS[cat.id] || HelpCircle;
            return (
              <div key={cat.id}>
                <h2 className="flex items-center gap-2.5 text-lg font-bold text-white mb-4">
                  <span className="w-9 h-9 rounded-xl bg-emerald-400/15 flex items-center justify-center">
                    <Icon size={18} className="text-emerald-400" />
                  </span>
                  {cat.title}
                </h2>
                <FaqAccordion items={cat.items} />
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}
