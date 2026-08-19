import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowUpRight, ClipboardList, EyeOff, Hotel, Users, UserRound, Flag, Trophy } from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Card, PageHeader, StatWidget, Skeleton, Badge } from '../../../components/admin/ui'
import { activityTypeMeta, typeToneMap } from '../../../components/admin/activityMeta'

export default function Overview() {
  const { t } = useTranslation()
  const { data, loading } = useApi(() => api.get('/admin/stats').then((r) => r.data))
  const stats = data?.stats || {}

  const { data: activityData, loading: activityLoading } = useApi(
    () => api.get('/admin/activities', { params: { per_page: 5 } }).then((r) => r.data),
  )
  const activities = activityData?.activities || []

  const statConfig = [
    { key: 'total', label: t('admin.overview.stat.totalManagers'), icon: Users, tone: 'slate', to: '/admin/managers' },
    { key: 'pending', label: t('admin.overview.stat.pendingManagers'), icon: UserRound, tone: 'amber', to: '/admin/managers' },
    { key: 'approved', label: t('admin.overview.stat.approvedManagers'), icon: UserRound, tone: 'green', to: '/admin/managers' },
    { key: 'terrain_owners_total', label: t('admin.overview.stat.terrainOwnersTotal'), icon: Flag, tone: 'sky', to: '/admin/owners' },
    { key: 'terrain_owners_pending', label: t('admin.overview.stat.terrainOwnersPending'), icon: Flag, tone: 'amber', to: '/admin/owners' },
    { key: 'players_total', label: t('admin.overview.stat.playersTotal'), icon: Users, tone: 'violet', to: '/admin/players' },
    { key: 'players_pending', label: t('admin.overview.stat.playersPending'), icon: UserRound, tone: 'amber', to: '/admin/players' },
    { key: 'committees_total', label: t('admin.overview.stat.committeesTotal'), icon: Trophy, tone: 'violet', to: '/admin/committees' },
    { key: 'committees_pending', label: t('admin.overview.stat.committeesPending'), icon: Trophy, tone: 'amber', to: '/admin/committees' },
    { key: 'facilities_total', label: t('admin.overview.stat.facilitiesTotal'), icon: Hotel, tone: 'blue', to: '/admin/facilities' },
  ]

  const pendingCards = [
    { to: '/admin/managers', label: t('admin.overview.pending.managers'), count: stats.pending ?? 0, icon: Users, tone: 'bg-green-500' },
    { to: '/admin/owners', label: t('admin.overview.pending.owners'), count: stats.terrain_owners_pending ?? 0, icon: Flag, tone: 'bg-sky-500' },
    { to: '/admin/players', label: t('admin.overview.pending.players'), count: stats.players_pending ?? 0, icon: UserRound, tone: 'bg-violet-500' },
    { to: '/admin/committees', label: t('admin.overview.pending.committees'), count: stats.committees_pending ?? 0, icon: Trophy, tone: 'bg-violet-500' },
    { to: '/admin/moderation', label: t('admin.overview.pending.reports'), count: stats.reports_pending ?? 0, icon: ClipboardList, tone: 'bg-amber-500' },
    { to: '/admin/moderation', label: t('admin.overview.pending.hidden'), count: stats.hidden_total ?? 0, icon: EyeOff, tone: 'bg-red-500' },
  ]

  return (
    <div>
      <PageHeader
        title={t('admin.overview.title')}
        subtitle={t('admin.overview.subtitle')}
        actions={
          <Badge tone="green">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
            {t('admin.overview.healthy')}
          </Badge>
        }
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statConfig.map((s) => (
            <Link key={s.key} to={s.to} className="block">
              <StatWidget icon={s.icon} label={s.label} value={stats[s.key] ?? 0} tone={s.tone} />
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card title={t('admin.overview.pendingReview')} className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {pendingCards.map((p) => (
              <Link
                key={p.label}
                to={p.to}
                className="group rounded-3xl border border-slate-100 bg-slate-50/60 p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-green-200 hover:bg-white hover:shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <div className={`grid size-11 place-items-center rounded-2xl ${p.tone} text-white shadow-lg`}>
                    <p.icon className="size-5" strokeWidth={2.2} />
                  </div>
                  <ArrowUpRight className="size-4 text-slate-300 transition-colors group-hover:text-green-500" />
                </div>
                <p className="mt-4 text-2xl font-black text-slate-900">{p.count}</p>
                <p className="mt-0.5 text-xs font-semibold text-slate-500">{p.label}</p>
              </Link>
            ))}
          </div>
        </Card>

        <Card title={t('admin.overview.quickLinks')}>
          <div className="space-y-2">
            {[
              { to: '/admin/managers', label: t('admin.overview.links.manageManagers'), desc: t('admin.overview.links.manageManagersDesc') },
              { to: '/admin/owners', label: t('admin.overview.links.manageOwners'), desc: t('admin.overview.links.manageOwnersDesc') },
              { to: '/admin/players', label: t('admin.overview.links.managePlayers'), desc: t('admin.overview.links.managePlayersDesc') },
              { to: '/admin/moderation', label: t('admin.overview.links.moderation'), desc: t('admin.overview.links.moderationDesc') },
              { to: '/admin/activities', label: t('admin.overview.links.activity'), desc: t('admin.overview.links.activityDesc') },
              { to: '/admin/settings', label: t('admin.overview.links.settings'), desc: t('admin.overview.links.settingsDesc') },
            ].map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="group flex items-center justify-between gap-3 rounded-2xl border border-slate-100 px-4 py-3 transition-colors hover:border-green-200 hover:bg-green-50/50"
              >
                <div>
                  <p className="text-[13px] font-bold text-slate-800">{l.label}</p>
                  <p className="text-[11px] text-slate-500">{l.desc}</p>
                </div>
                <ArrowUpRight className="size-4 shrink-0 text-slate-300 transition-colors group-hover:text-green-500" />
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <Card
        title={t('admin.overview.activity.title')}
        className="mt-6"
        action={
          <Link to="/admin/activities" className="flex items-center gap-1 text-[11px] font-bold text-green-600 transition-colors hover:text-green-700">
            {t('admin.overview.activity.viewAll')}
            <ArrowUpRight className="size-3.5" />
          </Link>
        }
      >
        {activityLoading ? (
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-2xl" />)}
          </div>
        ) : activities.length === 0 ? (
          <p className="py-8 text-center text-xs font-semibold text-slate-400">{t('admin.overview.activity.empty')}</p>
        ) : (
          <div className="divide-y divide-slate-50">
            {activities.map((a) => {
              const meta = activityTypeMeta(a.type)
              const Icon = meta.icon
              return (
                <Link key={a.id} to="/admin/activities" className="flex items-center gap-3 py-2.5 transition-colors hover:bg-slate-50/70">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-xl ring-1 ${typeToneMap[meta.tone] || 'bg-slate-50 text-slate-500 ring-slate-100'}`}>
                    <Icon className="size-4" strokeWidth={2.1} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-bold text-slate-800">{meta.label}</span>
                    {a.subject?.summary && <span className="block truncate text-[11px] font-semibold text-slate-400">{a.subject.summary}</span>}
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-0.5">
                    {a.actor && <span className="max-w-[120px] truncate text-[11px] font-bold text-slate-500">{a.actor.name}</span>}
                    <span className="text-[10px] font-semibold text-slate-400">
                      {a.created_at
                        ? new Date(a.created_at).toLocaleString('ar-MA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </span>
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
