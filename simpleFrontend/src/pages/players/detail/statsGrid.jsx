import {
  CalendarDays,
  CheckCircle,
  Flame,
  Hand,
  ShieldAlert,
  ShieldCheck,
  Trophy,
} from 'lucide-react'

export default function PlayerStatsGrid({ stats }) {
  if (!stats) return null

  const hasCards = (stats.yellow_cards ?? 0) > 0 || (stats.red_cards ?? 0) > 0

  const items = [
    {
      id: 'goals',
      title: 'الأهداف المسجلة',
      value: stats.goals ?? 0,
      icon: Flame,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      description: 'أهداف رسمية معتمدة في المباريات',
      highlight: true,
    },
    {
      id: 'assists',
      title: 'التمريرات الحاسمة',
      value: stats.assists ?? 0,
      icon: Hand,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10 border-teal-500/20 text-teal-400',
      description: 'صناعة أهداف مسجلة بتقرير الحكم',
      highlight: true,
    },
    {
      id: 'matches',
      title: 'المباريات الملعوبة',
      value: stats.matches_played ?? 0,
      icon: CalendarDays,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10 border-sky-500/20 text-sky-400',
      description: 'ظهور معتمد بالتشكيلة والتقارير',
      highlight: true,
    },
    {
      id: 'tournaments',
      title: 'البطولات المشارك بها',
      value: stats.tournaments_count ?? 0,
      icon: Trophy,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
      description: 'مشاركات رسمية باللوائح والمنافسات',
      highlight: true,
    },
    {
      id: 'cards',
      title: 'السجل الانضباطي',
      value: hasCards
        ? `${stats.yellow_cards ?? 0} صفراء • ${stats.red_cards ?? 0} حمراء`
        : 'سجل نظيف (بدون بطاقات)',
      icon: hasCards ? ShieldAlert : CheckCircle,
      color: hasCards ? 'text-rose-400' : 'text-emerald-400',
      bg: hasCards ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      description: hasCards ? 'بطاقات مسجلة من طاقم التحكيم' : 'سلوك رياضي منضبط ومثالي',
      isText: true,
      highlight: true,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
          <span>الإحصائيات المعتمدة</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-400">
            <ShieldCheck className="size-3.5" />
            <span>بيانات رسمية موثقة</span>
          </span>
        </h2>
        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
          مستخرجة مباشرة من تقارير المباريات ولوائح التحكيم
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.id}
              className="relative overflow-hidden rounded-2xl border border-slate-800/80 bg-gradient-to-b from-[#0F172A] to-[#0A101D] p-4 shadow-md transition-all hover:border-slate-700 hover:shadow-lg"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-slate-400 truncate">
                  {item.title}
                </span>
                <span className={`grid size-8 place-items-center rounded-xl border ${item.bg}`}>
                  <Icon className="size-4" />
                </span>
              </div>

              <div className="mt-2">
                <span
                  className={`${
                    item.isText
                      ? 'text-xs sm:text-sm font-extrabold text-white block leading-tight'
                      : 'text-2xl sm:text-3xl font-black text-white tabular-nums'
                  }`}
                >
                  {item.value}
                </span>
              </div>

              <p className="mt-2 text-[10px] font-medium text-slate-400 truncate">
                {item.description}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
