import {
  CalendarDays,
  Clock,
  MapPin,
  Phone,
  ShieldCheck,
  Swords,
  Trophy,
  UserRound,
  Zap,
} from 'lucide-react'
import { Button, StatusBadge } from './ui'
import { thumb, logoThumb, photoThumb } from '../../lib/thumb'

function TeamBadge({ team, logo, sub, align = 'start' }) {
  return (
    <div className={`flex min-w-0 items-center gap-2.5 ${align === 'end' ? 'flex-row-reverse text-end' : ''}`}>
      {team?.logo_url || logo ? (
        <img loading="lazy" decoding="async" src={thumb(team, 'logo_url') || logo} alt="" className="size-9 shrink-0 rounded-xl object-cover" />
      ) : (
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 text-sm font-black text-slate-500 ${
            align === 'end' ? 'order-1' : ''
          }`}
        >
          {(team?.name || '؟').slice(0, 1)}
        </span>
      )}
      <div className={`min-w-0 ${align === 'end' ? 'items-end' : ''}`}>
        <p className={`truncate text-sm font-extrabold text-slate-900 ${align === 'end' ? 'order-2' : ''}`}>
          {team?.name || 'فريق غير معروف'}
        </p>
        {sub && <p className="truncate text-[11px] text-slate-400">{sub}</p>}
      </div>
    </div>
  )
}

export function MatchCard({ match, actions, onClick }) {
  const isHost = Boolean(match.opponent_team)
  const datetime = match.match_datetime ? new Date(match.match_datetime) : null
  const hasScore = match.host_score !== null && match.host_score !== undefined

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-300 hover:border-green-200 hover:shadow-[0_14px_32px_rgba(15,23,42,0.09)]"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div className="flex items-center justify-between gap-3">
        <StatusBadge status={match.status} />
        {match.score_status && match.score_status !== 'none' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-600 ring-1 ring-amber-200">
            <Zap className="size-3" />
            {match.score_status === 'pending_confirmation'
              ? 'بانتظار تأكيد النتيجة'
              : match.score_status === 'disputed'
                ? 'اعتراض على النتيجة'
                : 'مؤكدة'}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <TeamBadge
          team={match.host_team}
          logo={logoThumb(match.host_team)}
          sub={match.host_team?.city || 'المضيف'}
        />
        {isHost ? (
          <div className="flex shrink-0 flex-col items-center gap-1">
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-slate-900">{match.host_score ?? '–'}</span>
              <span className="grid size-7 place-items-center rounded-full bg-slate-100 text-slate-400">
                <Swords className="size-3.5" />
              </span>
              <span className="text-xl font-black text-slate-900">{match.opponent_score ?? '–'}</span>
            </div>
            {hasScore && <span className="text-[10px] font-bold text-slate-400">النتيجة</span>}
          </div>
        ) : (
          <div className="flex shrink-0 flex-col items-center gap-0.5">
            <span className="grid size-9 place-items-center rounded-full bg-green-50 text-green-600">
              <Swords className="size-4" />
            </span>
            <span className="text-[10px] font-bold text-green-600">يبحث عن خصم</span>
          </div>
        )}
        <TeamBadge
          team={match.opponent_team}
          logo={logoThumb(match.opponent_team)}
          sub={isHost ? match.opponent_team?.city : match.target_team?.name || 'خصم محتمل'}
          align="end"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-4 text-[11px] font-semibold text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-3.5 text-green-500" />
          {datetime ? new Intl.DateTimeFormat('ar-MA', { weekday: 'long', day: 'numeric', month: 'long' }).format(datetime) : 'بدون وقت'}
        </span>
        {datetime && (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5 text-green-500" />
            {new Intl.DateTimeFormat('ar-MA', { hour: '2-digit', minute: '2-digit' }).format(datetime)}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-3.5 text-green-500" />
          {match.stadium?.name || match.custom_terrain_name || 'ملعب غير محدد'}
        </span>
        {match.price_per_player ? (
          <span className="ms-auto inline-flex items-center gap-1 font-extrabold text-slate-700">
            {match.price_per_player}
            <span className="font-semibold text-slate-400">د.م / لاعب</span>
          </span>
        ) : null}
        {match.needs_players ? (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${
              (match.players_remaining ?? 0) === 0
                ? 'bg-rose-50 text-rose-600 ring-1 ring-rose-200'
                : 'bg-violet-50 text-violet-600 ring-1 ring-violet-200'
            }`}
          >
            <UserRound className="size-3" />
            {match.players_joined ?? 0}/{match.players_needed}
          </span>
        ) : null}
      </div>

      {actions && <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">{actions}</div>}
    </div>
  )
}

export function BookingCard({ booking, actions }) {
  const terrain = booking.terrain || {}
  const start = booking.start_time
  const end = booking.end_time
  const date = booking.next_date || booking.booking_date

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-300 hover:border-green-200 hover:shadow-[0_14px_32px_rgba(15,23,42,0.09)]">
      <div className="flex gap-4 p-5">
        {terrain.image_url ? (
          <img loading="lazy" decoding="async" src={terrain.thumbnail_url || terrain.image_url} alt="" className="size-16 shrink-0 rounded-2xl object-cover" />
        ) : (
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 text-green-600">
            <ShieldCheck className="size-7" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-slate-900">{terrain.name || 'ملعب'}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                <MapPin className="size-3 text-green-500" />
                {terrain.city || '—'} {terrain.type ? `• ${terrain.type}` : ''}
              </p>
            </div>
            <StatusBadge status={booking.status} />
          </div>
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-semibold text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-3.5 text-green-500" />
              {date ? new Date(`${date}T00:00:00`).toLocaleDateString('ar-MA', { weekday: 'long', day: 'numeric', month: 'long' }) : '—'}
            </span>
            {start && (
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-3.5 text-green-500" />
                {start} - {end}
              </span>
            )}
          </div>
          {typeof booking.price === 'number' && booking.price > 0 && (
            <p className="mt-2 text-sm font-black text-slate-900">
              {booking.price}
              <span className="ms-1 text-[11px] font-bold text-slate-400">د.م</span>
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">{actions}</div>
      )}
    </div>
  )
}

export function PlayerCard({ player, actions, subtitle }) {
  const profile = player.player_profile || player
  const name = player.name || profile?.user?.name || 'لاعب'
  const photo = photoThumb(profile) || profile?.photo
  const rating = profile?.rating ?? profile?.overall_rating
  const skill = profile?.skill_level

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-300 hover:border-green-200 hover:shadow-[0_14px_32px_rgba(15,23,42,0.09)]">
      <div className="pointer-events-none absolute -end-10 -top-10 size-32 rounded-full bg-green-500/[0.05] blur-2xl" />
      <div className="flex items-start gap-4">
        {photo ? (
          <img loading="lazy" decoding="async" src={photo} alt="" className="size-14 shrink-0 rounded-2xl object-cover" />
        ) : (
          <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-green-100 to-emerald-200 text-lg font-black text-green-700">
            {name.slice(0, 1)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-extrabold text-slate-900">{name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-slate-400">
            <span className="inline-flex items-center gap-1">
              <UserRound className="size-3 text-green-500" />
              {profile?.position || 'غير محدد'}
            </span>
            {profile?.city && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3 text-green-500" />
                {profile.city}
              </span>
            )}
            {skill && (
              <span className="inline-flex items-center gap-1">
                <Zap className="size-3 text-amber-500" />
                {skill}
              </span>
            )}
            {subtitle}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-50 px-2.5 py-1.5 ring-1 ring-amber-200">
          <Trophy className="size-3.5 text-amber-500" />
          <span className="text-sm font-black text-amber-600">{rating ?? '—'}</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 text-center">
        <div>
          <p className="text-sm font-black text-slate-800">{profile?.points ?? 0}</p>
          <p className="text-[10px] font-bold text-slate-400">النقاط</p>
        </div>
        <div>
          <p className="text-sm font-black text-slate-800">{profile?.matches_played ?? 0}</p>
          <p className="text-[10px] font-bold text-slate-400">مباريات</p>
        </div>
        <div>
          <p className="text-sm font-black text-slate-800">{profile?.preferred_foot || '—'}</p>
          <p className="text-[10px] font-bold text-slate-400">القدم المفضلة</p>
        </div>
      </div>
      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function ManagerContact({ manager }) {
  if (!manager) return null
  const isWa = manager.is_whatsapp
  return (
    <a
      href={`${isWa ? 'https://wa.me/' : 'tel:'}${manager.phone}`}
      className="inline-flex items-center gap-1.5 text-[11px] font-bold text-green-600 hover:text-green-700"
      onClick={(e) => e.stopPropagation()}
    >
      <Phone className="size-3.5" />
      {manager.phone}
      {isWa && ' (واتساب)'}
    </a>
  )
}

export function QuickButton({ children, ...props }) {
  return (
    <Button variant="outline" size="sm" {...props}>
      {children}
    </Button>
  )
}
