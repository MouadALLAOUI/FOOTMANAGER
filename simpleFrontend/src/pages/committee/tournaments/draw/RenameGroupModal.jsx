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
      setName(currentTitle || group.name || '')
      setError(null)
      setSaving(false)
    }
  }, [open, group, currentTitle])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e) => {
      if (e.key === 'Escape' && !saving) onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, saving, onClose])

  if (!open || !group) return null

  const handleSubmit = async (e) => {
    e?.preventDefault?.()
    const trimmed = name.trim()

    if (!trimmed) {
      setError('يرجى إدخال اسم المجموعة')
      return
    }

    const normalized = trimmed.toLowerCase()
    const isDuplicate = existingGroups.some(
      (g) =>
        g.id !== group.id &&
        (String(g.name || '').trim().toLowerCase() === normalized ||
          formatGroupName(g.name, { groupId: g.id, tournamentId }).trim().toLowerCase() === normalized),
    )

    if (isDuplicate) {
      setError('اسم المجموعة مستخدم بالفعل في هذه البطولة. يرجى اختيار اسم مختلف.')
      return
    }

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
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
      onClick={() => !saving && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rename-group-title"
        className="w-full max-w-md rounded-t-3xl sm:rounded-3xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-5 sm:p-6 shadow-2xl transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-[#E1E5DF]/70 dark:border-[#303832]/70 pb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-[#B8F000]/30 dark:bg-[#D0FF38]/20 text-[#111313] dark:text-[#D0FF38]">
              <Pencil className="size-4" />
            </span>
            <h3 id="rename-group-title" className="text-base font-black text-[#111313] dark:text-[#F5F7F2]">
              تغيير اسم المجموعة
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="إغلاق"
            className="grid size-9 place-items-center rounded-xl text-[#65706A] dark:text-[#B2B9B3] hover:bg-black/5 dark:hover:bg-white/10 transition cursor-pointer"
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
            <label htmlFor="rename-group-input" className="block text-xs font-bold text-[#111313] dark:text-[#F5F7F2] mb-1.5">
              اسم المجموعة الجديد
            </label>
            <div className="relative">
              <input
                id="rename-group-input"
                type="text"
                autoFocus
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  if (error) setError(null)
                }}
                placeholder="مثال: مجموعة الأطلس أو مجموعة الصقور"
                maxLength={60}
                className="w-full h-11 rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] pe-3.5 ps-10 text-sm font-bold text-[#111313] dark:text-[#F5F7F2] placeholder-[#65706A]/50 focus:border-[#B8F000] dark:focus:border-[#D0FF38] focus:ring-2 focus:ring-[#B8F000]/25 focus:outline-none transition"
              />
              {name && !saving && (
                <button
                  type="button"
                  onClick={() => setName('')}
                  aria-label="مسح النص"
                  className="absolute start-2.5 top-1/2 -translate-y-1/2 grid size-6 place-items-center rounded-full text-[#65706A] dark:text-[#B2B9B3] hover:bg-[#E9ECE7] dark:hover:bg-[#303832] cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-[#65706A] dark:text-[#B2B9B3]">
              يتم حفظ الاسم فوراً في قاعدة البيانات وسيظهر في المباريات، الترتيب، وصفحة البطولة.
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
              disabled={saving || !name.trim()}
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
                  <span>حفظ</span>
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
