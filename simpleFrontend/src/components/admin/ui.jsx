import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'
import {
  X,
  Inbox,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

export function cn(...parts) {
  return parts.filter(Boolean).join(' ')
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  loading = false,
  disabled = false,
  ...props
}) {
  const styles = {
    primary: 'bg-green-500 text-white shadow-[0_8px_20px_rgba(22,163,74,0.28)] hover:bg-green-600 hover:shadow-[0_10px_24px_rgba(22,163,74,0.34)]',
    outline: 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
    ghost: 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
    soft: 'bg-green-50 text-green-700 hover:bg-green-100',
    danger: 'bg-rose-500 text-white shadow-[0_8px_20px_rgba(244,63,94,0.28)] hover:bg-rose-600',
    dangerSoft: 'bg-rose-50 text-rose-600 hover:bg-rose-100',
    softRed: 'bg-rose-50 text-rose-600 hover:bg-rose-100',
    softAmber: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
    softViolet: 'bg-violet-50 text-violet-700 hover:bg-violet-100',
    red: 'bg-rose-500 text-white shadow-[0_8px_20px_rgba(244,63,94,0.28)] hover:bg-rose-600',
  }
  const sizes = {
    sm: 'h-9 gap-1.5 rounded-xl px-3.5 text-xs',
    md: 'h-11 gap-2 rounded-xl px-5 text-sm',
    lg: 'h-12 gap-2 rounded-2xl px-6 text-sm',
  }
  return (
    <button
      type={type}
      aria-busy={loading || undefined}
      disabled={loading || disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-bold transition-all duration-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        styles[variant] || styles.primary,
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}

const toneMap = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-rose-50 text-rose-600 ring-rose-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200',
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  danger: 'bg-rose-50 text-rose-600 ring-rose-200',
}

export function Badge({ tone = 'slate', variant, children, className = '' }) {
  const toneClass = toneMap[tone] || toneMap[variant] || toneMap.slate
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1', toneClass, className)}>
      {children}
    </span>
  )
}

const statusMeta = {
  approved: { tone: 'green', label: 'status.approved' },
  active: { tone: 'green', label: 'status.active' },
  open: { tone: 'green', label: 'status.open' },
  confirmed: { tone: 'green', label: 'status.confirmed' },
  completed: { tone: 'green', label: 'status.completed' },
  accepted: { tone: 'green', label: 'status.accepted' },
  resolved: { tone: 'green', label: 'status.resolved' },
  published: { tone: 'green', label: 'status.published' },
  available: { tone: 'green', label: 'status.available' },
  open_for_registration: { tone: 'green', label: 'status.open_for_registration' },
  reviewed: { tone: 'sky', label: 'status.reviewed' },
  vacation: { tone: 'sky', label: 'status.vacation' },
  private: { tone: 'sky', label: 'status.private' },
  finished: { tone: 'sky', label: 'status.finished' },
  in_progress: { tone: 'sky', label: 'status.in_progress' },
  pending: { tone: 'amber', label: 'status.pending' },
  pending_confirmation: { tone: 'amber', label: 'status.pending_confirmation' },
  disputed: { tone: 'amber', label: 'status.disputed' },
  busy: { tone: 'amber', label: 'status.busy' },
  registration_closed: { tone: 'amber', label: 'status.registration_closed' },
  rejected: { tone: 'red', label: 'status.rejected' },
  declined: { tone: 'red', label: 'status.declined' },
  blocked: { tone: 'red', label: 'status.blocked' },
  live: { tone: 'red', label: 'status.live' },
  unavailable: { tone: 'red', label: 'status.unavailable' },
  injured: { tone: 'red', label: 'status.injured' },
  dismissed: { tone: 'slate', label: 'status.dismissed' },
  cancelled: { tone: 'slate', label: 'status.cancelled' },
  none: { tone: 'slate', label: 'status.none' },
  draft: { tone: 'slate', label: 'status.draft' },
  hidden: { tone: 'violet', label: 'status.hidden' },
  training: { tone: 'violet', label: 'status.training' },
}

export function StatusBadge({ status }) {
  const { t } = useTranslation()
  const meta = statusMeta[status] || { tone: 'slate', label: status }
  return <Badge tone={meta.tone}>{t(meta.label)}</Badge>
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}

export function Card({ children, className = '', title, subtitle, action, pad = true, noPadding = false, bodyClassName = '' }) {
  const noPad = noPadding || pad === false
  return (
    <div className={cn('rounded-3xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={noPad ? bodyClassName : cn('p-6', bodyClassName)}>{children}</div>
    </div>
  )
}

const statTones = {
  green: 'bg-emerald-500/15 text-emerald-600',
  amber: 'bg-amber-500/15 text-amber-600',
  red: 'bg-rose-500/15 text-rose-600',
  sky: 'bg-sky-500/15 text-sky-600',
  violet: 'bg-violet-500/15 text-violet-600',
  slate: 'bg-slate-500/15 text-slate-600',
}

export function StatWidget({ icon: Icon, label, value, hint, tone = 'green' }) {
  const body = (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{value}</p>
        </div>
        <div className={cn('grid size-11 shrink-0 place-items-center rounded-2xl', statTones[tone])}>
          <Icon className="size-5" strokeWidth={2.2} />
        </div>
      </div>
      {hint && <p className="mt-3 text-[11px] font-medium text-slate-500">{hint}</p>}
    </div>
  )
  return body
}

export function Field({ label, children, hint, required }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-bold text-slate-700">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10'

export function Input(props) {
  return <input {...props} className={cn(inputClass, props.className)} />
}

export function Select({ children, ...props }) {
  return (
    <span className="relative block w-full">
      <select {...props} className={cn(inputClass, 'cursor-pointer appearance-none pe-9', props.className)}>
        {children}
      </select>
      <span className="pointer-events-none absolute inset-y-0 end-0 flex items-center pe-3">
        <ChevronDown className="size-4 text-slate-400" />
      </span>
    </span>
  )
}

export function Toggle({ checked, onChange, disabled, label, title }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      title={title || label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-7 w-12 rounded-full transition-colors duration-300 disabled:opacity-50',
        checked ? 'bg-green-500' : 'bg-slate-200',
      )}
    >
      <span
        className={cn(
          'absolute top-1 size-5 rounded-full bg-white shadow transition-all duration-300',
          checked ? 'start-6' : 'start-1',
        )}
      />
    </button>
  )
}

export function Spinner({ className = '' }) {
  return (
    <div className={cn('flex items-center justify-center py-16', className)}>
      <Loader2 className="size-9 animate-spin text-green-500" aria-hidden="true" />
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={cn('animate-pulse rounded-xl bg-slate-200/80', className)} />
}

export function TableSkeleton({ rows = 5, columns = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-2xl bg-slate-50 px-5 py-4">
          <Skeleton className="size-10 rounded-full" />
          {Array.from({ length: columns }).map((__, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function EmptyState({ icon: Icon = Inbox, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="grid size-16 place-items-center rounded-3xl bg-slate-100 text-slate-400">
        <Icon className="size-8" strokeWidth={1.6} />
      </div>
      <p className="text-sm font-bold text-slate-700">{title}</p>
      {description && <p className="max-w-sm text-xs leading-relaxed text-slate-500">{description}</p>}
      {action}
    </div>
  )
}

export function Avatar({ name, src, className = 'size-10' }) {
  if (src) {
    return <img loading="lazy" decoding="async" src={src} alt={name} className={cn('shrink-0 rounded-full object-cover', className)} />
  }
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-sm font-black text-white',
        className,
      )}
    >
      {name?.charAt(0) || '?'}
    </span>
  )
}

export function Tabs({ items, value, onChange }) {
  return (
    <div className="inline-flex flex-wrap gap-1 rounded-2xl bg-slate-100 p-1">
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={cn(
            'flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold transition-all duration-200',
            value === item.value
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-800',
          )}
        >
          {item.icon && <item.icon className={cn('size-4', value === item.value ? 'text-green-600' : 'text-slate-400')} />}
          {item.label}
          {typeof item.count === 'number' && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-black',
                value === item.value ? 'bg-green-500/15 text-green-700' : 'bg-slate-200/70 text-slate-500',
              )}
            >
              {item.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function Pagination({ page, lastPage, total, perPage, onChange, bare = false }) {
  const { t } = useTranslation()
  if (!total) return null
  const from = (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)
  const wrap = bare
    ? 'mt-8 flex flex-wrap items-center justify-between gap-3'
    : 'flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4'
  return (
    <div className={wrap}>
      <p className="text-xs font-medium text-slate-400">
        {t('pagination.showing', { from, to, total })}
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          aria-label={t('pagination.prev')}
          className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronRight className="size-4 rtl:rotate-180" />
        </button>
        <span className="min-w-16 text-center text-xs font-bold text-slate-500">
          {page} / {lastPage}
        </span>
        <button
          type="button"
          disabled={page >= lastPage}
          onClick={() => onChange(page + 1)}
          aria-label={t('pagination.next')}
          className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="size-4 rtl:rotate-180" />
        </button>
      </div>
    </div>
  )
}