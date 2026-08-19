import { useTranslation } from 'react-i18next';

export default function PlanPricingEditor({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('admin.planPrice')}</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={value.price}
          onChange={(e) => onChange({ price: Math.max(0, Number(e.target.value)) })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('admin.planCurrency')}</label>
        <select
          value={value.currency}
          onChange={(e) => onChange({ currency: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
        >
          <option value="MAD">MAD</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('admin.billingInterval')}</label>
        <select
          value={value.billing_interval}
          onChange={(e) => onChange({ billing_interval: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
        >
          <option value="monthly">{t('admin.monthly')}</option>
          <option value="yearly">{t('admin.yearly')}</option>
        </select>
      </div>
      <div className="flex items-end pb-1">
        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
          <input
            type="checkbox"
            checked={value.is_free}
            onChange={(e) => onChange({ is_free: e.target.checked, price: e.target.checked ? 0 : value.price })}
            className="w-4 h-4 accent-emerald-600"
          />
          {t('admin.isFree')}
        </label>
      </div>
    </div>
  );
}
