import { Link } from 'react-router-dom'
import { ChevronLeft, MapPin, Trophy, Users } from 'lucide-react'
import TeamLogo from '../../../components/profile/TeamLogo'

const formatTournamentStatus = (status) => {
  switch (status) {
    case 'in_progress':
      return { label: 'جارية الآن', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
    case 'open_for_registration':
      return { label: 'التسجيل مفتوح', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
    case 'registration_closed':
      return { label: 'مغلقة للتسجيل', color: 'bg-sky-500/15 text-sky-300 border-sky-500/30' }
    case 'completed':
      return { label: 'مكتملة', color: 'bg-slate-700/50 text-slate-300 border-slate-600' }
    default:
      return { label: 'بطولة معتمدة', color: 'bg-slate-800 text-slate-300 border-slate-700' }
  }
}

export default function PlayerActiveTournaments({ tournaments = [] }) {
  const hasTournaments = tournaments && tournaments.length > 0

  return (
    <div className="rounded-3xl border border-slate-800 bg-[#0F172A]/80 p-5 sm:p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
          <Trophy className="size-5 text-amber-400" />
          <span>البطولات النشطة</span>
          {hasTournaments && (
            <span className="grid size-5 place-items-center rounded-full bg-slate-800 text-[10px] font-black text-amber-300">
              {tournaments.length}
            </span>
          )}
        </h2>
      </div>

      {!hasTournaments ? (
        <div className="flex flex-col items-center justify-center py-10 px-4 text-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40">
          <div className="grid size-12 place-items-center rounded-2xl bg-slate-800/80 text-slate-500 mb-3">
            <Trophy className="size-6 text-slate-500" />
          </div>
          <p className="text-sm font-bold text-slate-300">
            لا يشارك حالياً في أي بطولة نشطة
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-sm">
            سيتم إدراج البطولات الجارية تلقائياً فور اعتماد تشكيلة الفريق في المنافسة.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments.map((t) => {
            const statusMeta = formatTournamentStatus(t.status)
            return (
              <div
                key={t.id}
                className="group flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition-all hover:border-slate-700 hover:bg-slate-900"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  {/* Tournament Logo or Icon */}
                  <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-500/20 to-slate-800 border border-amber-500/20 text-amber-400 overflow-hidden">
                    {t.logo_url ? (
                      <img
                        src={t.logo_url}
                        alt={t.name}
                        className="size-full object-cover"
                      />
                    ) : (
                      <Trophy className="size-6 text-amber-400" />
                    )}
                  </div>

                  {/* Title & Location */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/tournaments/${t.slug || t.id}`}
                        className="text-sm sm:text-base font-black text-white hover:text-emerald-400 transition-colors truncate"
                      >
                        {t.name}
                      </Link>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black ${statusMeta.color}`}>
                        {statusMeta.label}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                      {t.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3 text-rose-400 shrink-0" />
                          <span>{t.location}</span>
                        </span>
                      )}
                      {t.team_name && (
                        <span className="flex items-center gap-1.5 font-bold text-slate-300">
                          <Users className="size-3 text-emerald-400 shrink-0" />
                          <span>يمثل فريق: <strong className="text-white">{t.team_name}</strong></span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Direct Action Link */}
                <div className="w-full sm:w-auto flex justify-end shrink-0">
                  <Link
                    to={`/tournaments/${t.slug || t.id}`}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-emerald-600 hover:border-emerald-500 hover:text-white px-3.5 py-2 text-xs font-bold text-slate-200 transition-all shadow-xs"
                  >
                    <span>تفاصيل البطولة</span>
                    <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
