export const EVENT_META = {
  goal: { icon: '⚽', dot: 'bg-emerald-500', labelKey: 'committee.result.ev.goal', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  own_goal: { icon: '🥅', dot: 'bg-emerald-500', labelKey: 'committee.result.ev.ownGoal', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  penalty_goal: { icon: '🥅', dot: 'bg-violet-500', labelKey: 'committee.result.ev.penaltyGoal', tone: 'bg-violet-50 text-violet-700 ring-violet-200' },
  missed_penalty: { icon: '✖', dot: 'bg-slate-400', labelKey: 'committee.result.ev.missedPenalty', tone: 'bg-slate-100 text-slate-500 ring-slate-200' },
  yellow_card: { icon: '🟨', dot: 'bg-amber-400', labelKey: 'committee.result.ev.yellowCard', tone: 'bg-amber-50 text-amber-700 ring-amber-200' },
  second_yellow: { icon: '🟨🟥', dot: 'bg-rose-400', labelKey: 'committee.result.ev.secondYellow', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  red_card: { icon: '🟥', dot: 'bg-rose-500', labelKey: 'committee.result.ev.redCard', tone: 'bg-rose-50 text-rose-700 ring-rose-200' },
  substitution: { icon: '🔄', dot: 'bg-sky-500', labelKey: 'committee.result.ev.substitution', tone: 'bg-sky-50 text-sky-700 ring-sky-200' },
  injury: { icon: '🩹', dot: 'bg-orange-400', labelKey: 'committee.result.ev.injury', tone: 'bg-orange-50 text-orange-700 ring-orange-200' },
  other: { icon: '📝', dot: 'bg-slate-400', labelKey: 'committee.result.ev.note', tone: 'bg-slate-100 text-slate-600 ring-slate-200' },
}

export const minuteText = (m, added) => (Number(added) > 0 ? `${Number(m) || 0}'+${Number(added)}` : `${Number(m) || 0}'`)
