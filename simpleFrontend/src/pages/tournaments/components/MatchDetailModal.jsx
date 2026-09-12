import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowLeftRight,
  CalendarDays,
  CircleDot,
  CircleX,
  Crown,
  Download,
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
import { usePublicSettings } from '../../../api/queries'
import { useProfileModal } from '../../../components/profile/ProfileModalContext'
import { TeamAvatar } from '../shared'
import { logoThumb } from '../../../lib/thumb'
import { validateImages } from '../../committee/tournaments/export/collectImages'
import MatchPdfDocument from './MatchPdfDocument'
import { sortMatchEvents, minuteText, sideOf, eventText } from '../matchEvents'
import MatchGlassModal from '../../../components/matches/MatchGlassModal'

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
  foul: 'bg-rose-50 text-rose-600',
  foul_yellow: 'bg-amber-50 text-amber-500',
  foul_second_yellow: 'bg-rose-50 text-amber-600',
  foul_red: 'bg-rose-50 text-rose-600',
  foul_penalty: 'bg-violet-50 text-violet-600',
  foul_none: 'bg-rose-50 text-rose-600',
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
  foul: CircleX,
  foul_yellow: RectangleHorizontal,
  foul_second_yellow: RectangleHorizontal,
  foul_red: Square,
  foul_penalty: CircleDot,
  foul_none: CircleX,
  half_time: Pause,
  second_half: Play,
  kickoff: Play,
  match_end: Flag,
  var: Monitor,
}

function eventMeta(event) {
  const effType = event.type === 'foul' ? `foul_${event.punishment || 'none'}` : event.type
  const Icon = EVENT_ICON[effType] || (event.type === 'foul' ? EVENT_ICON.foul : EVENT_ICON[event.type] || Info)
  return { Icon, className: EVENT_STYLE[effType] || EVENT_STYLE[event.type] || (event.type === 'foul' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-400') }
}

function typeLabelKey(type, punishment) {
  if (type === 'foul') {
    const key = punishment && punishment !== 'none' ? punishment : 'none'
    return `committee.result.punishments.${key}`
  }
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
    case 'foul':
      return 'public.matchDetail.type.foul'
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
  const { Icon, className } = eventMeta(event)
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

  const body = event.type === 'foul' ? (
    <div className="min-w-0 flex-1">
      <p className="truncate text-xs font-bold text-slate-700">{event.player?.name || event.description || ''}</p>
      <p className="truncate text-[10px] font-bold text-slate-400">{t(typeLabelKey(event.type, event.punishment))}</p>
    </div>
  ) : text ? (
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
  const [previewUrl, setPreviewUrl] = useState(null)
  const settingsQuery = usePublicSettings()
  const appName = settingsQuery.data?.settings?.platform_name
  const matchId = fixture?.match?.id ?? fixture?.match_id
  const enabled = open && Boolean(tournamentKey) && Boolean(matchId)

  const detailQuery = useApi(
    () => api.get(`/v1/tournaments/${tournamentKey}/matches/${matchId}`).then((r) => r.data.data),
    [tournamentKey, matchId],
    { enabled, staleTime: 30 * 1000 },
  )

  useEffect(() => {
    if (!open && previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
  }, [open, previewUrl])

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
      const blob = await pdf(<MatchPdfDocument match={m} images={images} appName={appName} />).toBlob()
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreviewUrl(URL.createObjectURL(blob))
    } catch {
      setPreviewUrl(null)
    } finally {
      setPdfBusy(false)
    }
  }

  const handleDownload = () => {
    if (!previewUrl) return
    const link = document.createElement('a')
    link.href = previewUrl
    link.download = matchFileName(m)
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  const closePreview = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

  return (
    <MatchGlassModal
      open={open}
      onClose={onClose}
      match={m}
      loading={detailQuery.loading}
      error={detailQuery.error}
      onPdf={isFinished ? handlePdf : null}
      pdfBusy={pdfBusy}
      previewUrl={previewUrl}
      onClosePreview={closePreview}
      onDownloadPdf={handleDownload}
      onTeamClick={(team) => (team?.id != null ? openTeam(team) : undefined)}
    />
  )
}