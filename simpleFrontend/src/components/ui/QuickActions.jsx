import { useTranslation } from 'react-i18next'
import { ChevronDown, Plus } from 'lucide-react'

function ActionIcon({ action, className }) {
  if (!action.icon) return null
  const Icon = action.icon
  return <Icon className={className} />
}

export default function QuickActions({ open, onToggle, onClose, onSelect, actions = [], label, triggerClassName = '' }) {
  const { t } = useTranslation()

  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-haspopup="menu"
        className={`inline-flex items-center gap-2 ${triggerClassName}`}
      >
        <Plus className="size-4" />
        {t(label)}
        <ChevronDown className={`size-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />
          <div role="menu" className="fade-in absolute end-0 top-12 z-50 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 shadow-[0_16px_40px_rgba(15,23,42,0.16)]">
            {actions.map((a) => (
              <button
                key={a.to || a.key || a.label}
                type="button"
                role="menuitem"
                onClick={() => onSelect(a)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-slate-50 text-slate-500">
                  <ActionIcon action={a} className="size-4" />
                </span>
                {t(a.label)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
