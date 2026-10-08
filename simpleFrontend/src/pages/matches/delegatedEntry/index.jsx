import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  User,
  Phone,
  ShieldCheck,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Send,
  Loader2,
  X,
  Info,
  Calendar,
  MapPin,
  Trophy,
  Users,
  ClipboardList,
  Check,
  Sparkles,
} from 'lucide-react'
import api from '../../../api/client'
import { Button } from '../../../components/dashboard/ui'
import TeamLogo from '../../../components/profile/TeamLogo'
import TabBar from '../../../domains/committee/components/TabBar'
import TimelineTab from '../../../domains/committee/components/TimelineTab'
import PlayersTab from '../../../domains/committee/components/PlayersTab'
import PresenceTab from '../../../domains/committee/components/PresenceTab'
import HeaderBlock from '../../../domains/committee/components/HeaderBlock'
import ScoreActions from '../../../domains/committee/components/ScoreActions'
import EventTypePicker from '../../../domains/committee/components/EventTypePicker'
import EventForm from '../../../domains/committee/components/EventForm'
import SectionCard from '../../../components/ui/SectionCard'
import OneTapEventSheet from '../../../domains/committee/components/OneTapEventSheet'
import MatchTimerBottomBar from '../../../domains/committee/components/MatchTimerBottomBar'
import FoulPanel from '../../../domains/committee/components/FoulPanel'
import MiniStat from '../../../domains/committee/components/MiniStat'
import { QUICK_ACTIONS } from '../../../data/matchConstants'
import { formatTime, matchDay } from '../../../lib/adapters'

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

export default function DelegatedMatchEntryPage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  // Recorder Identity
  const [recorderName, setRecorderName] = useState(() => localStorage.getItem('delegated_recorder_name') || '')
  const [recorderPhone, setRecorderPhone] = useState(() => localStorage.getItem('delegated_recorder_phone') || '')
  const [isIdentified, setIsIdentified] = useState(false)

  // Match Control & Events state
  const [events, setEvents] = useState([])
  const [timelineDirty, setTimelineDirty] = useState(false)
  const [storedScore, setStoredScore] = useState({ home: 0, away: 0 })
  const [extraTime, setExtraTime] = useState(false)
  const [penalties, setPenalties] = useState(false)
  const [homePen, setHomePen] = useState('')
  const [awayPen, setAwayPen] = useState('')
  const [notes, setNotes] = useState('')

  // Presence / Attendance state
  const [confirmedHome, setConfirmedHome] = useState(() => new Set())
  const [confirmedAway, setConfirmedAway] = useState(() => new Set())

  // UI Tabs & Modals
  const [activeTab, setActiveTab] = useState('players') // Default to 'players' matching Image 2
  const [pickerOpen, setPickerOpen] = useState(false)
  const [selectedType, setSelectedType] = useState(null)
  const [editingKey, setEditingKey] = useState(null)
  const [form, setForm] = useState({})
  const [validation, setValidation] = useState(null)
  const [quickPlayer, setQuickPlayer] = useState(null)
  const [showMeta, setShowMeta] = useState(false)

  // Live Timer & Status state
  const [curStatus, setCurStatus] = useState('scheduled') // 'scheduled' | 'first_half' | 'halftime' | 'second_half' | 'finished'
  const [isPaused, setIsPaused] = useState(false)
  const [pauseStartMs, setPauseStartMs] = useState(null)
  const [accumulatedPauseMs, setAccumulatedPauseMs] = useState(0)
  const [halfStartMs, setHalfStartMs] = useState(null)
  const [, setTick] = useState(0)
  const [foulRefetchTick, setFoulRefetchTick] = useState(0)
  const [foulNotifCount, setFoulNotifCount] = useState(0)

  // One-Tap Event Recording state
  const [oneTapSheetOpen, setOneTapSheetOpen] = useState(false)
  const [oneTapPlayer, setOneTapPlayer] = useState(null)
  const [oneTapTeamId, setOneTapTeamId] = useState(null)
  const [oneTapVariant, setOneTapVariant] = useState('home')
  const [oneTapBench, setOneTapBench] = useState([])
  const lastTapRef = useRef(null)

  // Load match data
  useEffect(() => {
    async function fetchMatch() {
      setLoading(true)
      setError(null)
      try {
        const res = await api.get(`/v1/match-entry/${token}`)
        const payload = res.data.data
        setData(payload)

        if (payload.recorder?.identified) {
          setRecorderName(payload.recorder.name)
          setRecorderPhone(payload.recorder.phone)
          setIsIdentified(true)
        } else if (recorderName && recorderPhone) {
          setIsIdentified(true)
        }

        // Presence initialization
        if (payload.submission?.client_meta?.presence) {
          if (Array.isArray(payload.submission.client_meta.presence.home)) {
            setConfirmedHome(new Set(payload.submission.client_meta.presence.home))
          }
          if (Array.isArray(payload.submission.client_meta.presence.away)) {
            setConfirmedAway(new Set(payload.submission.client_meta.presence.away))
          }
        } else {
          const homeInitial = (payload.rosters?.home || []).slice(0, 5).map((p) => p.id)
          const awayInitial = (payload.rosters?.away || []).slice(0, 5).map((p) => p.id)
          setConfirmedHome(new Set(homeInitial))
          setConfirmedAway(new Set(awayInitial))
        }

        // Prefill existing pending submission if available
        if (payload.submission) {
          setStoredScore({
            home: payload.submission.home_score,
            away: payload.submission.away_score,
          })
          setExtraTime(Boolean(payload.submission.extra_time))
          if (payload.submission.home_penalties !== null) {
            setPenalties(true)
            setHomePen(payload.submission.home_penalties)
            setAwayPen(payload.submission.away_penalties)
          }
          setNotes(payload.submission.notes || '')
          if (Array.isArray(payload.submission.events) && payload.submission.events.length > 0) {
            setEvents(payload.submission.events)
            setTimelineDirty(true)
            setCurStatus('finished')
          }
        } else {
          // Check cached local events if network reconnects
          const cached = localStorage.getItem(`delegated_events_${token}`)
          if (cached) {
            try {
              const parsed = JSON.parse(cached)
              if (Array.isArray(parsed) && parsed.length > 0) {
                setEvents(parsed)
                setTimelineDirty(true)
              }
            } catch (_) {}
          }
          if (payload.fixture?.match?.status) {
            setCurStatus(payload.fixture.match.status)
          }
        }
      } catch (err) {
        setError(err.response?.data?.message || 'الرابط غير صالح أو انتهت صلاحيته')
      } finally {
        setLoading(false)
      }
    }

    if (token) {
      fetchMatch()
    }
  }, [token])

  const fixture = data?.fixture
  const homeTeam = fixture?.home_team
  const awayTeam = fixture?.away_team
  const homeId = homeTeam?.id
  const awayId = awayTeam?.id
  const homeName = homeTeam?.name || 'الفريق المضيف'
  const awayName = awayTeam?.name || 'الفريق الضيف'

  const homeRoster = data?.rosters?.home || []
  const awayRoster = data?.rosters?.away || []

  const handleTogglePresence = (playerId, teamId, nextConfirmed) => {
    if (Number(teamId) === Number(homeId)) {
      setConfirmedHome((prev) => {
        const next = new Set(prev)
        if (nextConfirmed) next.add(playerId)
        else next.delete(playerId)
        return next
      })
    } else {
      setConfirmedAway((prev) => {
        const next = new Set(prev)
        if (nextConfirmed) next.add(playerId)
        else next.delete(playerId)
        return next
      })
    }
  }

  // 1. Calculate red carded / dismissed player IDs by team
  const redCardedIds = useMemo(() => {
    const map = {}
    for (const e of events) {
      const dismissed = e.type === 'red_card'
        || e.type === 'second_yellow'
        || (e.type === 'foul' && (e.punishment === 'red' || e.punishment === 'second_yellow'))
      if (!dismissed || e.team_id == null || e.player_id == null) continue
      const tid = Number(e.team_id)
      if (!map[tid]) map[tid] = []
      const pid = Number(e.player_id)
      if (!map[tid].includes(pid)) map[tid].push(pid)
    }
    return map
  }, [events])

  // 2. Count yellow cards for a player across events
  const getPlayerYellows = (playerId, ignoreKey = null) => {
    if (!playerId) return 0
    return events.filter((e) => {
      if (ignoreKey && (e._key || e.id) === ignoreKey) return false
      if (Number(e.player_id) !== Number(playerId)) return false
      return e.type === 'yellow_card' || (e.type === 'foul' && e.punishment === 'yellow')
    }).length
  }

  // 3. Check if player has been dismissed at or before minute M
  const isPlayerDismissed = (playerId, minute = Infinity, ignoreKey = null) => {
    if (!playerId) return false
    const m = Number(minute) || Infinity
    return events.some((e) => {
      if (ignoreKey && (e._key || e.id) === ignoreKey) return false
      if (Number(e.player_id) !== Number(playerId)) return false
      const dismissed = e.type === 'red_card'
        || e.type === 'second_yellow'
        || (e.type === 'foul' && (e.punishment === 'red' || e.punishment === 'second_yellow'))
      return dismissed && (Number(e.minute) || 0) <= m
    })
  }

  // 4. Check if player is on the field at minute M
  const isPlayerOnField = (playerId, teamId, minute = Infinity, ignoreKey = null) => {
    if (!playerId) return false
    const m = Number(minute) || 0
    const tid = Number(teamId)
    const pid = Number(playerId)

    // A. Player dismissed? -> Off the field
    if (isPlayerDismissed(pid, m, ignoreKey)) return false

    // B. Find all substitutions for this team at or before minute M (excluding ignoreKey)
    const relevantSubs = events.filter((e) => {
      if (ignoreKey && (e._key || e.id) === ignoreKey) return false
      return e.type === 'substitution' &&
        Number(e.team_id) === tid &&
        (Number(e.player_id) === pid || Number(e.assist_player_id) === pid) &&
        (Number(e.minute) || 0) <= m
    })

    if (relevantSubs.length > 0) {
      // Sort chronologically to find the LATEST substitution involving this player
      relevantSubs.sort((a, b) => {
        const hA = a.half === 'second' || a.half === '2' ? 2 : 1
        const hB = b.half === 'second' || b.half === '2' ? 2 : 1
        if (hA !== hB) return hA - hB
        const minDiff = (Number(a.minute) || 0) - (Number(b.minute) || 0)
        if (minDiff !== 0) return minDiff
        const addDiff = (Number(a.added_time) || 0) - (Number(b.added_time) || 0)
        if (addDiff !== 0) return addDiff
        return events.indexOf(a) - events.indexOf(b)
      })

      const latestSub = relevantSubs[relevantSubs.length - 1]
      // If latest sub was entering the field (assist_player_id), player is on the field.
      // If latest sub was leaving the field (player_id), player is off the field.
      if (Number(latestSub.assist_player_id) === pid) return true
      if (Number(latestSub.player_id) === pid) return false
    }

    // C. If no substitutions up to minute M, derive from starting lineup
    const confirmedSet = tid === Number(homeId) ? confirmedHome : confirmedAway
    const roster = tid === Number(homeId) ? homeRoster : awayRoster
    if (confirmedSet && confirmedSet.size > 0) {
      return confirmedSet.has(pid)
    }
    return roster.slice(0, 5).some((p) => Number(p.id) === pid)
  }

  const displayScore = useMemo(() => {
    if (timelineDirty || events.length > 0) {
      return computeScore(events, homeId, awayId)
    }
    return storedScore
  }, [timelineDirty, events, storedScore, homeId, awayId])

  const homeEvents = useMemo(() => events.filter((e) => Number(e.team_id) === Number(homeId)), [events, homeId])
  const awayEvents = useMemo(() => events.filter((e) => Number(e.team_id) === Number(awayId)), [events, awayId])
  const generalEvents = useMemo(() => events.filter((e) => e.team_id == null || (Number(e.team_id) !== Number(homeId) && Number(e.team_id) !== Number(awayId))), [events, homeId, awayId])

  const foulRules = data?.foul_rules
  const isFoulRuleActive = Boolean(foulRules?.enabled)
  const teamFoulThreshold = foulRules?.team_threshold || 6
  const foulResetScope = foulRules?.reset_scope || 'half'

  const counts = useMemo(() => {
    let goals = 0
    let yellows = 0
    let reds = 0
    let subs = 0
    let pens = 0
    let fouls = 0
    for (const e of events) {
      if (e.type === 'goal' || e.type === 'penalty_goal' || e.type === 'own_goal') goals += 1
      if (e.type === 'foul') {
        fouls += 1
        if (e.punishment === 'red' || e.punishment === 'second_yellow') {
          yellows += e.punishment === 'second_yellow' ? 1 : 0
          reds += 1
        } else if (e.punishment === 'yellow') yellows += 1
        else if (e.punishment === 'penalty') pens += 1
      } else {
        if (e.type === 'yellow_card') yellows += 1
        if (e.type === 'red_card') reds += 1
        if (e.type === 'second_yellow') { yellows += 1; reds += 1 }
      }
      if (e.type === 'substitution') subs += 1
      if (e.type === 'penalty_goal') pens += 1
    }
    return { goals, yellows, reds, subs, pens, fouls }
  }, [events])

  const getTeamFoulsInWindow = (teamId, half = null) => {
    const tid = Number(teamId)
    return events.filter((e) => {
      if (Number(e.team_id) !== tid) return false
      if (e.type !== 'foul') return false
      if (foulResetScope === 'half') {
        const h = (half === 'second' || half === '2') ? 'second' : 'first'
        const eH = (e.half === 'second' || e.half === '2') ? 'second' : 'first'
        if (eH !== h) return false
      }
      return true
    }).length
  }

  const handleIdentify = async (e) => {
    e.preventDefault()
    if (!recorderName.trim() || !recorderPhone.trim()) {
      alert('الرجاء إدخال اسمك ورقم الهاتف لمتابعة تسجيل المباراة')
      return
    }

    try {
      await api.post(`/v1/match-entry/${token}/identify`, {
        recorder_name: recorderName.trim(),
        recorder_phone: recorderPhone.trim(),
      })
      localStorage.setItem('delegated_recorder_name', recorderName.trim())
      localStorage.setItem('delegated_recorder_phone', recorderPhone.trim())
      setIsIdentified(true)
    } catch (err) {
      alert(err.response?.data?.message || 'تعذر حفظ البيانات، الرجاء المحاولة ثانية')
    }
  }

  const activeHalf = curStatus === 'first_half' ? 'first' : (curStatus === 'second_half' ? 'second' : null)
  const matchNotStarted = curStatus === 'scheduled' || curStatus === 'warmup'

  useEffect(() => {
    if (!activeHalf || isPaused) return
    const id = setInterval(() => setTick((v) => v + 1), 1000)
    return () => clearInterval(id)
  }, [activeHalf, isPaused])

  const halfDurationMinutes = data?.fixture?.match?.half_duration_minutes || 45
  const elapsedSec = (activeHalf && halfStartMs)
    ? Math.max(0, Math.floor(((isPaused && pauseStartMs ? pauseStartMs : Date.now()) - halfStartMs - accumulatedPauseMs) / 1000))
    : 0
  const displayClockSec = activeHalf === 'second'
    ? elapsedSec + (halfDurationMinutes * 60)
    : elapsedSec
  const pad2 = (n) => String(n).padStart(2, '0')
  const formatClock = (s) => `${pad2(Math.floor(s / 60))}:${pad2(s % 60)}`
  const timerText = activeHalf ? formatClock(displayClockSec) : null
  const currentLiveMinute = activeHalf
    ? Math.min(halfDurationMinutes, Math.floor(elapsedSec / 60) + 1)
    : 1

  const togglePauseTimer = () => {
    if (isPaused) {
      if (pauseStartMs) {
        setAccumulatedPauseMs((prev) => prev + (Date.now() - pauseStartMs))
      }
      setPauseStartMs(null)
      setIsPaused(false)
    } else {
      setPauseStartMs(Date.now())
      setIsPaused(true)
    }
  }

  const handleStartMatch = () => {
    setCurStatus('first_half')
    setHalfStartMs(Date.now())
    setAccumulatedPauseMs(0)
    setPauseStartMs(null)
    setIsPaused(false)
  }

  const handleHalftime = () => {
    setCurStatus('halftime')
    setIsPaused(false)
    setPauseStartMs(null)
  }

  const handleStartSecondHalf = () => {
    setCurStatus('second_half')
    setHalfStartMs(Date.now())
    setAccumulatedPauseMs(0)
    setPauseStartMs(null)
    setIsPaused(false)
  }

  const tapPlayer = (player, teamId, variant = 'home', bench = []) => {
    if (isPlayerDismissed(player.id)) {
      alert('اللاعب مطرود بالبطاقة الحمراء ولا يمكن إضافة حدث له!')
      return
    }
    setOneTapPlayer(player)
    setOneTapTeamId(teamId)
    setOneTapVariant(variant)
    setOneTapBench(bench)
    setOneTapSheetOpen(true)
  }

  const handleOneTapRecord = (type, player, teamId) => {
    if (matchNotStarted || isPaused) return
    const now = Date.now()
    if (lastTapRef.current && (now - lastTapRef.current.ts < 500) && lastTapRef.current.pid === player.id && lastTapRef.current.type === type) {
      return
    }
    lastTapRef.current = { ts: now, pid: player.id, type }

    const curHalf = activeHalf || 'first'
    const minute = currentLiveMinute > 0 ? currentLiveMinute : 1
    const tid = Number(teamId)
    const pid = player.id

    let eventType = type
    let punishment = ''

    if (type === 'goal') {
      eventType = 'goal'
    } else if (type === 'foul') {
      eventType = 'foul'
      punishment = 'none'
    } else if (type === 'yellow_card') {
      const existingYellows = getPlayerYellows(pid)
      if (existingYellows >= 1) {
        eventType = 'second_yellow'
        punishment = 'second_yellow'
      } else {
        eventType = 'yellow_card'
        punishment = 'yellow'
      }
    } else if (type === 'red_card') {
      eventType = 'red_card'
      punishment = 'red'
    }

    const newEv = {
      _key: uid(),
      type: eventType,
      team_id: tid,
      player_id: pid,
      player: player.name,
      minute: minute,
      added_time: 0,
      half: curHalf,
      goalType: eventType === 'goal' ? 'regular' : undefined,
      punishment: punishment,
      cardColor: eventType,
      reason: '',
      note: '',
    }

    const nextEvents = [...events, newEv].sort((a, b) => a.minute - b.minute)
    setEvents(nextEvents)
    setTimelineDirty(true)
    if (eventType === 'foul') {
      setFoulNotifCount((c) => c + 1)
      setFoulRefetchTick((v) => v + 1)
      const currentHalf = curHalf || activeHalf || 'first'
      const priorFouls = getTeamFoulsInWindow(tid, currentHalf)
      const newFouls = priorFouls + 1
      if (isFoulRuleActive && newFouls >= teamFoulThreshold) {
        const offenderName = tid === Number(homeId) ? homeName : awayName
        const beneficiaryName = tid === Number(homeId) ? awayName : homeName
        alert(`⚠️ تنبيه الخطأ التراكمي (${newFouls}/${teamFoulThreshold}):\nبلغ فريق "${offenderName}" الخطأ رقم ${newFouls} في هذا الشوط!\nيستحق فريق "${beneficiaryName}" ركلة جزاء تراكمية (الخطأ السادس وما بعده).`)
      }
    }
    try {
      localStorage.setItem(`delegated_events_${token}`, JSON.stringify(nextEvents))
    } catch (_) {}
  }

  const handleOneTapSubstitute = (playerOut, playerIn, teamId) => {
    if (matchNotStarted || isPaused) return
    const now = Date.now()
    if (lastTapRef.current && (now - lastTapRef.current.ts < 500) && lastTapRef.current.pid === playerOut.id && lastTapRef.current.type === 'substitution') {
      return
    }
    lastTapRef.current = { ts: now, pid: playerOut.id, type: 'substitution' }

    const curHalf = activeHalf || 'first'
    const minute = currentLiveMinute > 0 ? currentLiveMinute : 1
    const tid = Number(teamId)

    const newEv = {
      _key: uid(),
      type: 'substitution',
      team_id: tid,
      player_id: playerOut.id,
      player: playerOut.name,
      assist_player_id: playerIn.id,
      assist: playerIn.name,
      assist_player: playerIn.name,
      minute: minute,
      added_time: 0,
      half: curHalf,
      description: `خروج: ${playerOut.name} • دخول: ${playerIn.name}`,
      metadata: { out: playerOut.name, in: playerIn.name },
    }

    const nextEvents = [...events, newEv].sort((a, b) => a.minute - b.minute)
    setEvents(nextEvents)
    setTimelineDirty(true)
    try {
      localStorage.setItem(`delegated_events_${token}`, JSON.stringify(nextEvents))
    } catch (_) {}
  }

  const openForm = (type) => {
    setSelectedType(type)
    setEditingKey(null)
    setValidation(null)
    setForm({
      team_id: homeId,
      minute: 1,
      added_time: 0,
      half: 'first',
      goalType: 'regular',
      punishment: type === 'foul' ? 'none' : '',
    })
  }

  const openFromPlayer = (type) => {
    if (!quickPlayer) return
    const p = quickPlayer.player
    const tid = quickPlayer.teamId
    const pid = p.id

    if (isPlayerDismissed(pid)) {
      alert('اللاعب مطرود بالبطاقة الحمراء ولا يمكن إضافة حدث له!')
      setQuickPlayer(null)
      return
    }

    let finalType = type
    let punishment = type === 'foul' ? 'none' : ''
    if (type === 'yellow_card') {
      const existingYellows = getPlayerYellows(pid)
      if (existingYellows >= 1) {
        finalType = 'second_yellow'
        punishment = 'second_yellow'
      }
    }

    setSelectedType(finalType)
    setEditingKey(null)
    setValidation(null)
    setForm({
      team_id: tid,
      player_id: pid,
      player: p.name,
      minute: 1,
      added_time: 0,
      half: 'first',
      goalType: 'regular',
      punishment: punishment,
      cardColor: finalType,
    })
    setQuickPlayer(null)
    setPickerOpen(false)
  }

  const cancelForm = () => {
    setSelectedType(null)
    setEditingKey(null)
    setForm({})
    setValidation(null)
  }

  const setField = (key) => (val) => setForm((f) => ({ ...f, [key]: val }))

  const handleSaveEvent = (e) => {
    if (e && e.preventDefault) e.preventDefault()
    if (!form.team_id) {
      setValidation('needTeam')
      return
    }

    const minute = Number(form.minute) || 1
    const tid = Number(form.team_id)
    const pid = form.player_id ? Number(form.player_id) : null
    const aid = form.assist_player_id ? Number(form.assist_player_id) : null

    // 1. Expulsion check: player cannot participate if dismissed
    if (pid && isPlayerDismissed(pid, minute, editingKey)) {
      alert('اللاعب مطرود بالبطاقة الحمراء ولا يمكنه المشاركة في أحداث المباراة!')
      return
    }

    // 2. Yellow card check & auto-conversion to second yellow
    let eventType = selectedType
    let punishment = form.punishment || ''
    if (pid && (selectedType === 'yellow_card' || (selectedType === 'foul' && punishment === 'yellow'))) {
      const existingYellows = getPlayerYellows(pid, editingKey)
      if (existingYellows >= 1) {
        eventType = 'second_yellow'
        punishment = 'second_yellow'
      }
    }

    // 3. Field presence check for goals and assists
    if (eventType === 'goal' || eventType === 'penalty_goal') {
      if (pid && !isPlayerOnField(pid, tid, minute, editingKey)) {
        alert('اللاعب المسجل للهدف لا يتواجد في أرضية الملعب في هذه الدقيقة (إما مطرود، مستبدل، أو في دكة الاحتياط)!')
        return
      }
      if (aid && !isPlayerOnField(aid, tid, minute, editingKey)) {
        alert('اللاعب صاحب التمريرة الحاسمة لا يتواجد في أرضية الملعب في هذه الدقيقة!')
        return
      }
    }

    // 4. Substitution checks
    if (eventType === 'substitution') {
      if (!pid || !aid) {
        alert('يرجى تحديد اللاعب الخارج واللاعب البديل!')
        return
      }
      if (pid === aid) {
        alert('لا يمكن استبدال اللاعب بنفسه!')
        return
      }
      if (!isPlayerOnField(pid, tid, minute, editingKey)) {
        alert('اللاعب المراد استبداله (الخارج) لا يتواجد حالياً في أرضية الملعب!')
        return
      }
      if (isPlayerDismissed(aid, minute, editingKey)) {
        alert('اللاعب البديل مطرود بالبطاقة الحمراء ولا يمكنه الدخول!')
        return
      }
      if (isPlayerOnField(aid, tid, minute, editingKey)) {
        alert('اللاعب البديل يتواجد بالفعل في أرضية الملعب!')
        return
      }
    }

    const newEv = {
      _key: editingKey || uid(),
      type: eventType,
      team_id: tid,
      player_id: pid,
      player: form.player || '',
      assist_player_id: aid,
      assist: form.assist || '',
      minute: minute,
      added_time: Number(form.added_time) || 0,
      half: form.half || 'first',
      goalType: form.goalType || 'regular',
      punishment: punishment,
      reason: form.reason || '',
      note: form.note || '',
    }

    const nextEvents = editingKey
      ? events.map((ev) => (ev._key === editingKey ? newEv : ev))
      : [...events, newEv].sort((a, b) => a.minute - b.minute)

    setEvents(nextEvents)
    setTimelineDirty(true)
    if (eventType === 'foul') {
      setFoulNotifCount((c) => c + 1)
      setFoulRefetchTick((v) => v + 1)
      const evHalf = form.half || activeHalf || 'first'
      const priorFouls = getTeamFoulsInWindow(tid, evHalf)
      const newFouls = editingKey ? priorFouls : priorFouls + 1
      if (isFoulRuleActive && newFouls >= teamFoulThreshold) {
        const offenderName = tid === Number(homeId) ? homeName : awayName
        const beneficiaryName = tid === Number(homeId) ? awayName : homeName
        alert(`⚠️ تنبيه الخطأ التراكمي (${newFouls}/${teamFoulThreshold}):\nبلغ فريق "${offenderName}" الخطأ رقم ${newFouls} في هذا الشوط!\nيستحق فريق "${beneficiaryName}" ركلة جزاء تراكمية (الخطأ السادس وما بعده).`)
      }
    }
    cancelForm()
  }

  const handleDeleteEvent = (ev) => {
    setEvents((prev) => prev.filter((e) => (e._key || e.id) !== (ev._key || ev.id)))
    setTimelineDirty(true)
    setFoulRefetchTick((v) => v + 1)
  }

  const handleEditEvent = (ev) => {
    setSelectedType(ev.type)
    setEditingKey(ev._key || ev.id)
    setForm({
      team_id: ev.team_id,
      player_id: ev.player_id,
      player: ev.player || ev.description || '',
      assist_player_id: ev.assist_player_id,
      assist: ev.assist || '',
      minute: ev.minute,
      added_time: ev.added_time,
      half: ev.half,
      goalType: ev.goalType,
      punishment: ev.punishment,
      reason: ev.reason,
      note: ev.note,
    })
  }

  const handleSubmit = async () => {
    const finalScore = displayScore
    if (!window.confirm(`هل أنت متأكد من إرسال نتيجة (${finalScore.home} - ${finalScore.away}) للاعتماد الرسمي من قبل اللجنة؟`)) return
    setSubmitting(true)
    try {
      await api.post(`/v1/match-entry/${token}/submit`, {
        recorder_name: recorderName.trim(),
        recorder_phone: recorderPhone.trim(),
        home_score: finalScore.home,
        away_score: finalScore.away,
        extra_time: extraTime,
        home_penalties: penalties && homePen !== '' ? Number(homePen) : null,
        away_penalties: penalties && awayPen !== '' ? Number(awayPen) : null,
        notes: notes.trim() || null,
        presence: {
          home: Array.from(confirmedHome),
          away: Array.from(confirmedAway),
        },
        events: events.map((e) => ({
          type: e.type,
          team_id: e.team_id,
          player_id: e.player_id,
          player: e.player || e.description || '',
          minute: e.minute,
          assist_player_id: e.assist_player_id,
          assist: e.assist || e.assist_player || '',
          assist_player: e.assist || e.assist_player || '',
          description: e.player || e.description || '',
          goalType: e.goalType,
          punishment: e.punishment,
          reason: e.reason,
          note: e.note,
          metadata: {
            goalType: e.goalType,
            punishment: e.punishment,
            reason: e.reason,
            note: e.note,
          },
        })),
      })
      setSuccess(true)
    } catch (err) {
      alert(err.response?.data?.message || 'حدث خطأ أثناء إرسال النتيجة')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-slate-800" dir="rtl">
        <Loader2 className="size-10 animate-spin text-emerald-600 mb-3" />
        <p className="text-sm font-bold">جارٍ التحقق من رابط تسجيل المباراة...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-slate-800" dir="rtl">
        <div className="size-16 rounded-3xl bg-rose-50 border border-rose-200 grid place-items-center mb-4 text-rose-600">
          <AlertTriangle className="size-8" />
        </div>
        <h2 className="text-xl font-black mb-2 text-slate-900">تعذر فتح صفحة التسجيل</h2>
        <p className="text-sm text-slate-600 max-w-sm font-medium leading-relaxed mb-6">
          {error || 'الرابط غير صالح أو انتهت صلاحيته. يرجى التواصل مع منظم البطولة للحصول على رابط جديد.'}
        </p>
      </div>
    )
  }

  // Step 1: Identification
  if (!isIdentified) {
    return (
      <div className="min-h-screen bg-slate-100/70 flex flex-col justify-center p-4 text-slate-800" dir="rtl">
        <div className="max-w-md w-full mx-auto bg-white border border-slate-200/90 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="size-11 rounded-2xl bg-emerald-50 text-emerald-600 grid place-items-center">
              <ShieldCheck className="size-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">تسجيل بيانات مندوب المباراة</h2>
              <p className="text-xs text-slate-500 font-bold">{fixture.tournament_name || 'البطولة'}</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-4 text-center mb-6 border border-slate-200/80">
            <p className="text-xs text-slate-500 font-bold mb-1">المباراة المفوضة</p>
            <p className="text-base font-black text-slate-900">
              {fixture.home_team?.name} <span className="text-emerald-600 font-bold mx-1">ضد</span> {fixture.away_team?.name}
            </p>
          </div>

          <form onSubmit={handleIdentify} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                الاسم الكامل (حكم / مسؤول الملعب / مندوب) *
              </label>
              <div className="relative">
                <User className="size-4 absolute start-3.5 top-3.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={recorderName}
                  onChange={(e) => setRecorderName(e.target.value)}
                  placeholder="مثال: يوسف الإدريسي"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 ps-10 pe-3 text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                رقم الهاتف للتواصل والاعتماد *
              </label>
              <div className="relative">
                <Phone className="size-4 absolute start-3.5 top-3.5 text-slate-400" />
                <input
                  type="tel"
                  required
                  dir="ltr"
                  value={recorderPhone}
                  onChange={(e) => setRecorderPhone(e.target.value)}
                  placeholder="06XXXXXXXX"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 ps-10 pe-3 text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-emerald-500 text-end"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 rounded-xl shadow-md text-sm"
            >
              متابعة لتسجيل النتيجة
              <ArrowRight className="size-4 ms-2 rotate-180" />
            </Button>
          </form>
        </div>
      </div>
    )
  }

  // Step 2: Submission Success
  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center text-slate-800" dir="rtl">
        <div className="size-20 rounded-full bg-emerald-100 border-2 border-emerald-500/40 grid place-items-center mb-5 text-emerald-600 shadow-sm">
          <CheckCircle2 className="size-10" />
        </div>
        <h2 className="text-2xl font-black mb-2 text-slate-900">تم إرسال النتيجة بنجاح!</h2>
        <div className="rounded-3xl bg-white border border-slate-200 p-5 my-4 max-w-sm w-full shadow-lg">
          <div className="text-xs font-bold text-slate-400 mb-2">النتيجة المسجلة:</div>
          <div className="text-3xl font-black text-slate-900">
            {fixture.home_team?.name} <span className="text-emerald-600 mx-2">{displayScore.home} - {displayScore.away}</span> {fixture.away_team?.name}
          </div>
          <div className="mt-4 text-xs text-amber-800 font-bold bg-amber-50 border border-amber-200 rounded-xl p-2.5">
            الحالة: بانتظار اعتماد اللجنة المنظمة
          </div>
        </div>
        <p className="text-xs text-slate-500 max-w-xs font-semibold leading-relaxed mb-6">
          شكراً لتعاونك! تم إشعار مديري الفريقين لمراجعة النتيجة، وسيتم اعتمادها رسمياً من قبل اللجنة.
        </p>
        <Button
          variant="outline"
          className="border-slate-300 text-slate-700 hover:bg-slate-100 rounded-xl px-6"
          onClick={() => setSuccess(false)}
        >
          تعديل البيانات وإعادة الإرسال
        </Button>
      </div>
    )
  }

  const showForm = selectedType != null

  return (
    <div className="min-h-screen bg-slate-100/60 pb-28 text-slate-900 select-none" dir="rtl">
      {/* ─── Standard Committee Header Block (Exact match to Image 2) ─── */}
      <div className="sticky top-0 z-30 bg-white shadow-2xs border-b border-slate-200/80">
        <HeaderBlock
          t={t}
          homeName={homeName}
          awayName={awayName}
          tournament={{ name: fixture.tournament_name || 'البطولة' }}
          fixture={fixture}
          onClose={() => navigate(-1)}
          onDelegatedLink={() => {
            if (navigator?.clipboard) {
              navigator.clipboard.writeText(window.location.href)
              alert('تم نسخ رابط تسجيل المباراة إلى الحافظة')
            }
          }}
        />
      </div>

      {/* ─── Standard Committee Score Actions (Exact match to Image 2) ─── */}
      <ScoreActions
        displayScore={displayScore}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        homeName={homeName}
        awayName={awayName}
        alreadyFinished={curStatus === 'finished'}
        halftime={curStatus === 'halftime'}
        liveMinute={currentLiveMinute}
        timerText={timerText}
        activeHalf={activeHalf}
        matchNotStarted={matchNotStarted}
        onAddEvent={() => {}}
        hideAddButton={true}
        t={t}
      />

      {/* ─── Main Tabs & Content Area ─── */}
      <main className="mx-auto max-w-5xl p-4 sm:p-5 space-y-4">
        {/* Navigation Tabs Bar */}
        <TabBar
          active={activeTab}
          onChange={(id) => {
            if (showForm) cancelForm()
            if (id === 'stats') setFoulNotifCount(0)
            setActiveTab(id)
          }}
          t={t}
          tabs={[
            { id: 'players', icon: '👥', labelKey: 'committee.result.players' },
            { id: 'timeline', icon: '⏱', labelKey: 'committee.result.events' },
            { id: 'stats', icon: '📊', labelKey: 'committee.result.summary', badge: foulNotifCount },
            { id: 'notes', icon: '📝', labelKey: 'committee.result.matchNotes' },
            { id: 'presence', icon: '✅', labelKey: 'committee.presence.tab' },
          ]}
        />

        {/* Form Container (When user is adding/editing an event) */}
        {showForm && (
          <SectionCard
            title={
              selectedType === 'goal'
                ? '⚽ تسجيل هدف'
                : selectedType === 'foul'
                  ? '🚦 مخالفة أو بطاقة'
                  : selectedType === 'second_yellow'
                    ? '🟨🟥 بطاقة صفراء ثانية (طرد)'
                    : selectedType === 'red_card'
                      ? '🟥 بطاقة حمراء مباشرة'
                      : selectedType === 'substitution'
                        ? '🔄 تبديل لاعب'
                        : 'حدث مباراة'
            }
          >
            <EventForm
              type={selectedType}
              form={form}
              setField={setField}
              setForm={setForm}
              onSelectPlayer={(p) => setForm((f) => ({ ...f, player_id: p.id, player: p.name }))}
              onSelectAssist={(p) => setForm((f) => ({ ...f, assist_player_id: p.id, assist: p.name }))}
              homeId={homeId}
              awayId={awayId}
              homeName={homeName}
              awayName={awayName}
              t={t}
              onSubmit={handleSaveEvent}
              validation={validation}
            />
            <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
              <Button size="sm" variant="outline" onClick={cancelForm}>
                إلغاء
              </Button>
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold" onClick={handleSaveEvent}>
                حفظ الحدث
              </Button>
            </div>
          </SectionCard>
        )}

        {/* Tab 1: Players (اللاعبون) — Exactly like Image 2 */}
        {activeTab === 'players' && (
          <div className="space-y-4">
            <PlayersTab
              homeId={homeId}
              homeName={homeName}
              homeTeam={homeTeam}
              awayId={awayId}
              awayName={awayName}
              awayTeam={awayTeam}
              homeRoster={homeRoster}
              awayRoster={awayRoster}
              suspendedByTeam={{}}
              redCardedIds={redCardedIds}
              busyId={null}
              events={events}
              tournament={{ max_players_per_team: 8, name: fixture.tournament_name }}
              fixture={fixture}
              confirmedHome={confirmedHome}
              confirmedAway={confirmedAway}
              onTapPlayer={(player, teamId, variant, bench) => {
                tapPlayer(player, teamId, variant, bench)
              }}
              onActionPick={(player, teamId, type) => {
                if (isPlayerDismissed(player.id)) {
                  alert('اللاعب مطرود بالبطاقة الحمراء ولا يمكن إضافة حدث له!')
                  return
                }
                let finalType = type
                let punishment = type === 'foul' ? 'none' : ''
                if (type === 'yellow_card') {
                  const existingYellows = getPlayerYellows(player.id)
                  if (existingYellows >= 1) {
                    finalType = 'second_yellow'
                    punishment = 'second_yellow'
                  }
                }
                setSelectedType(finalType)
                setEditingKey(null)
                setValidation(null)
                setForm({
                  team_id: teamId,
                  player_id: player?.id,
                  player: player?.name || '',
                  minute: 1,
                  added_time: 0,
                  half: 'first',
                  goalType: 'regular',
                  punishment: punishment,
                  cardColor: finalType,
                })
              }}
              t={t}
            />
          </div>
        )}

        {/* Tab 2: Timeline (أحداث المباراة) */}
        {activeTab === 'timeline' && (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
            <TimelineTab
              homeId={homeId}
              homeName={homeName}
              homeTeam={homeTeam}
              homeScore={displayScore.home}
              awayId={awayId}
              awayName={awayName}
              awayTeam={awayTeam}
              awayScore={displayScore.away}
              homeEvents={homeEvents}
              awayEvents={awayEvents}
              generalEvents={generalEvents}
              eventsEmpty={events.length === 0}
              onAddFirst={() => setPickerOpen(true)}
              onEdit={handleEditEvent}
              onDelete={handleDeleteEvent}
              halfDuration={45}
              t={t}
            />
          </div>
        )}

        {/* Tab 3: Stats & Fouls (ملخص وإحصائيات والمخالفات) */}
        {activeTab === 'stats' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <MiniStat label={t('committee.result.goals', 'الأهداف')} value={counts.goals} />
              <MiniStat label={t('committee.result.yellowCards', 'إنذارات')} value={counts.yellows} tone="amber" />
              <MiniStat label={t('committee.result.redCards', 'طرد')} value={counts.reds} tone="rose" />
              <MiniStat label={t('committee.result.substitutions', 'تبديلات')} value={counts.subs} tone="sky" />
              <MiniStat label={t('committee.result.fouls', 'أخطاء')} value={counts.fouls} tone="violet" />
            </div>

            <FoulPanel
              tournamentId={fixture?.tournament_id}
              fixtureId={fixture?.id}
              homeId={homeId}
              awayId={awayId}
              homeName={homeName}
              awayName={awayName}
              refetchTick={foulRefetchTick}
              token={token}
              readOnly={true}
              t={t}
            />
          </div>
        )}

        {/* Tab 4: Notes (ملاحظات المباراة وركلات الترجيح والأشواط) */}
        {activeTab === 'notes' && (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setExtraTime(!extraTime)}
                className={`p-3 rounded-2xl border text-center transition ${
                  extraTime ? 'bg-amber-50 border-amber-300 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                ⏱ أشواط إضافية {extraTime ? '✓' : ''}
              </button>
              <button
                type="button"
                onClick={() => setPenalties(!penalties)}
                className={`p-3 rounded-2xl border text-center transition ${
                  penalties ? 'bg-purple-50 border-purple-300 text-purple-800' : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}
              >
                🥅 ركلات ترجيح {penalties ? '✓' : ''}
              </button>
            </div>

            {penalties && (
              <div className="bg-purple-50/60 border border-purple-200 rounded-2xl p-3.5 flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-purple-900">ركلات الترجيح:</span>
                <div className="flex items-center gap-2" dir="ltr">
                  <input
                    type="number"
                    min="0"
                    placeholder={homeName}
                    value={homePen}
                    onChange={(e) => setHomePen(e.target.value)}
                    className="w-16 bg-white border border-purple-300 text-center rounded-xl p-2 text-sm font-black text-slate-800"
                  />
                  <span className="text-slate-400 font-bold">-</span>
                  <input
                    type="number"
                    min="0"
                    placeholder={awayName}
                    value={awayPen}
                    onChange={(e) => setAwayPen(e.target.value)}
                    className="w-16 bg-white border border-purple-300 text-center rounded-xl p-2 text-sm font-black text-slate-800"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">ملاحظات وتقرير المندوب</label>
              <textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="أدخل أي ملاحظات حول مجريات اللقاء أو سلوك الفرق أو التحكيم..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-medium text-slate-800 focus:outline-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Tab 4: Presence (تأكيد الحضور) */}
        {activeTab === 'presence' && (
          <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-2xs">
            <PresenceTab
              homeId={homeId}
              homeName={homeName}
              homeTeam={homeTeam}
              awayId={awayId}
              awayName={awayName}
              awayTeam={awayTeam}
              homeRoster={homeRoster}
              awayRoster={awayRoster}
              confirmedHome={confirmedHome}
              confirmedAway={confirmedAway}
              onTogglePlayer={handleTogglePresence}
              t={t}
            />
          </div>
        )}
      </main>

      {/* ─── Match Timer & Bottom Actions Bar ─── */}
      <MatchTimerBottomBar
        curStatus={curStatus}
        isPaused={isPaused}
        timerText={timerText}
        liveMinute={currentLiveMinute}
        activeHalf={activeHalf}
        syncStatus={timelineDirty ? 'saved' : 'idle'}
        isFinished={curStatus === 'finished'}
        secondHalfEnded={curStatus === 'second_half' && currentLiveMinute >= halfDurationMinutes}
        onTogglePause={togglePauseTimer}
        onStartMatch={handleStartMatch}
        onHalftime={handleHalftime}
        onStartSecondHalf={handleStartSecondHalf}
        onFinishSecondHalf={() => setCurStatus('finished')}
        onSubmitResult={handleSubmit}
        scoreText={`${displayScore.home} - ${displayScore.away}`}
        loading={submitting}
        t={t}
      />

      {/* ─── One-Tap Event Recording Bottom Sheet ─── */}
      <OneTapEventSheet
        isOpen={oneTapSheetOpen}
        onClose={() => setOneTapSheetOpen(false)}
        player={oneTapPlayer}
        teamId={oneTapTeamId}
        teamName={oneTapTeamId === homeId ? homeName : awayName}
        teamVariant={oneTapVariant}
        benchPlayers={oneTapBench}
        matchNotStarted={matchNotStarted}
        isPaused={isPaused}
        onRecordEvent={handleOneTapRecord}
        onSubstitute={handleOneTapSubstitute}
        onStartMatch={handleStartMatch}
        onResumeTimer={togglePauseTimer}
        currentMinute={currentLiveMinute}
      />

      {/* Event Type Picker Modal */}
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
    </div>
  )
}
