import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Check,
  Plus,
  RefreshCw,
  Trophy,

} from 'lucide-react'
import api from '../../../api/client'
import { useToast } from '../../../components/ui/Toast'
import { Button, Skeleton } from '../../../components/dashboard/ui'
import SectionCard from '../../../components/ui/SectionCard'
import TimelineColumn from '../../../domains/committee/components/TimelineColumn'
import EventForm from '../../../domains/committee/components/EventForm'
// RefereesCard and ShootoutCard moved to domain components when needed
import ModalShell from '../../../domains/committee/components/ModalShell'
import HeaderBlock from '../../../domains/committee/components/HeaderBlock'
import ScoreActions from '../../../domains/committee/components/ScoreActions'
import SummarySidebar from '../../../domains/committee/components/SummarySidebar'
import FooterActions from '../../../domains/committee/components/FooterActions'
import ConfirmResultModal from '../../../domains/committee/components/ConfirmResultModal'
import { QUICK_ACTIONS, TYPE_OPTIONS, REFEREE_ROLES } from '../../../data/matchConstants'


const uid = () => Math.random().toString(36).slice(2, 10)

function computeScore(events, homeId, awayId) {
  let home = 0
  let away = 0
  for (const e of events) {
    if (e.type === 'goal' || e.type === 'penalty_goal') {
      if (e.team_id === homeId) home += 1
      else if (e.team_id === awayId) away += 1
    } else if (e.type === 'own_goal') {
      if (e.team_id === homeId) away += 1
      else if (e.team_id === awayId) home += 1
    }
  }
  return { home, away }
}

// ScoreNumber helper removed (unused)



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
  const alreadyFinished = fixture.match?.status === 'finished'
  const isKnockout = Boolean(fixture.round?.stage && fixture.round.stage !== 'group')
  const liveMinute = fixture.match?.current_minute ?? 0

  const [status, setStatus] = useState('loading')
  const [events, setEvents] = useState([])
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

  const displayScore = (timelineDirty || events.length > 0) ? computeScore(events, homeId, awayId) : storedScore

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !confirmOpen && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, confirmOpen])

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
          if (m.home_penalties != null) setHomePen(m.home_penalties)
          if (m.away_penalties != null) setAwayPen(m.away_penalties)
          setExtraTime(Boolean(m.extra_time))
          if (m.notes) setNotes(m.notes)
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
    setForm({
      team_id: type === 'other' ? '' : homeId ?? '',
      player_id: null,
      player: '',
      assist_player_id: null,
      assist: '',
      noAssist: true,
      minute: liveMinute > 0 ? liveMinute : 1,
      added_time: 0,
      goalType: 'regular',
      cardColor: type === 'red_card' ? 'red_card' : type === 'second_yellow' ? 'second_yellow' : 'yellow_card',
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
      minute: ev.minute || 1,
      added_time: ev.added_time || 0,
      goalType: ev.goalType || 'regular',
      cardColor: ev.type === 'red_card' ? 'red_card' : ev.type === 'second_yellow' ? 'second_yellow' : 'yellow_card',
      missed: ev.type === 'missed_penalty',
      reason: ev.reason || '',
      note: ev.note || '',
    })
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
      goalType: e.type === 'penalty_goal' ? 'penalty' : e.type === 'own_goal' ? 'ownGoal' : md.goalType || 'regular',
      reason: md.reason || '',
      note: isNote ? md.note || e.description || '' : '',
      description: e.description || '',
    }
  }

  const toApiEvent = (e) => {
    const base = {
      type: e.type,
      team_id: e.team_id || null,
      player_id: e.player_id || null,
      minute: Math.min(Number(e.minute) || 0, 130),
      added_time: Math.min(Number(e.added_time) || 0, 30),
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
          description: e.player || e.description || null,
          metadata: e.reason || e.goalType && e.goalType !== 'regular' ? { reason: e.reason || null, goalType: e.type === 'goal' ? e.goalType || null : null } : null,
        }
    }
  }

  const goalEventType = () => {
    if (form.goalType === 'penalty') return form.missed ? 'missed_penalty' : 'penalty_goal'
    if (form.goalType === 'ownGoal') return 'own_goal'
    return 'goal'
  }

  const persist = async ({ events: evts = events, finish = false, notice }) => {
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
      else payload.status = alreadyFinished ? 'finished' : 'scheduled'

      const r = await api.put(`/committee/tournaments/${tournament.id}/fixtures/${fixture.id}/result`, payload)
      const m = r.data?.data?.match
      if (m) setStoredScore({ home: m.home_score ?? 0, away: m.away_score ?? 0 })

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
    return events.some((e) => (e.type === 'red_card' || e.type === 'second_yellow') && e.player_id === playerId && (Number(e.minute) || 0) <= m)
  }

  useEffect(() => {
    if (!['yellow_card', 'second_yellow', 'red_card'].includes(selectedType)) return
    const pid = form.player_id
    if (!pid || form.cardColor !== 'yellow_card') return
    const alreadyYellow = events.some((e) => e.type === 'yellow_card' && e.player_id === pid)
    if (alreadyYellow) setForm((f) => ({ ...f, cardColor: 'second_yellow' }))
  }, [selectedType, form.player_id, form.cardColor, events, setForm])

  const submitEvent = async () => {
    const type = selectedType
    if (!form.minute || Number(form.minute) <= 0) {
      setValidation('needMinute')
      return
    }
    if (type !== 'other') {
      if (!form.team_id) {
        setValidation('needTeam')
        return
      }
      if (!form.player_id) {
        setValidation('needPlayer')
        return
      }
      const suspendedIds = suspendedByTeam[form.team_id] || []
      if (suspendedIds.includes(form.player_id)) {
        setValidation('playerSuspended')
        return
      }
      if (isPlayerRedCarded(form.player_id, form.minute)) {
        setValidation('playerRedCarded')
        return
      }
    }
    if (type === 'substitution') {
      if (!form.assist_player_id) {
        setValidation('needPlayer')
        return
      }
      if (form.player_id === form.assist_player_id) {
        setValidation('invalidSubPlayers')
        return
      }
      const suspendedIds = suspendedByTeam[form.team_id] || []
      if (suspendedIds.includes(form.assist_player_id)) {
        setValidation('playerSuspended')
        return
      }
      if (isPlayerRedCarded(form.assist_player_id, form.minute)) {
        setValidation('playerRedCarded')
        return
      }
    }
    if (type === 'other' && !form.note?.trim()) {
      setValidation('needNote')
      return
    }

    setValidation(null)
    const eventType = type === 'goal'
      ? goalEventType()
      : type === 'penalty_goal' && form.missed
        ? 'missed_penalty'
        : (type === 'yellow_card' || type === 'second_yellow' || type === 'red_card')
          ? (form.cardColor || type)
          : type

    const ev = {
      _key: editingKey || uid(),
      type: eventType,
      team_id: form.team_id || null,
      player_id: type === 'other' ? null : form.player_id,
      player: type === 'other' ? '' : form.player.trim(),
      assist_player_id: type === 'substitution'
        ? form.assist_player_id
        : (eventType === 'goal' && !form.noAssist) ? form.assist_player_id : null,
      assist_player: type === 'substitution'
        ? form.assist.trim()
        : (eventType === 'goal' && !form.noAssist) ? form.assist.trim() : '',
      minute: Number(form.minute) || 0,
      added_time: Number(form.added_time) || 0,
      goalType: form.goalType || 'regular',
      reason: form.reason?.trim() || '',
      note: form.note?.trim() || '',
    }

    const nextEvents = editingKey
      ? events.map((e) => (e._key === editingKey ? ev : e))
      : [...events, ev].sort((a, b) => a.minute - b.minute || 0)

    setEvents(nextEvents)
    setTimelineDirty(true)
    setSelectedType(null)
    setEditingKey(null)
    retryRef.current = () => persist({ events: nextEvents })
    const ok = await persist({ events: nextEvents })
    if (ok) setSuccessTick(ev._key)
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

  const saveDraft = async () => {
    retryRef.current = () => persist({ notice: t('committee.result.draftSaved') })
    await persist({ notice: t('committee.result.draftSaved') })
  }

  const confirmFinish = async () => {
    retryRef.current = () => persist({ finish: true })
    const ok = await persist({ finish: true })
    if (!ok) setConfirmOpen(false)
  }

  const counts = useMemo(() => {
    let goals = 0
    let yellows = 0
    let reds = 0
    let subs = 0
    let pens = 0
    for (const e of events) {
      if (e.type === 'goal' || e.type === 'penalty_goal' || e.type === 'own_goal') goals += 1
      if (e.type === 'yellow_card') yellows += 1
      if (e.type === 'red_card') reds += 1
      if (e.type === 'second_yellow') { yellows += 1; reds += 1 }
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

  const homeEvents = useMemo(() => events.filter((e) => e.team_id === homeId), [events, homeId])
  const awayEvents = useMemo(() => events.filter((e) => e.team_id === awayId), [events, awayId])
  const generalEvents = useMemo(() => events.filter((e) => e.team_id !== homeId && e.team_id !== awayId), [events, homeId, awayId])

  const scoreFor = (teamId) => {
    if (teamId === homeId) return displayScore.home
    if (teamId === awayId) return displayScore.away
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

  return (
    <ModalShell onClose={onClose}>
      <HeaderBlock t={t} homeName={homeName} awayName={awayName} tournament={tournament} fixture={fixture} onClose={onClose} />

      <ScoreActions displayScore={displayScore} homeTeam={homeTeam} awayTeam={awayTeam} homeName={homeName} awayName={awayName} alreadyFinished={alreadyFinished} liveMinute={liveMinute} openForm={openForm} quickActions={QUICK_ACTIONS} t={t} />

      {/* Body */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_300px_320px] xl:items-start">
          {/* Timeline */}
          <section className="order-1 xl:order-2 min-w-0 space-y-3">
            <SectionCard title={t('committee.result.events')} icon={Trophy}>
              {events.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <span className="grid size-12 place-items-center rounded-2xl bg-slate-50 text-xl">⏱</span>
                  <div>
                    <p className="text-sm font-bold text-slate-700">{t('committee.result.noEvents')}</p>
                    <p className="mt-1 text-xs text-slate-400">{t('committee.result.noEventsDesc')}</p>
                  </div>
                  <Button size="sm" variant="soft" onClick={() => openForm('goal')}>
                    <Plus className="size-4" />
                    {t('committee.result.addFirstEvent')}
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  <TimelineColumn
                    team={{ id: homeId, name: homeName, team: homeTeam, score: scoreFor(homeId) }}
                    events={homeEvents}
                    freshKey={successTick}
                    onEdit={startEdit}
                    onDelete={deleteEvent}
                    t={t}
                  />
                  <TimelineColumn
                    team={{ id: awayId, name: awayName, team: awayTeam, score: scoreFor(awayId) }}
                    events={awayEvents}
                    freshKey={successTick}
                    onEdit={startEdit}
                    onDelete={deleteEvent}
                    t={t}
                  />
                  {generalEvents.length > 0 && (
                    <div className="lg:col-span-2">
                      <TimelineColumn
                        team={null}
                        events={generalEvents}
                        freshKey={successTick}
                        onEdit={startEdit}
                        onDelete={deleteEvent}
                        t={t}
                      />
                    </div>
                  )}
                </div>
              )}
            </SectionCard>
          </section>

          {/* Add event */}
          <section className="order-2 xl:order-3 min-w-0">
            <SectionCard
              title={showForm ? (editingKey ? t('committee.result.editEventTitle') : t('committee.result.addEvent')) : t('committee.result.addEvent')}
              icon={Plus}
              action={showForm && (
                <button type="button" onClick={cancelForm} className="text-[11px] font-bold text-slate-400 transition-colors hover:text-slate-600">
                  {t('committee.result.changeType')}
                </button>
              )}
            >
              {showForm ? (
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
                />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => openForm(opt.type)}
                      className="flex flex-col items-center gap-2 rounded-xl border border-slate-200/80 bg-slate-50/60 px-2 py-4 text-center text-xs font-bold text-slate-700 transition-all hover:border-green-300 hover:bg-green-50 hover:text-green-700 active:scale-[0.97]"
                    >
                      <span className="text-xl leading-none">{opt.icon}</span>
                      {t(opt.labelKey)}
                    </button>
                  ))}
                </div>
              )}
            </SectionCard>
          </section>

          <SummarySidebar
            displayScore={displayScore}
            homeTeam={homeTeam}
            awayTeam={awayTeam}
            counts={counts}
            mvp={mvp}
            potmOptions={potmOptions}
            mvpId={mvpId}
            setMvpId={setMvpId}
            setMvp={setMvp}
            mvpRating={mvpRating}
            setMvpRating={setMvpRating}
            notes={notes}
            setNotes={setNotes}
            isKnockout={isKnockout}
            homeName={homeName}
            awayName={awayName}
            homePen={homePen}
            awayPen={awayPen}
            setHomePen={setHomePen}
            setAwayPen={setAwayPen}
            refereesProps={{ referees, assigned, setAssigned, newRefName, setNewRefName, newRefPhone, setNewRefPhone, addingReferee, addReferee }}
            t={t}
          />
        </div>
      </div>

      <FooterActions saveError={saveError} retryRef={retryRef} saving={saving} saveDraft={saveDraft} setConfirmOpen={setConfirmOpen} onClose={onClose} t={t} />

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
          t={t}
        />
      )}
    </ModalShell>
  )
}

// ModalShell, TeamScore, MiniStat moved to domain components

