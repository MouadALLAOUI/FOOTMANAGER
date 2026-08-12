import { X } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export default function ToastCloseButton({ onClick }) {
  const { t } = useTranslation()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('common.close')}
      className="grid size-6 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:bg-slate-100 focus-visible:text-slate-700"
    >
      <X className="size-3.5" aria-hidden="true" />
    </button>
  )
}
