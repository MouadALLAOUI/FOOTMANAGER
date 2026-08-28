import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

export default function GoToSite({ className = '', variant = 'light', children }) {
  const { t } = useTranslation()

  return (
    <Link
      to="/"
      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all duration-200 ${
        variant === 'dark'
          ? 'border border-white/20 text-white/80 hover:border-white/40 hover:bg-white/10 hover:text-white'
          : 'border border-slate-200 bg-white text-slate-600 shadow-sm hover:border-green-300 hover:bg-green-50/60 hover:text-green-700'
      } ${className}`}
    >
      <Globe className="size-4" strokeWidth={2.2} />
      {children || t('shell.backToHomepage')}
    </Link>
  )
}
