import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Search } from 'lucide-react'

function ItemIcon({ item, className }) {
  if (!item.icon) return null
  const Icon = item.icon
  return <Icon className={className} />
}

export default function CommandPalette({ open, onClose, groups = [], placeholder, hint, currentTo }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const listRef = useRef(null)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const flat = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out = []
    groups.forEach((g) => {
      if (g.hiddenOnEmpty && !q) return
      g.items.forEach((item) => {
        const label = t(item.label)
        const matches = !q || label.toLowerCase().includes(q) || (item.to || '').toLowerCase().includes(q)
        if (matches) out.push(item)
      })
    })
    return out
  }, [groups, query, t])

  useEffect(() => {
    setActive(0)
  }, [query, open, groups])

  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => inputRef.current?.focus(), 30)
    return () => window.clearTimeout(id)
  }, [open])

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector(`[data-flat="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const select = useCallback(
    (item) => {
      setQuery('')
      onClose()
      if (item.to) navigate(item.to)
      item.onClick?.()
    },
    [navigate, onClose],
  )

  const handleKey = useCallback(
    (e) => {
      if (!open) return
      if (e.key === 'Escape') {
        e.preventDefault()
        setQuery('')
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActive((a) => Math.min(a + 1, flat.length - 1))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActive((a) => Math.max(a - 1, 0))
      } else if (e.key === 'Enter') {
        const item = flat[active]
        if (item) {
          e.preventDefault()
          select(item)
        }
      }
    },
    [open, flat, active, onClose, select],
  )

  useEffect(() => {
    if (!open) return
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open, handleKey])

  if (!open) return null

  const q = query.trim().toLowerCase()
  let flatIndex = -1

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center p-4 pt-24">
      <div
        className="overlay-in absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={() => {
          setQuery('')
          onClose()
        }}
        aria-hidden="true"
      />
      <div
        ref={listRef}
        role="dialog"
        aria-modal="true"
        aria-label={placeholder}
        className="pop-in relative w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.2)] outline-none"
      >
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4">
          <Search className="size-4 text-slate-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-500"
          />
          <button
            type="button"
            onClick={() => {
              setQuery('')
              onClose()
            }}
            aria-label={t('common.close')}
            className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-500"
          >
            ESC
          </button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {flat.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-slate-500">{hint}</p>
          ) : (
            groups.map((g) => {
              if (g.hiddenOnEmpty && !q) return null
              const items = g.items.filter((item) => {
                if (!q) return true
                return t(item.label).toLowerCase().includes(q) || (item.to || '').toLowerCase().includes(q)
              })
              if (items.length === 0) return null
              return (
                <div key={g.key || g.label}>
                  {g.label && <p className="px-2 pb-1 pt-2 text-[11px] font-bold text-slate-400">{t(g.label)}</p>}
                  {items.map((item) => {
                    flatIndex += 1
                    const idx = flatIndex
                    const isActive = active === idx
                    return (
                      <button
                        key={item.to || item.label}
                        type="button"
                        data-flat={idx}
                        onMouseEnter={() => setActive(idx)}
                        onClick={() => select(item)}
                        className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-start transition-colors ${isActive ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                      >
                        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${isActive ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          <ItemIcon item={item} className="size-4" />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-bold text-slate-700">{t(item.label)}</span>
                        {currentTo && item.to === currentTo && (
                          <span className="shrink-0 text-[10px] font-bold text-green-600">{t('shell.currentPage')}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
