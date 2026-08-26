import { cn } from './ui'

const planTones = {
  platinum: 'bg-violet-50 text-violet-700 ring-violet-200',
  gold: 'bg-amber-50 text-amber-700 ring-amber-200',
  silver: 'bg-sky-50 text-sky-700 ring-sky-200',
  bronze: 'bg-orange-50 text-orange-700 ring-orange-200',
  free: 'bg-slate-100 text-slate-600 ring-slate-200',
}

const fallbackOrder = ['free', 'bronze', 'silver', 'gold', 'platinum']

function resolveTone(slug, name) {
  const key = slug?.toLowerCase() || name?.toLowerCase() || ''
  if (planTones[key]) return planTones[key]
  for (const tier of fallbackOrder) {
    if (key.includes(tier)) return planTones[tier]
  }
  return 'bg-slate-100 text-slate-600 ring-slate-200'
}

export default function PlanBadge({ plan, className = '' }) {
  if (!plan) {
    return (
      <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 bg-slate-100 text-slate-500 ring-slate-200', className)}>
        —
      </span>
    )
  }

  const tone = resolveTone(plan.slug, plan.name)

  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1', tone, className)}>
      {plan.name}
    </span>
  )
}
