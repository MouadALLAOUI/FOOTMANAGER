import { useTranslation } from 'react-i18next';
import { Pencil, Power, Trash2, ChevronUp, ChevronDown, Users, BadgePercent } from 'lucide-react';
import PlanStatusBadge from './PlanStatusBadge';

const TIER_COLORS = {
  bronze: { band: 'from-amber-400 to-amber-600', text: 'text-amber-700' },
  gold: { band: 'from-yellow-300 to-yellow-500', text: 'text-yellow-700' },
  platinum: { band: 'from-slate-300 to-slate-500', text: 'text-slate-700' },
};

export default function PlanCard({ plan, isFirst, isLast, onEdit, onToggleStatus, onDelete, onMove }) {
  const { t } = useTranslation();
  const colors = TIER_COLORS[plan.slug] || { band: 'from-emerald-400 to-emerald-600', text: 'text-emerald-700' };
  const price = Number(plan.price);
  const subscriberCount = plan.subscribers_count ?? 0;

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className={`h-1.5 bg-gradient-to-r ${colors.band}`} />
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`text-lg font-extrabold ${colors.text}`}>{plan.name}</h3>
              <PlanStatusBadge isActive={plan.is_active} />
              {plan.badge && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700">{plan.badge}</span>}
            </div>
            <div className="text-xs text-gray-400 mt-0.5 font-mono">/{plan.slug}</div>
          </div>
          <div className="text-end shrink-0">
            <div className="text-2xl font-black text-gray-800 leading-none">
              {price === 0 ? (
                t('admin.free')
              ) : (
                <>
                  {price}
                  <span className="text-sm font-semibold text-gray-400 ms-1">{plan.currency}</span>
                </>
              )}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {plan.billing_interval === 'yearly' ? t('admin.yearly') : t('admin.monthly')}
            </div>
          </div>
        </div>

        {plan.description && <p className="text-sm text-gray-500 line-clamp-2">{plan.description}</p>}

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <Users size={14} className="text-gray-400" />
            {t('admin.subscribersCount', { count: subscriberCount })}
          </span>
          {plan.discount?.is_active && (
            <span className="flex items-center gap-1.5 text-emerald-700">
              <BadgePercent size={14} className="text-emerald-500" />
              {plan.discount.type === 'percentage' ? `${plan.discount.value}%` : `${plan.discount.value} ${plan.currency}`}
              {' - '}
              {t('admin.discountLabel')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 pt-3 border-t border-gray-50">
          <button
            onClick={() => onEdit(plan)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
          >
            <Pencil size={14} />
            {t('admin.editPlan')}
          </button>
          <button
            onClick={() => onToggleStatus(plan)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition ${
              plan.is_active ? 'text-amber-600 hover:bg-amber-50' : 'text-emerald-600 hover:bg-emerald-50'
            }`}
          >
            <Power size={14} />
            {plan.is_active ? t('admin.deactivate') : t('admin.activate')}
          </button>
          <button
            onClick={() => onDelete(plan)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-red-600 hover:bg-red-50 transition"
          >
            <Trash2 size={14} />
            {t('actions.delete')}
          </button>
          <div className="flex items-center gap-1 ms-auto">
            <button
              disabled={isFirst}
              onClick={() => onMove(plan, -1)}
              title={t('admin.reorderUp')}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition disabled:opacity-30"
            >
              <ChevronUp size={16} />
            </button>
            <button
              disabled={isLast}
              onClick={() => onMove(plan, 1)}
              title={t('admin.reorderDown')}
              className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition disabled:opacity-30"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
