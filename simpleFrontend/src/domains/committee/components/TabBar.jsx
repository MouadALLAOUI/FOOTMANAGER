import React from 'react'
import {
  Calendar,
  Sliders,
  BarChart3,
  Users,
  CheckCircle2,
  FileText,
} from 'lucide-react'

const TAB_CONFIGS = {
  players: {
    icon: Users,
    bgActive: 'bg-[#00C853] text-white shadow-[#00C853]/30',
    bgInactive: 'bg-emerald-50/70 text-emerald-800 border-emerald-200/80 hover:bg-emerald-100/60',
    iconColor: 'text-[#00C853]',
    title: 'التشكيلة',
  },
  stats: {
    icon: BarChart3,
    bgActive: 'bg-[#FF9100] text-white shadow-[#FF9100]/30',
    bgInactive: 'bg-amber-50/70 text-amber-800 border-amber-200/80 hover:bg-amber-100/60',
    iconColor: 'text-[#FF9100]',
    title: 'إحصائيات',
  },
  notes: {
    icon: Sliders,
    bgActive: 'bg-[#8A2BE2] text-white shadow-[#8A2BE2]/30',
    bgInactive: 'bg-purple-50/70 text-purple-800 border-purple-200/80 hover:bg-purple-100/60',
    iconColor: 'text-[#8A2BE2]',
    title: 'إعدادات',
  },
  timeline: {
    icon: Calendar,
    bgActive: 'bg-[#087FFF] text-white shadow-[#087FFF]/30',
    bgInactive: 'bg-blue-50/70 text-blue-800 border-blue-200/80 hover:bg-blue-100/60',
    iconColor: 'text-[#087FFF]',
    title: 'تفاصيل المباراة',
  },
  presence: {
    icon: CheckCircle2,
    bgActive: 'bg-teal-600 text-white shadow-teal-600/30',
    bgInactive: 'bg-teal-50/70 text-teal-800 border-teal-200/80 hover:bg-teal-100/60',
    iconColor: 'text-teal-600',
    title: 'الحضور',
  },
}

export default function TabBar({ tabs, active, onChange, t }) {
  return (
    <div
      role="tablist"
      aria-label={t('committee.result.summary')}
      className="grid grid-cols-4 sm:grid-cols-5 gap-2 my-1"
    >
      {tabs.map((tab) => {
        const selected = active === tab.id
        const cfg = TAB_CONFIGS[tab.id] || {
          icon: FileText,
          bgActive: 'bg-slate-900 text-white',
          bgInactive: 'bg-slate-100 text-slate-700 border-slate-200',
          iconColor: 'text-slate-600',
          title: t(tab.labelKey),
        }
        const IconComponent = cfg.icon

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`relative flex flex-col items-center justify-center gap-1 py-2.5 px-1 rounded-2xl border transition-all duration-150 select-none active:scale-95 shadow-xs ${
              selected
                ? `${cfg.bgActive} border-transparent shadow-md font-black`
                : `bg-white ${cfg.bgInactive} font-bold text-slate-700`
            }`}
          >
            {/* Notification Badge */}
            {Boolean(tab.badge) && (
              <span
                className={`absolute -top-1.5 -end-1.5 grid min-w-[18px] h-[18px] place-items-center rounded-full px-1 text-[10px] font-black leading-none shadow-xs ${
                  selected
                    ? 'bg-white text-slate-900'
                    : 'bg-[#FF9100] text-white'
                }`}
              >
                {tab.badge}
              </span>
            )}

            <div
              className={`size-7 rounded-xl grid place-items-center transition-colors ${
                selected ? 'bg-white/20 text-white' : `${cfg.iconColor}`
              }`}
            >
              <IconComponent className="size-4" />
            </div>

            <span className="text-[11px] leading-tight text-center truncate max-w-full px-1">
              {cfg.title || t(tab.labelKey)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
