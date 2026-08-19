import { useTranslation } from 'react-i18next'
import {
  ArrowLeftRight,
  CircleDot,
  Clock,
  Hand,
  Info,
  Loader2,
  MapPin,
  RectangleHorizontal,
  Square,
  Trophy,
  X,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { TeamAvatar } from '../shared'

const EVENT_STYLE = {
  goal: 'bg-emerald-50 text-emerald-600',
  penalty_goal: 'bg-amber-50 text-amber-600',
  own_goal: 'bg-rose-50 text-rose-500',
  assist: 'bg-sky-50 text-sky-600',
  yellow_card: 'bg-amber-50 text-amber-500',
  second_yellow: 'bg-rose-50 text-amber-600',
  red_card: 'bg-rose-50 text-rose-600',
  substitution: 'bg-slate-100 text-slate-500',
}

const EVENT_ICON = {
  goal: CircleDot,
  penalty_goal: CircleDot,
  own_goal: CircleDot,
  assist: Hand,
  yellow_card: RectangleHorizontal,
  second_yellow: RectangleHorizontal,
  red_card: Square,
  substitution: ArrowLeftRight,
}

function eventMeta(type) {
  const Icon = EVENT_ICON[type] || Info
  return { Icon, className: EVENT_STYLE[type] || 'bg-slate-100 text-slate-400' }
}

function EventRow({ event }) {
  const { Icon, className } = eventMeta(event.type)
  return (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
      <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${className}`}>
        <Icon className="size-3.5" />
      </span>
      <p className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">
        {event.description || [event.player_name, event.team_name].filter(Boolean).join(' • ') || '—'}
      </p>
      <span className="shrink-0 text-[10px] font-black text-slate-400">{event.minute}'</span>
    </div>
  )
}

function TeamSide({ team, winner, isLive }) {
  const { t } = useTranslation()
  return (
    <div className={`flex flex-1 flex-col items-center gap-2 ${winner ? '' : 'opacity-80'}`}>
      <div className="relative">
        <TeamAvatar team={team} className="size-16" />
        {isLive && <span className="absolute -end-1 -top-1 size-3 animate-pulse rounded-full bg-rose-500 ring-2 ring-white" />}
        {winner && (
          <span className="absolute -start-1 -top-1 grid size-5 place-items-center rounded-full bg-amber-500 text-white shadow">
            <Trophy className="size-3" />
          </span>
        )}
      </div>
      <p className="max-w-full truncate text-center text-xs font-black text-slate-900">{team?.name || '—'}</p>
      {winner && <p className="text-[10px] font-bold text-amber-600">{t('public.matchDetail.winner')}</p>}
    </div>
  )
}

export default function MatchDetailModal({ open, onClose, tournamentKey, fixture }) {
  const { t } = useTranslation()
  const matchId = fixture?.match?.id
  const enabled = open && Boolean(tournamentKey) && Boolean(matchId)

  const detailQuery = useApi(
    () => api.get(`/v1/tournaments/${tournamentKey}/matches/${matchId}`).then((r) => r.data.data),
    [tournamentKey, matchId],
    { enabled, staleTime: 30 * 1000 },
  )

  if (!open) return null

  const m = detailQuery.data
  const hasPenalties = m?.is_finished && m?.home_penalties != null && m?.away_penalties != null
  const events = m?.events || []

  const liveLabel = m?.is_live
    ? m?.current_period
      ? t(`public.matchDetail.period.${m.current_period}`, { defaultValue: m.current_period })
      : t('public.matchDetail.live')
    : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-[1.75rem] bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 px-6 pb-2 pt-6">
          <p className="text-sm font-black text-slate-900">{t('public.matchDetail.title')}</p>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            aria-label={t('common.close')}
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {detailQuery.loading && (
            <div className="flex flex-col items-center gap-3 py-16">
              <Loader2 className="size-6 animate-spin text-slate-300" />
              <p className="text-xs font-semibold text-slate-400">{t('common.loading')}</p>
            </div>
          )}

          {detailQuery.error && (
            <div className="rounded-2xl border border-dashed border-slate-200 py-16 text-center">
              <p className="text-xs font-bold text-slate-500">{detailQuery.error}</p>
            </div>
          )}

          {m && (
            <div className="space-y-5">
              {(m.stadium || m.round || m.group || m.scheduled_at) && (
                <div className="grid grid-cols-2 gap-2">
                  {m.scheduled_at && (
                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                      <Clock className="size-3.5 text-slate-400" />
                      <span className="truncate text-[11px] font-bold text-slate-600">{new Date(m.scheduled_at).toLocaleString()}</span>
                    </div>
                  )}
                  {m.stadium?.name && (
                    <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                      <MapPin className="size-3.5 text-slate-400" />
                      <span className="truncate text-[11px] font-bold text-slate-600">{m.stadium.name}</span>
                    </div>
                  )}
                  {m.round?.name && (
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-600">{m.round.name}</div>
                  )}
                  {m.group?.name && (
                    <div className="rounded-xl bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-600">{m.group.name}</div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-center gap-4">
                <TeamSide team={m.home_team} score={m.home_score} winner={m.is_finished && m.winner_team_id === m.home_team?.id} isLive={m.is_live} />
                <div className="shrink-0 text-center">
                  <p className="text-3xl font-black tracking-widest text-slate-900">
                    {m.is_finished || m.is_live ? `${m.home_score ?? 0} - ${m.away_score ?? 0}` : 'VS'}
                  </p>
                  {hasPenalties && (
                    <p className="mt-1 text-[10px] font-black text-slate-400">({m.home_penalties} - {m.away_penalties})</p>
                  )}
                  <span
                    className={`mt-2 inline-block rounded-full px-2.5 py-1 text-[10px] font-black ${
                      m.is_live
                        ? 'bg-rose-50 text-rose-600'
                        : m.is_finished
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {m.is_live ? (liveLabel && `● ${liveLabel}${m.current_minute ? ` • ${m.current_minute}'` : ''}`) : t(`public.tournamentPage.matchStatus.${m.status}`)}
                  </span>
                </div>
                <TeamSide team={m.away_team} score={m.away_score} winner={m.is_finished && m.winner_team_id === m.away_team?.id} isLive={m.is_live} />
              </div>

              {events.length > 0 ? (
                <div>
                  <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">{t('public.matchDetail.events')}</p>
                  <div className="space-y-1.5">
                    {events.map((e) => (
                      <EventRow key={e.id ?? e.uuid} event={e} />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-xs font-semibold text-slate-400">
                  {t('public.matchDetail.noEvents')}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
