import { Users } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import UserApproval from '../../../components/admin/UserApproval'
import { EmptyState } from '../../../components/admin/ui'
import { logoThumb } from '../../../lib/thumb'

export default function Managers() {
  const { data } = useApi(() => api.get('/admin/stats').then((r) => r.data))
  const s = data?.stats || {}

  const tabs = [
    { value: 'pending', label: 'بانتظار الموافقة', count: s.pending },
    { value: 'approved', label: 'مفعلون', count: s.approved },
    { value: 'rejected', label: 'مرفوضون', count: s.rejected },
    { value: 'blocked', label: 'محظورون', count: s.blocked },
    { value: 'all', label: 'الكل', count: s.total },
  ]

  return (
    <UserApproval
      endpoint="/admin/managers"
      dataKey="managers"
      title="المسيرون"
      subtitle="إدارة حسابات مسيري الفرق، مراجعة الطلبات والموافقة عليها"
      tabs={tabs}
      detailTitle="تفاصيل حساب المسير"
      extraColumns={[
        {
          key: 'team',
          label: 'الفريق',
          render: (u) => (
            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-700">
              <Users className="size-4 text-slate-400" />
              {u.team?.name || 'بدون فريق'}
            </span>
          ),
        },
      ]}
      renderDetail={(row, detail) => {
        const team = detail?.team || row?.team
        if (!team) {
          return (
            <div className="rounded-3xl bg-slate-50 p-6">
              <EmptyState icon={Users} title="لم يسجل هذا المسير فريقاً بعد" description="يمكن للمسير إضافة فريقه من حساب مدير الفريق." />
            </div>
          )
        }
        return (
          <div className="rounded-3xl border border-slate-100 p-5">
            <p className="mb-4 text-[11px] font-black uppercase tracking-wider text-slate-400">معلومات الفريق</p>
            <div className="flex items-center gap-4">
              <div className="grid size-14 place-items-center rounded-2xl bg-gradient-to-br from-green-500/15 to-emerald-500/15 text-2xl">
                {team.logo_url ? (
                  <img loading="lazy" decoding="async" src={logoThumb(team)} alt="" className="size-14 rounded-2xl object-cover" />
                ) : (
                  <Users className="size-6 text-green-600" />
                )}
              </div>
              <div>
                <p className="text-base font-black text-slate-900">{team.name}</p>
                <p className="mt-0.5 text-xs text-slate-400">{team.city || '—'}</p>
              </div>
            </div>
            {team.description && <p className="mt-4 text-[13px] leading-relaxed text-slate-500">{team.description}</p>}
          </div>
        )
      }}
    />
  )
}
