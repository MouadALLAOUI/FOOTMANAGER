import { Trophy } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import UserApproval from '../../../components/admin/UserApproval'

export default function Committees() {
  const { data } = useApi(() => api.get('/admin/stats').then((r) => r.data))
  const s = data?.stats || {}

  const tabs = [
    { value: 'pending', label: 'بانتظار الموافقة', count: s.committees_pending },
    { value: 'approved', label: 'مفعلون', count: s.committees_approved },
    { value: 'rejected', label: 'مرفوضون', count: s.committees_rejected },
    { value: 'blocked', label: 'محظورون', count: s.committees_blocked },
    { value: 'all', label: 'الكل', count: s.committees_total },
  ]

  return (
    <UserApproval
      endpoint="/admin/committees"
      dataKey="committees"
      title="اللجان المنظمة"
      subtitle="إدارة حسابات اللجان المنظمة للبطولات والموافقة على طلباتهم"
      tabs={tabs}
      detailTitle="تفاصيل اللجنة المنظمة"
      showPlan
      extraColumns={[
        {
          key: 'role',
          label: 'الدور',
          render: () => (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-bold text-green-700">
              <Trophy className="size-3.5" />
              لجنة منظمة
            </span>
          ),
        },
      ]}
    />
  )
}
