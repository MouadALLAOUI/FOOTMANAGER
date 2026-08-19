import { useTranslation } from 'react-i18next';

export default function DiscountEditor({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
        <input
          type="checkbox"
          checked={value.is_active}
          onChange={(e) => onChange({ is_active: e.target.checked })}
          className="w-4 h-4 accent-emerald-600"
        />
        {t('admin.discountActive')}
      </label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('admin.discountType')}</label>
          <select
            value={value.type}
            onChange={(e) => onChange({ type: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
          >
            <option value="percentage">{t('admin.percentage')}</option>
            <option value="fixed">{t('admin.fixed')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('admin.discountValue')}</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={value.value}
            onChange={(e) => onChange({ value: Math.max(0, Number(e.target.value)) })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('admin.startsAt')}</label>
          <input
            type="date"
            value={value.starts_at || ''}
            onChange={(e) => onChange({ starts_at: e.target.value || null })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('admin.endsAt')}</label>
          <input
            type="date"
            value={value.ends_at || ''}
            onChange={(e) => onChange({ ends_at: e.target.value || null })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
        </div>
      </div>
    </div>
  );
}
