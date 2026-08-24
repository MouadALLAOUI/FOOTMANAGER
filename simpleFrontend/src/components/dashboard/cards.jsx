import {
  CalendarDays,
  Clock,
  MapPin,
  Phone,
  Repeat,
  ShieldCheck,
  Swords,
  Trophy,
  UserRound,
  Zap,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, StatusBadge } from './ui'
import { thumb, logoThumb, photoThumb } from '../../lib/thumb'

function TeamBadge({ team, logo, sub, align = 'start' }) {
  const { t } = useTranslation()
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
          {team?.name || t('ov.common.unknownTeam')}
        </p>
        {sub && <p className="truncate text-[11px] text-slate-400">{sub}</p>}
      </div>
    </div>
  )
}

export function MatchCard({ match, actions, onClick }) {
  const { t } = useTranslation()
  const isHost = Boolean(match.opponent_team)
  const datetime = match.match_datetime ? new Date(match.match_datetime) : null
  const hasScore = match.host_score !== null && match.host_score !== undefined

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-green-200 hover:shadow-[0_14px_32px_rgba(15,23,42,0.09)]"
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <StatusBadge status={match.status} />
        {match.score_status && match.score_status !== 'none' && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-600 ring-1 ring-amber-200">
            <Zap className="size-3" />
            {match.score_status === 'pending_confirmation'
              ? t('ov.common.scorePending')
              : match.score_status === 'disputed'
                ? t('ov.common.scoreDisputed')
                : t('ov.common.scoreConfirmed')}
          </span>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <TeamBadge
          team={match.host_team}
          logo={logoThumb(match.host_team)}
          sub={match.host_team?.city || t('ov.common.host')}
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
            {hasScore && <span className="text-[10px] font-bold text-slate-400">{t('ov.common.score')}</span>}
          </div>
        ) : (
          <div className="flex shrink-0 flex-col items-center gap-0.5">
            <span className="grid size-9 place-items-center rounded-full bg-green-50 text-green-600">
              <Swords className="size-4" />
            </span>
            <span className="text-[10px] font-bold text-green-600">{t('ov.common.lookingOpponent')}</span>
          </div>
        )}
        <TeamBadge
          team={match.opponent_team}
          logo={logoThumb(match.opponent_team)}
          sub={isHost ? match.opponent_team?.city : match.target_team?.name || t('ov.common.potentialOpponent')}
          align="end"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-100 pt-4 text-[11px] font-semibold text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-3.5 text-green-500" />
          {datetime ? new Intl.DateTimeFormat('ar-MA', { weekday: 'long', day: 'numeric', month: 'long' }).format(datetime) : t('ov.common.noTime')}
        </span>
        {datetime && (
          <span className="inline-flex items-center gap-1.5">
            <Clock className="size-3.5 text-green-500" />
            {new Intl.DateTimeFormat('ar-MA', { hour: '2-digit', minute: '2-digit' }).format(datetime)}
          </span>
        )}
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="size-3.5 text-green-500" />
          {match.stadium?.name || match.custom_terrain_name || t('ov.common.unspecifiedStadium')}
        </span>
        {match.price_per_player ? (
          <span className="ms-auto inline-flex items-center gap-1 font-extrabold text-slate-700">
            {match.price_per_player}
            <span className="font-semibold text-slate-400">{t('ov.common.perPlayer')}</span>
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
        {match.player_format ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-600 ring-1 ring-emerald-200">
            {match.player_format}
          </span>
        ) : null}
      </div>

      {actions && <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-100 pt-4">{actions}</div>}
    </div>
  )
}

function safeStr(v, fallback = '') {
  if (v == null) return fallback
  if (typeof v === 'object') return fallback
  return String(v)
}

export function BookingCard({ booking, actions }) {
  const { t } = useTranslation()
  const terrain = booking.terrain && typeof booking.terrain === 'object' && !Array.isArray(booking.terrain) ? booking.terrain : {}
  const start = booking.start_time
  const end = booking.end_time
  const date = booking.next_date || booking.booking_date
  const isWeekly = booking.reservation_type === 'weekly_subscription'
  const subscriptionStatus = typeof booking.subscription_status === 'string' ? booking.subscription_status : null
  const occurrencesRemaining = typeof booking.occurrences_remaining === 'number' ? booking.occurrences_remaining : null

  const subscriptionStatusColors = {
    active: 'bg-emerald-50 text-emerald-600 ring-emerald-200',
    expired: 'bg-rose-50 text-rose-600 ring-rose-200',
    inactive: 'bg-slate-50 text-slate-600 ring-slate-200',
  }

  return (
    <div className="group overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-green-200 hover:shadow-[0_14px_32px_rgba(15,23,42,0.09)]">
      <div className="flex gap-4 p-5">
        {terrain.image_url ? (
          <img loading="lazy" decoding="async" src={terrain.thumbnail_url || terrain.image_url} alt="" className="size-16 shrink-0 rounded-2xl object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-green-50 to-emerald-100 text-green-600">
            <ShieldCheck className="size-7" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-slate-900">{safeStr(terrain.name, t('ov.common.terrain'))}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                <MapPin className="size-3 text-green-500" />
                {safeStr(terrain.city, '—')} {terrain.type ? `• ${safeStr(terrain.type)}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isWeekly && subscriptionStatus && subscriptionStatus !== 'not_subscription' && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ring-1 ${subscriptionStatusColors[subscriptionStatus] || 'bg-slate-50 text-slate-600 ring-slate-200'}`}>
                  <Repeat className="size-3" />
                  {subscriptionStatus === 'active' ? 'نشط' : subscriptionStatus === 'expired' ? 'منتهي' : 'غير نشط'}
                </span>
              )}
              <StatusBadge status={booking.status} />
            </div>
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
            {isWeekly && (
              <span className="inline-flex items-center gap-1 text-violet-600">
                <Repeat className="size-3" />
                أسبوعي
              </span>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            {typeof booking.price === 'number' && booking.price > 0 && (
              <p className="text-sm font-black text-slate-900">
                {booking.price}
                <span className="ms-1 text-[11px] font-bold text-slate-400">{t('ov.common.currency')}</span>
              </p>
            )}
            {isWeekly && subscriptionStatus === 'active' && occurrencesRemaining !== null && (
              <span className="text-[11px] font-bold text-emerald-600">
                {occurrencesRemaining} أسبوع متبقي
              </span>
            )}
          </div>
        </div>
      </div>
      {actions && (
        <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-3.5">{actions}</div>
      )}
    </div>
  )
}

export function PlayerCard({ player, actions, subtitle }) {
  const { t } = useTranslation()
  const profile = player.player_profile || player
  const name = player.name || profile?.user?.name || t('ov.common.player')
  const photo = photoThumb(profile) || profile?.photo
  const rating = profile?.rating ?? profile?.overall_rating
  const skill = profile?.skill_level

  return (
    <div className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-green-200 hover:shadow-[0_14px_32px_rgba(15,23,42,0.09)]">
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
              {profile?.position || t('ov.common.unspecified')}
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
          <p className="text-[10px] font-bold text-slate-400">{t('ov.common.points')}</p>
        </div>
        <div>
          <p className="text-sm font-black text-slate-800">{profile?.matches_played ?? 0}</p>
          <p className="text-[10px] font-bold text-slate-400">{t('ov.common.matches')}</p>
        </div>
        <div>
          <p className="text-sm font-black text-slate-800">{profile?.preferred_foot || '—'}</p>
          <p className="text-[10px] font-bold text-slate-400">{t('ov.common.preferredFoot')}</p>
        </div>
      </div>
      {actions && <div className="mt-4 flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function ManagerContact({ manager }) {
  const { t } = useTranslation()
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
      {isWa && t('ov.common.whatsapp')}
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
