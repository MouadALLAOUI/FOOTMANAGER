import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, CheckCircle2, Lock, RefreshCw, RotateCcw, Undo2, Unlock, Users } from 'lucide-react'
import api from '../../../../api/client'
import { useApi } from '../../../../hooks/useApi'
import { Badge, Button, Card, Empty, Modal, Skeleton } from '../../../../components/dashboard/ui'
import { useToast } from '../../../../components/ui/Toast'
import { toastApiError } from '../../../../lib/errors'
import { commitMove, membersOf } from './drawLogic'
import TeamPool from './TeamPool'
import GroupColumn from './GroupColumn'
import { TeamAvatar } from '../../../tournaments/shared'

export default function DrawBoard({ tournament, refresh, refreshKey }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [busy, setBusy] = useState(null)
  const [drag, setDrag] = useState(null)
  const [over, setOver] = useState(null)
  const [local, setLocal] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  const { data: serverTeams, loading } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/teams`).then((r) => r.data.data),
    [tournament.id, refreshKey],
  )

  const { data: serverGroups } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/draw`).then((r) => r.data.data),
    [tournament.id, refreshKey],
  )

  useEffect(() => {
    if (serverTeams) {
      setLocal(serverTeams)
    }
  }, [serverTeams])

  const teams = local || serverTeams || []
  const pool = teams.filter((p) => !p.group)
  const total = teams.length
  const assigned = total - pool.length
  const drawPayload = () =>
    teams.map((p) => ({
      team_id: p.team?.id,
      group_id: p.group?.id ?? null,
      group_position: p.group_position ?? null,
    }))
  const hasFixtures = (tournament.stats?.fixtures ?? 0) > 0
  const confirmed = Boolean(tournament.draw_confirmed_at)
  const editableStatus = tournament.settings_editable ?? ['draft', 'open_for_registration', 'registration_closed'].includes(tournament.status)
  const canEdit = editableStatus && !confirmed
  const canUnlock = editableStatus && confirmed
  const freeMode = tournament.group_mode === 'free'
  const cap = freeMode ? Infinity : (tournament.teams_per_group || Infinity)

  const groups = (serverGroups || []).map((g) => ({ id: g.group_id, name: g.name }))
  const allDrawn = total > 0 && assigned === total

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

  const handleDrop = (e, target) => {
    e.preventDefault()
    e.stopPropagation()
    setOver(null)
    const d = drag
    setDrag(null)
    if (!d || !canEdit || busy) return
    if (target.type === 'pool' && d.fromGroupId === null) return
    if (target.type === 'group' && d.fromGroupId === target.id && (target.position == null || target.position === d.fromPosition)) return

    const result = commitMove(teams, d.pivotId, target, { groups, mode: tournament.group_mode, cap })
    setLocal(result.teams)
    setDirty(true)
    if (result.redirectedTo) {
      toast.info(t('committee.detail.groupFullRedirect', { group: result.redirectedTo }))
    }
  }

  const save = async () => {
    setBusy('save')
    try {
      await api.put(`/committee/tournaments/${tournament.id}/draw/teams`, {
        teams: drawPayload(),
      })
      setDirty(false)
      toast.success(t('committee.detail.drawSaved'))
      refresh()
    } catch (e) {
      toastApiError(e, t)
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
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  const confirmDraw = async () => {
    setBusy('confirm')
    try {
      if (dirty) {
        await api.put(`/committee/tournaments/${tournament.id}/draw/teams`, {
          teams: drawPayload(),
        })
        setDirty(false)
      }
      await api.post(`/committee/tournaments/${tournament.id}/draw/confirm`)
      setPreviewOpen(false)
      toast.success(t('committee.detail.drawConfirmed'))
      refresh()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  const unlockDraw = async () => {
    if (!window.confirm(t('committee.detail.unlockDrawConfirm'))) return
    setBusy('unlock')
    try {
      await api.delete(`/committee/tournaments/${tournament.id}/draw/confirm`)
      toast.success(t('committee.detail.drawUnlocked'))
      refresh()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  const unassignAll = () => {
    if (!window.confirm(t('committee.detail.unassignAllConfirm'))) return
    setLocal(teams.map((p) => ({ ...p, group: null, group_position: null })))
    setDirty(true)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs font-bold text-slate-500">
          {t('committee.detail.drawStatus', { drawn: assigned, total })}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          {confirmed ? (
            canUnlock ? (
              <Button size="sm" variant="outline" loading={busy === 'unlock'} onClick={unlockDraw}>
                <Unlock className="size-4" />
                {t('committee.detail.unlockDraw')}
              </Button>
            ) : null
          ) : canEdit ? (
            <>
              {dirty && (
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
              {!dirty && (
                <Button size="sm" loading={busy === 'draw'} onClick={autoDraw} disabled={total === 0}>
                  <RefreshCw className="size-4" />
                  {t('committee.detail.autoDraw')}
                </Button>
              )}
              {assigned > 0 && (
                <Button size="sm" variant="outline" disabled={busy !== null} onClick={unassignAll}>
                  <RotateCcw className="size-4" />
                  {t('committee.detail.unassignAll')}
                </Button>
              )}
              {allDrawn && (
                <Button size="sm" loading={busy === 'confirm'} onClick={() => setPreviewOpen(true)}>
                  <CheckCircle2 className="size-4" />
                  {t('committee.detail.confirmDraw')}
                </Button>
              )}
            </>
          ) : null}
        </div>
      </div>

      {confirmed && (
        <div className="flex items-center gap-2.5 rounded-xl border border-green-200 bg-green-50 px-3.5 py-2.5 text-[11px] font-bold text-green-700">
          <CheckCircle2 className="size-4 shrink-0" />
          {hasFixtures ? t('committee.detail.drawLocked') : t('committee.detail.drawConfirmedDesc')}
        </div>
      )}

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
              {freeMode ? t('committee.detail.freeModeHint') : t('committee.detail.fixedModeHint')}
            </p>
          )}
          <div className="grid gap-4 lg:grid-cols-[280px_1fr] lg:items-start">
            <TeamPool
              pool={pool}
              canEdit={canEdit}
              busy={busy}
              over={over}
              onDragStart={handleDragStart}
              onDragOverPool={(e) => {
                if (!canEdit) return
                e.preventDefault()
                setOver({ type: 'pool' })
              }}
              onDragLeavePool={() => setOver((v) => (v?.type === 'pool' ? null : v))}
              onDropPool={(e) => handleDrop(e, { type: 'pool' })}
            />

            <div className="grid gap-4 md:grid-cols-2">
              {groups.map((g) => (
                <GroupColumn
                  key={g.id}
                  group={g}
                  members={membersOf(teams, g.id)}
                  cap={cap}
                  canEdit={canEdit}
                  busy={busy}
                  over={over}
                  onDragStart={handleDragStart}
                  onGroupDragOver={(gid) => setOver({ type: 'group', id: gid })}
                  onGroupDragLeave={(gid) => setOver((v) => (v?.type === 'group' && v.id === gid ? null : v))}
                  onGroupDrop={(e, gid) => handleDrop(e, { type: 'group', id: gid })}
                  onTeamDrop={(e, gid, position) => handleDrop(e, { type: 'group', id: gid, position })}
                />
              ))}
            </div>
          </div>
        </>
      )}

      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={t('committee.detail.previewDraw')}
        subtitle={t('committee.detail.confirmDrawDesc')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {groups.map((g) => {
              const members = membersOf(teams, g.id)
              return (
                <div key={g.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-extrabold text-slate-900">{g.name}</h4>
                    <Badge variant={members.length >= cap ? 'success' : 'neutral'}>
                      {freeMode ? members.length : `${members.length}/${cap}`}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {members.map((p) => (
                      <div key={p.id} className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
                        <TeamAvatar team={p.team} className="size-7" />
                        <span className="truncate text-xs font-bold text-slate-700">{p.team?.name || '-'}</span>
                      </div>
                    ))}
                    {members.length === 0 && (
                      <p className="rounded-xl border border-dashed border-slate-200 px-3 py-5 text-center text-[11px] font-semibold text-slate-400">
                        {t('committee.detail.emptyGroup')}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          {!allDrawn && (
            <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-[11px] font-bold text-amber-700">
              <Lock className="size-4 shrink-0" />
              {t('committee.detail.drawIncomplete')}
            </p>
          )}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <Button size="sm" variant="outline" onClick={() => setPreviewOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" loading={busy === 'confirm'} disabled={!allDrawn} onClick={confirmDraw}>
              <CheckCircle2 className="size-4" />
              {t('committee.detail.confirmDraw')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
