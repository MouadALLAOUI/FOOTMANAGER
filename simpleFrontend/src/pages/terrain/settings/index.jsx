import { useEffect, useState } from 'react'
import { Bell, Save, UserRound } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { SectionTitle, Button, Skeleton, Toggle } from '../../../components/dashboard/ui'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../components/ui/Toast'

const typeLabels = {
  new_follower: 'متابعون جدد',
  new_comment: 'تعليقات جديدة',
  comment_reply: 'الردود على تعليقاتي',
  like: 'الإعجابات',
  player_review: 'تقييمات اللاعبين',
  stadium_review: 'تقييمات الملاعب',
  match_invitation: 'دعوات المباريات',
  booking_confirmation: 'تأكيد الحجوزات',
  booking_cancellation: 'إلغاء الحجوزات',
  goal_scored: 'الأهداف المسجلة',
  live_match_started: 'بدء البث المباشر',
  announcement: 'إعلانات المنصة',
  report: 'تقارير',
  match_finished: 'انتهاء المباريات',
  match_started: 'بدء المباريات',
  new_booking_request: 'طلبات حجز جديدة',
  booking_rejected: 'رفض الحجوزات',
  player_awarded_mvp: 'جوائز أفضل لاعب',
  system: 'إشعارات النظام',
}

const channelLabels = {
  database_enabled: 'في التطبيق',
  email_enabled: 'البريد الإلكتروني',
  push_enabled: 'إشعارات فورية',
  sms_enabled: 'رسائل SMS',
}

export default function Settings() {
  const { user } = useAuth()
  const { toast } = useToast()
  const { data, loading } = useApi(() => api.get('/notifications/preferences').then((r) => r.data))
  const [prefs, setPrefs] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (data?.preferences) setPrefs(data.preferences)
  }, [data])

  const toggle = (type, channel) =>
    setPrefs((p) => ({
      ...p,
      [type]: { ...p[type], [channel]: !p[type][channel] },
    }))

  const save = async () => {
    setSaving(true)
    try {
      const res = await api.put('/notifications/preferences', { preferences: prefs })
      setPrefs(res.data.preferences)
      toast.success('تم حفظ تفضيلات الإشعارات')
    } catch (e) {
      toast.error(e.response?.data?.message || 'تعذر الحفظ')
    } finally {
      setSaving(false)
    }
  }

  const types = prefs ? Object.keys(prefs).filter((t) => typeLabels[t]) : []

  return (
    <div className="mx-auto max-w-3xl">
      <SectionTitle
        title="الإعدادات"
        subtitle="تفضيلات الإشعارات ومعلومات حسابك"
        action={
          <Button onClick={save} disabled={saving || !prefs}>
            <Save className="size-4" />
            {saving ? 'جارٍ الحفظ…' : 'حفظ التفضيلات'}
          </Button>
        }
      />

      <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="mb-5 flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-sky-50 text-sky-600">
            <Bell className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">إشعارات</h3>
            <p className="text-[11px] font-semibold text-slate-400">اختر القنوات لكل نوع من الأحداث</p>
          </div>
        </div>

        {loading || !prefs ? (
          <div className="space-y-3">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {types.map((type) => (
              <div key={type} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-extrabold text-slate-800">{typeLabels[type] || type}</p>
                  <Toggle
                    checked={prefs[type].database_enabled}
                    onChange={(v) => setPrefs((p) => ({ ...p, [type]: { ...p[type], database_enabled: v } }))}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                  {Object.entries(channelLabels)
                    .filter(([k]) => k !== 'database_enabled')
                    .map(([k, label]) => (
                      <button
                        key={k}
                        type="button"
                        onClick={() => toggle(type, k)}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${
                          prefs[type][k]
                            ? 'bg-green-500 text-white shadow-sm'
                            : 'border border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <div className="mb-4 flex items-center gap-2">
          <span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600">
            <UserRound className="size-4" />
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">معلومات الحساب</h3>
            <p className="text-[11px] font-semibold text-slate-400">بيانات الدخول لحسابك</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {[
            { label: 'الاسم', value: user?.name || '—' },
            { label: 'البريد الإلكتروني', value: user?.email || '—' },
            { label: 'الهاتف', value: user?.phone || '—' },
            {
              label: 'الحالة',
              value: user?.status === 'approved' ? 'حساب مفعّل' : user?.status || '—',
            },
          ].map((f) => (
            <div key={f.label} className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
              <p className="text-[10px] font-bold text-slate-400">{f.label}</p>
              <p className="mt-0.5 truncate text-sm font-bold text-slate-800">{f.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
