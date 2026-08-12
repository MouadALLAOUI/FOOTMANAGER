import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'

const inputBase =
  'h-[58px] w-full rounded-2xl border border-slate-200 bg-slate-50 text-[15px] font-semibold text-slate-900 outline-none transition-all duration-300 placeholder:text-transparent hover:border-slate-300 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/15'

const labelBase =
  'pointer-events-none absolute start-[48px] top-[9px] text-[11px] font-bold text-green-600 transition-all duration-300 ease-out peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[15px] peer-placeholder-shown:font-semibold peer-placeholder-shown:text-slate-400 peer-focus:top-[9px] peer-focus:-translate-y-0 peer-focus:text-[11px] peer-focus:font-bold peer-focus:text-green-600'

export default function PremiumField({
  id,
  label,
  icon,
  type = 'text',
  select = false,
  children,
  value,
  onChange,
  placeholder,
  required,
  autoComplete,
  min,
  max,
  endAdornment,
}) {
  const iconNode = icon ? (
    <span className="pointer-events-none absolute start-4 top-1/2 grid size-5 -translate-y-1/2 place-items-center text-slate-400 transition-colors duration-300 peer-focus:text-green-500">
      {icon}
    </span>
  ) : null

  if (select) {
    return (
      <div>
        <label htmlFor={id} className="mb-1.5 block text-xs font-bold text-slate-500">
          {label}
        </label>
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-slate-400">
              {icon}
            </span>
          )}
          <select
            id={id}
            value={value}
            onChange={onChange}
            required={required}
            className={`${inputBase} appearance-none bg-white pe-11 ${icon ? 'ps-12' : 'ps-4'}`}
          >
            {children}
          </select>
          <FontAwesomeIcon
            icon={faChevronDown}
            className="pointer-events-none absolute end-4 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
          />
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        min={min}
        max={max}
        autoComplete={autoComplete}
        className={`${inputBase} peer ps-12 pt-[18px] pb-[6px] ${endAdornment ? 'pe-12' : 'pe-4'}`}
      />
      {iconNode}
      <label htmlFor={id} className={labelBase}>
        {label}
      </label>
      {endAdornment}
    </div>
  )
}
