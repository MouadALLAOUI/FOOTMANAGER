import { useEffect, useRef } from 'react'
import {
  CalendarPlus,
  CalendarRange,
  ChevronDown,
  FileDown,
  LayoutTemplate,
  ListChecks,
  RotateCcw,
  Sparkles,
  Trash2,
  Trophy,
  X,
  Zap,
} from 'lucide-react'

export default function QuickActionsMenu({
  open,
  onToggle,
  onClose,
  hasAnyFixtures = false,
  hasKnockoutStage = false,
  isLeague = false,
  canBatchReschedule = false,
  batchSelectMode = false,
  hasEditableSlots = false,
  draftCount = 0,
  busy = null,
  onAutoSchedule,
  onManualLayout,
  onKnockoutSchedule,
  onAddDay,
  onBatchReschedule,
  onToggleBatchSelect,
  onClearDraftOrSlots,
  onExport,
  onDeleteAll,
}) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKey)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      window.removeEventListener('keydown', handleKey)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [open, onClose])

  const actions = [
    {
      key: 'auto',
      show: !isLeague,
      icon: Sparkles,
      iconCls: 'bg-[#B8F000]/30 dark:bg-[#D0FF38]/20 text-[#111313] dark:text-[#D0FF38]',
      label: 'برمجة ذكية (توليد تلقائي)',
      desc: 'معاينة وتوليد جدول المباريات وتفادي التداخل',
      onClick: () => {
        onClose?.()
        onAutoSchedule?.()
      },
    },
    {
      key: 'manual',
      show: !isLeague,
      icon: LayoutTemplate,
      iconCls: 'bg-blue-500/12 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300',
      label: 'تعبئة يدوية (إنشاء القوالب)',
      desc: 'توليد قوالب الجولات وتوزيع الفرق يدوياً بالضغط أو السحب',
      onClick: () => {
        onClose?.()
        onManualLayout?.()
      },
    },
    {
      key: 'knockout',
      show: hasKnockoutStage && !isLeague,
      icon: Trophy,
      iconCls: 'bg-amber-500/15 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300',
      label: 'برمجة الأدوار الإقصائية',
      desc: 'تجهيز وتوليد مباريات ربع ونصف النهائي والنهائي',
      onClick: () => {
        onClose?.()
        onKnockoutSchedule?.()
      },
    },
    {
      key: 'add-day',
      show: Boolean(onAddDay),
      icon: CalendarPlus,
      iconCls: 'bg-emerald-500/12 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
      label: 'إضافة يوم برمجة جديد',
      desc: 'فتح تاريخ يوم جديد ونقل أو جدولة مباريات إليه',
      onClick: () => {
        onClose?.()
        onAddDay?.()
      },
    },
    {
      key: 'batch-modal',
      show: hasAnyFixtures && canBatchReschedule && Boolean(onBatchReschedule),
      icon: CalendarRange,
      iconCls: 'bg-purple-500/12 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300',
      label: 'تعديل جماعي للموعد والملعب',
      desc: 'نقل أو تعديل تاريخ وتوقيت وملعب عدة مباريات دفعة واحدة',
      onClick: () => {
        onClose?.()
        onBatchReschedule?.()
      },
    },
    {
      key: 'batch-toggle',
      show: hasAnyFixtures && canBatchReschedule && Boolean(onToggleBatchSelect),
      icon: ListChecks,
      iconCls: 'bg-teal-500/12 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300',
      label: batchSelectMode ? 'إنهاء التحديد الجماعي' : 'تحديد عدة مباريات من القائمة',
      desc: 'تحديد مباريات مختارة من اليوم لتعديل مواعيدها معاً',
      onClick: () => {
        onClose?.()
        onToggleBatchSelect?.()
      },
    },
    {
      key: 'clear-slots',
      show: draftCount > 0 || hasEditableSlots,
      icon: RotateCcw,
      iconCls: 'bg-orange-500/12 dark:bg-orange-500/20 text-orange-700 dark:text-orange-300',
      label: draftCount > 0 ? 'تجاهل التعديلات غير المحفوظة' : 'إفراغ توزيع المقاعد المفتوحة',
      desc:
        draftCount > 0
          ? `إلغاء ${draftCount} تعديلات معلقة قبل الحفظ`
          : 'مسح اختيارات الفرق غير الملعوبة لإعادة تعبئتها يدوياً',
      onClick: () => {
        onClose?.()
        onClearDraftOrSlots?.()
      },
    },
    {
      key: 'export',
      show: Boolean(onExport),
      icon: FileDown,
      iconCls: 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#111313] dark:text-[#F5F7F2]',
      label: 'تصدير / طباعة البرنامج',
      desc: 'حفظ أو طباعة جدول المباريات والنتائج',
      onClick: () => {
        onClose?.()
        onExport?.()
      },
    },
    {
      key: 'delete-all',
      show: hasAnyFixtures && Boolean(onDeleteAll),
      icon: Trash2,
      iconCls: 'bg-[#D92D20]/12 dark:bg-[#D92D20]/20 text-[#D92D20] dark:text-[#FF6868]',
      label: 'حذف جدول المباريات',
      desc: 'حذف البرمجة الحالية بالكامل (غير الملعوبة)',
      danger: true,
      disabled: busy === 'del',
      onClick: () => {
        onClose?.()
        onDeleteAll?.()
      },
    },
  ].filter((a) => a.show)

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#B8F000] dark:bg-[#D0FF38] hover:opacity-95 px-3.5 text-xs sm:text-sm font-black text-[#111313] shadow-2xs transition active:scale-95 cursor-pointer"
      >
        <Zap className="size-4 shrink-0" />
        <span>إجراءات سريعة</span>
        <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Desktop Dropdown Menu */}
      {open && (
        <div
          role="menu"
          className="hidden sm:block absolute end-0 top-12 z-40 w-80 rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-2 shadow-2xl space-y-1"
        >
          {actions.map((act) => {
            const Icon = act.icon
            return (
              <button
                key={act.key}
                type="button"
                role="menuitem"
                disabled={act.disabled}
                onClick={act.onClick}
                className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-start transition cursor-pointer disabled:opacity-50 ${
                  act.danger
                    ? 'hover:bg-[#D92D20]/10 text-[#D92D20] dark:text-[#FF6868]'
                    : 'hover:bg-[#F7F8F5] dark:hover:bg-[#252B27] text-[#111313] dark:text-[#F5F7F2]'
                }`}
              >
                <span className={`mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl ${act.iconCls}`}>
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-black leading-tight">{act.label}</span>
                  <span className="mt-0.5 block text-[11px] font-semibold text-[#65706A] dark:text-[#B2B9B3] leading-snug">
                    {act.desc}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* Mobile Bottom Sheet */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:hidden" role="dialog" aria-modal="true" aria-label="إجراءات سريعة">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={onClose} />
          <div
            className="relative z-10 w-full rounded-t-3xl border-t border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-4 pb-6 shadow-2xl max-h-[82vh] overflow-y-auto space-y-3"
            dir="rtl"
          >
            <div className="mx-auto h-1 w-10 rounded-full bg-[#E1E5DF] dark:bg-[#303832]" />
            <div className="flex items-center justify-between gap-2 pb-1">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-xl bg-[#B8F000]/30 dark:bg-[#D0FF38]/20 text-[#111313] dark:text-[#D0FF38]">
                  <Zap className="size-4" />
                </span>
                <h3 className="text-sm font-black text-[#111313] dark:text-[#F5F7F2]">إجراءات سريعة</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid size-9 place-items-center rounded-xl bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3]"
                aria-label="إغلاق"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-1.5">
              {actions.map((act) => {
                const Icon = act.icon
                return (
                  <button
                    key={act.key}
                    type="button"
                    disabled={act.disabled}
                    onClick={act.onClick}
                    className={`flex w-full min-h-[52px] items-center gap-3 rounded-2xl border border-[#E1E5DF]/70 dark:border-[#303832]/80 px-3.5 py-2.5 text-start transition cursor-pointer disabled:opacity-50 ${
                      act.danger
                        ? 'bg-[#D92D20]/6 text-[#D92D20] dark:text-[#FF6868]'
                        : 'bg-[#F7F8F5]/70 dark:bg-[#252B27]/60 text-[#111313] dark:text-[#F5F7F2]'
                    }`}
                  >
                    <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${act.iconCls}`}>
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-black">{act.label}</span>
                      <span className="mt-0.5 block text-[11px] font-semibold text-[#65706A] dark:text-[#B2B9B3] leading-snug">
                        {act.desc}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
