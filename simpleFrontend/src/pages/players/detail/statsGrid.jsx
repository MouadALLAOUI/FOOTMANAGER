import {
  CalendarDays,
  CircleAlert,
  Flame,
  Hand,
  ShieldAlert,
  ShieldCheck,
  Trophy,
} from 'lucide-react'

export default function PlayerStatsGrid({ stats }) {
  if (!stats) return null

  const items = [
    {
      id: 'goals',
      title: 'الأهداف المسجلة',
      value: stats.goals ?? 0,
      icon: Flame,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      description: 'أهداف معتمدة في المباريات',
      highlight: true,
    },
    {
      id: 'tournaments',
      title: 'البطولات المشارك بها',
      value: stats.tournaments_count ?? 0,
      icon: Trophy,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      description: 'مشاركات رسمية باللوائح',
      highlight: true,
    },
    {
      id: 'matches',
      title: 'المباريات الملعوبة',
      value: stats.matches_played ?? 0,
      icon: CalendarDays,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10 border-sky-500/20',
      description: 'ظهور معتمد في التشكيلات',
      highlight: true,
    },
    {
      id: 'assists',
      title: 'التمريرات الحاسمة',
      value: stats.assists ?? 0,
      icon: Hand,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10 border-teal-500/20',
      description: 'صناعة أهداف مسجلة بالتقرير',
      showIfZero: false,
    },
    {
      id: 'cards',
      title: 'السجل الانضباطي',
      value: `${stats.yellow_cards ?? 0} صفراء • ${stats.red_cards ?? 0} حمراء`,
      icon: ShieldAlert,
      color: 'text-rose-400',
      bg: 'bg-rose-500/10 border-rose-500/20',
      description: 'بطاقات مسجلة من الحكام',
      isText: true,
      showIfZero: (stats.yellow_cards > 0 || stats.red_cards > 0),
    },
  ]

  // Filter items based on verified persisted records
  const visibleItems = items.filter((it) => {
    if (it.highlight) return true
    if (it.showIfZero === false) return Number(it.value) > 0
    if (typeof it.showIfZero === 'boolean') return it.showIfZero
    return true
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
          <span>الإحصائيات المعتمدة</span>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
            <ShieldCheck className="size-3" />
            <span>بيانات رسمية</span>
          </span>
        </h2>
        <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">
          مستخرجة مباشرة من تقارير المباريات وبطاقات التحكيم
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {visibleItems.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.id}
              className="relative overflow-hidden rounded-2xl border border-slate-800 bg-[#0F172A]/90 p-4 shadow-sm transition-all hover:border-slate-700"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-bold text-slate-400 truncate">
                  {item.title}
                </span>
                <span className={`grid size-8 place-items-center rounded-xl border ${item.bg}`}>
                  <Icon className={`size-4 ${item.color}`} />
                </span>
              </div>

              <div className="mt-1">
                <span
                  className={`${
                    item.isText
                      ? 'text-sm sm:text-base font-extrabold text-white'
                      : 'text-2xl sm:text-3xl font-black text-white tabular-nums'
                  }`}
                >
                  {item.value}
                </span>
              </div>

              <p className="mt-1.5 text-[10px] font-medium text-slate-400 truncate">
                {item.description}
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}
