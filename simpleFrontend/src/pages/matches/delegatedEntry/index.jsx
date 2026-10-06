import React, { useEffect, useMemo, useState } from 'react'
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

    // B. Player substituted OUT at or before minute M? -> Off the field
    const subbedOut = events.find((e) => {
      if (ignoreKey && (e._key || e.id) === ignoreKey) return false
      return e.type === 'substitution' &&
        Number(e.team_id) === tid &&
        Number(e.player_id) === pid &&
        (Number(e.minute) || 0) <= m
    })
    if (subbedOut) return false

    // C. Player substituted IN at or before minute M? -> On the field
    const subbedIn = events.find((e) => {
      if (ignoreKey && (e._key || e.id) === ignoreKey) return false
      return e.type === 'substitution' &&
        Number(e.team_id) === tid &&
        Number(e.assist_player_id) === pid &&
        (Number(e.minute) || 0) <= m
    })
    if (subbedIn) return true

    // D. Is player in starting lineup (starters)?
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
    cancelForm()
  }

  const handleDeleteEvent = (ev) => {
    setEvents((prev) => prev.filter((e) => (e._key || e.id) !== (ev._key || ev.id)))
    setTimelineDirty(true)
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
        alreadyFinished={false}
        halftime={false}
        liveMinute={0}
        timerText={null}
        activeHalf={null}
        matchNotStarted={events.length === 0}
        onAddEvent={() => {
          if (showForm) cancelForm()
          else setPickerOpen(true)
        }}
        t={t}
      />

      {/* ─── Main Tabs & Content Area ─── */}
      <main className="mx-auto max-w-5xl p-4 sm:p-5 space-y-4">
        {/* Navigation Tabs Bar */}
        <TabBar
          active={activeTab}
          onChange={(id) => {
            if (showForm) cancelForm()
            setActiveTab(id)
          }}
          t={t}
          tabs={[
            { id: 'players', icon: '👥', labelKey: 'committee.result.players' },
            { id: 'timeline', icon: '⏱', labelKey: 'committee.result.events' },
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
              onTapPlayer={(player, teamId) => {
                if (isPlayerDismissed(player.id)) {
                  alert('اللاعب مطرود بالبطاقة الحمراء ولا يمكن إضافة حدث له!')
                  return
                }
                setQuickPlayer({ player, teamId })
                setPickerOpen(true)
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

        {/* Tab 3: Notes (ملاحظات المباراة وركلات الترجيح والأشواط) */}
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

      {/* ─── Floating Bottom Sticky Bar with Action Button (Exact layout from Image 2) ─── */}
      <footer className="fixed bottom-0 inset-x-0 z-40 border-t border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur shadow-lg">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Button
            className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-md justify-center gap-2"
            loading={submitting}
            onClick={handleSubmit}
          >
            <Send className="size-4" />
            <span>إرسال النتيجة للاعتماد ({displayScore.home} - {displayScore.away})</span>
          </Button>
        </div>
      </footer>

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
