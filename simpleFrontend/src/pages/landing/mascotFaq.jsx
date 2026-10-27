import { useState } from 'react'
import { ChevronDown, Sparkles } from 'lucide-react'
import GenieMascot from '../../components/mascot/GenieMascot'

const FAQ_ITEMS = [
  {
    id: 1,
    question: 'كيف يمكنني حجز ملعب قرب في مدينتي بأفضل توقيت؟',
    answer:
      'العملية في غاية السهولة: توجّه إلى قسم "الملاعب"، حدد مدينتك والملعب الأنسب لفريقك، واختر التوقيت المتاح المناسب، ثم أكد الحجز فورياً دون الحاجة إلى التنقل المسبق أو الاتصالات الهاتفية المتكررة.',
  },
  {
    id: 2,
    question: 'كيف أسجل فريقي للمشاركة في البطولات والدوريات المحلية؟',
    answer:
      'انتقل إلى صفحة "البطولات"، واختر الدوري المفتوح للتسجيل في منطقتك، ثم اضغط على "طلب التسجيل". بمجرد اعتماد طلبك من قبل اللجنة المنظمة، يُدرج فريقك مباشرة في جدول المباريات والقرعة الرسمية.',
  },
  {
    id: 3,
    question: 'هل منصة أجي نقصرو مجانية للاعبين والفرق الرياضية؟',
    answer:
      'نعم، المنصة مجانية بالكامل. يمكنك إنشاء ملف دائم لفريقك أو لملفك الشخصي كلاعب، واستعراض الملاعب، ومتابعة النتائج المباشرة وترتيب الهدافين دون أي رسوم اشتراك خفية.',
  },
  {
    id: 4,
    question: 'كيف يتم تحديث نتائج المباريات وترتيب الهدافين مباشرة؟',
    answer:
      'يتولى المنظمون والحكام المعتمدون إدخال أهداف المباراة ومجرياتها فور انتهائها عبر لوحة التحكم المخصصة، ويقوم النظام بتحديث جدول الترتيب والنقاط وإحصائيات أفضل اللاعبين بشكل آلي وفوري وبدقة تامة.',
  },
  {
    id: 5,
    question: 'كيف يمكنني تحدي فريق آخر في مباراة ودية؟',
    answer:
      'يمكنك إنشاء طلب مباراة جديدة في الملعب والتوقيت المناسبين لك، أو تصفح "حائط التحديات الرياضية" النشط والضغط على زر "قبول التحدي 🤝" لتنسيق تفاصيل اللقاء مباشرة مع الفريق المنافس.',
  },
]

export default function MascotFaq({ theme = 'dark' }) {
  const [openId, setOpenId] = useState(1)

  const isDark = theme === 'dark' || document.documentElement.classList.contains('dark')

  return (
    <section aria-labelledby="faq-heading" className="mx-auto w-full max-w-6xl px-4 sm:px-6 my-6 sm:my-8">
      <div
        className={`relative overflow-hidden rounded-3xl border p-5 sm:p-8 transition-all ${
          isDark
            ? 'bg-[#14221C] border-emerald-900/50 shadow-2xl ring-1 ring-emerald-500/15'
            : 'bg-white border-slate-200/90 shadow-xl ring-1 ring-emerald-500/10'
        }`}
      >
        {/* Header with Official Genie Mascot */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-6 border-b border-slate-700/25 text-center sm:text-start">
          <div className="relative">
            <GenieMascot size={64} animated />
            <span className="absolute bottom-0 end-0 size-3 rounded-full bg-emerald-500 ring-2 ring-[#14221C]" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-black text-emerald-400 border border-emerald-500/30 mb-1.5">
              <Sparkles className="size-3 text-amber-400" />
              <span>إجابات فورية وتوجيه ذكي</span>
            </div>
            <h2
              id="faq-heading"
              className={`text-xl sm:text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}
            >
              الأسئلة الشائعة وإرشادات المنصة
            </h2>
            <p className="mt-1 text-xs sm:text-sm font-semibold text-slate-400">
              كل ما تحتاج لمعرفته حول حجز الملاعب، تنظيم المباريات، والمشاركة في البطولات المحلية.
            </p>
          </div>
        </div>

        {/* Accordion List */}
        <div className="mt-6 space-y-3">
          {FAQ_ITEMS.map((item) => {
            const isOpen = openId === item.id
            return (
              <div
                key={item.id}
                className={`overflow-hidden rounded-2xl border transition-all ${
                  isOpen
                    ? isDark
                      ? 'border-emerald-500/40 bg-[#121E33]/90 shadow-md ring-1 ring-emerald-500/20'
                      : 'border-emerald-400 bg-emerald-50/40 shadow-sm ring-1 ring-emerald-500/20'
                    : isDark
                      ? 'border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/70'
                      : 'border-slate-200 bg-slate-50/80 hover:bg-slate-100/60'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 p-4 text-start font-black text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  <span className={isOpen ? 'text-emerald-400 font-black' : isDark ? 'text-slate-200' : 'text-slate-800'}>
                    {item.question}
                  </span>
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-xl transition-transform duration-300 ${
                      isOpen
                        ? 'rotate-180 bg-emerald-500 text-white'
                        : isDark
                          ? 'bg-slate-800 text-slate-400'
                          : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    <ChevronDown className="size-4" />
                  </span>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs sm:text-sm leading-relaxed border-t border-slate-700/20 flex items-start gap-3">
                    <div className="mt-1 shrink-0">
                      <GenieMascot size={22} border={false} />
                    </div>
                    <p className={`mt-0.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {item.answer}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
