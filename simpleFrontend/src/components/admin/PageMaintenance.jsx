import { useState } from 'react'
import { FileText, Save, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import { Button, Card, Toggle, Input, Skeleton, Badge } from './ui'

const ALL_PAGES = [
  { path: '/', label: 'الرئيسية' },
  { path: '/about', label: 'من نحن' },
  { path: '/contact', label: 'اتصل بنا' },
  { path: '/terms', label: 'الشروط' },
  { path: '/privacy', label: 'الخصوصية' },
  { path: '/pricing', label: 'الأسعار' },
  { path: '/fields', label: 'الملاعب' },
  { path: '/matches', label: 'المباريات' },
  { path: '/tournaments', label: 'البطولات' },
  { path: '/login', label: 'تسجيل الدخول' },
  { path: '/register', label: 'التسجيل' },
  { path: '/pending', label: 'في انتظار الموافقة' },
  { path: '/recovery', label: 'استرداد الحساب' },
  { path: '/dashboard', label: 'لوحة المدير' },
  { path: '/terrain', label: 'لوحة مالك الملعب' },
  { path: '/admin', label: 'لوحة المسؤول' },
  { path: '/player', label: 'لوحة اللاعب' },
  { path: '/committee', label: 'لوحة اللجنة' },
]

export default function PageMaintenance() {
  const { data, loading, refetch } = useApi(() => api.get('/admin/page-maintenance').then((r) => r.data))
  const [values, setValues] = useState({})
  const [busy, setBusy] = useState(null)
  const [msg, setMsg] = useState('')
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(null)

  const pages = data?.pages || []
  const pagesMap = {}
  for (const p of pages) {
    pagesMap[p.path] = p
  }

  const getVal = (path, key, defaultVal = null) => {
    const vk = `${path}.${key}`
    if (vk in values) return values[vk]
    return pagesMap[path]?.[key] ?? defaultVal
  }

  const setVal = (path, key, value) => {
    setValues((v) => ({ ...v, [`${path}.${key}`]: value }))
  }

  const isDirty = (path) => {
    return Object.keys(values).some((k) => k.startsWith(`${path}.`))
  }

  const savePage = async (path) => {
    setBusy(path)
    setMsg('')
    setError('')
    try {
      const body = {
        path,
        enabled: Boolean(getVal(path, 'enabled', false)),
        message: getVal(path, 'message', '') || null,
        starts_at: getVal(path, 'starts_at', null) || null,
        ends_at: getVal(path, 'ends_at', null) || null,
      }
      const res = await api.put('/admin/page-maintenance', body)
      setMsg(res.data.message || 'تم الحفظ بنجاح')
      const keysToRemove = Object.keys(values).filter((k) => k.startsWith(`${path}.`))
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

  const deletePage = async (path) => {
    if (!confirm('هل تريد حذف إعداد صيانة هذه الصفحة؟')) return
    setBusy(path)
    setMsg('')
    setError('')
    try {
      const res = await api.delete('/admin/page-maintenance', { data: { path } })
      setMsg(res.data.message || 'تم الحذف بنجاح')
      refetch()
    } catch (e) {
      setError(e.response?.data?.message || 'تعذر الحذف')
    } finally {
      setBusy(null)
    }
  }

  if (loading) {
    return (
      <div>
        <div className="mb-3 flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-blue-500/10 text-blue-600">
            <FileText className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-900">صيانة الصفحات</h3>
            <p className="text-[11px] text-slate-400">تحكم في صيانة كل صفحة على حدة</p>
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
        <div className="grid size-10 place-items-center rounded-2xl bg-blue-500/10 text-blue-600">
          <FileText className="size-5" />
        </div>
        <div>
          <h3 className="text-sm font-black text-slate-900">صيانة الصفحات</h3>
          <p className="text-[11px] text-slate-400">فعّال = الصفحة تظهر صفحة صيانة بدلاً من المحتوى — للمسؤول فقط</p>
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
          {ALL_PAGES.map(({ path, label }) => {
            const currentEnabled = getVal(path, 'enabled', pagesMap[path]?.enabled || false)
            const isOpen = expanded === path
            const dirty = isDirty(path)
            const hasRecord = Boolean(pagesMap[path])

            return (
              <div key={path}>
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : path)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-800">{label}</span>
                      <code className="text-[10px] text-slate-400">{path}</code>
                      {dirty && <Badge tone="amber" className="text-[10px]">تعديل</Badge>}
                      {pagesMap[path]?.enabled && (
                        <Badge tone="red" className="text-[10px]">صيانة</Badge>
                      )}
                    </div>
                    {pagesMap[path]?.message && (
                      <p className="mt-0.5 text-[11px] text-slate-400 truncate">{pagesMap[path].message}</p>
                    )}
                  </div>
                  <Toggle
                    checked={Boolean(currentEnabled)}
                    onChange={(v) => {
                      setVal(path, 'enabled', v)
                      if (v && !isOpen) setExpanded(path)
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {isOpen ? <ChevronUp className="size-4 text-slate-400" /> : <ChevronDown className="size-4 text-slate-400" />}
                </div>

                {isOpen && (
                  <div className="fade-in border-t border-slate-100 bg-slate-50/30 px-5 py-4 space-y-4">
                    <div>
                      <label className="mb-1.5 block text-xs font-bold text-slate-500">رسالة الصيانة (اختياري)</label>
                      <textarea
                        rows={2}
                        value={getVal(path, 'message', pagesMap[path]?.message || '')}
                        onChange={(e) => setVal(path, 'message', e.target.value)}
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                        placeholder="رسالة تظهر بدلاً من محتوى الصفحة..."
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-500">تاريخ البداية</label>
                        <Input
                          type="datetime-local"
                          value={getVal(path, 'starts_at', '') ? getVal(path, 'starts_at', '').slice(0, 16) : ''}
                          onChange={(e) => setVal(path, 'starts_at', e.target.value || null)}
                        />
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-bold text-slate-500">تاريخ النهاية</label>
                        <Input
                          type="datetime-local"
                          value={getVal(path, 'ends_at', '') ? getVal(path, 'ends_at', '').slice(0, 16) : ''}
                          onChange={(e) => setVal(path, 'ends_at', e.target.value || null)}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      {hasRecord && (
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => deletePage(path)}
                          disabled={busy !== null}
                        >
                          حذف الإعداد
                        </Button>
                      )}
                      <div className="flex justify-end gap-2 ms-auto">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setExpanded(null)}
                        >
                          إلغاء
                        </Button>
                        <Button
                          size="sm"
                          loading={busy === path}
                          disabled={busy !== null && busy !== path}
                          onClick={() => savePage(path)}
                        >
                          <Save className="size-3.5" />
                          حفظ
                        </Button>
                      </div>
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
