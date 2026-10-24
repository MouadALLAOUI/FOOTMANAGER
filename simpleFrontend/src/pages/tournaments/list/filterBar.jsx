import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react'
import { Button, inputClass, selectClass } from '../../../components/dashboard/ui'

function LabeledSelect({ label, value, options, onChange }) {
  const { t } = useTranslation()
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-slate-500">{label}</span>
      <span className="relative block">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${selectClass} w-full text-xs lg:w-[175px]`}
        >
          <option value="all">{t('public.tournaments.filters.all', 'الكل')}</option>
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

export default function FilterBar({
  search,
  onSearch,
  filters,
  onFilterChange,
  statusOptions,
  formatOptions,
  locationOptions,
  activeCount,
  onReset,
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const hasActive = activeCount > 0 || !!search.trim()

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="relative flex-1 lg:max-w-md">
          <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder={t('public.tournaments.search.placeholder', 'ابحث باسم البطولة أو المدينة…')}
            className={`${inputClass} ps-10`}
            aria-label={t('public.tournaments.search.placeholder', 'ابحث باسم البطولة أو المدينة…')}
          />
        </div>

        <div className="hidden items-end gap-2.5 lg:flex">
          <LabeledSelect
            label={t('public.tournaments.filters.status', 'الحالة')}
            value={filters.status}
            options={statusOptions}
            onChange={(v) => onFilterChange('status', v)}
          />
          <LabeledSelect
            label={t('public.tournaments.filters.location', 'المدينة')}
            value={filters.location}
            options={locationOptions}
            onChange={(v) => onFilterChange('location', v)}
          />
          <LabeledSelect
            label={t('public.tournaments.filters.format', 'نظام البطولة')}
            value={filters.format}
            options={formatOptions}
            onChange={(v) => onFilterChange('format', v)}
          />
          {hasActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="mb-0.5 gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              <RotateCcw className="size-3.5" />
              {t('public.tournaments.filters.reset', 'مسح الفلاتر')}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition-colors hover:border-slate-300"
            aria-expanded={open}
          >
            <SlidersHorizontal className="size-4 text-slate-500" />
            <span>{t('public.tournaments.filters.title', 'تصفية النتائج')}</span>
            {activeCount > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-green-500 text-[10px] font-black text-white">
                {activeCount}
              </span>
            )}
          </button>
          {hasActive && (
            <button
              type="button"
              onClick={onReset}
              className="flex h-11 items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100"
              title={t('public.tournaments.filters.reset', 'مسح الفلاتر')}
            >
              <X className="size-4" />
              <span>{t('public.tournaments.filters.reset', 'مسح')}</span>
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="grid gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:grid-cols-2 lg:hidden">
          <LabeledSelect
            label={t('public.tournaments.filters.status', 'الحالة')}
            value={filters.status}
            options={statusOptions}
            onChange={(v) => onFilterChange('status', v)}
          />
          <LabeledSelect
            label={t('public.tournaments.filters.location', 'المدينة')}
            value={filters.location}
            options={locationOptions}
            onChange={(v) => onFilterChange('location', v)}
          />
          <LabeledSelect
            label={t('public.tournaments.filters.format', 'نظام البطولة')}
            value={filters.format}
            options={formatOptions}
            onChange={(v) => onFilterChange('format', v)}
          />
          {hasActive && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReset}
              className="justify-self-start gap-1.5 text-rose-600 hover:bg-rose-50 hover:text-rose-700 sm:justify-self-end sm:self-end"
            >
              <RotateCcw className="size-3.5" />
              {t('public.tournaments.filters.reset', 'مسح الفلاتر')}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
