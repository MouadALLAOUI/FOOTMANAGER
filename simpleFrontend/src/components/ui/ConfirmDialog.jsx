import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, Loader2 } from 'lucide-react'
import useScrollLock from '../useScrollLock'

const toneMeta = {
  danger: {
    confirm: 'bg-rose-600 text-white hover:bg-rose-500 focus-visible:ring-rose-500/30',
    iconWrap: 'bg-rose-50 text-rose-600',
  },
  default: {
    confirm: 'bg-green-600 text-white hover:bg-green-500 focus-visible:ring-green-500/30',
    iconWrap: 'bg-green-50 text-green-600',
  },
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = 'danger',
  loading = false,
  icon: Icon = AlertTriangle,
}) {
  const { t } = useTranslation()
  const panelRef = useRef(null)
  const titleIdRef = useRef(`confirm-title-${Math.random().toString(36).slice(2)}`)
  const descIdRef = useRef(`confirm-desc-${Math.random().toString(36).slice(2)}`)
  const closingRef = useRef(false)
  const [closing, setClosing] = useState(false)

  const requestClose = useCallback(() => {
    if (closingRef.current || loading) return
    closingRef.current = true
    setClosing(true)
    window.setTimeout(() => {
      closingRef.current = false
      setClosing(false)
      onClose()
    }, 180)
  }, [loading, onClose])

  useScrollLock(open)

  useEffect(() => {
    if (!open) return
    const restore = document.activeElement
    const panel = panelRef.current
    if (panel) panel.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        requestClose()
        return
      }
      if (e.key !== 'Tab') return
      const focusables = () =>
        Array.from(panel.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        )).filter((el) => el.offsetParent !== null || el === document.activeElement)
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

    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      if (restore && typeof restore.focus === 'function') restore.focus()
    }
  }, [open, requestClose])

  if (!open) return null

  const meta = toneMeta[tone]
  const resolvedCancel = cancelLabel || t('common.cancel')

  return (
    <div className="fixed inset-0 z-[130] flex items-end justify-center p-4 sm:items-center">
      <div className={`${closing ? 'overlay-out' : 'overlay-in'} absolute inset-0 bg-slate-900/50 backdrop-blur-sm`} onClick={requestClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleIdRef.current}
        aria-describedby={description ? descIdRef.current : undefined}
        tabIndex={-1}
        className={`${closing ? 'pop-out' : 'pop-in'} relative w-full max-w-md rounded-t-3xl bg-white shadow-2xl outline-none sm:rounded-3xl`}
      >
        <div className="px-6 pt-6">
          <div className="flex items-start gap-4">
            <span className={`grid size-11 shrink-0 place-items-center rounded-2xl ${meta.iconWrap}`}>
              <Icon className="size-5" />
            </span>
            <div className="min-w-0 pt-0.5">
              <h3 id={titleIdRef.current} className="text-base font-extrabold text-slate-900">{title}</h3>
              {description && (
                <p id={descIdRef.current} className="mt-1.5 text-sm font-semibold leading-6 text-slate-500">{description}</p>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col-reverse gap-2 px-6 py-5 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={loading}
            onClick={requestClose}
            className="rounded-2xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-500/20 disabled:opacity-50"
          >
            {resolvedCancel}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-bold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${meta.confirm}`}
          >
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {loading ? t('common.loading') || '…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export function useConfirm(defaults = {}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [options, setOptions] = useState({})
  const defaultsRef = useRef(defaults)
  const actionRef = useRef(null)

  const run = useCallback((action, overrides = {}) => {
    actionRef.current = action
    setOptions({ ...defaultsRef.current, ...overrides })
    setLoading(false)
    setOpen(true)
  }, [])

  const confirm = useCallback(async () => {
    const action = actionRef.current
    if (!action || loading) return
    setLoading(true)
    try {
      const ok = await action()
      if (ok === false) {
        setLoading(false)
        return
      }
      actionRef.current = null
      setOpen(false)
      setLoading(false)
    } catch {
      setLoading(false)
    }
  }, [loading])

  const close = useCallback(() => {
    if (loading) return
    actionRef.current = null
    setOpen(false)
  }, [loading])

  return { open, loading, options, run, confirm, close }
}
