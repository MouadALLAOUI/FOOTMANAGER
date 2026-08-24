import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ListChecks, Plus, Trash2, UserPlus, Wallet, X } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Badge, Button, Empty, Field, Modal, Skeleton } from '../../../components/dashboard/ui'
import Drawer from '../../../components/dashboard/Drawer'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import { TeamAvatar } from '../../tournaments/shared'

export default function TeamsTab({ tournament, refresh, refreshKey }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState([])
  const [busy, setBusy] = useState(null)

  const [selectMode, setSelectMode] = useState(false)
  const [bulkSelected, setBulkSelected] = useState([])
  const [groupOpen, setGroupOpen] = useState(false)
  const [groupBusy, setGroupBusy] = useState(false)

  const [freeOpen, setFreeOpen] = useState(false)
  const [freeNames, setFreeNames] = useState('')
  const [freeBusy, setFreeBusy] = useState(false)

  const { data: teams, loading } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/teams`).then((r) => r.data.data),
    [tournament.id, refreshKey],
  )

  const { data: registrations, loading: regLoading } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/registrations`).then((r) => r.data.data),
    [tournament.id, refreshKey],
  )

  const pending = (registrations || []).filter((r) => r.status === 'pending')

  const respond = async (teamId, action) => {
    setBusy(`respond-${teamId}`)
    try {
      await api.post(`/committee/tournaments/${tournament.id}/teams/${teamId}/${action}`)
      toast.success(t(action === 'approve' ? 'committee.detail.approveRequestToast' : 'committee.detail.rejectRequestToast'))
      refresh()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  const markPaid = async (teamId) => {
    setBusy(`pay-${teamId}`)
    try {
      await api.post(`/committee/tournaments/${tournament.id}/teams/${teamId}/payment`)
      toast.success(t('committee.detail.markPaidToast'))
      refresh()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  const { data: allTeams } = useApi(
    () => api.get('/committee/teams').then((r) => r.data.data),
    [tournament.id],
    { enabled: open },
  )

  const { data: groups } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/draw`).then((r) => r.data.data),
    [tournament.id],
    { enabled: groupOpen },
  )

  const registeredIds = new Set((teams || []).map((p) => p.team?.id))
  const available = (allTeams || []).filter((team) => !registeredIds.has(team.id))
  const expected = tournament.teams_count ?? 0
  const capped = expected > 0
  const count = (teams || []).length
  const over = capped && count > expected
  const remaining = capped ? Math.max(0, expected - count) : Number.MAX_SAFE_INTEGER

  const toggle = (teamId) => {
    setSelected((prev) => {
      if (prev.includes(teamId)) return prev.filter((x) => x !== teamId)
      if (capped && prev.length >= remaining) return prev
      return [...prev, teamId]
    })
  }

  const toggleBulk = (teamId) => {
    setBulkSelected((prev) => (prev.includes(teamId) ? prev.filter((x) => x !== teamId) : [...prev, teamId]))
  }

  const addTeams = async () => {
    if (selected.length === 0) return
    setBusy('add')
    try {
      await api.post(`/committee/tournaments/${tournament.id}/teams`, { team_ids: selected })
      toast.success(t('committee.detail.teamsAdded'))
      setOpen(false)
      setSelected([])
      refresh()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  const removeTeam = async (teamId) => {
    if (!window.confirm(t('committee.detail.removeTeamConfirm'))) return
    setBusy('remove')
    try {
      await api.delete(`/committee/tournaments/${tournament.id}/teams/${teamId}`)
      toast.success(t('committee.detail.teamRemoved'))
      refresh()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  const bulkRemove = async () => {
    if (!window.confirm(t('committee.detail.bulkRemoveConfirm', { count: bulkSelected.length }))) return
    setBusy('bulkRemove')
    try {
      await Promise.all(
        bulkSelected.map((teamId) => api.delete(`/committee/tournaments/${tournament.id}/teams/${teamId}`)),
      )
      toast.success(t('committee.detail.teamRemoved'))
      setBulkSelected([])
      setSelectMode(false)
      refresh()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  const moveToGroup = async (groupId) => {
    if (bulkSelected.length === 0) return
    setGroupBusy(true)
    try {
      await api.put(`/committee/tournaments/${tournament.id}/teams/group`, {
        team_ids: bulkSelected,
        group_id: groupId,
      })
      toast.success(t('committee.detail.movedToGroup'))
      setGroupOpen(false)
      setBulkSelected([])
      setSelectMode(false)
      refresh()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setGroupBusy(false)
    }
  }

  const addFreeTeams = async () => {
    const names = freeNames.split('\n').map((n) => n.trim()).filter(Boolean)
    if (names.length === 0) return
    setFreeBusy(true)
    try {
      await api.post(`/committee/tournaments/${tournament.id}/teams/free/bulk`, { names })
      toast.success(t('committee.detail.freeTeamsAdded', { count: names.length }))
      setFreeOpen(false)
      setFreeNames('')
      refresh()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setFreeBusy(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge variant={over ? 'danger' : capped && remaining > 0 ? 'warning' : 'success'}>
          {t('committee.detail.teamsCount', { count })}
          {over
            ? ` • ${t('committee.detail.teamsOverLimit', { max: expected })}`
            : capped && remaining > 0
              ? ` • ${t('committee.detail.remaining', { count: remaining })}`
              : ''}
        </Badge>
        <div className="flex flex-wrap gap-2">
          {(teams || []).length > 0 && (
            <Button size="sm" variant={selectMode ? 'primary' : 'outline'} onClick={() => { setSelectMode(!selectMode); setBulkSelected([]) }}>
              {selectMode ? <X className="size-4" /> : <ListChecks className="size-4" />}
              {selectMode ? t('committee.detail.doneSelecting') : t('committee.detail.selectTeams')}
            </Button>
          )}
          <Button size="sm" variant="soft" onClick={() => setFreeOpen(true)} disabled={capped && remaining === 0}>
            <Plus className="size-4" />
            {t('committee.detail.addFreeTeam')}
          </Button>
          <Button size="sm" onClick={() => setOpen(true)} disabled={capped && remaining === 0}>
            <UserPlus className="size-4" />
            {t('committee.detail.addTeams')}
          </Button>
        </div>
      </div>

      {over && (
        <p className="rounded-xl bg-rose-50 px-3.5 py-2.5 text-[11px] font-bold text-rose-700">
          {t('committee.detail.teamsOverLimitBanner', { count, max: expected })}
        </p>
      )}

      {(pending.length > 0 || regLoading) && (
        <div className="rounded-3xl border border-amber-200/70 bg-amber-50/60 p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-extrabold text-slate-900">{t('committee.detail.pendingRequests')}</p>
            <Badge variant="warning">{pending.length}</Badge>
          </div>
          {regLoading ? (
            <Skeleton className="h-12" />
          ) : (
            <div className="space-y-2.5">
              {pending.map((r) => (
                <div key={r.id} className="flex items-center gap-3 rounded-2xl border border-amber-200/60 bg-white px-3.5 py-3">
                  <TeamAvatar team={r.team} className="size-10" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">{r.team?.name || '—'}</p>
                    {r.team?.city && <p className="text-[11px] text-slate-400">{r.team.city}</p>}
                  </div>
                  <Button
                    size="sm"
                    className="shrink-0"
                    loading={busy === `respond-${r.team_id}`}
                    onClick={() => respond(r.team_id, 'approve')}
                  >
                    <Check className="size-3.5" />
                    {t('committee.detail.approveRequest')}
                  </Button>
                  <Button
                    size="sm"
                    variant="dangerSoft"
                    className="shrink-0"
                    loading={busy === `respond-${r.team_id}`}
                    onClick={() => {
                      if (!window.confirm(t('committee.detail.rejectRequestConfirm'))) return
                      respond(r.team_id, 'reject')
                    }}
                  >
                    <X className="size-3.5" />
                    {t('committee.detail.rejectRequest')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectMode && bulkSelected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-green-200 bg-green-50/70 p-3">
          <Badge variant="success">{t('committee.detail.bulkSelected', { count: bulkSelected.length })}</Badge>
          <Button size="sm" variant="soft" loading={groupBusy} onClick={() => setGroupOpen(true)}>
            <ListChecks className="size-4" />
            {t('committee.detail.bulkMoveGroup')}
          </Button>
          <Button size="sm" variant="dangerSoft" loading={busy === 'bulkRemove'} onClick={bulkRemove}>
            <Trash2 className="size-4" />
            {t('committee.detail.bulkRemove')}
          </Button>
        </div>
      )}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
        </div>
      ) : (teams || []).length === 0 ? (
        <Empty
          icon={UserPlus}
          title={t('committee.detail.noTeams')}
          description={t('committee.detail.noTeamsDesc')}
          action={<Button size="sm" variant="soft" onClick={() => setOpen(true)}>{t('committee.detail.addTeams')}</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(teams || []).map((p) => {
            const checked = bulkSelected.includes(p.team?.id)
            return (
              <div
                key={p.id}
                className={`flex items-center gap-3 rounded-3xl border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-colors ${
                  selectMode && checked ? 'border-green-400 bg-green-50/70' : 'border-slate-200/70 bg-white'
                }`}
              >
                {selectMode ? (
                  <button
                    type="button"
                    onClick={() => toggleBulk(p.team?.id)}
                    className={`grid size-6 shrink-0 place-items-center rounded-lg border text-white ${
                      checked ? 'border-green-500 bg-green-500' : 'border-slate-300 bg-white'
                    }`}
                    aria-label={t('committee.detail.selectTeams')}
                  >
                    {checked && <Check className="size-4" />}
                  </button>
                ) : (
                  <TeamAvatar team={p.team} className="size-10" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-extrabold text-slate-900">{p.team?.name || '—'}</p>
                    {p.team?.is_free && <Badge variant="info">{t('committee.detail.freeBadge')}</Badge>}
                  </div>
                  <p className="text-[11px] font-semibold text-slate-400">
                    {p.group?.name || t('committee.detail.unassigned')}
                  </p>
                </div>
                {!selectMode && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    {p.payment_status === 'pending' && (
                      <button
                        type="button"
                        onClick={() => markPaid(p.team?.id)}
                        disabled={busy === `pay-${p.team?.id}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200 transition-colors hover:bg-amber-100 disabled:opacity-50"
                        title={t('committee.detail.markPaid')}
                      >
                        {busy === `pay-${p.team?.id}` ? (
                          <Check className="size-3.5 animate-pulse" />
                        ) : (
                          <Wallet className="size-3.5" />
                        )}
                        {t('committee.detail.paymentPending')}
                      </button>
                    )}
                    {p.payment_status === 'completed' && (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2 py-1 text-[10px] font-bold text-green-700 ring-1 ring-green-200">
                        <Check className="size-3" />
                        {t('committee.detail.paymentPaid')}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeTeam(p.team?.id)}
                      className="grid size-9 place-items-center rounded-xl text-rose-500 transition-colors hover:bg-rose-50"
                      aria-label={t('committee.detail.removeTeam')}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <Drawer
        open={open}
        onClose={() => setOpen(false)}
        title={t('committee.detail.addTeams')}
        subtitle={t('committee.detail.addTeamsDesc')}
      >
        <div className="space-y-4">
          {capped && (
            <p className="rounded-xl bg-amber-50 px-3.5 py-2.5 text-[11px] font-bold text-amber-700">
              {t('committee.detail.remaining', { count: remaining })}
            </p>
          )}
          <Field label={t('committee.detail.availableTeams')}>
            {available.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-xs font-semibold text-slate-400">
                {t('committee.detail.noAvailableTeams')}
              </p>
            ) : (
              <div className="max-h-[46vh] space-y-1.5 overflow-y-auto pe-1">
                {available.map((team) => {
                  const checked = selected.includes(team.id)
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => toggle(team.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-start transition-colors ${
                        checked ? 'border-green-400 bg-green-50' : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`grid size-5 shrink-0 place-items-center rounded-md border text-white ${
                          checked ? 'border-green-500 bg-green-500' : 'border-slate-300 bg-white'
                        }`}
                      >
                        {checked && <span className="text-[11px] font-black">✓</span>}
                      </span>
                      <TeamAvatar team={team} className="size-8" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-800">{team.name}</p>
                        {team.city && <p className="text-[10px] text-slate-400">{team.city}</p>}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </Field>
          <div className="sticky bottom-0 -mx-6 flex gap-2 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
            <Button
              className="flex-1"
              disabled={busy === 'add' || selected.length === 0 || (capped && selected.length > remaining)}
              loading={busy === 'add'}
              onClick={addTeams}
            >
              {t('committee.detail.addSelected', { count: selected.length })}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
          </div>
        </div>
      </Drawer>

      <Modal
        open={groupOpen}
        onClose={() => setGroupOpen(false)}
        title={t('committee.detail.bulkMoveGroup')}
        subtitle={t('committee.detail.chooseGroup')}
      >
        <div className="grid gap-2">
          {(groups || []).map((g) => (
            <button
              key={g.group_id}
              type="button"
              disabled={groupBusy}
              onClick={() => moveToGroup(g.group_id)}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-start transition-colors hover:border-green-400 hover:bg-green-50/60"
            >
              <span className="text-sm font-extrabold text-slate-800">{g.name}</span>
              <Badge variant="info">{t('committee.detail.teamsCount', { count: g.team_count })}</Badge>
            </button>
          ))}
        </div>
      </Modal>

      <Modal
        open={freeOpen}
        onClose={() => setFreeOpen(false)}
        title={t('committee.detail.addFreeTeam')}
        subtitle={t('committee.detail.addFreeTeamDesc')}
      >
        <div className="space-y-4">
          <Field label={t('committee.detail.freeTeamNames')}>
            <textarea
              autoFocus
              rows={5}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
              placeholder={t('committee.detail.freeTeamPlaceholder')}
              value={freeNames}
              onChange={(e) => setFreeNames(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) addFreeTeams()
              }}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              {freeNames.split('\n').filter((n) => n.trim()).length} {t('committee.detail.freeTeamCount')}
            </p>
          </Field>
          <div className="flex gap-2">
            <Button className="flex-1" disabled={!freeNames.trim() || freeBusy} loading={freeBusy} onClick={addFreeTeams}>
              <Plus className="size-4" />
              {t('committee.detail.addFreeTeam')}
            </Button>
            <Button variant="outline" className="flex-1" onClick={() => setFreeOpen(false)}>{t('common.cancel')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
