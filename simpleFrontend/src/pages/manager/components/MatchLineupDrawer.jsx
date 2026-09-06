import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { ChevronDown, Flag, Plus, Save, Shield, Star, Target, Trash2, UserMinus, UserPlus, Zap } from 'lucide-react'
import Drawer from '../../../components/dashboard/Drawer'
import { Button, Modal } from '../../../components/dashboard/ui'
import {
  q,
  invalidateKeys,
  useFormationPresets,
  useMatchLineup,
  useMatchLineupRoster,
  useTeamFormations,
} from '../../../api/queries'
import api from '../../../api/client'
import { toastApiError } from '../../../lib/errors'
import { positionLabels } from './shared'
import FootballPitch from '../formation/FootballPitch'
import { clamp01, defaultTacticalKey, firstFreeSlot, maxStartersFor, round3 } from '../formation/pitchUtils'

const ROLE_KEYS = [
  { key: 'captain', idKey: 'captainId', label: 'captain', Icon: Shield, onClass: 'bg-amber-500 text-white ring-amber-200' },
  { key: 'viceCaptain', idKey: 'viceCaptainId', label: 'viceCaptain', Icon: Star, onClass: 'bg-sky-600 text-white ring-sky-200' },
  { key: 'freeKick', idKey: 'freeKickId', label: 'freeKickTaker', Icon: Zap, onClass: 'bg-violet-600 text-white ring-violet-200' },
  { key: 'penalty', idKey: 'penaltyId', label: 'penaltyTaker', Icon: Target, onClass: 'bg-rose-600 text-white ring-rose-200' },
  { key: 'corner', idKey: 'cornerId', label: 'cornerTaker', Icon: Flag, onClass: 'bg-sky-500 text-white ring-sky-200' },
]

const noStyleEntry = (p) => ({ id: p.id, name: p.name, position: p.position, shirt_number: p.shirt_number, tactical_position: null, x: 0, y: 0 })

export default function MatchLineupDrawer({ matchRequestId, open, onClose }) {
  const { t } = useTranslation()
  const { data: lineupData, isLoading } = useMatchLineup(matchRequestId, { enabled: open && !!matchRequestId })
  const { data: rosterData } = useMatchLineupRoster(matchRequestId, { enabled: open && !!matchRequestId })
  const formationsQuery = useTeamFormations({ enabled: open && !!matchRequestId })
  const presetsQuery = useFormationPresets({ enabled: open && !!matchRequestId })

  const [starters, setStarters] = useState([])
  const [bench, setBench] = useState([])
  const [captainId, setCaptainId] = useState(null)
  const [viceCaptainId, setViceCaptainId] = useState(null)
  const [freeKickId, setFreeKickId] = useState(null)
  const [penaltyId, setPenaltyId] = useState(null)
  const [cornerId, setCornerId] = useState(null)
  const [formationSnap, setFormationSnap] = useState(null) // {format, preset_key, formation}
  const [formationSourceId, setFormationSourceId] = useState(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [selectedId, setSelectedId] = useState(null)
  const [drag, setDrag] = useState(null)
  const [confirm, setConfirm] = useState(null)

  const format = lineupData?.match_request?.player_format || '7v7'
  const required = lineupData?.required_starters || maxStartersFor(format)
  const roster = rosterData?.roster || []
  const formations = formationsQuery.data?.data || []
  const presetGroups = presetsQuery.data?.data || {}
  const activePreset = formationSnap?.preset_key
    ? (presetGroups[format] || []).find((preset) => preset.key === formationSnap.preset_key)
    : null

  const startersRef = useRef(starters)
  startersRef.current = starters
  const benchRef = useRef(bench)
  benchRef.current = bench
  const roleRef = useRef({ captainId, viceCaptainId, freeKickId, penaltyId, cornerId })
  roleRef.current = { captainId, viceCaptainId, freeKickId, penaltyId, cornerId }
  const dragRef = useRef(null)
  const dragMovedRef = useRef(false)
  const pitchRef = useRef(null)
  const benchDropRef = useRef(null)

  // Resolve "my" team lineup — the host manager edits the host team's lineup.
  const myLineup = useMemo(() => {
    const lineups = lineupData?.lineups || []
    if (!lineups.length) return null
    const mr = lineupData?.match_request
    return (
      lineups.find((l) => l.team_id === mr?.host_team_id) ||
      lineups.find((l) => l.team_id === mr?.opponent_team_id) ||
      lineups[0]
    )
  }, [lineupData])

  useEffect(() => {
    if (!myLineup) {
      setStarters([])
      setBench([])
      setCaptainId(null)
      setViceCaptainId(null)
      setFreeKickId(null)
      setPenaltyId(null)
      setCornerId(null)
      setFormationSnap(null)
      setFormationSourceId(null)
      setHasChanges(false)
      setSelectedId(null)
      return
    }

    setStarters(
      (myLineup.starters || []).map((s) => ({
        id: s.id,
        name: s.name,
        position: s.position,
        shirt_number: s.shirt_number,
        tactical_position: s.tactical_position || defaultTacticalKey(s.position),
        x: Number(s.x ?? 0.5),
        y: Number(s.y ?? 0.5),
      })),
    )
    setBench((myLineup.bench || []).map((s) => ({ id: s.id, name: s.name, position: s.position, shirt_number: s.shirt_number, tactical_position: null, x: 0, y: 0 })))
    setCaptainId(myLineup.captain_id || null)
    setViceCaptainId(myLineup.vice_captain_id || null)
    setFreeKickId(myLineup.free_kick_taker_id || null)
    setPenaltyId(myLineup.penalty_taker_id || null)
    setCornerId(myLineup.corner_taker_id || null)
    setFormationSnap(myLineup.formation || null)
    setFormationSourceId(null)
    setHasChanges(false)
    setSelectedId(null)
  }, [myLineup])

  const markChanged = useCallback(() => setHasChanges(true), [])

  const clearRolesFor = useCallback((ids) => {
    const r = roleRef.current
    const idsSet = new Set(ids)
    if (idsSet.has(r.captainId)) setCaptainId(null)
    if (idsSet.has(r.viceCaptainId)) setViceCaptainId(null)
    if (idsSet.has(r.freeKickId)) setFreeKickId(null)
    if (idsSet.has(r.penaltyId)) setPenaltyId(null)
    if (idsSet.has(r.cornerId)) setCornerId(null)
  }, [])

  const toggleRole = useCallback((playerId, idKey) => {
    markChanged()
    const setters = {
      captainId: setCaptainId,
      viceCaptainId: setViceCaptainId,
      freeKickId: setFreeKickId,
      penaltyId: setPenaltyId,
      cornerId: setCornerId,
    }
    setters[idKey]((prev) => (prev === playerId ? null : playerId))
  }, [markChanged])

  // ── Formation snapshot picker (loads a saved team formation as the base) ──

  const applyFormation = useCallback((formation) => {
    if (!formation) return
    const fStarters = (formation.players || [])
      .filter((p) => p.is_starter)
      .map((p) => ({
        id: p.player_id,
        name: p.name,
        position: p.position,
        shirt_number: p.number,
        tactical_position: p.tactical_position || defaultTacticalKey(p.position),
        x: Number(p.x ?? 0.5),
        y: Number(p.y ?? 0.5),
      }))
    const extras = fStarters.slice(required).map(noStyleEntry)
    const nextStarters = fStarters.slice(0, required)
    const nextBench = [
      ...(formation.players || [])
        .filter((p) => !p.is_starter)
        .map((p) => ({ id: p.player_id, name: p.name, position: p.position, shirt_number: p.number, tactical_position: null, x: 0, y: 0 })),
      ...extras,
    ]
    const starterIds = new Set(nextStarters.map((s) => s.id))

    const apply = () => {
      setStarters(nextStarters)
      setBench(nextBench)
      setCaptainId(starterIds.has(formation.captain_id) ? formation.captain_id : null)
      setViceCaptainId(starterIds.has(formation.vice_captain_id) ? formation.vice_captain_id : null)
      setFreeKickId(starterIds.has(formation.free_kick_taker_id) ? formation.free_kick_taker_id : null)
      setPenaltyId(starterIds.has(formation.penalty_taker_id) ? formation.penalty_taker_id : null)
      setCornerId(starterIds.has(formation.corner_taker_id) ? formation.corner_taker_id : null)
      setFormationSnap({ format: formation.format, preset_key: formation.preset_key, formation: formation.name || null })
      setFormationSourceId(String(formation.id))
      setSelectedId(null)
      markChanged()
    }

    if (startersRef.current.length > 0 || benchRef.current.length > 0) {
      setConfirm({
        title: t('formation.confirm.title'),
        body: t('formation.confirm.body'),
        confirmLabel: t('formation.confirm.discard'),
        onConfirm: () => {
          setConfirm(null)
          apply()
        },
      })
    } else {
      apply()
    }
  }, [markChanged, required, t])

  // ── Local lineup mutations ────────────────────────────────────────────

  const addPlayer = useCallback(
    (player) => {
      const entry = {
        id: player.id,
        name: player.name,
        position: player.position,
        shirt_number: player.number,
        tactical_position: null,
        x: 0,
        y: 0,
      }
      if (startersRef.current.length < required) {
        const slot = activePreset ? firstFreeSlot(activePreset.slots, startersRef.current, player.position) : null
        setStarters((prev) => [
          ...prev,
          {
            ...entry,
            tactical_position: slot?.tactical_position || defaultTacticalKey(player.position),
            x: slot?.x !== undefined ? round3(slot.x) : 0.5,
            y: slot?.y !== undefined ? round3(slot.y) : 0.5,
          },
        ])
      } else {
        setBench((prev) => [...prev, noStyleEntry(entry)])
      }
      markChanged()
    },
    [activePreset, markChanged, required],
  )

  const removePlayer = useCallback(
    (playerId) => {
      setStarters((prev) => prev.filter((p) => p.id !== playerId))
      setBench((prev) => prev.filter((p) => p.id !== playerId))
      clearRolesFor([playerId])
      if (selectedId === playerId) setSelectedId(null)
      markChanged()
    },
    [clearRolesFor, markChanged, selectedId],
  )

  const promoteToStarter = useCallback((playerId) => {
    if (startersRef.current.length >= required) return
    const player = benchRef.current.find((p) => p.id === playerId)
    if (!player) return
    const slot = activePreset ? firstFreeSlot(activePreset.slots, startersRef.current, player.position) : null
    setBench((prev) => prev.filter((p) => p.id !== playerId))
    setStarters((prev) => [
      ...prev,
      {
        ...player,
        tactical_position: slot?.tactical_position || defaultTacticalKey(player.position),
        x: slot?.x !== undefined ? round3(slot.x) : 0.5 + 0.08 * (prev.length % 5),
        y: slot?.y !== undefined ? round3(slot.y) : 0.5,
      },
    ])
    markChanged()
  }, [activePreset, markChanged, required])

  const moveToBench = useCallback((playerId) => {
    const player = startersRef.current.find((p) => p.id === playerId)
    if (!player) return
    setStarters((prev) => prev.filter((p) => p.id !== playerId))
    setBench((prev) => [...prev.filter((b) => b.id !== playerId), noStyleEntry(player)])
    clearRolesFor([playerId])
    if (selectedId === playerId) setSelectedId(null)
    markChanged()
  }, [clearRolesFor, markChanged, selectedId])

  // ── Drag & drop (pitch ↔ bench) ──────────────────────────────────────

  const hitTest = useCallback((clientX, clientY) => {
    const pitchRect = pitchRef.current?.getBoundingClientRect()
    const benchRect = benchDropRef.current?.getBoundingClientRect()
    if (pitchRect) {
      const x = (clientX - pitchRect.left) / pitchRect.width
      const y = (clientY - pitchRect.top) / pitchRect.height
      if (x >= -0.02 && x <= 1.02 && y >= -0.02 && y <= 1.02) {
        return { type: 'pitch', x: clamp01(x), y: clamp01(y) }
      }
    }
    if (benchRect && clientX >= benchRect.left && clientX <= benchRect.right && clientY >= benchRect.top && clientY <= benchRect.bottom) {
      return { type: 'bench' }
    }
    return null
  }, [])

  const endDrag = useCallback(
    (commit) => {
      const d = dragRef.current
      dragRef.current = null
      setDrag(null)
      window.removeEventListener('pointermove', onDragMoveRef.current)
      window.removeEventListener('pointerup', onDragEndRef.current)
      window.removeEventListener('pointercancel', onDragCancelRef.current)

      if (!d || !d.moved || !commit) return

      const over = d.over
      const isStarter = startersRef.current.some((s) => s.id === d.playerId)

      if (over?.type === 'pitch') {
        if (isStarter) {
          setStarters((prev) =>
            prev.map((s) => (s.id === d.playerId ? { ...s, x: round3(clamp01(over.x)), y: round3(clamp01(over.y)) } : s)),
          )
          markChanged()
        } else if (startersRef.current.length >= required) {
          toastApiError({ response: { data: { message: t('formation.errors.lineupFull', { max: required }) } } }, t)
        } else {
          const player = benchRef.current.find((b) => b.id === d.playerId)
          const slot = activePreset ? firstFreeSlot(activePreset.slots, startersRef.current, player?.position) : null
          setBench((prev) => prev.filter((b) => b.id !== d.playerId))
          setStarters((prev) => [
            ...prev,
            {
              id: d.playerId,
              name: player?.name || '',
              position: player?.position,
              shirt_number: player?.shirt_number,
              tactical_position: slot?.tactical_position || defaultTacticalKey(player?.position),
              x: round3(clamp01(over.x)),
              y: round3(clamp01(over.y)),
            },
          ])
          markChanged()
        }
        return
      }

      if (over?.type === 'bench' && isStarter) {
        setStarters((prev) => {
          const player = prev.find((s) => s.id === d.playerId)
          if (player) setBench((bPrev) => [...bPrev.filter((b) => b.id !== d.playerId), noStyleEntry(player)])
          return prev.filter((s) => s.id !== d.playerId)
        })
        clearRolesFor([d.playerId])
        if (selectedId === d.playerId) setSelectedId(null)
        markChanged()
      }
    },
    [activePreset, clearRolesFor, markChanged, required, selectedId, t],
  )

  const onDragMoveRef = useRef(null)
  const onDragEndRef = useRef(null)
  const onDragCancelRef = useRef(null)

  useEffect(() => {
    const onMove = (event) => {
      const d = dragRef.current
      if (!d) return
      d.clientX = event.clientX
      d.clientY = event.clientY
      if (!d.moved && Math.hypot(event.clientX - d.startX, event.clientY - d.startY) > 6) {
        d.moved = true
        dragMovedRef.current = true
      }
      if (d.moved) {
        d.over = hitTest(event.clientX, event.clientY)
        setDrag({ ...d })
      }
    }
    const onEnd = () => endDrag(true)
    const onCancel = () => endDrag(false)

    onDragMoveRef.current = onMove
    onDragEndRef.current = onEnd
    onDragCancelRef.current = onCancel
  }, [endDrag, hitTest])

  const startDrag = useCallback((playerId, event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    dragMovedRef.current = false
    dragRef.current = {
      playerId,
      startX: event.clientX,
      startY: event.clientY,
      clientX: event.clientX,
      clientY: event.clientY,
      moved: false,
      over: null,
    }
    setDrag({ ...dragRef.current })
    window.addEventListener('pointermove', onDragMoveRef.current)
    window.addEventListener('pointerup', onDragEndRef.current)
    window.addEventListener('pointercancel', onDragCancelRef.current)
  }, [])

  const onTokenSelect = useCallback((playerId) => {
    if (dragMovedRef.current) {
      dragMovedRef.current = false
      return
    }
    setSelectedId((current) => (current === playerId ? null : playerId))
  }, [])

  const onTokenKeyDown = useCallback((playerId, event) => {
    const step = 0.03
    const moves = {
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
    }
    if (moves[event.key]) {
      event.preventDefault()
      const starter = startersRef.current.find((s) => s.id === playerId)
      if (!starter) return
      setStarters((prev) =>
        prev.map((s) =>
          s.id === playerId
            ? { ...s, x: round3(clamp01(starter.x + moves[event.key][0])), y: round3(clamp01(starter.y + moves[event.key][1])) }
            : s,
        ),
      )
      markChanged()
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      removePlayer(playerId)
    }
  }, [markChanged, removePlayer])

  // ── Save ──────────────────────────────────────────────────────────────

  const mutation = useMutation({
    mutationFn: async () => {
      const players = [
        ...startersRef.current.map((p, i) => ({
          player_id: p.id,
          position: p.position,
          shirt_number: p.shirt_number,
          is_starter: true,
          is_captain: p.id === roleRef.current.captainId,
          is_vice_captain: p.id === roleRef.current.viceCaptainId,
          is_free_kick_taker: p.id === roleRef.current.freeKickId,
          is_penalty_taker: p.id === roleRef.current.penaltyId,
          is_corner_taker: p.id === roleRef.current.cornerId,
          tactical_position: p.tactical_position || null,
          x: round3(p.x),
          y: round3(p.y),
          order_index: i,
        })),
        ...benchRef.current.map((p) => ({
          player_id: p.id,
          position: p.position,
          shirt_number: p.shirt_number,
          is_starter: false,
          is_captain: false,
          is_vice_captain: false,
          is_free_kick_taker: false,
          is_penalty_taker: false,
          is_corner_taker: false,
          tactical_position: null,
          x: null,
          y: null,
          order_index: 0,
        })),
      ]
      const body = { players }
      if (formationSnap) body.formation = formationSnap
      const { data } = await api.put(`/manager/match-requests/${matchRequestId}/lineup`, body)
      return data
    },
    onSuccess: () => {
      invalidateKeys([q.matchLineup(matchRequestId), q.matchLineupRoster(matchRequestId)])
      setHasChanges(false)
    },
    onError: (e) => toastApiError(e, t),
  })

  const inLineupIds = useMemo(() => new Set([...starters.map((s) => s.id), ...bench.map((s) => s.id)]), [starters, bench])
  const available = roster.filter((p) => !inLineupIds.has(p.id))

  // Map for FootballPitch name/number lookups (drawer starter tokens carry id/name).
  const drawPlayersById = useMemo(() => {
    const map = {}
    ;[...starters, ...bench].forEach((s) => {
      map[s.id] = { id: s.id, name: s.name, number: s.shirt_number, position: s.position }
    })
    return map
  }, [starters, bench])

  const selectedStarter = starters.find((s) => s.id === selectedId)

  return (
    <Drawer open={open} onClose={onClose} title={t('ov.drawers.lineupTitle')} subtitle={`${t('ov.drawers.lineupSubtitle')} — ${format}`} size={960}>
      <div className="space-y-5 pb-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="size-8 animate-spin rounded-full border-4 border-green-200 border-t-green-600" />
          </div>
        ) : (
          <>
            {/* Status + formation snapshot picker */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-green-100 bg-green-50/60 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold text-green-600/70">{t('ov.drawers.requiredStarters')}</p>
                <p className="text-sm font-extrabold text-slate-800">
                  {t('ov.drawers.startersCount', { count: starters.length, required })}
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <ChevronDown className="size-3.5 text-slate-400" aria-hidden="true" />
                <span className="hidden sm:inline">{t('ov.drawers.formationSourceTitle')}</span>
                <select
                  className="h-9 max-w-[220px] rounded-xl border border-green-200 bg-white px-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  value={formationSourceId || ''}
                  onChange={(event) => {
                    const formation = formations.find((f) => String(f.id) === event.target.value)
                    if (formation) applyFormation(formation)
                  }}
                >
                  <option value="">{t('ov.drawers.formationSourceNone')}</option>
                  {formations.map((formation) => (
                    <option key={formation.id} value={formation.id}>
                      {formation.name || formation.format} · {formation.format}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {formationSnap && (
              <p className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold text-slate-500">
                {t('ov.drawers.formationSourceHint')} {formationSnap.formation || formationSnap.preset_key || formationSnap.format}
              </p>
            )}

            {/* Pitch */}
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <FootballPitch
                starters={starters}
                playersById={drawPlayersById}
                pitchRef={pitchRef}
                selectedId={selectedId}
                draggingPlayerId={drag?.playerId}
                onTokenPointerDown={(playerId, event) => startDrag(playerId, event)}
                onTokenSelect={onTokenSelect}
                onTokenKeyDown={onTokenKeyDown}
                roleOf={(playerId) =>
                  ROLE_KEYS.map(({ key, idKey }) => (roleRef.current[idKey] === playerId ? key : null)).filter(Boolean)
                }
              />

              {selectedStarter && (
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50 px-4 py-3">
                  <span className="text-xs font-bold text-slate-700">
                    {selectedStarter.name}
                    {selectedStarter.shirt_number ? ` #${selectedStarter.shirt_number}` : ''}
                    <span className="ms-1 font-semibold text-slate-400">
                      ({positionLabels[selectedStarter.position] || selectedStarter.position || ''})
                    </span>
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {ROLE_KEYS.map(({ key, idKey, label, Icon, onClass }) => {
                      const active = roleRef.current[idKey] === selectedStarter.id
                      const title = t(`ov.drawers.${label}`)
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => toggleRole(selectedStarter.id, idKey)}
                          title={title}
                          aria-label={title}
                          aria-pressed={active}
                          className={`grid size-8 place-items-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                            active ? `ring-2 ${onClass}` : 'bg-white text-slate-400 ring-1 ring-slate-200 hover:bg-white hover:text-slate-700'
                          }`}
                        >
                          <Icon className="size-3.5" aria-hidden="true" />
                        </button>
                      )
                    })}
                  </div>
                  <div className="ms-auto flex gap-2">
                    <Button size="sm" variant="soft" onClick={() => moveToBench(selectedStarter.id)}>
                      <UserMinus className="size-3.5" aria-hidden="true" />
                      {t('ov.drawers.bench')}
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => removePlayer(selectedStarter.id)}>
                      <Trash2 className="size-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Bench dropzone */}
            <div
              ref={benchDropRef}
              className={`min-h-[88px] rounded-2xl border-2 border-dashed p-3 transition-colors ${
                drag?.over?.type === 'bench' ? 'border-amber-400 bg-amber-50' : 'border-slate-200 bg-white/70'
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-extrabold text-slate-900">{t('ov.drawers.bench')} ({bench.length})</h3>
                <span className="text-[10px] font-semibold text-slate-400">{t('ov.drawers.dragToBenchHint')}</span>
              </div>
              {bench.length === 0 ? (
                <p className="py-2 text-center text-xs font-semibold text-slate-400">{t('ov.drawers.benchEmpty')}</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {bench.map((p) => (
                    <span
                      key={p.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${p.name} — ${t('ov.drawers.bench')}`}
                      onPointerDown={(event) => {
                        event.preventDefault()
                        startDrag(p.id, event)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && starters.length < required) promoteToStarter(p.id)
                      }}
                      className="flex cursor-grab items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1 ps-2 pe-1 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                    >
                      <span className="grid size-6 place-items-center rounded-full bg-amber-100 text-[11px] font-black text-amber-700">
                        {p.shirt_number || '?'}
                      </span>
                      <span className="max-w-[110px] truncate text-xs font-bold text-slate-700">{p.name}</span>
                      <button
                        type="button"
                        onClick={() => promoteToStarter(p.id)}
                        disabled={starters.length >= required}
                        aria-label={t('ov.drawers.setStarter')}
                        className="grid size-6 place-items-center rounded-full text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      >
                        <Plus className="size-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePlayer(p.id)}
                        aria-label={t('ov.drawers.removeFromLineup')}
                        className="grid size-6 place-items-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                      >
                        <UserMinus className="size-3" aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Roster add */}
            {available.length > 0 && (
              <div>
                <h3 className="mb-2 text-xs font-extrabold text-slate-500">{t('ov.drawers.addToLineup')}</h3>
                <div className="flex flex-wrap gap-2">
                  {available.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addPlayer(p)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:border-green-300 hover:bg-green-50 hover:text-green-700"
                    >
                      <UserPlus className="size-3" aria-hidden="true" />
                      {p.name}
                      {p.number && <span className="text-slate-400">#{p.number}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {hasChanges && (
              <div className="sticky bottom-0 border-t border-slate-100 bg-white pt-4">
                <button
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate()}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-green-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-green-600/25 transition hover:bg-green-700 disabled:opacity-50"
                >
                  <Save className="size-4" aria-hidden="true" />
                  {mutation.isPending ? '…' : t('common.save')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Drag ghost */}
      {drag?.moved && (
        <div
          className="pointer-events-none fixed z-[200] -translate-x-1/2 -translate-y-1/2"
          style={{ left: drag.clientX, top: drag.clientY }}
          aria-hidden="true"
        >
          <span className="rounded-full bg-slate-900/90 px-3 py-1.5 text-xs font-black text-white shadow-xl">
            {(starters.some((s) => s.id === drag.playerId) || bench.some((s) => s.id === drag.playerId)) &&
              (starters.find((s) => s.id === drag.playerId)?.name || bench.find((s) => s.id === drag.playerId)?.name)}
          </span>
        </div>
      )}

      {/* Replace-with-formation confirm */}
      <Modal
        open={!!confirm}
        onClose={() => setConfirm(null)}
        title={confirm?.title || ''}
        size="sm"
        footer={
          <>
            <Button variant="soft" onClick={() => setConfirm(null)}>{t('common.cancel')}</Button>
            <Button onClick={confirm?.onConfirm}>{confirm?.confirmLabel}</Button>
          </>
        }
      >
        <p className="text-sm font-semibold text-slate-600">{confirm?.body}</p>
      </Modal>
    </Drawer>
  )
}