import React from 'react'

export default function SectionCard({ title, icon: Icon, children, action, bodyClassName = '' }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h4 className="flex items-center gap-2 text-xs font-black text-slate-800">
          {Icon && <Icon className="size-4 text-slate-400" />}
          {title}
        </h4>
        {action}
      </div>
      <div className={`p-4 ${bodyClassName}`}>{children}</div>
    </div>
  )
}
