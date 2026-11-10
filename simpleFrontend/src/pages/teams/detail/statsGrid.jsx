import {
  Award,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  Clock,
  Flame,
  Lock,
  MapPin,
  MinusCircle,
  Percent,
  Shield,
  ShieldCheck,
  Sparkles,
  Swords,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  XCircle,
} from 'lucide-react'

function formatSignedNumber(val) {
  if (val == null) return '—'
  const num = Number(val)
  if (!Number.isFinite(num)) return '—'
  if (num > 0) return `+${num}`
  return String(num)
}

export default function TeamStatsGrid({ stats, weeklyBookings = [] }) {
  if (!stats) return null

  const {
    isPrivate,
    matchesPlayed,
    wins,
    draws,
    losses,
    goalsFor,
    goalsAgainst,
    goalDifference,
    winPercentage,
    tournamentsCount,
    titlesWon,
    points,
  } = stats

  const gdTone =
    goalDifference == null
      ? 'text-[#65706A] dark:text-[#B2B9B3]'
      : goalDifference > 0
        ? 'text-[#179955] dark:text-[#42D889]'
        : goalDifference < 0
          ? 'text-[#D93636] dark:text-[#FF6868]'
          : 'text-[#111313] dark:text-[#F5F7F2]'

  const items = [
    {
      id: 'matches_played',
      label: 'إجمالي المباريات',
      value: matchesPlayed ?? '—',
      icon: Swords,
      iconCls: 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#111313] dark:text-[#D0FF38] border-[#E1E5DF] dark:border-[#303832]',
      valueCls: 'text-[#111313] dark:text-[#F5F7F2]',
      sub: 'مباريات مكتملة ومعتمدة',
    },
    {
      id: 'wins',
      label: 'الفوز',
      value: wins ?? '—',
      icon: CheckCircle2,
      iconCls: 'bg-[#179955]/12 dark:bg-[#42D889]/15 text-[#179955] dark:text-[#42D889] border-[#179955]/25 dark:border-[#42D889]/30',
      valueCls: 'text-[#179955] dark:text-[#42D889]',
      sub: 'انتصارات رسمية وودية',
    },
    {
      id: 'draws',
      label: 'التعادل',
      value: draws ?? '—',
      icon: MinusCircle,
      iconCls: 'bg-[#D9822B]/12 dark:bg-[#FFC857]/15 text-[#D9822B] dark:text-[#FFC857] border-[#D9822B]/25 dark:border-[#FFC857]/30',
      valueCls: 'text-[#D9822B] dark:text-[#FFC857]',
      sub: 'مباريات انتهت بالتعادل',
    },
    {
      id: 'losses',
      label: 'الخسارة',
      value: losses ?? '—',
      icon: XCircle,
      iconCls: 'bg-[#D93636]/12 dark:bg-[#FF6868]/15 text-[#D93636] dark:text-[#FF6868] border-[#D93636]/25 dark:border-[#FF6868]/30',
      valueCls: 'text-[#D93636] dark:text-[#FF6868]',
      sub: 'هزائم مسجلة',
    },
    {
      id: 'win_percentage',
      label: 'نسبة الفوز',
      value: winPercentage == null ? '—' : `${winPercentage}%`,
      icon: Percent,
      iconCls: 'bg-[#B8F000]/25 dark:bg-[#D0FF38]/15 text-[#111313] dark:text-[#D0FF38] border-[#B8F000]/40 dark:border-[#D0FF38]/30',
      valueCls: 'text-[#111313] dark:text-[#D0FF38]',
      sub: 'من إجمالي المباريات الملعوبة',
      dir: 'ltr',
    },
    {
      id: 'goals_for',
      label: 'الأهداف المسجلة',
      value: goalsFor ?? '—',
      icon: Flame,
      iconCls: 'bg-[#179955]/12 dark:bg-[#42D889]/15 text-[#179955] dark:text-[#42D889] border-[#179955]/25 dark:border-[#42D889]/30',
      valueCls: 'text-[#111313] dark:text-[#F5F7F2]',
      sub: 'أهداف مسجلة لصالح الفريق',
    },
    {
      id: 'goals_against',
      label: 'الأهداف المستقبلة',
      value: goalsAgainst ?? '—',
      icon: Shield,
      iconCls: 'bg-sky-500/12 dark:bg-sky-400/15 text-sky-600 dark:text-sky-400 border-sky-500/25 dark:border-sky-400/30',
      valueCls: 'text-[#111313] dark:text-[#F5F7F2]',
      sub: 'أهداف في شباك الفريق',
    },
    {
      id: 'goal_difference',
      label: 'فارق الأهداف',
      value: formatSignedNumber(goalDifference),
      icon: goalDifference != null && goalDifference < 0 ? TrendingDown : TrendingUp,
      iconCls: 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#111313] dark:text-[#F5F7F2] border-[#E1E5DF] dark:border-[#303832]',
      valueCls: gdTone,
      sub: 'الفرق بين المسجلة والمستقبلة',
      dir: 'ltr',
    },
    {
      id: 'tournaments_count',
      label: 'مشاركات البطولات',
      value: tournamentsCount ?? 0,
      icon: Trophy,
      iconCls: 'bg-[#0284C7]/12 dark:bg-sky-400/15 text-[#0284C7] dark:text-sky-400 border-[#0284C7]/25 dark:border-sky-400/30',
      valueCls: 'text-[#111313] dark:text-[#F5F7F2]',
      sub: 'بطولات انضم إليها الفريق',
    },
    {
      id: 'titles_won',
      label: 'الألقاب المحققة',
      value: titlesWon ?? 0,
      icon: Award,
      iconCls: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
      valueCls: titlesWon > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-[#111313] dark:text-[#F5F7F2]',
      sub: 'بطولات مُتوج فيها رسمياً',
    },
  ]

  const recurringBookings = (weeklyBookings || []).filter((b) => b.is_weekly)

  return (
    <section className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[#B8F000]/25 dark:bg-[#D0FF38]/15 text-[#179955] dark:text-[#D0FF38]">
            <BarChart3 className="size-4" />
          </span>
          <h2 className="text-base sm:text-lg font-black text-[#111313] dark:text-[#F5F7F2]">
            إحصائيات الفريق
          </h2>
          {!isPrivate && (
            <span className="inline-flex items-center gap-1 rounded-full border border-[#179955]/30 bg-[#179955]/10 dark:bg-[#42D889]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#179955] dark:text-[#42D889]">
              <ShieldCheck className="size-3.5" />
              <span>بيانات رسمية</span>
            </span>
          )}
        </div>

        {!isPrivate && points != null && (
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] px-3 py-1.5 text-xs font-black text-[#111313] dark:text-[#F5F7F2] shadow-2xs">
            <Target className="size-3.5 text-[#179955] dark:text-[#D0FF38]" />
            <span>الرصيد العام:</span>
            <span className="font-black text-[#179955] dark:text-[#D0FF38] tabular-nums">{points} نقطة</span>
          </div>
        )}
      </div>

      {isPrivate && (
        <div className="flex items-start gap-2.5 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-3.5 text-xs shadow-2xs">
          <Lock className="size-4 shrink-0 mt-0.5 text-[#65706A] dark:text-[#B2B9B3]" />
          <div>
            <p className="font-black text-[#111313] dark:text-[#F5F7F2]">
              الإحصائيات التفصيلية لهذا الفريق خاصة
            </p>
            <p className="mt-0.5 text-[11px] text-[#65706A] dark:text-[#B2B9B3]">
              أخفى مسير الفريق سجله التفصيلي العام؛ يتم عرض المشاركات والنتائج العلنية في البطولات الرسمية فقط.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-3">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div
              key={item.id}
              className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-3.5 sm:p-4 shadow-2xs transition-colors hover:border-[#B8F000] dark:hover:border-[#D0FF38]/60"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] sm:text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] truncate">
                  {item.label}
                </span>
                <span className={`grid size-7 sm:size-8 shrink-0 place-items-center rounded-xl border ${item.iconCls}`}>
                  <Icon className="size-3.5 sm:size-4" />
                </span>
              </div>

              <p
                dir={item.dir}
                className={`text-xl sm:text-2xl font-black tabular-nums leading-tight text-start ${item.valueCls}`}
              >
                {item.value}
              </p>

              <p className="mt-1.5 text-[10px] font-medium text-[#65706A] dark:text-[#B2B9B3] truncate">
                {item.sub}
              </p>
            </div>
          )
        })}
      </div>

      {/* Weekly Recurring Stadium Bookings (only when present in API) */}
      {recurringBookings.length > 0 && (
        <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4 shadow-2xs">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-[#B8F000]/25 dark:bg-[#D0FF38]/15 text-[#111313] dark:text-[#D0FF38]">
                <CalendarDays className="size-4" />
              </span>
              <h3 className="text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                الحجوزات الأسبوعية المعتمدة
              </h3>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#B8F000]/25 dark:bg-[#D0FF38]/20 px-2.5 py-0.5 text-[10px] font-black text-[#111313] dark:text-[#D0FF38]">
              <Sparkles className="size-3" />
              <span>{recurringBookings.length} موعد</span>
            </span>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {recurringBookings.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#179955] text-white font-black text-[11px]">
                    {b.day_name ? b.day_name.slice(0, 3) : 'يوم'}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-black text-[#111313] dark:text-[#F5F7F2] truncate">
                      كل يوم {b.day_name || 'أسبوعي'}
                    </p>
                    {b.terrain && (
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-[#65706A] dark:text-[#B2B9B3] truncate">
                        <MapPin className="size-3 shrink-0" />
                        <span className="truncate">{b.terrain.name}</span>
                        {b.terrain.city && <span>({b.terrain.city})</span>}
                      </p>
                    )}
                  </div>
                </div>
                {b.start_time && (
                  <div className="inline-flex items-center gap-1 rounded-lg border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] px-2.5 py-1 text-[11px] font-black text-[#111313] dark:text-[#F5F7F2] shrink-0">
                    <Clock className="size-3 text-[#179955] dark:text-[#D0FF38]" />
                    <span className="tabular-nums" dir="ltr">
                      {b.start_time} - {b.end_time}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}
