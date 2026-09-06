import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Flag, Goal, Pencil, Plus, RotateCcw, Save, Shield, Star, Target, Trash2, X, Zap } from 'lucide-react'
import api from '../../../api/client'
import { q, useFormationPresets, useManagerPlayers, useTeamFormations } from '../../../api/queries'
import { queryClient } from '../../../api/queryClient'
import {
  Badge,
  Button,
  Card,
  Empty,
  Field,
  Modal,
  SectionTitle,
  Skeleton,
  inputClass,
  selectClass,
} from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import FootballPitch from './FootballPitch'
import PlayerCard from './PlayerCard'
import {
  FORMATS,
  applyPresetSlots,
  buildFormationPayload,
  clamp01,
  defaultTacticalKey,
  firstFreeSlot,
  maxStartersFor,
  round3,
  snapshotOf,
} from './pitchUtils'

const blankState = () => ({
  formationId: null,
  name: '',
  format: '5v5',
  presetKey: null,
  presetLabel: null,
  isActive: false,
  captainId: null,
  viceCaptainId: null,
  freeKickId: null,
  penaltyId: null,
  cornerId: null,
  starters: [],
  substitutes: [],
})

const ROLE_KEYS = [
  { key: 'captain', label: 'roleCaptain', icon: Shield, idKey: 'captainId' },
  { key: 'viceCaptain', label: 'roleViceCaptain', icon: Star, idKey: 'viceCaptainId' },
  { key: 'freeKick', label: 'roleFreeKick', icon: Zap, idKey: 'freeKickId' },
  { key: 'penalty', label: 'rolePenalty', icon: Flag, idKey: 'penaltyId' },
  { key: 'corner', label: 'roleCorner', icon: Target, idKey: 'cornerId' },
]

export default function FormationPage() {
  const { t } = useTranslation()
  const { toast } = useToast()

  const playersQuery = useManagerPlayers()
  const formationsQuery = useTeamFormations()
  const presetsQuery = useFormationPresets()

  const [state, setState] = useState(blankState)
  const [savedSnapshot, setSavedSnapshot] = useState(() => snapshotOf(blankState()))
  const [selectedStarterId, setSelectedStarterId] = useState(null)
  const [drag, setDrag] = useState(null)
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveModal, setSaveModal] = useState(false)
  const [renameModal, setRenameModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [confirmState, setConfirmState] = useState(null) // { title, body, confirmLabel, onConfirm }
  const [presetModal, setPresetModal] = useState(null) // { mode: 'create'|'rename', preset }
  const [presetDeleteTarget, setPresetDeleteTarget] = useState(null)

  const pitchRef = useRef(null)
  const subsRef = useRef(null)
  const dragRef = useRef(null)
  const dragMovedRef = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state
  const autoLoadedRef = useRef(false)

  const players = playersQuery.data?.players || []
  const playersById = useMemo(
    () => Object.fromEntries(players.map((p) => [p.id, p])),
    [players],
  )
  const formations = formationsQuery.data?.data || []
  const presetGroups = presetsQuery.data?.data || {}
  const maxStarters = maxStartersFor(state.format)
  const dirty = snapshotOf(state) !== savedSnapshot

  const formatPresets = presetGroups[state.format] || []
  const activePreset = formatPresets.find((preset) => preset.key === state.presetKey)

  // Tactical-position options, derived from the backend presets catalog.
  const tacticalOptions = useMemo(() => {
    const seen = new Map()
    Object.values(presetGroups).forEach((group) => {
      group.forEach((preset) => {
        preset.slots.forEach((slot) => {
          if (!seen.has(slot.tactical_position)) {
            seen.set(slot.tactical_position, slot.role)
          }
        })
      })
    })
    if (!seen.size) {
      Object.entries({ GK: 'goalkeeper', CB: 'defender', CM: 'midfielder', ST: 'forward' }).forEach(
        ([key, role]) => seen.set(key, role),
      )
    }
    return [...seen.entries()].map(([value, role]) => ({ value, role }))
  }, [presetGroups])

  // ── Editor mutations (local state only — saved via the API on demand) ──

  const update = useCallback((mutator) => {
    setState((prev) => ({ ...prev, ...mutator(prev) }))
  }, [])

  const clearRolesFor = useCallback((prev, playerId) => {
    const drops = {}
    ROLE_KEYS.forEach(({ idKey }) => {
      if (prev[idKey] === playerId) drops[idKey] = null
    })
    return drops
  }, [])

  const transferRoles = useCallback((prev, toPlayerId, fromPlayerId) => {
    const moves = {}
    ROLE_KEYS.forEach(({ idKey }) => {
      if (prev[idKey] === fromPlayerId) moves[idKey] = toPlayerId
      else if (prev[idKey] === toPlayerId) moves[idKey] = null
    })
    return moves
  }, [])

  const toggleRole = useCallback((playerId, idKey) => {
    update((prev) => ({ [idKey]: prev[idKey] === playerId ? null : playerId }))
  }, [update])

  const addStarter = useCallback((playerId, x, y, tacticalPosition) => {
    update((prev) => {
      const player = playersById[playerId]
      return {
        starters: [
          ...prev.starters,
          {
            player_id: playerId,
            x: round3(clamp01(x)),
            y: round3(clamp01(y)),
            tactical_position: tacticalPosition || defaultTacticalKey(player?.position),
          },
        ],
        substitutes: prev.substitutes.filter((id) => id !== playerId),
      }
    })
  }, [playersById, update])

  const moveStarter = useCallback((playerId, x, y) => {
    update((prev) => ({
      starters: prev.starters.map((s) =>
        s.player_id === playerId ? { ...s, x: round3(clamp01(x)), y: round3(clamp01(y)) } : s,
      ),
    }))
  }, [update])

  const toSubstitutes = useCallback((playerId) => {
    update((prev) => ({
      ...clearRolesFor(prev, playerId),
      starters: prev.starters.filter((s) => s.player_id !== playerId),
      substitutes: prev.substitutes.includes(playerId)
        ? prev.substitutes
        : [...prev.substitutes, playerId],
    }))
    setSelectedStarterId((current) => (current === playerId ? null : current))
  }, [clearRolesFor, update])

  const removeStarter = useCallback((playerId) => {
    update((prev) => ({
      ...clearRolesFor(prev, playerId),
      starters: prev.starters.filter((s) => s.player_id !== playerId),
    }))
    setSelectedStarterId((current) => (current === playerId ? null : current))
  }, [clearRolesFor, update])

  const replaceStarter = useCallback((newPlayerId, oldPlayerId) => {
    update((prev) => {
      const oldStarter = prev.starters.find((s) => s.player_id === oldPlayerId)
      return {
        ...transferRoles(prev, newPlayerId, oldPlayerId),
        starters: prev.starters.map((s) =>
          s.player_id === oldPlayerId
            ? { ...s, player_id: newPlayerId }
            : s,
        ),
        substitutes: [
          ...prev.substitutes.filter((id) => id !== newPlayerId && id !== oldPlayerId),
          oldPlayerId,
        ],
      }
    })
    setSelectedStarterId(null)
  }, [transferRoles, update])

  const promoteToLineup = useCallback((playerId) => {
    const current = stateRef.current
    if (current.starters.length >= maxStartersFor(current.format)) {
      toast.error(t('formation.errors.lineupFull', { max: maxStartersFor(current.format) }))
      return
    }
    const player = playersById[playerId]
    const slot = activePreset
      ? firstFreeSlot(
          activePreset.slots,
          current.starters,
          player?.position,
        )
      : null
    addStarter(
      playerId,
      slot ? slot.x : 0.5,
      slot ? slot.y : 0.5,
      slot ? slot.tactical_position : undefined,
    )
  }, [activePreset, addStarter, playersById, t, toast])

  const placeFromRoster = useCallback((player) => {
    const current = stateRef.current
    if (current.starters.length >= maxStartersFor(current.format)) {
      toast.error(t('formation.errors.lineupFull', { max: maxStartersFor(current.format) }))
      return
    }
    const used = current.starters
    const slot = activePreset ? firstFreeSlot(activePreset.slots, used, player.position) : null
    addStarter(
      player.id,
      slot ? slot.x : 0.3 + 0.1 * (used.length % 5),
      slot ? slot.y : 0.55,
      slot ? slot.tactical_position : undefined,
    )
  }, [activePreset, addStarter, t, toast])

  // ── Drag & drop (pointer events: mouse + touch) ──────────────────────

  const hitTest = useCallback((clientX, clientY) => {
    const pitchRect = pitchRef.current?.getBoundingClientRect()
    const subsRect = subsRef.current?.getBoundingClientRect()

    if (pitchRect) {
      const x = (clientX - pitchRect.left) / pitchRect.width
      const y = (clientY - pitchRect.top) / pitchRect.height
      if (x >= -0.02 && x <= 1.02 && y >= -0.02 && y <= 1.02) {
        // A token near the pointer means "replace this starter".
        const radius = pitchRect.width * 0.075
        for (const starter of stateRef.current.starters) {
          const tokenX = pitchRect.left + starter.x * pitchRect.width
          const tokenY = pitchRect.top + starter.y * pitchRect.height
          if (Math.hypot(clientX - tokenX, clientY - tokenY) < radius) {
            return { type: 'replace', id: starter.player_id }
          }
        }
        return { type: 'pitch', x: clamp01(x), y: clamp01(y) }
      }
    }

    if (subsRect && clientX >= subsRect.left && clientX <= subsRect.right && clientY >= subsRect.top && clientY <= subsRect.bottom) {
      return { type: 'subs' }
    }

    return null
  }, [])

  const endDrag = useCallback((commit) => {
    const d = dragRef.current
    dragRef.current = null
    setDrag(null)
    window.removeEventListener('pointermove', onDragMoveRef.current)
    window.removeEventListener('pointerup', onDragEndRef.current)
    window.removeEventListener('pointercancel', onDragCancelRef.current)

    if (!d || !d.moved || !commit) return

    const over = d.over
    const current = stateRef.current
    const fromStarter = current.starters.find((s) => s.player_id === d.playerId)
    const isStarter = !!fromStarter

    if (over?.type === 'pitch') {
      if (isStarter) {
        moveStarter(d.playerId, over.x, over.y)
      } else if (current.starters.length >= maxStartersFor(current.format)) {
        toast.error(t('formation.errors.lineupFull', { max: maxStartersFor(current.format) }))
      } else {
        addStarter(d.playerId, over.x, over.y)
      }
      return
    }

    if (over?.type === 'replace') {
      if (over.id === d.playerId) return
      if (isStarter) {
        // Swap the two starters' placements.
        update((prev) => {
          const a = prev.starters.find((s) => s.player_id === d.playerId)
          const b = prev.starters.find((s) => s.player_id === over.id)
          if (!a || !b) return {}
          return {
            starters: prev.starters.map((s) =>
              s.player_id === a.player_id
                ? { ...s, x: b.x, y: b.y }
                : { ...s, x: a.x, y: a.y },
            ),
          }
        })
      } else if (current.starters.length >= maxStartersFor(current.format) && !current.starters.some((s) => s.player_id === over.id)) {
        toast.error(t('formation.errors.lineupFull', { max: maxStartersFor(current.format) }))
      } else {
        replaceStarter(d.playerId, over.id)
      }
      return
    }

    if (over?.type === 'subs' && isStarter) {
      toSubstitutes(d.playerId)
    }
    // Dropped nowhere valid: placement reverts silently.
  }, [addStarter, moveStarter, replaceStarter, t, toast, toSubstitutes, update])

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

  const startDrag = useCallback((playerId, from, event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    dragMovedRef.current = false
    dragRef.current = {
      playerId,
      from,
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

  const onTokenPointerDown = useCallback((playerId, event) => {
    event.preventDefault()
    startDrag(playerId, 'pitch', event)
  }, [startDrag])

  const onTokenSelect = useCallback((playerId) => {
    if (dragMovedRef.current) {
      dragMovedRef.current = false
      return
    }
    setSelectedStarterId((current) => (current === playerId ? null : playerId))
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
      const starter = stateRef.current.starters.find((s) => s.player_id === playerId)
      if (!starter) return
      moveStarter(playerId, starter.x + moves[event.key][0], starter.y + moves[event.key][1])
    } else if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault()
      removeStarter(playerId)
    }
  }, [moveStarter, removeStarter])

  // ── Unsaved-changes guard ────────────────────────────────────────────

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const guardAction = useCallback((action) => {
    if (!dirty) {
      action()
      return
    }
    setConfirmState({
      title: t('formation.confirm.title'),
      body: t('formation.confirm.body'),
      confirmLabel: t('formation.confirm.discard'),
      onConfirm: () => {
        setConfirmState(null)
        action()
      },
    })
  }, [dirty, t])

  // ── Load / save / rename / delete ────────────────────────────────────

  const loadFormation = useCallback((formation) => {
    const starters = formation.players
      .filter((p) => p.is_starter)
      .map((p) => ({ player_id: p.player_id, x: Number(p.x ?? 0.5), y: Number(p.y ?? 0.5), tactical_position: p.tactical_position || undefined }))
    const substitutes = formation.players.filter((p) => !p.is_starter).map((p) => p.player_id)
    const next = {
      formationId: formation.id,
      name: formation.name || '',
      format: formation.format || '5v5',
      presetKey: formation.preset_key || null,
      presetLabel: formation.formation || null,
      isActive: !!formation.is_active,
      captainId: formation.captain_id || null,
      viceCaptainId: formation.vice_captain_id || null,
      freeKickId: formation.free_kick_taker_id || null,
      penaltyId: formation.penalty_taker_id || null,
      cornerId: formation.corner_taker_id || null,
      starters,
      substitutes,
    }
    setState(next)
    setSavedSnapshot(snapshotOf(next))
    setSelectedStarterId(null)
  }, [])

  // Auto-load the team's current (active) formation once.
  useEffect(() => {
    if (autoLoadedRef.current || formationsQuery.isLoading || !formations.length) return
    autoLoadedRef.current = true
    loadFormation(formations.find((f) => f.is_active) || formations[0])
  }, [formations, formationsQuery.isLoading, loadFormation])

  const resetEditor = useCallback(() => {
    setState(blankState())
    setSavedSnapshot(snapshotOf(blankState()))
    setSelectedStarterId(null)
  }, [])

  const submitSave = useCallback(async ({ name, isActive }) => {
    setSaving(true)
    try {
      const payload = { ...buildFormationPayload(stateRef.current), name, is_active: isActive }
      const res = stateRef.current.formationId
        ? await api.put(`/manager/team/formations/${stateRef.current.formationId}`, payload)
        : await api.post('/manager/team/formations', payload)
      const formation = res.data?.data
      const next = { ...stateRef.current, formationId: formation.id, name: formation.name, isActive: !!formation.is_active, presetKey: formation.preset_key, presetLabel: formation.formation }
      setState(next)
      setSavedSnapshot(snapshotOf(next))
      queryClient.invalidateQueries({ queryKey: q.teamFormations() })
      toast.success(t('formation.toasts.saved'))
      setSaveModal(false)
      setRenameModal(false)
    } catch (error) {
      toastApiError(error, t, t('formation.errors.saveFailed'))
    } finally {
      setSaving(false)
    }
  }, [t, toast])

  const submitDelete = useCallback(async (formation) => {
    try {
      await api.delete(`/manager/team/formations/${formation.id}`)
      if (stateRef.current.formationId === formation.id) resetEditor()
      queryClient.invalidateQueries({ queryKey: q.teamFormations() })
      toast.success(t('formation.toasts.deleted'))
    } catch (error) {
      toastApiError(error, t, t('formation.errors.deleteFailed'))
    } finally {
      setDeleteTarget(null)
    }
  }, [resetEditor, t, toast])

  const activateFormation = useCallback(async (formation) => {
    try {
      await api.post(`/manager/team/formations/${formation.id}/activate`)
      queryClient.invalidateQueries({ queryKey: q.teamFormations() })
      toast.success('تم تفعيل التشكيلة كتشكيلة أساسية للفريق')
    } catch (error) {
      toastApiError(error, t, 'تعذر تفعيل التشكيلة')
    }
  }, [t, toast])

  // ── Custom preset management (structure only — never player identity) ──

  const submitPresetSave = useCallback(async (name) => {
    const current = stateRef.current
    if (current.starters.length !== maxStartersFor(current.format)) {
      toast.error(t('formation.presetErrors.lineupFull'))
      return
    }
    try {
      await api.post('/manager/team/formation-presets', {
        name,
        format: current.format,
        slots: current.starters.map((s) => ({
          tactical_position: s.tactical_position || defaultTacticalKey(playersById[s.player_id]?.position),
          x: s.x,
          y: s.y,
        })),
      })
      queryClient.invalidateQueries({ queryKey: q.formationPresets() })
      toast.success(t('formation.presetToasts.saved'))
      setPresetModal(null)
    } catch (error) {
      toastApiError(error, t, t('formation.presetErrors.saveFailed'))
    }
  }, [playersById, t, toast])

  const submitPresetRename = useCallback(async (name) => {
    const preset = presetModal?.preset
    if (!preset) return
    try {
      await api.put(`/manager/team/formation-presets/${String(preset.key).replace(/^custom:/, '')}`, { name })
      queryClient.invalidateQueries({ queryKey: q.formationPresets() })
      toast.success(t('formation.presetToasts.renamed'))
      setPresetModal(null)
    } catch (error) {
      toastApiError(error, t, t('formation.presetErrors.saveFailed'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetModal?.preset, t, toast])

  const submitPresetDelete = useCallback(async (preset) => {
    try {
      await api.delete(`/manager/team/formation-presets/${String(preset.key).replace(/^custom:/, '')}`)
      queryClient.invalidateQueries({ queryKey: q.formationPresets() })
      if (stateRef.current.presetKey === preset.key) {
        setState((prev) => ({ ...prev, presetKey: null, presetLabel: null }))
      }
      toast.success(t('formation.presetToasts.deleted'))
    } catch (error) {
      toastApiError(error, t, t('formation.presetErrors.deleteFailed'))
    } finally {
      setPresetDeleteTarget(null)
    }
  }, [t, toast, update])

  const applyPreset = useCallback((preset) => {
    const current = stateRef.current
    const { starters, overflow } = applyPresetSlots(current.starters, preset.slots)
    const apply = () => {
      const overflowIds = overflow.map((s) => s.player_id)
      update((prev) => {
        const drops = {}
        ROLE_KEYS.forEach(({ idKey }) => {
          if (overflowIds.includes(prev[idKey])) drops[idKey] = null
        })
        return {
          ...drops,
          starters,
          substitutes: [...prev.substitutes, ...overflowIds],
          presetKey: preset.key,
          presetLabel: preset.label,
        }
      })
    }
    if (overflow.length) {
      setConfirmState({
        title: t('formation.presetOverflow.title'),
        body: (
          <div className="space-y-2">
            <p>{t('formation.presetOverflow.body', { count: overflow.length })}</p>
            <ul className="list-inside list-disc ps-2 text-xs font-semibold text-slate-500">
              {overflow.map((s) => (
                <li key={s.player_id}>{playersById[s.player_id]?.name || `#${s.player_id}`}</li>
              ))}
            </ul>
          </div>
        ),
        confirmLabel: t('formation.presetOverflow.confirm'),
        onConfirm: () => {
          setConfirmState(null)
          apply()
        },
      })
    } else {
      apply()
    }
  }, [playersById, t, update])

  const changeFormat = useCallback((format) => {
    const current = stateRef.current
    if (format === current.format) return
    const max = maxStartersFor(format)
    const overflowCount = Math.max(0, current.starters.length - max)
    const overflowStarters = current.starters.slice(max)
    const apply = () => {
      const overflowIds = overflowStarters.map((s) => s.player_id)
      update((prev) => {
        const drops = {}
        ROLE_KEYS.forEach(({ idKey }) => {
          if (overflowIds.includes(prev[idKey])) drops[idKey] = null
        })
        return {
          ...drops,
          format,
          presetKey: null,
          presetLabel: null,
          starters: prev.starters.slice(0, max),
          substitutes: [...prev.substitutes, ...overflowIds],
        }
      })
    }
    if (overflowCount > 0) {
      setConfirmState({
        title: t('formation.formatOverflow.title'),
        body: (
          <div className="space-y-2">
            <p>{t('formation.formatOverflow.body', { count: overflowCount, format })}</p>
            <ul className="list-inside list-disc ps-2 text-xs font-semibold text-slate-500">
              {overflowStarters.map((s) => (
                <li key={s.player_id}>{playersById[s.player_id]?.name || `#${s.player_id}`}</li>
              ))}
            </ul>
          </div>
        ),
        confirmLabel: t('formation.formatOverflow.confirm'),
        onConfirm: () => {
          setConfirmState(null)
          apply()
        },
      })
    } else {
      apply()
    }
  }, [playersById, t, update])

  // ── Derived view data ────────────────────────────────────────────────

  const assignedIds = useMemo(
    () => new Set([...state.starters.map((s) => s.player_id), ...state.substitutes]),
    [state.starters, state.substitutes],
  )

  const filteredPlayers = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return players
    return players.filter((p) => p.name?.toLowerCase().includes(term))
  }, [players, search])

  const selectedStarter = state.starters.find((s) => s.player_id === selectedStarterId)
  const lineupFull = state.starters.length >= maxStarters

  const dropValid =
    drag?.over?.type === 'pitch'
      ? drag.from === 'pitch' || !lineupFull
      : drag?.over?.type === 'replace'
        ? drag.from === 'pitch' || !lineupFull || state.starters.some((s) => s.player_id === drag.over.id)
        : true

  const loading = playersQuery.isLoading || formationsQuery.isLoading

  const roleLabel = (role) => t(`formation.roles.${role}`, { defaultValue: role })

  const roleOf = useCallback(
    (playerId) => ROLE_KEYS.map(({ key, idKey }) => (state[idKey] === playerId ? key : null)).filter(Boolean),
    [state],
  )

  const customPresets = formatPresets.filter((preset) => String(preset.key).startsWith('custom:'))

  return (
    <div className="space-y-5">
      <SectionTitle
        title={t('formation.title')}
        subtitle={t('formation.subtitle')}
      />

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-[minmax(280px,340px)_1fr]">
          <Skeleton className="h-96 rounded-3xl" />
          <Skeleton className="h-[520px] rounded-3xl" />
        </div>
      ) : playersQuery.isError || formationsQuery.isError ? (
        <Card>
          <Empty
            icon={AlertTriangle}
            title={t('formation.errors.loadFailed')}
            description={t('formation.errors.loadFailedHint')}
            action={
              <Button onClick={() => { playersQuery.refetch(); formationsQuery.refetch() }}>
                <RotateCcw className="size-4" aria-hidden="true" />
                {t('common.retry', { defaultValue: t('formation.actions.retry') })}
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(280px,340px)_1fr]">
          {/* ── Side column: format, presets, saved, roster ── */}
          <div className="space-y-5">
            <Card title={t('formation.formatTitle')} bodyClassName="p-4">
              <div className="flex flex-wrap gap-2">
                {FORMATS.map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => guardAction(() => changeFormat(format))}
                    aria-pressed={state.format === format}
                    className={`rounded-xl px-3.5 py-2 text-sm font-black transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                      state.format === format
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {format}
                    <span className="ms-1 text-[10px] font-bold opacity-80">
                      {t('formation.playersCount', { count: maxStartersFor(format) })}
                    </span>
                  </button>
                ))}
              </div>

              <div className="mt-4">
                <label className="mb-1.5 block text-xs font-bold text-slate-700">
                  {t('formation.presetTitle')}
                </label>
                <select
                  className={selectClass}
                  value={state.presetKey || ''}
                  onChange={(event) => {
                    const preset = formatPresets.find((p) => p.key === event.target.value)
                    // Presets only re-slot the current starters (players are
                    // never replaced), so no discard-guard is needed.
                    if (preset) applyPreset(preset)
                  }}
                >
                  <option value="">{t('formation.presetCustom')}</option>
                  {formatPresets.map((preset) => (
                    <option key={preset.key} value={preset.key}>{preset.label}</option>
                  ))}
                </select>
                {activePreset && (
                  <p className="mt-1.5 text-[11px] font-semibold text-slate-500">
                    {t('formation.presetSlots', { count: activePreset.slots.length })}
                  </p>
                )}

                <div className="mt-3 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700">{t('formation.presetManagerTitle')}</span>
                    <Button size="sm" variant="soft" onClick={() => setPresetModal({ mode: 'create', preset: null })}>
                      <Plus className="size-3.5" aria-hidden="true" />
                      {t('formation.saveAsPreset')}
                    </Button>
                  </div>
                  {customPresets.length === 0 ? (
                    <p className="mt-2 text-[11px] font-semibold text-slate-400">{t('formation.presetManagerEmpty')}</p>
                  ) : (
                    <ul className="mt-2 space-y-1.5">
                      {customPresets.map((preset) => (
                        <li
                          key={preset.key}
                          className={`flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 ${
                            state.presetKey === preset.key ? 'border-emerald-300 bg-emerald-50/60' : 'border-slate-200 bg-white'
                          }`}
                        >
                          <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">{preset.label}</span>
                          <Badge variant="neutral">{t('formation.customBadge')}</Badge>
                          <button
                            type="button"
                            onClick={() => setPresetModal({ mode: 'rename', preset })}
                            aria-label={t('formation.actions.rename')}
                            className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                          >
                            <Pencil className="size-3" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPresetDeleteTarget(preset)}
                            aria-label={t('formation.actions.delete')}
                            className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                          >
                            <Trash2 className="size-3" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </Card>

            <Card
              title={t('formation.savedTitle')}
              bodyClassName="p-4"
              action={<Badge variant={dirty ? 'warning' : 'neutral'}>{dirty ? t('formation.unsaved') : t('formation.savedOk')}</Badge>}
            >
              {formations.length === 0 ? (
                <p className="py-3 text-center text-xs font-semibold text-slate-500">{t('formation.savedEmpty')}</p>
              ) : (
                <ul className="space-y-2">
                  {formations.map((formation) => (
                    <li
                      key={formation.id}
                      className={`flex items-center gap-2 rounded-2xl border p-2.5 ${
                        formation.is_active
                          ? 'border-amber-300 bg-amber-50/40 ring-1 ring-amber-200'
                          : state.formationId === formation.id
                            ? 'border-emerald-300 bg-emerald-50/60'
                            : 'border-slate-200 bg-white'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => guardAction(() => loadFormation(formation))}
                        className="min-w-0 flex-1 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 rounded-xl"
                      >
                        <span className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
                          {formation.is_active && <Star className="size-3.5 fill-amber-400 text-amber-500" aria-hidden="true" />}
                          <span className="truncate">{formation.name}</span>
                          {formation.is_active && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-black text-amber-800">
                              أساسية
                            </span>
                          )}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {formation.format} · {formation.formation || t('formation.presetCustom')} · {t('formation.playersCount', { count: formation.starters_count })}
                        </span>
                      </button>

                      {!formation.is_active && (
                        <button
                          type="button"
                          onClick={() => activateFormation(formation)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-[10px] font-bold text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                          title="تعيين كتشكيلة أساسية للفريق"
                        >
                          <Star className="size-3 text-slate-400" />
                          تفعيل
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          loadFormation(formation)
                          setRenameModal(true)
                        }}
                        aria-label={t('formation.actions.rename')}
                        className="grid size-8 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(formation)}
                        aria-label={t('formation.actions.delete')}
                        className="grid size-8 shrink-0 place-items-center rounded-xl text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                      >
                        <Trash2 className="size-3.5" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card
              title={t('formation.rosterTitle')}
              bodyClassName="p-4"
              action={<span className="text-[11px] font-bold text-slate-500">{t('formation.rosterCount', { count: players.length })}</span>}
            >
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('formation.searchPlayer')}
                className={`${inputClass} mb-3 h-10`}
              />
              {filteredPlayers.length === 0 ? (
                <p className="py-3 text-center text-xs font-semibold text-slate-500">{t('formation.rosterEmpty')}</p>
              ) : (
                <ul className="max-h-[320px] space-y-2 overflow-y-auto pe-1">
                  {filteredPlayers.map((player) => (
                    <li key={player.id}>
                      <PlayerCard
                        player={player}
                        assigned={state.starters.some((s) => s.player_id === player.id) ? 'starter' : state.substitutes.includes(player.id) ? 'substitute' : null}
                        selected={false}
                        placeDisabled={lineupFull}
                        onPointerDown={(p, event) => startDrag(p.id, 'roster', event)}
                        onPlace={() => placeFromRoster(player)}
                        onSelect={() => placeFromRoster(player)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* ── Main column: pitch, selected-player actions, substitutes ── */}
          <div className="space-y-5">
            <Card noPadding bodyClassName="">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3.5">
                <div className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
                  <Goal className="size-4 text-emerald-600" aria-hidden="true" />
                  {state.name?.trim() || t('formation.defaultName')}
                  <Badge variant="neutral">{state.format}</Badge>
                  {state.presetLabel && <Badge variant="success">{state.presetLabel}</Badge>}
                </div>
                <span className={`text-xs font-black ${lineupFull ? 'text-emerald-600' : 'text-slate-500'}`}>
                  {t('formation.lineupCounter', { current: state.starters.length, max: maxStarters })}
                </span>
              </div>

              <div className="p-4 sm:p-6">
                <FootballPitch
                  starters={state.starters}
                  playersById={playersById}
                  pitchRef={pitchRef}
                  selectedId={selectedStarterId}
                  draggingPlayerId={drag?.playerId}
                  onTokenPointerDown={onTokenPointerDown}
                  onTokenSelect={onTokenSelect}
                  onTokenKeyDown={onTokenKeyDown}
                  roleOf={roleOf}
                />

                {selectedStarter && (
                  <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl bg-slate-50 p-3">
                    <span className="w-full text-xs font-bold text-slate-600 sm:w-auto">
                      {t('formation.selectedPlayer', { name: playersById[selectedStarter.player_id]?.name || '' })}
                      <span className="ms-1 font-semibold text-slate-400">
                        ({t('formation.normalPosition')}: {roleLabel(playersById[selectedStarter.player_id]?.position || 'unknown')})
                      </span>
                    </span>
                    <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                      {t('formation.positionInFormation')}
                      <select
                        className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-xs font-bold"
                        value={selectedStarter.tactical_position || ''}
                        onChange={(event) => {
                          const value = event.target.value
                          update((prev) => ({
                            starters: prev.starters.map((s) =>
                              s.player_id === selectedStarter.player_id ? { ...s, tactical_position: value } : s,
                            ),
                          }))
                        }}
                      >
                        {tacticalOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.value} — {roleLabel(option.role)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {ROLE_KEYS.map(({ key, idKey, icon: RoleIcon, label }) => {
                        const active = state[idKey] === selectedStarter.player_id
                        const holder = state[idKey] && !active ? playersById[state[idKey]]?.name : null
                        const title = holder
                          ? `${t(`formation.${label}`)}: ${holder}`
                          : t(`formation.${label}`)
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => toggleRole(selectedStarter.player_id, idKey)}
                            title={title}
                            aria-label={title}
                            aria-pressed={active}
                            className={`flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[11px] font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                              active
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            <RoleIcon className="size-3.5" aria-hidden="true" />
                            <span className="hidden sm:inline">{t(`formation.${label}`)}</span>
                          </button>
                        )
                      })}
                    </div>
                    <div className="ms-auto flex gap-2">
                      <Button size="sm" variant="soft" onClick={() => toSubstitutes(selectedStarter.player_id)}>
                        {t('formation.actions.toSubs')}
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => removeStarter(selectedStarter.player_id)}>
                        <X className="size-3.5" aria-hidden="true" />
                        {t('formation.actions.remove')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card
              title={t('formation.subsTitle')}
              bodyClassName="p-4"
            >
              <div
                ref={subsRef}
                className={`flex min-h-[76px] flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed p-3 transition-colors ${
                  drag?.over?.type === 'subs' && drag.from === 'pitch'
                    ? 'border-amber-400 bg-amber-50'
                    : 'border-slate-200 bg-slate-50/60'
                }`}
              >
                {state.substitutes.length === 0 ? (
                  <span className="w-full text-center text-xs font-semibold text-slate-400">{t('formation.subsEmpty')}</span>
                ) : (
                  state.substitutes.map((playerId) => {
                    const player = playersById[playerId]
                    return (
                      <span
                        key={playerId}
                        role="button"
                        tabIndex={0}
                        aria-label={t('formation.subChipLabel', { name: player?.name || playerId })}
                        onPointerDown={(event) => {
                          if (event.target.closest('button')) return
                          event.preventDefault()
                          startDrag(playerId, 'subs', event)
                        }}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') promoteToLineup(playerId)
                        }}
                        className="flex touch-auto cursor-grab items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1 ps-2 pe-1 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                      >
                        <span className="grid size-6 place-items-center rounded-full bg-amber-100 text-[11px] font-black text-amber-700">
                          {player?.number ?? '?'}
                        </span>
                        <span className="max-w-[110px] truncate text-xs font-bold text-slate-700">{player?.name}</span>
                        <button
                          type="button"
                          onClick={() => promoteToLineup(playerId)}
                          disabled={lineupFull}
                          aria-label={t('formation.actions.toLineup', { name: player?.name || '' })}
                          className="grid size-6 place-items-center rounded-full text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                        >
                          <Plus className="size-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => update((prev) => ({ substitutes: prev.substitutes.filter((id) => id !== playerId) }))}
                          aria-label={t('formation.actions.removeSub', { name: player?.name || '' })}
                          className="grid size-6 place-items-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                        >
                          <X className="size-3.5" aria-hidden="true" />
                        </button>
                      </span>
                    )
                  })
                )}
              </div>
            </Card>

            {/* Save bar */}
            <div
              className={`sticky bottom-4 z-20 flex flex-wrap items-center gap-3 rounded-3xl border p-4 shadow-lg backdrop-blur transition-colors ${
                dirty ? 'border-amber-300 bg-amber-50/95' : 'border-slate-200 bg-white/95'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-slate-900">
                  {dirty ? t('formation.unsavedTitle') : t('formation.savedOkTitle')}
                </p>
                <p className="text-[11px] font-semibold text-slate-500">
                  {t('formation.lineupCounter', { current: state.starters.length, max: maxStarters })}
                  {' · '}
                  {t('formation.subsCounter', { count: state.substitutes.length })}
                </p>
              </div>
              <Button variant="soft" onClick={() => guardAction(resetEditor)}>
                <RotateCcw className="size-4" aria-hidden="true" />
                {t('formation.actions.new')}
              </Button>
              <Button onClick={() => setSaveModal(true)}>
                <Save className="size-4" aria-hidden="true" />
                {state.formationId ? t('formation.actions.update') : t('formation.actions.save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Drag ghost */}
      {drag?.moved && (
        <div
          className="pointer-events-none fixed z-[200] -translate-x-1/2 -translate-y-1/2"
          style={{ left: drag.clientX, top: drag.clientY }}
          aria-hidden="true"
        >
          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black text-white shadow-xl ${dropValid ? 'bg-emerald-600' : 'bg-rose-500'}`}>
            {playersById[drag.playerId]?.number ?? '?'} · {playersById[drag.playerId]?.name}
          </span>
        </div>
      )}

      {/* Save modal */}
      <Modal
        open={saveModal}
        onClose={() => setSaveModal(false)}
        title={t('formation.saveModal.title')}
        subtitle={t('formation.saveModal.subtitle', { format: state.format })}
        size="sm"
      >
        <SaveForm
          key={`save-${state.formationId ?? 'new'}-${state.name}`}
          initialName={state.name}
          initialActive={state.isActive}
          saving={saving}
          submitLabel={state.formationId ? t('formation.actions.update') : t('formation.actions.save')}
          onSubmit={submitSave}
        />
      </Modal>

      {/* Rename modal */}
      <Modal
        open={renameModal}
        onClose={() => setRenameModal(false)}
        title={t('formation.renameModal.title')}
        size="sm"
      >
        <SaveForm
          key={`rename-${state.formationId ?? 'new'}-${state.name}`}
          initialName={state.name}
          initialActive={state.isActive}
          saving={saving}
          showActive={false}
          submitLabel={t('formation.renameModal.submit')}
          onSubmit={submitSave}
        />
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title={t('formation.deleteModal.title')}
        size="sm"
        footer={
          <>
            <Button variant="soft" onClick={() => setDeleteTarget(null)}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={() => submitDelete(deleteTarget)}>
              <Trash2 className="size-4" aria-hidden="true" />
              {t('formation.actions.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm font-semibold text-slate-600">
          {t('formation.deleteModal.body', { name: deleteTarget?.name || '' })}
        </p>
      </Modal>

      {/* Preset create / rename modal */}
      <Modal
        open={!!presetModal}
        onClose={() => setPresetModal(null)}
        title={presetModal?.mode === 'rename' ? t('formation.presetRenameTitle') : t('formation.presetModalTitle')}
        subtitle={presetModal?.mode === 'rename' ? presetModal?.preset?.label : t('formation.presetModalSubtitle', { format: state.format })}
        size="sm"
      >
        <PresetForm
          key={`${presetModal?.mode}-${presetModal?.preset?.key || 'new'}`}
          initialName={presetModal?.mode === 'rename' ? presetModal?.preset?.label : ''}
          submitLabel={presetModal?.mode === 'rename' ? t('formation.presetRenameSubmit') : t('formation.presetSaveSubmit')}
          onSubmit={presetModal?.mode === 'rename' ? submitPresetRename : submitPresetSave}
          onCancel={() => setPresetModal(null)}
        />
      </Modal>

      {/* Preset delete confirm */}
      <Modal
        open={!!presetDeleteTarget}
        onClose={() => setPresetDeleteTarget(null)}
        title={t('formation.presetDeleteTitle')}
        size="sm"
        footer={
          <>
            <Button variant="soft" onClick={() => setPresetDeleteTarget(null)}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={() => submitPresetDelete(presetDeleteTarget)}>
              <Trash2 className="size-4" aria-hidden="true" />
              {t('formation.actions.delete')}
            </Button>
          </>
        }
      >
        <p className="text-sm font-semibold text-slate-600">
          {t('formation.presetDeleteBody', { name: presetDeleteTarget?.label || '' })}
        </p>
      </Modal>

      {/* Unsaved-changes confirm */}
      <Modal
        open={!!confirmState}
        onClose={() => setConfirmState(null)}
        title={confirmState?.title || ''}
        size="sm"
        footer={
          <>
            <Button variant="soft" onClick={() => setConfirmState(null)}>{t('common.cancel')}</Button>
            <Button onClick={confirmState?.onConfirm}>{confirmState?.confirmLabel}</Button>
          </>
        }
      >
        {typeof confirmState?.body === 'string' ? (
        <p className="text-sm font-semibold text-slate-600">{confirmState.body}</p>
      ) : (
        <div className="text-sm font-semibold text-slate-600">{confirmState?.body}</div>
      )}
      </Modal>
    </div>
  )
}

function SaveForm({ initialName, initialActive, saving, submitLabel, onSubmit, showActive = true }) {
  const { t } = useTranslation()
  const [name, setName] = useState(initialName)
  const [isActive, setIsActive] = useState(initialActive)

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (!name.trim()) return
        onSubmit({ name, isActive })
      }}
      className="space-y-4"
    >
      <Field label={t('formation.nameLabel')} required>
        <input
          className={inputClass}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={255}
          required
          autoFocus
        />
      </Field>
      {showActive && (
        <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(event) => setIsActive(event.target.checked)}
            className="size-4 accent-emerald-600"
          />
          {t('formation.setActive')}
        </label>
      )}
      <div className="flex justify-end">
        <Button type="submit" loading={saving} disabled={!name.trim()}>
          <Save className="size-4" aria-hidden="true" />
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

function PresetForm({ initialName, submitLabel, onSubmit, onCancel }) {
  const { t } = useTranslation()
  const [name, setName] = useState(initialName)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    try {
      await onSubmit(name.trim())
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      className="space-y-4"
    >
      <Field label={t('formation.presetNameLabel')} required>
        <input
          className={inputClass}
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={255}
          required
          autoFocus
        />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="soft" onClick={onCancel}>{t('common.cancel')}</Button>
        <Button type="submit" loading={busy} disabled={!name.trim()}>
          <Save className="size-4" aria-hidden="true" />
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
