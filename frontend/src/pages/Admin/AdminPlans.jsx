import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Loader2, X, Check, CreditCard } from 'lucide-react';
import api from '../../services/api';
import PlanCard from '../../components/subscription/PlanCard';
import PlanFeatureEditor from '../../components/subscription/PlanFeatureEditor';
import PlanPricingEditor from '../../components/subscription/PlanPricingEditor';
import DiscountEditor from '../../components/subscription/DiscountEditor';

const buildFeatures = (catalog, plan) =>
  catalog.map((feature) => {
    const existing = plan?.features?.find((f) => f.id === feature.id);
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
    };
  });

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
});

export default function AdminPlans() {
  const { t } = useTranslation();
  const [plans, setPlans] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(null);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/plans');
      setPlans(res.data.plans || []);
      setCatalog(res.data.features || []);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(buildForm(catalog, null));
    setShowModal(true);
  };

  const openEdit = (plan) => {
    setEditing(plan);
    setForm(buildForm(catalog, plan));
    setShowModal(true);
  };

  const handleFeatureChange = (index, patch) => {
    const current = form.features[index];
    const willDisable = current.enabled && patch.enabled === false;
    const limitChanged =
      current.enabled &&
      current.type === 'limit' &&
      patch.value !== undefined &&
      patch.value !== current.value &&
      !patch.is_unlimited;

    if (willDisable && !confirm(t('admin.removeFeatureConfirm'))) return;
    if (limitChanged && !confirm(t('admin.limitChangeConfirm'))) return;

    setForm((prev) => ({
      ...prev,
      features: prev.features.map((feature, i) => (i === index ? { ...feature, ...patch } : feature)),
    }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) return;

    if (editing && Number(form.price) !== Number(editing.price) && !confirm(t('admin.priceChangeConfirm'))) return;

    setSaving(true);
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
      };

      let planId = editing?.id;
      if (planId) {
        await api.put(`/admin/plans/${planId}`, payload);
      } else {
        const res = await api.post('/admin/plans', payload);
        planId = res.data.plan.id;
      }

      const featuresPayload = form.features
        .filter((feature) => feature.enabled || feature.value != null || feature.is_unlimited)
        .map((feature) => ({
          feature_id: feature.id,
          enabled: feature.enabled,
          value: feature.value,
          is_unlimited: feature.is_unlimited,
        }));

      await api.put(`/admin/plans/${planId}/features`, { features: featuresPayload });

      await api.put(`/admin/plans/${planId}/discount`, {
        type: form.discount.type,
        value: Number(form.discount.value),
        starts_at: form.discount.starts_at || null,
        ends_at: form.discount.ends_at || null,
        is_active: form.discount.is_active && Number(form.discount.value) > 0,
      });

      setShowModal(false);
      fetchPlans();
    } catch {
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (plan) => {
    if (!confirm(plan.is_active ? t('admin.deactivateConfirm') : t('admin.activateConfirm'))) return;
    try {
      await api.patch(`/admin/plans/${plan.id}/status`, { is_active: !plan.is_active });
      fetchPlans();
    } catch {}
  };

  const handleDelete = async (plan) => {
    if (!confirm(t('admin.deletePlanConfirm'))) return;
    try {
      await api.delete(`/admin/plans/${plan.id}`);
      fetchPlans();
    } catch {}
  };

  const handleMove = async (plan, dir) => {
    const index = plans.findIndex((p) => p.id === plan.id);
    const target = index + dir;
    if (target < 0 || target >= plans.length) return;

    const next = [...plans];
    [next[index], next[target]] = [next[target], next[index]];
    setPlans(next);

    try {
      await api.post('/admin/plans/reorder', { order: next.map((p) => p.id) });
    } catch {
      fetchPlans();
    }
  };

  const SectionHeader = ({ title }) => (
    <div className="pt-6 first:pt-0">
      <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">{title}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t('admin.managePlans')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('admin.plansCount', { count: plans.length })}</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm transition"
        >
          <Plus size={18} /> {t('admin.addPlan')}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={28} className="animate-spin text-emerald-600" />
        </div>
      ) : plans.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <CreditCard className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-400 text-lg">{t('admin.noPlans')}</p>
          <p className="text-gray-300 text-sm mt-1">{t('admin.noPlansHint')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
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
            />
          ))}
        </div>
      )}

      {showModal && form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40"
            onClick={() => {
              setShowModal(false);
              setEditing(null);
            }}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">
                {editing ? t('admin.editPlan') : t('admin.addPlanNew')}
              </h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditing(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSave} className="overflow-y-auto px-6 py-5 space-y-5">
              <div>
                <SectionHeader title={t('admin.generalSection')} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('admin.planName')}</label>
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      placeholder={t('admin.planNamePlaceholder')}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('admin.planSlug')}</label>
                    <input
                      type="text"
                      value={form.slug}
                      onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono"
                      placeholder="gold"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('admin.planDescription')}</label>
                    <textarea
                      rows="2"
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                      placeholder={t('admin.planDescriptionPlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('admin.planBadge')}</label>
                    <input
                      type="text"
                      value={form.badge}
                      onChange={(e) => setForm((p) => ({ ...p, badge: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      placeholder={t('admin.planBadgePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('admin.displayOrder')}</label>
                    <input
                      type="number"
                      min="0"
                      value={form.display_order}
                      onChange={(e) => setForm((p) => ({ ...p, display_order: Math.max(0, Number(e.target.value)) }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                        className="w-4 h-4 accent-emerald-600"
                      />
                      {t('admin.planActive')}
                    </label>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-100">
                <SectionHeader title={t('admin.pricingSection')} />
                <PlanPricingEditor value={form} onChange={(patch) => setForm((p) => ({ ...p, ...patch }))} />
              </div>

              <div className="border-t border-gray-100">
                <SectionHeader title={t('admin.discountSection')} />
                <DiscountEditor value={form.discount} onChange={(patch) => setForm((p) => ({ ...p, discount: { ...p.discount, ...patch } }))} />
              </div>

              <div className="border-t border-gray-100">
                <SectionHeader title={t('admin.featuresSection')} />
                <PlanFeatureEditor features={form.features} onChange={handleFeatureChange} />
              </div>

              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditing(null);
                  }}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-lg text-sm font-medium transition"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving || !form.name.trim() || !form.slug.trim()}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {t('admin.saveEdits')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
