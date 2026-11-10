import { useEffect, useState } from 'react'
import { CalendarPlus } from 'lucide-react'
import { Button, Field, Modal, inputClass } from '../../../../components/dashboard/ui'

export default function AddDayModal({ open, onClose, initialDate = '', existingDates = [], onConfirm }) {
  const [date, setDate] = useState(initialDate)

  useEffect(() => {
    if (open) {
      setDate(initialDate || new Date().toISOString().slice(0, 10))
    }
  }, [open, initialDate])

  const alreadyExists = date && existingDates.includes(date)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="إضافة يوم برمجة جديد"
      subtitle="اختر تاريخ اليوم لإضافته لشريط الأيام وبرمجة أو نقل مباريات إليه"
      size="sm"
    >
      <form
        dir="rtl"
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!date) return
          onConfirm?.(date)
        }}
      >
        <Field label="تاريخ يوم المنافسات">
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </Field>

        {alreadyExists && (
          <p className="rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 text-xs font-bold text-amber-800 dark:text-amber-300">
            هذا التاريخ موجود بالفعل في جدول الأيام — سيتم فتحه مباشرة.
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" size="sm" disabled={!date}>
            <CalendarPlus className="size-4" />
            <span>{alreadyExists ? 'فتح هذا اليوم' : 'إضافة وفتح اليوم'}</span>
          </Button>
        </div>
      </form>
    </Modal>
  )
}
