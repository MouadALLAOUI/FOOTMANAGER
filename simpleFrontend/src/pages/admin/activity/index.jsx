import { useState } from 'react'
import {
  Trophy, UserPlus, CalendarDays, Flag, Building2, Medal, Award, CalendarCheck, Star, Activity,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import DataTable from '../../../components/admin/DataTable'
import { PageHeader, Avatar, Badge } from '../../../components/admin/ui'

const typeMeta = {
  team_created: { icon: Trophy, label: 'إنشاء فريق', tone: 'green' },
  player_joined: { icon: UserPlus, label: 'انضمام لاعب', tone: 'sky' },
  match_created: { icon: CalendarDays, label: 'إنشاء مباراة', tone: 'violet' },
  match_finished: { icon: Flag, label: 'انتهاء مباراة', tone: 'amber' },
  team_won: { icon: Trophy, label: 'فوز فريق', tone: 'green' },
  stadium_created: { icon: Building2, label: 'إضافة ملعب', tone: 'sky' },
  top_scorer: { icon: Medal, label: 'أفضل مسجل', tone: 'amber' },
  achievement_unlocked: { icon: Award, label: 'إنجاز', tone: 'violet' },
  booking_completed: { icon: CalendarCheck, label: 'حجز مكتمل', tone: 'green' },
  review_added: { icon: Star, label: 'تقييم جديد', tone: 'amber' },
}

const typeToneMap = {
  green: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  sky: 'bg-sky-50 text-sky-600 ring-sky-100',
  violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
}

const typeOptions = Object.entries(typeMeta)

export default function ActivityLog() {
  const [type, setType] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const { data, loading } = useApi(
    () => api.get('/admin/activities', { params: { type, search, page, per_page: 15 } }).then((r) => r.data),
    [type, search, page],
  )

  const rows = data?.activities || []
  const pagination = data?.pagination || {}

  const columns = [
    {
      key: 'type',
      label: 'الحدث',
      render: (a) => {
        const meta = typeMeta[a.type] || { icon: Activity, label: a.type, tone: 'slate' }
        const Icon = meta.icon
        return (
          <div className="flex items-center gap-3">
            <div className={`grid size-11 shrink-0 place-items-center rounded-2xl ring-1 ${typeToneMap[meta.tone]}`}>
              <Icon className="size-5" strokeWidth={2.1} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-900">{meta.label}</p>
              {a.subject?.summary && <p className="mt-0.5 max-w-[260px] truncate text-xs text-slate-400">{a.subject.summary}</p>}
            </div>
          </div>
        )
      },
    },
    {
      key: 'actor',
      label: 'الفاعل',
      render: (a) =>
        a.actor ? (
          <div className="flex items-center gap-2">
            <Avatar name={a.actor.name} className="size-8 text-xs" />
            <span className="text-[13px] font-semibold text-slate-700">{a.actor.name}</span>
          </div>
        ) : (
          <span className="text-xs text-slate-400">النظام</span>
        ),
    },
    {
      key: 'data',
      label: 'تفاصيل',
      render: (a) =>
        a.data && Object.keys(a.data).length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(a.data).slice(0, 3).map(([k, v]) => (
              <Badge key={k} tone="slate" className="!text-[10px]">
                {k}: {String(v)}
              </Badge>
            ))}
          </div>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        ),
    },
    {
      key: 'created_at',
      label: 'الوقت',
      className: 'text-end',
      render: (a) => (
        <span className="text-[13px] text-slate-500">
          {a.created_at
            ? new Date(a.created_at).toLocaleString('ar-MA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
            : '—'}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="سجل النشاط"
        subtitle="تتبع جميع الأحداث التي تحدث على المنصة"
        actions={
          <select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1) }}
            className="h-11 cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-green-500/60 focus:ring-4 focus:ring-green-500/10"
          >
            <option value="all">كل الأحداث</option>
            {typeOptions.map(([val, meta]) => (
              <option key={val} value={val}>{meta.label}</option>
            ))}
          </select>
        }
      />

      <DataTable
        rows={rows}
        loading={loading}
        columns={columns}
        search={search}
        onSearch={(v) => { setSearch(v); setPage(1) }}
        searchPlaceholder="بحث عن الفاعل بالاسم أو البريد..."
        onRowClick={() => {}}
        page={pagination.current_page || 1}
        lastPage={pagination.last_page || 1}
        total={pagination.total || 0}
        perPage={pagination.per_page || 15}
        onPageChange={setPage}
        emptyTitle="لا توجد أحداث"
        emptyDescription="عندما تحدث أحداث على المنصة ستظهر هنا."
      />
    </div>
  )
}
