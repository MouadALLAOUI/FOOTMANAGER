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
        className="relative overflow-hidden rounded-3xl border p-5 sm:p-8 transition-all bg-white dark:bg-[#1B201D] border-[#E1E5DF] dark:border-[#303832] shadow-sm"
      >
        {/* Header with Official Genie Mascot */}
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 pb-6 border-b border-[#E1E5DF] dark:border-[#303832] text-center sm:text-start">
          <div className="relative">
            <GenieMascot size={64} animated />
            <span className="absolute bottom-0 end-0 size-3 rounded-full bg-[#B8F000] dark:bg-[#D0FF38] ring-2 ring-[#111313]" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 rounded-md bg-[#B8F000]/20 dark:bg-[#D0FF38]/20 px-3 py-1 text-[11px] font-black text-[#111313] dark:text-[#D0FF38] border border-[#B8F000]/40 mb-1.5">
              <Sparkles className="size-3 text-amber-400" />
              <span>إجابات فورية وتوجيه ذكي</span>
            </div>
            <h2
              id="faq-heading"
              className="text-xl sm:text-2xl font-black text-[#111313] dark:text-[#F5F7F2]"
            >
              الأسئلة الشائعة وإرشادات المنصة
            </h2>
            <p className="mt-1 text-xs sm:text-sm font-semibold text-[#65706A] dark:text-[#B2B9B3]">
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
                    ? 'border-[#B8F000] dark:border-[#D0FF38]/50 bg-[#E9ECE7]/60 dark:bg-[#252B27] shadow-sm'
                    : 'border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#1B201D] hover:bg-[#E9ECE7] dark:hover:bg-[#252B27]'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : item.id)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-3 p-4 text-start font-black text-xs sm:text-sm transition-colors cursor-pointer"
                >
                  <span className={isOpen ? 'text-[#16834A] dark:text-[#D0FF38] font-black' : 'text-[#111313] dark:text-[#F5F7F2]'}>
                    {item.question}
                  </span>
                  <span
                    className={`grid size-7 shrink-0 place-items-center rounded-xl transition-transform duration-300 ${
                      isOpen
                        ? 'rotate-180 bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313]'
                        : 'bg-[#E9ECE7] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3]'
                    }`}
                  >
                    <ChevronDown className="size-4" />
                  </span>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4 pt-1 text-xs sm:text-sm leading-relaxed border-t border-[#E1E5DF] dark:border-[#303832] flex items-start gap-3">
                    <div className="mt-1 shrink-0">
                      <GenieMascot size={22} border={false} />
                    </div>
                    <p className="mt-0.5 text-[#65706A] dark:text-[#B2B9B3]">
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
