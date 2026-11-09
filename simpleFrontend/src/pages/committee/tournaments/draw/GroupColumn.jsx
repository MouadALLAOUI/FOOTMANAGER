import { useState } from 'react'
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  Edit3,
  GripVertical,
  MoreVertical,
  Pencil,
  Trash2,
  Users,
  X,
} from 'lucide-react'
import { TeamAvatar } from '../../../tournaments/shared'

export default function GroupColumn({
  title,
  groupName,
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
  onEditTeams,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title || groupName || '')
  const [menuOpen, setMenuOpen] = useState(false)

  const isFree = capacity == null
  const isComplete = isFree ? members.length >= 2 : members.length >= capacity && capacity > 0
  const groupMatchesCount = Math.max(0, Math.floor((members.length * (members.length - 1)) / 2))

  const commitRename = () => {
    setEditing(false)
    const next = draft.trim()
    if (next && next !== title && next !== groupName) {
      onRenameGroup?.(next)
    } else {
      setDraft(title || groupName || '')
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
        onClick={() => !editing && onToggleExpand?.()}
        className={`flex items-center justify-between gap-2.5 px-4 py-3.5 cursor-pointer select-none transition-colors ${
          expanded
            ? 'bg-[#B8F000]/20 dark:bg-[#D0FF38]/12 border-b border-[#E1E5DF] dark:border-[#303832]'
            : 'bg-white dark:bg-[#1B201D]'
        }`}
      >
        {/* Right Side in RTL: Group Icon + Name */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {expanded ? (
            <ChevronDown className="size-4 shrink-0 text-[#111313] dark:text-[#F5F7F2] rotate-180 transition-transform" />
          ) : (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#F7F8F5] dark:bg-[#252B27] text-[#111313] dark:text-[#D0FF38]">
              <Users className="size-4" />
            </div>
          )}

          {editing ? (
            <div
              className="flex items-center gap-1.5 min-w-0 flex-1"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                autoFocus
                value={draft}
                placeholder="مثال: مجموعة الأطلس، Groupe Atlas"
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename()
                  if (e.key === 'Escape') {
                    setDraft(title || groupName || '')
                    setEditing(false)
                  }
                }}
                className="h-8 w-full max-w-[200px] rounded-lg border border-[#111313] dark:border-[#D0FF38] bg-white dark:bg-[#1B201D] px-2.5 text-xs sm:text-sm font-black text-[#111313] dark:text-[#F5F7F2] focus:outline-none"
              />
              <button
                type="button"
                onClick={commitRename}
                className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#B8F000] dark:bg-[#D0FF38] text-[#111313] shadow-2xs cursor-pointer"
                title="حفظ اسم المجموعة"
              >
                <Check className="size-3.5 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(title || groupName || '')
                  setEditing(false)
                }}
                className="grid size-7 shrink-0 place-items-center rounded-lg bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3] cursor-pointer"
                title="إلغاء"
              >
                <X className="size-3.5" />
              </button>
            </div>
          ) : (
            <span className="truncate text-sm sm:text-base font-black text-[#111313] dark:text-[#F5F7F2]">
              {title}
            </span>
          )}
        </div>

        {/* Left Side in RTL: Team Count Pill + Edit/Menu Icons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <span
            onClick={() => onToggleExpand?.()}
            className="inline-flex items-center rounded-full bg-[#B8F000]/30 dark:bg-[#D0FF38]/20 px-2.5 sm:px-3 py-0.5 text-xs font-black text-[#111313] dark:text-[#D0FF38]"
          >
            {members.length} فرق
          </span>

          {!locked && onRenameGroup && !editing && (
            <button
              type="button"
              onClick={() => {
                setDraft(title || groupName || '')
                setEditing(true)
              }}
              className="grid size-7 place-items-center rounded-lg text-[#65706A] dark:text-[#B2B9B3] hover:text-[#111313] dark:hover:text-[#F5F7F2] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
              title="تغيير اسم المجموعة"
            >
              <Pencil className="size-3.5" />
            </button>
          )}

          {expanded && !locked && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="grid size-7 place-items-center rounded-lg text-[#111313] dark:text-[#F5F7F2] hover:bg-black/5 dark:hover:bg-white/10 cursor-pointer"
                aria-label="خيارات المجموعة"
              >
                <MoreVertical className="size-4" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(false)} />
                  <div className="absolute end-0 top-8 z-30 w-44 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-1 shadow-lg">
                    {onEditTeams && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          onEditTeams()
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-[#111313] dark:text-[#F5F7F2] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27] cursor-pointer"
                      >
                        <Edit3 className="size-3.5" />
                        <span>تعديل فرق المجموعة</span>
                      </button>
                    )}
                    {onRenameGroup && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          setDraft(title || groupName || '')
                          setEditing(true)
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-[#111313] dark:text-[#F5F7F2] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27] cursor-pointer"
                      >
                        <Pencil className="size-3.5" />
                        <span>تغيير اسم المجموعة</span>
                      </button>
                    )}
                    {onDeleteGroup && (
                      <button
                        type="button"
                        onClick={() => {
                          setMenuOpen(false)
                          onDeleteGroup()
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold text-[#D92D20] hover:bg-[#D92D20]/10 cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                        <span>حذف / تفريغ المجموعة</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {!expanded && (
            <button
              type="button"
              onClick={() => onToggleExpand?.()}
              className="grid size-7 place-items-center text-[#65706A] dark:text-[#B2B9B3]"
              aria-label="توسيع المجموعة"
            >
              <ChevronLeft className="size-4 rtl:rotate-0" />
            </button>
          )}
        </div>
      </div>

      {/* Expanded Body (Matches Reference Image 2 Right Screen) */}
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
