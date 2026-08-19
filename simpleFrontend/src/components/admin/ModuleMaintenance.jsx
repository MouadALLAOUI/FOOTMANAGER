import { useState } from 'react'
import { Wrench, Save, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { Button, Card, Toggle, Input, Skeleton, Badge } from './ui'

const MODULE_KEYS = [
  'bookings', 'matches', 'tournaments', 'teams', 'players',
  'terrain', 'recruitment', 'social', 'chat', 'reviews',
  'notifications', 'subscriptions',
]

const MODULE_LABELS = {
  bookings: 'الحجوزات',
  matches: 'المباريات',
  tournaments: 'البطولات',
  teams: 'الفريق',
  players: 'اللاعبون',
  terrain: 'الملاعب',
  recruitment: 'الضم والwerel',
  social: 'التواصل الاجتماعي',
  chat: 'المحادثة',
  reviews: 'التقييمات',
  notifications: 'الإشعارات',
  subscriptions: 'الاشتراكات',
}

export default function ModuleMaintenance() {
  const { data, loading, refetch } = useApi(() => api.get('/admin/maintenance-modules').then((r) => r.data))
  const [values, setValues] = useState({})
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null)

  const modules = data?.modules || []
  const modulesMap = {}
  for (const m of modules) {
    modulesMap[m.module] = m
  }

  const getVal = (module, key, defaultVal = null) => {
    const vk = `${module}.${key}`
    if (vk in values) return values[vk]
    return modulesMap[module]?.[key] ?? defaultVal
  }

  const setVal = (module, key, value) => {
    setValues((v) => ({ ...v, [`${module}.${key}`]: value }))
  }

  const isDirty = (module) => {
    return Object.keys(values).some((k) => k.startsWith(`${module}.`))
  }

  const saveModule = async (module) => {
    setBusy(module)
    setMsg('')
    setError('')
    try {
      const body = {
        enabled: Boolean(getVal(module, 'enabled', false)),
        block_reads: Boolean(getVal(module, 'block_reads', true)),
        message: getVal(module, 'message', '') || null,
        starts_at: getVal(module, 'starts_at', null) || null,
        ends_at: getVal(module, 'ends_at', null) || null,
      }
      const res = await api.put(`/admin/maintenance-modules/${module}`, body)
      setMsg(res.data.message || 'تم الحفظ بنجاح')
      const keysToRemove = Object.keys(values).filter((k) => k.startsWith(`${module}.`))
      setValues((v) => {
        const next = { ...v }
        for (const k of keysToRemove) delete next[k]
        return next
      })
      refetch()
    } catch (e) {
      setError(e.response?.data?.message || 'تعذر الحفظ')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div>
        <div className="mb-3 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
            <Wrench className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">صيانة الوحدات</h3>
            <p className="text-[11px] text-slate-400">تحكم في صيانة كل وحدة على حدة</p>
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-3xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-2xl bg-amber-500/10 text-amber-600">
          <Wrench className="size-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900">صيانة الوحدات</h3>
          <p className="text-[11px] text-slate-400">تحكم في صيانة كل وحدة على حدة — يمنع التعديلات فقط ما لم تفعّل منع القراءة</p>
        </div>
        {Object.keys(values).length > 0 && <Badge tone="amber" className="ms-auto">تعديلات غير محفوظة</Badge>}
      </div>

      {msg && (
        <div className="fade-in mb-4 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700 ring-1 ring-emerald-200">
          <CheckCircle2 className="size-4" />
          {msg}
        </div>
      )}
      {error && (
        <div className="fade-in mb-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-bold text-red-600 ring-1 ring-red-200">
          {error}
        </div>
      )}

      <Card>
        <div className="divide-y divide-slate-100">
          {MODULE_KEYS.map((module) => {
            const currentEnabled = getVal(module, 'enabled', modulesMap[module]?.enabled || false)
            const isOpen = expanded === module
            const dirty = isDirty(module)

            return (
              <div key={module}>
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : module)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">{MODULE_LABELS[module] || module}</span>
                      {dirty && <Badge tone="amber" className="text-[10px]">تعديل</Badge>}
                      {modulesMap[module]?.enabled && modulesMap[module]?.isActive && (
                        <Badge tone="red" className="text-[10px]">نشط</Badge>
                      )}
                    </div>
                    {modulesMap[module]?.message && (
                      <p className="mt-0.5 text-[11px] text-slate-400 truncate">{modulesMap[module].message}</p>
                    )}
                  </div>
                  <Toggle
                    checked={Boolean(currentEnabled)}
                    onChange={(v) => {
                      setVal(module, 'enabled', v)
                      if (v && !isOpen) setExpanded(module)
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {isOpen ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
                </div>

                {isOpen && (
                  <div className="fade-in border-t border-slate-100 bg-slate-50/30 px-5 py-4 space-y-4">
                    <div className="flex items-center justify-between rounded-2xl bg-white p-3 ring-1 ring-slate-200">
                      <div>
                        <span className="text-xs font-bold text-slate-600">منع القراءة أيضاً</span>
                        <p className="text-[10px] text-slate-400">عند التفعيل لن يتمكن المستخدمون من عرض بيانات هذه الوحدة</p>
                      </div>
                      <Toggle
                        checked={Boolean(getVal(module, 'block_reads', modulesMap[module]?.block_reads ?? true))}
                        onChange={(v) => setVal(module, 'block_reads', v)}
                      />
                    </div>

                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-500">رسالة الصيانة (اختياري)</label>
                      <textarea
                        rows={2}
                        value={getVal(module, 'message', modulesMap[module]?.message || '')}
                        onChange={(e) => setVal(module, 'message', e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                        placeholder="رسالة تظهر للمستخدمين أثناء الصيانة..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-500">تاريخ البداية</label>
                        <Input
                          type="datetime-local"
                          value={getVal(module, 'starts_at', '') ? getVal(module, 'starts_at', '').slice(0, 16) : ''}
                          onChange={(e) => setVal(module, 'starts_at', e.target.value || null)}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-500">تاريخ النهاية</label>
                        <Input
                          type="datetime-local"
                          value={getVal(module, 'ends_at', '') ? getVal(module, 'ends_at', '').slice(0, 16) : ''}
                          onChange={(e) => setVal(module, 'ends_at', e.target.value || null)}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        size="sm"
                        loading={busy === module}
                        disabled={busy !== null && busy !== module}
                        onClick={() => saveModule(module)}
                      >
                        <Save className="size-3.5" />
                        حفظ
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
