import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  CheckCircle2,
  Footprints,
  Ruler,
  Share2,
  Shield,
  Star,
  UserCheck,
  Weight,
} from 'lucide-react'
import TeamLogo from '../../../components/profile/TeamLogo'

export const formatPositionArabic = (pos) => {
  if (!pos) return 'لاعب ميدان'
  const p = pos.toLowerCase()
  if (p === 'goalkeeper' || p === 'gk') return 'حارس مرمى'
  if (p === 'defender' || p === 'cb' || p === 'lb' || p === 'rb') return 'مدافع'
  if (p === 'midfielder' || p === 'cm' || p === 'cdm' || p === 'cam') return 'لاعب وسط'
  if (p === 'forward' || p === 'striker' || p === 'st' || p === 'lw' || p === 'rw') return 'مهاجم'
  return pos
}

export const formatRoleArabic = (role) => {
  if (!role) return null
  const r = role.toLowerCase()
  if (r === 'starter') return 'لاعب أساسي'
  if (r === 'substitute') return 'لاعب بديل'
  if (r === 'reserve') return 'احتياطي'
  return role
}

export const formatFootArabic = (foot) => {
  if (!foot) return null
  const f = foot.toLowerCase()
  if (f === 'right') return 'اليمنى'
  if (f === 'left') return 'اليسرى'
  if (f === 'both') return 'كلتا القدمين'
  return foot
}

export default function PlayerHeader({ player, onShareClick }) {
  const [imgError, setImgError] = useState(false)

  if (!player) return null

  const initials = player.name
    ? player.name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join('')
    : 'ل'

  const hasPhoto = Boolean(player.avatar_url) && !imgError

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-800 bg-[#0F172A] p-5 sm:p-8 text-white shadow-2xl">
      {/* Background Stadium Glow & Atmospheric Lines */}
      <div className="pointer-events-none absolute -start-24 -top-24 size-72 rounded-full bg-emerald-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -end-24 -bottom-24 size-72 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800/40 via-transparent to-transparent" />

      <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6">
        {/* Avatar Frame with Glowing Shield/Circle Effect */}
        <div className="relative shrink-0">
          <div className="relative size-28 sm:size-32 rounded-3xl p-1 bg-gradient-to-tr from-emerald-500 via-emerald-400 to-amber-400 shadow-xl shadow-emerald-950/40">
            <div className="size-full overflow-hidden rounded-[22px] bg-slate-900 grid place-items-center">
              {hasPhoto ? (
                <img
                  src={player.avatar_url}
                  alt={player.name}
                  onError={() => setImgError(true)}
                  className="size-full object-cover object-top"
                />
              ) : (
                <div className="flex size-full flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-emerald-400">
                  <span className="text-3xl font-black">{initials}</span>
                </div>
              )}
            </div>
          </div>

          {/* Shirt Number Badge */}
          {player.number != null && (
            <div className="absolute -bottom-2 -end-2 grid size-9 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black text-sm shadow-md border-2 border-[#0F172A]">
              #{player.number}
            </div>
          )}
        </div>

        {/* Player Details & Badges */}
        <div className="flex-1 text-center md:text-start min-w-0">
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
            {/* Position Badge */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-1 text-xs font-black text-emerald-300">
              <Shield className="size-3.5 text-emerald-400" />
              <span>{formatPositionArabic(player.position)}</span>
            </span>

            {/* Essential Star Badge */}
            {player.is_essential && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-xs font-black text-amber-300">
                <Star className="size-3 text-amber-400 fill-amber-400" />
                <span>عنصر أساسي</span>
              </span>
            )}

            {/* Role Badge */}
            {player.role && (
              <span className="inline-flex items-center rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs font-bold text-slate-300">
                {formatRoleArabic(player.role)}
              </span>
            )}
          </div>

          {/* Player Name */}
          <div className="flex items-center justify-center md:justify-start gap-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight">
              {player.name}
            </h1>
            <CheckCircle2 className="size-5 sm:size-6 text-emerald-400 fill-emerald-500/20 shrink-0" title="لاعب موثق" />
          </div>

          {/* Team / Free Agent Status */}
          <div className="mt-3 flex flex-wrap items-center justify-center md:justify-start gap-3">
            {player.team ? (
              <Link
                to={`/matches?team=${encodeURIComponent(player.team.name)}`}
                className="group inline-flex items-center gap-2.5 rounded-2xl border border-slate-700/80 bg-slate-800/70 hover:bg-slate-800 hover:border-emerald-500/50 px-3.5 py-1.5 text-xs font-bold text-slate-200 transition-all shadow-sm"
              >
                <TeamLogo team={player.team} className="size-6 rounded-lg" />
                <span className="group-hover:text-emerald-300 transition-colors">
                  {player.team.name}
                </span>
                {player.team.city && (
                  <span className="text-[11px] font-medium text-slate-400">
                    ({player.team.city})
                  </span>
                )}
              </Link>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-2xl border border-sky-500/30 bg-sky-500/15 px-3 py-1.5 text-xs font-bold text-sky-300">
                <UserCheck className="size-4 text-sky-400" />
                <span>لاعب حر (بدون فريق حالي)</span>
              </span>
            )}
          </div>

          {/* Secondary Attributes (Foot, Height, Weight, Age) */}
          <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-4 text-xs font-semibold text-slate-400 border-t border-slate-800/80 pt-3">
            {player.preferred_foot && (
              <div className="flex items-center gap-1.5">
                <Footprints className="size-3.5 text-emerald-400" />
                <span>القدم: <strong className="text-slate-200">{formatFootArabic(player.preferred_foot)}</strong></span>
              </div>
            )}
            {player.height_cm && (
              <div className="flex items-center gap-1.5">
                <Ruler className="size-3.5 text-amber-400" />
                <span>الطول: <strong className="text-slate-200">{player.height_cm} سم</strong></span>
              </div>
            )}
            {player.weight_kg && (
              <div className="flex items-center gap-1.5">
                <Weight className="size-3.5 text-sky-400" />
                <span>الوزن: <strong className="text-slate-200">{player.weight_kg} كغ</strong></span>
              </div>
            )}
            {player.age && (
              <div className="flex items-center gap-1.5">
                <span>العمر: <strong className="text-slate-200">{player.age} سنة</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Share Profile CTA */}
        <div className="shrink-0 w-full md:w-auto">
          <button
            type="button"
            onClick={onShareClick}
            className="flex w-full md:w-auto items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 px-5 py-3 text-sm font-black text-white shadow-lg shadow-emerald-900/40 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
          >
            <Share2 className="size-4" />
            <span>مشاركة بطاقة اللاعب</span>
          </button>
        </div>
      </div>
    </div>
  )
}
