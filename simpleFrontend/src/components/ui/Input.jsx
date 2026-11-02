import React from 'react'

export default function Input({ id, className = '', error, ...props }) {
  const inputClass = `w-full rounded-lg border px-3.5 py-2.5 text-sm outline-none transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
    error
      ? 'border-[#D93636] dark:border-[#FF6868] focus:ring-2 focus:ring-[#D93636]/20 bg-rose-50/20 dark:bg-rose-950/10'
      : 'border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] text-[#111313] dark:text-[#F5F7F2] placeholder-[#65706A] dark:placeholder-[#B2B9B3]/60 focus:border-[#B8F000] dark:focus:border-[#D0FF38] focus:ring-2 focus:ring-[#B8F000]/25'
  } ${className}`

  const inputProps = {
    ...props,
    className: inputClass,
    'aria-invalid': error ? 'true' : undefined,
    'aria-describedby': error && id ? `${id}-error` : undefined,
  }

  if (!error) {
    return <input id={id} {...inputProps} />
  }

  return (
    <div>
      <input id={id} {...inputProps} />
      <p id={`${id}-error`} role="alert" className="mt-1 text-xs font-semibold text-[#D93636] dark:text-[#FF6868]">
        {error}
      </p>
    </div>
  )
}
