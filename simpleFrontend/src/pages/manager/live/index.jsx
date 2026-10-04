import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Flag,
  MapPin,
  Pause,
  Play,
  RotateCcw,
  Shield,
  SkipForward,
  Trash2,
  Trophy,
  Undo2,
  Users,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { SectionError } from '../../../components/errors'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import {
  Button,
  Empty,
  SkeletonCards,
} from '../../../components/dashboard/ui'
import { Avatar } from '../../../components/dashboard/ui'
import PlayerCard from './components/PlayerCard'
import PlayerActionBar from './components/PlayerActionBar'
import SubstitutionModal from './components/SubstitutionModal'
import EndMatchModal from './components/EndMatchModal'
import RosterSelectionModal from './components/RosterSelectionModal'
import Jersey from './components/Jersey'

const HALF_MINUTES = 45
const pad2 = (n) => String(n).padStart(2, '0')
const formatClock = (totalSec) => `${pad2(Math.floor(totalSec / 60))}:${pad2(Math.floor(totalSec % 60))}`

const timerCfgOf = (m) => {
  if (!m) return { activeHalf: null, halfStartMs: null }
  if (m.status === 'first_half') {
    const ts = Date.parse(m.kicked_off_at || m.started_at)
    return { activeHalf: 'first', halfStartMs: Number.isFinite(ts) ? ts : null }
  }
  if (m.status === 'second_half') {
    const ts = Date.parse(m.second_half_started_at || m.kicked_off_at)
    return { activeHalf: 'second', halfStartMs: Number.isFinite(ts) ? ts : null }
  }
  return { activeHalf: null, halfStartMs: null }
}

const mapEventIcon = (type) => {
  switch (type) {
    case 'yellow_card':
    case 'second_yellow':
      return '🟨'
    case 'red_card':
      return '🟥'
    case 'substitution':
      return '🔄'
    case 'own_goal':
      return '🔥'
    case 'penalty_goal':
      return '🥅'
    case 'goal':
      return '⚽'
    default:
      return '📌'
  }
}

export default function LiveMatch() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { toast } = useToast()

  const { data, loading, errorState, refetch } = useApi(() =>
    api.get(`/v1/live/${matchId}`).then((r) => r.data),
  )

  const matchRequestId = data?.match_request_id || null
  const { data: rostersData, refetch: refetchRosters } = useApi(
    () => api.get(`/manager/match-requests/${matchRequestId}/players`).then((r) => r.data),
    [matchRequestId],
    { enabled: Boolean(matchRequestId) },
  )

  const [, setTick] = useState(0)
  const [busyAction, setBusyAction] = useState(null)
  const [activeTab, setActiveTab] = useState('players') // 'players' | 'events' | 'summary'

  // Selected player for bottom action bar: { player, teamId, variant }
  const [selectedPlayer, setSelectedPlayer] = useState(null)

  // Sub modal & End match modal state
  const [subModalOpen, setSubModalOpen] = useState(false)
  const [endModalOpen, setEndModalOpen] = useState(false)

  // Roster selection modal state: { open, teamId, teamName, variant, presentPlayers }
  const [rosterSelectState, setRosterSelectState] = useState(null)
  const [customRosterByTeam, setCustomRosterByTeam] = useState({})

  // Mobile active team toggle: home or away
  const [activeMobileTeam, setActiveMobileTeam] = useState('home')

  const match = data || null
  const status = match?.status || 'scheduled'
  const isFinished = match?.is_finished || status === 'finished'
  const liveStatuses = ['kickoff', 'first_half', 'halftime', 'second_half', 'extra_time', 'penalties']
  const isLive = liveStatuses.includes(status)
  const isNotStarted = status === 'scheduled' || status === 'warmup'

  const timerCfg = useMemo(() => timerCfgOf(match), [match])

  useEffect(() => {
    if (!timerCfg.activeHalf) return
    const id = setInterval(() => setTick((v) => v + 1), 1000)
    return () => clearInterval(id)
  }, [timerCfg.activeHalf])

  useEffect(() => {
    if (!isLive) return
    const id = setInterval(() => {
      refetch()
    }, 20000)
    return () => clearInterval(id)
  }, [isLive, refetch])

  const elapsedSec = timerCfg.activeHalf && timerCfg.halfStartMs
    ? Math.max(0, Math.floor((Date.now() - timerCfg.halfStartMs) / 1000))
    : 0
  const displayClockSec = timerCfg.activeHalf === 'second'
    ? elapsedSec + HALF_MINUTES * 60
    : (timerCfg.activeHalf === 'first' ? elapsedSec : 0)
  const timerText = timerCfg.activeHalf
    ? formatClock(displayClockSec)
    : (match?.minute > 0 ? `${match.minute}'` : '00:00')
  const currentMinute = timerCfg.activeHalf
    ? Math.min(HALF_MINUTES, Math.floor(elapsedSec / 60) + 1)
    : (match?.minute || 0)

  const homeTeam = match?.home_team || null
  const awayTeam = match?.away_team || null
  const score = match?.score || { home: 0, away: 0 }

  // Format and competition metadata (dynamic from tournament or format)
  const formatConfig = rostersData?.format_config || data?.format_config || {}
  const startersCount = formatConfig.starters_count || 5
  const matchRosterLimit = formatConfig.match_roster_limit || 8
  const competitionName = data?.competition_name || formatConfig.tournament_name || 'الدوري الصيفي 2025'
  const venueName = data?.venue_name || data?.stadium?.name || 'ملعب القرب حي السلام'

  // Match date and time formatting
  const matchDatetimeStr = data?.match_datetime || data?.started_at || null
  const matchDate = useMemo(() => {
    if (!matchDatetimeStr) return 'السبت 12 يوليو 2025'
    try {
      const d = new Date(matchDatetimeStr)
      return d.toLocaleDateString('ar-MA', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    } catch {
      return 'السبت 12 يوليو 2025'
    }
  }, [matchDatetimeStr])

  const matchTime = useMemo(() => {
    if (!matchDatetimeStr) return '18:30'
    try {
      const d = new Date(matchDatetimeStr)
      return d.toLocaleTimeString('ar-MA', {
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return '18:30'
    }
  }, [matchDatetimeStr])

  // Events & player statistics tally
  const events = useMemo(() => match?.events || [], [match?.events])
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => (Number(b.minute) || 0) - (Number(a.minute) || 0) || (b.id || 0) - (a.id || 0))
  }, [events])

  const playerStatsMap = useMemo(() => {
    const stats = {}
    for (const ev of events) {
      const pid = ev.player_id
      if (!pid) continue
      if (!stats[pid]) {
        stats[pid] = { goals: 0, yellowCards: 0, redCards: 0, isSentOff: false }
      }
      if (ev.type === 'goal' || ev.type === 'penalty_goal') {
        stats[pid].goals += 1
      } else if (ev.type === 'yellow_card') {
        stats[pid].yellowCards += 1
        if (stats[pid].yellowCards >= 2) stats[pid].isSentOff = true
      } else if (ev.type === 'red_card' || ev.type === 'second_yellow') {
        stats[pid].redCards += 1
        stats[pid].isSentOff = true
      }
    }
    return stats
  }, [events])

  // Process team rosters: respect attendance, filter absent players, split into starters & substitutes
  const teamRosters = useMemo(() => {
    const allPlayers = rostersData?.players || []

    const processTeam = (teamId) => {
      if (!teamId) return { starters: [], substitutes: [], presentCount: 0, totalEligible: 0 }

      const teamPlayers = allPlayers.filter((p) => Number(p.team_id) === Number(teamId))

      // Flow: ONLY players marked PRESENT or eligible are allowed.
      // ABSENT players are strictly excluded.
      const presentPlayers = teamPlayers.filter((p) => {
        if (p.is_absent || p.attendance_status === 'absent') return false
        return true
      })

      // If custom selection is applied when present players exceed limit
      const customSelected = customRosterByTeam[teamId]
      let matchRoster = []
      if (customSelected && customSelected.length > 0) {
        matchRoster = presentPlayers.filter((p) => customSelected.includes(p.id))
      } else {
        matchRoster = presentPlayers.slice(0, matchRosterLimit)
      }

      // Determine Starters and Substitutes
      // If lineup is already recorded, respect is_starter
      const hasDefinedStarters = matchRoster.some((p) => p.is_starter === true)
      let starters = []
      let substitutes = []

      if (hasDefinedStarters) {
        starters = matchRoster.filter((p) => p.is_starter === true)
        substitutes = matchRoster.filter((p) => p.is_starter === false)
      } else {
        starters = matchRoster.slice(0, startersCount)
        substitutes = matchRoster.slice(startersCount)
      }

      return {
        starters,
        substitutes,
        allMatchRoster: matchRoster,
        presentPlayers,
        presentCount: presentPlayers.length,
        totalEligible: matchRoster.length,
        exceedsLimit: presentPlayers.length > matchRosterLimit,
      }
    }

    return {
      home: processTeam(homeTeam?.id),
      away: processTeam(awayTeam?.id),
    }
  }, [rostersData, homeTeam?.id, awayTeam?.id, startersCount, matchRosterLimit, customRosterByTeam])

  // Post match state action
  const postAction = async (url, payload, successKey) => {
    setBusyAction(url)
    try {
      await api.post(url, payload)
      if (successKey) toast.success(t(successKey))
      refetch()
      return true
    } catch (e) {
      toastApiError(e, t)
      return false
    } finally {
      setBusyAction(null)
    }
  }

  const runMatch = () => postAction(`/v1/live/${matchId}/start`, {}, 'live.toast.started')
  const goHalftime = () => postAction(`/v1/live/${matchId}/pause`, {}, 'live.toast.halftime')
  const startSecond = () => postAction(`/v1/live/${matchId}/resume`, {}, 'live.toast.secondHalf')

  const handleFinishMatch = async () => {
    setBusyAction('finish')
    try {
      const ok = await postAction(`/v1/live/${matchId}/finish`, {}, 'live.toast.finished')
      if (ok) {
        toast.success(t('live.toast.resultSaved'))
        setEndModalOpen(false)
        navigate('/dashboard/matches')
      }
    } finally {
      setBusyAction(null)
    }
  }

  // Record an event via existing match event architecture
  const recordEvent = async (eventPayload) => {
    setBusyAction('event')
    try {
      await api.post(`/v1/live/${matchId}/events`, eventPayload)
      toast.success(t('live.toast.eventSaved'))
      setSelectedPlayer(null)
      refetch()
      refetchRosters()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusyAction(null)
    }
  }

  // Quick Player Actions
  const handlePlayerClick = (player, teamId, variant) => {
    if (selectedPlayer && selectedPlayer.player.id === player.id) {
      setSelectedPlayer(null)
    } else {
      setSelectedPlayer({ player, teamId, variant })
    }
  }

  const handleGoal = () => {
    if (!selectedPlayer) return
    recordEvent({
      type: 'goal',
      team_id: Number(selectedPlayer.teamId),
      player_id: Number(selectedPlayer.player.id),
      minute: Math.max(1, currentMinute),
      description: selectedPlayer.player.name,
    })
  }

  const handleYellowCard = () => {
    if (!selectedPlayer) return
    recordEvent({
      type: 'yellow_card',
      team_id: Number(selectedPlayer.teamId),
      player_id: Number(selectedPlayer.player.id),
      minute: Math.max(1, currentMinute),
      description: `بطاقة صفراء - ${selectedPlayer.player.name}`,
    })
  }

  const handleRedCard = () => {
    if (!selectedPlayer) return
    recordEvent({
      type: 'red_card',
      team_id: Number(selectedPlayer.teamId),
      player_id: Number(selectedPlayer.player.id),
      minute: Math.max(1, currentMinute),
      description: `بطاقة حمراء - ${selectedPlayer.player.name}`,
    })
  }

  const handleOpenSubstitution = () => {
    if (!selectedPlayer) return
    setSubModalOpen(true)
  }

  const handleConfirmSubstitution = (playerOut, playerIn) => {
    recordEvent({
      type: 'substitution',
      team_id: Number(selectedPlayer.teamId),
      player_id: Number(playerOut.id),
      assist_player_id: Number(playerIn.id),
      minute: Math.max(1, currentMinute),
      description: `${playerOut.name} ↺ ${playerIn.name}`,
    })
    setSubModalOpen(false)
  }

  const deleteEvent = async (ev) => {
    if (!window.confirm(t('live.deleteConfirm'))) return
    try {
      await api.delete(`/v1/live/events/${ev.id}`)
      toast.success(t('live.toast.eventDeleted'))
      refetch()
    } catch (e) {
      toastApiError(e, t)
    }
  }

  // Active team helpers
  const selectedTeamName = selectedPlayer?.variant === 'away' ? awayTeam?.name : homeTeam?.name
  const availableSubstitutesForSelected = selectedPlayer?.variant === 'away'
    ? teamRosters.away.substitutes
    : teamRosters.home.substitutes

  return (
    <div className="pb-24">
      {/* Top Details Strip */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-700 sm:gap-6">
          <div className="flex items-center gap-1.5 text-amber-700">
            <Trophy className="size-4 text-amber-500" />
            <span>{competitionName}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <Clock className="size-3.5 text-slate-400" />
            <span className="tabular-nums">{matchTime}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <CalendarDays className="size-3.5 text-slate-400" />
            <span>{matchDate}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-500">
            <MapPin className="size-3.5 text-emerald-600" />
            <span>{venueName}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/dashboard/matches')}
          className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
        >
          <Undo2 className="size-3.5" />
          <span>رجوع</span>
        </button>
      </div>

      {errorState ? (
        <div className="mt-6">
          <SectionError state={errorState} onRetry={refetch} />
        </div>
      ) : loading || !match ? (
        <div className="mt-6">
          <SkeletonCards count={3} />
        </div>
      ) : (
        <>
          {/* Main Scoreboard Banner */}
          <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-sm">
            <div className="grid grid-cols-3 items-center gap-2 p-4 sm:p-6">
              {/* Home Team */}
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <Avatar
                  name={homeTeam?.name}
                  src={homeTeam?.logo_url}
                  className="size-14 rounded-2xl sm:size-16 ring-2 ring-emerald-500/20"
                />
                <p className="line-clamp-2 max-w-[160px] text-xs font-black text-slate-900 sm:text-sm">
                  {homeTeam?.name || 'جمعية تمونت ايت عيسى'}
                </p>
              </div>

              {/* Score & Live Time */}
              <div className="flex flex-col items-center justify-center gap-1 text-center">
                {isLive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-0.5 text-[11px] font-black text-white shadow-sm animate-pulse">
                    <span className="size-1.5 rounded-full bg-white" />
                    مباشر •
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-0.5 text-[11px] font-black text-slate-600">
                    {isFinished ? 'انتهت' : 'قادمة'}
                  </span>
                )}

                <p className="text-[11px] font-black text-slate-500">
                  {timerText} - {status === 'second_half' ? 'الشوط الثاني' : 'الشوط الأول'}
                </p>

                <div className="text-4xl font-black tabular-nums tracking-tight text-slate-900 sm:text-5xl">
                  {score.home}
                  <span className="mx-2 text-slate-300">-</span>
                  {score.away}
                </div>

                {/* Match Period Quick Controls */}
                <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                  {isNotStarted && (
                    <Button size="sm" loading={busyAction === 'start'} onClick={runMatch}>
                      <Play className="size-3.5" />
                      بدء المباراة
                    </Button>
                  )}
                  {status === 'first_half' && (
                    <Button size="sm" variant="soft" loading={busyAction === 'pause'} onClick={goHalftime}>
                      <Pause className="size-3.5" />
                      استراحة الشوطين
                    </Button>
                  )}
                  {status === 'halftime' && (
                    <Button size="sm" variant="soft" loading={busyAction === 'resume'} onClick={startSecond}>
                      <SkipForward className="size-3.5" />
                      بدء الشوط الثاني
                    </Button>
                  )}
                </div>
              </div>

              {/* Away Team */}
              <div className="flex flex-col items-center justify-center gap-2 text-center">
                <Avatar
                  name={awayTeam?.name}
                  src={awayTeam?.logo_url}
                  className="size-14 rounded-2xl sm:size-16 ring-2 ring-slate-200"
                />
                <p className="line-clamp-2 max-w-[160px] text-xs font-black text-slate-900 sm:text-sm">
                  {awayTeam?.name || 'فريق لقجع'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation Tabs Bar */}
          <div className="mt-4 flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveTab('players')}
              className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black transition-all ${
                activeTab === 'players'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <Users className="size-4" />
              <span>اللاعبون</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('events')}
              className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black transition-all ${
                activeTab === 'events'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <span>أحداث المباراة</span>
              {sortedEvents.length > 0 && (
                <span className="grid size-5 place-items-center rounded-full bg-rose-500 text-[10px] font-black text-white">
                  {sortedEvents.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black transition-all ${
                activeTab === 'summary'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <Trophy className="size-4" />
              <span>ملخص المباراة</span>
            </button>
          </div>

          {/* TAB 1: PLAYERS VIEW */}
          {activeTab === 'players' && (
            <div className="mt-4">
              {/* Mobile Team Switcher (Visible only on mobile/tablet < lg) */}
              <div className="mb-4 flex gap-2 lg:hidden">
                <button
                  type="button"
                  onClick={() => setActiveMobileTeam('home')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border p-2.5 text-xs font-black transition-all ${
                    activeMobileTeam === 'home'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <Jersey number="" variant="home" className="h-6 w-5" />
                  <span className="truncate">{homeTeam?.name || 'فريق المضيف'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveMobileTeam('away')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-2xl border p-2.5 text-xs font-black transition-all ${
                    activeMobileTeam === 'away'
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  <Jersey number="" variant="away" className="h-6 w-5" />
                  <span className="truncate">{awayTeam?.name || 'فريق الضيف'}</span>
                </button>
              </div>

              {/* Responsive Grid: Side-by-Side on Desktop, Single Column on Mobile */}
              <div className="grid gap-6 lg:grid-cols-2">
                {/* HOME TEAM COLUMN */}
                <div className={`space-y-4 ${activeMobileTeam === 'away' ? 'hidden lg:block' : 'block'}`}>
                  <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
                    {/* Team Header Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <Jersey number="" variant="home" className="h-7 w-6" />
                        <h3 className="text-sm font-black text-slate-900 sm:text-base">
                          {homeTeam?.name || 'فريق المضيف'}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-700">
                          <Users className="size-3" />
                          <span>
                            لاعبو المباراة ({teamRosters.home.totalEligible}/{matchRosterLimit})
                          </span>
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                          {teamRosters.home.starters.length} أساسيين
                        </span>
                        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-black text-sky-700">
                          {teamRosters.home.substitutes.length} احتياط
                        </span>
                      </div>
                    </div>

                    {/* Exceeds limit notice & manual selection button */}
                    {teamRosters.home.exceedsLimit && (
                      <div className="mt-3 flex items-center justify-between rounded-2xl bg-amber-50 p-2.5 text-xs text-amber-800">
                        <span>الحضور يتجاوز الحد المسموح به ({matchRosterLimit})</span>
                        <button
                          type="button"
                          onClick={() =>
                            setRosterSelectState({
                              teamId: homeTeam?.id,
                              teamName: homeTeam?.name,
                              variant: 'home',
                              presentPlayers: teamRosters.home.presentPlayers,
                              initialSelectedIds: teamRosters.home.allMatchRoster.map((p) => p.id),
                            })
                          }
                          className="rounded-xl bg-amber-600 px-2.5 py-1 text-[11px] font-black text-white hover:bg-amber-700"
                        >
                          تحديد اللاعبين
                        </button>
                      </div>
                    )}

                    {/* STARTERS SECTION */}
                    <div className="mt-4">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="grid size-6 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
                          <Shield className="size-3.5" />
                        </span>
                        <h4 className="text-xs font-black text-slate-800">
                          الأساسيون ({teamRosters.home.starters.length})
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
                        {teamRosters.home.starters.map((player) => {
                          const stats = playerStatsMap[player.id] || {}
                          const isSelected = selectedPlayer?.player?.id === player.id
                          return (
                            <PlayerCard
                              key={player.id}
                              player={player}
                              variant="home"
                              selected={isSelected}
                              goals={stats.goals}
                              yellowCards={stats.yellowCards}
                              redCards={stats.redCards}
                              isSentOff={stats.isSentOff}
                              onClick={() => handlePlayerClick(player, homeTeam?.id, 'home')}
                            />
                          )
                        })}
                      </div>
                    </div>

                    {/* SUBSTITUTES SECTION */}
                    <div className="mt-6 border-t border-slate-100 pt-4">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="grid size-6 place-items-center rounded-lg bg-sky-100 text-sky-700">
                          <RotateCcw className="size-3.5" />
                        </span>
                        <h4 className="text-xs font-black text-slate-800">
                          الاحتياط ({teamRosters.home.substitutes.length})
                        </h4>
                      </div>

                      {teamRosters.home.substitutes.length === 0 ? (
                        <p className="py-4 text-center text-xs font-semibold text-slate-400">
                          لا يوجد لاعبين في دكة الاحتياط
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                          {teamRosters.home.substitutes.map((player) => {
                            const stats = playerStatsMap[player.id] || {}
                            const isSelected = selectedPlayer?.player?.id === player.id
                            return (
                              <PlayerCard
                                key={player.id}
                                player={player}
                                variant="home"
                                selected={isSelected}
                                goals={stats.goals}
                                yellowCards={stats.yellowCards}
                                redCards={stats.redCards}
                                isSentOff={stats.isSentOff}
                                onClick={() => handlePlayerClick(player, homeTeam?.id, 'home')}
                              />
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* AWAY TEAM COLUMN */}
                <div className={`space-y-4 ${activeMobileTeam === 'home' ? 'hidden lg:block' : 'block'}`}>
                  <div className="rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-5">
                    {/* Team Header Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <Jersey number="" variant="away" className="h-7 w-6" />
                        <h3 className="text-sm font-black text-slate-900 sm:text-base">
                          {awayTeam?.name || 'فريق الضيف'}
                        </h3>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-black text-slate-700">
                          <Users className="size-3" />
                          <span>
                            لاعبو المباراة ({teamRosters.away.totalEligible}/{matchRosterLimit})
                          </span>
                        </span>
                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">
                          {teamRosters.away.starters.length} أساسيين
                        </span>
                        <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-black text-sky-700">
                          {teamRosters.away.substitutes.length} احتياط
                        </span>
                      </div>
                    </div>

                    {/* Exceeds limit notice */}
                    {teamRosters.away.exceedsLimit && (
                      <div className="mt-3 flex items-center justify-between rounded-2xl bg-amber-50 p-2.5 text-xs text-amber-800">
                        <span>الحضور يتجاوز الحد المسموح به ({matchRosterLimit})</span>
                        <button
                          type="button"
                          onClick={() =>
                            setRosterSelectState({
                              teamId: awayTeam?.id,
                              teamName: awayTeam?.name,
                              variant: 'away',
                              presentPlayers: teamRosters.away.presentPlayers,
                              initialSelectedIds: teamRosters.away.allMatchRoster.map((p) => p.id),
                            })
                          }
                          className="rounded-xl bg-amber-600 px-2.5 py-1 text-[11px] font-black text-white hover:bg-amber-700"
                        >
                          تحديد اللاعبين
                        </button>
                      </div>
                    )}

                    {/* STARTERS SECTION */}
                    <div className="mt-4">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="grid size-6 place-items-center rounded-lg bg-slate-100 text-slate-700">
                          <Shield className="size-3.5" />
                        </span>
                        <h4 className="text-xs font-black text-slate-800">
                          الأساسيون ({teamRosters.away.starters.length})
                        </h4>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
                        {teamRosters.away.starters.map((player) => {
                          const stats = playerStatsMap[player.id] || {}
                          const isSelected = selectedPlayer?.player?.id === player.id
                          return (
                            <PlayerCard
                              key={player.id}
                              player={player}
                              variant="away"
                              selected={isSelected}
                              goals={stats.goals}
                              yellowCards={stats.yellowCards}
                              redCards={stats.redCards}
                              isSentOff={stats.isSentOff}
                              onClick={() => handlePlayerClick(player, awayTeam?.id, 'away')}
                            />
                          )
                        })}
                      </div>
                    </div>

                    {/* SUBSTITUTES SECTION */}
                    <div className="mt-6 border-t border-slate-100 pt-4">
                      <div className="mb-3 flex items-center gap-2">
                        <span className="grid size-6 place-items-center rounded-lg bg-sky-100 text-sky-700">
                          <RotateCcw className="size-3.5" />
                        </span>
                        <h4 className="text-xs font-black text-slate-800">
                          الاحتياط ({teamRosters.away.substitutes.length})
                        </h4>
                      </div>

                      {teamRosters.away.substitutes.length === 0 ? (
                        <p className="py-4 text-center text-xs font-semibold text-slate-400">
                          لا يوجد لاعبين في دكة الاحتياط
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">
                          {teamRosters.away.substitutes.map((player) => {
                            const stats = playerStatsMap[player.id] || {}
                            const isSelected = selectedPlayer?.player?.id === player.id
                            return (
                              <PlayerCard
                                key={player.id}
                                player={player}
                                variant="away"
                                selected={isSelected}
                                goals={stats.goals}
                                yellowCards={stats.yellowCards}
                                redCards={stats.redCards}
                                isSentOff={stats.isSentOff}
                                onClick={() => handlePlayerClick(player, awayTeam?.id, 'away')}
                              />
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EVENTS TIMELINE VIEW */}
          {activeTab === 'events' && (
            <div className="mt-4 rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-6">
              <h3 className="mb-4 text-sm font-black text-slate-900">
                تسلسل أحداث المباراة ({sortedEvents.length})
              </h3>

              {sortedEvents.length === 0 ? (
                <Empty
                  icon={Trophy}
                  title="لا توجد أحداث مسجلة بعد"
                  description="انقر على أي لاعب في شاشة اللاعبين لإضافة أهداف أو بطاقات أو تبديل."
                />
              ) : (
                <div className="space-y-2">
                  {sortedEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-12 shrink-0 font-mono text-xs font-black text-slate-500">
                          {ev.minute}&apos;
                        </span>
                        <span className="grid size-8 place-items-center rounded-xl bg-white text-base shadow-sm">
                          {mapEventIcon(ev.type)}
                        </span>
                        <div>
                          <p className="text-xs font-black text-slate-800">
                            {ev.description || ev.player?.name || 'حدث'}
                          </p>
                          <p className="text-[10px] font-bold text-slate-400">
                            {ev.team?.name || 'مباراة'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => deleteEvent(ev)}
                        className="grid size-8 place-items-center rounded-xl text-slate-300 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        title="حذف الحدث والتراجع"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SUMMARY VIEW */}
          {activeTab === 'summary' && (
            <div className="mt-4 rounded-3xl border border-slate-200/90 bg-white p-4 shadow-sm sm:p-6">
              <h3 className="mb-4 text-sm font-black text-slate-900">ملخص المباراة</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-800">{homeTeam?.name}</p>
                  <div className="mt-3 space-y-1 text-xs font-bold text-slate-600">
                    <p>الأهداف: {score.home}</p>
                    <p>
                      الأساسيون: {teamRosters.home.starters.length} | البدلاء: {teamRosters.home.substitutes.length}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-800">{awayTeam?.name}</p>
                  <div className="mt-3 space-y-1 text-xs font-bold text-slate-600">
                    <p>الأهداف: {score.away}</p>
                    <p>
                      الأساسيون: {teamRosters.away.starters.length} | البدلاء: {teamRosters.away.substitutes.length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Docked Player Action Toolbar (When a Player Card is Selected) */}
          {selectedPlayer && (
            <PlayerActionBar
              player={selectedPlayer.player}
              teamName={selectedTeamName}
              variant={selectedPlayer.variant}
              busy={busyAction}
              onGoal={handleGoal}
              onYellowCard={handleYellowCard}
              onRedCard={handleRedCard}
              onSubstitution={handleOpenSubstitution}
              onClose={() => setSelectedPlayer(null)}
            />
          )}

          {/* Substitution Modal */}
          {subModalOpen && (
            <SubstitutionModal
              open={subModalOpen}
              playerOut={selectedPlayer?.player}
              availableSubstitutes={availableSubstitutesForSelected}
              teamName={selectedTeamName}
              variant={selectedPlayer?.variant}
              busy={busyAction === 'event'}
              onConfirm={handleConfirmSubstitution}
              onClose={() => setSubModalOpen(false)}
            />
          )}

          {/* End Match Modal */}
          {endModalOpen && (
            <EndMatchModal
              open={endModalOpen}
              score={score}
              homeTeamName={homeTeam?.name}
              awayTeamName={awayTeam?.name}
              busy={busyAction === 'finish'}
              onConfirm={handleFinishMatch}
              onClose={() => setEndModalOpen(false)}
            />
          )}

          {/* Roster Selection Modal (When present players exceed limit) */}
          {rosterSelectState && (
            <RosterSelectionModal
              open={Boolean(rosterSelectState)}
              teamName={rosterSelectState.teamName}
              variant={rosterSelectState.variant}
              presentPlayers={rosterSelectState.presentPlayers}
              initialSelectedIds={rosterSelectState.initialSelectedIds}
              matchRosterLimit={matchRosterLimit}
              onSave={(newIds) => {
                setCustomRosterByTeam((prev) => ({
                  ...prev,
                  [rosterSelectState.teamId]: newIds,
                }))
                setRosterSelectState(null)
              }}
              onClose={() => setRosterSelectState(null)}
            />
          )}

          {/* Footer Bar */}
          <footer className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-between border-t border-slate-200/90 bg-white/95 px-4 py-2.5 shadow-md backdrop-blur-md sm:px-8">
            {/* Back button */}
            <button
              type="button"
              onClick={() => navigate('/dashboard/matches')}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            >
              <Undo2 className="size-4" />
              <span>رجوع</span>
            </button>

            {/* Auto-save indicator */}
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span className="hidden sm:inline">يتم الحفظ تلقائياً أثناء المباراة</span>
              <span className="sm:hidden">حفظ تلقائي</span>
            </div>

            {/* End Match button */}
            <button
              type="button"
              onClick={() => setEndModalOpen(true)}
              className="flex items-center gap-1.5 rounded-2xl bg-rose-600 px-4 py-2 text-xs font-black text-white shadow-sm transition-all hover:bg-rose-700 active:scale-95"
            >
              <Flag className="size-3.5" />
              <span>إنهاء المباراة</span>
            </button>
          </footer>
        </>
      )}
    </div>
  )
}