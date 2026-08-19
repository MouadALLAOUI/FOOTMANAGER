import { useTranslation } from 'react-i18next'
import { Field, Input, Select } from '../../../components/admin/ui'

export default function PricingEditor({ value, onChange }) {
  const { t } = useTranslation()
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <Field label={t('admin.plans.price')}>
        <Input
          type="number"
          min="0"
          step="0.01"
          value={value.price}
          onChange={(e) => onChange({ price: Math.max(0, Number(e.target.value)) })}
        />
      </Field>
      <Field label={t('admin.plans.currency')}>
        <Select value={value.currency} onChange={(e) => onChange({ currency: e.target.value })}>
          <option value="MAD">MAD</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </Select>
      </Field>
      <Field label={t('admin.plans.billingInterval')}>
        <Select value={value.billing_interval} onChange={(e) => onChange({ billing_interval: e.target.value })}>
          <option value="monthly">{t('admin.plans.monthly')}</option>
          <option value="yearly">{t('admin.plans.yearly')}</option>
        </Select>
      </Field>
      <div className="flex items-end pb-3">
        <label className="flex cursor-pointer items-center gap-2 text-sm font-bold text-slate-700">
          <input
            type="checkbox"
            checked={value.is_free}
            onChange={(e) => onChange({ is_free: e.target.checked, price: e.target.checked ? 0 : value.price })}
            className="size-4 accent-green-500"
          />
          {t('admin.plans.isFree')}
        </label>
      </div>
    </div>
  )
}
