import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, GripVertical, RefreshCw, RotateCcw, Undo2, Users } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Badge, Button, Card, Empty, Skeleton } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { TeamAvatar } from '../../tournaments/shared'

export default function DrawTab({ tournament, refresh, refreshKey }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [busy, setBusy] = useState(null)
  const [drag, setDrag] = useState(null)
  const [over, setOver] = useState(null)
  const [local, setLocal] = useState(null)
  const [dirty, setDirty] = useState(false)

  const { data: serverTeams, loading } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/teams`).then((r) => r.data.data),
    [tournament.id, refreshKey],
  )

  const { data: groups } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/draw`).then((r) => r.data.data),
    [tournament.id, refreshKey],
  )

  useEffect(() => {
    if (serverTeams) setLocal(serverTeams)
  }, [serverTeams])

  const teams = local || serverTeams || []
  const pool = teams.filter((p) => !p.group)
  const total = teams.length
  const assigned = total - pool.length
  const allDrawn = total > 0 && pool.length === 0
  const hasFixtures = (tournament.stats?.fixtures ?? 0) > 0
  const canEdit = !hasFixtures && ['draft', 'published'].includes(tournament.status)
  const cap = tournament.group_mode === 'free' ? Infinity : (tournament.teams_per_group || Infinity)
  const overCapacity = (g) => membersOf(g.group_id).length > cap

  const membersOf = (groupId) =>
    teams
      .filter((p) => p.group?.id === groupId)
      .sort((a, b) => (a.group_position ?? 0) - (b.group_position ?? 0))

  const commitMove = (list, pivotId, targetGroupId, targetPosition) => {
    const out = list.map((p) => ({ ...p, group: p.group ? { ...p.group } : null }))
    const pivot = out.find((p) => p.id === pivotId)
    if (!pivot) return out
    const sourceGid = pivot.group?.id ?? null
    pivot.group = null
    pivot.group_position = null

    const compact = (gid) => {
      if (gid == null) return []
      const members = out
        .filter((p) => p.group?.id === gid)
        .sort((a, b) => (a.group_position ?? 0) - (b.group_position ?? 0))
      members.forEach((p, i) => { p.group_position = i + 1 })
      return members
    }

    compact(sourceGid)

    if (targetGroupId == null) return out

    const members = compact(targetGroupId)
    const pos = targetPosition ?? members.length + 1
    const slot = Math.max(1, Math.min(pos, members.length + 1))
    members.forEach((p, i) => { if (i + 1 >= slot) p.group_position = i + 2 })
    pivot.group = { id: targetGroupId, name: '' }
    pivot.group_position = slot
    return out
  }

  const handleDragStart = (e, pivot) => {
    if (!canEdit || busy) {
      e.preventDefault()
      return
    }
    setDrag({
      pivotId: pivot.id,
      teamId: pivot.team?.id,
      fromGroupId: pivot.group?.id ?? null,
      fromPosition: pivot.group_position ?? null,
    })
    e.dataTransfer.effectAllowed = 'move'
    try {
      e.dataTransfer.setData('text/plain', String(pivot.id))
    } catch {
      /* ignore */
    }
  }

  const handleDrop = (e, targetGroupId, targetPosition) => {
    e.preventDefault()
    e.stopPropagation()
    setOver(null)
    const d = drag
    setDrag(null)
    if (!d || !canEdit || busy) return
    if (targetGroupId === null && d.fromGroupId === null) return
    if (d.fromGroupId === targetGroupId) {
      if (targetPosition === null || targetPosition === d.fromPosition) return
    }

    setLocal(commitMove(teams, d.pivotId, targetGroupId, targetPosition))
    setDirty(true)
  }

  const save = async () => {
    setBusy('save')
    try {
      await api.put(`/committee/tournaments/${tournament.id}/draw/teams`, {
        teams: teams.map((p) => ({
          team_id: p.team?.id,
          group_id: p.group?.id ?? null,
          group_position: p.group_position ?? null,
        })),
      })
      setDirty(false)
      toast.success(t('committee.detail.drawSaved'))
      refresh()
    } catch (e) {
      toast.error(e.response?.data?.message || t('committee.detail.actionFailed'))
    } finally {
      setBusy(null)
    }
  }

  const discard = () => {
    setLocal(serverTeams)
    setDirty(false)
  }

  const autoDraw = async () => {
    setBusy('draw')
    try {
      await api.post(`/committee/tournaments/${tournament.id}/draw`)
      setDirty(false)
      toast.success(t('committee.detail.drawDone'))
      refresh()
    } catch (e) {
      toast.error(e.response?.data?.message || t('committee.detail.actionFailed'))
    } finally {
      setBusy(null)
    }
  }

  const unassignAll = () => {
    if (!window.confirm(t('committee.detail.unassignAllConfirm'))) return
    setLocal(teams.map((p) => ({ ...p, group: null, group_position: null })))
    setDirty(true)
  }

  const chipClass = (p) =>
    `flex cursor-grab items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors ${
      busy === 'save' ? 'opacity-60' : 'border-slate-200 bg-slate-50 hover:border-slate-300 active:cursor-grabbing'
    }`

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold text-slate-500">
          {t('committee.detail.drawStatus', { drawn: assigned, total })}
        </p>
        <div className="flex flex-wrap gap-2">
          {dirty && canEdit && (
            <>
              <Button size="sm" variant="outline" loading={busy === 'discard'} onClick={discard}>
                <Undo2 className="size-4" />
                {t('committee.detail.discardChanges')}
              </Button>
              <Button size="sm" loading={busy === 'save'} onClick={save}>
                <Check className="size-4" />
                {t('committee.detail.saveDraw')}
              </Button>
            </>
          )}
          {!dirty && canEdit && (
            <Button size="sm" loading={busy === 'draw'} onClick={autoDraw} disabled={total === 0}>
              <RefreshCw className="size-4" />
              {t('committee.detail.autoDraw')}
            </Button>
          )}
          {canEdit && assigned > 0 && (
            <Button size="sm" variant="outline" disabled={busy !== null} onClick={unassignAll}>
              <RotateCcw className="size-4" />
              {t('committee.detail.unassignAll')}
            </Button>
          )}
          {!dirty && canEdit && (
            <Button size="sm" loading={busy === 'draw'} onClick={autoDraw} disabled={total === 0}>
              <RefreshCw className="size-4" />
              {t('committee.detail.autoDraw')}
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : total === 0 ? (
        <Card title={t('committee.detail.draw')}>
          <Empty
            icon={Users}
            title={t('committee.detail.noTeamsToDraw')}
            description={t('committee.detail.noTeamsToDrawDesc')}
          />
        </Card>
      ) : (
        <>
          {canEdit && (
            <p className="rounded-xl bg-sky-50 px-3.5 py-2.5 text-[11px] font-bold text-sky-700">
              {t('committee.detail.manualHint')}
            </p>
          )}
          <div className="grid gap-4 lg:grid-cols-[280px_1fr] lg:items-start">
            <div
              className={`max-h-[50vh] overflow-y-auto rounded-3xl border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-colors lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] ${
                over?.type === 'pool' ? 'border-green-400 bg-green-50/60' : 'border-slate-200/70 bg-white'
              }`}
              onDragOver={(e) => {
                if (!canEdit) return
                e.preventDefault()
                setOver({ type: 'pool' })
              }}
              onDragLeave={() => setOver((v) => (v?.type === 'pool' ? null : v))}
              onDrop={(e) => handleDrop(e, null, null)}
            >
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-sm font-extrabold text-slate-900">{t('committee.detail.unassigned')}</h4>
                <Badge variant="info">{pool.length}</Badge>
              </div>
              <div className="mt-3 space-y-2">
                {pool.map((p) => (
                  <div
                    key={p.id}
                    draggable={canEdit && !busy}
                    onDragStart={(e) => handleDragStart(e, p)}
                    className={chipClass(p)}
                  >
                    <TeamAvatar team={p.team} className="size-7" />
                    <span className="truncate text-xs font-bold text-slate-700">{p.team?.name || '-'}</span>
                    {canEdit && <GripVertical className="ms-auto size-4 shrink-0 text-slate-300" />}
                  </div>
                ))}
                {pool.length === 0 && (
                  <p className="rounded-xl bg-slate-50 px-3 py-5 text-center text-[11px] font-semibold text-slate-400">
                    {t('committee.detail.allDrawn')}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {(groups || []).map((g) => {
                const members = membersOf(g.group_id)
                return (
                  <div
                    key={g.group_id}
                    className={`min-h-[120px] rounded-3xl border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-colors ${
                      over?.type === 'group' && over.id === g.group_id
                        ? 'border-green-400 bg-green-50/60'
                        : 'border-slate-200/70 bg-white'
                    }`}
                    onDragOver={(e) => {
                      if (!canEdit) return
                      e.preventDefault()
                      e.stopPropagation()
                      setOver({ type: 'group', id: g.group_id })
                    }}
                    onDragLeave={() => setOver((v) => (v?.type === 'group' && v.id === g.group_id ? null : v))}
                    onDrop={(e) => handleDrop(e, g.group_id, null)}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h4 className="text-sm font-extrabold text-slate-900">{g.name}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="info">{t('committee.detail.teamsCount', { count: members.length })}</Badge>
                        {overCapacity(g) && (
                          <Badge variant="danger">{t('committee.detail.overCapacity', { max: tournament.teams_per_group })}</Badge>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {members.map((p) => (
                        <div
                          key={p.id}
                          draggable={canEdit && !busy}
                          onDragStart={(e) => handleDragStart(e, p)}
                          onDragOver={(e) => {
                            if (!canEdit) return
                            e.preventDefault()
                            e.stopPropagation()
                            setOver({ type: 'group', id: g.group_id })
                          }}
                          onDrop={(e) => handleDrop(e, g.group_id, p.group_position)}
                          className={chipClass(p)}
                        >
                          <TeamAvatar team={p.team} className="size-7" />
                          <span className="truncate text-xs font-bold text-slate-700">{p.team?.name || '-'}</span>
                          {canEdit && <GripVertical className="ms-auto size-4 shrink-0 text-slate-300" />}
                        </div>
                      ))}
                      {members.length === 0 && (
                        <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-[11px] font-semibold text-slate-400">
                          {t('committee.detail.dropHere')}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
