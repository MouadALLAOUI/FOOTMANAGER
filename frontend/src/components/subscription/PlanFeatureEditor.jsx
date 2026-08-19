import { useTranslation } from 'react-i18next';

export default function PlanFeatureEditor({ features, onChange }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      {features.map((feature, index) => {
        const isLimit = feature.type === 'limit';
        return (
          <div key={feature.id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-gray-200">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-800">{feature.name}</div>
              <div className="text-xs text-gray-400 mt-0.5 font-mono">{feature.key}</div>
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={feature.enabled}
                onChange={(e) =>
                  onChange(index, {
                    enabled: e.target.checked,
                    is_unlimited: e.target.checked ? feature.is_unlimited : false,
                    value: e.target.checked ? feature.value : null,
                  })
                }
                className="w-4 h-4 accent-emerald-600"
              />
              {t('admin.featureEnabled')}
            </label>
            {isLimit && feature.enabled && (
              <>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={feature.is_unlimited}
                    onChange={(e) =>
                      onChange(index, { is_unlimited: e.target.checked, value: e.target.checked ? null : feature.value })
                    }
                    className="w-4 h-4 accent-emerald-600"
                  />
                  {t('admin.featureUnlimited')}
                </label>
                {!feature.is_unlimited && (
                  <input
                    type="number"
                    min="0"
                    value={feature.value ?? 0}
                    onChange={(e) => onChange(index, { value: Math.max(0, Number(e.target.value)) })}
                    className="w-24 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-center focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                )}
              </>
            )}
          </div>
        );
      })}
      {features.length === 0 && <p className="text-sm text-gray-400 text-center py-6">{t('admin.noFeatures')}</p>}
    </div>
  );
}
