import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { CreditCard, ArrowRightLeft, Trash2, AlertTriangle } from 'lucide-react'
import api from '../../api/client'
import { useApi } from '../../hooks/useApi'
import Drawer from '../dashboard/Drawer'
import { Button, Badge, Skeleton } from './ui'
import PlanBadge from './PlanBadge'
import { toast } from '../ui/Toast'
import { toastApiError } from '../../lib/errors'

const planToneForSelect = {
  platinum: 'softViolet',
  gold: 'softAmber',
  silver: 'info',
  bronze: 'softAmber',
  free: 'neutral',
}

export default function UserSubscriptionDrawer({ userId, userName, onClose }) {
  const { t } = useTranslation()
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState(null)

  const { data, loading, refetch } = useApi(
    () => userId ? api.get(`/admin/users/${userId}/subscription`).then((r) => r.data) : null,
    [userId],
  )

  const { data: plansData } = useApi(
    () => api.get('/admin/plans').then((r) => r.data),
    [],
  )

  const plans = plansData?.plans?.filter((p) => p.is_active) || []
  const sub = data?.subscription
  const plan = data?.plan
  const usage = data?.usage || []
  const history = data?.history || []

  useEffect(() => {
    if (plan) setSelectedPlanId(plan.id)
  }, [plan?.id])

  const handleAssign = async () => {
    if (!selectedPlanId || selectedPlanId === plan?.id) return
    setSaving(true)
    try {
      const res = await api.put(`/admin/users/${userId}/subscription`, { plan_id: selectedPlanId })
      toast.success(res.data.message || 'تم تعيين الخطة')
      refetch()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setSaving(false)
    }
  }

  const handleRemove = async () => {
    setRemoving(true)
    try {
      const res = await api.delete(`/admin/users/${userId}/subscription`)
      toast.success(res.data.message || 'تم إلغاء الاشتراك')
      refetch()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <Drawer
      open={Boolean(userId)}
      onClose={onClose}
      title="إدارة اشتراك المستخدم"
      subtitle={userName}
      size="lg"
      footer={
        sub ? (
          <Button variant="red" loading={removing} onClick={handleRemove}>
            <Trash2 className="size-4" />
            إلغاء الاشتراك
          </Button>
        ) : null
      }
    >
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
      ) : !data ? null : (
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-100 bg-slate-50 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">الخطة الحالية</p>
                <div className="mt-2">
                  <PlanBadge plan={plan} />
                </div>
              </div>
              {sub && (
                <div className="text-start">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">حالة الاشتراك</p>
                  <div className="mt-2">
                    <Badge tone={sub.status === 'active' ? 'green' : 'slate'}>
                      {sub.status === 'active' ? 'نشط' : sub.status}
                    </Badge>
                  </div>
                </div>
              )}
            </div>
            {sub && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-white border border-slate-100 p-3">
                  <p className="text-[10px] font-bold text-slate-400">تاريخ البداية</p>
                  <p className="mt-1 text-xs font-bold text-slate-700">
                    {sub.starts_at ? new Date(sub.starts_at).toLocaleDateString('ar-MA') : '—'}
                  </p>
                </div>
                <div className="rounded-xl bg-white border border-slate-100 p-3">
                  <p className="text-[10px] font-bold text-slate-400">تاريخ الانتهاء</p>
                  <p className="mt-1 text-xs font-bold text-slate-700">
                    {sub.ends_at ? new Date(sub.ends_at).toLocaleDateString('ar-MA') : '—'}
                  </p>
                </div>
              </div>
            )}
          </div>

          {usage.length > 0 && (
            <div className="rounded-3xl border border-slate-100 p-5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">الاستهلاك</h4>
              <div className="mt-3 space-y-3">
                {usage.map((u) => (
                  <div key={u.feature} className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-slate-700">{u.feature}</span>
                    <span className="text-sm font-bold text-slate-900">
                      {u.unlimited ? (
                        <Badge tone="green">غير محدود</Badge>
                      ) : u.limit === 0 ? (
                        <Badge tone="red">غير متاح</Badge>
                      ) : (
                        `${u.currentUsage} / ${u.limit}`
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-3xl border border-slate-100 p-5">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">تغيير الخطة</h4>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {plans.map((p) => {
                const isCurrent = p.id === plan?.id
                const isSelected = p.id === selectedPlanId
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlanId(p.id)}
                    className={`flex items-center justify-between rounded-2xl border-2 p-4 text-start transition-all ${
                      isSelected
                        ? 'border-green-500 bg-green-50/50'
                        : 'border-slate-100 hover:border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <PlanBadge plan={p} />
                      {isCurrent && <Badge tone="green">الحالية</Badge>}
                    </div>
                    <span className="text-sm font-bold text-slate-600">
                      {p.is_free ? 'مجاني' : `${p.price} ${p.currency}`}
                    </span>
                  </button>
                )
              })}
            </div>

            {selectedPlanId && selectedPlanId !== plan?.id && (
              <div className="mt-4 flex gap-3">
                <Button
                  variant="primary"
                  loading={saving}
                  onClick={handleAssign}
                  className="flex-1"
                >
                  <ArrowRightLeft className="size-4" />
                  تغيير الخطة
                </Button>
              </div>
            )}
          </div>

          {history.length > 0 && (
            <div className="rounded-3xl border border-slate-100 p-5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">سجل الاشتراكات</h4>
              <div className="mt-3 space-y-2">
                {history.map((h) => (
                  <div key={h.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center gap-2">
                      <PlanBadge plan={h.plan} />
                      <Badge tone={h.status === 'active' ? 'green' : h.status === 'cancelled' ? 'red' : 'slate'}>
                        {h.status === 'active' ? 'نشط' : h.status === 'cancelled' ? 'ملغى' : h.status}
                      </Badge>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {h.starts_at ? new Date(h.starts_at).toLocaleDateString('ar-MA') : '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {plan?.features?.length > 0 && (
            <div className="rounded-3xl border border-slate-100 p-5">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">مزايا الخطة</h4>
              <div className="mt-3 space-y-2">
                {plan.features.map((f) => (
                  <div key={f.key || f.feature} className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                    <span className="text-sm font-semibold text-slate-700">{f.name}</span>
                    <span className="text-xs font-bold text-slate-500">
                      {f.enabled ? (
                        f.is_unlimited ? (
                          <Badge tone="green">متوفر</Badge>
                        ) : f.value ? (
                          <Badge tone="sky">{f.value}</Badge>
                        ) : (
                          <Badge tone="green">متوفر</Badge>
                        )
                      ) : (
                        <Badge tone="slate">غير متوفر</Badge>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Drawer>
  )
}
