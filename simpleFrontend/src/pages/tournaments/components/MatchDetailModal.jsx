import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeftRight,
  CalendarDays,
  CircleDot,
  CircleX,
  Crown,
  Flag,
  Hand,
  HeartPulse,
  Info,
  Loader2,
  MapPin,
  Monitor,
  Pause,
  Play,
  RectangleHorizontal,
  Square,
  Timer,
  Trophy,
  UserRound,
  X,
} from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { useProfileModal } from '../../../components/profile/ProfileModalContext'
import { TeamAvatar } from '../shared'
import { logoThumb } from '../../../lib/thumb'
import { validateImages } from '../../committee/tournaments/export/collectImages'
import MatchPdfDocument from './MatchPdfDocument'
import { sortMatchEvents, minuteText, sideOf, eventText } from '../matchEvents'

const EVENT_STYLE = {
  goal: 'bg-emerald-50 text-emerald-600',
  penalty_goal: 'bg-amber-50 text-amber-600',
  missed_penalty: 'bg-rose-50 text-rose-500',
  own_goal: 'bg-rose-50 text-rose-500',
  assist: 'bg-sky-50 text-sky-600',
  yellow_card: 'bg-amber-50 text-amber-500',
  second_yellow: 'bg-rose-50 text-amber-600',
  red_card: 'bg-rose-50 text-rose-600',
  substitution: 'bg-slate-100 text-slate-500',
  injury: 'bg-amber-50 text-amber-600',
  timeout: 'bg-amber-50 text-amber-600',
  half_time: 'bg-slate-100 text-slate-500',
  second_half: 'bg-sky-50 text-sky-600',
  kickoff: 'bg-emerald-50 text-emerald-600',
  match_end: 'bg-slate-100 text-slate-500',
  var: 'bg-violet-50 text-violet-600',
}

const EVENT_ICON = {
  goal: CircleDot,
  penalty_goal: CircleDot,
  missed_penalty: CircleX,
  own_goal: CircleDot,
  assist: Hand,
  yellow_card: RectangleHorizontal,
  second_yellow: RectangleHorizontal,
  red_card: Square,
  substitution: ArrowLeftRight,
  injury: HeartPulse,
  timeout: Timer,
  half_time: Pause,
  second_half: Play,
  kickoff: Play,
  match_end: Flag,
  var: Monitor,
}

function eventMeta(type) {
  const Icon = EVENT_ICON[type] || Info
  return { Icon, className: EVENT_STYLE[type] || 'bg-slate-100 text-slate-400' }
}

function typeLabelKey(type) {
  switch (type) {
    case 'goal':
      return 'committee.export.event.goal'
    case 'penalty_goal':
      return 'public.matchDetail.type.penalty'
    case 'missed_penalty':
      return 'public.matchDetail.type.missedPenalty'
    case 'own_goal':
      return 'committee.export.event.ownGoal'
    case 'assist':
      return 'committee.export.event.assist'
    case 'yellow_card':
    case 'second_yellow':
      return 'committee.export.event.yellow'
    case 'red_card':
      return 'committee.export.event.red'
    case 'substitution':
      return 'public.matchDetail.type.substitution'
    case 'injury':
      return 'public.matchDetail.type.injury'
    case 'timeout':
      return 'public.matchDetail.type.timeout'
    case 'half_time':
      return 'public.matchDetail.type.halfTime'
    case 'second_half':
      return 'public.matchDetail.type.secondHalf'
    case 'kickoff':
      return 'public.matchDetail.type.kickoff'
    case 'match_end':
      return 'public.matchDetail.type.matchEnd'
    case 'var':
      return 'public.matchDetail.type.var'
    default:
      return 'public.matchDetail.type.other'
  }
}

function matchFileName(m) {
  const date = m.scheduled_at ? new Date(m.scheduled_at).toISOString().slice(0, 10) : ''
  const ascii = (name) =>
    String(name || '')
      .trim()
      .replace(/[^A-Za-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  const home = ascii(m.home_team?.name) || `team-${m.home_team?.id || 0}`
  const away = ascii(m.away_team?.name) || `team-${m.away_team?.id || 0}`
  const datePart = date || new Date().toISOString().slice(0, 10)
  return `${home}-vs-${away}-${datePart}.pdf`
}

function TeamSide({ team, winner, isLive, onOpen }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!onOpen}
      className={`group flex flex-1 flex-col items-center gap-2 text-center ${winner ? '' : 'opacity-80'}`}
    >
      <span className="relative">
        <TeamAvatar team={team} className={`size-20 ${onOpen ? 'transition-transform group-hover:scale-105' : ''}`} />
        {isLive && <span className="absolute -end-1 -top-1 size-3 animate-pulse rounded-full bg-rose-500 ring-2 ring-white" />}
        {winner && (
          <span className="absolute -start-1 -top-1 grid size-5 place-items-center rounded-full bg-amber-500 text-white shadow">
            <Trophy className="size-3" />
          </span>
        )}
      </span>
      <span className="block max-w-full truncate text-center text-sm font-black text-slate-900 transition-colors group-hover:text-green-700">
        {team?.name || '—'}
      </span>
      {winner && <span className="text-[10px] font-bold text-amber-600">{t('public.matchDetail.winner')}</span>}
      <span className="inline-flex h-4 items-center gap-1 rounded-full bg-slate-100 px-2 text-[9px] font-black text-slate-400 opacity-0 transition-opacity group-hover:opacity-100">
        <UserRound className="size-2.5" />
        {t('public.matchDetail.viewTeam')}
      </span>
    </button>
  )
}

function TimelineRow({ event, side, homeTeam, awayTeam }) {
  const { t } = useTranslation()
  const { Icon, className } = eventMeta(event.type)
  const text = eventText(event)

  const crest =
    side !== 'neutral' ? (
      <TeamAvatar team={side === 'home' ? homeTeam : awayTeam} className="size-5 shrink-0" />
    ) : null

  const chip = (
    <span className={`grid size-6 shrink-0 place-items-center rounded-lg ${className}`}>
      <Icon className="size-3" />
    </span>
  )

  const body = text ? (
    <p className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">{text}</p>
  ) : (
    <p className="min-w-0 flex-1 truncate text-[11px] font-bold text-slate-400">{t(typeLabelKey(event.type))}</p>
  )

  const minute = (
    <span className={`shrink-0 text-[10px] font-black tabular-nums ${side === 'neutral' ? 'text-slate-300' : 'text-slate-400'}`}>
      {minuteText(event)}
    </span>
  )

  if (side === 'home') {
    return (
      <div className="flex items-center justify-start gap-2 ps-1 pe-0">
        {crest}
        {chip}
        {body}
        {minute}
      </div>
    )
  }
  if (side === 'away') {
    return (
      <div className="flex items-center justify-end gap-2 ps-0 pe-1">
        {minute}
        {body}
        {chip}
        {crest}
      </div>
    )
  }
  return (
    <div className="flex items-center justify-center gap-2">
      {chip}
      {body}
      {minute}
    </div>
  )
}

export default function MatchDetailModal({ open, onClose, tournamentKey, fixture }) {
  const { t } = useTranslation()
  const { openTeam } = useProfileModal()
  const [pdfBusy, setPdfBusy] = useState(false)
  const matchId = fixture?.match?.id ?? fixture?.match_id
  const enabled = open && Boolean(tournamentKey) && Boolean(matchId)

  const detailQuery = useApi(
    () => api.get(`/v1/tournaments/${tournamentKey}/matches/${matchId}`).then((r) => r.data.data),
    [tournamentKey, matchId],
    { enabled, staleTime: 30 * 1000 },
  )

  if (!open) return null

  const m = detailQuery.data
  const hasPenalties = m?.is_finished && m?.home_penalties != null && m?.away_penalties != null
  const events = sortMatchEvents(m?.events || [])
  const homeId = m?.home_team?.id
  const awayId = m?.away_team?.id
  const sides = events.map((e) => sideOf(e, homeId, awayId))
  const isFinished = Boolean(m?.is_finished)

  const liveLabel = m?.is_live
    ? m?.current_period
      ? t(`public.matchDetail.period.${m.current_period}`, { defaultValue: m.current_period })
      : t('public.matchDetail.live')
    : null

  const handlePdf = async () => {
    if (!m || pdfBusy || !isFinished) return
    setPdfBusy(true)
    try {
      const urls = [logoThumb(m.home_team), logoThumb(m.away_team)].filter(Boolean)
      const images = await validateImages(urls)
      const blob = await pdf(<MatchPdfDocument match={m} images={images} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = matchFileName(m)
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch {
      /* swallow — a toast would be nice but this matches existing export behaviour */
    } finally {
      setPdfBusy(false)
    }
  }

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
              <div className="flex items-center justify-center gap-4">
                <TeamSide
                  team={m.home_team}
                  winner={m.is_finished && m.winner_team_id === m.home_team?.id}
                  isLive={m.is_live}
                  onOpen={m.home_team?.id != null ? () => openTeam(m.home_team) : undefined}
                />
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
                <TeamSide
                  team={m.away_team}
                  winner={m.is_finished && m.winner_team_id === m.away_team?.id}
                  isLive={m.is_live}
                  onOpen={m.away_team?.id != null ? () => openTeam(m.away_team) : undefined}
                />
              </div>

              {(m.stadium || m.round || m.group || m.scheduled_at) && (
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {m.scheduled_at && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                      <CalendarDays className="size-3 text-slate-400" />
                      {new Date(m.scheduled_at).toLocaleString()}
                    </span>
                  )}
                  {m.stadium?.name && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                      <MapPin className="size-3 text-slate-400" />
                      {m.stadium.name}
                    </span>
                  )}
                  {(m.round?.name || m.group?.name) && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                      <Crown className="size-3 text-slate-400" />
                      {m.round?.name || m.group?.name}
                    </span>
                  )}
                </div>
              )}

              <div>
                <p className="mb-2 text-[11px] font-black uppercase tracking-wide text-slate-400">{t('public.matchDetail.events')}</p>
                {events.length > 0 ? (
                  <div className="flex flex-col gap-1.5">
                    {events.map((e, i) => (
                      <TimelineRow key={e.id ?? e.uuid ?? i} event={e} side={sides[i]} homeTeam={m.home_team} awayTeam={m.away_team} />
                    ))}
                  </div>
                ) : (
                  <p className="rounded-2xl border border-dashed border-slate-200 py-8 text-center text-xs font-semibold text-slate-400">
                    {t('public.matchDetail.noEvents')}
                  </p>
                )}
              </div>

              {isFinished && (
                <button
                  type="button"
                  onClick={handlePdf}
                  disabled={pdfBusy}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-bold text-green-700 transition hover:bg-green-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pdfBusy ? <Loader2 className="size-4 animate-spin" /> : <Flag className="size-4" />}
                  {pdfBusy ? t('public.matchDetail.generatingPdf') : t('public.matchDetail.downloadPdf')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}