import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, Lock, Save } from 'lucide-react'
import api from '../../api/client'
import { queryClient } from '../../api/queryClient'
import { useNotificationPrefs } from '../../api/queries'
import { Skeleton, Toggle } from '../dashboard/ui'
import { useToast } from '../ui/Toast'
import { categoryMeta } from './constants'

const CATEGORY_ORDER = ['match', 'booking', 'tournament', 'recruitment', 'team', 'social', 'system']

export default function NotificationPreferences({ types, containerClassName = '' }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data, loading } = useNotificationPrefs()
  const [prefs, setPrefs] = useState(null)
  const [saving, setSaving] = useState(false)

  const systemTypes = useMemo(
    () => new Set(data?.meta?.system_types || ['system', 'report']),
    [data],
  )

  useEffect(() => {
    if (data?.preferences) setPrefs(data.preferences)
  }, [data])

  const groups = useMemo(() => {
    if (!prefs) return []
    const allowed = types ? new Set(types) : null
    const map = {}
    Object.entries(prefs).forEach(([type, pref]) => {
      if (allowed && !allowed.has(type)) return
      const cat = pref.category || 'system'
      map[cat] = map[cat] || []
      map[cat].push(type)
    })
    const order = data?.meta?.categories || CATEGORY_ORDER
    return order
      .filter((cat) => map[cat]?.length)
      .map((cat) => ({ category: cat, items: map[cat] }))
  }, [prefs, types, data])

  const save = async () => {
    setSaving(true)
    try {
      const res = await api.put('/notifications/preferences', { preferences: prefs })
      setPrefs(res.data.preferences)
      queryClient.invalidateQueries({ queryKey: ['notifications', 'prefs'] })
      toast.success(t('notifications.settings.saved'))
    } catch (e) {
      toast.error(e.response?.data?.message || t('notifications.settings.failed'))
    } finally {
      setSaving(false)
    }
  }

  const setEnabled = (type, enabled) =>
    setPrefs((p) => ({ ...p, [type]: { ...p[type], database_enabled: enabled } }))

  return (
    <div className={`rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] ${containerClassName}`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-sky-50 text-sky-600">
            <Bell className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">{t('notifications.settings.title')}</h3>
            <p className="text-[11px] font-semibold text-slate-400">{t('notifications.settings.desc')}</p>
          </div>
        </div>
        <ButtonSmall saving={saving} disabled={!prefs} onSave={save} t={t} />
      </div>

      <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-[11px] font-bold text-sky-600">
        {t('notifications.settings.inAppNote')}
      </p>

      {loading || !prefs ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <p className="py-6 text-center text-xs text-slate-400">{t('notifications.empty')}</p>
      ) : (
        <div className="space-y-5">
          {groups.map(({ category, items }) => {
            const Meta = categoryMeta[category] || categoryMeta.system
            return (
              <div key={category}>
                <div className="mb-2 flex items-center gap-2">
                  <span className={`grid size-7 place-items-center rounded-xl ${Meta.cls}`}>
                    <Meta.icon className="size-3.5" />
                  </span>
                  <p className="text-xs font-extrabold text-slate-700">{t(`notifications.categories.${category}`)}</p>
                </div>
                <div className="space-y-2">
                  {items.map((type) => {
                    const locked = systemTypes.has(type)
                    return (
                      <div key={type} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                        <div className="flex min-w-0 items-center gap-2">
                          <p className="truncate text-sm font-extrabold text-slate-800">
                            {t(`notifications.types.${type}`)}
                          </p>
                          {locked && <Lock className="size-3.5 shrink-0 text-slate-400" />}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {locked && (
                            <span className="text-[10px] font-bold text-slate-400">
                              {t('notifications.settings.systemLocked')}
                            </span>
                          )}
                          <Toggle
                            checked={prefs[type]?.database_enabled ?? true}
                            disabled={locked}
                            onChange={(v) => setEnabled(type, v)}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ButtonSmall({ saving, disabled, onSave, t }) {
  return (
    <button
      type="button"
      onClick={onSave}
      disabled={saving || disabled}
      className="inline-flex items-center gap-2 rounded-xl bg-green-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Save className="size-3.5" />
      {saving ? t('notifications.settings.saving') : t('notifications.settings.save')}
    </button>
  )
}
