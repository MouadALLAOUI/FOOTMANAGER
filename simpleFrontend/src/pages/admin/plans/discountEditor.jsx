import { useTranslation } from 'react-i18next'
import { Field, Input, Select } from '../../../components/admin/ui'

export default function DiscountEditor({ value, onChange }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700">
        <input
          type="checkbox"
          checked={value.is_active}
          onChange={(e) => onChange({ is_active: e.target.checked })}
          className="size-4 accent-green-500"
        />
        {t('admin.plans.discountActive')}
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label={t('admin.plans.discountType')}>
          <Select value={value.type} onChange={(e) => onChange({ type: e.target.value })}>
            <option value="percentage">{t('admin.plans.percentage')}</option>
            <option value="fixed">{t('admin.plans.fixed')}</option>
          </Select>
        </Field>
        <Field label={t('admin.plans.discountValue')}>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={value.value}
            onChange={(e) => onChange({ value: Math.max(0, Number(e.target.value)) })}
          />
        </Field>
        <Field label={t('admin.plans.startsAt')}>
          <Input
            type="date"
            value={value.starts_at || ''}
            onChange={(e) => onChange({ starts_at: e.target.value || null })}
          />
        </Field>
        <Field label={t('admin.plans.endsAt')}>
          <Input
            type="date"
            value={value.ends_at || ''}
            onChange={(e) => onChange({ ends_at: e.target.value || null })}
          />
        </Field>
      </div>
    </div>
  )
}
