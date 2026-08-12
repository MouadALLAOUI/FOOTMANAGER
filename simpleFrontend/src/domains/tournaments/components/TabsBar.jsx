import React from 'react'

export default function TabsBar({ tabs, active, setActive, t }) {
  return (
    <div className="mb-6 flex gap-1.5 overflow-x-auto rounded-2xl bg-white p-1.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] ring-1 ring-slate-200/60">
      {tabs.map(({ key, icon: Icon, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => setActive(key)}
          className={`flex shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-colors ${active === key ? 'bg-green-500 text-white shadow-[0_8px_20px_rgba(22,163,74,0.3)]' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
            }`}
        >
          <Icon className="size-4" />
          {t(label)}
        </button>
      ))}
    </div>
  )
}
