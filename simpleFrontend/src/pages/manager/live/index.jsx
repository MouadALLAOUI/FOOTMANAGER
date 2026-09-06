import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Flag,
  Pause,
  Play,
  Plus,
  SkipForward,
  Trash2,
  Trophy,
  Undo2,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { SectionError } from '../../../components/errors'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import {
  Button,
  Empty,
  Field,
  SkeletonCards,
  SectionTitle,
  inputClass,
  selectClass,
} from '../../../components/dashboard/ui'
import { Avatar } from '../../../components/dashboard/ui'

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

const STATUS_META = {
  scheduled: { labelKey: 'live.statusScheduled', cls: 'bg-slate-100 text-slate-600' },
  warmup: { labelKey: 'live.statusWarmup', cls: 'bg-amber-50 text-amber-600' },
  first_half: { labelKey: 'live.status1stHalf', cls: 'bg-emerald-50 text-emerald-600' },
  halftime: { labelKey: 'live.statusHalftime', cls: 'bg-amber-50 text-amber-600' },
  second_half: { labelKey: 'live.status2ndHalf', cls: 'bg-emerald-50 text-emerald-600' },
  extra_time: { labelKey: 'live.statusExtraTime', cls: 'bg-emerald-50 text-emerald-600' },
  penalties: { labelKey: 'live.statusPenalties', cls: 'bg-emerald-50 text-emerald-600' },
  finished: { labelKey: 'live.statusFinished', cls: 'bg-slate-900 text-white' },
  cancelled: { labelKey: 'live.statusCancelled', cls: 'bg-rose-50 text-rose-600' },
  postponed: { labelKey: 'live.statusPostponed', cls: 'bg-rose-50 text-rose-600' },
}

const EVENT_TYPES = [
  { type: 'goal', icon: '⚽', labelKey: 'live.ev.goal' },
  { type: 'penalty_goal', icon: '🥅', labelKey: 'live.ev.penaltyGoal' },
  { type: 'own_goal', icon: '🔥', labelKey: 'live.ev.ownGoal' },
  { type: 'yellow_card', icon: '🟨', labelKey: 'live.ev.yellowCard' },
  { type: 'red_card', icon: '🟥', labelKey: 'live.ev.redCard' },
  { type: 'substitution', icon: '🔄', labelKey: 'live.ev.substitution' },
]

export default function LiveMatch() {
  const { matchId } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { toast } = useToast()

  const { data, loading, errorState, refetch } = useApi(() =>
    api.get(`/v1/live/${matchId}`).then((r) => r.data),
  )

  const matchRequestId = data?.match_request_id || null
  const { data: rostersData } = useApi(
    () => api.get(`/manager/match-requests/${matchRequestId}/players`).then((r) => r.data),
    [matchRequestId],
    { enabled: Boolean(matchRequestId) },
  )

  const [, setTick] = useState(0)
  const [busy, setBusy] = useState(null)
  const [formOpen, setFormOpen] = useState(false)
  const [formType, setFormType] = useState('goal')
  const [teamId, setTeamId] = useState(null)
  const [minute, setMinute] = useState('')
  const [playerId, setPlayerId] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [assistId, setAssistId] = useState('')
  const [assistName, setAssistName] = useState('')
  const [search, setSearch] = useState('')

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
    const id = setInterval(() => refetch(), 20000)
    return () => clearInterval(id)
  }, [isLive, refetch])

  const elapsedSec = timerCfg.activeHalf && timerCfg.halfStartMs
    ? Math.max(0, Math.floor((Date.now() - timerCfg.halfStartMs) / 1000))
    : 0
  const displayClockSec = timerCfg.activeHalf === 'second'
    ? elapsedSec + HALF_MINUTES * 60
    : (timerCfg.activeHalf === 'first' ? elapsedSec : 0)
  const timerText = timerCfg.activeHalf ? formatClock(displayClockSec) : (match?.minute > 0 ? `${match.minute}'` : '—')
  const currentMinute = timerCfg.activeHalf
    ? Math.min(HALF_MINUTES, Math.floor(elapsedSec / 60) + 1)
    : (match?.minute || 0)

  const homeTeam = match?.home_team || null
  const awayTeam = match?.away_team || null
  const score = match?.score || { home: 0, away: 0 }

  const rostersByTeam = useMemo(() => {
    const map = {}
    for (const p of rostersData?.players || []) {
      if (!map[p.team_id]) map[p.team_id] = []
      map[p.team_id].push(p)
    }
    return map
  }, [rostersData])

  const filteredPlayers = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = rostersByTeam[teamId] || []
    if (!q) return list
    return list.filter((p) => p.name?.toLowerCase().includes(q) || String(p.number || '').includes(q))
  }, [rostersByTeam, teamId, search])

  const setCurrentTeam = () => {
    if (teamId) return teamId
    if (homeTeam?.id) return String(homeTeam.id)
    return ''
  }

  const postAction = async (url, payload, successKey) => {
    setBusy(url)
    try {
      await api.post(url, payload)
      toast.success(t(successKey))
      refetch()
      return true
    } catch (e) {
      toastApiError(e, t)
      return false
    } finally {
      setBusy(null)
    }
  }

  const runMatch = () => postAction(`/v1/live/${matchId}/start`, {}, 'live.toast.started')
  const goHalftime = () => postAction(`/v1/live/${matchId}/pause`, {}, 'live.toast.halftime')
  const startSecond = () => postAction(`/v1/live/${matchId}/resume`, {}, 'live.toast.secondHalf')
  const finishMatch = async () => {
    if (!window.confirm(t('live.finishConfirm'))) return
    const ok = await postAction(`/v1/live/${matchId}/finish`, {}, 'live.toast.finished')
    if (ok) toast.success(t('live.toast.resultSaved'))
  }

  const openForm = () => {
    setFormType('goal')
    setTeamId(homeTeam?.id ? String(homeTeam.id) : '')
    setMinute(String(currentMinute))
    setPlayerId('')
    setPlayerName('')
    setAssistId('')
    setAssistName('')
    setSearch('')
    setFormOpen(true)
  }

  const pickPlayer = (p) => {
    setPlayerId(String(p.id))
    setPlayerName(p.name)
    setSearch('')
  }

  const pickAssist = (p) => {
    setAssistId(String(p.id))
    setAssistName(p.name)
    setSearch('')
  }

  const submitEvent = async () => {
    const team = setCurrentTeam()
    if (!formType || !team) {
      toast.error(t('live.errTeam'))
      return
    }
    const needsPlayer = ['substitution'].includes(formType)
      ? Boolean(playerId && assistId)
      : Boolean(playerId)
    if (!needsPlayer) {
      toast.error(t('live.errPlayer'))
      return
    }
    if (formType === 'substitution' && assistId && Number(assistId) === Number(playerId)) {
      toast.error(t('live.errSamePlayer'))
      return
    }

    const payload = {
      type: formType,
      team_id: Number(team),
      player_id: playerId ? Number(playerId) : null,
      assist_player_id: assistId ? Number(assistId) : null,
      minute: Math.max(0, Math.min(130, Number(minute) || 0)),
      added_time: 0,
      description: formType === 'substitution' && playerName && assistName
        ? `${playerName} ↺ ${assistName}`
        : (playerName || null),
    }

    setBusy('event')
    try {
      await api.post(`/v1/live/${matchId}/events`, payload)
      toast.success(t('live.toast.eventSaved'))
      setFormOpen(false)
      refetch()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
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

  const statusMeta = STATUS_META[status] || STATUS_META.scheduled
  const events = match?.events || []
  const sortedEvents = [...events].sort((a, b) => Number(a.minute) - Number(b.minute) || Number(a.added_time) - Number(b.added_time))

  return (
    <div>
      <SectionTitle
        title={t('live.title')}
        subtitle={t('live.subtitle')}
        action={
          <Button size="sm" variant="outline" onClick={() => navigate('/dashboard/matches')}>
            <Undo2 className="size-4" />
            {t('live.backToMatches')}
          </Button>
        }
      />

      {errorState ? (
        <div className="mt-6">
          <SectionError state={errorState} onRetry={refetch} />
        </div>
      ) : loading || !match ? (
        <div className="mt-6"><SkeletonCards count={3} /></div>
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-5">
          {/* Scoreboard + actions */}
          <div className="lg:col-span-3">
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* Score strip */}
              <div className="grid grid-cols-3 items-stretch gap-2 p-4 sm:p-6">
                <div className="flex flex-col items-center justify-center gap-2 text-center">
                  <Avatar name={homeTeam?.name} src={homeTeam?.logo_url} className="size-14 rounded-2xl" />
                  <p className="line-clamp-2 text-xs font-black text-slate-800 sm:text-sm">{homeTeam?.name}</p>
                </div>
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="text-4xl font-black tabular-nums text-slate-900 sm:text-5xl">
                    {score.home}<span className="mx-1 text-slate-300">-</span>{score.away}
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black ${statusMeta.cls}`}>
                    {isLive && <span className="size-1.5 animate-pulse rounded-full bg-current" />}
                    {t(statusMeta.labelKey)}
                  </span>
                  <span className="text-lg font-black tabular-nums text-slate-500">{timerText}</span>
                </div>
                <div className="flex flex-col items-center justify-center gap-2 text-center">
                  <Avatar name={awayTeam?.name} src={awayTeam?.logo_url} className="size-14 rounded-2xl" />
                  <p className="line-clamp-2 text-xs font-black text-slate-800 sm:text-sm">{awayTeam?.name}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center justify-center gap-2 border-t border-slate-100 bg-slate-50/60 p-3 sm:p-4">
                {isNotStarted && (
                  <Button loading={busy === 'start'} onClick={runMatch}>
                    <Play className="size-4" />
                    {t('live.startMatch')}
                  </Button>
                )}
                {status === 'first_half' && (
                  <Button variant="soft" loading={busy === 'pause'} onClick={goHalftime}>
                    <Pause className="size-4" />
                    {t('live.halftime')}
                  </Button>
                )}
                {status === 'halftime' && (
                  <Button variant="soft" loading={busy === 'resume'} onClick={startSecond}>
                    <SkipForward className="size-4" />
                    {t('live.start2ndHalf')}
                  </Button>
                )}
                {isFinished ? (
                  <Button onClick={() => navigate('/dashboard/matches')}>
                    <Trophy className="size-4" />
                    {t('live.backToMatches')}
                  </Button>
                ) : (
                  (status === 'second_half' || status === 'extra_time' || status === 'penalties') && (
                    <Button variant="dangerSoft" loading={busy === 'finish'} onClick={finishMatch}>
                      <Flag className="size-4" />
                      {t('live.finishMatch')}
                    </Button>
                  )
                )}
                {isLive && (
                  <Button onClick={openForm}>
                    <Plus className="size-4" />
                    {t('live.addEvent')}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Events feed */}
          <div className="lg:col-span-2">
            <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                <h3 className="text-sm font-black text-slate-800">{t('live.eventsTitle')}</h3>
                {isLive && (
                  <Button size="sm" onClick={openForm}>
                    <Plus className="size-3.5" />
                    {t('live.addEvent')}
                  </Button>
                )}
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto p-3">
                {sortedEvents.length === 0 ? (
                  <Empty
                    icon={Trophy}
                    title={t('live.noEvents')}
                    description={isLive ? t('live.noEventsLiveHint') : t('live.noEventsHint')}
                  />
                ) : (
                  <ul className="space-y-1.5">
                    {sortedEvents.map((e) => (
                      <li key={e.id} className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-2">
                        <span className="w-9 shrink-0 text-center text-sm font-black tabular-nums text-slate-400">
                          {e.minute}&apos;
                        </span>
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-white text-base shadow-sm">
                          {e.icon || mapIcon(e.type)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-slate-800">{e.description || e.player_name || t('live.genericEvent')}</p>
                          <p className="truncate text-[10px] font-bold text-slate-400">{e.team_name || t('live.general')}</p>
                        </div>
                        {isLive && (
                          <button
                            type="button"
                            aria-label={t('live.delete')}
                            title={t('live.delete')}
                            onClick={() => deleteEvent(e)}
                            className="grid size-7 place-items-center rounded-lg text-slate-300 transition-colors hover:bg-rose-50 hover:text-rose-500"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add event form */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-[2px] sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 sm:rounded-3xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-800">{t('live.addEvent')}</h3>
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="rounded-lg px-2 py-1 text-xs font-bold text-slate-400 transition-colors hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <Field label={t('live.evType')} required>
              <div className="grid grid-cols-3 gap-2">
                {EVENT_TYPES.map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setFormType(item.type)}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-[11px] font-bold transition-colors ${
                      formType === item.type
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <span className="text-lg leading-none">{item.icon}</span>
                    {t(item.labelKey)}
                  </button>
                ))}
              </div>
            </Field>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label={t('live.team')} required>
                <select className={selectClass} value={teamId || ''} onChange={(e) => setTeamId(e.target.value)}>
                  <option value={homeTeam?.id || ''}>{homeTeam?.name}</option>
                  <option value={awayTeam?.id || ''}>{awayTeam?.name}</option>
                </select>
              </Field>
              <Field label={t('live.minute')} hint={t('live.minuteHint')}>
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  max="130"
                  value={minute}
                  onChange={(e) => setMinute(e.target.value)}
                />
              </Field>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field
                label={
                  formType === 'substitution'
                    ? t('live.playerOut')
                    : t('live.player')
                }
                required
              >
                <div className="relative">
                  <input
                    className={inputClass}
                    placeholder={t('live.searchPlayer')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                {playerId ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700 ring-1 ring-green-200">
                      {playerName}
                      <button type="button" aria-label={t('live.remove')} onClick={() => { setPlayerId(''); setPlayerName(''); setSearch('') }}>
                        ✕
                      </button>
                    </span>
                  </div>
                ) : (
                  <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                    {filteredPlayers.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => pickPlayer(p)}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100"
                        >
                          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-slate-100 text-[10px] font-black text-slate-500">
                            {p.number || '—'}
                          </span>
                          <span className="truncate">{p.name}</span>
                        </button>
                      </li>
                    ))}
                    {filteredPlayers.length === 0 && (
                      <li className="px-2 py-2 text-[11px] font-bold text-slate-400">{t('live.noPlayers')}</li>
                    )}
                  </ul>
                )}
              </Field>

              {formType === 'substitution' ? (
                <Field label={t('live.playerIn')} required>
                  <input
                    className={inputClass}
                    placeholder={t('live.searchPlayer')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {assistId ? (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-3 py-1 text-xs font-black text-green-700 ring-1 ring-green-200">
                        {assistName}
                        <button type="button" aria-label={t('live.remove')} onClick={() => { setAssistId(''); setAssistName(''); setSearch('') }}>
                          ✕
                        </button>
                      </span>
                    </div>
                  ) : (
                    <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
                      {filteredPlayers.map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => pickAssist(p)}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-bold text-slate-700 transition-colors hover:bg-slate-100"
                          >
                            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-slate-100 text-[10px] font-black text-slate-500">
                              {p.number || '—'}
                            </span>
                            <span className="truncate">{p.name}</span>
                          </button>
                        </li>
                      ))}
                      {filteredPlayers.length === 0 && (
                        <li className="px-2 py-2 text-[11px] font-bold text-slate-400">{t('live.noPlayers')}</li>
                      )}
                    </ul>
                  )}
                </Field>
              ) : (
                <div className="hidden sm:block" />
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <Button className="flex-1" loading={busy === 'event'} onClick={submitEvent}>
                {t('live.save')}
              </Button>
              <Button variant="outline" onClick={() => setFormOpen(false)}>
                {t('live.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const mapIcon = (type) => {
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