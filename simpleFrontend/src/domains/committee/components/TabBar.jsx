import React from 'react'

export default function TabBar({ tabs, active, onChange, t }) {
  return (
    <div role="tablist" aria-label={t('committee.result.summary')} className="flex shrink-0 gap-1 overflow-x-auto rounded-2xl border border-slate-200/70 bg-slate-50/80 p-1">
      {tabs.map((tab) => {
        const selected = active === tab.id
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(tab.id)}
            className={`inline-flex min-h-[40px] min-w-[max-content] flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-black transition-all ${
              selected ? 'bg-white text-green-700 shadow-[0_1px_2px_rgba(15,23,42,0.08)]' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <span className="text-base leading-none">{tab.icon}</span>
            <span className="whitespace-nowrap">{t(tab.labelKey)}</span>
            {!!tab.badge && (
              <span className="grid min-w-[18px] place-items-center rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-black leading-none text-white">
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}