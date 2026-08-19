import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Search, ArrowUpDown, ArrowUp, ArrowDown, Inbox } from 'lucide-react'
import { cn, Button, EmptyState, Pagination, TableSkeleton } from './ui'

export default function DataTable({
  rows = [],
  loading = false,
  columns = [],
  rowKey = 'id',
  filterTabs,
  tabValue,
  onTabChange,
  search = '',
  onSearch,
  searchPlaceholder = '',
  sortKey,
  sortDir,
  onSort,
  page = 1,
  lastPage = 1,
  total = 0,
  perPage = 15,
  onPageChange,
  selectable = false,
  selected = [],
  onSelectedChange,
  bulkActions = [],
  onBulk,
  onRowClick,
  emptyTitle = '',
  emptyDescription = '',
  toolbar,
}) {
  const { t } = useTranslation()
  const [term, setTerm] = useState(search)

  useEffect(() => {
    const t = setTimeout(() => onSearch?.(term), 350)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term])

  const allSelected = rows.length > 0 && rows.every((r) => selected.includes(r[rowKey]))
  const someSelected = rows.some((r) => selected.includes(r[rowKey]))

  const toggleAll = () => {
    if (allSelected) {
      onSelectedChange?.(selected.filter((id) => !rows.some((r) => r[rowKey] === id)))
    } else {
      const ids = new Set(selected)
      rows.forEach((r) => ids.add(r[rowKey]))
      onSelectedChange?.([...ids])
    }
  }

  const toggleOne = (id) => {
    onSelectedChange?.(
      selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id],
    )
  }

  const headerCell = (col) => {
    if (!col.sortable) return col.label
    const active = sortKey === col.key
    return (
      <button
        type="button"
        onClick={() => onSort?.(col.key)}
        className="inline-flex items-center gap-1.5 text-slate-700 transition-colors hover:text-slate-900"
      >
        {col.label}
        {active ? (
          sortDir === 'asc' ? (
            <ArrowUp className="size-3.5 text-green-600" />
          ) : (
            <ArrowDown className="size-3.5 text-green-600" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 text-slate-300" />
        )}
      </button>
    )
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_12px_32px_-16px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/60">
      <div className="space-y-4 border-b border-slate-100 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {filterTabs && onTabChange ? (
            <div className="flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1">
              {filterTabs.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => onTabChange(t.value)}
                  className={cn(
                    'flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-bold transition-all duration-200',
                    tabValue === t.value
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800',
                  )}
                >
                  {t.label}
                  {typeof t.count === 'number' && (
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-black',
                        tabValue === t.value ? 'bg-green-500/15 text-green-700' : 'bg-slate-200/70 text-slate-500',
                      )}
                    >
                      {t.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div />
          )}
          <div className="flex flex-wrap items-center gap-2">
            {toolbar}
            {onSearch && (
              <div className="relative">
                <Search className="absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder={searchPlaceholder || t('admin.table.search')}
                  aria-label={searchPlaceholder || t('admin.table.search')}
                  className="h-10 w-full rounded-2xl border border-slate-200 bg-slate-50/60 ps-10 pe-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500/60 focus:bg-white focus:ring-4 focus:ring-green-500/10 sm:w-64"
                />
              </div>
            )}
          </div>
        </div>

        {selectable && selected.length > 0 && (
          <div className="fade-in flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-900 px-4 py-3">
            <p className="text-xs font-bold text-white">
              {t('admin.table.selectedCount', { count: selected.length })}
            </p>
            <div className="flex flex-wrap gap-2">
              {bulkActions.map((a) => (
                <Button
                  key={a.action}
                  size="sm"
                  variant={a.tone || 'primary'}
                  onClick={() => onBulk?.(a.action)}
                >
                  {a.label}
                </Button>
              ))}
              <Button size="sm" variant="ghost" className="!text-slate-300 hover:!bg-white/10" onClick={() => onSelectedChange?.([])}>
                {t('admin.table.clearSelection')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-5">
          <TableSkeleton rows={6} columns={columns.length} />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title={emptyTitle || t('admin.table.empty')}
          description={emptyDescription || t('admin.table.emptyDesc')}
          icon={Inbox}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-start">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60">
                {selectable && (
                  <th className="w-12 px-5 py-3.5">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected && !allSelected
                      }}
                      onChange={toggleAll}
                      className="size-4 rounded border-slate-300 accent-green-500"
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th key={col.key} className={cn('px-5 py-3.5 text-start text-[11px] font-black uppercase tracking-wider text-slate-500', col.className)}>
                    {headerCell(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const id = row[rowKey]
                const isSelected = selected.includes(id)
                return (
                  <tr
                    key={id}
                    onClick={() => onRowClick?.(row)}
                    onKeyDown={(e) => {
                      if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault()
                        onRowClick(row)
                      }
                    }}
                    tabIndex={onRowClick ? 0 : undefined}
                    className={cn(
                      'border-b border-slate-50 transition-colors last:border-0',
                      onRowClick ? 'cursor-pointer hover:bg-green-50/40' : '',
                      isSelected && 'bg-green-50/60',
                    )}
                    style={{ animationDelay: `${i * 20}ms` }}
                  >
                    {selectable && (
                      <td className="px-5 py-3.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(id)}
                          className="size-4 rounded border-slate-300 accent-green-500"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={cn('px-5 py-3.5 text-sm text-slate-700', col.className)}>
                        {col.render ? col.render(row) : row[col.key] ?? '—'}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {!loading && rows.length > 0 && onPageChange && (
        <Pagination page={page} lastPage={lastPage} total={total} perPage={perPage} onChange={onPageChange} />
      )}
    </div>
  )
}
