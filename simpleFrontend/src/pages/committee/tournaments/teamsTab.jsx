import { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Check,
  ListChecks,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  UserPlus,
  Wallet,
  X,
  CalendarDays,
  Copy,
  Phone,
  Users,
  Search,
  SlidersHorizontal,
  ChevronLeft,
  MoreVertical,
} from 'lucide-react'
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
import { formatGroupName } from '../../../lib/groupNames'
import { getGroupColor } from '../../../lib/groupColors'

function getGroupBadge(group, orderedGroups = []) {
  const color = getGroupColor(group, orderedGroups)
  return {
    letter: color.shortCode || '—',
    colorClass: color.badgeCls,
    hex: color.hex,
  }
}

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

  // Filter & Search states (matches reference screen)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all')
  const [activeMenuId, setActiveMenuId] = useState(null)

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

  // Extract unique groups for filter chips
  const uniqueGroups = useMemo(() => {
    const map = new Map()
    for (const p of teams || []) {
      if (p.group?.id != null) {
        if (!map.has(p.group.id)) {
          map.set(p.group.id, {
            id: p.group.id,
            name: p.group.name,
            count: 0,
          })
        }
        map.get(p.group.id).count += 1
      }
    }
    return Array.from(map.values())
  }, [teams])

  // Filtered teams list based on active group chip and search text
  const filteredTeams = useMemo(() => {
    let list = teams || []
    if (selectedGroupFilter !== 'all') {
      if (selectedGroupFilter === 'unassigned') {
        list = list.filter((p) => !p.group?.id)
      } else {
        list = list.filter((p) => p.group?.id === selectedGroupFilter)
      }
    }
    if (searchQuery.trim()) {
      list = list.filter((p) => {
        const teamName = p.team?.name || ''
        const managerName = p.team?.manager_name || ''
        return (
          matchesArabicSearch(searchQuery, teamName) ||
          matchesArabicSearch(searchQuery, managerName)
        )
      })
    }
    return list
  }, [teams, selectedGroupFilter, searchQuery])

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

      {/* Header matching reference image: Title + count + action buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-2xl bg-[#B8F000]/30 dark:bg-[#D0FF38]/20 text-[#111313] dark:text-[#D0FF38]">
            <Users className="size-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">الفرق</h2>
              <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-black text-slate-700 dark:text-slate-300">
                {count}
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-400 font-semibold">
              قائمة جميع الفرق المشاركة في البطولة
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={over ? 'danger' : capped && remaining > 0 ? 'warning' : 'success'}>
            {t('committee.detail.teamsCount', { count })}
            {over
              ? ` • ${t('committee.detail.teamsOverLimit', { max: expected })}`
              : capped && remaining > 0
                ? ` • ${t('committee.detail.remaining', { count: remaining })}`
                : ''}
          </Badge>
          {(teams || []).length > 0 && (
            <Button size="sm" variant={selectMode ? 'primary' : 'outline'} onClick={() => { setSelectMode(!selectMode); setBulkSelected([]) }}>
              {selectMode ? <X className="size-4" /> : <ListChecks className="size-4" />}
              <span className="hidden sm:inline">{selectMode ? t('committee.detail.doneSelecting') : t('committee.detail.selectTeams')}</span>
            </Button>
          )}
          <Button size="sm" variant="soft" onClick={() => setFreeOpen(true)} disabled={capped && remaining === 0}>
            <Plus className="size-4" />
            <span className="hidden sm:inline">{t('committee.detail.addFreeTeam')}</span>
          </Button>
          <Button size="sm" onClick={() => setOpen(true)} disabled={capped && remaining === 0}>
            <UserPlus className="size-4" />
            <span className="hidden sm:inline">{t('committee.detail.addTeams')}</span>
          </Button>
        </div>
      </div>

      {/* Search Bar + Filter Pills (Matches Reference Image 2 Right Screen) */}
      <div className="space-y-2.5">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="البحث عن فريق..."
            className="w-full h-11 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1B201D] pe-10 ps-10 text-xs sm:text-sm font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition shadow-2xs"
          />
          <Search className="absolute end-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          {searchQuery ? (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute start-3 top-1/2 -translate-y-1/2 grid size-6 place-items-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="size-3.5" />
            </button>
          ) : (
            <SlidersHorizontal className="absolute start-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          )}
        </div>

        {/* Group Filter Chips */}
        {uniqueGroups.length > 0 && (
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto py-1">
            <button
              type="button"
              onClick={() => setSelectedGroupFilter('all')}
              className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-black transition active:scale-95 cursor-pointer ${
                selectedGroupFilter === 'all'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#1B201D] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:border-slate-300'
              }`}
            >
              الكل {count}
            </button>
            {uniqueGroups.map((g) => {
              const active = selectedGroupFilter === g.id
              const gTitle = formatGroupName(g.name, { groupId: g.id, tournamentId: tournament.id })
              const gColor = getGroupColor(g, uniqueGroups)
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setSelectedGroupFilter(g.id)}
                  className={`inline-flex shrink-0 items-center gap-1.5 h-8 px-3.5 rounded-full text-xs font-black transition active:scale-95 cursor-pointer border ${
                    active
                      ? gColor.activePillCls
                      : 'bg-white dark:bg-[#1B201D] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: gColor.hex }} />
                  <span>{gTitle}</span>
                </button>
              )
            })}
            {(teams || []).some((p) => !p.group?.id) && (
              <button
                type="button"
                onClick={() => setSelectedGroupFilter('unassigned')}
                className={`shrink-0 h-8 px-3 rounded-full text-xs font-bold transition active:scale-95 cursor-pointer ${
                  selectedGroupFilter === 'unassigned'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-white dark:bg-[#1B201D] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
                }`}
              >
                بدون مجموعة
              </button>
            )}
          </div>
        )}
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
                    <TeamAvatar
                      team={r.team}
                      className="size-12 shrink-0 shadow-xs"
                      onClick={r.team?.id != null ? (e) => { e?.stopPropagation?.(); openTeam(r.team) } : undefined}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-black text-slate-900">{r.team?.id != null ? <button type="button" onClick={(e) => { e.stopPropagation(); openTeam(r.team) }} className="max-w-full truncate text-start hover:text-emerald-600 transition-colors cursor-pointer">{r.team.name}</button> : (r.team?.name || '—')}</p>
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
        <div className="space-y-2.5 sm:grid sm:grid-cols-2 xl:grid-cols-3 sm:space-y-0 sm:gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
        </div>
      ) : filteredTeams.length === 0 ? (
        <Empty
          icon={UserPlus}
          title={searchQuery ? 'لا توجد نتائج بحث مطابقة' : t('committee.detail.noTeams')}
          description={searchQuery ? 'جرب البحث بكلمة أخرى أو قم بإلغاء الفلاتر' : t('committee.detail.noTeamsDesc')}
          action={
            searchQuery ? (
              <Button size="sm" variant="soft" onClick={() => { setSearchQuery(''); setSelectedGroupFilter('all') }}>
                إعادة ضبط البحث
              </Button>
            ) : (
              <Button size="sm" variant="soft" onClick={() => setOpen(true)}>{t('committee.detail.addTeams')}</Button>
            )
          }
        />
      ) : (
        <>
          {/* MOBILE VIEW (< md): Modern, sleek, touch-friendly team card rows matching reference image */}
          <div className="space-y-2 md:hidden">
            {filteredTeams.map((p) => {
              const teamId = p.team_id || p.team?.id
              const targetId = teamId || p.id
              const checked = bulkSelected.includes(targetId)
              const isDeleted = Boolean(p.team?.is_deleted || !p.team)
              const badgeInfo = getGroupBadge(p.group, uniqueGroups)

              return (
                <div
                  key={p.id}
                  onClick={() => !selectMode && p.team && !isDeleted && setSquadTeam(p)}
                  className={`flex items-center justify-between gap-3 p-3 rounded-2xl border transition-all ${
                    selectMode && checked
                      ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/30'
                      : isDeleted
                        ? 'border-rose-200 bg-rose-50/20 dark:border-rose-900/40 dark:bg-rose-950/10'
                        : 'border-slate-200/80 dark:border-[#303832] bg-white dark:bg-[#1B201D] hover:border-slate-300 shadow-2xs cursor-pointer'
                  }`}
                >
                  {/* Right Side (RTL start): Checkbox or Avatar + Team Name */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {selectMode ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleBulk(targetId)
                        }}
                        className={`grid size-6 shrink-0 place-items-center rounded-lg border text-white ${
                          checked ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-white dark:bg-slate-800'
                        }`}
                        aria-label={t('committee.detail.selectTeams')}
                      >
                        {checked && <Check className="size-4" />}
                      </button>
                    ) : (
                      <TeamAvatar
                        team={p.team}
                        className="size-10 shrink-0 rounded-xl"
                        onClick={!isDeleted && p.team?.id != null ? (e) => { e?.stopPropagation?.(); openTeam(p.team) } : undefined}
                      />
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                          {!isDeleted && p.team?.id != null ? <button type="button" onClick={(e) => { e.stopPropagation(); openTeam(p.team) }} className="max-w-full truncate text-start hover:text-emerald-600 dark:hover:text-[#D0FF38] transition-colors cursor-pointer">{p.team.name}</button> : (p.team?.name || (isDeleted ? 'فريق محذوف' : '—'))}
                        </p>
                        {isDeleted && <Badge variant="danger" size="xs">محذوف</Badge>}
                        {p.team?.is_free && <Badge variant="info" size="xs">حر</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                        {p.team?.manager_name && (
                          <span className="truncate text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            {p.team.manager_name}
                          </span>
                        )}
                        {p.team?.players_count > 0 && (
                          <span className="text-[10px] font-bold text-slate-400">
                            • {p.team.players_count} لاعبين
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Left Side (RTL end): Group Badge + 3-dots Menu + Chevron */}
                  <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {/* Group Badge */}
                    <span
                      className={`grid size-7 place-items-center rounded-full text-xs font-black ${badgeInfo.colorClass}`}
                      title={p.group?.name ? formatGroupName(p.group.name, { groupId: p.group.id, tournamentId: tournament.id }) : 'غير محدد'}
                    >
                      {badgeInfo.letter}
                    </span>

                    {/* 3-dots Menu Button */}
                    {!selectMode && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(activeMenuId === targetId ? null : targetId)}
                          className="grid size-8 place-items-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                          aria-label="خيارات الفريق"
                        >
                          <MoreVertical className="size-4" />
                        </button>
                        {activeMenuId === targetId && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setActiveMenuId(null)} />
                            <div className="absolute end-0 top-9 z-40 w-48 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1B201D] p-1.5 shadow-xl animate-in fade-in zoom-in-95">
                              <button
                                type="button"
                                onClick={() => { setActiveMenuId(null); setSquadTeam(p); }}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-start cursor-pointer"
                              >
                                <Users className="size-3.5 text-emerald-600" />
                                <span>التشكيلة واللاعبين</span>
                              </button>
                              {p.team && !isDeleted && (
                                <button
                                  type="button"
                                  onClick={() => { setActiveMenuId(null); openTeam(p.team); }}
                                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-start cursor-pointer"
                                >
                                  <CalendarDays className="size-3.5 text-blue-600" />
                                  <span>الملف والحجوزات</span>
                                </button>
                              )}
                              {p.team?.is_free && (
                                <button
                                  type="button"
                                  onClick={() => { setActiveMenuId(null); setEditFreeTeam(p.team); }}
                                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 text-start cursor-pointer"
                                >
                                  <Pencil className="size-3.5 text-amber-600" />
                                  <span>تعديل بيانات الفريق</span>
                                </button>
                              )}
                              {!isDeleted && p.payment_status === 'pending' && (
                                <button
                                  type="button"
                                  onClick={() => { setActiveMenuId(null); markPaid(teamId); }}
                                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-start cursor-pointer"
                                >
                                  <Wallet className="size-3.5 text-emerald-600" />
                                  <span>تأكيد أداء المستحقات</span>
                                </button>
                              )}
                              {!isDeleted && p.payment_status === 'completed' && (
                                <button
                                  type="button"
                                  onClick={() => { setActiveMenuId(null); unmarkPaid(teamId); }}
                                  className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-start cursor-pointer"
                                >
                                  <RotateCcw className="size-3.5 text-amber-600" />
                                  <span>إلغاء تأكيد الأداء</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => { setActiveMenuId(null); removeTeam(targetId); }}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-start cursor-pointer"
                              >
                                <Trash2 className="size-3.5 text-rose-500" />
                                <span>حذف من البطولة</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Chevron to navigate */}
                    <ChevronLeft className="size-4 text-slate-300 dark:text-slate-600 shrink-0" />
                  </div>
                </div>
              )
            })}
          </div>

          {/* DESKTOP VIEW (>= md): Full rich card grid with manager contact & full action toolbar */}
          <div className="hidden md:grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filteredTeams.map((p) => {
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
                      ? 'border-green-400 bg-green-50/70 dark:bg-green-950/30'
                      : selectMode
                        ? 'border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#1B201D]'
                        : isDeleted
                          ? 'border-rose-200 bg-rose-50/20 dark:border-rose-900/40 dark:bg-rose-950/10'
                          : 'cursor-pointer border-slate-200/70 dark:border-slate-800 bg-white dark:bg-[#1B201D] hover:border-green-300 hover:shadow-md'
                  }`}
                >
                  {selectMode ? (
                    <button
                      type="button"
                      onClick={() => toggleBulk(targetId)}
                      className={`grid size-6 shrink-0 place-items-center rounded-lg border text-white ${
                        checked ? 'border-green-500 bg-green-500' : 'border-slate-300 bg-white dark:bg-slate-800'
                      }`}
                      aria-label={t('committee.detail.selectTeams')}
                    >
                      {checked && <Check className="size-4" />}
                    </button>
                  ) : (
                    <TeamAvatar
                      team={p.team}
                      className="size-10"
                      onClick={!isDeleted && p.team?.id != null ? (e) => { e?.stopPropagation?.(); openTeam(p.team) } : undefined}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{!isDeleted && p.team?.id != null ? <button type="button" onClick={(e) => { e.stopPropagation(); openTeam(p.team) }} className="max-w-full truncate text-start hover:text-emerald-600 dark:hover:text-[#D0FF38] transition-colors cursor-pointer">{p.team.name}</button> : (p.team?.name || (isDeleted ? 'فريق محذوف' : '—'))}</p>
                      {isDeleted && <Badge variant="danger">محذوف</Badge>}
                      {p.team?.is_free && <Badge variant="info">{t('committee.detail.freeBadge')}</Badge>}
                      {p.status === 'withdrawn' && <Badge variant="warning">منسحب</Badge>}
                      {p.status === 'disqualified' && <Badge variant="danger">مُقصى</Badge>}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-slate-500">
                      {p.group?.name ? (() => {
                        const gColor = getGroupColor(p.group, uniqueGroups)
                        return (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${gColor.badgeCls}`}>
                            <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: gColor.hex }} />
                            <span>{formatGroupName(p.group.name, { groupId: p.group.id, tournamentId: tournament.id })}</span>
                          </span>
                        )
                      })() : (
                        <span className="text-[11px] font-semibold text-slate-400">
                          {t('committee.detail.unassigned')}
                        </span>
                      )}
                      {p.team?.manager_name && (
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          المسير: <span className="font-bold">{p.team.manager_name}</span>
                        </span>
                      )}
                      {p.team?.manager_phone && (
                        <div className="inline-flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-200/60 dark:border-emerald-800/60">
                          <a
                            href={`https://wa.me/${p.team.manager_phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dir-ltr inline-flex items-center gap-1"
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
                        <span className="rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 text-[10px] font-bold">
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
                          className="grid size-9 place-items-center rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-200/80 dark:ring-emerald-800 transition-colors hover:bg-emerald-100 cursor-pointer"
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
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 px-2.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50 cursor-pointer"
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
                          <span className="inline-flex items-center gap-1 rounded-lg bg-green-50 dark:bg-green-950/50 px-2 py-1 text-[10px] font-bold text-green-700 dark:text-green-400 ring-1 ring-green-200 dark:ring-green-800">
                            <Check className="size-3" />
                            {t('committee.detail.paymentPaid')}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); unmarkPaid(teamId) }}
                            disabled={busy === `unpay-${teamId}`}
                            className="grid size-9 place-items-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-500 ring-1 ring-slate-200 dark:ring-slate-700 transition-colors hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50 cursor-pointer"
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
                          className="grid size-9 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-green-50 hover:text-green-700 cursor-pointer"
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
                        className="grid size-9 place-items-center rounded-xl text-rose-500 transition-colors hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-50 cursor-pointer"
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
        </>
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
              placeholder="البحث في قائمة الفرق..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:outline-none"
            />
          </Field>
          <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
            {available
              .filter((team) => !archiveSearch.trim() || matchesArabicSearch(archiveSearch, team.name))
              .map((team) => {
                const checked = selected.includes(team.id)
                return (
                  <div
                    key={team.id}
                    onClick={() => toggle(team.id)}
                    className={`flex cursor-pointer items-center justify-between rounded-2xl border p-3 transition ${
                      checked ? 'border-green-400 bg-green-50/60' : 'border-slate-200/70 hover:border-green-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <TeamAvatar team={team} className="size-9" onClick={team?.id != null ? (e) => { e?.stopPropagation?.(); setOpen(false); openTeam(team) } : undefined} />
                      <div className="min-w-0">
                        <p className="text-sm font-extrabold text-slate-900 truncate">{team?.id != null ? <button type="button" onClick={(e) => { e.stopPropagation(); setOpen(false); openTeam(team) }} className="max-w-full truncate text-start hover:text-emerald-600 transition-colors cursor-pointer">{team.name}</button> : team.name}</p>
                        {team.city && <p className="text-xs text-slate-500">{team.city}</p>}
                      </div>
                    </div>
                    <div
                      className={`grid size-6 shrink-0 place-items-center rounded-lg border text-white ${
                        checked ? 'border-green-500 bg-green-500' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {checked && <Check className="size-4" />}
                    </div>
                  </div>
                )
              })}
          </div>
          <Button className="w-full" disabled={selected.length === 0} loading={busy === 'add'} onClick={addTeams}>
            {t('committee.detail.addSelected', { count: selected.length })}
          </Button>
        </div>
      </Drawer>

      <Modal open={groupOpen} onClose={() => setGroupOpen(false)} title={t('committee.detail.bulkMoveGroup')}>
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            {t('committee.detail.bulkMoveGroupDesc', { count: bulkSelected.length })}
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {(groups || []).map((g) => (
              <button
                key={g.group_id}
                type="button"
                onClick={() => moveToGroup(g.group_id)}
                className="flex items-center justify-between rounded-2xl border border-slate-200/70 p-3 text-start hover:border-green-400 hover:bg-green-50/50 transition cursor-pointer"
              >
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatGroupName(g.name, { groupId: g.group_id, tournamentId: tournament.id })}</span>
                <Badge variant="soft">{g.team_count}</Badge>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      <Modal open={freeOpen} onClose={() => setFreeOpen(false)} title={t('committee.detail.addFreeTeam')}>
        <div className="space-y-4">
          <p className="text-xs text-slate-500">{t('committee.detail.freeTeamsHelp')}</p>
          <Field label={t('committee.detail.freeTeamNames')}>
            <textarea
              rows={5}
              value={freeNames}
              onChange={(e) => setFreeNames(e.target.value)}
              placeholder="فريق الأمل&#10;فريق النصر&#10;نجوم الحي"
              className="w-full rounded-2xl border border-slate-200 p-3 text-xs leading-relaxed focus:border-green-500 focus:outline-none"
            />
          </Field>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setFreeOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" loading={freeBusy} disabled={!freeNames.trim()} onClick={addFreeTeams}>
              {t('common.save')}
            </Button>
          </div>
        </div>
      </Modal>

      {squadTeam && (
        <TeamSquadModal
          tournament={tournament}
          tournamentTeam={squadTeam}
          onClose={() => setSquadTeam(null)}
          onSquadUpdated={() => {
            refresh()
          }}
        />
      )}

      {editFreeTeam && (
        <EditFreeTeamModal
          tournament={tournament}
          team={editFreeTeam}
          onClose={() => setEditFreeTeam(null)}
          onUpdated={() => {
            refresh()
          }}
        />
      )}

      {approvedActivation && (
        <Modal
          open={Boolean(approvedActivation)}
          onClose={() => {
            setApprovedActivation(null)
            setCopiedPinLink(false)
          }}
          title="🎉 تم قبول الفريق وتفعيل الحساب"
        >
          <div className="space-y-4 p-1 text-slate-800">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 text-center">
              <span className="text-2xl">✅</span>
              <p className="mt-1 text-sm font-black text-emerald-950">
                {approvedActivation.teamName}
              </p>
              <p className="text-xs font-semibold text-emerald-700">
                المسير: {approvedActivation.managerName}
              </p>
              {approvedActivation.managerPhone && (
                <p className="text-xs font-bold text-emerald-800 dir-ltr mt-0.5">
                  🇲🇦 {approvedActivation.managerPhone}
                </p>
              )}
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs">
              <p className="font-bold text-slate-800">📌 رابط إعداد كلمة المرور للمسير:</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                إذا لم يفتح واتساب تلقائياً، يمكنك نسخ هذا الرابط وإرساله للمسير في أي وقت:
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={approvedActivation.activationUrl || ''}
                  className="flex-1 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-[11px] font-mono text-slate-700 select-all"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(approvedActivation.activationUrl)
                    setCopiedPinLink(true)
                    toast.success('تم نسخ الرابط بنجاح! 📋')
                    setTimeout(() => setCopiedPinLink(false), 2500)
                  }}
                  className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer"
                >
                  <Copy className="size-3.5" />
                  <span>{copiedPinLink ? 'تم النسخ!' : 'نسخ'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              {approvedActivation.whatsappUrl && (
                <a
                  href={approvedActivation.whatsappUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold text-xs transition shadow-xs"
                >
                  <span>📲 فتح واتساب مجدداً</span>
                </a>
              )}
              <Button
                variant="outline"
                size="sm"
                className="ms-auto"
                onClick={() => {
                  setApprovedActivation(null)
                  setCopiedPinLink(false)
                }}
              >
                إغلاق
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
