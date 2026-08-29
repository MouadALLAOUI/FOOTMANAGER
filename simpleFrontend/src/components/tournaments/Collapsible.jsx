import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function Collapsible({
  icon: Icon,
  title,
  subtitle,
  trailing,
  defaultOpen = true,
  tone = 'bg-green-50 text-green-600',
  bodyClassName = 'p-5',
  className = '',
  children,
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={`overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-start transition-colors hover:bg-slate-50/60"
      >
        <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${tone}`}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-black text-slate-900">{title}</h4>
          {subtitle && <p className="text-[11px] font-semibold text-slate-400">{subtitle}</p>}
        </div>
        {trailing}
        <ChevronDown className={`size-5 shrink-0 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className={`border-t border-slate-100 ${bodyClassName}`}>{children}</div>}
    </div>
  )
}