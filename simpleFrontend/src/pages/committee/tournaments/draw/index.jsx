import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Check,
  CheckCircle2,
  Dices,
  Edit3,
  Layers,
  Plus,
  Save,
  Shuffle,
  Sparkles,
  Unlock,
  Users,
} from 'lucide-react'
import api from '../../../../api/client'
import { useApi } from '../../../../hooks/useApi'
import { Badge, Button, Card, Empty, Modal, Skeleton } from '../../../../components/dashboard/ui'
import { TeamAvatar } from '../../../tournaments/shared'
import { useToast } from '../../../../components/ui/Toast'
import { toastApiError } from '../../../../lib/errors'
import { formatGroupName, setCustomGroupName } from '../../../../lib/groupNames'
import { commitMove, deriveDisplayGroups, isNewGroup, membersOf, nextGroupLabel } from './drawLogic'
import GroupColumn from './GroupColumn'
import TeamPool from './TeamPool'
import RenameGroupModal from './RenameGroupModal'

export default function DrawBoard({ tournament, refresh, refreshKey, setActive }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [busy, setBusy] = useState(null)
  const [drag, setDrag] = useState(null)
  const [local, setLocal] = useState(null)
  const [dirty, setDirty] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [wideGroups, setWideGroups] = useState(null)
  const [orgMode, setOrgMode] = useState('smart') // 'smart' | 'manual'
  const [expandedGroups, setExpandedGroups] = useState({})
  const [editingGroup, setEditingGroup] = useState(null)
  const [renamingGroup, setRenamingGroup] = useState(null)
  const [, setGroupNameTick] = useState(0)
  const seqRef = useRef(0)

  const { data: serverTeams, loading } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/teams`).then((r) => r.data.data),
    [tournament.id, refreshKey],
  )

  const { data: serverGroups } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/draw`).then((r) => r.data.data),
    [tournament.id, refreshKey],
  )

  useEffect(() => {
    if (serverGroups) {
      const mapped = serverGroups.map((g) => ({ id: g.group_id, name: g.name }))
      setWideGroups(mapped)
      if (mapped.length > 0) {
        setExpandedGroups((prev) => (Object.keys(prev).length > 0 ? prev : { [mapped[0].id]: true }))
      }
    }
  }, [serverGroups])

  useEffect(() => {
    setLocal(null)
    setDirty(false)
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

  const newGroupPayload = () => (wideGroups || []).filter(isNewGroup).map((g) => ({ key: g.id }))

  const hasFixtures = (tournament.stats?.fixtures ?? 0) > 0
  const confirmed = Boolean(tournament.draw_confirmed_at || tournament.draw_confirmed)
  const editableStatus =
    tournament.settings_editable ?? ['draft', 'open_for_registration', 'registration_closed'].includes(tournament.status)
  const canEdit = editableStatus && !confirmed
  const canUnlock = editableStatus && confirmed
  const freeMode = tournament.group_mode === 'free'
  const cap = freeMode ? null : tournament.teams_per_group || 4

  const baseGroups = (serverGroups || []).map((g) => ({ id: g.group_id, name: g.name }))
  const currentGroups = wideGroups || baseGroups
  const displayGroups = useMemo(() => {
    if (freeMode) return deriveDisplayGroups(teams, currentGroups)
    return currentGroups
  }, [teams, currentGroups, freeMode])

  // Requirement 3: HIDE EMPTY GROUPS
  // - Groups containing at least one assigned team are displayed.
  // - Groups containing zero teams are hidden from cards, counts, and navigation.
  const visibleGroups = useMemo(() => {
    const withTeams = (displayGroups || []).filter((g) => membersOf(teams, g.id).length > 0)
    // If no teams are drawn yet anywhere (initial empty state), show all groups so organizer can start
    if (withTeams.length === 0 && assigned === 0) {
      return displayGroups
    }
    return withTeams
  }, [displayGroups, teams, assigned])

  const allDrawn = total > 0 && assigned === total

  const toggleGroupExpand = (gid) => {
    setExpandedGroups((prev) => ({ ...prev, [gid]: !prev[gid] }))
  }

  const renameGroup = async (groupObj, nextName) => {
    const trimmed = String(nextName || '').trim()
    if (!trimmed) {
      toast.error('اسم المجموعة لا يمكن أن يكون فارغاً')
      throw new Error('اسم المجموعة لا يمكن أن يكون فارغاً')
    }

    const duplicate = displayGroups.some(
      (g) => g.id !== groupObj.id && String(g.name || '').trim().toLowerCase() === trimmed.toLowerCase(),
    )
    if (duplicate) {
      const msg = 'اسم المجموعة مستخدم بالفعل في هذه البطولة'
      toast.error(msg)
      throw new Error(msg)
    }

    if (isNewGroup(groupObj)) {
      setWideGroups((prev) =>
        (prev || displayGroups).map((g) => (g.id === groupObj.id ? { ...g, name: trimmed } : g)),
      )
      setCustomGroupName(groupObj.id, trimmed, tournament.id)
      setGroupNameTick((n) => n + 1)
      toast.success(`تم تحديث اسم المجموعة إلى "${trimmed}"`)
      return
    }

    setBusy(`rename-${groupObj.id}`)
    try {
      const res = await api.put(`/committee/tournaments/${tournament.id}/draw/groups/${groupObj.id}`, {
        name: trimmed,
      })
      const updatedName = res.data?.data?.name || trimmed
      setWideGroups((prev) =>
        (prev || displayGroups).map((g) => (g.id === groupObj.id ? { ...g, name: updatedName } : g)),
      )
      setCustomGroupName(groupObj.id, updatedName, tournament.id)
      setGroupNameTick((n) => n + 1)
      toast.success(res.data?.message || `تم تحديث اسم المجموعة إلى "${updatedName}"`)
      refresh?.()
    } catch (e) {
      toastApiError(e, t)
      throw e
    } finally {
      setBusy(null)
    }
  }

  const movePivotToTarget = (pivotId, target) => {
    if (!canEdit || busy) return
    const result = commitMove(teams, pivotId, target, {
      groups: displayGroups,
      mode: tournament.group_mode,
      cap: cap ?? Infinity,
    })
    setLocal(result.teams)
    if (freeMode) {
      setWideGroups(deriveDisplayGroups(result.teams, displayGroups, seqRef))
    }
    setDirty(true)
    if (result.redirectedTo) {
      toast.info(t('committee.detail.groupFullRedirect', { group: result.redirectedTo }))
    }
  }

  const moveTeamByTeamId = (teamId, targetGroupObj) => {
    const pivot = teams.find((p) => p.team?.id === teamId)
    if (!pivot) return
    if (!targetGroupObj) {
      movePivotToTarget(pivot.id, { type: 'pool' })
    } else {
      movePivotToTarget(pivot.id, { type: 'group', id: targetGroupObj.id })
    }
  }

  const toggleTeamInGroupModal = (pivot, groupObj) => {
    if (!canEdit || busy) return
    if (pivot.group?.id === groupObj.id) {
      movePivotToTarget(pivot.id, { type: 'pool' })
    } else {
      movePivotToTarget(pivot.id, { type: 'group', id: groupObj.id })
    }
  }

  const addGroup = () => {
    if (!canEdit || busy) return
    seqRef.current += 1
    const newId = `__new__${seqRef.current}`
    const newName = nextGroupLabel(displayGroups)
    const nextGroups = [...displayGroups, { id: newId, name: newName, isNew: true }]
    setWideGroups(nextGroups)
    setExpandedGroups((prev) => ({ ...prev, [newId]: true }))
    setDirty(true)
  }

  const emptyOrDeleteGroup = (groupObj) => {
    if (!canEdit || busy) return
    const members = membersOf(teams, groupObj.id)
    const gTitle = formatGroupName(groupObj.name, { groupId: groupObj.id, tournamentId: tournament.id })
    if (members.length > 0 && !window.confirm(`هل تريد تفريغ الفرق من ${gTitle}؟`)) return
    const nextTeams = teams.map((p) =>
      p.group?.id === groupObj.id ? { ...p, group: null, group_position: null } : p,
    )
    setLocal(nextTeams)
    if (isNewGroup(groupObj)) {
      setWideGroups((prev) => (prev || []).filter((g) => g.id !== groupObj.id))
    }
    setDirty(true)
  }

  const onDragStart = (teamId) => (e) => {
    if (!canEdit || busy) {
      e.preventDefault()
      return
    }
    const pivot = teams.find((p) => p.team?.id === teamId)
    if (!pivot) return
    setDrag({
      pivotId: pivot.id,
      teamId: pivot.team?.id,
      fromGroupId: pivot.group?.id ?? null,
    })
    e.dataTransfer.effectAllowed = 'move'
    try {
      e.dataTransfer.setData('text/plain', String(teamId))
    } catch {}
  }

  const onDropGroup = (groupObj) => (e) => {
    e.preventDefault()
    e.stopPropagation()
    const rawId = Number(e.dataTransfer.getData('text/plain'))
    const pivot = drag?.pivotId
      ? teams.find((p) => p.id === drag.pivotId)
      : teams.find((p) => p.team?.id === rawId)
    setDrag(null)
    if (!pivot) return
    movePivotToTarget(pivot.id, { type: 'group', id: groupObj.id })
  }

  const onDropPool = (e) => {
    e.preventDefault()
    e.stopPropagation()
    const rawId = Number(e.dataTransfer.getData('text/plain'))
    const pivot = drag?.pivotId
      ? teams.find((p) => p.id === drag.pivotId)
      : teams.find((p) => p.team?.id === rawId)
    setDrag(null)
    if (!pivot) return
    movePivotToTarget(pivot.id, { type: 'pool' })
  }

  const save = async () => {
    setBusy('save')
    try {
      await api.put(`/committee/tournaments/${tournament.id}/draw/teams`, {
        teams: drawPayload(),
        groups: newGroupPayload(),
      })
      setDirty(false)
      toast.success(t('committee.detail.drawSaved') || 'تم حفظ توزيع المجموعات بنجاح')
      refresh()
      return true
    } catch (e) {
      toastApiError(e, t)
      return false
    } finally {
      setBusy(null)
    }
  }

  const autoDraw = async () => {
    setBusy('draw')
    try {
      await api.post(`/committee/tournaments/${tournament.id}/draw`)
      setLocal(null)
      setDirty(false)
      toast.success(t('committee.detail.drawComplete') || 'تم التوزيع العشوائي بنجاح')
      refresh()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  const unassignAll = () => {
    if (!canEdit || busy) return
    const next = teams.map((p) => ({ ...p, group: null, group_position: null }))
    setLocal(next)
    if (freeMode) {
      setWideGroups(deriveDisplayGroups(next, currentGroups, seqRef))
    }
    setDirty(true)
  }

  const confirmAndProceed = async () => {
    if (confirmed) {
      setActive?.('fixtures')
      return
    }
    setBusy('confirm')
    try {
      if (dirty) {
        await api.put(`/committee/tournaments/${tournament.id}/draw/teams`, {
          teams: drawPayload(),
          groups: newGroupPayload(),
        })
        setDirty(false)
      }
      await api.post(`/committee/tournaments/${tournament.id}/draw/confirm`)
      setPreviewOpen(false)
      toast.success(t('committee.detail.drawConfirmed') || 'تم اعتماد المجموعات بنجاح')
      refresh()
      setActive?.('fixtures')
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  const unlockDraw = async () => {
    if (hasFixtures && !window.confirm(t('committee.detail.unlockDrawDeleteFixturesConfirm'))) return
    setBusy('unlock')
    try {
      await api.delete(`/committee/tournaments/${tournament.id}/draw/confirm`)
      toast.success(t('committee.detail.drawUnlocked') || 'تم إلغاء الاعتماد لتمكين التعديل')
      refresh()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 rounded-2xl" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    )
  }

  if (total === 0) {
    return (
      <Card title={t('committee.detail.draw')}>
        <Empty
          icon={Users}
          title={t('committee.detail.noTeamsToDraw')}
          description={t('committee.detail.noTeamsToDrawDesc')}
        />
      </Card>
    )
  }

  const editingGroupMembers = editingGroup ? membersOf(teams, editingGroup.id) : []
  const editingGroupTitle = editingGroup
    ? formatGroupName(editingGroup.name, { groupId: editingGroup.id, tournamentId: tournament.id })
    : ''

  return (
    <div className="space-y-4 pb-8">
      {/* B. Compact 3-Column Summary Card (Matches Reference Image 2) */}
      <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-3.5 sm:p-4 shadow-2xs">
        <div className="grid grid-cols-3 divide-x divide-x-reverse divide-[#E1E5DF] dark:divide-[#303832] text-center">
          <div className="flex flex-col items-center justify-center px-2">
            <span className="text-[11px] sm:text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] mb-1">
              عدد المجموعات
            </span>
            <div className="flex items-center gap-1.5">
              <Layers className="size-4 text-[#111313] dark:text-[#D0FF38]" />
              <span className="text-lg sm:text-xl font-black text-[#111313] dark:text-[#F5F7F2] font-mono tabular-nums">
                {visibleGroups.length}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center px-2">
            <span className="text-[11px] sm:text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] mb-1">
              عدد الفرق
            </span>
            <div className="flex items-center gap-1.5">
              <Users className="size-4 text-[#111313] dark:text-[#D0FF38]" />
              <span className="text-lg sm:text-xl font-black text-[#111313] dark:text-[#F5F7F2] font-mono tabular-nums">
                {total}
              </span>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center px-2">
            <span className="text-[11px] sm:text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] mb-1">
              حالة المجموعات
            </span>
            {allDrawn && total > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#1F9D55]/15 dark:bg-[#30D158]/20 px-2.5 py-0.5 text-xs font-black text-[#1F9D55] dark:text-[#30D158]">
                <Check className="size-3 stroke-[3]" />
                <span>مكتملة</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#D97706]/15 px-2.5 py-0.5 text-xs font-black text-[#D97706] dark:text-[#F59E0B] font-mono tabular-nums">
                {assigned}/{total}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* C. Organization Mode Selector & Quick Actions ("إدارة المجموعات") */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-black text-[#111313] dark:text-[#F5F7F2]">
            إدارة المجموعات
          </h2>
          {canUnlock && (
            <button
              type="button"
              onClick={unlockDraw}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] px-3 py-1.5 text-xs font-bold text-[#111313] dark:text-[#F5F7F2] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27] transition cursor-pointer"
            >
              <Unlock className="size-3.5 text-[#D97706]" />
              <span>{t('committee.detail.unlockDraw') || 'تعديل التوزيع'}</span>
            </button>
          )}
        </div>

        {/* Two Organization Mode Cards (تنظيم ذكي vs تنظيم يدوي) */}
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={() => setOrgMode('smart')}
            className={`relative flex flex-col items-center justify-center rounded-2xl border p-3.5 sm:p-4 text-center transition-all cursor-pointer ${
              orgMode === 'smart'
                ? 'border-[#B8F000] dark:border-[#D0FF38] bg-[#B8F000]/20 dark:bg-[#D0FF38]/12 shadow-2xs'
                : 'border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27]'
            }`}
          >
            {orgMode === 'smart' && (
              <span className="absolute top-2.5 start-2.5 flex size-5 items-center justify-center rounded-full bg-[#1F9D55] dark:bg-[#30D158] text-white">
                <Check className="size-3 stroke-[3]" />
              </span>
            )}
            <Sparkles className="size-5 sm:size-6 text-[#111313] dark:text-[#D0FF38] mb-1.5" />
            <span className="text-sm font-black text-[#111313] dark:text-[#F5F7F2]">تنظيم ذكي</span>
            <span className="mt-0.5 text-[11px] font-semibold text-[#65706A] dark:text-[#B2B9B3] leading-snug">
              توزيع الفرق تلقائياً على المجموعات
            </span>
          </button>

          <button
            type="button"
            onClick={() => setOrgMode('manual')}
            className={`relative flex flex-col items-center justify-center rounded-2xl border p-3.5 sm:p-4 text-center transition-all cursor-pointer ${
              orgMode === 'manual'
                ? 'border-[#B8F000] dark:border-[#D0FF38] bg-[#B8F000]/20 dark:bg-[#D0FF38]/12 shadow-2xs'
                : 'border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27]'
            }`}
          >
            {orgMode === 'manual' && (
              <span className="absolute top-2.5 start-2.5 flex size-5 items-center justify-center rounded-full bg-[#1F9D55] dark:bg-[#30D158] text-white">
                <Check className="size-3 stroke-[3]" />
              </span>
            )}
            <Edit3 className="size-5 sm:size-6 text-[#111313] dark:text-[#D0FF38] mb-1.5" />
            <span className="text-sm font-black text-[#111313] dark:text-[#F5F7F2]">تنظيم يدوي</span>
            <span className="mt-0.5 text-[11px] font-semibold text-[#65706A] dark:text-[#B2B9B3] leading-snug">
              إنشاء المجموعات وتوزيع الفرق بنفسك
            </span>
          </button>
        </div>

        {/* Quick Action Pills Row (+ إضافة مجموعة | توزيع عشوائي | إعادة التوزيع) */}
        {canEdit && (
          <div className="flex flex-wrap items-center gap-2">
            {(freeMode || orgMode === 'manual') && (
              <button
                type="button"
                onClick={addGroup}
                disabled={busy !== null}
                className="flex flex-1 min-w-[110px] h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27] px-3 text-xs font-black text-[#111313] dark:text-[#F5F7F2] shadow-2xs transition active:scale-95 cursor-pointer"
              >
                <Plus className="size-4 text-[#111313] dark:text-[#D0FF38]" />
                <span>إضافة مجموعة</span>
              </button>
            )}

            <button
              type="button"
              onClick={autoDraw}
              disabled={busy !== null}
              className="flex flex-1 min-w-[110px] h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27] px-3 text-xs font-black text-[#111313] dark:text-[#F5F7F2] shadow-2xs transition active:scale-95 cursor-pointer"
            >
              <Dices className="size-4 text-[#111313] dark:text-[#D0FF38]" />
              <span>{busy === 'draw' ? 'جاري التوزيع...' : 'توزيع عشوائي'}</span>
            </button>

            <button
              type="button"
              onClick={unassignAll}
              disabled={busy !== null || assigned === 0}
              className="flex flex-1 min-w-[110px] h-10 items-center justify-center gap-1.5 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27] disabled:opacity-45 px-3 text-xs font-black text-[#111313] dark:text-[#F5F7F2] shadow-2xs transition active:scale-95 cursor-pointer"
            >
              <Shuffle className="size-4 text-[#65706A] dark:text-[#B2B9B3]" />
              <span>إعادة التوزيع</span>
            </button>

            {dirty && (
              <button
                type="button"
                onClick={save}
                disabled={busy !== null}
                className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-[#111313] dark:bg-[#D0FF38] px-4 text-xs font-black text-white dark:text-[#111313] shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Save className="size-3.5" />
                <span>{busy === 'save' ? 'جاري الحفظ...' : 'حفظ التعديلات'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Unassigned Teams Pool */}
      {canEdit && pool.length > 0 && (
        <TeamPool
          title={t('committee.detail.teamPool') || 'الفرق غير الموزعة'}
          hint="اضغط على الفريق لتعيينه للمجموعة المتاحة أو اسحبه إلى أي مجموعة"
          allDrawnText={t('committee.detail.poolEmpty') || 'تم توزيع جميع الفرق'}
          entries={pool}
          onDragStart={onDragStart}
          onDrop={onDropPool}
          locked={!canEdit}
          onSelectTeam={(entry) => {
            const availGroup = displayGroups.find((g) => {
              const m = membersOf(teams, g.id)
              return cap == null || m.length < cap
            })
            if (availGroup) {
              movePivotToTarget(entry.id, { type: 'group', id: availGroup.id })
            } else if (displayGroups[0]) {
              setEditingGroup(displayGroups[0])
            }
          }}
        />
      )}

      {/* D. Expandable Group Cards List */}
      <div className="space-y-2.5">
        {visibleGroups.map((g) => {
          const groupTitle = formatGroupName(g.name, { groupId: g.id, tournamentId: tournament.id })
          return (
            <GroupColumn
              key={g.id}
              title={groupTitle}
              groupName={g.name}
              groupObj={g}
              members={membersOf(teams, g.id)}
              capacity={cap}
              locked={!canEdit}
              expanded={Boolean(expandedGroups[g.id])}
              onToggleExpand={() => toggleGroupExpand(g.id)}
              onDragStart={onDragStart}
              onDrop={onDropGroup(g)}
              onRemoveTeam={(teamId) => moveTeamByTeamId(teamId, null)}
              onDeleteGroup={canEdit ? () => emptyOrDeleteGroup(g) : null}
              onRenameGroup={canEdit ? (nextName) => renameGroup(g, nextName) : null}
              onOpenRenameModal={canEdit ? () => setRenamingGroup(g) : null}
              onEditTeams={canEdit ? () => setEditingGroup(g) : null}
            />
          )
        })}
      </div>

      {/* E. Bottom Primary Confirmation Button (Matches Reference Image 2) */}
      <div className="pt-2">
        <button
          type="button"
          disabled={busy !== null || (!confirmed && !allDrawn && !dirty)}
          onClick={confirmAndProceed}
          className="w-full flex h-12 sm:h-13 items-center justify-center gap-2 rounded-2xl bg-[#B8F000] dark:bg-[#D0FF38] hover:opacity-95 disabled:opacity-45 text-sm sm:text-base font-black text-[#111313] shadow-sm transition active:scale-[0.99] cursor-pointer"
        >
          <Check className="size-5 stroke-[2.8]" />
          <span>
            {confirmed
              ? 'المجموعات معتمدة — المتابعة إلى المباريات'
              : busy === 'confirm' || busy === 'save'
                ? 'جاري الحفظ والاعتماد...'
                : 'اعتماد المجموعات والمتابعة'}
          </span>
        </button>
      </div>

      {/* Mobile-Friendly Group Teams Picker Modal ("تعديل الفرق") */}
      {editingGroup && (
        <Modal
          open={Boolean(editingGroup)}
          onClose={() => setEditingGroup(null)}
          title={`تعديل فرق ${editingGroupTitle}`}
          size="md"
        >
          <div className="space-y-4" dir="rtl">
            <div className="flex items-center justify-between rounded-xl bg-[#F7F8F5] dark:bg-[#252B27] px-3.5 py-2.5 text-xs">
              <span className="font-bold text-[#65706A] dark:text-[#B2B9B3]">
                اضغط على الفريق لإضافته أو إزالته من {editingGroupTitle}
              </span>
              <span className="rounded-full bg-[#B8F000] dark:bg-[#D0FF38] px-2.5 py-0.5 font-black text-[#111313]">
                {editingGroupMembers.length} {cap ? `/ ${cap}` : ''} فرق
              </span>
            </div>

            <div className="max-h-80 space-y-1.5 overflow-y-auto pe-1">
              {teams.map((pivot) => {
                const inThisGroup = pivot.group?.id === editingGroup.id
                const inOtherGroup = pivot.group && pivot.group.id !== editingGroup.id
                const otherGroupTitle = inOtherGroup
                  ? formatGroupName(pivot.group.name, { groupId: pivot.group.id, tournamentId: tournament.id })
                  : ''
                return (
                  <button
                    key={pivot.id}
                    type="button"
                    onClick={() => toggleTeamInGroupModal(pivot, editingGroup)}
                    className={`w-full flex items-center justify-between gap-3 rounded-xl border p-3 text-start transition cursor-pointer ${
                      inThisGroup
                        ? 'border-[#B8F000] dark:border-[#D0FF38] bg-[#B8F000]/15 dark:bg-[#D0FF38]/12'
                        : 'border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <TeamAvatar team={pivot.team} className="size-8 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                          {pivot.team?.name}
                        </p>
                        {inOtherGroup && (
                          <p className="text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
                            حالياً في {otherGroupTitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {inThisGroup ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#1F9D55] dark:bg-[#30D158] px-2.5 py-1 text-[11px] font-black text-white">
                          <Check className="size-3 stroke-[3]" />
                          <span>مضاف</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-2.5 py-1 text-[11px] font-bold text-[#111313] dark:text-[#F5F7F2]">
                          <Plus className="size-3" />
                          <span>{inOtherGroup ? 'نقل لهنا' : 'إضافة'}</span>
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#E1E5DF] dark:border-[#303832]">
              <button
                type="button"
                onClick={async () => {
                  setEditingGroup(null)
                  if (dirty) await save()
                }}
                className="flex-1 h-11 rounded-xl bg-[#B8F000] dark:bg-[#D0FF38] text-xs sm:text-sm font-black text-[#111313] cursor-pointer"
              >
                حفظ وإغلاق
              </button>
              <button
                type="button"
                onClick={() => setEditingGroup(null)}
                className="h-11 px-4 rounded-xl border border-[#E1E5DF] dark:border-[#303832] text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Preview Modal */}
      <Modal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={t('committee.detail.previewDraw')}
        subtitle={t('committee.detail.confirmDrawDesc')}
        size="lg"
      >
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {visibleGroups.map((g) => {
              const members = membersOf(teams, g.id)
              const gTitle = formatGroupName(g.name, { groupId: g.id, tournamentId: tournament.id })
              return (
                <div key={g.id} className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-sm font-extrabold text-[#111313] dark:text-[#F5F7F2]">{gTitle}</h4>
                    <Badge variant={cap && members.length >= cap ? 'success' : 'neutral'}>
                      {freeMode ? members.length : `${members.length}/${cap}`}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {members.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-2.5 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] px-3 py-2"
                      >
                        <TeamAvatar team={p.team} className="size-7" />
                        <span className="truncate text-xs font-bold text-[#111313] dark:text-[#F5F7F2]">
                          {p.team?.name || '-'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-end gap-2 border-t border-[#E1E5DF] dark:border-[#303832] pt-4">
            <Button size="sm" variant="outline" onClick={() => setPreviewOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button size="sm" loading={busy === 'confirm'} disabled={!allDrawn} onClick={confirmAndProceed}>
              <CheckCircle2 className="size-4" />
              {t('committee.detail.confirmDraw')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Rename Group Modal */}
      <RenameGroupModal
        open={Boolean(renamingGroup)}
        onClose={() => setRenamingGroup(null)}
        group={renamingGroup}
        tournamentId={tournament.id}
        existingGroups={displayGroups}
        onSave={(nextName) => renameGroup(renamingGroup, nextName)}
      />
    </div>
  )
}
