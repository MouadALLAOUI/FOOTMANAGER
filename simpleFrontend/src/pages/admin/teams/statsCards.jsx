import { useTranslation } from 'react-i18next'
import { Shield, Sparkles, UserRound, Lock } from 'lucide-react'

export default function StatsCards({ stats = {}, activeTab, onSelectTab }) {
  const { t } = useTranslation()

  const cards = [
    {
      id: 'all',
      title: t('adminTeams.allTeams', 'كل الفرق'),
      count: stats.total ?? 0,
      icon: Shield,
      color: 'from-blue-500/10 to-indigo-500/10 text-blue-600 border-blue-100',
      description: 'إجمالي الفرق المسجلة في المنصة',
    },
    {
      id: 'free',
      title: t('adminTeams.freeTeams', 'فرق حرة (للحذف)'),
      count: stats.free ?? 0,
      icon: Sparkles,
      color: 'from-amber-500/10 to-orange-500/10 text-amber-600 border-amber-200/80',
      description: 'فرق تم إنشاؤها بالبطولات - قابلة للحذف نهائياً',
      badge: 'قابلة للحذف',
      badgeTone: 'bg-amber-100 text-amber-800',
    },
    {
      id: 'manager',
      title: t('adminTeams.managerTeams', 'فرق المسيرين (محمية)'),
      count: stats.manager ?? 0,
      icon: UserRound,
      color: 'from-emerald-500/10 to-teal-500/10 text-emerald-600 border-emerald-100',
      description: 'مرتبطة بحسابات مسيرين معتمدة - لا يمكن حذفها',
      badge: 'محمية',
      badgeTone: 'bg-emerald-100 text-emerald-800',
      extraIcon: Lock,
    },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
      {cards.map((c) => {
        const Icon = c.icon
        const ExtraIcon = c.extraIcon
        const active = activeTab === c.id

        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelectTab(c.id)}
            className={`flex flex-col text-start rounded-3xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${
              active
                ? 'border-green-500 bg-white ring-2 ring-green-500/20 shadow-sm'
                : 'border-slate-200/70 bg-white/80 hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <div className={`grid size-12 place-items-center rounded-2xl bg-gradient-to-br ${c.color}`}>
                <Icon className="size-6" />
              </div>
              {c.badge && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${c.badgeTone}`}>
                  {ExtraIcon && <ExtraIcon className="size-3" />}
                  {c.badge}
                </span>
              )}
            </div>

            <p className="text-2xl font-black text-slate-900">{c.count}</p>
            <p className="text-xs font-bold text-slate-700 mt-0.5">{c.title}</p>
            <p className="text-[11px] text-slate-400 mt-1">{c.description}</p>
          </button>
        )
      })}
    </div>
  )
}
