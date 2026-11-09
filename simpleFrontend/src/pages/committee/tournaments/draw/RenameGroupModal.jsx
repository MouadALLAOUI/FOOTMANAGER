import { useState, useEffect } from 'react'
import { Check, Loader2, Pencil, X } from 'lucide-react'
import { formatGroupName } from '../../../../lib/groupNames'

export default function RenameGroupModal({
  open,
  onClose,
  group,
  tournamentId,
  existingGroups = [],
  onSave,
}) {
  const currentTitle = group ? formatGroupName(group.name, { groupId: group.id, tournamentId }) : ''
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open && group) {
      // Pre-fill with current formatted or raw name
      setName(currentTitle || group.name || '')
      setError(null)
      setSaving(false)
    }
  }, [open, group, currentTitle])

  if (!open || !group) return null

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    const trimmed = name.trim()

    if (!trimmed) {
      setError('يرجى إدخال اسم المجموعة')
      return
    }

    // Check duplicate name within the same tournament (case-insensitive & trimmed)
    const isDuplicate = existingGroups.some(
      (g) =>
        g.id !== group.id &&
        (String(g.name || '').trim().toLowerCase() === trimmed.toLowerCase() ||
          formatGroupName(g.name, { groupId: g.id, tournamentId }).trim().toLowerCase() === trimmed.toLowerCase()),
    )

    if (isDuplicate) {
      setError('اسم المجموعة مستخدم بالفعل في هذه البطولة. يرجى اختيار اسم مختلف.')
      return
    }

    // If unchanged, simply close
    if (trimmed === currentTitle.trim() || trimmed === String(group.name || '').trim()) {
      onClose()
      return
    }

    setError(null)
    setSaving(true)
    try {
      await onSave(trimmed)
      onClose()
    } catch (err) {
      const msg =
        err?.response?.data?.errors?.name?.[0] ||
        err?.response?.data?.message ||
        err?.message ||
        'تعذر حفظ اسم المجموعة'
      setError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div
        className="w-full max-w-md rounded-3xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-5 sm:p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#E1E5DF]/70 dark:border-[#303832]/70 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-[#B8F000]/30 dark:bg-[#D0FF38]/20 text-[#111313] dark:text-[#D0FF38]">
              <Pencil className="size-4" />
            </span>
            <h3 className="text-base font-black text-[#111313] dark:text-[#F5F7F2]">
              تغيير اسم المجموعة
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="grid size-8 place-items-center rounded-xl text-[#65706A] dark:text-[#B2B9B3] hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Current group info badge */}
        <div className="mt-4 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3 text-xs">
          <span className="font-semibold text-[#65706A] dark:text-[#B2B9B3]">الاسم الحالي: </span>
          <span className="font-black text-[#111313] dark:text-[#F5F7F2]">{currentTitle}</span>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#111313] dark:text-[#F5F7F2] mb-1.5">
              اسم المجموعة الجديد
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError(null)
              }}
              placeholder="مثال: مجموعة الأطلس أو مجموعة الصقور"
              maxLength={60}
              className="w-full h-11 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] px-3.5 text-sm font-bold text-[#111313] dark:text-[#F5F7F2] placeholder-[#65706A]/50 focus:border-[#B8F000] dark:focus:border-[#D0FF38] focus:ring-2 focus:ring-[#B8F000]/25 focus:outline-none transition"
            />
            <p className="mt-1.5 text-[11px] text-[#65706A] dark:text-[#B2B9B3]">
              يتم حفظ الاسم فوراً في قاعدة البيانات وسيظهر في المباريات، الترتيب، وجداول البطولة.
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 p-3 text-xs font-bold text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex h-11 items-center justify-center gap-2 rounded-xl bg-[#B8F000] dark:bg-[#D0FF38] text-xs sm:text-sm font-black text-[#111313] shadow-xs hover:opacity-95 disabled:opacity-50 transition active:scale-98 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  <span>جارٍ الحفظ...</span>
                </>
              ) : (
                <>
                  <Check className="size-4 stroke-[2.8]" />
                  <span>حفظ التعديلات</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-11 px-4 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] text-xs font-bold text-[#65706A] dark:text-[#B2B9B3] hover:bg-[#F7F8F5] dark:hover:bg-[#252B27] transition cursor-pointer"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
