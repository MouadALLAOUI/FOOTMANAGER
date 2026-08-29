import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertTriangle,
  CalendarDays,
  CalendarPlus,
  CheckCircle2,
  ListChecks,
  Lock,
  Loader2,
  Landmark,
  Play,
  RefreshCw,
  RotateCcw,
  Search,
  SkipForward,
  Sparkles,
  Swords,
  Trash2,
  Users,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Badge, Button, Empty, Field, FieldRow, Modal, SkeletonCards, Toggle, inputClass, selectClass } from '../../../components/dashboard/ui'
import TimePicker from '../../../components/TimePicker'
import MatchCard from '../../../domains/committee/components/MatchCard'
import FilterBar from '../../../domains/committee/components/FilterBar'
import Drawer from '../../../components/dashboard/Drawer'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import { LIVE_STATUSES } from '../../../data/fixtures'
import MatchControlRoom from './MatchControlRoom'
import MatchDetailsModal from '../../../domains/committee/components/MatchDetailsModal'
import RescheduleDrawer from '../../../domains/committee/components/RescheduleDrawer'
import RoundNav from '../../../domains/committee/components/RoundNav'
import SummaryChips from '../../../domains/committee/components/SummaryChips'
import KnockoutOptionModal from '../../../domains/committee/components/KnockoutOptionModal'
import { ODD_KO_OPTIONS, ODD_KO_TITLE_KEYS } from '../../../domains/committee/lib/knockoutOptions'


function fixtureStatus(f) {
  const m = f.match
  if (f.status === 'cancelled' || m?.status === 'cancelled') return 'cancelled'
  if (f.status === 'postponed' || m?.status === 'postponed') return 'postponed'
  if (m?.status === 'finished') return 'completed'
  if (LIVE_STATUSES.has(m?.status)) return 'live'
  if (f.scheduled_at && new Date(f.scheduled_at) > Date.now()) return 'upcoming'
  return 'pending'
}

function roundOptions(structure) {
  return {
    group: (structure?.group_stage || []).map((s) => ({ key: `m${s.matchday}`, label: `round:${s.matchday}` })),
    knockout: (structure?.knockout || []).map((s) => ({ key: `r${s.round_id}`, label: `ko:${s.round_id}`, name: s.name })),
  }
}

const ROUND_STATE_UI = {
  locked: {
    icon: Lock,
    cls: 'bg-slate-100 text-slate-500',
    labelKey: 'committee.detail.roundState.locked',
    descKey: 'committee.detail.roundStateDesc.locked',
  },
  available: {
    icon: Play,
    cls: 'bg-green-50 text-green-700',
    labelKey: 'committee.detail.roundState.available',
    descKey: 'committee.detail.roundStateDesc.available',
  },
  in_progress: {
    icon: Loader2,
    cls: 'bg-amber-50 text-amber-700',
    labelKey: 'committee.detail.roundState.inProgress',
    descKey: 'committee.detail.roundStateDesc.inProgress',
  },
  completed: {
    icon: CheckCircle2,
    cls: 'bg-emerald-50 text-emerald-700',
    labelKey: 'committee.detail.roundState.completed',
    descKey: 'committee.detail.roundStateDesc.completed',
  },
}

const fmtDateTime = (dateStr, timeStr) => {
  const d = new Date(`${dateStr}T${timeStr || '00:00'}`)
  const day = d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' })
  return `${day} · ${timeStr}`
}

export default function FixturesTab({ tournament, refresh, refreshKey }) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [active, setActive] = useState(null)
  const [filters, setFilters] = useState({ status: 'all', group: 'all', stadium: 'all', date: 'all', customDate: '', q: '' })
  const [queryInput, setQueryInput] = useState('')
  const [genOpen, setGenOpen] = useState(false)
  const [genView, setGenView] = useState('form')
  const [plan, setPlan] = useState(null)
  const [conflictModal, setConflictModal] = useState(false)
  const [resultFixture, setResultFixture] = useState(null)
  const [detailsFixture, setDetailsFixture] = useState(null)
  const [rescheduleFixture, setRescheduleFixture] = useState(null)
  const [busy, setBusy] = useState(null)
  const [prevState, setPrevState] = useState(null)
  const [form, setForm] = useState({
    stage: 'group',
    starts_on: '',
    default_time: '20:00',
    double_round_robin: false,
    stadium_ids: [],
  })
  const [koData, setKoData] = useState(null)
  const [qualified, setQualified] = useState([])
  const qualifiedAutoFilled = useRef(false)
  const [koValidation, setKoValidation] = useState(null)
  const [koOddOpen, setKoOddOpen] = useState(false)
  const [koOptionOpen, setKoOptionOpen] = useState(false)

  const hasKnockoutStage = tournament.tournament_format !== 'groups_only' && tournament.tournament_format !== 'league'

  const { data: structure, loading: structureLoading, refetch: refetchStructure } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/match-rounds`).then((r) => r.data.data),
    [tournament.id, refreshKey],
    { staleTime: 0 },
  )

  useEffect(() => {
    if (!structure) return
    const valid = active
      ? active.type === 'group'
        ? structure.group_stage?.some((s) => s.matchday === active.matchday)
        : structure.knockout?.some((s) => s.round_id === active.round_id)
      : false
    if (valid) return
    const g = structure.group_stage?.[0]
    if (g) {
      setActive({ type: 'group', matchday: g.matchday })
      return
    }
    const k = structure.knockout?.[0]
    if (k) setActive({ type: 'knockout', round_id: k.round_id })
  }, [structure])

  const isGroup = active?.type === 'group'
  const activeKey = active ? (isGroup ? `m${active.matchday}` : `r${active.round_id}`) : null
  const roundParams = active ? (isGroup ? { matchday: active.matchday } : { round_id: active.round_id }) : {}

  const { data: fixtures, loading: fixturesLoading, refetch: refetchFixtures } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/fixtures`, { params: roundParams }).then((r) => r.data.data),
    [tournament.id, activeKey],
    { queryKey: ['committee-tournament-fixtures', tournament.id, refreshKey, activeKey], enabled: Boolean(activeKey), staleTime: 0, keepPrevious: true },
  )

  useEffect(() => {
    setQueryInput('')
    setFilters((f) => ({ ...f, status: 'all', group: 'all', stadium: 'all', date: 'all', customDate: '', q: '' }))
    setPrevState(null)
  }, [activeKey])

  useEffect(() => {
    const id = setTimeout(() => setFilters((f) => ({ ...f, q: queryInput })), 300)
    return () => clearTimeout(id)
  }, [queryInput])

  const hasRounds = (structure?.group_stage?.length || 0) + (structure?.knockout?.length || 0) > 0
  const hasAnyFixtures =
    (structure?.group_stage?.length || 0) + (structure?.knockout || []).reduce((sum, r) => sum + (r.total || 0), 0) > 0

  const summary = active
    ? isGroup
      ? structure?.group_stage?.find((s) => s.matchday === active.matchday)
      : structure?.knockout?.find((s) => s.round_id === active.round_id)
    : null

  const roundLocked = useMemo(() => {
    if (!structure || !active) return false
    const closed = (s) => (s.completed + (s.cancelled || 0) + (s.postponed || 0)) >= (s.total || 0)
    if (active.type === 'knockout') {
      const round = structure.knockout?.find((s) => s.round_id === active.round_id)
      if (round?.status) return round.status === 'locked'
      const ko = structure.knockout || []
      const idx = ko.findIndex((s) => s.round_id === active.round_id)
      if (idx <= 0) return false
      return !ko.slice(0, idx).every(closed)
    }
    const matchdays = structure.group_stage || []
    const idx = matchdays.findIndex((s) => s.matchday === active.matchday)
    if (idx <= 0) return false
    return !matchdays.slice(0, idx).every(closed)
  }, [structure, active])

  const roundState = isGroup ? null : (summary?.status || null)
  const stateMeta = roundState ? ROUND_STATE_UI[roundState] : null

  const groups = useMemo(() => {
    const map = new Map()
    for (const f of fixtures || []) if (f.group) map.set(f.group.id, f.group.name)
    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [fixtures])

  const prevRoundKey = useMemo(() => {
    if (!structure || !active) return null
    if (isGroup) {
      const matchdays = structure.group_stage || []
      const idx = matchdays.findIndex((s) => s.matchday === active.matchday)
      if (idx <= 0) return null
      return `m${matchdays[idx - 1].matchday}`
    }
    const ko = structure.knockout || []
    const idx = ko.findIndex((s) => s.round_id === active.round_id)
    if (idx <= 0) return null
    return `r${ko[idx - 1].round_id}`
  }, [structure, active, isGroup])

  const openPrev = async () => {
    const key = prevRoundKey
    if (!key) return
    setPrevState({ key, fixtures: [], loading: true })
    try {
      const params = key.startsWith('m')
        ? { matchday: Number(key.slice(1)) }
        : { round_id: Number(key.slice(1)) }
      const r = await api.get(`/committee/tournaments/${tournament.id}/fixtures`, { params })
      setPrevState({ key, fixtures: r.data.data, loading: false })
    } catch {
      setPrevState({ key, fixtures: [], loading: false })
    }
  }

  const prevData = prevState && prevState.key === prevRoundKey ? prevState : null


  const stadiums = useMemo(() => {
    const map = new Map()
    for (const f of fixtures || []) if (f.stadium) map.set(f.stadium.id, f.stadium.name)
    return [...map.entries()].map(([id, name]) => ({ id, name }))
  }, [fixtures])

  const filtered = useMemo(() => {
    let list = fixtures || []
    if (filters.status !== 'all') list = list.filter((f) => fixtureStatus(f) === filters.status)
    if (isGroup && filters.group !== 'all') list = list.filter((f) => f.group?.id === filters.group)
    if (filters.stadium !== 'all') list = list.filter((f) => f.stadium?.id === filters.stadium)
    if (filters.date !== 'all') {
      const now = new Date()
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      const tomorrow = new Date(today)
      tomorrow.setDate(today.getDate() + 1)
      const weekEnd = new Date(today)
      weekEnd.setDate(today.getDate() + 7)
      list = list.filter((f) => {
        if (!f.scheduled_at) return false
        const d = new Date(f.scheduled_at)
        const day = new Date(d.getFullYear(), d.getMonth(), d.getDate())
        if (filters.date === 'today') return +day === +today
        if (filters.date === 'tomorrow') return +day === +tomorrow
        if (filters.date === 'week') return day >= today && day < weekEnd
        if (filters.date === 'custom' && filters.customDate) return +day === +new Date(`${filters.customDate}T00:00:00`)
        return true
      })
    }
    if (filters.q.trim()) {
      const q = filters.q.trim().toLowerCase()
      list = list.filter((f) => (f.home_team?.name || '').toLowerCase().includes(q) || (f.away_team?.name || '').toLowerCase().includes(q))
    }
    return list
  }, [fixtures, filters, isGroup])

  const sections = useMemo(() => {
    if (isGroup) {
      const map = new Map()
      for (const f of filtered) {
        const gid = f.group?.id ?? 'unassigned'
        if (!map.has(gid)) map.set(gid, [])
        map.get(gid).push(f)
      }
      const entries = [...map.entries()].sort((a, b) => (a[1][0].group?.name || '').localeCompare(b[1][0].group?.name || '', 'ar'))
      let n = 0
      return entries.map(([_gid, list]) => ({ group: list[0].group, items: list.map((f) => ({ f, number: ++n })) }))
    }
    return [{ group: null, items: (filtered || []).map((f, i) => ({ f, number: i + 1 })) }]
  }, [filtered, isGroup])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const toggleStadium = (id) => setForm((f) => ({ ...f, stadium_ids: f.stadium_ids.includes(id) ? f.stadium_ids.filter((x) => x !== id) : [...f.stadium_ids, id] }))

  const terrainParams = useMemo(
    () => ({ date: form.starts_on || undefined, time: form.default_time }),
    [form.starts_on, form.default_time],
  )

  const { data: genTerrains } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/fixtures/terrains`, { params: terrainParams }).then((r) => r.data.data),
    [tournament.id, form.starts_on, form.default_time],
    { enabled: genOpen, staleTime: 0 },
  )

  const { data: rescheduleTerrains } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/fixtures/terrains`, {
      params: {
        date: rescheduleFixture?.scheduled_at?.slice(0, 10),
        time: rescheduleFixture?.scheduled_at?.slice(11, 16),
      },
    }).then((r) => r.data.data),
    [tournament.id, rescheduleFixture?.scheduled_at],
    { enabled: Boolean(rescheduleFixture) },
  )

  const terrainList = genTerrains?.terrains || []
  const unavailableCount = (genTerrains?.total || 0) - (genTerrains?.available || 0)

  useEffect(() => {
    if (!genOpen || form.stage !== 'knockout') return
    let cancelled = false
    const load = async () => {
      try {
        const [k, v] = await Promise.all([
          api.get(`/committee/tournaments/${tournament.id}/fixtures/knockout-qualified`),
          api.get(`/committee/tournaments/${tournament.id}/bracket/validation`),
        ])
        if (cancelled) return
        setKoData(k.data?.data || null)
        setKoValidation(v.data?.data || null)
      } catch {
        if (!cancelled) {
          setKoData({ expected: 0, teams: [], count: 0 })
          setKoValidation(null)
        }
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [genOpen, form.stage, tournament.id])

  useEffect(() => {
    if (!koData || !koData.expected || qualifiedAutoFilled.current) return
    qualifiedAutoFilled.current = true
    const teams = koData.teams || []
    setQualified(
      Array.from({ length: koData.expected }, (_, i) =>
        teams[i] ? { team_id: teams[i].team_id, name: teams[i].name } : null,
      ),
    )
  }, [koData])

  const teamNameById = useMemo(() => {
    const map = new Map()
    for (const team of koData?.teams || []) if (!map.has(team.team_id)) map.set(team.team_id, team)
    return map
  }, [koData])

  const resetQualified = () => {
    const teams = koData?.teams || []
    setQualified(
      Array.from({ length: koData?.expected || 0 }, (_, i) =>
        teams[i] ? { team_id: teams[i].team_id, name: teams[i].name } : null,
      ),
    )
  }

  const setSlot = (index) => (e) => {
    const teamId = Number(e.target.value)
    const entry = teamId ? teamNameById.get(teamId) : null
    setQualified((prev) => {
      const next = prev.slice()
      next[index] = entry ? { team_id: entry.team_id, name: entry.name } : null
      return next
    })
  }

  const qualifiedFilled = qualified.filter(Boolean)
  const qualifiedComplete = form.stage !== 'knockout' || qualifiedFilled.length === (koData?.expected || 0)
  const koStandingsReady = form.stage !== 'knockout' || !koData || (koData.count > 0 && koData.count >= (koData.expected || 0))

  const stageHasFixtures = (stage) => {
    if (!structure) return false
    if (stage === 'knockout') return (structure.knockout || []).some((s) => (s.total || 0) > 0)
    return (structure.group_stage || []).some((s) => (s.total || 0) > 0)
  }

  const afterChange = () => {
    refetchFixtures()
    refetchStructure()
    refresh()
  }

  const openDrawer = (target) => {
    setPlan(null)
    setGenView('form')
    setConflictModal(false)
    setKoData(null)
    setKoValidation(null)
    setKoOptionOpen(false)
    setQualified([])
    qualifiedAutoFilled.current = false
    const nextStage = target === 'knockout' || target === 'group'
      ? target
      : target === 'regenerate'
        ? (isGroup ? 'group' : 'knockout')
        : (isGroup ? 'group' : 'knockout')
    // If no fixtures at all, default to group (first stage) unless explicitly knockout
    const fallbackStage = !hasAnyFixtures && target !== 'knockout' ? 'group' : nextStage
    setForm((f) => ({ ...f, stage: fallbackStage, stadium_ids: [] }))
    setGenOpen(true)
  }

  const buildPayload = (strategy, regenerate) => {
    const base = {
      stage: form.stage,
      starts_on: form.starts_on || undefined,
      default_time: form.default_time || undefined,
      stadium_ids: form.stadium_ids.length ? form.stadium_ids : undefined,
      regenerate,
      conflict_strategy: strategy,
    }
    if (form.stage === 'knockout') {
      base.team_ids = qualifiedFilled.map((q) => q.team_id)
      base.double_round_robin = undefined
    } else {
      base.double_round_robin = form.double_round_robin
      base.team_ids = undefined
    }
    return base
  }

  const previewPlan = async (skipKoGate = false) => {
    if (form.stage === 'knockout') {
      if (!koStandingsReady) {
        toast.error(t('committee.detail.standingsNotReady'))
        return
      }
      if (!skipKoGate && koValidation?.status === 'choice' && koData?.count === koData?.expected) {
        if ((koValidation?.options || []).includes('bye_final') || (koValidation?.options || []).includes('playin')) {
          setKoOddOpen(true)
        } else {
          setKoOptionOpen(true)
        }
        return
      }
      if (koValidation?.status === 'invalid') {
        toast.error(t('committee.detail.knockout6.invalidTeams', { count: koData?.count || 0 }))
        return
      }
      if (!qualifiedComplete) {
        toast.error(t('committee.detail.fillAllSlots'))
        return
      }
    }
    setBusy('preview')
    try {
      const r = await api.post(`/committee/tournaments/${tournament.id}/fixtures/preview`, buildPayload('abort', false))
      const data = r.data?.data || null
      setPlan(data)
      if (data && data.conflicts > 0) {
        setGenView('review')
        setConflictModal(true)
      } else if (data && data.matches.length === 0) {
        toast.error(t('committee.detail.noMatchesForRound'))
      } else {
        setGenView('review')
      }
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  const confirmKoOption = async (mode) => {
    if (busy) return
    setBusy('ko-option')
    try {
      if (mode === 'groups6') {
        await api.post(`/committee/tournaments/${tournament.id}/bracket`, { mode: 'groups6' })
        setKoOptionOpen(false)
        setForm((f) => ({ ...f, stage: 'group' }))
        refetchStructure()
        toast.success(t('committee.detail.knockout6.groupsReady'))
      } else if (mode === 'playin' || mode === 'bye_final') {
        await api.post(`/committee/tournaments/${tournament.id}/bracket`, { mode })
        const v = await api.get(`/committee/tournaments/${tournament.id}/bracket/validation`)
        setKoValidation(v.data?.data || null)
        setKoOddOpen(false)
        refetchStructure()
        await previewPlan(true)
      } else {
        setKoOptionOpen(false)
        await previewPlan(true)
      }
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  const confirmGenerate = async (strategy) => {
    setBusy(strategy)
    try {
      const r = await api.post(`/committee/tournaments/${tournament.id}/fixtures`, buildPayload(strategy, stageHasFixtures(form.stage)))
      const data = r.data?.data || {}
      const msg = data.skipped > 0
        ? t('committee.detail.generatedWithSkipped', { generated: data.generated, skipped: data.skipped })
        : r.data?.message || t('committee.detail.fixturesGenerated')
      toast.success(msg)
      setGenOpen(false)
      afterChange()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  const removeAll = async () => {
    if (!window.confirm(t('committee.detail.deleteFixturesConfirm'))) return
    setBusy('del')
    try {
      const r = await api.delete(`/committee/tournaments/${tournament.id}/fixtures`)
      toast.success(r.data?.message || t('committee.detail.fixturesDeleted'))
      afterChange()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  const postponeMatch = async (f) => {
    if (!window.confirm(t('committee.detail.postponeConfirm'))) return
    setBusy(f.id)
    try {
      await api.post(`/committee/tournaments/${tournament.id}/fixtures/${f.id}/postpone`)
      toast.success(t('committee.detail.matchPostponed'))
      afterChange()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  const cancelMatch = async (f) => {
    if (!window.confirm(t('committee.detail.cancelMatchConfirm'))) return
    setBusy(f.id)
    try {
      await api.post(`/committee/tournaments/${tournament.id}/fixtures/${f.id}/cancel`)
      toast.success(t('committee.detail.matchCancelled'))
      afterChange()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  const restoreMatch = async (f) => {
    setBusy(f.id)
    try {
      await api.post(`/committee/tournaments/${tournament.id}/fixtures/${f.id}/restore`)
      toast.success(t('committee.detail.matchRestored'))
      afterChange()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  const selectByKey = (key) => {
    if (!key) return
    if (key.startsWith('m')) setActive({ type: 'group', matchday: Number(key.slice(1)) })
    else setActive({ type: 'knockout', round_id: Number(key.slice(1)) })
  }

  if (structureLoading) {
    return <SkeletonCards count={3} />
  }

  const stageSegmented = (
    <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-100 p-1">
      <button
        type="button"
        onClick={() => setForm((f) => ({ ...f, stage: 'group' }))}
        className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${form.stage === 'group' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
      >
        {t('committee.detail.groupStage')}
      </button>
      {hasKnockoutStage && (
        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, stage: 'knockout' }))}
          className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${form.stage === 'knockout' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
        >
          {t('committee.detail.knockoutLabel')}
        </button>
      )}
    </div>
  )

  const stadiumPicker = (
    <Field
      label={t('committee.detail.pickStadiums')}
      hint={unavailableCount > 0 ? t('committee.detail.terrainUnavailableNote', { count: unavailableCount, date: genTerrains?.date, time: genTerrains?.time }) : undefined}
    >
      {terrainList.length === 0 ? (
        <div className="flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] font-bold text-amber-700">
          <AlertTriangle className="size-4 shrink-0" />
          {t('committee.detail.noTournamentStadiums')}
        </div>
      ) : (
        <div className="grid max-h-[42vh] gap-2 overflow-y-auto pe-1">
          {terrainList.map((s) => {
            const checked = form.stadium_ids.includes(s.id)
            const available = s.slot_available !== false
            return (
              <button
                key={s.id}
                type="button"
                disabled={!available}
                onClick={() => toggleStadium(s.id)}
                className={`flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-start transition-colors ${checked
                  ? 'border-green-400 bg-green-50'
                  : available
                    ? 'border-slate-200 bg-white hover:bg-slate-50'
                    : 'border-slate-200 bg-slate-50 opacity-70'
                  } disabled:cursor-not-allowed`}
              >
                {s.cover_image_url ? (
                  <img src={s.cover_image_url} alt="" className="size-12 shrink-0 rounded-xl object-cover" />
                ) : (
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-300">
                    <Landmark className="size-5" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-bold text-slate-800">{s.name}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px]">
                    {s.city && <span className="text-slate-400">{s.city}</span>}
                    {s.type && <span className="text-slate-400">· {s.type}</span>}
                    {s.price_per_hour != null && (
                      <span className="font-bold text-slate-500">{t('committee.detail.terrainPricePerHour', { price: s.price_per_hour })}</span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-1">
                    {available ? (
                      <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        {t('committee.detail.terrainAvailableSlot')}
                      </span>
                    ) : (
                      <span className="rounded-lg bg-amber-200/70 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        {s.unavailable_reason}
                      </span>
                    )}
                    {s.supports_tournaments && (
                      <span className="rounded-lg bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                        {t('committee.detail.terrainSupportsTournaments')}
                      </span>
                    )}
                  </div>
                </div>
                <span className={`grid size-5 shrink-0 place-items-center rounded-md border text-white ${checked ? 'border-green-500 bg-green-500' : 'border-slate-300 bg-white'}`}>
                  {checked && <span className="text-[11px] font-black">✓</span>}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </Field>
  )

  const knockoutTeamsEditor = (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-black text-slate-800">{t('committee.detail.knockoutTeams')}</p>
        <Button variant="ghost" size="sm" onClick={resetQualified}>
          <RotateCcw className="size-3.5" />
          {t('committee.detail.resetFromStandings')}
        </Button>
      </div>
      {!koData ? (
        <div className="grid gap-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-11 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : koData.expected === 0 ? (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[11px] font-bold text-slate-500">
          <AlertTriangle className="size-4 shrink-0" />
          {t('committee.detail.noKnockoutInFormat')}
        </div>
      ) : koValidation?.status === 'invalid' && koData.count === koData.expected ? (
        <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-3.5 py-3 text-[11px] font-bold text-red-700">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            {t('committee.detail.knockout6.invalidTeams', { count: koData.count })}
            <span className="mt-1 block font-medium">{t('committee.detail.knockout6.invalidTeamsDesc')}</span>
          </span>
        </div>
      ) : koValidation?.status === 'choice' && (koValidation?.options || []).includes('bye_final') && koData.count === koData.expected ? (
        <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] font-bold text-amber-700">
          <AlertTriangle className="size-4 shrink-0" />
          <span>{t('committee.detail.oddKo.banner', { count: koData.count })}</span>
          <span className="flex flex-wrap items-center gap-1 font-black">
            {(koValidation?.trail || [1]).map((step, i) => (
              <span key={step} className="flex items-center gap-1">
                {i > 0 && <span className="text-amber-400">←</span>}
                <span className="rounded-lg bg-white px-1.5 py-0.5 ring-1 ring-amber-200">{step}</span>
              </span>
            ))}
          </span>
        </div>
      ) : koData.count < koData.expected ? (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] font-bold text-amber-700">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            {t('committee.detail.insufficientTeams', { available: koData.count, expected: koData.expected })}
            {koData.count === 0 && <span className="mt-1 block font-medium">{t('committee.detail.standingsNotReady')}</span>}
          </span>
        </div>
      ) : (
        <div className="grid max-h-[32vh] gap-1.5 overflow-y-auto pe-1">
          {qualified.map((slot, index) => {
            const usedElsewhere = new Set(qualified.map((q) => q?.team_id).filter((id, i) => id && i !== index))
            return (
              <div key={index} className="flex items-center gap-2">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-slate-900 text-[11px] font-black text-white">
                  {index + 1}
                </span>
                <select className={selectClass} value={slot?.team_id ?? ''} onChange={setSlot(index)}>
                  <option value="">—</option>
                  {[...teamNameById.values()]
                    .filter((team) => !usedElsewhere.has(team.team_id))
                    .map((team) => (
                      <option key={team.team_id} value={team.team_id}>
                        {team.rank ? `#${team.rank} ` : ''}{team.name}{team.group_name ? ` (${team.group_name})` : ''}
                      </option>
                    ))}
                </select>
              </div>
            )
          })}
        </div>
      )}
      <p className="text-[11px] leading-relaxed text-slate-400">{t('committee.detail.knockoutTeamsDesc')}</p>
    </div>
  )

  const planSummary = plan && (
    <div className="flex flex-wrap gap-2">
      <Badge variant="info">
        <ListChecks className="size-3.5" />
        {t('committee.detail.planMatches', { count: plan.matches.length })}
      </Badge>
      {plan.conflicts > 0 && (
        <Badge variant="danger">
          <AlertTriangle className="size-3.5" />
          {t('committee.detail.planConflicts', { count: plan.conflicts })}
        </Badge>
      )}
      {plan.skipped > 0 && (
        <Badge variant="neutral">
          <SkipForward className="size-3.5" />
          {t('committee.detail.planSkipped', { count: plan.skipped })}
        </Badge>
      )}
    </div>
  )

  const planList = plan && (
    <div className="max-h-[42vh] space-y-1.5 overflow-y-auto pe-1">
      {plan.matches.length === 0 && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-xs font-bold text-slate-400">
          {t('committee.detail.noMatchesForRound')}
        </div>
      )}
      {plan.matches.map((m, i) => {
        const conflicted = (m.conflicts || []).length > 0
        return (
          <div key={i} className={`rounded-2xl border px-3.5 py-2.5 ${conflicted ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'}`}>
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-xs font-black text-slate-800">
                  {m.group_name ? `${m.group_name} · ` : ''}{m.round_name ? `${m.round_name} · ` : ''}{t('committee.detail.round', { n: m.matchday })}
                </p>
              </div>
              <p className="shrink-0 text-[10px] font-bold text-slate-400">{fmtDateTime(m.date, m.time)}</p>
            </div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="truncate text-xs font-bold text-slate-600">{m.home_team_name || t('committee.detail.tbd')}</p>
              <span className="shrink-0 text-[10px] font-black text-slate-400">VS</span>
              <p className="truncate text-xs font-bold text-slate-600">{m.away_team_name || t('committee.detail.tbd')}</p>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {m.stadium_name ? (
                <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">{m.stadium_name}</span>
              ) : (
                <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-400">{t('committee.detail.noStadium')}</span>
              )}
              {(m.conflicts || []).map((reason, ri) => (
                <span key={ri} className="rounded-lg bg-amber-200/70 px-2 py-0.5 text-[10px] font-bold text-amber-800">{reason}</span>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )

  const overlays = (
    <>
      <Drawer
        open={genOpen}
        onClose={() => setGenOpen(false)}
        title={t('committee.detail.generateFixtures')}
        subtitle={t('committee.detail.generateFixturesDesc')}
      >
        <div className="space-y-5">
          {stageSegmented}

          {genView === 'form' ? (
            <>
              {form.stage === 'group' ? (
                <>
                  <FieldRow>
                    <Field label={t('committee.detail.startDate')}>
                      <input type="date" className={inputClass} value={form.starts_on} onChange={set('starts_on')} />
                    </Field>
                    <Field label={t('committee.detail.defaultTime')}>
                      <TimePicker
                        value={form.default_time}
                        onChange={(v) => setForm((f) => ({ ...f, default_time: v }))}
                        labels={{ ok: t('common.save'), cancel: t('common.cancel') }}
                      />
                    </Field>
                  </FieldRow>

                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{t('committee.detail.doubleRound')}</p>
                      <p className="text-[11px] text-slate-400">{t('committee.detail.doubleRoundDesc')}</p>
                    </div>
                    <Toggle checked={form.double_round_robin} onChange={(v) => setForm((f) => ({ ...f, double_round_robin: v }))} label={t('committee.detail.doubleRound')} />
                  </div>
                </>
              ) : (
                <>
                  {knockoutTeamsEditor}
                  <FieldRow>
                    <Field label={t('committee.detail.startDate')}>
                      <input type="date" className={inputClass} value={form.starts_on} onChange={set('starts_on')} />
                    </Field>
                    <Field label={t('committee.detail.defaultTime')}>
                      <TimePicker
                        value={form.default_time}
                        onChange={(v) => setForm((f) => ({ ...f, default_time: v }))}
                        labels={{ ok: t('common.save'), cancel: t('common.cancel') }}
                      />
                    </Field>
                  </FieldRow>
                </>
              )}

              {stadiumPicker}

              <div className="sticky bottom-0 -mx-6 flex gap-2 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
                <Button className="flex-1" loading={busy === 'preview'} onClick={previewPlan}>
                  <ListChecks className="size-4" />
                  {t('committee.detail.previewFixtures')}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setGenOpen(false)}>{t('common.cancel')}</Button>
              </div>
            </>
          ) : (
            <>
              <div>
                <p className="text-xs font-black text-slate-800">{t('committee.detail.reviewPlan')}</p>
                <div className="mt-2">{planSummary}</div>
              </div>
              {planList}
              <div className="sticky bottom-0 -mx-6 flex flex-col gap-2 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
                {plan && plan.conflicts > 0 ? (
                  <>
                    <div className="flex gap-2">
                      <Button className="flex-1" loading={busy === 'auto_roll'} onClick={() => confirmGenerate('auto_roll')}>
                        <Sparkles className="size-4" />
                        {t('committee.detail.autoRoll')}
                      </Button>
                      <Button variant="soft" className="flex-1" loading={busy === 'skip'} onClick={() => confirmGenerate('skip')}>
                        <SkipForward className="size-4" />
                        {t('committee.detail.skipConflicts')}
                      </Button>
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => { setGenView('form'); setPlan(null) }}>
                      {t('committee.detail.backToEdit')}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button className="w-full" loading={busy === 'abort'} onClick={() => confirmGenerate('abort')}>
                      <CalendarPlus className="size-4" />
                      {t('committee.detail.confirmGenerate')}
                    </Button>
                    <Button variant="outline" className="w-full" onClick={() => { setGenView('form'); setPlan(null) }}>
                      {t('committee.detail.backToEdit')}
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </Drawer>

      <Modal
        open={conflictModal}
        onClose={() => setConflictModal(false)}
        title={t('committee.detail.conflictsFound')}
        subtitle={t('committee.detail.conflictsFoundDesc')}
      >
        <div className="flex flex-col gap-2">
          <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-[11px] font-bold text-amber-700">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{t('committee.detail.planConflicts', { count: plan?.conflicts || 0 })}</span>
          </div>
          <Button className="w-full" loading={busy === 'auto_roll'} onClick={() => { setConflictModal(false); confirmGenerate('auto_roll') }}>
            <Sparkles className="size-4" />
            <span className="flex flex-col items-start">
              <span>{t('committee.detail.autoRoll')}</span>
              <span className="text-[10px] font-medium opacity-80">{t('committee.detail.autoRollDesc')}</span>
            </span>
          </Button>
          <Button variant="soft" className="w-full" loading={busy === 'skip'} onClick={() => { setConflictModal(false); confirmGenerate('skip') }}>
            <SkipForward className="size-4" />
            <span className="flex flex-col items-start">
              <span>{t('committee.detail.skipConflicts')}</span>
              <span className="text-[10px] font-medium opacity-80">{t('committee.detail.skipConflictsDesc')}</span>
            </span>
          </Button>
          <Button variant="outline" className="w-full" onClick={() => setConflictModal(false)}>{t('common.cancel')}</Button>
        </div>
      </Modal>

      <KnockoutOptionModal open={koOptionOpen} onClose={() => setKoOptionOpen(false)} onConfirm={confirmKoOption} busy={busy === 'ko-option'} />

      <KnockoutOptionModal
        open={koOddOpen}
        options={ODD_KO_OPTIONS}
        titleKey={ODD_KO_TITLE_KEYS.titleKey}
        descKey={ODD_KO_TITLE_KEYS.descKey}
        recommendedKey={ODD_KO_TITLE_KEYS.recommendedKey}
        trail={koValidation?.trail}
        onClose={() => setKoOddOpen(false)}
        onConfirm={confirmKoOption}
        busy={busy === 'ko-option'}
      />

      {resultFixture && (
        <MatchControlRoom
          fixture={resultFixture}
          tournament={tournament}
          onClose={() => setResultFixture(null)}
          onSaved={() => {
            setResultFixture(null)
            afterChange()
          }}
        />
      )}

      {detailsFixture && <MatchDetailsModal fixture={detailsFixture} onClose={() => setDetailsFixture(null)} />}
      {rescheduleFixture && (
        <RescheduleDrawer
          fixture={rescheduleFixture}
          tournament={tournament}
          stadiums={rescheduleTerrains?.terrains || []}
          onClose={() => setRescheduleFixture(null)}
          onSaved={() => {
            setRescheduleFixture(null)
            afterChange()
          }}
        />
      )}
    </>
  )

  if (!hasAnyFixtures) {
    return (
      <>
        <Empty
          icon={Swords}
          title={t('committee.detail.noFixtures')}
          description={t('committee.detail.noFixturesDesc')}
          action={
            <Button size="sm" onClick={() => openDrawer()}>
              <CalendarPlus className="size-4" />
              {t('committee.detail.generateFixtures')}
            </Button>
          }
        />
        {overlays}
      </>
    )
  }

  const options = roundOptions(structure)

  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <RoundNav structure={structure} active={active} onSelect={setActive} />
        </aside>

        <div className="min-w-0 space-y-4">
          <div className="lg:hidden">
            <label className="mb-1.5 block text-xs font-bold text-slate-500">{t('committee.detail.stagesTitle')}</label>
            <select
              className={selectClass}
              value={activeKey || ''}
              onChange={(e) => selectByKey(e.target.value)}
            >
              {options.group.length > 0 && (
                <optgroup label={t('committee.detail.groupStage')}>
                  {options.group.map((o) => (
                    <option key={o.key} value={o.key}>{t('committee.detail.round', { n: o.label.split(':')[1] })}</option>
                  ))}
                </optgroup>
              )}
              {options.knockout.length > 0 && (
                <optgroup label={t('committee.detail.knockoutStages')}>
                  {options.knockout.map((o) => (
                    <option key={o.key} value={o.key}>{o.name}</option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-black tracking-tight text-slate-900">
                {isGroup ? t('committee.detail.round', { n: active.matchday }) : summary?.name || ''}
              </h3>
              <SummaryChips summary={summary} />
            </div>
            {(() => {
              const hasPlayed = (structure?.group_stage || []).some((s) => (s.completed || 0) > 0) || (structure?.knockout || []).some((s) => (s.completed || 0) > 0)
              return (
                <div className="flex flex-wrap gap-2">
                  {hasRounds ? (
                    <>
                      <Button size="sm" variant="outline" disabled={hasPlayed} title={hasPlayed ? t('committee.detail.regenerateBlocked') : undefined} onClick={() => openDrawer('regenerate')}>
                        <RefreshCw className="size-4" />
                        {t('committee.detail.regenerate')}
                      </Button>
                      <Button size="sm" variant="dangerSoft" loading={busy === 'del'} onClick={removeAll}>
                        <Trash2 className="size-4" />
                        {t('committee.detail.deleteFixtures')}
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" onClick={() => openDrawer()}>
                      <CalendarPlus className="size-4" />
                      {t('committee.detail.generateFixtures')}
                    </Button>
                  )}
                </div>
              )
            })()}
          </div>

          {stateMeta && (
            <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl px-3.5 py-2.5 text-[11px] font-bold ${stateMeta.cls}`}>
              <span className="inline-flex items-center gap-1.5">
                <stateMeta.icon className={`size-4 shrink-0 ${roundState === 'in_progress' ? 'animate-spin' : ''}`} />
                {t(stateMeta.labelKey)}
              </span>
              <span className="opacity-80">· {t(stateMeta.descKey)}</span>
            </div>
          )}
          {!stateMeta && roundLocked && (
            <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3.5 py-2.5 text-[11px] font-bold text-slate-500">
              <Lock className="size-4 shrink-0" />
              {t('committee.detail.roundLockedDesc')}
            </div>
          )}

          <FilterBar
            filters={filters}
            setFilters={setFilters}
            queryInput={queryInput}
            setQueryInput={setQueryInput}
            groups={groups}
            stadiums={stadiums}
            isGroup={isGroup}
          />

          <div className="space-y-4">
            {!fixtures || (!fixtures.length && fixturesLoading) ? (
              <SkeletonCards count={2} />
            ) : fixtures.length === 0 ? (
              isGroup ? (
                <Empty
                  icon={CalendarDays}
                  title={t('committee.detail.noMatchesForRound')}
                  action={<Button size="sm" variant="outline" onClick={() => openDrawer()}>{t('committee.detail.scheduleMatch')}</Button>}
                />
              ) : (
                <Empty
                  icon={Users}
                  title={t('committee.detail.stageNotCreated')}
                  description={t('committee.detail.stageNotCreatedDesc')}
                  action={hasKnockoutStage ? <Button size="sm" variant="outline" onClick={() => openDrawer('knockout')}>{t('committee.detail.generateFixtures')}</Button> : undefined}
                />
              )
            ) : filtered.length === 0 ? (
              <Empty
                icon={Search}
                title={t('committee.detail.noMatchResults')}
                action={<Button size="sm" variant="outline" onClick={() => setQueryInput('')}>{t('committee.detail.clearFilters')}</Button>}
              />
            ) : (
              sections.map((section) => (
                <div key={section.group?.id ?? 'ko'} className="space-y-2.5">
                  {section.group && (
                    <div className="flex items-center justify-between px-1">
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                        {t('committee.detail.groupName')} {section.group.name}
                      </p>
                      <Badge variant="info">{t('committee.detail.matchesCount', { count: section.items.length })}</Badge>
                    </div>
                  )}
                  {section.items.map(({ f, number }) => (
                    <MatchCard
                      key={f.id}
                      f={f}
                      number={number}
                      busy={busy === f.id}
                      locked={roundLocked}
                      tournament={tournament}
                      prevRoundKey={prevRoundKey}
                      prevData={prevData}
                      onOpenPrev={openPrev}
                      onResult={() => setResultFixture(f)}
                      onDetails={() => setDetailsFixture(f)}
                      onReschedule={() => setRescheduleFixture(f)}
                      onPostpone={() => postponeMatch(f)}
                      onCancel={() => cancelMatch(f)}
                      onRestore={() => restoreMatch(f)}
                    />
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {overlays}
    </div>
  )
}
