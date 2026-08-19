import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, CreditCard } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { PageHeader, Button, Modal, EmptyState, Skeleton } from '../../../components/admin/ui'
import { toast } from '../../../components/ui/Toast'
import PlanCard from './planCard'
import PlanForm from './planForm'

const buildFeatures = (catalog, plan) =>
  catalog.map((feature) => {
    const existing = plan?.features?.find((f) => f.id === feature.id)
    return {
      id: feature.id,
      key: feature.key,
      name: feature.name,
      description: feature.description,
      type: feature.type,
      scope: feature.scope,
      enabled: existing ? existing.enabled : false,
      value: existing ? existing.value : null,
      is_unlimited: existing ? existing.is_unlimited : false,
    }
  })

const buildForm = (catalog, plan) => ({
  name: plan?.name || '',
  slug: plan?.slug || '',
  description: plan?.description || '',
  badge: plan?.badge || '',
  display_order: plan?.display_order ?? 0,
  is_active: plan?.is_active ?? true,
  price: plan ? Number(plan.price) : 0,
  currency: plan?.currency || 'MAD',
  billing_interval: plan?.billing_interval || 'monthly',
  is_free: plan?.is_free ?? false,
  discount: {
    type: plan?.discount?.type || 'percentage',
    value: plan?.discount ? Number(plan.discount.value) : 0,
    starts_at: plan?.discount?.starts_at || '',
    ends_at: plan?.discount?.ends_at || '',
    is_active: plan?.discount?.is_active ?? false,
  },
  features: buildFeatures(catalog, plan),
})

export default function Plans() {
  const { t } = useTranslation()
  const { data, loading, refetch } = useApi(() => api.get('/admin/plans').then((r) => r.data))
  const [plans, setPlans] = useState([])
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(null)
  const [busy, setBusy] = useState(false)
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    if (data) setPlans(data.plans || [])
  }, [data])

  const catalog = data?.features || []

  const openAdd = () => {
    setEditing(null)
    setForm(buildForm(catalog, null))
    setOpen(true)
  }

  const openEdit = (plan) => {
    setEditing(plan)
    setForm(buildForm(catalog, plan))
    setOpen(true)
  }

  const handleFormChange = (patch) => setForm((prev) => ({ ...prev, ...patch }))

  const handleFeatureChange = (index, patch) => {
    const current = form.features[index]
    const willDisable = current.enabled && patch.enabled === false
    const limitChanged =
      current.enabled &&
      current.type === 'limit' &&
      patch.value !== undefined &&
      patch.value !== current.value &&
      !patch.is_unlimited

    if (willDisable && !window.confirm(t('admin.plans.removeFeatureConfirm'))) return
    if (limitChanged && !window.confirm(t('admin.plans.limitChangeConfirm'))) return

    setForm((prev) => ({
      ...prev,
      features: prev.features.map((feature, i) => (i === index ? { ...feature, ...patch } : feature)),
    }))
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim()) return
    if (editing && Number(form.price) !== Number(editing.price) && !window.confirm(t('admin.plans.priceChangeConfirm'))) return

    setBusy(true)
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        description: form.description.trim() || null,
        badge: form.badge.trim() || null,
        display_order: Number(form.display_order),
        is_active: form.is_active,
        price: Number(form.price),
        currency: form.currency,
        billing_interval: form.billing_interval,
        is_free: form.is_free,
      }

      let planId = editing?.id
      if (planId) {
        const res = await api.put(`/admin/plans/${planId}`, payload)
        toast.success(res.data.message || t('admin.plans.saveEdits'))
      } else {
        const res = await api.post('/admin/plans', payload)
        planId = res.data.plan.id
        toast.success(res.data.message || t('admin.plans.add'))
      }

      const featuresPayload = form.features
        .filter((feature) => feature.enabled || feature.value != null || feature.is_unlimited)
        .map((feature) => ({
          feature_id: feature.id,
          enabled: feature.enabled,
          value: feature.value,
          is_unlimited: feature.is_unlimited,
        }))

      const featuresRes = await api.put(`/admin/plans/${planId}/features`, { features: featuresPayload })

      await api.put(`/admin/plans/${planId}/discount`, {
        type: form.discount.type,
        value: Number(form.discount.value),
        starts_at: form.discount.starts_at || null,
        ends_at: form.discount.ends_at || null,
        is_active: form.discount.is_active && Number(form.discount.value) > 0,
      })

      toast.success(featuresRes.data.message || t('admin.plans.saveEdits'))
      setOpen(false)
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.message || 'حدث خطأ، حاول مجدداً')
    } finally {
      setBusy(false)
    }
  }

  const handleToggleStatus = async (plan) => {
    if (!window.confirm(plan.is_active ? t('admin.plans.deactivateConfirm') : t('admin.plans.activateConfirm'))) return
    try {
      const res = await api.patch(`/admin/plans/${plan.id}/status`, { is_active: !plan.is_active })
      toast.success(res.data.message || '')
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.message || 'حدث خطأ، حاول مجدداً')
    }
  }

  const handleDelete = async (plan) => {
    if (!window.confirm(t('admin.plans.deleteConfirm'))) return
    setDeleting(plan.id)
    try {
      const res = await api.delete(`/admin/plans/${plan.id}`)
      toast.success(res.data.message || '')
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.message || 'حدث خطأ، حاول مجدداً')
    } finally {
      setDeleting(null)
    }
  }

  const handleMove = async (plan, dir) => {
    const index = plans.findIndex((p) => p.id === plan.id)
    const target = index + dir
    if (target < 0 || target >= plans.length) return

    const next = [...plans]
      ;[next[index], next[target]] = [next[target], next[index]]
    setPlans(next)

    try {
      await api.post('/admin/plans/reorder', { order: next.map((p) => p.id) })
    } catch {
      refetch()
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t('admin.plans.title')}
        subtitle={t('admin.plans.subtitle')}
        actions={
          <Button onClick={openAdd} disabled={loading}>
            <Plus className="size-4" />
            {t('admin.plans.add')}
          </Button>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-3xl" />)}
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={t('admin.plans.empty')}
          description={t('admin.plans.emptyHint')}
          action={<Button variant="outline" onClick={openAdd}><Plus className="size-4" />{t('admin.plans.add')}</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {plans.map((plan, index) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              isFirst={index === 0}
              isLast={index === plans.length - 1}
              onEdit={openEdit}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
              onMove={handleMove}
              deleting={deleting === plan.id}
            />
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="xl"
        title={editing ? t('admin.plans.edit') : t('admin.plans.add')}
        subtitle={editing ? `/${editing.slug}` : undefined}
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>{t('common.cancel')}</Button>
            <Button loading={busy} disabled={!form?.name.trim() || !form?.slug.trim()} onClick={handleSave}>
              {t('admin.plans.saveEdits')}
            </Button>
          </>
        }
      >
        {form && <PlanForm form={form} onChange={handleFormChange} onFeatureChange={handleFeatureChange} />}
      </Modal>
    </div>
  )
}
