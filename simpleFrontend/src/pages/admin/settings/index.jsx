import i18n from '../../../i18n'
import { useTranslation } from 'react-i18next'
import { useState } from 'react'
import { Save, Settings2, CheckCircle2 } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { PageHeader, Button, Card, Input, Toggle, Skeleton, Badge } from '../../../components/admin/ui'
import ModuleMaintenance from '../../../components/admin/ModuleMaintenance'
import PageMaintenance from '../../../components/admin/PageMaintenance'

const groups = () => [
  { key: 'platform', label: i18n.t('dash.platformInformation'), icon: Settings2, description: i18n.t('dash.nameContactDetailsSocialAccounts') },
  { key: 'features', label: i18n.t('dash.featureToggles'), icon: Settings2, description: i18n.t('dash.controlTheFeaturesAvailableToUsers') },
  { key: 'rules', label: i18n.t('dash.businessRules'), icon: Settings2, description: i18n.t('dash.limitsAndDefaultValuesForOperations') },
  { key: 'announcement', label: i18n.t('dash.announcementBar'), icon: Settings2, description: i18n.t('dash.aBannerShownAtTheTopOfTheSite') },
]

const announcementTypes = {
get   info() { return { label: i18n.t('dash.info'), tone: 'sky' } },
get   warning() { return { label: i18n.t('dash.warning'), tone: 'amber' } },
get   success() { return { label: i18n.t('dash.success'), tone: 'green' } },
}

export default function Settings() {
  const { t } = useTranslation()
  const { data, loading, refetch } = useApi(() => api.get('/admin/settings').then((r) => r.data))
  const [values, setValues] = useState({})
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')

  const settings = data?.settings || {}

  const setValue = (key, type, value) => {
    setValues((v) => ({ ...v, [key]: type === 'boolean' ? Boolean(value) : value }))
  }

  const dirtyKeys = Object.keys(values).filter((k) => values[k] !== undefined)

  const save = async () => {
    const entries = dirtyKeys.map((key) => ({ key, value: values[key] }))
    if (entries.length === 0) return

    const numberRules = {
      max_team_members: { min: 2, max: 100 },
      max_open_matches_per_team: { min: 1, max: 50 },
      booking_window_days: { min: 1, max: 365 },
      default_match_hours: { min: 1, max: 8 },
      team_gallery_max_images: { min: 1, max: 100 },
    }

    for (const [key, rule] of Object.entries(numberRules)) {
      if (dirtyKeys.includes(key)) {
        const val = Number(values[key])
        if (isNaN(val) || val < rule.min || val > rule.max) {
          setError(t('dash.valueRange', { key, min: rule.min, max: rule.max }))
          setBusy(false)
          return
        }
      }
    }

    setBusy(true)
    setMsg('')
    setError('')
    try {
      const res = await api.put('/admin/settings', { settings: entries })
      setMsg(res.data.message || t('dash.settingsSavedSuccessfully'))
      setValues({})
      refetch()
    } catch (e) {
      setError(e.response?.data?.message || t('dash.couldNotSaveSettings'))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <div>
        <PageHeader title={t('dash.platformSettings')} subtitle={t('dash.controlPlatformDataRulesAndFeatures')} />
        <div className="space-y-5">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-3xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        title={t('dash.platformSettings')}
        subtitle={t('dash.controlPlatformDataRulesAndFeatures')}
        actions={
          dirtyKeys.length > 0 && (
            <Button loading={busy} onClick={save}>
              <Save className="size-4" />
              {t('dash.save')} ({dirtyKeys.length})
            </Button>
          )
        }
      />

      {msg && (
        <div className="fade-in mb-5 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
          <CheckCircle2 className="size-4" />
          {msg}
        </div>
      )}
      {error && (
        <div className="fade-in mb-5 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 ring-1 ring-red-200">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="lg:col-span-2">
          <PageMaintenance />
        </div>
        <div className="lg:col-span-2">
          <ModuleMaintenance />
        </div>
        {groups().map((g) => {
          const list = settings[g.key] || []
          if (list.length === 0) return null
          const dirty = list.some((s) => s.key in values)
          return (
            <div key={g.key}>
              <div className="mb-3 flex items-center gap-3">
                <div className="grid size-10 place-items-center rounded-2xl bg-green-500/10 text-green-600">
                  <g.icon className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">{g.label}</h3>
                  <p className="text-[11px] text-slate-400">{g.description}</p>
                </div>
                {dirty && <Badge tone="amber" className="ms-auto">{t('dash.unsavedChanges')}</Badge>}
              </div>
              <Card>
                <div className="space-y-5">
                  {list.map((s) => {
                    const current = s.key in values ? values[s.key] : s.value
                    const original = s.value
                    const changed = s.key in values && String(values[s.key]) !== String(original)
                    return (
                      <div key={s.key}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div>
                            <span className="text-xs font-bold text-slate-600">{s.label}</span>
                            {s.description && <p className="text-[10px] text-slate-400 mt-0.5">{s.description}</p>}
                          </div>
                          {changed && <span className="text-[10px] font-bold text-amber-500">{t('dash.changesSaved')}</span>}
                        </div>
                        {s.type === 'boolean' ? (
                          <div className="flex items-center justify-between rounded-2xl bg-slate-50/80 p-3">
                            <span className="text-xs text-slate-500">{current ? t('dash.enabled') : t('dash.disabled')}</span>
                            <Toggle checked={Boolean(current)} onChange={(v) => {
                              if (v && s.key === 'maintenance_mode') {
                                if (!window.confirm(t('dash.enableMaintenanceModeThePlatformWillBeHiddenFromAllUsers'))) return;
                              }
                              setValue(s.key, s.type, v)
                            }} />
                          </div>
                        ) : s.type === 'number' ? (
                          <Input
                            type="number"
                            min="0"
                            value={current ?? ''}
                            onChange={(e) => setValue(s.key, s.type, e.target.value === '' ? null : Number(e.target.value))}
                          />
                        ) : s.key === 'announcement_type' ? (
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(announcementTypes).map(([val, meta]) => (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setValue(s.key, s.type, val)}
                                className={`rounded-2xl px-4 py-2 text-xs font-bold transition-all ${
                                  current === val
                                    ? meta.tone === 'green' ? 'bg-emerald-500 text-white' : meta.tone === 'amber' ? 'bg-amber-500 text-white' : 'bg-sky-500 text-white'
                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                }`}
                              >
                                {meta.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <Input
                            type={s.key === 'contact_email' ? 'email' : (s.key === 'facebook_url' || s.key === 'instagram_url') ? 'url' : 'text'}
                            placeholder={(s.key === 'facebook_url' || s.key === 'instagram_url') ? 'https://...' : undefined}
                            value={current ?? ''}
                            onChange={(e) => setValue(s.key, s.type, e.target.value)}
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>
          )
        })}
      </div>

      {dirtyKeys.length > 0 && (
        <div className="sticky bottom-6 mt-8 flex justify-center">
          <Button size="lg" loading={busy} onClick={save} className="shadow-2xl">
            <Save className="size-4" />
            {t('dash.saveAllChanges')} ({dirtyKeys.length})
          </Button>
        </div>
      )}
    </div>
  )
}
