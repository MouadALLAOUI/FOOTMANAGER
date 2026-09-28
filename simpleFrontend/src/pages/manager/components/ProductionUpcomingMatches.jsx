import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CalendarDays, Clock, MapPin, ArrowLeft, ArrowRight } from 'lucide-react'
import { useCommandCenter } from './CommandCenterContext'
import TeamLogo from '../../../components/profile/TeamLogo'

export default function ProductionUpcomingMatches() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { upcoming, team, setMatch } = useCommandCenter()

  const isRtl = i18n.language?.startsWith('ar')
  const ArrowIcon = isRtl ? ArrowLeft : ArrowRight

  // Fallback realistic matches if DB doesn't have 3 scheduled yet
  const displayMatches = upcoming && upcoming.length > 0 ? upcoming.slice(0, 3) : [
    {
      id: 'demo-1',
      badge: isRtl ? 'مباراة ودية' : 'Friendly Match',
      isTournament: false,
      team1: { name: team?.name || (isRtl ? 'أجيال أيت لحسن' : 'Ajyal Ait Lahcen') },
      team2: { name: isRtl ? 'شباب المدينة' : 'Shabab Al Madina' },
      date: isRtl ? 'السبت 28 شتنبر 2024' : 'Sat 28 Sep 2024',
      time: '18:00',
      stadium: isRtl ? 'ملعب الحي المحمدي' : 'Hay Mohammadi Stadium',
    },
    {
      id: 'demo-2',
      badge: isRtl ? 'مباراة ودية' : 'Friendly Match',
      isTournament: false,
      team1: { name: team?.name || (isRtl ? 'أجيال أيت لحسن' : 'Ajyal Ait Lahcen') },
      team2: { name: isRtl ? 'نجوم السلام' : 'Noujoum Salam' },
      date: isRtl ? 'الأربعاء 2 أكتوبر 2024' : 'Wed 2 Oct 2024',
      time: '20:00',
      stadium: isRtl ? 'ملعب الزهراء' : 'Al Zahra Stadium',
    },
    {
      id: 'demo-3',
      badge: isRtl ? 'مباراة بطولة' : 'Tournament Match',
      isTournament: true,
      team1: { name: team?.name || (isRtl ? 'أجيال أيت لحسن' : 'Ajyal Ait Lahcen') },
      team2: { name: isRtl ? 'اتحاد النصر' : 'Ittihad Al Nasr' },
      date: isRtl ? 'السبت 5 أكتوبر 2024' : 'Sat 5 Oct 2024',
      time: '17:30',
      stadium: isRtl ? 'ملعب المدينة' : 'City Stadium',
    },
  ]

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="grid size-6 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
            <CalendarDays className="size-3.5" />
          </div>
          <h2 className="text-base font-black text-slate-900">
            {isRtl ? 'المباريات القادمة' : 'Upcoming Matches'}
          </h2>
        </div>

        <Link
          to="/dashboard/matches"
          className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-emerald-600 transition-colors"
        >
          <span>{isRtl ? 'عرض الكل' : 'View all'}</span>
          <ArrowIcon className="size-3.5" />
        </Link>
      </div>

      {/* 3 Matches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {displayMatches.map((m, idx) => {
          const isReal = Boolean(m.match_datetime)
          const oppName = isReal
            ? (m.opponent_team?.name || m.host_team?.name || 'الخصم')
            : m.team2.name
          const myName = isReal ? (team?.name || 'فريقي') : m.team1.name
          const stadiumName = isReal
            ? (m.stadium?.name || m.custom_terrain_name || 'ملعب محلي')
            : m.stadium
          const matchDate = isReal
            ? new Date(m.match_datetime).toLocaleDateString(isRtl ? 'ar-MA' : 'en-US', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })
            : m.date
          const matchTime = isReal
            ? new Date(m.match_datetime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : m.time

          return (
            <div
              key={m.id || idx}
              className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs hover:border-emerald-300 hover:shadow-sm transition-all"
            >
              {/* Badge */}
              <div className="flex justify-center pb-2">
                <span
                  className={`inline-block rounded-full px-3 py-0.5 text-[10px] font-black ${
                    m.isTournament || m.type === 'tournament'
                      ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                      : 'bg-sky-50 text-sky-700 ring-1 ring-sky-200'
                  }`}
                >
                  {m.badge || (isRtl ? 'مباراة ودية' : 'Friendly')}
                </span>
              </div>

              {/* Matchup Crests & VS */}
              <div className="flex items-center justify-between gap-2 py-3 px-1">
                {/* Team 1 */}
                <div className="flex flex-col items-center flex-1 text-center min-w-0">
                  <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 p-1 shadow-xs border border-slate-200/70">
                    <TeamLogo team={team} name={myName} className="size-10" rounded="rounded-xl" fontSize="text-sm" />
                  </div>
                  <span className="mt-2 text-xs font-black text-slate-800 line-clamp-1 w-full">
                    {myName}
                  </span>
                </div>

                {/* VS Badge */}
                <div className="grid size-7 shrink-0 place-items-center rounded-full bg-slate-100 text-[10px] font-black text-slate-500 border border-slate-200">
                  VS
                </div>

                {/* Team 2 */}
                <div className="flex flex-col items-center flex-1 text-center min-w-0">
                  <div className="grid size-12 place-items-center rounded-2xl bg-slate-100 p-1 shadow-xs border border-slate-200/70">
                    <TeamLogo name={oppName} className="size-10" rounded="rounded-xl" fontSize="text-sm" />
                  </div>
                  <span className="mt-2 text-xs font-black text-slate-800 line-clamp-1 w-full">
                    {oppName}
                  </span>
                </div>
              </div>

              {/* Date & Location */}
              <div className="space-y-1 py-2 text-center border-t border-slate-100 text-[11px] font-semibold text-slate-500">
                <p className="flex items-center justify-center gap-1">
                  <span>{matchDate}</span>
                </p>
                <p className="flex items-center justify-center gap-1 font-bold text-slate-700">
                  <Clock className="size-3 text-slate-400" />
                  <span>{matchTime}</span>
                </p>
                <p className="flex items-center justify-center gap-1 text-slate-500">
                  <MapPin className="size-3 text-emerald-600" />
                  <span className="truncate max-w-[170px]">{stadiumName}</span>
                </p>
              </div>

              {/* View Details Button */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (isReal) setMatch(m)
                    else navigate('/dashboard/matches')
                  }}
                  className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 py-2.5 text-xs font-black text-white shadow-xs transition-colors"
                >
                  {isRtl ? 'عرض التفاصيل' : 'View Details'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
