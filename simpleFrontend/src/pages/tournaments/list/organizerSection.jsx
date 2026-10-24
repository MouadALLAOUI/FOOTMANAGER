import { useTranslation } from 'react-i18next'
import { BarChart3, CalendarCheck, Share2, Sparkles, UserCheck } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons'

const FEATURES = [
  {
    icon: CalendarCheck,
    titleKey: 'public.tournaments.organizerSection.feat1Title',
    descKey: 'public.tournaments.organizerSection.feat1Desc',
    titleFallback: 'جدولة ذكية للمباريات وتفادي التضارب',
    descFallback: 'برمجة آلية ومرنة للمجموعات والأدوار الإقصائية، مع مراعاة فترات راحة الفرق وتوفر الملاعب.',
  },
  {
    icon: BarChart3,
    titleKey: 'public.tournaments.organizerSection.feat2Title',
    descKey: 'public.tournaments.organizerSection.feat2Desc',
    titleFallback: 'ترتيب وإحصائيات آلية ولحظية',
    descFallback: 'احتساب تلقائي للنقاط، فارق الأهداف، المواجهات المباشرة، وقائمة الهدافين دون أي حسابات يدوية.',
  },
  {
    icon: UserCheck,
    titleKey: 'public.tournaments.organizerSection.feat3Title',
    descKey: 'public.tournaments.organizerSection.feat3Desc',
    titleFallback: 'تسجيل الفرق وإدارة قوائم اللاعبين',
    descFallback: 'استقبال طلبات المشاركة رقمياً، توثيق لوائح الفرق، وضبط أرقام اللاعبين وبطاقات الهوية بسهولة.',
  },
  {
    icon: Share2,
    titleKey: 'public.tournaments.organizerSection.feat4Title',
    descKey: 'public.tournaments.organizerSection.feat4Desc',
    titleFallback: 'ملخصات ورسومات جاهزة للواتساب',
    descFallback: 'تصدير صور احترافية لجدول الترتيب، مصفوفة النتائج، وبرنامج المباريات جاهزة للمشاركة الفورية.',
  },
]

export default function OrganizerSection() {
  const { t } = useTranslation()

  const defaultMessage =
    'السلام عليكم، نود تنظيم بطولة كرة قدم عبر منصة أجي نقصرو، ونرغب في معرفة التفاصيل وكيفية البدء.'
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(defaultMessage)}`

  return (
    <section id="organizer-section" className="scroll-mt-24" aria-labelledby="organizer-heading">
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-slate-950 via-slate-900 to-green-950 p-6 shadow-2xl ring-1 ring-white/10 sm:p-10 lg:p-14">
        {/* Glow Effects */}
        <div className="pointer-events-none absolute -end-20 -top-20 size-80 rounded-full bg-green-500/20 blur-[120px]" />
        <div className="pointer-events-none absolute -bottom-20 -start-20 size-80 rounded-full bg-emerald-500/15 blur-[120px]" />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-green-500/30 bg-green-500/10 px-4 py-1.5 text-xs font-black text-green-400 backdrop-blur-md">
            <Sparkles className="size-3.5" />
            {t('public.tournaments.organizerSection.badge', 'للجمعيات واللجان المنظمة')}
          </span>

          <h2
            id="organizer-heading"
            className="mt-5 text-2xl font-black leading-tight text-white sm:text-3xl md:text-4xl"
          >
            {t('public.tournaments.organizerSection.title', 'نظّم دوريك أو بطولتك بكل احترافية عبر منصة أجي نقصرو')}
          </h2>

          <p className="mx-auto mt-4 max-w-2xl text-xs leading-relaxed text-slate-300 sm:text-sm md:text-base">
            {t(
              'public.tournaments.organizerSection.subtitle',
              'نتكفل عنك بجميع التعقيدات اللوجستية: من برمجة المباريات وحساب الترتيب آلياً، إلى إدارة الفرق واللاعبين ومشاركة النتائج الفورية مع الجمهور والمشاركين.',
            )}
          </p>

          <div className="mt-10 grid gap-4 text-start sm:grid-cols-2 lg:gap-5">
            {FEATURES.map((feat, idx) => {
              const Icon = feat.icon
              return (
                <div
                  key={idx}
                  className="group rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur-md transition-all duration-300 hover:border-green-400/40 hover:bg-white/[0.08]"
                >
                  <div className="flex items-start gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-green-500/20 text-green-400 ring-1 ring-green-400/30 transition-transform duration-300 group-hover:scale-110">
                      <Icon className="size-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-white sm:text-base">
                        {t(feat.titleKey, feat.titleFallback)}
                      </h3>
                      <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                        {t(feat.descKey, feat.descFallback)}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ripple inline-flex h-13 w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-500 px-8 text-sm font-black text-white shadow-[0_16px_36px_rgba(16,185,129,0.4)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-emerald-400 hover:shadow-[0_20px_45px_rgba(16,185,129,0.55)] sm:w-auto"
            >
              <FontAwesomeIcon icon={faWhatsapp} className="size-5" />
              <span>
                {t('public.tournaments.organizerSection.cta', 'تواصل معنا عبر واتساب لتنظيم بطولتك')}
              </span>
            </a>
          </div>
          <p className="mt-3 text-[11px] font-bold text-slate-400">
            {t('public.tournaments.organizerSection.ctaHint', 'فريقنا متاح للإجابة على استفساراتكم ومرافقتكم خطوة بخطوة')}
          </p>
        </div>
      </div>
    </section>
  )
}
