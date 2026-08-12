import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import {
  X,
  Inbox,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { useDialogA11y } from '../dashboard/ui'

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
  ...props
}) {
  const styles = {
    primary: 'bg-green-500 text-white hover:bg-green-600 shadow-[0_10px_24px_rgba(34,197,94,0.3)]',
    outline: 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
    ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-[0_10px_24px_rgba(239,68,68,0.3)]',
    soft: 'bg-green-50 text-green-700 hover:bg-green-100',
    softRed: 'bg-red-50 text-red-600 hover:bg-red-100',
    softAmber: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
  }
  const sizes = {
    sm: 'h-9 px-3.5 text-xs',
    md: 'h-11 px-5 text-sm',
    lg: 'h-12 px-6 text-[15px]',
  }
  return (
    <button
      type={type}
      disabled={loading || props.disabled}
      className={cn(
        'btn-ripple inline-flex items-center justify-center gap-2 rounded-2xl font-bold transition-all duration-200 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50',
        styles[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  )
}

const toneMap = {
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200/70',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200/70',
  red: 'bg-red-50 text-red-600 ring-red-200/70',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200/70',
  violet: 'bg-violet-50 text-violet-700 ring-violet-200/70',
  slate: 'bg-slate-100 text-slate-600 ring-slate-200/70',
  blue: 'bg-blue-50 text-blue-700 ring-blue-200/70',
}

export function Badge({ tone = 'slate', children, className = '' }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1', toneMap[tone], className)}>
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
  reviewed: { tone: 'sky', label: 'status.reviewed' },
  resolved: { tone: 'green', label: 'status.resolved' },
  pending: { tone: 'amber', label: 'status.pending' },
  pending_confirmation: { tone: 'amber', label: 'status.pending_confirmation' },
  disputed: { tone: 'amber', label: 'status.disputed' },
  rejected: { tone: 'red', label: 'status.rejected' },
  declined: { tone: 'red', label: 'status.declined' },
  dismissed: { tone: 'slate', label: 'status.dismissed' },
  blocked: { tone: 'red', label: 'status.blocked' },
  cancelled: { tone: 'slate', label: 'status.cancelled' },
  hidden: { tone: 'violet', label: 'status.hidden' },
}

export function StatusBadge({ status }) {
  const { t } = useTranslation()
  const meta = statusMeta[status] || { tone: 'slate', label: status }
  return <Badge tone={meta.tone}>{t(meta.label)}</Badge>
}

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

export function Card({ children, className = '', title, action, pad = true }) {
  return (
    <div className={cn('rounded-3xl bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06),0_12px_32px_-16px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/60', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          {title && <h3 className="text-sm font-bold text-slate-900">{title}</h3>}
          {action}
        </div>
      )}
      <div className={pad ? 'p-6' : ''}>{children}</div>
    </div>
  )
}

const statTones = {
  green: 'bg-green-500/15 text-green-600',
  amber: 'bg-amber-500/15 text-amber-600',
  red: 'bg-red-500/15 text-red-600',
  sky: 'bg-sky-500/15 text-sky-600',
  violet: 'bg-violet-500/15 text-violet-600',
  slate: 'bg-slate-500/15 text-slate-600',
}

export function StatWidget({ icon: Icon, label, value, hint, tone = 'green' }) {
  const body = (
    <div className="group relative overflow-hidden rounded-3xl bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06),0_12px_32px_-16px_rgba(15,23,42,0.14)] ring-1 ring-slate-200/60 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_44px_-18px_rgba(15,23,42,0.25)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[13px] font-semibold text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black tracking-tight text-slate-900">{value}</p>
        </div>
        <div className={cn('grid size-12 shrink-0 place-items-center rounded-2xl', statTones[tone])}>
          <Icon className="size-6" strokeWidth={2.2} />
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
      <span className="mb-2 block text-xs font-bold text-slate-600">
        {label}
        {required && <span className="ms-1 text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'h-11 w-full rounded-2xl border border-slate-200 bg-slate-50/60 px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500/60 focus:bg-white focus:ring-4 focus:ring-green-500/10'

export function Input(props) {
  return <input {...props} className={cn(inputClass, props.className)} />
}

export function Select({ children, ...props }) {
  return (
    <select {...props} className={cn(inputClass, 'cursor-pointer', props.className)}>
      {children}
    </select>
  )
}

export function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
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
    <div className={cn('flex items-center justify-center py-20', className)}>
      <Loader2 className="size-9 animate-spin text-green-500" />
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={cn('animate-pulse rounded-xl bg-slate-200/70', className)} />
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

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }) {
  const { t } = useTranslation()
  const panelRef = useRef(null)
  const titleIdRef = useRef(`amodal-title-${Math.random().toString(36).slice(2)}`)
  useDialogA11y(open, panelRef)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  const widths = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl' }

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center">
      <div className="overlay-in absolute inset-0 bg-slate-950/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleIdRef.current}
        tabIndex={-1}
        className={cn('pop-in relative w-full rounded-3xl bg-white p-6 shadow-2xl outline-none', widths[size])}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 id={titleIdRef.current} className="text-lg font-black text-slate-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-5" />
          </button>
        </div>
        {children}
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}

export function Drawer({ open, onClose, title, subtitle, children, footer, width = 'max-w-xl' }) {
  const { t } = useTranslation()
  const panelRef = useRef(null)
  const titleIdRef = useRef(`adrawer-title-${Math.random().toString(36).slice(2)}`)
  useDialogA11y(open, panelRef)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[110]">
      <div className="overlay-in absolute inset-0 bg-slate-950/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleIdRef.current}
        tabIndex={-1}
        className={cn('drawer-in absolute inset-y-0 end-0 flex w-full flex-col bg-white shadow-2xl outline-none', width)}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div className="min-w-0">
            <h3 id={titleIdRef.current} className="text-lg font-black text-slate-900">{title}</h3>
            {subtitle && <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">{footer}</div>}
      </aside>
    </div>
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

export function Pagination({ page, lastPage, total, perPage, onChange }) {
  const { t } = useTranslation()
  if (!total) return null
  const from = (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4">
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