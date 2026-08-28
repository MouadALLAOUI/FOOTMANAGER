import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react'
import { Button, inputClass, selectClass } from '../../../components/dashboard/ui'

function LabeledSelect({ label, value, options, onChange }) {
  const { t } = useTranslation()
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-slate-500">{label}</span>
      <span className="relative block">
        <select value={value} onChange={(e) => onChange(e.target.value)} className={`${selectClass} w-full lg:w-[180px] text-xs`}>
          <option value="all">{t('public.tournaments.filters.all')}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute end-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      </span>
    </label>
  )
}

export default function FilterBar({ search, onSearch, filters, onFilterChange, statusOptions, formatOptions, locationOptions, activeCount, onReset }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const hasActive = activeCount > 0

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="relative flex-1 lg:max-w-md">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t('public.tournaments.search.placeholder')}
            className={`${inputClass} ps-10`}
            aria-label={t('public.tournaments.search.placeholder')}
          />
        </div>

        <div className="hidden items-end gap-2 lg:flex">
          <LabeledSelect label={t('public.tournaments.filters.status')} value={filters.status} options={statusOptions} onChange={(v) => onFilterChange('status', v)} />
          <LabeledSelect label={t('public.tournaments.filters.format')} value={filters.format} options={formatOptions} onChange={(v) => onFilterChange('format', v)} />
          <LabeledSelect label={t('public.tournaments.filters.location')} value={filters.location} options={locationOptions} onChange={(v) => onFilterChange('location', v)} />
          {(hasActive || search.trim()) && (
            <Button variant="outline" size="sm" onClick={onReset} className="mb-0.5 gap-1.5">
              <X className="size-3.5" />
              {t('public.tournaments.filters.reset')}
            </Button>
          )}
        </div>

        <div className="lg:hidden">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-slate-300"
            aria-expanded={open}
          >
            <SlidersHorizontal className="size-4 text-slate-400" />
            {t('public.tournaments.filters.title')}
            {hasActive && (
              <span className="grid size-5 place-items-center rounded-full bg-green-500 text-[10px] font-black text-white">
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {open && (
        <div className="grid gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 sm:grid-cols-2 lg:hidden">
          <LabeledSelect label={t('public.tournaments.filters.status')} value={filters.status} options={statusOptions} onChange={(v) => onFilterChange('status', v)} />
          <LabeledSelect label={t('public.tournaments.filters.format')} value={filters.format} options={formatOptions} onChange={(v) => onFilterChange('format', v)} />
          <LabeledSelect label={t('public.tournaments.filters.location')} value={filters.location} options={locationOptions} onChange={(v) => onFilterChange('location', v)} />
          {(hasActive || search.trim()) && (
            <Button variant="outline" size="sm" onClick={onReset} className="justify-self-start gap-1.5 sm:justify-self-end">
              <X className="size-3.5" />
              {t('public.tournaments.filters.reset')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}