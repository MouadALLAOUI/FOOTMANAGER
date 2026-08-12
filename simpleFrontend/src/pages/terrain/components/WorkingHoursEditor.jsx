import { Toggle } from '../../../components/dashboard/ui'
import TimePicker from '../../../components/TimePicker'

const DAYS = [
  { id: 0, label: 'الأحد' },
  { id: 1, label: 'الاثنين' },
  { id: 2, label: 'الثلاثاء' },
  { id: 3, label: 'الأربعاء' },
  { id: 4, label: 'الخميس' },
  { id: 5, label: 'الجمعة' },
  { id: 6, label: 'السبت' },
]

export default function WorkingHoursEditor({ value, onChange }) {
  const list = DAYS.map((d) => {
    const v = (value || []).find((item) => item.day_of_week === d.id)
    return { ...d, day_of_week: d.id, open_time: '09:00', close_time: '23:00', is_active: false, ...(v || {}) }
  })

  const set = (id, patch) =>
    onChange(list.map((d) => (d.day_of_week === id ? { ...d, ...patch } : d)))

  return (
    <div className="space-y-2">
      {list.map((d) => (
        <div
          key={d.day_of_week}
          className={`rounded-2xl border p-3.5 transition-colors ${
            d.is_active ? 'border-green-200 bg-green-50/40' : 'border-slate-100 bg-slate-50/50'
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className={`grid size-9 shrink-0 place-items-center rounded-xl text-xs font-black ${
                  d.is_active ? 'bg-green-500 text-white' : 'bg-white text-slate-400 shadow-sm'
                }`}
              >
                {d.label.slice(0, 2)}
              </span>
              <p className={`text-sm font-extrabold ${d.is_active ? 'text-slate-900' : 'text-slate-400'}`}>
                {d.label}
              </p>
            </div>
            <Toggle checked={d.is_active} onChange={(v) => set(d.day_of_week, { is_active: v })} />
          </div>
          <div className={`mt-3 grid grid-cols-2 gap-3 transition-opacity ${d.is_active ? 'opacity-100' : 'pointer-events-none opacity-40'}`}>
            <TimePicker
              value={d.open_time || '09:00'}
              onChange={(v) => set(d.day_of_week, { open_time: v })}
              label="فتح"
              labels={{ ok: 'موافق', cancel: 'إلغاء' }}
            />
            <TimePicker
              value={d.close_time || '23:00'}
              onChange={(v) => set(d.day_of_week, { close_time: v })}
              label="إغلاق"
              labels={{ ok: 'موافق', cancel: 'إلغاء' }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
