import { Link } from 'react-router-dom'
import { Calendar, ChevronLeft, MapPin, Shield, Tag, UserCheck, Users } from 'lucide-react'
import TeamLogo from '../../../components/profile/TeamLogo'

export default function PlayerTeamCard({ player }) {
  if (!player) return null

  const team = player.team

  return (
    <div className="rounded-3xl border border-slate-800 bg-[#0F172A]/80 p-5 sm:p-6 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
          <Users className="size-5 text-emerald-400" />
          <span>الانتماء الرياضي</span>
        </h2>
      </div>

      {team ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <TeamLogo team={team} className="size-14 rounded-2xl" />

            <div className="min-w-0">
              <h3 className="text-base font-black text-white truncate">
                {team.name}
              </h3>

              <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-slate-400">
                {team.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="size-3 text-rose-400 shrink-0" />
                    <span>{team.city}</span>
                  </span>
                )}
                {team.category && (
                  <span className="flex items-center gap-1">
                    <Tag className="size-3 text-sky-400 shrink-0" />
                    <span>فئة: {team.category}</span>
                  </span>
                )}
                {player.joined_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="size-3 text-amber-400 shrink-0" />
                    <span>انضم في: {player.joined_at}</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="w-full sm:w-auto flex justify-end shrink-0">
            <Link
              to={`/matches?team=${encodeURIComponent(team.name)}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-emerald-600 hover:border-emerald-500 hover:text-white px-3.5 py-2 text-xs font-bold text-slate-200 transition-all shadow-xs"
            >
              <span>مباريات الفريق</span>
              <ChevronLeft className="size-3.5 rtl:rotate-0 ltr:rotate-180" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4 rounded-2xl border border-dashed border-sky-500/30 bg-sky-950/20 p-5 text-center sm:text-start">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sky-500/20 text-sky-400">
            <UserCheck className="size-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h3 className="text-sm font-black text-sky-300">لاعب حر (غير مرتبط بفريق)</h3>
              <span className="rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-black text-sky-300">
                Free Agent
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              اللاعب متاح حالياً للانضمام إلى الفرق والمشاركة في الدوريات والمباريات الودية عبر منصة أجي نقصرو.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
