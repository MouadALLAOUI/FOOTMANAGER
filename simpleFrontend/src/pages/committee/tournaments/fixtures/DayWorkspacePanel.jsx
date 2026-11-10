import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  Ban,
  Calendar,
  CalendarPlus,
  CalendarRange,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Clock4,
  Eye,
  GripVertical,
  Layers,
  LayoutTemplate,
  Link2,
  ListChecks,
  MapPin,
  MoreVertical,
  MousePointerClick,
  Play,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Swords,
  Trophy,
  Users,
  X,
} from 'lucide-react'
import { Button, Empty } from '../../../../components/dashboard/ui'
import { useProfileModal } from '../../../../components/profile/ProfileModalContext'
import { useToast } from '../../../../components/ui/Toast'
import { LIVE_STATUSES } from '../../../../data/fixtures'
import { getGroupColor } from '../../../../lib/groupColors'
import { formatGroupName } from '../../../../lib/groupNames'
import { TeamAvatar } from '../../../tournaments/shared'
import AddDayModal from './AddDayModal'
import BatchRescheduleModal from './BatchRescheduleModal'
import DaySelectorBar from './DaySelectorBar'
import { parseDayKeyMeta } from './dayMeta'
import QuickActionsMenu from './QuickActionsMenu'

function getFixtureStatus(f) {
  const m = f.match
  if (f.status === 'cancelled' || m?.status === 'cancelled') return 'cancelled'
  if (f.status === 'postponed' || m?.status === 'postponed') return 'postponed'
  if (m?.status === 'finished' || f.status === 'played') return 'completed'
  if (LIVE_STATUSES.has(m?.status)) return 'live'
  if (f.scheduled_at && new Date(f.scheduled_at) > Date.now()) return 'upcoming'
  return 'pending'
}

function isMatchStartedOrLocked(f) {
  const st = getFixtureStatus(f)
  return st === 'live' || st === 'completed'
}

function SlotTargetZone({
  side,
  team,
  selectedPoolTeam,
  busy,
  error,
  onClear,
  onDropTeam,
  onTapAssign,
}) {
  const { openTeam } = useProfileModal()
  const [dragOver, setDragOver] = useState(false)

  const canAcceptSelected = Boolean(selectedPoolTeam) && !busy
  const baseCls = error
    ? 'border-[#D92D20] bg-[#D92D20]/10'
    : dragOver
      ? 'border-[#B8F000] dark:border-[#D0FF38] bg-[#B8F000]/18 dark:bg-[#D0FF38]/15'
      : canAcceptSelected && !team
        ? 'border-[#B8F000] dark:border-[#D0FF38] bg-[#B8F000]/12 dark:bg-[#D0FF38]/12 hover:bg-[#B8F000]/22'
        : canAcceptSelected
          ? 'border-[#B8F000]/75 dark:border-[#D0FF38]/65 bg-[#F7F8F5] dark:bg-[#252B27] hover:border-[#B8F000] dark:hover:border-[#D0FF38]'
          : 'border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27]'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation()
        if (busy) return
        if (selectedPoolTeam) {
          onTapAssign?.(selectedPoolTeam)
        }
      }}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && selectedPoolTeam && !busy) {
          e.preventDefault()
          e.stopPropagation()
          onTapAssign?.(selectedPoolTeam)
        }
      }}
      onDragOver={(e) => {
        if (busy) return
        e.preventDefault()
        e.stopPropagation()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        e.stopPropagation()
        setDragOver(false)
        if (busy) return
        const raw =
          e.dataTransfer.getData('application/x-footmanager-team') || e.dataTransfer.getData('text/plain')
        const id = Number(raw)
        if (Number.isFinite(id) && id > 0) onDropTeam?.(id)
      }}
      className={`min-w-0 rounded-xl border-2 border-dashed px-2.5 py-2 transition ${baseCls} ${
        canAcceptSelected ? 'cursor-pointer' : ''
      }`}
    >
      {team ? (
        <div className="flex items-center justify-between gap-1.5 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <TeamAvatar
              team={team}
              className="size-6 shrink-0"
              onClick={
                team?.id != null
                  ? (e) => {
                      e?.stopPropagation?.()
                      openTeam(team)
                    }
                  : undefined
              }
            />
            <span className="truncate text-[11px] font-black text-[#111313] dark:text-[#F5F7F2]">
              {team?.id != null ? <button type="button" onClick={(e) => { e.stopPropagation(); openTeam(team) }} className="block max-w-full truncate text-start hover:text-[#1F9D55] dark:hover:text-[#D0FF38] transition-colors cursor-pointer">{team.name}</button> : team.name}
            </span>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation()
              onClear?.()
            }}
            className="grid size-6 shrink-0 place-items-center rounded-lg text-[#65706A] dark:text-[#B2B9B3] hover:bg-white dark:hover:bg-[#1B201D] hover:text-[#D92D20] transition cursor-pointer disabled:opacity-40"
            title="إفراغ المقعد"
            aria-label="إفراغ المقعد"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-center py-0.5 text-center">
          <span className="truncate text-[10px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
            {canAcceptSelected
              ? `اضغط لوضع ${selectedPoolTeam.name}`
              : side === 'home'
                ? 'اسحب أو اختر الفريق 1'
                : 'اسحب أو اختر الفريق 2'}
          </span>
        </div>
      )}
      {error && (
        <p className="mt-1 text-[10px] font-black text-[#D92D20] dark:text-[#FF6868] leading-tight text-center">
          {error}
        </p>
      )}
    </div>
  )
}

function DayMatchCard({
  fixture,
  tournamentId,
  groupColor,
  isOpening,
  slotEditMode,
  draft,
  slotErrors,
  teamById,
  selectedPoolTeam,
  busy,
  batchSelectMode,
  batchChecked,
  onToggleBatch,
  onStageSlot,
  onTapAssignSlot,
  onOpenReschedule,
  onOpenResult,
  onOpenDetails,
  onPostpone,
  onCancel,
  onRestore,
  onDelegatedLink,
  onReviewSubmission,
  onToggleOpeningMatch,
}) {
  const { t } = useTranslation()
  const { openTeam } = useProfileModal()
  const [menuOpen, setMenuOpen] = useState(false)

  const st = getFixtureStatus(fixture)
  const isPlayed = st === 'completed'
  const isLive = st === 'live'
  const isCancelled = st === 'cancelled'
  const isPostponed = st === 'postponed'
  const showScore = isPlayed || isLive
  const canEditBatch = !isPlayed && !isLive
  const isUnfilled = !fixture.home_team || !fixture.away_team
  const isEditableSlotCard =
    Boolean(fixture.group) && !isLive && !isPlayed && !isCancelled && !isPostponed && (slotEditMode || isUnfilled)

  const homeKey = `${fixture.id}:home`
  const awayKey = `${fixture.id}:away`
  const effHome = homeKey in draft ? draft[homeKey] : fixture.home_team || null
  const effAway = awayKey in draft ? draft[awayKey] : fixture.away_team || null

  const homeName = effHome?.name || fixture.slots?.home || t('committee.detail.tbd')
  const awayName = effAway?.name || fixture.slots?.away || t('committee.detail.tbd')
  const timeStr = fixture.scheduled_at ? fixture.scheduled_at.slice(11, 16) : '—:—'

  const statusPill = isLive
    ? { cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30', label: 'مباشر', pulse: true }
    : isPlayed
      ? { cls: 'bg-[#1F9D55]/15 text-[#1F9D55] dark:text-[#30D158] border-[#1F9D55]/30', label: 'منجزة' }
      : isPostponed
        ? { cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30', label: 'مؤجلة' }
        : isCancelled
          ? { cls: 'bg-slate-500/12 text-[#65706A] dark:text-[#B2B9B3] border-[#E1E5DF] dark:border-[#303832]', label: 'ملغاة' }
          : null

  return (
    <div
      className={`relative rounded-2xl border p-3 sm:p-3.5 transition ${
        groupColor ? 'border-s-4' : ''
      } ${
        batchChecked
          ? 'border-[#B8F000] dark:border-[#D0FF38] bg-[#B8F000]/14 dark:bg-[#D0FF38]/12'
          : isOpening
            ? 'border-[#B8F000] dark:border-[#D0FF38]/60 bg-[#B8F000]/14 dark:bg-[#D0FF38]/10'
            : 'border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5]/60 dark:bg-[#252B27]/50 hover:bg-[#F7F8F5] dark:hover:bg-[#252B27]'
      }`}
      style={groupColor ? { borderInlineStartColor: groupColor.hex } : undefined}
    >
      {/* Top Meta Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {batchSelectMode && (
            <button
              type="button"
              disabled={!canEditBatch}
              onClick={() => canEditBatch && onToggleBatch?.(fixture.id)}
              aria-label="تحديد المباراة"
              className={`grid size-5 shrink-0 place-items-center rounded-md border transition cursor-pointer disabled:opacity-35 ${
                batchChecked
                  ? 'border-[#111313] bg-[#111313] dark:border-[#D0FF38] dark:bg-[#D0FF38] text-white dark:text-[#111313]'
                  : 'border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D]'
              }`}
            >
              {batchChecked && <Check className="size-3.5 stroke-[3]" />}
            </button>
          )}

          {isOpening && (
            <span className="inline-flex items-center gap-1 rounded-full bg-[#B8F000] dark:bg-[#D0FF38] px-2.5 py-0.5 text-[10px] font-black text-[#111313]">
              <Trophy className="size-3" />
              <span>المباراة الافتتاحية</span>
            </span>
          )}

          {fixture.group?.name ? (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-black ${
                groupColor
                  ? groupColor.badgeCls
                  : 'bg-white dark:bg-[#1B201D] border border-[#E1E5DF] dark:border-[#303832] text-[#65706A] dark:text-[#B2B9B3]'
              }`}
            >
              {groupColor && (
                <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: groupColor.hex }} />
              )}
              <span>
                {formatGroupName(fixture.group.name, { groupId: fixture.group.id, tournamentId })}
              </span>
            </span>
          ) : fixture.round?.name ? (
            <span className="inline-flex items-center rounded-md bg-white dark:bg-[#1B201D] border border-[#E1E5DF] dark:border-[#303832] px-2 py-0.5 text-[10px] font-black text-[#65706A] dark:text-[#B2B9B3]">
              {fixture.round.name}
            </span>
          ) : null}

          {fixture.matchday && (
            <span className="rounded-md bg-white dark:bg-[#1B201D] border border-[#E1E5DF] dark:border-[#303832] px-1.5 py-0.5 text-[10px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
              ج {fixture.matchday}
            </span>
          )}

          {statusPill && (
            <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black ${statusPill.cls}`}>
              {statusPill.pulse && <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />}
              <span>{statusPill.label}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {fixture.stadium?.name && (
            <span className="hidden sm:inline-flex items-center gap-1 max-w-[140px] truncate text-[10px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{fixture.stadium.name}</span>
            </span>
          )}
          <span className="inline-flex items-center gap-1 rounded-lg bg-white dark:bg-[#1B201D] border border-[#E1E5DF] dark:border-[#303832] px-2 py-0.5 text-[11px] font-black text-[#111313] dark:text-[#F5F7F2] font-mono tabular-nums">
            <Clock className="size-3 text-[#1F9D55] dark:text-[#D0FF38]" />
            <span>{timeStr}</span>
          </span>
        </div>
      </div>

      {/* Center Teams Display OR Interactive Slots */}
      {isEditableSlotCard ? (
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 py-1">
          <SlotTargetZone
            side="home"
            team={effHome}
            selectedPoolTeam={selectedPoolTeam}
            busy={busy}
            error={slotErrors?.[homeKey]}
            onClear={() => onStageSlot?.(fixture, 'home', null)}
            onDropTeam={(teamId) => onTapAssignSlot?.(fixture, 'home', teamById.get(teamId) || null)}
            onTapAssign={(team) => onTapAssignSlot?.(fixture, 'home', team)}
          />
          <div className="flex items-center justify-center">
            <span className="rounded-lg bg-white dark:bg-[#1B201D] border border-[#E1E5DF] dark:border-[#303832] px-2 py-0.5 text-[11px] font-black text-[#65706A] dark:text-[#B2B9B3]">
              VS
            </span>
          </div>
          <SlotTargetZone
            side="away"
            team={effAway}
            selectedPoolTeam={selectedPoolTeam}
            busy={busy}
            error={slotErrors?.[awayKey]}
            onClear={() => onStageSlot?.(fixture, 'away', null)}
            onDropTeam={(teamId) => onTapAssignSlot?.(fixture, 'away', teamById.get(teamId) || null)}
            onTapAssign={(team) => onTapAssignSlot?.(fixture, 'away', team)}
          />
        </div>
      ) : (
        <div
          onClick={() => onOpenReschedule?.(fixture)}
          className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 py-1 cursor-pointer"
        >
          {/* Home Team (Right in RTL) */}
          <div className="flex items-center gap-2 min-w-0">
            <TeamAvatar
              team={effHome}
              className="size-8 shrink-0"
              onClick={
                effHome?.id != null
                  ? (e) => {
                      e?.stopPropagation?.()
                      openTeam(effHome)
                    }
                  : undefined
              }
            />
            <span className="truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
              {effHome?.id != null ? <button type="button" onClick={(e) => { e.stopPropagation(); openTeam(effHome) }} className="block max-w-full truncate text-start hover:text-[#1F9D55] dark:hover:text-[#D0FF38] transition-colors cursor-pointer">{homeName}</button> : homeName}
            </span>
          </div>

          {/* Score / VS */}
          <div className="shrink-0 px-1.5">
            {showScore ? (
              <span
                dir="ltr"
                className="inline-flex items-center rounded-lg bg-[#111313] dark:bg-[#D0FF38] px-2.5 py-0.5 text-xs font-black text-white dark:text-[#111313] font-mono tabular-nums"
              >
                {fixture.match?.home_score ?? 0} - {fixture.match?.away_score ?? 0}
              </span>
            ) : (
              <span className="rounded-lg bg-white dark:bg-[#1B201D] border border-[#E1E5DF] dark:border-[#303832] px-2 py-0.5 text-[11px] font-black text-[#65706A] dark:text-[#B2B9B3]">
                VS
              </span>
            )}
          </div>

          {/* Away Team (Left in RTL) */}
          <div className="flex items-center justify-end gap-2 min-w-0">
            <span className="truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
              {effAway?.id != null ? <button type="button" onClick={(e) => { e.stopPropagation(); openTeam(effAway) }} className="block max-w-full truncate text-end hover:text-[#1F9D55] dark:hover:text-[#D0FF38] transition-colors cursor-pointer">{awayName}</button> : awayName}
            </span>
            <TeamAvatar
              team={effAway}
              className="size-8 shrink-0"
              onClick={
                effAway?.id != null
                  ? (e) => {
                      e?.stopPropagation?.()
                      openTeam(effAway)
                    }
                  : undefined
              }
            />
          </div>
        </div>
      )}

      {/* Footer Info + Compact Actions */}
      <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-[#E1E5DF]/70 dark:border-[#303832]/70 pt-2">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold text-[#65706A] dark:text-[#B2B9B3] min-w-0">
          {fixture.stadium?.name && (
            <span className="inline-flex items-center gap-1 truncate sm:hidden">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{fixture.stadium.name}</span>
            </span>
          )}
          {fixture.delegated_submission && !isPlayed && onReviewSubmission && (
            <button
              type="button"
              onClick={() => onReviewSubmission(fixture)}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2 py-0.5 text-[10px] font-black text-white cursor-pointer"
            >
              <ShieldAlert className="size-3" />
              <span>اعتماد النتيجة</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 ms-auto">
          {!isPlayed && (
            <button
              type="button"
              onClick={() => onOpenReschedule?.(fixture)}
              className="inline-flex h-8 items-center gap-1 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] hover:bg-[#E9ECE7] dark:hover:bg-[#303832] px-2.5 text-[11px] font-black text-[#111313] dark:text-[#F5F7F2] transition cursor-pointer"
            >
              <Calendar className="size-3" />
              <span>{fixture.scheduled_at ? 'تعديل الموعد' : 'تحديد الموعد'}</span>
            </button>
          )}

          {effHome && effAway && (
            <button
              type="button"
              onClick={() => onOpenResult?.(fixture)}
              className="inline-flex h-8 items-center gap-1 rounded-xl bg-[#B8F000] dark:bg-[#D0FF38] hover:opacity-90 px-2.5 text-[11px] font-black text-[#111313] shadow-2xs transition cursor-pointer"
            >
              <Play className="size-3 fill-current" />
              <span>{isPlayed ? 'تعديل النتيجة' : 'النتيجة'}</span>
            </button>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="خيارات إضافية"
              className="grid size-8 place-items-center rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] text-[#65706A] dark:text-[#B2B9B3] hover:text-[#111313] dark:hover:text-[#F5F7F2] transition cursor-pointer"
            >
              <MoreVertical className="size-3.5" />
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute end-0 bottom-9 z-40 w-48 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-1.5 shadow-xl space-y-0.5">
                  {onOpenDetails && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        onOpenDetails(fixture)
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] font-bold text-[#111313] dark:text-[#F5F7F2] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27] cursor-pointer"
                    >
                      <Eye className="size-3.5 text-[#65706A]" />
                      <span>عرض التفاصيل</span>
                    </button>
                  )}

                  {onToggleOpeningMatch && !isCancelled && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        onToggleOpeningMatch(fixture.id)
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] font-bold text-[#111313] dark:text-[#F5F7F2] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27] cursor-pointer"
                    >
                      <Trophy className="size-3.5 text-[#1F9D55] dark:text-[#D0FF38]" />
                      <span>{isOpening ? 'إلغاء وسم الافتتاحية' : 'تعيين كمباراة افتتاحية'}</span>
                    </button>
                  )}

                  {onDelegatedLink && effHome && effAway && !isPlayed && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        onDelegatedLink(fixture)
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] font-bold text-[#111313] dark:text-[#F5F7F2] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27] cursor-pointer"
                    >
                      <Link2 className="size-3.5 text-blue-600 dark:text-blue-400" />
                      <span>رابط تفويض المندوب</span>
                    </button>
                  )}

                  {(isPostponed || isCancelled) && onRestore && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        onRestore(fixture)
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] font-bold text-[#1F9D55] dark:text-[#30D158] hover:bg-[#1F9D55]/10 cursor-pointer"
                    >
                      <RotateCcw className="size-3.5" />
                      <span>استعادة المباراة</span>
                    </button>
                  )}

                  {!isPlayed && !isPostponed && !isCancelled && onPostpone && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        onPostpone(fixture)
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                    >
                      <Clock4 className="size-3.5" />
                      <span>تأجيل المباراة</span>
                    </button>
                  )}

                  {!isPlayed && !isCancelled && onCancel && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        onCancel(fixture)
                      }}
                      className="flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] font-bold text-[#D92D20] dark:text-[#FF6868] hover:bg-[#D92D20]/10 cursor-pointer"
                    >
                      <Ban className="size-3.5" />
                      <span>إلغاء المباراة</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DayWorkspacePanel({
  tournament,
  fixtures = [],
  drawTeams = [],
  orderedGroups = [],
  effectiveOpeningMatchId = null,
  hasAnyFixtures = false,
  hasKnockoutStage = false,
  isLeague = false,
  busy = null,
  draft = {},
  draftCount = 0,
  slotErrors = {},
  teamById = new Map(),
  onStageSlot,
  onSaveSlots,
  onDiscardDraft,
  onClearFixturesSlots,
  onOpenReschedule,
  onOpenResult,
  onOpenDetails,
  onPostpone,
  onCancel,
  onRestore,
  onDelegatedLink,
  onReviewSubmission,
  onToggleOpeningMatch,
  onOpenGenerator,
  onOpenExport,
  onDeleteAll,
  onRefresh,
  defaultTime = '18:00',
  selectedDayKey,
  onSelectDayKey,
  customDays = [],
  onAddCustomDay,
}) {
  const { toast } = useToast()
  const { openTeam } = useProfileModal()
  const [quickMenuOpen, setQuickMenuOpen] = useState(false)
  const [addDayOpen, setAddDayOpen] = useState(false)
  const [batchModalOpen, setBatchModalOpen] = useState(false)
  const [batchSelectMode, setBatchSelectMode] = useState(false)
  const [batchCheckedIds, setBatchCheckedIds] = useState([])
  const [selectedGroupIds, setSelectedGroupIds] = useState([]) // [] = all groups on the day
  const [showKnockoutOnly, setShowKnockoutOnly] = useState(false)
  const [slotEditMode, setSlotEditMode] = useState(false)
  const [selectedPoolTeam, setSelectedPoolTeam] = useState(null)
  const [mobilePoolOpen, setMobilePoolOpen] = useState(false)
  const [collapsedAllDays, setCollapsedAllDays] = useState({})

  // Build chronological days combining scheduled fixture dates + custom added dates
  const { days, unscheduledFixtures, unscheduledCount } = useMemo(() => {
    const byDate = new Map()
    const unsched = []

    const sorted = [...(fixtures || [])].sort((a, b) => {
      if (!a.scheduled_at && !b.scheduled_at) return (a.id || 0) - (b.id || 0)
      if (!a.scheduled_at) return 1
      if (!b.scheduled_at) return -1
      return new Date(a.scheduled_at) - new Date(b.scheduled_at)
    })

    for (const f of sorted) {
      if (!f.scheduled_at) {
        unsched.push(f)
        continue
      }
      const dk = f.scheduled_at.slice(0, 10)
      if (!byDate.has(dk)) byDate.set(dk, [])
      byDate.get(dk).push(f)
    }

    for (const customDk of customDays) {
      if (customDk && !byDate.has(customDk)) {
        byDate.set(customDk, [])
      }
    }

    const sortedDateKeys = [...byDate.keys()].sort((a, b) => a.localeCompare(b))
    let realIdx = 0

    const dayList = sortedDateKeys.map((dateKey) => {
      const items = byDate.get(dateKey) || []
      const isCustomEmpty = items.length === 0
      const meta = parseDayKeyMeta(dateKey, isCustomEmpty ? realIdx : realIdx++)

      const groupMap = new Map()
      let hasKo = false
      for (const f of items) {
        if (f.group?.id != null || f.group?.name) {
          const gc = getGroupColor(f.group, orderedGroups)
          const key = f.group.id != null ? `g:${f.group.id}` : `n:${f.group.name}`
          if (!groupMap.has(key)) {
            groupMap.set(key, {
              key,
              id: f.group.id,
              name: f.group.name,
              hex: gc.hex,
              shortCode: gc.shortCode,
              label: formatGroupName(f.group.name, { groupId: f.group.id, tournamentId: tournament?.id }),
              index: gc.index,
            })
          }
        } else {
          hasKo = true
        }
      }

      const groupDots = [...groupMap.values()].sort((a, b) => a.index - b.index)

      return {
        dateKey,
        meta,
        items,
        matchCount: items.length,
        groupDots,
        hasKnockout: hasKo,
        isCustomEmpty,
      }
    })

    return {
      days: dayList,
      unscheduledFixtures: unsched,
      unscheduledCount: unsched.length,
    }
  }, [fixtures, customDays, orderedGroups, tournament?.id])

  // Determine active day fixtures when a specific day (not 'all') is selected
  const activeDayObj = useMemo(
    () => (selectedDayKey && selectedDayKey !== 'all' && selectedDayKey !== 'unscheduled'
      ? days.find((d) => d.dateKey === selectedDayKey) || null
      : null),
    [days, selectedDayKey],
  )

  const activeDayFixtures = useMemo(() => {
    if (selectedDayKey === 'all') return fixtures || []
    if (selectedDayKey === 'unscheduled') return unscheduledFixtures
    return activeDayObj?.items || []
  }, [selectedDayKey, fixtures, unscheduledFixtures, activeDayObj])

  // Count matches per group on the active day
  const { groupCountMap, knockoutOnDayCount } = useMemo(() => {
    const counts = new Map()
    let koCount = 0
    for (const f of activeDayFixtures) {
      if (f.group?.id != null) {
        counts.set(f.group.id, (counts.get(f.group.id) || 0) + 1)
      } else if (!f.group) {
        koCount += 1
      }
    }
    return { groupCountMap: counts, knockoutOnDayCount: koCount }
  }, [activeDayFixtures])

  // Filter active day's fixtures by selected groups / knockout
  const visibleDayFixtures = useMemo(() => {
    if (showKnockoutOnly) return activeDayFixtures.filter((f) => !f.group)
    if (selectedGroupIds.length === 0) return activeDayFixtures
    const set = new Set(selectedGroupIds)
    return activeDayFixtures.filter((f) => f.group?.id != null && set.has(f.group.id))
  }, [activeDayFixtures, selectedGroupIds, showKnockoutOnly])

  // Group visibleDayFixtures into clean group sections
  const groupedSections = useMemo(() => {
    const groupOrderMap = new Map()
    orderedGroups.forEach((g, idx) => groupOrderMap.set(g.id, idx))

    const buckets = new Map()
    for (const f of visibleDayFixtures) {
      const bucketKey = f.group?.id != null ? `g:${f.group.id}` : 'ko'
      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, {
          key: bucketKey,
          group: f.group || null,
          color: f.group ? getGroupColor(f.group, orderedGroups) : null,
          title: f.group?.name
            ? formatGroupName(f.group.name, { groupId: f.group.id, tournamentId: tournament?.id })
            : f.round?.name || 'الأدوار الإقصائية',
          items: [],
        })
      }
      buckets.get(bucketKey).items.push(f)
    }

    return [...buckets.values()].sort((a, b) => {
      if (!a.group && b.group) return 1
      if (a.group && !b.group) return -1
      if (!a.group && !b.group) return 0
      const posA = groupOrderMap.get(a.group.id) ?? 999
      const posB = groupOrderMap.get(b.group.id) ?? 999
      return posA - posB
    })
  }, [visibleDayFixtures, orderedGroups, tournament?.id])

  // Compute day participation map (teamId -> array of kickoff times on activeDayFixtures)
  const dayTeamParticipation = useMemo(() => {
    const map = new Map()
    for (const f of activeDayFixtures) {
      const st = getFixtureStatus(f)
      if (st === 'cancelled' || st === 'postponed') continue
      const hk = `${f.id}:home`
      const ak = `${f.id}:away`
      const hTeam = hk in draft ? draft[hk] : f.home_team
      const aTeam = ak in draft ? draft[ak] : f.away_team
      const timeLabel = f.scheduled_at ? f.scheduled_at.slice(11, 16) : 'بدون وقت'

      if (hTeam?.id) {
        const list = map.get(hTeam.id) || []
        list.push({ time: timeLabel, isDraft: hk in draft })
        map.set(hTeam.id, list)
      }
      if (aTeam?.id) {
        const list = map.get(aTeam.id) || []
        list.push({ time: timeLabel, isDraft: ak in draft })
        map.set(aTeam.id, list)
      }
    }
    return map
  }, [activeDayFixtures, draft])

  // Build Teams Pool filtered by selectedGroupIds (or all assigned groups if none selected)
  const teamsPoolByGroup = useMemo(() => {
    const selectedSet = selectedGroupIds.length > 0 ? new Set(selectedGroupIds) : null
    const map = new Map()

    for (const p of drawTeams || []) {
      if (!p.team?.id || !p.group?.id) continue
      if (selectedSet && !selectedSet.has(p.group.id)) continue
      if (!map.has(p.group.id)) {
        map.set(p.group.id, {
          group: p.group,
          color: getGroupColor(p.group, orderedGroups),
          title: formatGroupName(p.group.name, { groupId: p.group.id, tournamentId: tournament?.id }),
          teams: [],
        })
      }
      map.get(p.group.id).teams.push({
        id: p.team.id,
        name: p.team.name,
        logo_url: p.team.logo_url,
        groupId: p.group.id,
        groupName: p.group.name,
      })
    }

    const orderMap = new Map()
    orderedGroups.forEach((g, i) => orderMap.set(g.id, i))

    return [...map.values()].sort((a, b) => {
      const ia = orderMap.get(a.group.id) ?? 999
      const ib = orderMap.get(b.group.id) ?? 999
      return ia - ib
    })
  }, [drawTeams, selectedGroupIds, orderedGroups, tournament?.id])

  const dayHasEmptySlots = useMemo(
    () =>
      activeDayFixtures.some(
        (f) =>
          Boolean(f.group) &&
          !isMatchStartedOrLocked(f) &&
          (!(f.id + ':home' in draft ? draft[`${f.id}:home`] : f.home_team) ||
            !(f.id + ':away' in draft ? draft[`${f.id}:away`] : f.away_team)),
      ),
    [activeDayFixtures, draft],
  )

  const editableGroupFixturesOnDay = useMemo(
    () => activeDayFixtures.filter((f) => Boolean(f.group) && !isMatchStartedOrLocked(f) && getFixtureStatus(f) !== 'cancelled' && getFixtureStatus(f) !== 'postponed'),
    [activeDayFixtures],
  )

  const unplayedCandidates = useMemo(
    () => (fixtures || []).filter((f) => !isMatchStartedOrLocked(f)),
    [fixtures],
  )

  const existingDates = useMemo(() => days.map((d) => d.dateKey), [days])

  const handleToggleGroup = (groupId) => {
    setShowKnockoutOnly(false)
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId],
    )
  }

  // Handle 2-tap pairing inside Teams Pool
  const handleSelectPoolTeam = (team) => {
    const activePairing = slotEditMode || dayHasEmptySlots
    if (!activePairing) {
      setSlotEditMode(true)
      setSelectedPoolTeam(team)
      toast.info(`اختر الخصم من نفس المجموعة لتعبئة مباراة أو استبدال مقعد مع ${team.name}`)
      return
    }

    if (!selectedPoolTeam) {
      setSelectedPoolTeam(team)
      return
    }

    if (selectedPoolTeam.id === team.id) {
      setSelectedPoolTeam(null)
      return
    }

    if (selectedPoolTeam.groupId !== team.groupId) {
      toast.error('يجب اختيار فريقين من نفس المجموعة لتكوين مواجهة')
      return
    }

    // Find an empty slot fixture in this group (first on active day, then any unplayed empty slot in same group)
    const targetDayFixtures = activeDayFixtures.filter((f) => f.group?.id === team.groupId && !isMatchStartedOrLocked(f))
    const targetAllGroupFixtures = (fixtures || []).filter((f) => f.group?.id === team.groupId && !isMatchStartedOrLocked(f))

    const getEff = (f, side) => {
      const k = `${f.id}:${side}`
      return k in draft ? draft[k] : side === 'home' ? f.home_team : f.away_team
    }

    const completelyEmpty =
      targetDayFixtures.find((f) => !getEff(f, 'home') && !getEff(f, 'away')) ||
      targetAllGroupFixtures.find((f) => !getEff(f, 'home') && !getEff(f, 'away'))

    if (completelyEmpty) {
      onStageSlot?.(completelyEmpty, 'home', selectedPoolTeam)
      onStageSlot?.(completelyEmpty, 'away', team)
      setSelectedPoolTeam(null)
      toast.success(`تم وضع ${selectedPoolTeam.name} ضد ${team.name} في المسودة — اضغط حفظ التوزيع للتثبيت`)
      return
    }

    const partiallyEmpty =
      targetDayFixtures.find((f) => !getEff(f, 'home') || !getEff(f, 'away')) ||
      targetAllGroupFixtures.find((f) => !getEff(f, 'home') || !getEff(f, 'away'))

    if (partiallyEmpty) {
      const openSide = !getEff(partiallyEmpty, 'home') ? 'home' : 'away'
      onStageSlot?.(partiallyEmpty, openSide, team)
      setSelectedPoolTeam(null)
      toast.info(`تم وضع ${team.name} في المقعد المتاح بالمسودة`)
      return
    }

    toast.info('المقاعد المتاحة مملوءة حالياً — اضغط × لإفراغ أي مقعد قبل وضع الفريق أو أنشئ قوالب جديدة')
    setSelectedPoolTeam(team)
  }

  const handleTapAssignSlot = (fixture, side, team) => {
    if (!team || !fixture) return
    const teamGroupId = team.group_id ?? team.groupId ?? null
    if (fixture.group?.id && teamGroupId && fixture.group.id !== teamGroupId) {
      toast.error('هذا الفريق لا ينتمي إلى هذه المجموعة')
      return
    }
    onStageSlot?.(fixture, side, team)
    setSelectedPoolTeam(null)
  }

  const handleClearOrDiscard = async () => {
    if (draftCount > 0) {
      onDiscardDraft?.()
      setSelectedPoolTeam(null)
      return
    }
    const clearTargets = editableGroupFixturesOnDay.filter((f) => f.home_team || f.away_team)
    if (clearTargets.length === 0) {
      toast.info('لا توجد مقاعد معبأة لإفراغها في هذا العرض')
      return
    }
    if (
      !window.confirm(
        `سيتم إفراغ فرق ${clearTargets.length} مباراة غير ملعوبة في هذا اليوم مع الإبقاء على قوالب المواعيد. هل تريد المتابعة؟`,
      )
    ) {
      return
    }
    await onClearFixturesSlots?.(clearTargets)
  }

  const effectiveSlotEditing = slotEditMode || dayHasEmptySlots

  return (
    <div className="min-w-0 max-w-full space-y-3.5">
      {/* Workspace Header + Quick Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-black text-[#111313] dark:text-[#F5F7F2] truncate">
              برمجة المباريات حسب الأيام
            </h3>
            {orderedGroups.length > 0 && (
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[#F7F8F5] dark:bg-[#252B27] border border-[#E1E5DF] dark:border-[#303832] px-2.5 py-0.5 text-[11px] font-black text-[#65706A] dark:text-[#B2B9B3]">
                {days.length} يوم · {orderedGroups.length} مجموعات
              </span>
            )}
          </div>
          {orderedGroups.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {orderedGroups.map((g) => {
                const gc = getGroupColor(g, orderedGroups)
                return (
                  <span
                    key={g.id}
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-black ${gc.badgeCls}`}
                  >
                    <span className="size-1.5 rounded-full shrink-0" style={{ backgroundColor: gc.hex }} />
                    <span>{formatGroupName(g.name, { groupId: g.id, tournamentId: tournament?.id })}</span>
                  </span>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {unplayedCandidates.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setBatchSelectMode((v) => !v)
                setBatchCheckedIds([])
              }}
              className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-2.5 sm:px-3 text-[11px] sm:text-xs font-black transition cursor-pointer ${
                batchSelectMode
                  ? 'border-[#111313] dark:border-[#D0FF38] bg-[#111313] dark:bg-[#D0FF38] text-white dark:text-[#111313]'
                  : 'border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] text-[#111313] dark:text-[#F5F7F2] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27]'
              }`}
            >
              <ListChecks className="size-4 shrink-0" />
              <span>{batchSelectMode ? 'إنهاء التحديد' : 'تحديد جماعي'}</span>
            </button>
          )}

          <QuickActionsMenu
            open={quickMenuOpen}
            onToggle={() => setQuickMenuOpen((v) => !v)}
            onClose={() => setQuickMenuOpen(false)}
            hasAnyFixtures={hasAnyFixtures}
            hasKnockoutStage={hasKnockoutStage}
            isLeague={isLeague}
            canBatchReschedule={unplayedCandidates.length > 0}
            batchSelectMode={batchSelectMode}
            hasEditableSlots={editableGroupFixturesOnDay.some((f) => f.home_team || f.away_team)}
            draftCount={draftCount}
            busy={busy}
            onAutoSchedule={() => onOpenGenerator?.('group', false, activeDayObj?.dateKey)}
            onManualLayout={() => onOpenGenerator?.('group', true, activeDayObj?.dateKey)}
            onKnockoutSchedule={() => onOpenGenerator?.('knockout', false, activeDayObj?.dateKey)}
            onAddDay={() => setAddDayOpen(true)}
            onBatchReschedule={() => setBatchModalOpen(true)}
            onToggleBatchSelect={() => {
              setBatchSelectMode((v) => !v)
              setBatchCheckedIds([])
            }}
            onClearDraftOrSlots={handleClearOrDiscard}
            onExport={onOpenExport}
            onDeleteAll={onDeleteAll}
          />
        </div>
      </div>

      {/* Batch Multi-Select Floating Bar */}
      {batchSelectMode && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#B8F000] dark:border-[#D0FF38]/60 bg-[#B8F000]/16 dark:bg-[#D0FF38]/12 px-3.5 py-2.5">
          <div className="flex items-center gap-2 text-xs font-black text-[#111313] dark:text-[#F5F7F2]">
            <ListChecks className="size-4 text-[#1F9D55] dark:text-[#D0FF38]" />
            <span>تم تحديد {batchCheckedIds.length} مباراة</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const dayUnplayed = visibleDayFixtures.filter((f) => !isMatchStartedOrLocked(f)).map((f) => f.id)
                setBatchCheckedIds(dayUnplayed)
              }}
            >
              تحديد يوم العرض
            </Button>
            <Button
              size="sm"
              disabled={batchCheckedIds.length === 0}
              onClick={() => setBatchModalOpen(true)}
            >
              <CalendarRange className="size-3.5" />
              <span>تعديل موعد المحدد</span>
            </Button>
          </div>
        </div>
      )}

      {/* Horizontal Scrollable Day Selector Strip */}
      {(hasAnyFixtures || days.length > 0) && (
        <DaySelectorBar
          days={days}
          unscheduledCount={unscheduledCount}
          totalCount={fixtures.length}
          selectedDayKey={selectedDayKey}
          onSelectDay={(nextKey) => {
            onSelectDayKey?.(nextKey)
            setSelectedGroupIds([])
            setShowKnockoutOnly(false)
            setSelectedPoolTeam(null)
          }}
          onAddDay={() => setAddDayOpen(true)}
        />
      )}

      {/* Unsaved Draft Slot Save Bar */}
      {draftCount > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#B8F000] dark:border-[#D0FF38] bg-[#B8F000]/18 dark:bg-[#D0FF38]/14 px-4 py-3 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-black text-[#111313] dark:text-[#F5F7F2]">
            <AlertCircle className="size-4 text-[#1F9D55] dark:text-[#D0FF38] shrink-0" />
            <span>لديك {draftCount} تعديلات في توزيع المقاعد بانتظار الحفظ</span>
          </div>
          <div className="flex items-center gap-2 ms-auto">
            <Button size="sm" variant="ghost" disabled={busy === 'slots'} onClick={() => {
              onDiscardDraft?.()
              setSelectedPoolTeam(null)
            }}>
              تجاهل
            </Button>
            <Button size="sm" loading={busy === 'slots'} onClick={onSaveSlots}>
              <CheckCircle2 className="size-4" />
              <span>حفظ التوزيع</span>
            </Button>
          </div>
        </div>
      )}

      {/* Empty Tournament State (0 fixtures & no custom days yet) */}
      {!hasAnyFixtures && days.length === 0 ? (
        <div className="space-y-4">
          <Empty
            icon={Swords}
            title="لم يتم إنشاء برنامج المباريات بعد"
            description="يمكنك التوليد التلقائي السريع أو إنشاء قوالب الجولات وتعبئة الفرق يدوياً حسب الأيام والمجموعات."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button size="sm" onClick={() => onOpenGenerator?.('group', false)}>
                  <Sparkles className="size-4" />
                  <span>برمجة ذكية (توليد تلقائي)</span>
                </Button>
                <Button size="sm" variant="outline" onClick={() => onOpenGenerator?.('group', true)}>
                  <LayoutTemplate className="size-4" />
                  <span>تعبئة يدوية (قوالب جولات)</span>
                </Button>
              </div>
            }
          />
        </div>
      ) : selectedDayKey === 'all' ? (
        /* ALL DAYS CHRONOLOGICAL VIEW WITH GROUP-COLORED CARDS */
        <div className="space-y-3">
          {days.map((day) => {
            const isCollapsed = Boolean(collapsedAllDays[day.dateKey])
            return (
              <div
                key={day.dateKey}
                className="overflow-hidden rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] shadow-2xs"
              >
                <div className="flex items-center justify-between gap-2 px-3.5 sm:px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setCollapsedAllDays((prev) => ({ ...prev, [day.dateKey]: !prev[day.dateKey] }))}
                    className="flex items-center gap-2 min-w-0 flex-1 text-start cursor-pointer"
                  >
                    <ChevronDown
                      className={`size-4 shrink-0 text-[#65706A] dark:text-[#B2B9B3] transition-transform ${
                        isCollapsed ? '' : 'rotate-180'
                      }`}
                    />
                    <Calendar className="size-4 shrink-0 text-[#111313] dark:text-[#D0FF38]" />
                    <span className="truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                      {day.meta.dayTitle} – {day.meta.fullLabel}
                    </span>
                    <span className="rounded-full bg-[#F7F8F5] dark:bg-[#252B27] px-2 py-0.5 text-[10px] font-black text-[#65706A] dark:text-[#B2B9B3] shrink-0">
                      {day.matchCount}
                    </span>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="hidden sm:flex items-center gap-1">
                      {day.groupDots.map((gd) => (
                        <span
                          key={gd.key}
                          title={gd.label}
                          className="size-2.5 rounded-full"
                          style={{ backgroundColor: gd.hex }}
                        />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectDayKey?.(day.dateKey)}
                      className="rounded-lg bg-[#B8F000]/25 dark:bg-[#D0FF38]/15 px-2.5 py-1 text-[10px] font-black text-[#111313] dark:text-[#D0FF38] hover:bg-[#B8F000]/45 transition cursor-pointer"
                    >
                      برمجة اليوم ←
                    </button>
                  </div>
                </div>

                {!isCollapsed && (
                  <div className="border-t border-[#E1E5DF]/70 dark:border-[#303832]/70 p-2.5 sm:p-3 space-y-2">
                    {day.items.length === 0 ? (
                      <p className="py-4 text-center text-xs font-bold text-[#65706A] dark:text-[#B2B9B3]">
                        لا توجد مباريات مبرمجة في هذا اليوم بعد — اضغط «برمجة اليوم» لإضافة أو نقل مباريات.
                      </p>
                    ) : (
                      day.items.map((f) => (
                        <DayMatchCard
                          key={f.id}
                          fixture={f}
                          tournamentId={tournament?.id}
                          groupColor={f.group ? getGroupColor(f.group, orderedGroups) : null}
                          isOpening={f.id === effectiveOpeningMatchId}
                          slotEditMode={false}
                          draft={draft}
                          slotErrors={slotErrors}
                          teamById={teamById}
                          selectedPoolTeam={selectedPoolTeam}
                          busy={busy !== null}
                          batchSelectMode={batchSelectMode}
                          batchChecked={batchCheckedIds.includes(f.id)}
                          onToggleBatch={(id) =>
                            setBatchCheckedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
                          }
                          onStageSlot={onStageSlot}
                          onTapAssignSlot={handleTapAssignSlot}
                          onOpenReschedule={onOpenReschedule}
                          onOpenResult={onOpenResult}
                          onOpenDetails={onOpenDetails}
                          onPostpone={onPostpone}
                          onCancel={onCancel}
                          onRestore={onRestore}
                          onDelegatedLink={onDelegatedLink}
                          onReviewSubmission={onReviewSubmission}
                          onToggleOpeningMatch={onToggleOpeningMatch}
                        />
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {unscheduledCount > 0 && (
            <div className="overflow-hidden rounded-2xl border border-amber-300/60 dark:border-amber-700/60 bg-white dark:bg-[#1B201D] p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm font-black text-amber-800 dark:text-amber-300">
                  مباريات بانتظار تحديد الموعد ({unscheduledCount})
                </span>
                <button
                  type="button"
                  onClick={() => onSelectDayKey?.('unscheduled')}
                  className="rounded-lg bg-amber-500/15 px-2.5 py-1 text-[10px] font-black text-amber-800 dark:text-amber-200 cursor-pointer"
                >
                  تعبئة وبرمجة ←
                </button>
              </div>
              {unscheduledFixtures.map((f) => (
                <DayMatchCard
                  key={f.id}
                  fixture={f}
                  tournamentId={tournament?.id}
                  groupColor={f.group ? getGroupColor(f.group, orderedGroups) : null}
                  isOpening={false}
                  slotEditMode={!f.home_team || !f.away_team}
                  draft={draft}
                  slotErrors={slotErrors}
                  teamById={teamById}
                  selectedPoolTeam={selectedPoolTeam}
                  busy={busy !== null}
                  batchSelectMode={batchSelectMode}
                  batchChecked={batchCheckedIds.includes(f.id)}
                  onToggleBatch={(id) =>
                    setBatchCheckedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
                  }
                  onStageSlot={onStageSlot}
                  onTapAssignSlot={handleTapAssignSlot}
                  onOpenReschedule={onOpenReschedule}
                  onOpenResult={onOpenResult}
                  onOpenDetails={onOpenDetails}
                  onPostpone={onPostpone}
                  onCancel={onCancel}
                  onRestore={onRestore}
                  onDelegatedLink={onDelegatedLink}
                  onReviewSubmission={onReviewSubmission}
                  onToggleOpeningMatch={onToggleOpeningMatch}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ACTIVE DAY 3-AREA INTERACTIVE SCHEDULING WORKSPACE */
        <div className="space-y-3.5">
          {/* AREA (A): Active Day Info + Multi-Group Selector Bar */}
          <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-3.5 space-y-3 shadow-2xs">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2] truncate">
                  {selectedDayKey === 'unscheduled'
                    ? 'مباريات بدون موعد'
                    : `${activeDayObj?.meta?.dayTitle || 'اليوم'} — ${activeDayObj?.meta?.fullLabel || selectedDayKey}`}
                </p>
                <p className="text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3] mt-0.5">
                  {activeDayFixtures.length} مباراة على هذا اليوم
                  {groupCountMap.size > 0 ? ` · ${groupCountMap.size} ${groupCountMap.size === 1 ? 'مجموعة' : 'مجموعات'}` : ''}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {editableGroupFixturesOnDay.length > 0 && !dayHasEmptySlots && (
                  <button
                    type="button"
                    onClick={() => {
                      setSlotEditMode((v) => !v)
                      setSelectedPoolTeam(null)
                    }}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-[11px] font-black transition cursor-pointer ${
                      slotEditMode
                        ? 'border-[#111313] dark:border-[#D0FF38] bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313]'
                        : 'border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] text-[#111313] dark:text-[#F5F7F2]'
                    }`}
                  >
                    <MousePointerClick className="size-3.5" />
                    <span>{slotEditMode ? 'إخفاء تعديل المقاعد' : 'تعديل طرفي المواجهات'}</span>
                  </button>
                )}

                {unplayedCandidates.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setBatchModalOpen(true)}
                    className="inline-flex h-8 items-center gap-1 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] hover:bg-[#E9ECE7] dark:hover:bg-[#303832] px-2.5 text-[11px] font-black text-[#111313] dark:text-[#F5F7F2] transition cursor-pointer"
                  >
                    <CalendarRange className="size-3.5 text-[#1F9D55] dark:text-[#D0FF38]" />
                    <span>{activeDayFixtures.length > 0 ? 'تعديل موعد اليوم' : 'نقل مباريات لهذا اليوم'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Multi-Group Selection Chips */}
            {(orderedGroups.length > 0 || knockoutOnDayCount > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#E1E5DF]/70 dark:border-[#303832]/70">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGroupIds([])
                    setShowKnockoutOnly(false)
                  }}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-black transition cursor-pointer ${
                    selectedGroupIds.length === 0 && !showKnockoutOnly
                      ? 'border-[#111313] dark:border-[#D0FF38] bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313]'
                      : 'border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3]'
                  }`}
                >
                  <Layers className="size-3" />
                  <span>كل المجموعات</span>
                  <span className="font-mono tabular-nums">({activeDayFixtures.length})</span>
                </button>

                {orderedGroups.map((g) => {
                  const gc = getGroupColor(g, orderedGroups)
                  const countOnDay = groupCountMap.get(g.id) || 0
                  const active = !showKnockoutOnly && selectedGroupIds.includes(g.id)
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => handleToggleGroup(g.id)}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-black transition cursor-pointer ${
                        active
                          ? gc.activePillCls
                          : countOnDay > 0
                            ? 'border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] text-[#111313] dark:text-[#F5F7F2] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27]'
                            : 'border-[#E1E5DF]/60 dark:border-[#303832]/60 bg-[#F7F8F5]/60 dark:bg-[#252B27]/50 text-[#65706A] dark:text-[#B2B9B3] opacity-75'
                      }`}
                    >
                      <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: gc.hex }} />
                      <span>{formatGroupName(g.name, { groupId: g.id, tournamentId: tournament?.id })}</span>
                      <span className="font-mono tabular-nums opacity-80">({countOnDay})</span>
                    </button>
                  )
                })}

                {knockoutOnDayCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowKnockoutOnly((v) => !v)}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-[11px] font-black transition cursor-pointer ${
                      showKnockoutOnly
                        ? 'border-amber-500 bg-amber-500/18 text-amber-900 dark:text-amber-200'
                        : 'border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] text-[#111313] dark:text-[#F5F7F2]'
                    }`}
                  >
                    <Trophy className="size-3 text-amber-500" />
                    <span>الإقصائيات ({knockoutOnDayCount})</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Interactive 2-Column Responsive Workspace Grid: Area (B) Teams Pool + Area (C) Day Matches */}
          <div className="grid gap-4 xl:grid-cols-[310px_minmax(0,1fr)] items-start">
            {/* AREA (B): Teams Pool for Selected Group(s) on Active Day */}
            {teamsPoolByGroup.length > 0 && !showKnockoutOnly && (
              <aside className="xl:sticky xl:top-4 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] shadow-2xs overflow-hidden">
                <button
                  type="button"
                  onClick={() => setMobilePoolOpen((v) => !v)}
                  className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-start xl:cursor-default cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#B8F000]/25 dark:bg-[#D0FF38]/20 text-[#111313] dark:text-[#D0FF38]">
                      <Users className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2] truncate">
                        فرق المجموعات المتاحة
                      </h4>
                      <p className="text-[10px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
                        {effectiveSlotEditing ? 'اضغط فريقين للتعبئة أو اسحب للمباراة' : 'حالة برمجة الفرق في هذا اليوم'}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`size-4 shrink-0 text-[#65706A] xl:hidden transition-transform ${
                      mobilePoolOpen || effectiveSlotEditing ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <div className={`${mobilePoolOpen || effectiveSlotEditing ? 'block' : 'hidden xl:block'} border-t border-[#E1E5DF]/70 dark:border-[#303832]/70 p-3 space-y-3`}>
                  {/* Active 2-Tap Selection Helper Banner */}
                  {selectedPoolTeam && (
                    <div className="flex items-center justify-between gap-2 rounded-xl border border-[#B8F000] dark:border-[#D0FF38] bg-[#B8F000]/18 dark:bg-[#D0FF38]/14 px-2.5 py-2 text-[11px] font-black text-[#111313] dark:text-[#F5F7F2]">
                      <span className="truncate">
                        اختر الخصم من نفس المجموعة أو اضغط مقعداً: <strong>{selectedPoolTeam.name}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => setSelectedPoolTeam(null)}
                        className="shrink-0 rounded-lg bg-white/80 dark:bg-[#1B201D] px-2 py-0.5 text-[10px] font-black cursor-pointer"
                      >
                        إلغاء
                      </button>
                    </div>
                  )}

                  <div className="max-h-[46vh] xl:max-h-[60vh] space-y-3 overflow-y-auto pe-0.5">
                    {teamsPoolByGroup.map((grpSection) => (
                      <div key={grpSection.group.id} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 px-0.5">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-black text-[#111313] dark:text-[#F5F7F2]">
                            <span
                              className="size-2 shrink-0 rounded-full"
                              style={{ backgroundColor: grpSection.color.hex }}
                            />
                            <span>{grpSection.title}</span>
                          </span>
                          <span className="text-[10px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
                            {grpSection.teams.length} فرق
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 gap-1.5">
                          {grpSection.teams.map((team) => {
                            const entries = dayTeamParticipation.get(team.id) || []
                            const playingToday = entries.length > 0
                            const isPicked = selectedPoolTeam?.id === team.id

                            return (
                              <div
                                key={team.id}
                                draggable={!busy}
                                onClick={() => handleSelectPoolTeam(team)}
                                onDragStart={(e) => {
                                  if (busy) {
                                    e.preventDefault()
                                    return
                                  }
                                  e.dataTransfer.effectAllowed = 'move'
                                  e.dataTransfer.setData('text/plain', String(team.id))
                                  e.dataTransfer.setData('application/x-footmanager-team', String(team.id))
                                }}
                                className={`flex items-center justify-between gap-2 rounded-xl border border-s-4 px-2.5 py-2 transition cursor-pointer ${
                                  isPicked
                                    ? 'border-[#B8F000] dark:border-[#D0FF38] bg-[#B8F000]/20 dark:bg-[#D0FF38]/16 ring-1 ring-[#B8F000]'
                                    : 'border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5]/75 dark:bg-[#252B27]/75 hover:bg-[#F7F8F5] dark:hover:bg-[#252B27]'
                                }`}
                                style={{ borderInlineStartColor: grpSection.color.hex }}
                              >
                                <div className="flex items-center gap-2 min-w-0 flex-1">
                                  <TeamAvatar
                                    team={team}
                                    className="size-6 shrink-0"
                                    onClick={(e) => {
                                      e?.stopPropagation?.()
                                      openTeam(team)
                                    }}
                                  />
                                  <span className="truncate text-[11px] font-black text-[#111313] dark:text-[#F5F7F2]">
                                    {team?.id != null ? <button type="button" draggable={false} onClick={(e) => { e.stopPropagation(); openTeam(team) }} className="block max-w-full truncate text-start hover:text-[#1F9D55] dark:hover:text-[#D0FF38] transition-colors cursor-pointer">{team.name}</button> : team.name}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                  {playingToday ? (
                                    <span className="rounded-md bg-[#1F9D55]/15 dark:bg-[#30D158]/20 px-1.5 py-0.5 text-[9px] font-black text-[#15803D] dark:text-[#86EFAC] tabular-nums">
                                      {entries[0].time}
                                    </span>
                                  ) : (
                                    <span className="rounded-md bg-white dark:bg-[#1B201D] border border-[#E1E5DF] dark:border-[#303832] px-1.5 py-0.5 text-[9px] font-bold text-[#65706A] dark:text-[#B2B9B3]">
                                      متاح
                                    </span>
                                  )}
                                  {effectiveSlotEditing && (
                                    <GripVertical className="size-3.5 text-[#65706A]/50 hidden sm:inline" />
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            )}

            {/* AREA (C): Active Day's Matches Grouped by Group */}
            <div className="min-w-0 space-y-3">
              {groupedSections.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] px-4 py-8 text-center space-y-3">
                  <div className="mx-auto grid size-11 place-items-center rounded-2xl bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3]">
                    <CalendarPlus className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                      {selectedGroupIds.length > 0
                        ? 'لا توجد مباريات للمجموعة المحددة في هذا اليوم'
                        : 'لا توجد مباريات مبرمجة في هذا اليوم بعد'}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-[#65706A] dark:text-[#B2B9B3]">
                      يمكنك نقل مباريات غير منجزة إلى هذا اليوم أو إنشاء قوالب/جدول يبدأ من هذا التاريخ.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {unplayedCandidates.length > 0 && (
                      <Button size="sm" onClick={() => setBatchModalOpen(true)}>
                        <CalendarRange className="size-4" />
                        <span>نقل مباريات لهذا اليوم</span>
                      </Button>
                    )}
                    {!isLeague && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onOpenGenerator?.('group', true, activeDayObj?.dateKey)}
                      >
                        <LayoutTemplate className="size-4" />
                        <span>إنشاء قوالب من هذا اليوم</span>
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                groupedSections.map((sec) => (
                  <div
                    key={sec.key}
                    className="overflow-hidden rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] shadow-2xs"
                  >
                    <div
                      className={`flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-[#E1E5DF]/70 dark:border-[#303832]/70 ${
                        sec.color ? sec.color.headerBgCls : 'bg-[#F7F8F5] dark:bg-[#252B27]'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {sec.color ? (
                          <span
                            className="size-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: sec.color.hex }}
                          />
                        ) : (
                          <Trophy className="size-3.5 shrink-0 text-amber-500" />
                        )}
                        <h4 className="truncate text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                          {sec.title}
                        </h4>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                            sec.color
                              ? sec.color.badgeCls
                              : 'bg-white dark:bg-[#1B201D] text-[#65706A] dark:text-[#B2B9B3]'
                          }`}
                        >
                          {sec.items.length} مباريات
                        </span>
                      </div>
                    </div>

                    <div className="p-2.5 sm:p-3 space-y-2">
                      {sec.items.map((f) => (
                        <DayMatchCard
                          key={f.id}
                          fixture={f}
                          tournamentId={tournament?.id}
                          groupColor={sec.color}
                          isOpening={f.id === effectiveOpeningMatchId}
                          slotEditMode={effectiveSlotEditing}
                          draft={draft}
                          slotErrors={slotErrors}
                          teamById={teamById}
                          selectedPoolTeam={selectedPoolTeam}
                          busy={busy !== null}
                          batchSelectMode={batchSelectMode}
                          batchChecked={batchCheckedIds.includes(f.id)}
                          onToggleBatch={(id) =>
                            setBatchCheckedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
                          }
                          onStageSlot={onStageSlot}
                          onTapAssignSlot={handleTapAssignSlot}
                          onOpenReschedule={onOpenReschedule}
                          onOpenResult={onOpenResult}
                          onOpenDetails={onOpenDetails}
                          onPostpone={onPostpone}
                          onCancel={onCancel}
                          onRestore={onRestore}
                          onDelegatedLink={onDelegatedLink}
                          onReviewSubmission={onReviewSubmission}
                          onToggleOpeningMatch={onToggleOpeningMatch}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Target Programming Day Modal */}
      <AddDayModal
        open={addDayOpen}
        onClose={() => setAddDayOpen(false)}
        initialDate={tournament?.start_date || ''}
        existingDates={existingDates}
        onConfirm={(nextDate) => {
          setAddDayOpen(false)
          if (!existingDates.includes(nextDate)) {
            onAddCustomDay?.(nextDate)
          }
          onSelectDayKey?.(nextDate)
          setSelectedGroupIds([])
        }}
      />

      {/* Batch Reschedule Modal (100% Real PUT /fixtures/{id}) */}
      <BatchRescheduleModal
        open={batchModalOpen}
        onClose={() => setBatchModalOpen(false)}
        tournament={tournament}
        orderedGroups={orderedGroups}
        candidateFixtures={unplayedCandidates}
        initialSelectedIds={batchCheckedIds}
        initialDate={selectedDayKey}
        defaultTime={defaultTime}
        onDone={(targetDate) => {
          setBatchModalOpen(false)
          setBatchSelectMode(false)
          setBatchCheckedIds([])
          if (targetDate) onSelectDayKey?.(targetDate)
          onRefresh?.()
        }}
      />
    </div>
  )
}
