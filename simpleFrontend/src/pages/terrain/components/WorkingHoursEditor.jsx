import { Toggle } from '../../../components/dashboard/ui'
import TimePicker from '../../../components/TimePicker'

const DAYS = [
  { id: 0, label: 'الأحد', short: 'أحد' },
  { id: 1, label: 'الاثنين', short: 'اثن' },
  { id: 2, label: 'الثلاثاء', short: 'ثلا' },
  { id: 3, label: 'الأربعاء', short: 'أرب' },
  { id: 4, label: 'الخميس', short: 'خمي' },
  { id: 5, label: 'الجمعة', short: 'جمع' },
  { id: 6, label: 'السبت', short: 'سبت' },
]

export default function WorkingHoursEditor({ value, onChange }) {
  const list = DAYS.map((d) => {
    const v = (value || []).find((item) => item.day_of_week === d.id)
    return { ...d, day_of_week: d.id, open_time: '09:00', close_time: '23:00', is_active: false, ...(v || {}) }
  })

  const set = (id, patch) =>
    onChange(list.map((d) => (d.day_of_week === id ? { ...d, ...patch } : d)))

  const openDays = list.filter((d) => d.is_active).length

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
        <p className="text-xs font-bold text-slate-500">
          {openDays} / 7 أيام مفتوحة
        </p>
        <p className="text-[11px] text-slate-400">أيام مغلقة: {7 - openDays}</p>
      </div>

      {/* Grid header — desktop only */}
      <div className="hidden rounded-t-2xl bg-slate-50 px-4 py-2.5 lg:grid lg:grid-cols-[auto_1fr_1fr_auto] lg:items-center lg:gap-4">
        <p className="text-xs font-extrabold text-slate-500 text-center">اليوم</p>
        <p className="text-xs font-extrabold text-slate-500 text-center">فتح</p>
        <p className="text-xs font-extrabold text-slate-500 text-center">إغلاق</p>
        <p className="text-xs font-extrabold text-slate-500 text-center">الحالة</p>
      </div>

      {/* Rows */}
      <div className="space-y-2 lg:space-y-0">
        {list.map((d) => (
          <div
            key={d.day_of_week}
            className={`rounded-2xl border transition-colors lg:rounded-none lg:border-x-0 lg:border-t-0 lg:first:rounded-t-none lg:last:rounded-b-2xl ${
              d.is_active
                ? 'border-green-200 bg-green-50/40 lg:border-green-100'
                : 'border-slate-100 bg-slate-50/50 lg:border-slate-100'
            }`}
          >
            {/* Desktop row layout */}
            <div className="hidden lg:grid lg:grid-cols-[auto_1fr_1fr_auto] lg:items-center lg:gap-4 lg:px-4 lg:py-3">
              <div className="flex items-center gap-3">
                <span
                  className={`grid size-8 shrink-0 place-items-center rounded-lg text-[11px] font-black ${
                    d.is_active ? 'bg-green-500 text-white' : 'bg-white text-slate-400 shadow-sm'
                  }`}
                >
                  {d.short}
                </span>
                <p className={`text-sm font-bold ${d.is_active ? 'text-slate-900' : 'text-slate-400'}`}>
                  {d.label}
                </p>
              </div>
              <div className={`transition-opacity ${d.is_active ? 'opacity-100' : 'pointer-events-none opacity-30'}`}>
                <TimePicker
                  value={d.open_time || '09:00'}
                  onChange={(v) => set(d.day_of_week, { open_time: v })}
                  label="فتح"
                  labels={{ ok: 'موافق', cancel: 'إلغاء' }}
                />
              </div>
              <div className={`transition-opacity ${d.is_active ? 'opacity-100' : 'pointer-events-none opacity-30'}`}>
                <TimePicker
                  value={d.close_time || '23:00'}
                  onChange={(v) => set(d.day_of_week, { close_time: v })}
                  label="إغلاق"
                  labels={{ ok: 'موافق', cancel: 'إلغاء' }}
                />
              </div>
              <div className="flex justify-center">
                <Toggle checked={d.is_active} onChange={(v) => set(d.day_of_week, { is_active: v })} />
              </div>
            </div>

            {/* Mobile card layout */}
            <div className="lg:hidden">
              <div className="flex items-center justify-between gap-3 p-3.5">
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
              <div className={`grid grid-cols-2 gap-3 px-3.5 pb-3.5 transition-opacity ${d.is_active ? 'opacity-100' : 'pointer-events-none opacity-30'}`}>
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
          </div>
        ))}
      </div>
    </div>
  )
}
