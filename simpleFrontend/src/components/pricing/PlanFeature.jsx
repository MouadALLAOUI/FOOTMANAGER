import { CheckCircle2, Minus } from 'lucide-react'
import PlanLimitMessage from './PlanLimitMessage'

export default function PlanFeature({ feature }) {
  const isLimit = feature.type === 'limit'

  if (!feature.enabled) {
    return (
      <li className="flex items-start gap-3 text-sm font-medium text-slate-400">
        <Minus className="mt-0.5 size-5 shrink-0 text-slate-300" />
        <span>{feature.name}</span>
      </li>
    )
  }

  return (
    <li className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
      <span className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-500" />
        <span>{feature.name}</span>
      </span>
      {isLimit ? <PlanLimitMessage feature={feature} /> : null}
    </li>
  )
}
