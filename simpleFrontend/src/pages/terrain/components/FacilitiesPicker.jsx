import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, RefreshCw, Search } from 'lucide-react'

export default function FacilitiesPicker({ facilities, selected, onChange, loading, error, onRetry }) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const list = useMemo(
    () => (facilities || []).filter((f) => (f.name || '').includes(query)),
    [facilities, query],
  )

  const toggle = (id) => {
    if (selected.includes(id)) onChange(selected.filter((x) => x !== id))
    else onChange([...selected, id])
  }

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-2" aria-busy="true" aria-label="جارٍ تحميل المرافق…">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex h-11 animate-pulse items-center gap-2 rounded-xl border border-slate-100 bg-slate-50 px-3">
            <span className="size-5 shrink-0 rounded-full bg-slate-200" />
            <span className="h-2.5 w-20 rounded-full bg-slate-200" />
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-center">
        <p className="text-sm font-bold text-rose-600">{t('errors.loadFailed')}</p>
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-rose-700"
        >
          <RefreshCw className="size-3.5" />
          {t('common.retry')}
        </button>
      </div>
    )
  }

  if (!facilities?.length) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 py-6 text-center text-xs text-slate-400">
        {t('terrain.empty.noFacilities')}
      </p>
    )
  }

  return (
    <div>
      <div className="relative mb-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن مرافق…"
          aria-label="ابحث عن مرافق"
          className="h-11 w-full rounded-xl border border-slate-200 bg-white ps-11 pe-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
        />
        <Search className="absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {list.map((f) => {
          const on = selected.includes(f.id)
          return (
            <button
              key={f.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => toggle(f.id)}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-start transition-all ${
                on
                  ? 'border-green-200 bg-green-50 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              <span className="text-base">{f.icon || '🏟️'}</span>
              <span className="min-w-0 flex-1 truncate text-xs font-bold">{f.name}</span>
              <span
                aria-hidden="true"
                className={`grid size-5 shrink-0 place-items-center rounded-full transition-colors ${
                  on ? 'bg-green-500 text-white' : 'border border-slate-200 text-transparent'
                }`}
              >
                <Check className="size-3" strokeWidth={3} />
              </span>
            </button>
          )
        })}
        {list.length === 0 && <p className="col-span-2 py-6 text-center text-xs text-slate-400">{t('terrain.empty.noMatchingFacilities')}</p>}
      </div>
    </div>
  )
}
