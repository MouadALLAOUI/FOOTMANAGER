import { useState } from 'react'
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  Copy,
  Edit3,
  GripVertical,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { TeamAvatar } from '../../../tournaments/shared'
import { useToast } from '../../../../components/ui/Toast'

export default function GroupColumn({
  title,
  groupName,
  groupObj,
  members,
  capacity,
  locked,
  expanded = false,
  onToggleExpand,
  onDragStart,
  onDrop,
  onRemoveTeam,
  onDeleteGroup,
  onRenameGroup,
  onOpenRenameModal,
  onEditTeams,
}) {
  const { toast } = useToast()
  const [menuOpen, setMenuOpen] = useState(false)

  const isFree = capacity == null
  const isComplete = isFree ? members.length >= 2 : members.length >= capacity && capacity > 0
  const groupMatchesCount = Math.max(0, Math.floor((members.length * (members.length - 1)) / 2))

  const handleCopyGroupLink = () => {
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('group', groupObj?.id || groupName || '')
      navigator.clipboard.writeText(url.toString())
      toast?.success?.('تم نسخ رابط المجموعة بنجاح! 📋')
    } catch {
      navigator.clipboard?.writeText?.(title || groupName || '')
      toast?.success?.('تم نسخ اسم المجموعة! 📋')
    }
  }

  return (
    <div
      onDragOver={(e) => !locked && e.preventDefault()}
      onDrop={onDrop}
      className={`overflow-hidden rounded-2xl border transition-all ${
        expanded
          ? 'border-[#B8F000] dark:border-[#D0FF38]/60 bg-white dark:bg-[#1B201D] shadow-sm'
          : 'border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] hover:border-[#B8F000]/60 shadow-2xs'
      }`}
    >
      {/* Card Header (Collapsed or Expanded) */}
      <div
        onClick={() => onToggleExpand?.()}
        className={`flex items-center justify-between gap-2.5 px-4 py-3.5 cursor-pointer select-none transition-colors ${
          expanded
            ? 'bg-[#B8F000]/20 dark:bg-[#D0FF38]/12 border-b border-[#E1E5DF] dark:border-[#303832]'
            : 'bg-white dark:bg-[#1B201D]'
        }`}
      >
        {/* Right Side in RTL: Chevron + Group Title */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <ChevronDown
            className={`size-4 shrink-0 text-[#111313] dark:text-[#F5F7F2] transition-transform duration-200 ${
              expanded ? 'rotate-180' : 'rotate-0'
            }`}
          />
          <span className="truncate text-sm sm:text-base font-black text-[#111313] dark:text-[#F5F7F2]">
            {title}
          </span>
        </div>

        {/* Left Side in RTL: Team Count Pill + 3-dots Menu */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <span
            onClick={() => onToggleExpand?.()}
            className="inline-flex items-center rounded-full bg-[#B8F000]/30 dark:bg-[#D0FF38]/20 px-2.5 sm:px-3 py-0.5 text-xs font-black text-[#111313] dark:text-[#D0FF38]"
          >
            {members.length} فرق
          </span>

          {/* 3-dots Menu Button */}
          {!locked && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="grid size-8 place-items-center rounded-xl text-[#111313] dark:text-[#F5F7F2] hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
                aria-label="خيارات المجموعة"
              >
                <MoreVertical className="size-4" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                  <div className="absolute end-0 top-9 z-30 w-48 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-1.5 shadow-xl animate-in fade-in zoom-in-95">
                    {onOpenRenameModal && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          onOpenRenameModal()
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#111313] dark:text-[#F5F7F2] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27] cursor-pointer"
                      >
                        <Pencil className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>تغيير اسم المجموعة</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        handleCopyGroupLink()
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#111313] dark:text-[#F5F7F2] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27] cursor-pointer"
                    >
                      <Copy className="size-3.5 text-blue-600 dark:text-blue-400" />
                      <span>نسخ رابط المجموعة</span>
                    </button>
                    {onEditTeams && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          onEditTeams()
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#111313] dark:text-[#F5F7F2] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27] cursor-pointer"
                      >
                        <Edit3 className="size-3.5 text-amber-600 dark:text-amber-400" />
                        <span>تعديل فرق المجموعة</span>
                      </button>
                    )}
                    {onDeleteGroup && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          onDeleteGroup()
                        }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold text-[#D92D20] hover:bg-[#D92D20]/10 cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                        <span>حذف المجموعة</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Expanded Body (Matches Reference Image Left Screen) */}
      {expanded && (
        <div className="divide-y divide-[#E1E5DF]/70 dark:divide-[#303832]/70">
          {members.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-xs font-bold text-[#65706A] dark:text-[#B2B9B3]">
                لا توجد فرق موزعة في هذه المجموعة بعد
              </p>
              {!locked && onEditTeams && (
                <button
                  type="button"
                  onClick={onEditTeams}
                  className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-[#B8F000] dark:bg-[#D0FF38] px-3.5 py-1.5 text-xs font-black text-[#111313] cursor-pointer"
                >
                  <Edit3 className="size-3.5" />
                  <span>إضافة فرق للمجموعة</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#E1E5DF]/60 dark:divide-[#303832]/60">
              {members.map((member) => (
                <div
                  key={member.team.id}
                  draggable={!locked}
                  onDragStart={onDragStart?.(member.team.id)}
                  className={`flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-[#1B201D] transition ${
                    locked ? '' : 'hover:bg-[#F7F8F5]/80 dark:hover:bg-[#252B27]/60 cursor-grab active:cursor-grabbing'
                  }`}
                >
                  {/* Right side in RTL: Team Logo + Team Name */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <TeamAvatar team={member.team} className="size-8 shrink-0" />
                    <span className="truncate text-sm font-black text-[#111313] dark:text-[#F5F7F2]">
                      {member.team?.name}
                    </span>
                  </div>

                  {/* Left side in RTL: Remove + Drag Grip Handle */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!locked && onRemoveTeam && (
                      <button
                        type="button"
                        onClick={() => onRemoveTeam(member.team.id)}
                        className="grid size-7 place-items-center rounded-lg text-[#65706A] dark:text-[#B2B9B3] hover:bg-[#D92D20]/10 hover:text-[#D92D20] transition cursor-pointer"
                        title="إزالة الفريق من المجموعة"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                    <GripVertical className="size-4 text-[#65706A]/60 dark:text-[#B2B9B3]/60" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Group Footer: Match Count + Status Pill + Action Buttons */}
          <div className="bg-[#F7F8F5]/60 dark:bg-[#252B27]/50 px-4 py-3 space-y-3">
            <div className="flex items-center justify-between gap-2 text-xs">
              {isComplete ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1F9D55]/15 dark:bg-[#30D158]/20 px-2.5 py-0.5 text-[11px] font-black text-[#1F9D55] dark:text-[#30D158]">
                  <Check className="size-3 stroke-[3]" />
                  <span>مكتملة</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#D97706]/15 px-2.5 py-0.5 text-[11px] font-black text-[#D97706] dark:text-[#F59E0B]">
                  <span>{isFree ? 'بانتظار فرق إضافية' : `${members.length}/${capacity} فرق`}</span>
                </span>
              )}

              <span className="inline-flex items-center gap-1.5 font-bold text-[#65706A] dark:text-[#B2B9B3]">
                <Calendar className="size-3.5" />
                <span>{groupMatchesCount} مباريات في المجموعة</span>
              </span>
            </div>

            {!locked && (
              <div className="flex items-center gap-2">
                {onEditTeams && (
                  <button
                    type="button"
                    onClick={onEditTeams}
                    className="flex flex-1 h-10 items-center justify-center gap-2 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] hover:bg-[#E9ECE7] dark:hover:bg-[#303832] text-xs font-black text-[#111313] dark:text-[#F5F7F2] transition active:scale-98 cursor-pointer"
                  >
                    <Edit3 className="size-3.5" />
                    <span>تعديل الفرق</span>
                  </button>
                )}

                {onDeleteGroup && (
                  <button
                    type="button"
                    onClick={onDeleteGroup}
                    className="flex h-10 w-12 shrink-0 items-center justify-center rounded-xl border border-[#D92D20]/25 bg-[#D92D20]/10 hover:bg-[#D92D20]/20 text-[#D92D20] dark:text-[#FF453A] transition active:scale-95 cursor-pointer"
                    title="حذف أو تفريغ المجموعة"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
