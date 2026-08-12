import { Flag, MapPin, Building2 } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import UserApproval from '../../../components/admin/UserApproval'
import { EmptyState, Badge } from '../../../components/admin/ui'

export default function Owners() {
  const { data } = useApi(() => api.get('/admin/stats').then((r) => r.data))
  const s = data?.stats || {}

  const tabs = [
    { value: 'pending', label: 'بانتظار الموافقة', count: s.terrain_owners_pending },
    { value: 'approved', label: 'مفعلون', count: s.terrain_owners_approved },
    { value: 'rejected', label: 'مرفوضون', count: s.terrain_owners_rejected },
    { value: 'blocked', label: 'محظورون', count: s.terrain_owners_blocked },
    { value: 'all', label: 'الكل', count: s.terrain_owners_total },
  ]

  return (
    <UserApproval
      endpoint="/admin/terrain-owners"
      dataKey="owners"
      title="أصحاب الملاعب"
      subtitle="إدارة حسابات أصحاب التيران والموافقة على طلباتهم"
      tabs={tabs}
      detailTitle="تفاصيل صاحب الملاعب"
      extraColumns={[
        {
          key: 'terrains',
          label: 'الملاعب',
          render: (u) => (
            <Badge tone="sky">
              <Building2 className="size-3.5" />
              {u.terrains?.length || 0} ملعب
            </Badge>
          ),
        },
      ]}
      renderDetail={(row, detail) => {
        const terrains = detail?.terrains || row?.terrains || []
        if (terrains.length === 0) {
          return (
            <div className="rounded-3xl bg-slate-50 p-6">
              <EmptyState icon={Flag} title="لا توجد ملاعب مسجلة" description="لم يضف صاحب الملاعب أي تيران بعد." />
            </div>
          )
        }
        return (
          <div className="space-y-3">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">
              الملاعب المسجلة ({terrains.length})
            </p>
            {terrains.map((t) => (
              <div key={t.id} className="rounded-3xl border border-slate-100 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {t.main_image_url ? (
                      <img loading="lazy" decoding="async" src={t.main_image_url} alt="" className="size-12 rounded-2xl object-cover" />
                    ) : (
                      <div className="grid size-12 place-items-center rounded-2xl bg-sky-500/15 text-sky-600">
                        <Flag className="size-5" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-bold text-slate-900">{t.name}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                        <MapPin className="size-3" />
                        {t.city || '—'}
                      </p>
                    </div>
                  </div>
                  <StatusPill status={t.status} />
                </div>
                {t.description && <p className="mt-3 text-xs leading-relaxed text-slate-500">{t.description}</p>}
              </div>
            ))}
          </div>
        )
      }}
    />
  )
}

function StatusPill({ status }) {
  const meta = {
    active: { label: 'مفعل', tone: 'bg-emerald-50 text-emerald-700' },
    inactive: { label: 'معطل', tone: 'bg-slate-100 text-slate-500' },
    pending: { label: 'قيد المراجعة', tone: 'bg-amber-50 text-amber-700' },
  }[status] || { label: status, tone: 'bg-slate-100 text-slate-500' }
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${meta.tone}`}>{meta.label}</span>
}
