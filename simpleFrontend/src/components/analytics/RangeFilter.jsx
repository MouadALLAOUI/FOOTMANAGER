import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { CalendarRange } from 'lucide-react'

const PRESETS = ['today', '7d', '30d', '3m', 'year', 'custom']

function toISO(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${m}-${day}`
}

export function rangeForPreset(preset) {
  const now = new Date()
  const end = toISO(now)
  if (preset === 'today') {
    return { from: end, to: end }
  }
  const start = new Date(now)
  if (preset === '7d') start.setDate(now.getDate() - 6)
  else if (preset === '30d') start.setDate(now.getDate() - 29)
  else if (preset === '3m') start.setDate(now.getDate() - 89)
  else if (preset === 'year') start.setMonth(0, 1)
  return { from: toISO(start), to: end }
}

export default function RangeFilter({ value, onChange, className = '' }) {
  const { t } = useTranslation()

  const activePreset = useMemo(() => {
    if (!value?.from || !value?.to) return '30d'
    for (const preset of PRESETS) {
      if (preset === 'custom') continue
      const range = rangeForPreset(preset)
      if (range.from === value.from && range.to === value.to) return preset
    }
    return 'custom'
  }, [value])

  const inputClass =
    'h-8 w-[130px] rounded-lg border-0 bg-transparent text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-green-200'

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              if (preset !== 'custom') onChange(rangeForPreset(preset))
            }}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              activePreset === preset ? 'bg-green-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t(`analytics.filters.${preset}`)}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <CalendarRange className="ms-2 size-4 shrink-0 text-slate-400" />
        <input
          type="date"
          value={value?.from || ''}
          max={value?.to || ''}
          onChange={(e) => onChange({ from: e.target.value, to: value?.to || '' })}
          className={inputClass}
          aria-label={t('analytics.filters.from')}
        />
        <span className="text-[11px] font-bold text-slate-400">{t('analytics.filters.to')}</span>
        <input
          type="date"
          value={value?.to || ''}
          min={value?.from || ''}
          onChange={(e) => onChange({ from: value?.from || '', to: e.target.value })}
          className={`${inputClass} ms-1`}
          aria-label={t('analytics.filters.to')}
        />
      </div>
    </div>
  )
}
