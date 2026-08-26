import { UserRound, Ruler, Weight, CalendarDays, Languages } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import UserApproval from '../../../components/admin/UserApproval'
import { EmptyState, Badge } from '../../../components/admin/ui'

export default function Players() {
  const { data } = useApi(() => api.get('/admin/stats').then((r) => r.data))
  const s = data?.stats || {}

  const tabs = [
    { value: 'pending', label: 'بانتظار الموافقة', count: s.players_pending },
    { value: 'approved', label: 'مفعلون', count: s.players_approved },
    { value: 'rejected', label: 'مرفوضون', count: s.players_rejected },
    { value: 'blocked', label: 'محظورون', count: s.players_blocked },
    { value: 'all', label: 'الكل', count: s.players_total },
  ]

  return (
    <UserApproval
      endpoint="/admin/players"
      dataKey="players"
      title="اللاعبون الأحرار"
      subtitle="إدارة حسابات لاعبي الميركاطو والموافقة على طلباتهم"
      tabs={tabs}
      detailTitle="تفاصيل اللاعب"
      showPlan
      extraColumns={[
        {
          key: 'position',
          label: 'المركز',
          render: (u) => (
            <Badge tone="violet">
              <UserRound className="size-3.5" />
              {u.player_profile?.position || u.playerProfile?.position || 'غير محدد'}
            </Badge>
          ),
        },
      ]}
      renderDetail={(row, detail) => {
        const p = detail?.player_profile || detail?.playerProfile || row?.player_profile || row?.playerProfile
        if (!p) {
          return (
            <div className="rounded-3xl bg-slate-50 p-6">
              <EmptyState icon={UserRound} title="لا توجد بيانات لعب مكتملة" description="لم يملأ هذا اللاعب ملفه الرياضي بعد." />
            </div>
          )
        }
        const items = [
          { icon: UserRound, label: 'المركز', value: p.position },
          { icon: Ruler, label: 'الطول', value: p.height_cm ? `${p.height_cm} سم` : '—' },
          { icon: Weight, label: 'الوزن', value: p.weight_kg ? `${p.weight_kg} كغ` : '—' },
          { icon: CalendarDays, label: 'سنة الميلاد', value: p.birth_year || '—' },
          { icon: Languages, label: 'الجنسية', value: p.nationality || '—' },
        ]
        return (
          <div>
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((it) => (
                <div key={it.label} className="flex items-center gap-3 rounded-2xl border border-slate-100 p-4">
                  <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-600">
                    <it.icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-400">{it.label}</p>
                    <p className="text-sm font-bold text-slate-800">{it.value || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
            {p.preferred_formats?.length > 0 && (
              <div className="mt-4 rounded-2xl border border-slate-100 p-4">
                <p className="mb-2 text-[11px] text-slate-400">الصيغ المفضلة</p>
                <div className="flex flex-wrap gap-2">
                  {p.preferred_formats.map((f) => (
                    <Badge key={f} tone="green">{f}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      }}
    />
  )
}
