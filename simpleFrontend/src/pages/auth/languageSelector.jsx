import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faGlobe, faChevronDown, faCheck } from '@fortawesome/free-solid-svg-icons'

const options = [
  { code: 'ar', label: 'العربية' },
  { code: 'en', label: 'English' },
]

export default function LanguageSelector() {
  const { i18n } = useTranslation()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const current = i18n.language.startsWith('ar') ? options[0] : options[1]

  return (
    <div ref={ref} className="relative z-20 self-end">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-green-400 hover:text-slate-900 hover:shadow-[0_10px_24px_rgba(34,197,94,0.15)] active:translate-y-0"
      >
        <FontAwesomeIcon icon={faGlobe} className="size-4 text-green-600" />
        {current.label}
        <FontAwesomeIcon
          icon={faChevronDown}
          className={`size-3 text-slate-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="fade-in absolute end-0 top-full mt-2 w-44 overflow-hidden rounded-2xl border border-slate-100 bg-white p-1.5 shadow-[0_20px_50px_rgba(15,23,42,0.15)]">
          {options.map((o) => {
            const active = i18n.language.startsWith(o.code)
            return (
              <button
                key={o.code}
                type="button"
                onClick={() => {
                  i18n.changeLanguage(o.code)
                  setOpen(false)
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-bold transition-colors ${
                  active ? 'bg-green-50 text-green-700' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {o.label}
                {active && <FontAwesomeIcon icon={faCheck} className="size-3.5 text-green-600" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
