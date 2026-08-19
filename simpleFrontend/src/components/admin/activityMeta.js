import { Trophy, UserPlus, CalendarDays, Flag, Building2, Medal, Award, CalendarCheck, Star, Activity } from 'lucide-react'

export const typeMeta = {
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

export const typeToneMap = {
  green: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  sky: 'bg-sky-50 text-sky-600 ring-sky-100',
  violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
}

export function activityTypeMeta(type) {
  return typeMeta[type] || { icon: Activity, label: type, tone: 'slate' }
}
