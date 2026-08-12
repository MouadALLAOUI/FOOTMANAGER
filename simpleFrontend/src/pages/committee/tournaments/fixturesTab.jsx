import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CalendarDays,
  CalendarPlus,
  RefreshCw,
  Search,
  Lock,
  Trash2,
  Swords,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Badge, Button, Empty, Field, FieldRow, SkeletonCards, Toggle, inputClass, selectClass } from '../../../components/dashboard/ui'
import MatchCard from '../../../domains/committee/components/MatchCard'
import FilterBar from '../../../domains/committee/components/FilterBar'
import Drawer from '../../../components/dashboard/Drawer'
import { useToast } from '../../../components/ui/Toast'
import { LIVE_STATUSES } from '../../../data/fixtures'
import MatchControlRoom from './MatchControlRoom'
import MatchDetailsModal from '../../../domains/committee/components/MatchDetailsModal'
import RescheduleDrawer from '../../../domains/committee/components/RescheduleDrawer'
import RoundNav from '../../../domains/committee/components/RoundNav'
import SummaryChips from '../../../domains/committee/components/SummaryChips'


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

export default function FixturesTab({ tournament, refresh, refreshKey }) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [active, setActive] = useState(null)
  const [filters, setFilters] = useState({ status: 'all', group: 'all', stadium: 'all', date: 'all', customDate: '', q: '' })
  const [queryInput, setQueryInput] = useState('')
  const [genOpen, setGenOpen] = useState(false)
  const [resultFixture, setResultFixture] = useState(null)
  const [detailsFixture, setDetailsFixture] = useState(null)
  const [rescheduleFixture, setRescheduleFixture] = useState(null)
  const [busy, setBusy] = useState(null)
  const [prevState, setPrevState] = useState(null)
  const [form, setForm] = useState({
    starts_on: '',
    default_time: '20:00',
    double_round_robin: false,
    stadium_ids: [],
  })

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

  const { data: genStadiums } = useApi(
    () => api.get('/v1/stadiums', { params: { per_page: 50 } }).then((r) => r.data.data),
    [],
    { enabled: genOpen },
  )

  const { data: rescheduleStadiums } = useApi(
    () => api.get('/v1/stadiums', { params: { per_page: 50 } }).then((r) => r.data.data),
    [],
    { enabled: Boolean(rescheduleFixture) },
  )

  const afterChange = () => {
    refetchFixtures()
    refetchStructure()
    refresh()
  }

  const generate = async (regenerate = false) => {
    setBusy(regenerate ? 'regen' : 'gen')
    try {
      const payload = {
        starts_on: form.starts_on || undefined,
        default_time: form.default_time || undefined,
        double_round_robin: form.double_round_robin,
        stadium_ids: form.stadium_ids.length ? form.stadium_ids : undefined,
        regenerate,
      }
      const r = await api.post(`/committee/tournaments/${tournament.id}/fixtures`, payload)
      toast.success(r.data?.message || t('committee.detail.fixturesGenerated'))
      setGenOpen(false)
      afterChange()
    } catch (e) {
      toast.error(e.response?.data?.message || t('committee.detail.actionFailed'))
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
      toast.error(e.response?.data?.message || t('committee.detail.actionFailed'))
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
      toast.error(e.response?.data?.message || t('committee.detail.actionFailed'))
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
      toast.error(e.response?.data?.message || t('committee.detail.actionFailed'))
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

  const overlays = (
    <>
      <Drawer
        open={genOpen}
        onClose={() => setGenOpen(false)}
        title={t('committee.detail.generateFixtures')}
        subtitle={t('committee.detail.generateFixturesDesc')}
      >
        <div className="space-y-5">
          <FieldRow>
            <Field label={t('committee.detail.startDate')}>
              <input type="date" className={inputClass} value={form.starts_on} onChange={set('starts_on')} />
            </Field>
            <Field label={t('committee.detail.defaultTime')}>
              <input type="time" className={inputClass} value={form.default_time} onChange={set('default_time')} />
            </Field>
          </FieldRow>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <div>
              <p className="text-xs font-bold text-slate-800">{t('committee.detail.doubleRound')}</p>
              <p className="text-[11px] text-slate-400">{t('committee.detail.doubleRoundDesc')}</p>
            </div>
            <Toggle checked={form.double_round_robin} onChange={(v) => setForm((f) => ({ ...f, double_round_robin: v }))} label={t('committee.detail.doubleRound')} />
          </div>

          <Field label={t('committee.detail.pickStadiums')}>
            <div className="grid max-h-[30vh] gap-1.5 overflow-y-auto pe-1">
              {(genStadiums || []).map((s) => {
                const checked = form.stadium_ids.includes(s.id)
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => toggleStadium(s.id)}
                    className={`flex items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-start transition-colors ${checked ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                  >
                    <span className={`grid size-5 shrink-0 place-items-center rounded-md border text-white ${checked ? 'border-green-500 bg-green-500' : 'border-slate-300 bg-white'}`}>
                      {checked && <span className="text-[11px] font-black">✓</span>}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-slate-800">{s.name}</p>
                      {s.city && <p className="text-[10px] text-slate-400">{s.city}</p>}
                    </div>
                  </button>
                )
              })}
            </div>
          </Field>

          <div className="sticky bottom-0 -mx-6 flex gap-2 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
            <Button className="flex-1" loading={busy === 'gen'} onClick={() => generate(false)}>
              <CalendarPlus className="size-4" />
              {t('committee.detail.generate')}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setGenOpen(false)}>{t('common.cancel')}</Button>
          </div>
        </div>
      </Drawer>

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
          stadiums={rescheduleStadiums || []}
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
            <Button size="sm" onClick={() => setGenOpen(true)}>
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
            <div className="flex flex-wrap gap-2">
              {hasRounds ? (
                <>
                  <Button size="sm" variant="outline" loading={busy === 'regen'} onClick={() => generate(true)}>
                    <RefreshCw className="size-4" />
                    {t('committee.detail.regenerate')}
                  </Button>
                  <Button size="sm" variant="dangerSoft" loading={busy === 'del'} onClick={removeAll}>
                    <Trash2 className="size-4" />
                    {t('committee.detail.deleteFixtures')}
                  </Button>
                </>
              ) : (
                <Button size="sm" onClick={() => setGenOpen(true)}>
                  <CalendarPlus className="size-4" />
                  {t('committee.detail.generateFixtures')}
                </Button>
              )}
            </div>
          </div>

          {roundLocked && (
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
                  action={<Button size="sm" variant="outline" onClick={() => setGenOpen(true)}>{t('committee.detail.scheduleMatch')}</Button>}
                />
              ) : (
                <Empty
                  icon={Network}
                  title={t('committee.detail.stageNotCreated')}
                  description={t('committee.detail.stageNotCreatedDesc')}
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
