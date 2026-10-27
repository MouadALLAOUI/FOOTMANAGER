import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ListChecks, Pencil, Plus, RotateCcw, Trash2, UserPlus, Wallet, X, CalendarDays, Share2, Copy, CheckCircle2, Phone, Users } from 'lucide-react'
import { useProfileModal } from '../../../components/profile/ProfileModalContext'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Badge, Button, Empty, Field, Modal, Skeleton } from '../../../components/dashboard/ui'
import Drawer from '../../../components/dashboard/Drawer'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import { TeamAvatar } from '../../tournaments/shared'
import TeamSquadModal from './teamSquadModal'
import EditFreeTeamModal from './editFreeTeamModal'
import QuickShareCard from '../../../components/tournaments/QuickShareCard'
import { matchesArabicSearch } from '../../../lib/searchUtils'

export default function TeamsTab({ tournament, refresh, refreshKey }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { openTeam } = useProfileModal()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState([])
  const [busy, setBusy] = useState(null)
  const [squadTeam, setSquadTeam] = useState(null)

  const [selectMode, setSelectMode] = useState(false)
  const [bulkSelected, setBulkSelected] = useState([])
  const [groupOpen, setGroupOpen] = useState(false)
  const [groupBusy, setGroupBusy] = useState(false)

  const [freeOpen, setFreeOpen] = useState(false)
  const [freeNames, setFreeNames] = useState('')
  const [freeBusy, setFreeBusy] = useState(false)

  const [editFreeTeam, setEditFreeTeam] = useState(null)
  const [archiveSearch, setArchiveSearch] = useState('')

  const { data: teams, loading } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/teams`).then((r) => r.data.data),
    [tournament.id, refreshKey],
  )

  const { data: registrations, loading: regLoading } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/registrations`).then((r) => r.data.data),
    [tournament.id, refreshKey],
  )

  const [approvedActivation, setApprovedActivation] = useState(null)
  const [copiedPinLink, setCopiedPinLink] = useState(false)
  const pending = (registrations || []).filter((r) => r.status === 'pending')

  const respond = async (teamId, action, teamInfo = null) => {
    setBusy(`respond-${teamId}`)
    try {
      const res = await api.post(`/committee/tournaments/${tournament.id}/teams/${teamId}/${action}`)
      if (action === 'approve') {
        toast.success('تم قبول الفريق وتفعيل حسابه بنجاح')
        const data = res?.data
        const waUrl = data?.whatsapp_url
        const actUrl = data?.activation_url
        if (waUrl) {
          window.open(waUrl, '_blank')
        }
        if (actUrl || waUrl) {
          setApprovedActivation({
            teamName: data?.team_name || teamInfo?.name || 'الفريق',
            managerName: data?.manager_name || teamInfo?.manager_name || 'المسير',
            managerPhone: data?.manager_phone || teamInfo?.manager_phone || '',
            activationUrl: actUrl,
            whatsappUrl: waUrl,
          })
        }
      } else {
        toast.success(t('committee.detail.rejectRequestToast'))
      }
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

  const unmarkPaid = async (teamId) => {
    setBusy(`unpay-${teamId}`)
    try {
      await api.post(`/committee/tournaments/${tournament.id}/teams/${teamId}/payment/unmark`)
      toast.success(t('committee.detail.unmarkPaidToast'))
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

  const registeredIds = new Set((teams || []).map((p) => p.team_id || p.team?.id).filter(Boolean))
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

  const removeTeam = async (targetId) => {
    if (!targetId) return
    if (!window.confirm(t('committee.detail.removeTeamConfirm'))) return
    setBusy(`remove-${targetId}`)
    try {
      await api.delete(`/committee/tournaments/${tournament.id}/teams/${targetId}`)
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
        bulkSelected.map((targetId) => api.delete(`/committee/tournaments/${tournament.id}/teams/${targetId}`)),
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
      {/* روابط المشاركة السريعة ودعوة الفرق */}
      <QuickShareCard tournament={tournament} type="both" />

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
                <div key={r.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 rounded-2xl border border-amber-200/70 bg-white p-3.5 shadow-xs">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <TeamAvatar team={r.team} className="size-12 shrink-0 shadow-xs" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-black text-slate-900">{r.team?.name || '—'}</p>
                        <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-[10px] font-bold">
                          طلب جديد
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 mt-1">
                        {r.team?.manager_name && (
                          <span className="font-semibold text-slate-700">
                            المسير: <span className="font-bold">{r.team.manager_name}</span>
                          </span>
                        )}
                        {r.team?.manager_phone && (
                          <div className="inline-flex items-center gap-1.5 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200/70">
                            <span className="font-bold text-emerald-700 dir-ltr text-xs">
                              🇲🇦 {r.team.manager_phone}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                navigator.clipboard.writeText(r.team.manager_phone)
                                toast.success('تم نسخ الرابط بنجاح! 📋')
                              }}
                              className="text-emerald-600 hover:text-emerald-800 p-0.5 rounded hover:bg-emerald-100 transition-colors cursor-pointer"
                              title="نسخ رقم الهاتف"
                            >
                              <Copy className="size-3" />
                            </button>
                          </div>
                        )}
                        {r.team?.players_count > 0 && (
                          <span className="rounded-md bg-slate-100 text-slate-600 px-1.5 py-0.5 text-[10px] font-bold">
                            {r.team.players_count} لاعبين
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <Button
                      size="sm"
                      className="bg-[#10B981] hover:bg-emerald-600 text-white font-bold flex-1 sm:flex-initial"
                      loading={busy === `respond-${r.team_id || r.team?.id}`}
                      onClick={() => respond(r.team_id || r.team?.id, 'approve', r.team)}
                    >
                      <Check className="size-3.5" />
                      <span>قبول الفريق</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="dangerSoft"
                      className="font-bold"
                      loading={busy === `respond-${r.team_id || r.team?.id}`}
                      onClick={() => {
                        if (!window.confirm(t('committee.detail.rejectRequestConfirm'))) return
                        respond(r.team_id || r.team?.id, 'reject', r.team)
                      }}
                    >
                      <X className="size-3.5" />
                      <span>رفض</span>
                    </Button>
                  </div>
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
            const teamId = p.team_id || p.team?.id
            const targetId = teamId || p.id
            const checked = bulkSelected.includes(targetId)
            const isDeleted = Boolean(p.team?.is_deleted || !p.team)
            return (
              <div
                key={p.id}
                onClick={() => !selectMode && p.team && !isDeleted && setSquadTeam(p)}
                className={`flex items-center gap-3 rounded-3xl border p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all ${
                  selectMode && checked
                    ? 'border-green-400 bg-green-50/70'
                    : selectMode
                      ? 'border-slate-200/70 bg-white'
                      : isDeleted
                        ? 'border-rose-200 bg-rose-50/20'
                        : 'cursor-pointer border-slate-200/70 bg-white hover:border-green-300 hover:shadow-md'
                }`}
              >
                {selectMode ? (
                  <button
                    type="button"
                    onClick={() => toggleBulk(targetId)}
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
                    <p className="truncate text-sm font-extrabold text-slate-900">{p.team?.name || (isDeleted ? 'فريق محذوف' : '—')}</p>
                    {isDeleted && <Badge variant="danger">محذوف</Badge>}
                    {p.team?.is_free && <Badge variant="info">{t('committee.detail.freeBadge')}</Badge>}
                    {p.status === 'withdrawn' && <Badge variant="warning">منسحب</Badge>}
                    {p.status === 'disqualified' && <Badge variant="danger">مُقصى</Badge>}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                    <span className="text-[11px] font-semibold text-slate-400">
                      {p.group?.name || t('committee.detail.unassigned')}
                    </span>
                    {p.team?.manager_name && (
                      <span className="font-semibold text-slate-700">
                        المسير: <span className="font-bold">{p.team.manager_name}</span>
                      </span>
                    )}
                    {p.team?.manager_phone && (
                      <div className="inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                        <a
                          href={`https://wa.me/${p.team.manager_phone.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="font-bold text-emerald-700 hover:text-emerald-800 dir-ltr inline-flex items-center gap-1"
                          title="مراسلة المسير عبر واتساب"
                        >
                          <Phone className="size-3" />
                          <span>🇲🇦 {p.team.manager_phone}</span>
                        </a>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            navigator.clipboard.writeText(p.team.manager_phone)
                            toast.success('تم نسخ الرابط بنجاح! 📋')
                          }}
                          className="text-emerald-600 hover:text-emerald-800 p-0.5 rounded hover:bg-emerald-100 transition-colors cursor-pointer"
                          title="نسخ رقم الهاتف"
                        >
                          <Copy className="size-3" />
                        </button>
                      </div>
                    )}
                    {p.team?.players_count > 0 && (
                      <span className="rounded-md bg-slate-100 text-slate-600 px-1.5 py-0.5 text-[10px] font-bold">
                        {p.team.players_count} لاعبين
                      </span>
                    )}
                  </div>
                </div>
                {!selectMode && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    {!isDeleted && p.team && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openTeam(p.team) }}
                        className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/80 transition-colors hover:bg-emerald-100"
                        title="عرض الملف والحجوزات الأسبوعية للفريق"
                        aria-label="عرض الملف والحجوزات الأسبوعية للفريق"
                      >
                        <CalendarDays className="size-4" />
                      </button>
                    )}
                    {!isDeleted && p.payment_status === 'pending' && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); markPaid(teamId) }}
                        disabled={busy === `pay-${teamId}`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 text-[11px] font-bold text-amber-700 ring-1 ring-amber-200 transition-colors hover:bg-amber-100 disabled:opacity-50"
                        title={t('committee.detail.markPaid')}
                      >
                        {busy === `pay-${teamId}` ? (
                          <Check className="size-3.5 animate-pulse" />
                        ) : (
                          <Wallet className="size-3.5" />
                        )}
                        {t('committee.detail.paymentPending')}
                      </button>
                    )}
                    {!isDeleted && p.payment_status === 'completed' && (
                      <span className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2 py-1 text-[10px] font-bold text-green-700 ring-1 ring-green-200">
                          <Check className="size-3" />
                          {t('committee.detail.paymentPaid')}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); unmarkPaid(teamId) }}
                          disabled={busy === `unpay-${teamId}`}
                          className="grid size-9 place-items-center rounded-xl bg-slate-50 text-slate-500 ring-1 ring-slate-200 transition-colors hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"
                          title={t('committee.detail.unmarkPaid')}
                        >
                          <RotateCcw className="size-4" />
                        </button>
                      </span>
                    )}
                    {!isDeleted && p.team?.is_free && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setEditFreeTeam(p.team) }}
                        className="grid size-9 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-green-50 hover:text-green-700"
                        aria-label={t('committee.detail.editFreeTeam')}
                        title={t('committee.detail.editFreeTeam')}
                      >
                        <Pencil className="size-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeTeam(targetId) }}
                      disabled={busy === `remove-${targetId}`}
                      className="grid size-9 place-items-center rounded-xl text-rose-500 transition-colors hover:bg-rose-50 disabled:opacity-50"
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
            <input
              type="text"
              value={archiveSearch}
              onChange={(e) => setArchiveSearch(e.target.value)}
              placeholder="ابحث باسم الفريق، المدينة، المسير أو الهاتف..."
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 focus:bg-white mb-2"
            />
            {available.filter((t) => {
              if (!archiveSearch.trim()) return true
              return (
                matchesArabicSearch(t.name, archiveSearch) ||
                matchesArabicSearch(t.city, archiveSearch) ||
                matchesArabicSearch(t.manager_name, archiveSearch) ||
                (t.manager_phone && t.manager_phone.includes(archiveSearch.trim()))
              )
            }).length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-xs font-semibold text-slate-400">
                {t('committee.detail.noAvailableTeams')}
              </p>
            ) : (
              <div className="max-h-[46vh] space-y-1.5 overflow-y-auto pe-1">
                {available.filter((t) => {
                  if (!archiveSearch.trim()) return true
                  const q = archiveSearch.toLowerCase()
                  return (
                    t.name?.toLowerCase().includes(q) ||
                    t.city?.toLowerCase().includes(q) ||
                    t.manager_name?.toLowerCase().includes(q) ||
                    t.manager_phone?.includes(q)
                  )
                }).map((team) => {
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
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          {team.city && <span>{team.city}</span>}
                          {team.manager_name && <span>• المسير: {team.manager_name}</span>}
                          {team.manager_phone && (
                            <span className="dir-ltr text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/50">
                              🇲🇦 {team.manager_phone}
                            </span>
                          )}
                        </div>
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

      <TeamSquadModal
        key={squadTeam?.team?.id ?? 'none'}
        team={squadTeam?.team}
        tournamentTeam={squadTeam}
        tournamentId={tournament?.id}
        open={Boolean(squadTeam)}
        onClose={() => setSquadTeam(null)}
        onRefresh={refresh}
      />

      <EditFreeTeamModal
        open={Boolean(editFreeTeam)}
        onClose={() => setEditFreeTeam(null)}
        team={editFreeTeam}
        tournamentId={tournament?.id}
        locked={tournament?.has_settled_result}
        onSaved={refresh}
      />
      {/* Modal: Manager Activation Link after approval */}
      {approvedActivation && (
        <Modal
          open={Boolean(approvedActivation)}
          onClose={() => setApprovedActivation(null)}
          title="تم قبول الفريق وتفعيل الرابط بنجاح"
          size="md"
        >
          <div className="space-y-4 text-start">
            <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 border border-emerald-200 text-emerald-900">
              <CheckCircle2 className="size-8 text-emerald-600 shrink-0" />
              <div>
                <p className="text-sm font-black">
                  تم قبول انضمام فريق "{approvedActivation.teamName}" رسمياً للبطولة!
                </p>
                <p className="text-xs text-emerald-700 mt-0.5">
                  تم اعتماد حساب المسير {approvedActivation.managerName} وتوليد رابط تعيين الرقم السري الشخصي له.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                رابط تعيين الرقم السري الشخصي (PIN / Password) للمسير:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={approvedActivation.activationUrl}
                  className="h-10 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-mono text-slate-600 select-all outline-none"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(approvedActivation.activationUrl)
                    setCopiedPinLink(true)
                    toast.success('تم نسخ الرابط بنجاح! 📋')
                    setTimeout(() => setCopiedPinLink(false), 2000)
                  }}
                >
                  <Copy className="size-3.5" />
                  <span>{copiedPinLink ? 'تم النسخ! ✓' : 'نسخ الرابط'}</span>
                </Button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  const phoneClean = approvedActivation.managerPhone.replace(/[^\d]/g, '')
                  const msg = `🏆 *تهانينا! تمت الموافقة على انضمام فريقكم (${approvedActivation.teamName}) إلى بطولة ${tournament.name}*\n\nيرجى الضغط على الرابط التالي لتعيين رقمكم السري الشخصي (PIN) والبدء في تعديل تشكيلة اللاعبين ومتابعة المباريات:\n${approvedActivation.activationUrl}`
                  window.open(`https://wa.me/${phoneClean}?text=${encodeURIComponent(msg)}`, '_blank')
                }}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#1F7A4D] hover:bg-[#1A6841] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                <Share2 className="size-4" />
                <span>مشاركة رابط تعيين الرقم السري مع المسير عبر واتساب 📲</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
