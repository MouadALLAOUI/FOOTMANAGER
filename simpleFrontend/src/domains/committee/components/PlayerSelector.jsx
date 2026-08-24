import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import api from '../../../api/client'
import { inputClass } from '../../../components/dashboard/ui'

export default function PlayerSelector({ teamId, value, valueName, onSelect, onClear, label, placeholder, t, autoFocus, suspendedIds = [] }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [dupPanel, setDupPanel] = useState(null)
  const [error, setError] = useState(null)
  const ref = useRef(null)

  const selected = list.find((p) => p.id === value) || null

  useEffect(() => {
    let cancelled = false
    if (!open) return
    setLoading(true)
    setDupPanel(null)
    api.get(`/committee/teams/${teamId}/players`, { params: { search: query.trim() } })
      .then((r) => { if (!cancelled) setList(r.data?.data || []) })
      .catch(() => { if (!cancelled) setError(t('committee.result.rosterLoadFailed')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [open, query, teamId, t])

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const pick = (p) => {
    if (suspendedIds.includes(p.id)) return
    onSelect(p)
    setOpen(false)
    setQuery('')
    setDupPanel(null)
  }

  const addNew = async (force = false) => {
    const name = query.trim()
    if (!name) return
    setCreating(true)
    setError(null)
    try {
      const r = await api.post(`/committee/teams/${teamId}/players`, { name, force })
      const data = r.data
      if (data.created) {
        pick(data.data)
      } else if (data.duplicates?.length) {
        setDupPanel(data.duplicates)
      }
    } catch (e) {
      setError(e.response?.data?.message || t('committee.result.playerAddFailed'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <span className="mb-1.5 flex items-center justify-between text-xs font-bold text-slate-700">
        <span>{label}</span>
        {value && onClear && (
          <button type="button" onClick={onClear} className="text-[10px] font-bold text-slate-400 transition-colors hover:text-rose-500">
            {t('committee.result.clear')}
          </button>
        )}
      </span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${inputClass} flex w-full items-center justify-between text-start`}
      >
        <span className={`truncate ${selected ? 'text-slate-800' : valueName ? 'text-slate-800' : 'text-slate-400'}`}>
          {selected ? `${selected.name}${selected.number ? ` (${selected.number})` : ''}` : valueName || placeholder}
        </span>
        <ChevronDown className="size-4 shrink-0 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-100 p-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('committee.result.searchPlayer')}
              aria-label={t('committee.result.searchPlayer')}
              autoFocus={autoFocus}
              className={`${inputClass} h-9`}
            />
          </div>
          <div className="max-h-52 overflow-y-auto p-1">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <span className="size-5 animate-spin rounded-full border-2 border-slate-200 border-t-green-500" />
              </div>
            ) : dupPanel ? (
              <div className="space-y-1">
                <p className="px-3 pt-2 text-[11px] font-bold text-slate-500">{t('committee.result.duplicateFound')}</p>
                {dupPanel.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pick(p)}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start hover:bg-slate-50"
                  >
                    <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">{p.name}</span>
                    {p.number && <span className="shrink-0 text-[10px] font-black text-slate-400">#{p.number}</span>}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => addNew(true)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start hover:bg-amber-50"
                >
                  <Plus className="size-3.5 text-amber-500" />
                  <span className="text-xs font-bold text-amber-700">{t('committee.result.addAnyway')}</span>
                </button>
              </div>
            ) : list.length === 0 && !query.trim() ? (
              <p className="px-3 py-2 text-xs font-semibold text-slate-400">{t('committee.result.noPlayers')}</p>
            ) : (
              <>
                {list.map((p) => {
                  const suspended = suspendedIds.includes(p.id)
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => pick(p)}
                      disabled={suspended}
                      className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-start hover:bg-slate-50 ${p.id === value ? 'bg-green-50' : ''} ${suspended ? 'cursor-not-allowed opacity-60' : ''}`}
                    >
                      <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">{p.name}</span>
                      {suspended && (
                        <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-black text-rose-600">
                          {t('committee.result.suspendedBadge')}
                        </span>
                      )}
                      {p.number && <span className="shrink-0 text-[10px] font-black text-slate-400">#{p.number}</span>}
                      {p.position && <span className="shrink-0 text-[10px] font-semibold text-slate-400">{p.position}</span>}
                    </button>
                  )
                })}
                {query.trim() && (
                  <button
                    type="button"
                    onClick={() => addNew(false)}
                    disabled={creating}
                    className="flex w-full items-center gap-2 rounded-lg border-t border-slate-100 px-3 py-2 text-start hover:bg-emerald-50"
                  >
                    <Plus className="size-3.5 text-emerald-500" />
                    <span className="truncate text-xs font-bold text-emerald-700">{t('committee.result.createPlayer', { name: query })}</span>
                  </button>
                )}
              </>
            )}
          </div>
          {error && <p className="border-t border-slate-100 px-3 py-2 text-[11px] font-bold text-rose-500">{error}</p>}
        </div>
      )}
    </div>
  )
}
