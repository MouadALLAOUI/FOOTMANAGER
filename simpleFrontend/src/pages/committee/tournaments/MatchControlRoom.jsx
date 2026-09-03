import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Check,
  Plus,
  RefreshCw,

} from 'lucide-react'
import api from '../../../api/client'
import { useToast } from '../../../components/ui/Toast'
import { Button, Skeleton } from '../../../components/dashboard/ui'
import SectionCard from '../../../components/ui/SectionCard'
import EventForm from '../../../domains/committee/components/EventForm'
import ModalShell from '../../../domains/committee/components/ModalShell'
import HeaderBlock from '../../../domains/committee/components/HeaderBlock'
import ScoreActions from '../../../domains/committee/components/ScoreActions'
import FooterActions from '../../../domains/committee/components/FooterActions'
import ConfirmResultModal from '../../../domains/committee/components/ConfirmResultModal'
import EventTypePicker from '../../../domains/committee/components/EventTypePicker'
import TabBar from '../../../domains/committee/components/TabBar'
import TimelineTab from '../../../domains/committee/components/TimelineTab'
import StatsFoulsTab from '../../../domains/committee/components/StatsFoulsTab'
import NotesMvpTab from '../../../domains/committee/components/NotesMvpTab'
import PlayersTab from '../../../domains/committee/components/PlayersTab'
import PlayerSelector from '../../../domains/committee/components/PlayerSelector'
import { QUICK_ACTIONS, REFEREE_ROLES } from '../../../data/matchConstants'
import useScrollLock from '../../../components/useScrollLock'


const uid = () => Math.random().toString(36).slice(2, 10)

function computeScore(events, homeId, awayId) {
  let home = 0
  let away = 0
  const hid = homeId != null ? Number(homeId) : null
  const aid = awayId != null ? Number(awayId) : null
  for (const e of events) {
    const tid = e.team_id != null ? Number(e.team_id) : null
    if (e.type === 'goal' || e.type === 'penalty_goal') {
      if (tid === hid) home += 1
      else if (tid === aid) away += 1
    } else if (e.type === 'own_goal') {
      if (tid === hid) away += 1
      else if (tid === aid) home += 1
    }
  }
  return { home, away }
}

// ScoreNumber helper removed (unused)

// Derive the active half's timer configuration from the server match payload.
// Each half runs relative to its own kick-off timestamp (1st = kicked_off_at,
// 2nd = second_half_started_at). Returns activeHalf null when not in a half.
const deriveTimerCfg = (m) => {
  if (!m) return { activeHalf: null, halfStartMs: null, halfDurationMinutes: 45, extraMinutes: 0, firstExtra: 0, secondExtra: 0 }
  const full = Number(m.match_duration_minutes) || 0
  const hd = Number(m.half_duration_minutes) > 0 ? Number(m.half_duration_minutes) : Math.round(full / 2)
  const first = Number(m.first_half_extra_minutes) || 0
  const second = Number(m.second_half_extra_minutes) || 0
  if (m.status === 'first_half') {
    const ts = Date.parse(m.kicked_off_at || m.started_at)
    return { activeHalf: 'first', halfStartMs: Number.isFinite(ts) ? ts : null, halfDurationMinutes: hd, extraMinutes: first, firstExtra: first, secondExtra: second }
  }
  if (m.status === 'second_half') {
    const ts = Date.parse(m.second_half_started_at || m.kicked_off_at)
    return { activeHalf: 'second', halfStartMs: Number.isFinite(ts) ? ts : null, halfDurationMinutes: hd, extraMinutes: second, firstExtra: first, secondExtra: second }
  }
  return { activeHalf: null, halfStartMs: null, halfDurationMinutes: hd, extraMinutes: 0, firstExtra: first, secondExtra: second }
}

const pad2 = (n) => String(n).padStart(2, '0')

const formatClock = (totalSec) => {
  const s = Math.max(0, totalSec)
  return `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`
}



export default function MatchControlRoom({ fixture, tournament, onClose, onSaved }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const retryRef = useRef(null)

  const homeTeam = fixture.home_team
  const awayTeam = fixture.away_team
  const homeId = homeTeam?.id ?? null
  const awayId = awayTeam?.id ?? null
  const homeName = homeTeam?.name || fixture.slots?.home || t('committee.detail.tbd')
  const awayName = awayTeam?.name || fixture.slots?.away || t('committee.detail.tbd')
  const [curStatus, setCurStatus] = useState(fixture.match?.status || 'scheduled')
  const LIVE_STATUSES = ['kickoff', 'first_half', 'halftime', 'second_half', 'extra_time', 'penalties']
  const isLiveStatus = (s) => LIVE_STATUSES.includes(s)
  const alreadyFinished = curStatus === 'finished'
  const matchNotStarted = curStatus === 'scheduled' || curStatus === 'warmup'
  const isLiveMatch = isLiveStatus(curStatus)
  const isKnockout = Boolean(fixture.round?.stage && fixture.round.stage !== 'group')
  const liveMinute = fixture.match?.current_minute ?? 0

  const [timerCfg, setTimerCfg] = useState(() => deriveTimerCfg(fixture.match))
  const [, setTick] = useState(0)

  const [status, setStatus] = useState('loading')
  const [events, setEvents] = useState([])
  const [foulRefetchTick, setFoulRefetchTick] = useState(0)
  const [storedScore, setStoredScore] = useState({ home: fixture.match?.home_score ?? 0, away: fixture.match?.away_score ?? 0 })
  const [homePen, setHomePen] = useState(fixture.match?.home_penalties ?? '')
  const [awayPen, setAwayPen] = useState(fixture.match?.away_penalties ?? '')
  const [extraTime, setExtraTime] = useState(fixture.match?.extra_time ?? false)
  const [notes, setNotes] = useState(fixture.match?.notes || '')
  const [mvp, setMvp] = useState('')
  const [mvpId, setMvpId] = useState('')
  const [mvpRating, setMvpRating] = useState(0)
  const [rosters, setRosters] = useState({})
  const [suspendedByTeam, setSuspendedByTeam] = useState({})

  const [referees, setReferees] = useState([])
  const [assigned, setAssigned] = useState({})
  const [newRefName, setNewRefName] = useState('')
  const [newRefPhone, setNewRefPhone] = useState('')
  const [addingReferee, setAddingReferee] = useState(false)

  const [selectedType, setSelectedType] = useState(null)
  const [editingKey, setEditingKey] = useState(null)
  const [form, setForm] = useState({})
  const [validation, setValidation] = useState(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState(null)
  const [successTick, setSuccessTick] = useState(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [timelineDirty, setTimelineDirty] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [quickPlayer, setQuickPlayer] = useState(null)
  const [quickBusyId, setQuickBusyId] = useState(null)
  const [activeTab, setActiveTab] = useState('timeline')
  const [foulNotifCount, setFoulNotifCount] = useState(0)
  const [convertTarget, setConvertTarget] = useState(null)

  const editMinMinute = useMemo(() => {
    if (!editingKey || !events.length) return 0
    const sorted = [...events].sort((a, b) => (Number(a.minute) || 0) - (Number(b.minute) || 0) || (Number(a.added_time) || 0) - (Number(b.added_time) || 0))
    const idx = sorted.findIndex((e) => e._key === editingKey)
    if (idx <= 0) return 0
    return Number(sorted[idx - 1].minute) || 0
  }, [events, editingKey])

  const redCardedIds = useMemo(() => {
    const map = {}
    for (const e of events) {
      const dismissed = e.type === 'red_card'
        || e.type === 'second_yellow'
        || (e.type === 'foul' && (e.punishment === 'red' || e.punishment === 'second_yellow'))
      if (!dismissed || e.team_id == null || e.player_id == null) continue
      if (!map[e.team_id]) map[e.team_id] = new Set()
      map[e.team_id].add(e.player_id)
    }
    const out = {}
    for (const teamId of Object.keys(map)) out[teamId] = Array.from(map[teamId])
    return out
  }, [events])

  const displayScore = (timelineDirty || events.length > 0) ? computeScore(events, homeId, awayId) : storedScore

  useScrollLock(true)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !confirmOpen && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, confirmOpen])

  useEffect(() => {
    if (!timerCfg.activeHalf) return
    const id = setInterval(() => setTick((v) => v + 1), 1000)
    return () => clearInterval(id)
  }, [timerCfg.activeHalf])

  const elapsedSec = timerCfg.activeHalf && timerCfg.halfStartMs
    ? Math.max(0, Math.floor((Date.now() - timerCfg.halfStartMs) / 1000))
    : 0
  const halfDurationSec = Math.round(timerCfg.halfDurationMinutes * 60)
  const displayClockSec = timerCfg.activeHalf === 'second'
    ? elapsedSec + halfDurationSec
    : (timerCfg.activeHalf === 'first' ? elapsedSec : 0)
  const activeHalfMaxMinute = timerCfg.halfDurationMinutes + timerCfg.extraMinutes
  const timerText = timerCfg.activeHalf
    ? `${formatClock(displayClockSec)}${timerCfg.extraMinutes > 0 ? ` + ${timerCfg.extraMinutes}` : ''}`
    : null
  const currentLiveMinute = timerCfg.activeHalf
    ? Math.min(activeHalfMaxMinute, Math.floor(elapsedSec / 60) + 1)
    : (liveMinute || 0)
  const halfForAbsMinute = (abs) => (Number(abs) > timerCfg.halfDurationMinutes ? 'second' : 'first')
  const absToRelMinute = (abs, half) => Math.max(1, Number(abs) - (half === 'second' ? timerCfg.halfDurationMinutes : 0))
  const halfExtra = (half) => (half === 'second' ? timerCfg.secondExtra : timerCfg.firstExtra)
  const formHalf = halfForAbsMinute(Number(form?.minute) || 1)
  const formMaxAbs = formHalf === 'second'
    ? 2 * timerCfg.halfDurationMinutes + halfExtra('second')
    : timerCfg.halfDurationMinutes + halfExtra('first')
  // Latest relative minute recorded within the half the user is adding to, so a
  // first-half event never inflates the second-half lower bound (and vice versa).
  const lastRelInHalf = (half) => Math.max(0, ...events
    .filter((e) => (e.half ?? 'first') === half)
    .map((e) => Number(e.minute) || 0))
  const formMinAbs = (formHalf === 'second' ? timerCfg.halfDurationMinutes : 0) + (editingKey ? editMinMinute : lastRelInHalf(formHalf))

  useEffect(() => {
    let cancelled = false
    const teamIds = [homeId, awayId].filter(Boolean)
    if (teamIds.length) {
      Promise.allSettled(teamIds.map((id) => api.get(`/committee/teams/${id}/players`)))
        .then((results) => {
          if (cancelled) return
          const map = {}
          results.forEach((res, i) => {
            if (res.status === 'fulfilled') map[teamIds[i]] = res.value?.data?.data || []
          })
          setRosters(map)
        })
        .catch(() => { })
    }
    return () => { cancelled = true }
  }, [homeId, awayId])

  useEffect(() => {
    let cancelled = false
    api.get('/committee/referees')
      .then((r) => { if (!cancelled) setReferees(r.data?.data || []) })
      .catch(() => { })
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const r = await api.get(`/committee/tournaments/${tournament.id}/fixtures/${fixture.id}/result`)
        if (cancelled) return
        const data = r.data?.data
        const m = data?.match
        const suspended = data?.suspended_players || []
        const byTeam = {}
        for (const s of suspended) {
          if (s.team_id == null || s.player_id == null) continue
          if (!byTeam[s.team_id]) byTeam[s.team_id] = new Set()
          byTeam[s.team_id].add(s.player_id)
        }
        const mapped = {}
        for (const teamId of Object.keys(byTeam)) mapped[teamId] = Array.from(byTeam[teamId])
        setSuspendedByTeam(mapped)
        if (m) {
          setStoredScore({ home: m.home_score ?? 0, away: m.away_score ?? 0 })
          if (m.status) setCurStatus(m.status)
          if (m.home_penalties != null) setHomePen(m.home_penalties)
          if (m.away_penalties != null) setAwayPen(m.away_penalties)
          setExtraTime(Boolean(m.extra_time))
          if (m.notes) setNotes(m.notes)
          setTimerCfg(deriveTimerCfg(m))
          setEvents((m.events || []).map(fromApi).sort((a, b) => a.minute - b.minute || a.added_time - b.added_time))
          const potm = m.player_of_the_match
          if (potm?.name) {
            setMvp(potm.name)
            if (potm.player_id != null) setMvpId(potm.player_id)
          }
          const assignedMap = {}
          for (const ref of m.referees || []) {
            if (ref.role && ref.referee_id != null) assignedMap[ref.role] = ref.referee_id
          }
          setAssigned(assignedMap)
        }
        setStatus('ready')
      } catch (e) {
        if (cancelled) return
        if (e.response?.status === 404) setStatus('ready')
        else setStatus('error')
      }
    }
    load()
    return () => { cancelled = true }
  }, [tournament.id, fixture.id])

  const setFormField = (key) => (e) => {
    const value = e?.target?.value ?? e
    setForm((f) => ({ ...f, [key]: value }))
    setValidation(null)
  }

  const openForm = (type) => {
    setSelectedType(type)
    setEditingKey(null)
    setValidation(null)
    setSaveError(null)
    const defaultRel = currentLiveMinute > 0 ? currentLiveMinute : 1
    const defaultHalf = timerCfg.activeHalf || 'first'
    const defaultMinute = defaultHalf === 'second' ? timerCfg.halfDurationMinutes + defaultRel : defaultRel
    setForm({
      team_id: type === 'other' ? '' : homeId ?? '',
      player_id: null,
      player: '',
      assist_player_id: null,
      assist: '',
      noAssist: true,
      minute: defaultMinute,
      half: defaultHalf,
      added_time: 0,
      goalType: 'regular',
      cardColor: type === 'red_card' ? 'red_card' : type === 'second_yellow' ? 'second_yellow' : 'yellow_card',
      punishment: type === 'foul' ? 'none' : '',
      missed: false,
      reason: '',
      note: '',
    })
  }

  const cancelForm = () => {
    setSelectedType(null)
    setEditingKey(null)
    setValidation(null)
  }

  const startEdit = (ev) => {
    setSelectedType(ev.type)
    setEditingKey(ev._key)
    setValidation(null)
    setSaveError(null)
    setForm({
      team_id: ev.team_id ?? '',
      player_id: ev.player_id ?? null,
      player: ev.player || '',
      assist_player_id: ev.assist_player_id ?? null,
      assist: ev.assist_player || '',
      noAssist: !ev.assist_player,
      minute: (ev.half === 'second' ? timerCfg.halfDurationMinutes : 0) + (ev.minute || 1),
      added_time: ev.added_time || 0,
      half: ev.half === 'second' ? 'second' : 'first',
      goalType: ev.goalType || 'regular',
      cardColor: ev.type === 'red_card' ? 'red_card' : ev.type === 'second_yellow' ? 'second_yellow' : 'yellow_card',
      punishment: ev.punishment || '',
      missed: ev.type === 'missed_penalty',
      reason: ev.reason || '',
      note: ev.note || '',
    })
  }

  const buildQuickForm = (player, teamId, type) => {
    const defaultRel = currentLiveMinute > 0 ? currentLiveMinute : 1
    const defaultHalf = timerCfg.activeHalf || 'first'
    const defaultMinute = defaultHalf === 'second' ? timerCfg.halfDurationMinutes + defaultRel : defaultRel
    return {
      team_id: teamId,
      player_id: player.id,
      player: player.name,
      assist_player_id: null,
      assist: '',
      noAssist: true,
      minute: defaultMinute,
      half: defaultHalf,
      added_time: 0,
      goalType: 'regular',
      cardColor: 'yellow_card',
      punishment: type === 'foul' ? 'none' : '',
      missed: false,
      reason: '',
      note: '',
    }
  }

  const tapPlayer = (player, teamId) => {
    if (quickBusyId != null) return
    const blocked = (suspendedByTeam[teamId] || []).includes(player.id) || (redCardedIds[teamId] || []).includes(player.id)
    if (blocked) return
    setQuickPlayer({ player, teamId })
    setPickerOpen(true)
  }

  const openFromPlayer = (type) => {
    const qp = quickPlayer
    setPickerOpen(false)
    setQuickPlayer(null)
    if (!qp) return
    setSelectedType(type)
    setEditingKey(null)
    setValidation(null)
    setSaveError(null)
    setForm(buildQuickForm(qp.player, qp.teamId, type))
  }

  const addPlayerToTeam = async (teamId, name) => {
    const trimmed = (name || '').trim()
    if (!trimmed) return
    setQuickBusyId('__add__')
    try {
      const r = await api.post(`/committee/teams/${teamId}/players`, { name: trimmed })
      const data = r.data
      if (data?.created && data?.data?.id) {
        const created = { id: data.data.id, name: data.data.name, number: data.data.number, position: data.data.position }
        setRosters((prev) => ({
          ...prev,
          [teamId]: [...(prev[teamId] || []), created],
        }))
        toast.success(t('committee.result.playersAddSuccess'))
        return true
      } else if (data?.duplicates?.length) {
        const existing = data.duplicates[0]
        if (existing?.id) {
          setRosters((prev) => ({
            ...prev,
            [teamId]: [...(prev[teamId] || []), { id: existing.id, name: existing.name, number: existing.number, position: existing.position }],
          }))
          toast.success(t('committee.result.playersAddSuccess'))
          return true
        }
        toast.error(t('committee.result.playersAddFail'))
        return false
      }
      toast.error(t('committee.result.playersAddFail'))
      return false
    } catch (e) {
      toast.error(e.response?.data?.message || t('committee.result.playersAddFail'))
      return false
    } finally {
      setQuickBusyId(null)
    }
  }

  const fromApi = (e) => {
    const md = e.metadata || {}
    const isSub = e.type === 'substitution'
    const isNote = e.type === 'other'
    return {
      _key: `srv-${e.id}`,
      type: e.type,
      team_id: e.team?.id ?? null,
      player_id: isNote ? null : (e.player?.id ?? null),
      player: isNote ? '' : e.player?.name || (isSub ? md.out : e.description) || '',
      assist_player_id: isSub ? (e.assist_player?.id ?? null) : (isNote ? null : (e.assist_player?.id ?? null)),
      assist_player: isSub ? (e.assist_player?.name || md.in || '') : (isNote ? '' : e.assist_player?.name || ''),
      minute: e.minute ?? 0,
      added_time: e.added_time ?? 0,
      half: e.half ?? null,
      goalType: e.type === 'penalty_goal' ? 'penalty' : e.type === 'own_goal' ? 'ownGoal' : md.goalType || 'regular',
      punishment: e.punishment || (e.type === 'red_card' ? 'red' : e.type === 'second_yellow' ? 'second_yellow' : e.type === 'yellow_card' ? 'yellow' : e.type === 'foul' ? md.punishment || 'none' : ''),
      reason: md.reason || '',
      note: isNote ? md.note || e.description || '' : '',
      description: e.description || '',
    }
  }

  const toApiEvent = (e) => {
    const base = {
      type: e.type,
      team_id: e.team_id != null && e.team_id !== '' ? Number(e.team_id) : null,
      player_id: e.player_id || null,
      minute: Math.max(1, Number(e.minute) || 0),
      added_time: Number(e.added_time) || 0,
      half: e.half === 'second' ? 'second' : 'first',
    }
    switch (e.type) {
      case 'substitution':
        return {
          ...base,
          assist_player_id: e.assist_player_id || null,
          description: [e.player && `${t('committee.result.playerOut')}: ${e.player}`, e.assist_player && `${t('committee.result.playerIn')}: ${e.assist_player}`].filter(Boolean).join(' • ') || null,
          metadata: { out: e.player, in: e.assist_player },
        }
      case 'other':
        return { ...base, description: e.note || e.description || null }
      default:
        return {
          ...base,
          assist_player_id: e.assist_player_id || null,
          punishment: e.type === 'foul' ? (e.punishment || 'none') : undefined,
          description: e.player || e.description || null,
          metadata: (e.reason || (e.goalType && e.goalType !== 'regular')) ? { reason: e.reason || null, goalType: e.type === 'goal' ? e.goalType || null : null } : null,
        }
    }
  }

  const goalEventType = (f = form) => {
    if (f.goalType === 'penalty') return f.missed ? 'missed_penalty' : 'penalty_goal'
    if (f.goalType === 'ownGoal') return 'own_goal'
    return 'goal'
  }

  const persist = async ({ events: evts = events, finish = false, status: statusOverride, notice }) => {
    setSaving(true)
    setSaveError(null)
    const score = computeScore(evts, homeId, awayId)
    const homePenNum = homePen === '' || homePen == null ? null : Number(homePen)
    const awayPenNum = awayPen === '' || awayPen == null ? null : Number(awayPen)

    if (finish) {
      if (isKnockout && score.home === score.away) {
        if (homePenNum == null || awayPenNum == null) {
          setSaving(false)
          setSaveError(t('committee.result.penaltyRequired'))
          return false
        }
        if (homePenNum === awayPenNum) {
          setSaving(false)
          setSaveError(t('committee.result.penaltiesMustDiffer'))
          return false
        }
      }
    }

    try {
      const assignedRefs = REFEREE_ROLES
        .map(({ value: role }) => assigned[role] ? { role, referee_id: Number(assigned[role]) } : null)
        .filter(Boolean)
      const payload = {
        home_score: score.home,
        away_score: score.away,
        home_penalties: homePenNum,
        away_penalties: awayPenNum,
        extra_time: extraTime,
        notes: notes || null,
        referees: assignedRefs,
        player_of_the_match: mvpId ? Number(mvpId) : null,
        events: evts.map(toApiEvent),
      }
      if (finish) payload.status = 'finished'
      else if (alreadyFinished) payload.status = 'finished'
      else if (statusOverride) payload.status = statusOverride
      else if (isLiveMatch) payload.status = curStatus
      else payload.status = 'scheduled'

      const r = await api.put(`/committee/tournaments/${tournament.id}/fixtures/${fixture.id}/result`, payload)
      setFoulRefetchTick((v) => v + 1)
      const m = r.data?.data?.match
      if (m) {
        setStoredScore({ home: m.home_score ?? 0, away: m.away_score ?? 0 })
        if (m.status && m.status !== curStatus) setCurStatus(m.status)
        setTimerCfg(deriveTimerCfg(m))
      }

      if (finish) {
        toast.success(t('committee.result.resultSaved'))
        onSaved()
      } else if (notice) {
        toast.success(notice)
      }
      return true
    } catch (e) {
      setSaveError(e.response?.data?.message || t('committee.result.saveFailed'))
      return false
    } finally {
      setSaving(false)
    }
  }

  retryRef.current = () => persist({})

  const addReferee = async () => {
    const name = newRefName.trim()
    if (!name) {
      setSaveError(t('committee.result.refereeNameRequired'))
      return
    }
    setAddingReferee(true)
    try {
      const r = await api.post('/committee/referees', {
        name,
        phone: newRefPhone.trim() || null,
      })
      const created = r.data?.data
      if (created?.id) {
        setReferees((list) => [...list.filter((ref) => ref.id !== created.id), created].sort((a, b) => a.name.localeCompare(b.name, 'ar')))
        setNewRefName('')
        setNewRefPhone('')
        toast.success(t('committee.result.refereeAdded'))
      }
    } catch (e) {
      setSaveError(e.response?.data?.message || t('committee.result.refereeAddFailed'))
    } finally {
      setAddingReferee(false)
    }
  }

  const isPlayerRedCarded = (playerId, minute) => {
    if (!playerId) return false
    const m = Number(minute) || 0
    return events.some((e) => {
      const dismissed = e.type === 'red_card'
        || e.type === 'second_yellow'
        || (e.type === 'foul' && (e.punishment === 'red' || e.punishment === 'second_yellow'))
      return dismissed && e.player_id === playerId && (Number(e.minute) || 0) <= m
    })
  }

  useEffect(() => {
    if (selectedType !== 'foul' && !['yellow_card', 'second_yellow', 'red_card'].includes(selectedType)) return
    const pid = form.player_id
    const isYellow = selectedType === 'foul' ? form.punishment === 'yellow' : form.cardColor === 'yellow_card'
    if (!pid || !isYellow) return
    const alreadyYellow = events.some((e) =>
      e.player_id === pid && (
        e.type === 'yellow_card'
        || (e.type === 'foul' && e.punishment === 'yellow')
      )
    )
    if (alreadyYellow) setForm((f) => ({ ...f, punishment: 'second_yellow' }))
  }, [selectedType, form.player_id, form.punishment, form.cardColor, events, setForm])

  const submitEvent = async (overrides = {}) => {
    // EventForm's submit button passes the DOM/SyntheticEvent to onSubmit
    // (onClick={onSubmit}); a click event has a `type` of "click" that would
    // otherwise shadow the real selectedType. Ignore anything with nativeEvent.
    if (overrides && typeof overrides === 'object' && overrides.nativeEvent) overrides = {}
    const type = overrides.type ?? selectedType
    const f = overrides.form ?? form
    const editing = overrides.editingKey ?? editingKey
    const evAbsMinute = Number(f.minute) || 0
    const evHalf = halfForAbsMinute(evAbsMinute)
    const evRelMinute = absToRelMinute(evAbsMinute, evHalf)
    if (!f.minute || Number(f.minute) <= 0) {
      if (overrides.form) return false
      setValidation('needMinute')
      return
    }
    if (Number(f.minute) < formMinAbs) {
      if (overrides.form) return false
      setValidation('minuteTooLow')
      return
    }
    if (Number(f.minute) > formMaxAbs) {
      if (overrides.form) return false
      setValidation('minuteTooHigh')
      return
    }
    if (Number(f.added_time) > 30) {
      if (overrides.form) return false
      setValidation('addedTimeHigh')
      return
    }
    if (type !== 'other') {
      if (!f.team_id) {
        if (overrides.form) return false
        setValidation('needTeam')
        return
      }
      if (!f.player_id) {
        if (overrides.form) return false
        setValidation('needPlayer')
        return
      }
      const suspendedIds = suspendedByTeam[f.team_id] || []
      if (suspendedIds.includes(f.player_id)) {
        if (overrides.form) return false
        setValidation('playerSuspended')
        return
      }
      if (isPlayerRedCarded(f.player_id, evRelMinute)) {
        if (overrides.form) return false
        setValidation('playerRedCarded')
        return
      }
    }
    if (type === 'substitution') {
      if (!f.assist_player_id) {
        if (overrides.form) return false
        setValidation('needPlayer')
        return
      }
      if (f.player_id === f.assist_player_id) {
        if (overrides.form) return false
        setValidation('invalidSubPlayers')
        return
      }
      const suspendedIds = suspendedByTeam[f.team_id] || []
      if (suspendedIds.includes(f.assist_player_id)) {
        if (overrides.form) return false
        setValidation('playerSuspended')
        return
      }
      if (isPlayerRedCarded(f.assist_player_id, evRelMinute)) {
        if (overrides.form) return false
        setValidation('playerRedCarded')
        return
      }
    }
    if (type === 'other' && !f.note?.trim()) {
      if (overrides.form) return false
      setValidation('needNote')
      return
    }

    setValidation(null)
    const eventType = type === 'goal'
      ? goalEventType(f)
      : type === 'penalty_goal' && f.missed
        ? 'missed_penalty'
        : (type === 'yellow_card' || type === 'second_yellow' || type === 'red_card')
          ? (f.cardColor || type)
          : type

    const ev = {
      _key: editing || uid(),
      type: eventType,
      punishment: eventType === 'foul' ? (f.punishment || 'none') : '',
      team_id: f.team_id !== '' && f.team_id != null ? Number(f.team_id) : null,
      player_id: type === 'other' ? null : f.player_id,
      player: type === 'other' ? '' : f.player.trim(),
      assist_player_id: type === 'substitution'
        ? f.assist_player_id
        : (eventType === 'goal' && !f.noAssist) ? f.assist_player_id : null,
      assist_player: type === 'substitution'
        ? f.assist.trim()
        : (eventType === 'goal' && !f.noAssist) ? f.assist.trim() : '',
      minute: evRelMinute,
      added_time: Number(f.added_time) || 0,
      half: evHalf,
      goalType: f.goalType || 'regular',
      reason: f.reason?.trim() || '',
      note: f.note?.trim() || '',
    }

    const nextEvents = editing
      ? events.map((e) => (e._key === editing ? ev : e))
      : [...events, ev].sort((a, b) => a.minute - b.minute || 0)

    setEvents(nextEvents)
    setTimelineDirty(true)
    setSelectedType(null)
    setEditingKey(null)
    if (!overrides.form) setForm({})
    retryRef.current = () => persist({ events: nextEvents })
    const ok = await persist({ events: nextEvents })
    if (ok) {
      setSuccessTick(ev._key)
      toast.success(t('committee.result.eventResultLive'))
      if (eventType === 'foul') {
        setFoulNotifCount((c) => c + 1)
        toast.success(t('committee.result.foulNotif'))
      }
    }
    return ok
  }

  const deleteEvent = async (ev) => {
    if (!window.confirm(t('committee.result.deleteConfirm'))) return
    const next = events.filter((e) => e._key !== ev._key)
    setEvents(next)
    setTimelineDirty(true)
    if (editingKey === ev._key) {
      setEditingKey(null)
      setSelectedType(null)
    }
    retryRef.current = () => persist({ events: next, notice: t('committee.result.eventDeleted') })
    await persist({ events: next, notice: t('committee.result.eventDeleted') })
  }

  const handleConvertPick = async (player) => {
    const award = convertTarget
    if (!award) return
    const ev = {
      _key: uid(),
      type: 'penalty_goal',
      goalType: 'penalty',
      team_id: award.awarded_to_team_id != null ? Number(award.awarded_to_team_id) : null,
      player_id: player?.id || null,
      player: player?.name || '',
      assist_player_id: null,
      assist_player: '',
      minute: Number(award.minute) || 1,
      added_time: 0,
      half: award.half === 'second' ? 'second' : 'first',
      punishment: '',
      reason: '',
      note: '',
    }
    setConvertTarget(null)
    const nextEvents = [...events, ev].sort((a, b) => a.minute - b.minute || 0)
    setEvents(nextEvents)
    setTimelineDirty(true)
    const ok = await persist({ events: nextEvents })
    if (ok) {
      setSuccessTick(ev._key)
      toast.success(t('committee.result.eventResultLive'))
    }
    try {
      await api.post(
        `/committee/tournaments/${tournament.id}/fixtures/${fixture.id}/penalties/award/${award.id}/resolve`,
        { outcome: 'converted' },
      )
      setFoulRefetchTick((v) => v + 1)
      toast.success(t('committee.result.penaltyConverted'))
    } catch (e) {
      toast.error(e.response?.data?.message || t('committee.result.saveFailed'))
    }
  }

  const saveDraft = async () => {
    retryRef.current = () => persist({ notice: t('committee.result.draftSaved') })
    await persist({ notice: t('committee.result.draftSaved') })
  }

  const confirmFinish = async () => {
    retryRef.current = () => persist({ finish: true })
    const ok = await persist({ finish: true })
    if (!ok) setConfirmOpen(false)
  }

  const runMatch = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const r = await api.post(`/committee/tournaments/${tournament.id}/fixtures/${fixture.id}/start`)
      setCurStatus('first_half')
      setTimerCfg(deriveTimerCfg(r.data?.data?.match))
      retryRef.current = () => persist({})
      toast.success(t('committee.result.matchStarted'))
    } catch (e) {
      setSaveError(e.response?.data?.message || t('committee.result.startFailed'))
    } finally {
      setSaving(false)
    }
  }

  const goToHalftime = async () => {
    retryRef.current = () => persist({ status: 'halftime', notice: t('committee.result.halftimeReached') })
    return persist({ status: 'halftime', notice: t('committee.result.halftimeReached') })
  }

  const startSecondHalf = async () => {
    setSaving(true)
    setSaveError(null)
    try {
      const r = await api.post(`/committee/tournaments/${tournament.id}/fixtures/${fixture.id}/start-second-half`)
      setCurStatus('second_half')
      setTimerCfg(deriveTimerCfg(r.data?.data?.match))
      retryRef.current = () => persist({})
      toast.success(t('committee.result.secondHalfStarted'))
    } catch (e) {
      setSaveError(e.response?.data?.message || t('committee.result.startFailed'))
    } finally {
      setSaving(false)
    }
  }

  const postCurrentResult = async () => {
    const live = isLiveStatus(curStatus) ? curStatus : 'first_half'
    retryRef.current = () => persist({ status: live, notice: t('committee.result.livePosted') })
    return persist({ status: live, notice: t('committee.result.livePosted') })
  }

  const counts = useMemo(() => {
    let goals = 0
    let yellows = 0
    let reds = 0
    let subs = 0
    let pens = 0
    for (const e of events) {
      if (e.type === 'goal' || e.type === 'penalty_goal' || e.type === 'own_goal') goals += 1
      if (e.type === 'foul') {
        if (e.punishment === 'red' || e.punishment === 'second_yellow') { yellows += e.punishment === 'second_yellow' ? 1 : 0; reds += 1 }
        else if (e.punishment === 'yellow') yellows += 1
        else if (e.punishment === 'penalty') pens += 1
      } else {
        if (e.type === 'yellow_card') yellows += 1
        if (e.type === 'red_card') reds += 1
        if (e.type === 'second_yellow') { yellows += 1; reds += 1 }
      }
      if (e.type === 'substitution') subs += 1
      if (e.type === 'penalty_goal') pens += 1
    }
    return { goals, yellows, reds, subs, pens }
  }, [events])

  const potmOptions = useMemo(() => {
    const out = []
    for (const teamId of [homeId, awayId]) {
      for (const p of rosters[teamId] || []) out.push({ ...p, team_id: teamId })
    }
    return out.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  }, [rosters, homeId, awayId])

  const homeEvents = useMemo(() => events.filter((e) => Number(e.team_id) === Number(homeId)), [events, homeId])
  const awayEvents = useMemo(() => events.filter((e) => Number(e.team_id) === Number(awayId)), [events, awayId])
  const generalEvents = useMemo(() => events.filter((e) => Number(e.team_id) !== Number(homeId) && Number(e.team_id) !== Number(awayId)), [events, homeId, awayId])

  const scoreFor = (teamId) => {
    if (Number(teamId) === Number(homeId)) return displayScore.home
    if (Number(teamId) === Number(awayId)) return displayScore.away
    return null
  }

  if (status === 'loading') {
    return (
      <ModalShell onClose={onClose}>
        <div className="space-y-4 p-6">
          <Skeleton className="h-16" />
          <Skeleton className="h-24" />
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
            <Skeleton className="h-56" />
          </div>
        </div>
      </ModalShell>
    )
  }

  if (status === 'error') {
    return (
      <ModalShell onClose={onClose}>
        <div className="grid place-items-center px-6 py-20 text-center">
          <div>
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-50 text-2xl">⚠️</span>
            <p className="mt-4 text-sm font-bold text-slate-700">{t('committee.result.loadFailed')}</p>
            <Button className="mt-4" size="sm" variant="outline" onClick={() => window.location.reload()}>
              <RefreshCw className="size-4" />
              {t('committee.result.retry')}
            </Button>
          </div>
        </div>
      </ModalShell>
    )
  }

  const showForm = selectedType != null

  const openPickerFromButton = () => {
    if (showForm) { cancelForm(); return }
    setPickerOpen(true)
  }

  const openTab = (id) => {
    // Opening a tab while the event form is open cancels the in-progress form.
    if (showForm) cancelForm()
    setActiveTab(id)
    if (id === 'stats') setFoulNotifCount(0)
  }

  return (
    <ModalShell onClose={onClose}>
      <HeaderBlock t={t} homeName={homeName} awayName={awayName} tournament={tournament} fixture={fixture} onClose={onClose} />

      <ScoreActions
        displayScore={displayScore}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        homeName={homeName}
        awayName={awayName}
        alreadyFinished={alreadyFinished}
        halftime={curStatus === 'halftime'}
        liveMinute={currentLiveMinute}
        timerText={timerText}
        activeHalf={timerCfg.activeHalf}
        matchNotStarted={matchNotStarted}
        onAddEvent={openPickerFromButton}
        t={t}
      />

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full max-w-5xl flex-col p-4 sm:p-5">
          {showForm ? (
            <SectionCard
              title={editingKey ? t('committee.result.editEventTitle') : t('committee.result.addEvent')}
              icon={Plus}
              action={
                <button type="button" onClick={() => { cancelForm(); setPickerOpen(true) }} className="rounded-lg px-2 py-1 text-[11px] font-bold text-slate-400 transition-colors hover:text-slate-600">
                  {t('committee.result.changeType')}
                </button>
              }
              bodyClassName="p-4"
            >
              <EventForm
                type={selectedType}
                form={form}
                setForm={setForm}
                setField={setFormField}
                homeId={homeId}
                awayId={awayId}
                homeName={homeName}
                awayName={awayName}
                onSelectPlayer={(player) => setForm((f) => ({ ...f, player_id: player.id, player: player.name }))}
                onSelectAssist={(player) => setForm((f) => ({ ...f, assist_player_id: player.id, assist: player.name }))}
                t={t}
                validation={validation}
                onSubmit={submitEvent}
                suspendedIds={suspendedByTeam[form.team_id] || []}
                minMinute={formMinAbs}
                maxMinute={formMaxAbs}
                maxAddedTime={30}
                half={formHalf}
              />
            </SectionCard>
          ) : (
            <>
              <TabBar
                active={activeTab}
                onChange={openTab}
                t={t}
                tabs={[
                  { id: 'players', icon: '👥', labelKey: 'committee.result.players' },
                  { id: 'timeline', icon: '⏱', labelKey: 'committee.result.events' },
                  { id: 'stats', icon: '📊', labelKey: 'committee.result.summary', badge: foulNotifCount },
                  { id: 'notes', icon: '📝', labelKey: 'committee.result.matchNotes' },
                ]}
              />

              <div className="mt-4 flex-1 min-h-0">
                {activeTab === 'timeline' && (
                  <TimelineTab
                    homeId={homeId}
                    homeName={homeName}
                    homeTeam={homeTeam}
                    homeScore={scoreFor(homeId)}
                    awayId={awayId}
                    awayName={awayName}
                    awayTeam={awayTeam}
                    awayScore={scoreFor(awayId)}
                    homeEvents={homeEvents}
                    awayEvents={awayEvents}
                    generalEvents={generalEvents}
                    freshTick={successTick}
                    onEdit={startEdit}
                    onDelete={deleteEvent}
                    eventsEmpty={events.length === 0}
                    onAddFirst={() => { cancelForm(); setPickerOpen(true) }}
                    halfDuration={timerCfg.halfDurationMinutes}
                    t={t}
                  />
                )}

                {activeTab === 'stats' && (
                  <StatsFoulsTab
                    displayScore={displayScore}
                    counts={counts}
                    isKnockout={isKnockout}
                    homeName={homeName}
                    awayName={awayName}
                    homePen={homePen}
                    awayPen={awayPen}
                    setHomePen={setHomePen}
                    setAwayPen={setAwayPen}
                    homeTeam={homeTeam}
                    awayTeam={awayTeam}
                    tournamentId={tournament.id}
                    fixtureId={fixture.id}
                    homeId={homeId}
                    awayId={awayId}
                    foulRefetchTick={foulRefetchTick}
                    onAwardConverted={setConvertTarget}
                    t={t}
                  />
                )}

                {activeTab === 'players' && (
                  <PlayersTab
                    homeId={homeId}
                    homeName={homeName}
                    homeTeam={homeTeam}
                    awayId={awayId}
                    awayName={awayName}
                    awayTeam={awayTeam}
                    homeRoster={rosters[homeId] || []}
                    awayRoster={rosters[awayId] || []}
                    suspendedByTeam={suspendedByTeam}
                    redCardedIds={redCardedIds}
                    busyId={quickBusyId}
                    onTapPlayer={(player, teamId) => tapPlayer(player, teamId)}
                    onAddPlayer={addPlayerToTeam}
                    t={t}
                  />
                )}

                {activeTab === 'notes' && (
                  <NotesMvpTab
                    potmOptions={potmOptions}
                    mvp={mvp}
                    mvpId={mvpId}
                    setMvpId={setMvpId}
                    setMvp={setMvp}
                    mvpRating={mvpRating}
                    setMvpRating={setMvpRating}
                    notes={notes}
                    setNotes={setNotes}
                    refereesProps={{ referees, assigned, setAssigned, newRefName, setNewRefName, newRefPhone, setNewRefPhone, addingReferee, addReferee }}
                    t={t}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <FooterActions
        saveError={saveError}
        retryRef={retryRef}
        saving={saving}
        saveDraft={saveDraft}
        setConfirmOpen={setConfirmOpen}
        onClose={onClose}
        matchNotStarted={matchNotStarted}
        isLiveMatch={isLiveMatch}
        alreadyFinished={alreadyFinished}
        runMatch={runMatch}
        postCurrentResult={postCurrentResult}
        showHalftime={curStatus === 'first_half'}
        showStartSecondHalf={curStatus === 'halftime'}
        onHalftime={goToHalftime}
        onStartSecondHalf={startSecondHalf}
        onQuickFinish={confirmFinish}
        t={t}
      />

      {successTick && (
        <div className="pointer-events-none absolute end-4 top-16 z-20 flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-[11px] font-black text-white shadow-lg score-pop">
          <Check className="size-3.5" />
          {t('committee.result.eventSaved')}
        </div>
      )}

      {confirmOpen && (
        <ConfirmResultModal
          events={events}
          score={displayScore}
          homeName={homeName}
          awayName={awayName}
          homeId={homeId}
          awayId={awayId}
          isKnockout={isKnockout}
          homePen={homePen}
          awayPen={awayPen}
          referees={referees}
          assigned={assigned}
          saving={saving}
          onConfirm={confirmFinish}
          onCancel={() => setConfirmOpen(false)}
          halfDuration={timerCfg.halfDurationMinutes}
          t={t}
        />
      )}

      <EventTypePicker
        open={pickerOpen}
        options={QUICK_ACTIONS}
        onPick={(type) => {
          if (quickPlayer) {
            openFromPlayer(type)
          } else {
            setPickerOpen(false)
            openForm(type)
          }
        }}
        onClose={() => {
          setPickerOpen(false)
          setQuickPlayer(null)
        }}
      />

      {convertTarget && (
        <div className="absolute inset-0 z-40 flex items-end justify-center bg-slate-900/40 backdrop-blur-[2px] sm:items-center">
          <div className="w-full max-w-md rounded-t-3xl bg-white p-4 shadow-2xl sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-black text-slate-800">{t('committee.result.penaltyShooter.title')}</p>
              <button
                type="button"
                onClick={() => setConvertTarget(null)}
                className="rounded-lg px-2 py-1 text-xs font-bold text-slate-400 transition-colors hover:text-slate-700"
              >
                {t('committee.result.penaltyShooter.cancel')}
              </button>
            </div>
            <p className="mb-3 text-[11px] font-bold text-slate-500">
              {t('committee.result.penaltyShooter.pickBy', { team: convertTarget.awarded_to_name || '' })}
            </p>
            <PlayerSelector
              teamId={convertTarget.awarded_to_team_id}
              value={null}
              valueName={null}
              onSelect={handleConvertPick}
              label={t('committee.result.penaltyShooter.shooter')}
              placeholder={t('committee.result.penaltyShooter.searchShooter')}
              autoFocus
              t={t}
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button size="sm" variant="outline" onClick={() => setConvertTarget(null)}>
                {t('committee.result.penaltyShooter.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ModalShell>
  )
}

// ModalShell, TeamScore, MiniStat moved to domain components

