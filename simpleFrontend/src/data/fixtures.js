export const LIVE_STATUSES = new Set(['kickoff', 'first_half', 'halftime', 'second_half', 'extra_time', 'penalties'])

export const PILL_STYLES = {
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  live: 'bg-rose-50 text-rose-600 ring-rose-200',
  upcoming: 'bg-sky-50 text-sky-700 ring-sky-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  postponed: 'bg-orange-50 text-orange-600 ring-orange-200',
  cancelled: 'bg-slate-100 text-slate-500 ring-slate-200',
}
