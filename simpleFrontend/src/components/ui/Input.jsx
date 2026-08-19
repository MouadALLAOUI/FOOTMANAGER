import React from 'react'

export default function Input({ id, className = '', error, ...props }) {
  const inputClass = `w-full rounded-md border px-3 py-2 text-sm outline-none transition focus:ring-2 ${error ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-green-200'} ${className}`

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
      <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-semibold text-red-600">
        {error}
      </p>
    </div>
  )
}
