import { useCallback, useEffect, useRef, useState } from 'react'
import ItemIcon from './ItemIcon'
import { useTranslation } from 'react-i18next'
import { ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react'

export function useDialogA11y(open, panelRef) {
  const restoreRef = useRef(null)
  useEffect(() => {
    if (!open) return
    restoreRef.current = document.activeElement
    const panel = panelRef.current
    if (panel) {
      panel.focus()
      const focusables = () =>
        Array.from(panel.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )).filter((el) => el.offsetParent !== null || el === document.activeElement)
      const onKey = (e) => {
        if (e.key !== 'Tab') return
        const list = focusables()
        if (list.length === 0) {
          e.preventDefault()
          return
        }
        const first = list[0]
        const last = list[list.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
      panel.addEventListener('keydown', onKey)
      return () => {
        panel.removeEventListener('keydown', onKey)
        if (restoreRef.current?.focus) restoreRef.current.focus()
      }
    }
  }, [open, panelRef])
}

export function Card({ title, subtitle, action, children, className = '', bodyClassName = '', noPadding = false, pad = true }) {
  const noPad = noPadding || pad === false
  return (
    <div className={`rounded-3xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)] ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            {title && <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>}
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      <div className={noPad ? bodyClassName : `p-6 ${bodyClassName}`}>{children}</div>
    </div>
  )
}

export function useCountUp(target, duration = 700) {
  const [value, setValue] = useState(0)
  const start = useRef(null)
  useEffect(() => {
    start.current = null
    let raf
    const step = (t) => {
      if (start.current === null) start.current = t
      const p = Math.min((t - start.current) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])
  return value
}

const accentChips = {
  green: 'bg-emerald-500/15 text-emerald-600',
  amber: 'bg-amber-500/15 text-amber-600',
  sky: 'bg-sky-500/15 text-sky-600',
  violet: 'bg-violet-500/15 text-violet-600',
  rose: 'bg-rose-500/15 text-rose-600',
  orange: 'bg-orange-500/15 text-orange-600',
}

export function Stat({ icon: Icon, label, value, delta, accent = 'green', suffix }) {
  const count = useCountUp(typeof value === 'number' ? value : 0)
  const chip = accentChips[accent] || accentChips.green
  return (
    <div className="group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]">
      <div className={`pointer-events-none absolute -end-8 -top-8 size-28 rounded-full ${chip} opacity-[0.06] blur-2xl`} />
      <div className="flex items-center justify-between">
        <div className={`grid size-11 shrink-0 place-items-center rounded-2xl ${chip}`}>
          <ItemIcon icon={Icon} className="size-5" strokeWidth={2.2} />
        </div>
        {typeof delta === 'number' && (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
              delta >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}
          >
            {delta >= 0 ? '+' : ''}
            {delta}%
          </span>
        )}
      </div>
      <p className="mt-4 text-2xl font-black tracking-tight text-slate-900">
        {typeof value === 'number' ? count : value}
        {suffix && <span className="ms-1 text-sm font-bold text-slate-500">{suffix}</span>}
      </p>
      <p className="mt-0.5 text-xs font-semibold text-slate-500">{label}</p>
    </div>
  )
}

const buttonVariants = {
  primary:
    'bg-green-500 text-white shadow-[0_8px_20px_rgba(22,163,74,0.28)] hover:bg-green-600 hover:shadow-[0_10px_24px_rgba(22,163,74,0.34)] active:scale-[0.98]',
  outline:
    'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
  ghost: 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
  soft: 'bg-green-50 text-green-700 hover:bg-green-100',
  danger: 'bg-rose-500 text-white shadow-[0_8px_20px_rgba(244,63,94,0.28)] hover:bg-rose-600',
  dangerSoft: 'bg-rose-50 text-rose-600 hover:bg-rose-100',
}

const buttonSizes = {
  sm: 'h-9 gap-1.5 rounded-xl px-3.5 text-xs',
  md: 'h-11 gap-2 rounded-xl px-5 text-sm',
  lg: 'h-12 gap-2 rounded-2xl px-6 text-sm',
}

export function Button({ children, variant = 'primary', size = 'md', className = '', type = 'button', loading = false, disabled = false, ...props }) {
  return (
    <button
      type={type}
      aria-busy={loading || undefined}
      disabled={loading || disabled}
      className={`inline-flex items-center justify-center gap-2 font-bold transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-50 ${buttonVariants[variant]} ${buttonSizes[size]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}

export function IconButton({ icon: Icon, label, className = '', ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`grid size-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 ${className}`}
      {...props}
    >
      <ItemIcon icon={Icon} className="size-[18px]" />
    </button>
  )
}

export function Field({ label, hint, required, children }) {
  return (
    <label className="block">
      {label && (
        <span className="mb-1.5 block text-xs font-bold text-slate-700">
          {label}
          {required && <span className="text-rose-500"> *</span>}
        </span>
      )}
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-500">{hint}</span>}
    </label>
  )
}

export const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10'

export const selectClass =
  'h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pe-9 text-sm text-slate-900 outline-none transition-all focus:border-green-500 focus:ring-4 focus:ring-green-500/10'

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
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-300 disabled:opacity-50 ${
        checked ? 'bg-green-500' : 'bg-slate-200'
      }`}
    >
      <span
        className={`absolute top-1 size-5 rounded-full bg-white shadow transition-all duration-300 ${
          checked ? 'start-6' : 'start-1'
        }`}
      />
    </button>
  )
}

export function Modal({ open, onClose, title, subtitle, children, footer, size = 'md' }) {
  const { t } = useTranslation()
  const panelRef = useRef(null)
  const titleIdRef = useRef(`modal-title-${Math.random().toString(36).slice(2)}`)
  const closingRef = useRef(false)
  const [closing, setClosing] = useState(false)
  useDialogA11y(open, panelRef)

  const requestClose = useCallback(() => {
    if (closingRef.current) return
    closingRef.current = true
    setClosing(true)
    window.setTimeout(() => {
      closingRef.current = false
      setClosing(false)
      onClose()
    }, 180)
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && requestClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, requestClose])

  if (!open) return null

  const widths = { sm: 'max-w-md', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }
  const titleId = titleIdRef.current

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center p-4 sm:items-center">
      <div className={`${closing ? 'overlay-out' : 'overlay-in'} absolute inset-0 bg-slate-900/50 backdrop-blur-sm`} onClick={requestClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`${closing ? 'pop-out' : 'pop-in'} relative w-full ${widths[size]} max-h-[90vh] overflow-y-auto rounded-t-3xl bg-white shadow-2xl outline-none sm:rounded-3xl`}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-6 py-4">
          <div className="min-w-0">
            <h3 id={titleId} className="text-base font-extrabold text-slate-900">{title}</h3>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label={t('common.close')}
            className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}

export function Spinner({ className = '' }) {
  return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <Loader2 className="size-9 animate-spin text-green-500" aria-hidden="true" />
    </div>
  )
}

export function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} />
}

export function SkeletonCards({ count = 3, className = '' }) {
  return (
    <div className={className}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-3xl border border-slate-200/70 bg-white p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="size-11 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export function Empty({ title, description, icon: Icon, action }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-14 text-center">
      <div className="relative">
        <div className="absolute inset-0 -z-0 rounded-3xl bg-green-500/10 blur-xl" />
        <div className="relative grid size-16 place-items-center rounded-3xl border border-slate-100 bg-slate-50 text-slate-300">
          {Icon && <ItemIcon icon={Icon} className="size-7" strokeWidth={1.6} />}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-bold text-slate-700">{title}</p>
        {description && <p className="mx-auto max-w-sm text-xs leading-relaxed text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  )
}

const statusStyles = {
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  rejected: 'bg-rose-50 text-rose-600 ring-rose-200',
  blocked: 'bg-rose-50 text-rose-600 ring-rose-200',
  open: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  accepted: 'bg-sky-50 text-sky-700 ring-sky-200',
  live: 'bg-rose-50 text-rose-600 ring-rose-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  cancelled: 'bg-slate-100 text-slate-500 ring-slate-200',
  declined: 'bg-rose-50 text-rose-600 ring-rose-200',
  confirmed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  pending_confirmation: 'bg-amber-50 text-amber-700 ring-amber-200',
  disputed: 'bg-orange-50 text-orange-600 ring-orange-200',
  none: 'bg-slate-100 text-slate-500 ring-slate-200',
  unavailable: 'bg-rose-50 text-rose-600 ring-rose-200',
  available: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  busy: 'bg-orange-50 text-orange-600 ring-orange-200',
  vacation: 'bg-sky-50 text-sky-700 ring-sky-200',
  injured: 'bg-rose-50 text-rose-600 ring-rose-200',
  training: 'bg-violet-50 text-violet-700 ring-violet-200',
  private: 'bg-sky-50 text-sky-700 ring-sky-200',
  draft: 'bg-slate-100 text-slate-600 ring-slate-200',
  published: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  finished: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  open_for_registration: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  registration_closed: 'bg-amber-50 text-amber-700 ring-amber-200',
  in_progress: 'bg-sky-50 text-sky-700 ring-sky-200',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  reviewed: 'bg-sky-50 text-sky-700 ring-sky-200',
  resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  dismissed: 'bg-slate-100 text-slate-600 ring-slate-200',
  hidden: 'bg-violet-50 text-violet-700 ring-violet-200',
}

export const statusLabels = {
  approved: 'status.approved',
  pending: 'status.pending',
  rejected: 'status.rejected',
  blocked: 'status.blocked',
  open: 'status.open',
  accepted: 'status.accepted',
  live: 'status.live',
  completed: 'status.completed',
  cancelled: 'status.cancelled',
  declined: 'status.declined',
  confirmed: 'status.confirmed',
  pending_confirmation: 'status.pending_confirmation',
  disputed: 'status.disputed',
  none: 'status.none',
  unavailable: 'status.unavailable',
  available: 'status.available',
  busy: 'status.busy',
  vacation: 'status.vacation',
  injured: 'status.injured',
  training: 'status.training',
  private: 'status.private',
  draft: 'status.draft',
  published: 'status.published',
  finished: 'status.finished',
  open_for_registration: 'status.open_for_registration',
  registration_closed: 'status.registration_closed',
  in_progress: 'status.in_progress',
  active: 'status.active',
  reviewed: 'status.reviewed',
  resolved: 'status.resolved',
  dismissed: 'status.dismissed',
  hidden: 'status.hidden',
}

export function StatusBadge({ status }) {
  const { t } = useTranslation()
  const style = statusStyles[status] || 'bg-slate-100 text-slate-600 ring-slate-200'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${style}`}>
      {statusLabels[status] ? t(statusLabels[status]) : status}
    </span>
  )
}

export const badgeVariants = {
  neutral: 'bg-slate-100 text-slate-600 ring-slate-200',
  info: 'bg-sky-50 text-sky-700 ring-sky-200',
  warning: 'bg-amber-50 text-amber-700 ring-amber-200',
  success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  danger: 'bg-rose-50 text-rose-600 ring-rose-200',
}

export function Badge({ variant = 'neutral', children }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 ${badgeVariants[variant] || badgeVariants.neutral}`}>
      {children}
    </span>
  )
}

export function SectionTitle({ title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function Timeline({ items }) {
  return (
    <div className="space-y-0">
      {items.map((item, i) => (
        <div key={i} className="relative flex gap-4 pb-6 last:pb-0">
          {i < items.length - 1 && <span className="absolute top-8 start-[11px] h-full w-px bg-slate-100" />}
          <div
            className={`relative mt-0.5 grid size-6 shrink-0 place-items-center rounded-full ${
              item.color || 'bg-green-500'
            }`}
          >
            <span className="size-2 rounded-full bg-white" />
          </div>
          <div className="min-w-0 flex-1">{item.children}</div>
        </div>
      ))}
    </div>
  )
}

export function FieldRow({ children, cols = 2 }) {
  return <div className={`grid gap-4 ${cols === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-3'}`}>{children}</div>
}

export function EmptyState(props) {
  return <Empty {...props} />
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

export function Avatar({ name, src, className = 'size-10' }) {
  if (src) {
    return <img loading="lazy" decoding="async" src={src} alt={name} className={`shrink-0 rounded-full object-cover ${className}`} />
  }
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 text-sm font-black text-white ${className}`}
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
          aria-pressed={value === item.value}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-bold transition-all duration-200 ${
            value === item.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          {item.icon && <ItemIcon icon={item.icon} className={`size-4 ${value === item.value ? 'text-green-600' : 'text-slate-400'}`} />}
          {item.label}
          {typeof item.count === 'number' && (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                value === item.value ? 'bg-green-500/15 text-green-700' : 'bg-slate-200/70 text-slate-500'
              }`}
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
