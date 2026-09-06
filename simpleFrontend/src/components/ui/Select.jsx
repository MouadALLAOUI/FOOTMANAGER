import { forwardRef } from 'react'
import { ChevronDown, Loader2 } from 'lucide-react'

function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}

const bareClass =
  'w-full appearance-none bg-transparent py-0.5 pe-5 text-sm font-bold text-slate-800 outline-none cursor-pointer'

const defaultClass =
  'h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pe-9 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10 disabled:cursor-not-allowed disabled:opacity-50'

const Select = forwardRef(function Select(
  { options = [], value, onChange, placeholder, disabled, loading, bare, className, ...props },
  ref,
) {
  return (
    <span className={bare ? 'relative inline-flex w-full' : 'relative block w-full'}>
      <select
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || loading}
        className={cn(bare ? bareClass : defaultClass, (disabled || loading) && !bare && 'pe-9', className)}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 flex items-center pe-3">
        {loading ? (
          <Loader2 className="size-4 animate-spin text-slate-400" />
        ) : (
          <ChevronDown className={bare ? 'size-4 text-slate-400' : 'size-4 text-slate-400'} />
        )}
      </span>
    </span>
  )
})

export default Select
