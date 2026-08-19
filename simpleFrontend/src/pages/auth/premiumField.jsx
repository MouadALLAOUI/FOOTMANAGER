import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown } from '@fortawesome/free-solid-svg-icons'
import FieldError from '../../components/ui/FieldError'

const inputBase =
  'h-[58px] w-full rounded-2xl border text-[15px] font-semibold text-slate-900 outline-none transition-all duration-300 placeholder:text-transparent focus:bg-white focus:ring-4'

const inputState = (error) =>
  error
    ? 'border-red-300 bg-red-50/60 hover:border-red-400 focus:border-red-500 focus:ring-red-500/15'
    : 'border-slate-200 bg-slate-50 hover:border-slate-300 focus:border-green-500 focus:ring-green-500/15'

const labelBase =
  'pointer-events-none absolute start-[48px] top-[9px] text-[11px] font-bold transition-all duration-300 ease-out peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-[15px] peer-placeholder-shown:font-semibold peer-placeholder-shown:text-slate-400 peer-focus:top-[9px] peer-focus:-translate-y-0 peer-focus:text-[11px] peer-focus:font-bold'

const labelState = (error) =>
  error
    ? 'text-red-600 peer-placeholder-shown:text-red-500 peer-focus:text-red-600'
    : 'text-green-600 peer-focus:text-green-600'

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
  error,
}) {
  const iconNode = icon ? (
    <span className="pointer-events-none absolute start-4 top-1/2 grid size-5 -translate-y-1/2 place-items-center text-slate-400 transition-colors duration-300 peer-focus:text-green-500">
      {icon}
    </span>
  ) : null

  const inputClasses = `${inputBase} peer ps-12 pt-[18px] pb-[6px] ${endAdornment ? 'pe-12' : 'pe-4'} ${inputState(error)}`

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
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={`${inputBase} ${inputState(error)} appearance-none bg-white pe-11 ${icon ? 'ps-12' : 'ps-4'}`}
          >
            {children}
          </select>
          <FontAwesomeIcon
            icon={faChevronDown}
            className="pointer-events-none absolute end-4 top-1/2 size-3.5 -translate-y-1/2 text-slate-400"
          />
        </div>
        <FieldError id={`${id}-error`}>{error}</FieldError>
      </div>
    )
  }

  return (
    <div>
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
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={inputClasses}
        />
        {iconNode}
        <label htmlFor={id} className={`${labelBase} ${labelState(error)}`}>
          {label}
        </label>
        {endAdornment}
      </div>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </div>
  )
}
