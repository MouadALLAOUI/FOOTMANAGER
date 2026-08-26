import { Trophy, UserPlus, CalendarDays, Flag, Building2, Medal, Award, CalendarCheck, Star, Activity, UserCog, Shield, ShieldAlert, ShieldOff, UserMinus, CreditCard, ArrowRightLeft, XCircle } from 'lucide-react'

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
  sub_admin_created: { icon: UserPlus, label: 'إنشاء مسؤول فرعي', tone: 'sky' },
  sub_admin_updated: { icon: UserCog, label: 'تحديث مسؤول فرعي', tone: 'sky' },
  sub_admin_permissions_changed: { icon: Shield, label: 'تغيير صلاحيات', tone: 'violet' },
  sub_admin_blocked: { icon: ShieldOff, label: 'حظر مسؤول فرعي', tone: 'rose' },
  sub_admin_activated: { icon: Shield, label: 'تفعيل مسؤول فرعي', tone: 'green' },
  sub_admin_removed: { icon: UserMinus, label: 'حذف مسؤول فرعي', tone: 'rose' },
  plan_assigned: { icon: CreditCard, label: 'تعيين خطة', tone: 'sky' },
  plan_changed: { icon: ArrowRightLeft, label: 'تغيير خطة', tone: 'violet' },
  plan_removed: { icon: XCircle, label: 'إلغاء اشتراك', tone: 'rose' },
}

export const typeToneMap = {
  green: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
  sky: 'bg-sky-50 text-sky-600 ring-sky-100',
  violet: 'bg-violet-50 text-violet-600 ring-violet-100',
  amber: 'bg-amber-50 text-amber-600 ring-amber-100',
  rose: 'bg-rose-50 text-rose-600 ring-rose-100',
}

export function activityTypeMeta(type) {
  return typeMeta[type] || { icon: Activity, label: type, tone: 'slate' }
}
