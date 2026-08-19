import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { cn } from '../../../components/admin/ui'

export default function FeatureEditor({ features, onChange }) {
  const { t } = useTranslation()

  if (features.length === 0) {
    return <p className="py-6 text-center text-xs text-slate-400">{t('admin.plans.noFeatures')}</p>
  }

  return (
    <div className="space-y-2.5">
      {features.map((feature, index) => {
        const isLimit = feature.type === 'limit'
        return (
          <div
            key={feature.id}
            className={cn(
              'flex flex-wrap items-center gap-3 rounded-2xl border p-3.5 transition-colors',
              feature.enabled ? 'border-green-200 bg-green-50/40' : 'border-slate-200 bg-white',
            )}
          >
            <div className={cn('grid size-8 shrink-0 place-items-center rounded-xl', feature.enabled ? 'bg-green-500 text-white' : 'bg-slate-100 text-slate-300')}>
              <Check className="size-4" strokeWidth={3} />
            </div>
            <div className="min-w-0 flex-1">
              <div className={cn('text-sm font-bold', feature.enabled ? 'text-slate-900' : 'text-slate-400')}>{feature.name}</div>
              <div className="font-mono text-[11px] text-slate-400">{feature.key}</div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={feature.enabled}
              onClick={() =>
                onChange(index, {
                  enabled: !feature.enabled,
                  is_unlimited: !feature.enabled ? feature.is_unlimited : false,
                  value: !feature.enabled ? feature.value : null,
                })
              }
              className={cn(
                'relative h-6 w-11 rounded-full transition-colors duration-300',
                feature.enabled ? 'bg-green-500' : 'bg-slate-200',
              )}
            >
              <span
                className={cn(
                  'absolute top-0.5 size-5 rounded-full bg-white shadow transition-all duration-300',
                  feature.enabled ? 'start-[22px]' : 'start-0.5',
                )}
              />
            </button>

            {isLimit && feature.enabled && (
              <>
                <label className="flex cursor-pointer items-center gap-1.5 text-xs font-bold text-slate-600">
                  <input
                    type="checkbox"
                    checked={feature.is_unlimited}
                    onChange={(e) =>
                      onChange(index, {
                        is_unlimited: e.target.checked,
                        value: e.target.checked ? null : feature.value,
                      })
                    }
                    className="size-4 accent-green-500"
                  />
                  {t('admin.plans.featureUnlimited')}
                </label>
                {!feature.is_unlimited && (
                  <input
                    type="number"
                    min="0"
                    value={feature.value ?? 0}
                    onChange={(e) => onChange(index, { value: Math.max(0, Number(e.target.value)) })}
                    className="h-9 w-24 rounded-xl border border-slate-200 px-3 text-center text-sm font-bold outline-none transition-all focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
                  />
                )}
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
