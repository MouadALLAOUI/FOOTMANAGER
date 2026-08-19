import { useTranslation } from 'react-i18next'
import { Pencil, Power, Trash2, ChevronUp, ChevronDown, Users, BadgePercent } from 'lucide-react'
import { Badge, Button } from '../../../components/admin/ui'

const TIER_BANDS = {
  bronze: 'from-amber-400 to-amber-600',
  gold: 'from-yellow-300 to-yellow-500',
  platinum: 'from-slate-300 to-slate-500',
}

export default function PlanCard({ plan, isFirst, isLast, onEdit, onToggleStatus, onDelete, onMove, deleting }) {
  const { t } = useTranslation()
  const band = TIER_BANDS[plan.slug] || 'from-green-400 to-emerald-600'
  const price = Number(plan.price)
  const subscribers = plan.subscribers_count ?? 0

  return (
    <div className="fade-in flex flex-col overflow-hidden rounded-3xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_12px_32px_-16px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/60 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
      <div className={`h-1.5 shrink-0 bg-gradient-to-r ${band}`} />
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-black tracking-tight text-slate-900">{plan.name}</h3>
              <Badge tone={plan.is_active ? 'green' : 'slate'}>
                {plan.is_active ? t('admin.plans.active') : t('admin.plans.inactive')}
              </Badge>
              {plan.badge && <Badge tone="blue">{plan.badge}</Badge>}
            </div>
            <div className="mt-0.5 font-mono text-[11px] text-slate-400">/{plan.slug}</div>
          </div>
          <div className="shrink-0 text-end">
            <div className="text-2xl font-black leading-none text-slate-900">
              {plan.is_free || price === 0 ? (
                t('admin.plans.free')
              ) : (
                <>
                  {price}
                  <span className="ms-1 text-sm font-bold text-slate-400">{plan.currency}</span>
                </>
              )}
            </div>
            <div className="mt-1 text-[11px] font-semibold text-slate-400">
              {plan.billing_interval === 'yearly' ? t('admin.plans.yearly') : t('admin.plans.monthly')}
            </div>
          </div>
        </div>

        {plan.description && <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-500">{plan.description}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] font-semibold text-slate-500">
          <span className="flex items-center gap-1.5">
            <Users className="size-3.5 text-slate-400" />
            {t('admin.plans.subscribers', { count: subscribers })}
          </span>
          {plan.discount?.is_active && (
            <span className="flex items-center gap-1.5 text-emerald-700">
              <BadgePercent className="size-3.5 text-emerald-500" />
              {plan.discount.type === 'percentage' ? `${plan.discount.value}%` : `${plan.discount.value} ${plan.currency}`}
              {' · '}
              {t('admin.plans.discountLabel')}
            </span>
          )}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          <Button variant="outline" size="sm" onClick={() => onEdit(plan)}>
            <Pencil className="size-3.5" />
            {t('admin.plans.editBtn')}
          </Button>
          <Button
            variant={plan.is_active ? 'softAmber' : 'soft'}
            size="sm"
            onClick={() => onToggleStatus(plan)}
          >
            <Power className="size-3.5" />
            {plan.is_active ? t('admin.plans.deactivate') : t('admin.plans.activate')}
          </Button>
          <Button variant="softRed" size="sm" loading={deleting} onClick={() => onDelete(plan)}>
            <Trash2 className="size-3.5" />
            {t('admin.plans.delete')}
          </Button>
          <div className="ms-auto flex items-center gap-1">
            <button
              type="button"
              disabled={isFirst}
              onClick={() => onMove(plan, -1)}
              title={t('admin.plans.moveUp')}
              className="grid size-8 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronUp className="size-4" />
            </button>
            <button
              type="button"
              disabled={isLast}
              onClick={() => onMove(plan, 1)}
              title={t('admin.plans.moveDown')}
              className="grid size-8 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-30"
            >
              <ChevronDown className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
