import React, { useState, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle2,
  XCircle,
  Swords,
  Plus,
  Trash2,
  Shield,
  Clock,
} from 'lucide-react'
import api from '../../../api/client'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import { Button, Modal, inputClass, selectClass } from '../../../components/dashboard/ui'

const EVENT_TYPES = [
  { key: 'goal', label: 'هدف', icon: '⚽' },
  { key: 'penalty_goal', label: 'ركلة جزاء', icon: '🥅' },
  { key: 'own_goal', label: 'هدف عكسي', icon: '⚽❌' },
  { key: 'yellow_card', label: 'بطاقة صفراء', icon: '🟨' },
  { key: 'red_card', label: 'بطاقة حمراء', icon: '🟥' },
  { key: 'substitution', label: 'تبديل', icon: '🔄' },
]

export default function ScoreModal({ match, onClose, onSaved, mode = 'submit' }) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const hostTeamId = Number(match.host_team_id || match.host_team?.id)
  const oppTeamId = Number(match.opponent_team_id || match.opponent_team?.id)
  const hostTeamName = match.host_team?.name || 'الفريق المضيف'
  const oppTeamName = match.opponent_team?.name || 'الفريق الضيف'

  const [hostPlayers, setHostPlayers] = useState([])
  const [oppPlayers, setOppPlayers] = useState([])
  const [loadingRoster, setLoadingRoster] = useState(true)

  // Events list
  const [events, setEvents] = useState([])

  // Manual score overrides
  const [hostScore, setHostScore] = useState(match.host_score != null ? String(match.host_score) : '0')
  const [oppScore, setOppScore] = useState(match.opponent_score != null ? String(match.opponent_score) : '0')
  const [scoreOverridden, setScoreOverridden] = useState(match.host_score != null)

  // Current new event draft state
  const [eventType, setEventType] = useState('goal')
  const [eventTeamId, setEventTeamId] = useState(hostTeamId)
  const [playerId, setPlayerId] = useState('')
  const [assistPlayerId, setAssistPlayerId] = useState('')
  const [subInPlayerId, setSubInPlayerId] = useState('')
  const [minute, setMinute] = useState('')
  const [description, setDescription] = useState('')

  const [busy, setBusy] = useState(false)

  // Fetch match players and any already existing events
  useEffect(() => {
    let mounted = true
    setLoadingRoster(true)
    api
      .get(`/manager/match-requests/${match.id}/players`)
      .then((res) => {
        if (!mounted) return
        setHostPlayers(res.data.host_players || [])
        setOppPlayers(res.data.opponent_players || [])

        const fetchedEvents = res.data.events || []
        if (fetchedEvents.length > 0) {
          const mapped = fetchedEvents.map((ev, idx) => ({
            id: ev.id || `existing-${idx}`,
            type: ev.type?.value || ev.type || 'goal',
            team_id: Number(ev.team_id),
            player_id: ev.player_id ? Number(ev.player_id) : null,
            player_name: ev.player?.name || '',
            assist_player_id: ev.assist_player_id ? Number(ev.assist_player_id) : null,
            assist_player_name: ev.assist_player?.name || '',
            minute: Number(ev.minute || 1),
            description: ev.description || '',
          }))
          setEvents(mapped)
        }
      })
      .catch((e) => {
        console.error('Failed to load roster:', e)
      })
      .finally(() => {
        if (mounted) setLoadingRoster(false)
      })

    return () => {
      mounted = false
    }
  }, [match.id])

  // Recalculate score from events automatically when not manually overridden
  useEffect(() => {
    if (scoreOverridden) return
    let h = 0
    let o = 0
    events.forEach((ev) => {
      const isHost = Number(ev.team_id) === hostTeamId
      if (ev.type === 'goal' || ev.type === 'penalty_goal') {
        if (isHost) h++
        else o++
      } else if (ev.type === 'own_goal') {
        if (isHost) o++
        else h++
      }
    })
    setHostScore(String(h))
    setOppScore(String(o))
  }, [events, scoreOverridden, hostTeamId])

  // Players of currently selected team for event entry
  const currentTeamPlayers = useMemo(() => {
    return Number(eventTeamId) === hostTeamId ? hostPlayers : oppPlayers
  }, [eventTeamId, hostTeamId, hostPlayers, oppPlayers])

  const addEvent = () => {
    const minVal = minute ? Math.max(1, Math.min(130, Number(minute))) : 1

    let pName = ''
    let aName = ''

    if (playerId) {
      const p = currentTeamPlayers.find((item) => Number(item.id) === Number(playerId))
      pName = p?.name || ''
    }

    if (eventType === 'goal' && assistPlayerId) {
      const a = currentTeamPlayers.find((item) => Number(item.id) === Number(assistPlayerId))
      aName = a?.name || ''
    } else if (eventType === 'substitution' && subInPlayerId) {
      const a = currentTeamPlayers.find((item) => Number(item.id) === Number(subInPlayerId))
      aName = a?.name || ''
    }

    const newEv = {
      id: `local-${Date.now()}-${Math.random()}`,
      type: eventType,
      team_id: Number(eventTeamId),
      player_id: playerId ? Number(playerId) : null,
      player_name: pName,
      assist_player_id:
        eventType === 'goal'
          ? assistPlayerId
            ? Number(assistPlayerId)
            : null
          : eventType === 'substitution'
            ? subInPlayerId
              ? Number(subInPlayerId)
              : null
            : null,
      assist_player_name: aName,
      minute: minVal,
      description: description.trim() || null,
    }

    setEvents((prev) => [...prev, newEv].sort((a, b) => a.minute - b.minute))

    // Reset draft inputs
    setPlayerId('')
    setAssistPlayerId('')
    setSubInPlayerId('')
    setDescription('')
  }

  const removeEvent = (id) => {
    setEvents((prev) => prev.filter((ev) => ev.id !== id))
  }

  const submit = async () => {
    setBusy(true)
    try {
      const payloadEvents = events.map((ev) => ({
        type: ev.type,
        team_id: ev.team_id,
        player_id: ev.player_id,
        assist_player_id: ev.assist_player_id,
        minute: ev.minute,
        description: ev.description,
      }))

      await api.post(`/manager/matches/${match.id}/submit-score`, {
        host_score: Number(hostScore),
        opponent_score: Number(oppScore),
        events: payloadEvents,
      })

      toast.success('تم تسجيل النتيجة والأحداث بنجاح، بانتظار تأكيد الفريق المنافس')
      onSaved?.()
      onClose()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  const confirm = async (action) => {
    setBusy(true)
    try {
      await api.post(`/manager/matches/${match.id}/${action}-score`)
      toast.success(action === 'confirm' ? 'تم تأكيد النتيجة وتحديث الترتيب' : 'تم الاعتراض على النتيجة')
      onSaved?.()
      onClose()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  // Events summary for confirmation review mode
  const reviewGoals = useMemo(
    () => events.filter((e) => e.type === 'goal' || e.type === 'penalty_goal' || e.type === 'own_goal'),
    [events],
  )
  const reviewCards = useMemo(
    () => events.filter((e) => e.type === 'yellow_card' || e.type === 'red_card' || e.type === 'second_yellow'),
    [events],
  )
  const reviewSubs = useMemo(() => events.filter((e) => e.type === 'substitution'), [events])

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={mode === 'submit' ? 'تسجيل نتيجة وأحداث المباراة' : 'مراجعة نتيجة المباراة'}
      subtitle={`${hostTeamName} ضد ${oppTeamName}`}
    >
      {mode === 'submit' ? (
        <div className="space-y-6">
          {/* Score Header Card */}
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-500/10 via-slate-50 to-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-black text-slate-700">النتيجة النهائية للمباراة</span>
              {scoreOverridden ? (
                <button
                  type="button"
                  onClick={() => setScoreOverridden(false)}
                  className="text-[11px] font-bold text-emerald-600 underline hover:text-emerald-700"
                >
                  حساب تلقائي من الأهداف
                </button>
              ) : (
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-black text-emerald-700">
                  حساب تلقائي مفعل
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 items-center gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
                <label className="mb-1 block truncate text-xs font-bold text-slate-700">{hostTeamName}</label>
                <input
                  type="number"
                  min="0"
                  className={`${inputClass} text-center text-2xl font-black text-slate-900`}
                  value={hostScore}
                  onChange={(e) => {
                    setScoreOverridden(true)
                    setHostScore(e.target.value)
                  }}
                />
                <span className="mt-1 block text-[10px] text-slate-400">المستضيف</span>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-3 text-center shadow-sm">
                <label className="mb-1 block truncate text-xs font-bold text-slate-700">{oppTeamName}</label>
                <input
                  type="number"
                  min="0"
                  className={`${inputClass} text-center text-2xl font-black text-slate-900`}
                  value={oppScore}
                  onChange={(e) => {
                    setScoreOverridden(true)
                    setOppScore(e.target.value)
                  }}
                />
                <span className="mt-1 block text-[10px] text-slate-400">الضيف</span>
              </div>
            </div>
          </div>

          {/* Event Builder Section */}
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-800">نظام أحداث المباراة (أهداف، بطاقات، تبديلات)</span>
              <span className="text-[11px] font-semibold text-slate-500">
                {events.length} {events.length === 1 ? 'حدث مسجل' : 'أحداث مسجلة'}
              </span>
            </div>

            {/* Event Type Tabs */}
            <div className="flex flex-wrap gap-1.5">
              {EVENT_TYPES.map((tItem) => {
                const active = eventType === tItem.key
                return (
                  <button
                    key={tItem.key}
                    type="button"
                    onClick={() => {
                      setEventType(tItem.key)
                      setPlayerId('')
                      setAssistPlayerId('')
                      setSubInPlayerId('')
                    }}
                    className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                      active
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    <span>{tItem.icon}</span>
                    <span>{tItem.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Team Picker */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setEventTeamId(hostTeamId)
                  setPlayerId('')
                  setAssistPlayerId('')
                  setSubInPlayerId('')
                }}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                  Number(eventTeamId) === hostTeamId
                    ? 'border-emerald-500 bg-white text-emerald-700 shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Shield className="size-3.5 shrink-0" />
                <span className="truncate">{hostTeamName}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEventTeamId(oppTeamId)
                  setPlayerId('')
                  setAssistPlayerId('')
                  setSubInPlayerId('')
                }}
                className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                  Number(eventTeamId) === oppTeamId
                    ? 'border-emerald-500 bg-white text-emerald-700 shadow-sm ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Shield className="size-3.5 shrink-0" />
                <span className="truncate">{oppTeamName}</span>
              </button>
            </div>

            {/* Event Form Inputs */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Primary Player */}
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-700">
                  {eventType === 'substitution'
                    ? 'اللاعب الخارج'
                    : eventType === 'goal' || eventType === 'penalty_goal'
                      ? 'اللاعب المسجل'
                      : 'اللاعب المعني'}
                </label>
                <select
                  className={selectClass}
                  value={playerId}
                  onChange={(e) => setPlayerId(e.target.value)}
                  disabled={loadingRoster && currentTeamPlayers.length === 0}
                >
                  <option value="">
                    {loadingRoster ? 'جارٍ تحميل اللاعبين…' : '-- اختر اللاعب (اختياري) --'}
                  </option>
                  {currentTeamPlayers.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.number ? `#${p.number} ` : ''}
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Minute */}
              <div>
                <label className="mb-1 block text-[11px] font-bold text-slate-700">الدقيقة</label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max="130"
                    placeholder="مثال: 45"
                    className={`${inputClass} ps-9`}
                    value={minute}
                    onChange={(e) => setMinute(e.target.value)}
                  />
                  <Clock className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                </div>
              </div>

              {/* Assist Player (Goal only) */}
              {eventType === 'goal' && (
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">صانع الهدف (الأسيست)</label>
                  <select
                    className={selectClass}
                    value={assistPlayerId}
                    onChange={(e) => setAssistPlayerId(e.target.value)}
                  >
                    <option value="">بدون صناعة / مجهود فردي</option>
                    {currentTeamPlayers
                      .filter((p) => String(p.id) !== String(playerId))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.number ? `#${p.number} ` : ''}
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Player In (Substitution only) */}
              {eventType === 'substitution' && (
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">اللاعب البديل (الداخل)</label>
                  <select
                    className={selectClass}
                    value={subInPlayerId}
                    onChange={(e) => setSubInPlayerId(e.target.value)}
                  >
                    <option value="">-- اختر اللاعب الداخل --</option>
                    {currentTeamPlayers
                      .filter((p) => String(p.id) !== String(playerId))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.number ? `#${p.number} ` : ''}
                          {p.name}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Notes / Reason */}
              {(eventType === 'yellow_card' || eventType === 'red_card' || eventType === 'own_goal') && (
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-700">ملاحظات / سبب البطاقة</label>
                  <input
                    type="text"
                    placeholder="مثال: تدخل عنيف، لمسة يد…"
                    className={inputClass}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              )}
            </div>

            <Button size="sm" variant="soft" onClick={addEvent} className="w-full">
              <Plus className="size-4" />
              إضافة الحدث إلى شريط المباراة
            </Button>
          </div>

          {/* Timeline of Recorded Events */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700">شريط أحداث المباراة المسجلة</span>
            {events.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 py-6 text-center text-xs font-semibold text-slate-400">
                لم تتم إضافة أي أحداث بعد. اختر نوع الحدث وأضفه أعلاه، أو سجّل النتيجة مباشرة.
              </div>
            ) : (
              <div className="max-h-56 space-y-1.5 overflow-y-auto pe-1">
                {events.map((ev) => {
                  const isHost = Number(ev.team_id) === hostTeamId
                  const typeObj = EVENT_TYPES.find((tItem) => tItem.key === ev.type)
                  return (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between rounded-xl border border-slate-100 bg-white p-2.5 shadow-sm transition-all hover:border-slate-200"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex size-7 items-center justify-center rounded-lg bg-slate-100 text-xs font-black text-slate-700">
                          {ev.minute}&apos;
                        </span>
                        <span className="text-base">{typeObj?.icon || '⚽'}</span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-900">
                              {ev.player_name || 'لاعب'}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                isHost ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                              }`}
                            >
                              {isHost ? hostTeamName : oppTeamName}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400">
                              ({typeObj?.label || ev.type})
                            </span>
                          </div>

                          {ev.type === 'goal' && ev.assist_player_name && (
                            <p className="text-[10px] text-emerald-600">
                              صناعة: {ev.assist_player_name}
                            </p>
                          )}

                          {ev.type === 'substitution' && ev.assist_player_name && (
                            <p className="text-[10px] text-sky-600">
                              دخول: {ev.assist_player_name}
                            </p>
                          )}

                          {ev.description && (
                            <p className="text-[10px] text-slate-400">{ev.description}</p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeEvent(ev.id)}
                        className="grid size-7 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        title="حذف الحدث"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <Button className="w-full" disabled={busy} onClick={submit}>
            {busy ? 'جارٍ تسجيل النتيجة…' : 'إرسال النتيجة والأحداث'}
          </Button>
        </div>
      ) : (
        /* Confirmation Mode */
        <div className="space-y-5">
          {/* Big Score Header */}
          <div className="flex items-center justify-center gap-6 rounded-2xl bg-slate-900 py-6 text-white shadow-inner">
            <div className="text-center">
              <p className="max-w-[110px] truncate text-xs font-bold text-slate-300">{hostTeamName}</p>
              <span className="text-4xl font-black">{match.host_score ?? '–'}</span>
            </div>
            <span className="grid size-10 place-items-center rounded-full bg-white/10 text-slate-300">
              <Swords className="size-5" />
            </span>
            <div className="text-center">
              <p className="max-w-[110px] truncate text-xs font-bold text-slate-300">{oppTeamName}</p>
              <span className="text-4xl font-black">{match.opponent_score ?? '–'}</span>
            </div>
          </div>

          {/* Events Review Cards */}
          {events.length > 0 ? (
            <div className="max-h-64 space-y-3 overflow-y-auto pe-1">
              {reviewGoals.length > 0 && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-3">
                  <p className="mb-2 text-xs font-black text-emerald-800">⚽ الأهداف المسجلة</p>
                  <div className="space-y-1.5">
                    {reviewGoals.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5 text-xs font-semibold shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-700">{ev.minute}&apos;</span>
                          <span className="font-black text-slate-800">{ev.player_name || 'لاعب'}</span>
                          {ev.assist_player_name && (
                            <span className="text-[10px] text-slate-500">
                              (صناعة: {ev.assist_player_name})
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">
                          {Number(ev.team_id) === hostTeamId ? hostTeamName : oppTeamName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {reviewCards.length > 0 && (
                <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3">
                  <p className="mb-2 text-xs font-black text-amber-800">🟨 البطاقات</p>
                  <div className="space-y-1.5">
                    {reviewCards.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5 text-xs font-semibold shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span>{ev.type === 'red_card' ? '🟥' : '🟨'}</span>
                          <span className="font-bold text-slate-700">{ev.minute}&apos;</span>
                          <span className="font-black text-slate-800">{ev.player_name || 'لاعب'}</span>
                          {ev.description && (
                            <span className="text-[10px] text-slate-500">({ev.description})</span>
                          )}
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">
                          {Number(ev.team_id) === hostTeamId ? hostTeamName : oppTeamName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {reviewSubs.length > 0 && (
                <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3">
                  <p className="mb-2 text-xs font-black text-sky-800">🔄 التبديلات</p>
                  <div className="space-y-1.5">
                    {reviewSubs.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-center justify-between rounded-lg bg-white px-3 py-1.5 text-xs font-semibold shadow-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sky-700">{ev.minute}&apos;</span>
                          <span className="text-rose-600">خروج: {ev.player_name || '—'}</span>
                          <span className="text-emerald-600">
                            / دخول: {ev.assist_player_name || '—'}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">
                          {Number(ev.team_id) === hostTeamId ? hostTeamName : oppTeamName}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-xs font-semibold text-slate-400">
              سجل النتيجة الفريق المنافس — يرجى التأكد من صحتها قبل التأكيد.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 pt-2">
            <Button variant="danger" disabled={busy} onClick={() => confirm('dispute')}>
              <XCircle className="size-4" />
              اعتراض على النتيجة
            </Button>
            <Button disabled={busy} onClick={() => confirm('confirm')}>
              <CheckCircle2 className="size-4" />
              تأكيد النتيجة وتحديث الترتيب
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

