import React from 'react'
import { useTranslation } from 'react-i18next'

export default function SummaryChips({ summary }) {
  const { t } = useTranslation()
  if (!summary) return null
  const s = summary
  const items = [
    { key: 'total', label: t('committee.detail.chipTotal', { count: s.total }), cls: 'bg-slate-100 text-slate-600' },
    { key: 'completed', label: t('committee.detail.chipCompleted', { count: s.completed }), cls: 'bg-emerald-50 text-emerald-700' },
    { key: 'upcoming', label: t('committee.detail.chipUpcoming', { count: s.upcoming }), cls: 'bg-sky-50 text-sky-700' },
    { key: 'pending', label: t('committee.detail.chipPending', { count: s.pending }), cls: 'bg-amber-50 text-amber-700' },
  ]
  if (s.live) items.push({ key: 'live', label: t('committee.detail.chipLive', { count: s.live }), cls: 'bg-rose-50 text-rose-600' })
  if (s.postponed) items.push({ key: 'postponed', label: t('committee.detail.chipPostponed', { count: s.postponed }), cls: 'bg-orange-50 text-orange-600' })
  if (s.cancelled) items.push({ key: 'cancelled', label: t('committee.detail.chipCancelled', { count: s.cancelled }), cls: 'bg-slate-100 text-slate-500' })
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((c) => (
        <span key={c.key} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ring-black/5 ${c.cls}`}>
          {c.label}
        </span>
      ))}
    </div>
  )
}
