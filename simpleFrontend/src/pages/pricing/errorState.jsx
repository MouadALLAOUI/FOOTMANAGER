import { useTranslation } from 'react-i18next'
import { RefreshCw } from 'lucide-react'

export default function PlansErrorState({ message, onRetry }) {
  const { t } = useTranslation()

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 rounded-[26px] bg-white p-10 text-center shadow-[0_8px_30px_rgba(17,24,39,0.08)] ring-1 ring-slate-100">
      <p className="text-sm font-semibold text-slate-600">{message || t('pricing.page.plansError')}</p>
      <button
        type="button"
        onClick={onRetry}
        className="inline-flex h-[48px] items-center justify-center gap-2 rounded-2xl bg-green-500 px-6 text-sm font-bold text-white transition-colors hover:bg-green-400"
      >
        <RefreshCw className="size-4" />
        {t('pricing.page.plansRetry')}
      </button>
    </div>
  )
}
