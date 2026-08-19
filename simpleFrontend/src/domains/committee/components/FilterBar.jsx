import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SlidersHorizontal, Search } from 'lucide-react'
import { inputClass, selectClass, Button } from '../../../components/dashboard/ui'

export default function FilterBar({ filters, setFilters, queryInput, setQueryInput, groups, stadiums, isGroup }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }))
  const activeCount =
    Object.entries({ status: filters.status, group: filters.group, stadium: filters.stadium, date: filters.date }).filter(
      ([, v]) => v !== 'all',
    ).length + (filters.q.trim() ? 1 : 0)
  const clear = () => {
    setFilters({ status: 'all', group: 'all', stadium: 'all', date: 'all', customDate: '', q: '' })
    setQueryInput('')
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-2 rounded-2xl border border-slate-200/70 bg-white px-4 text-xs font-bold text-slate-600 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-colors hover:bg-slate-50"
      >
        <SlidersHorizontal className="size-4 text-slate-400" />
        {t('committee.detail.filters')}
        {activeCount > 0 && (
          <span className="grid min-w-5 place-items-center rounded-full bg-green-500 px-1.5 py-0.5 text-[10px] font-black text-white">
            {activeCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onMouseDown={() => setOpen(false)} />
          <div className="absolute start-0 top-full z-40 mt-2 w-[min(90vw,22rem)] space-y-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_8px_30px_rgba(15,23,42,0.12)]">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black text-slate-800">{t('committee.detail.filters')}</p>
              {activeCount > 0 && (
                <button type="button" onClick={clear} className="text-[11px] font-bold text-slate-400 transition-colors hover:text-rose-500">
                  {t('committee.detail.clearFilters')}
                </button>
              )}
            </div>

            <select className={`${selectClass} text-xs`} value={filters.status} onChange={set('status')}>
              <option value="all">{t('committee.detail.all')}</option>
              <option value="pending">{t('committee.detail.status.pending')}</option>
              <option value="upcoming">{t('committee.detail.status.upcoming')}</option>
              <option value="live">{t('committee.detail.status.live')}</option>
              <option value="completed">{t('committee.detail.status.completed')}</option>
              <option value="postponed">{t('committee.detail.status.postponed')}</option>
              <option value="cancelled">{t('committee.detail.status.cancelled')}</option>
            </select>

            {isGroup && (
              <select className={`${selectClass} text-xs`} value={filters.group} onChange={set('group')}>
                <option value="all">{t('committee.detail.allGroups')}</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{t('committee.detail.groupName')} {g.name}</option>
                ))}
              </select>
            )}

            <select className={`${selectClass} text-xs`} value={filters.stadium} onChange={set('stadium')}>
              <option value="all">{t('committee.detail.allStadiums')}</option>
              {stadiums.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <select className={`${selectClass} text-xs`} value={filters.date} onChange={set('date')}>
              <option value="all">{t('committee.detail.allDates')}</option>
              <option value="today">{t('committee.detail.dateToday')}</option>
              <option value="tomorrow">{t('committee.detail.dateTomorrow')}</option>
              <option value="week">{t('committee.detail.dateWeek')}</option>
              <option value="custom">{t('committee.detail.dateCustom')}</option>
            </select>

            {filters.date === 'custom' && (
              <input type="date" className={`${inputClass} text-xs`} value={filters.customDate} onChange={set('customDate')} />
            )}

            <div className="relative">
              <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                className={`${inputClass} pe-3 ps-9 text-xs`}
                placeholder={t('committee.detail.filterSearch')}
                aria-label={t('committee.detail.filterSearch')}
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
