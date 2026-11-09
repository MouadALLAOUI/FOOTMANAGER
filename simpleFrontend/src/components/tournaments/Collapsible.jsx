import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export default function Collapsible({
  icon: Icon,
  title,
  subtitle,
  trailing,
  defaultOpen = true,
  tone = 'bg-[#B8F000]/20 dark:bg-[#D0FF38]/15 text-[#179955] dark:text-[#D0FF38]',
  bodyClassName = 'p-4 sm:p-5',
  className = '',
  children,
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div
      className={`overflow-hidden rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] shadow-2xs ${className}`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 px-4 py-3.5 sm:px-5 sm:py-4 text-start transition-colors hover:bg-[#F7F8F5]/70 dark:hover:bg-[#252B27]/60 cursor-pointer"
      >
        <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${tone}`}>
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm sm:text-base font-black text-[#111313] dark:text-[#F5F7F2]">{title}</h4>
          {subtitle && <p className="text-[11px] font-semibold text-[#65706A] dark:text-[#B2B9B3]">{subtitle}</p>}
        </div>
        {trailing}
        <ChevronDown
          className={`size-4.5 shrink-0 text-[#65706A] dark:text-[#B2B9B3] transition-transform duration-300 ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className={`border-t border-[#E1E5DF]/80 dark:border-[#303832]/80 ${bodyClassName}`}>
          {children}
        </div>
      )}
    </div>
  )
}
