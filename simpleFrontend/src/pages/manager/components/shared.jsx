import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import i18n from '../../../i18n'

export const categoryLabels = { adult: 'كبار', teenager: 'شباب', children: 'أطفال' }
export const levelLabels = { beginner: 'مبتدئ', amateur: 'هواة', semi_pro: 'نصف محترف', pro: 'محترف' }
export const positionLabels = { goalkeeper: 'حارس مرمى', defender: 'مدافع', midfielder: 'وسط ميدان', forward: 'مهاجم' }
export const bookingTypeLabels = { training: 'تدريب', private: 'حجز خاص', match: 'مباراة' }

const dateLocale = () => (i18n.language?.startsWith('en') ? 'en-GB' : 'ar-MA')

export const tintClasses = {
  green: 'bg-green-50 text-green-600',
  sky: 'bg-sky-50 text-sky-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  rose: 'bg-rose-50 text-rose-600',
  slate: 'bg-slate-100 text-slate-500',
}

export function Section({ icon: Icon, title, subtitle, action, badge, defaultOpen = true, tint = 'green', id, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div
      id={id}
      className="overflow-hidden rounded-[26px] border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
    >
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 px-5 py-4 text-start">
        <span className={`grid size-10 shrink-0 place-items-center rounded-2xl ${tintClasses[tint] || tintClasses.green}`}>
          <Icon className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
            {badge}
          </div>
          {subtitle && <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{subtitle}</p>}
        </div>
        {action}
        <ChevronDown className={`size-4 shrink-0 text-slate-300 transition-transform duration-200 ${open ? '' : '-rotate-90'}`} />
      </button>
      {open && <div className="border-t border-slate-100 px-5 pb-5 pt-4">{children}</div>}
    </div>
  )
}

export function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return i18n.t('common.now')
  if (mins < 60) return i18n.t('common.minutesAgo', { count: mins })
  const hours = Math.floor(mins / 60)
  if (hours < 24) return i18n.t('common.hoursAgo', { count: hours })
  const days = Math.floor(hours / 24)
  if (days < 7) return i18n.t('common.daysAgo', { count: days })
  return new Date(dateStr).toLocaleDateString(dateLocale(), { day: 'numeric', month: 'long' })
}

export function formatDate(d) {
  if (!d) return '—'
  try {
    return new Intl.DateTimeFormat(dateLocale(), { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(d))
  } catch {
    return '—'
  }
}

export function formatTime(d) {
  if (!d) return '—'
  try {
    return new Intl.DateTimeFormat(dateLocale(), { hour: '2-digit', minute: '2-digit' }).format(new Date(d))
  } catch {
    return '—'
  }
}

export function isSameDay(a, now = new Date()) {
  if (!a) return false
  const d = new Date(a)
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate()
}

export function opponentOf(match, myTeamId) {
  if (!match) return null
  if (match.host_team_id === myTeamId) return match.opponent_team || null
  return match.host_team || null
}

export function isHost(match, myTeamId) {
  if (!match) return false
  return match.host_team_id === myTeamId
}

export function initials(name) {
  return (name || '؟').slice(0, 1)
}
