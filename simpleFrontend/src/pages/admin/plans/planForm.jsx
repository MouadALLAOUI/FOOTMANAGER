import { useTranslation } from 'react-i18next'
import { Field, Input } from '../../../components/admin/ui'
import PricingEditor from './pricingEditor'
import DiscountEditor from './discountEditor'
import FeatureEditor from './featureEditor'

function SectionTitle({ children }) {
  return (
    <div className="flex items-center gap-3 pt-5 first:pt-0">
      <span className="h-1.5 w-6 rounded-full bg-green-500" />
      <h4 className="text-xs font-black uppercase tracking-wider text-slate-500">{children}</h4>
      <span className="h-px flex-1 bg-slate-100" />
    </div>
  )
}

export default function PlanForm({ form, onChange, onFeatureChange }) {
  const { t } = useTranslation()

  return (
    <div className="space-y-5">
      <SectionTitle>{t('admin.plans.general')}</SectionTitle>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('admin.plans.name')} required>
          <Input
            value={form.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder={t('admin.plans.namePh')}
          />
        </Field>
        <Field label={t('admin.plans.slug')} required>
          <Input
            value={form.slug}
            onChange={(e) => onChange({ slug: e.target.value })}
            placeholder={t('admin.plans.slugPh')}
            className="font-mono"
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label={t('admin.plans.description')}>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder={t('admin.plans.descriptionPh')}
              className="h-auto w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
            />
          </Field>
        </div>
        <Field label={t('admin.plans.badge')}>
          <Input
            value={form.badge}
            onChange={(e) => onChange({ badge: e.target.value })}
            placeholder={t('admin.plans.badgePh')}
          />
        </Field>
        <Field label={t('admin.plans.displayOrder')}>
          <Input
            type="number"
            min="0"
            value={form.display_order}
            onChange={(e) => onChange({ display_order: Math.max(0, Number(e.target.value)) })}
          />
        </Field>
        <div className="flex items-end pb-3 sm:col-span-2">
          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => onChange({ is_active: e.target.checked })}
              className="size-4 accent-green-500"
            />
            {t('admin.plans.isActive')}
          </label>
        </div>
      </div>

      <SectionTitle>{t('admin.plans.pricing')}</SectionTitle>
      <PricingEditor value={form} onChange={onChange} />

      <SectionTitle>{t('admin.plans.discount')}</SectionTitle>
      <DiscountEditor
        value={form.discount}
        onChange={(patch) => onChange({ discount: { ...form.discount, ...patch } })}
      />

      <SectionTitle>{t('admin.plans.features')}</SectionTitle>
      <FeatureEditor features={form.features} onChange={onFeatureChange} />
    </div>
  )
}
