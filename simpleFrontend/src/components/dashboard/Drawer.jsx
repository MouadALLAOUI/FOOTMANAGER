import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useDialogA11y } from './ui'
import useScrollLock from '../useScrollLock'

const MIN_WIDTH = 320

const SIZE_MAP = {
  sm: 400,
  md: 480,
  lg: 560,
  xl: 640,
}

function getViewport() {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280
  return { vw, max: Math.round(vw * 0.95), mobile: vw < 640 }
}

function resolveWidth(size, vp) {
  if (!size) return SIZE_MAP.md
  const num = Number(size)
  const px = !isNaN(num) ? num : (SIZE_MAP[size] ?? SIZE_MAP.md)
  return Math.max(MIN_WIDTH, Math.min(px, vp.max))
}

export default function Drawer({ open, onClose, title, subtitle, size, footer, children }) {
  const { t } = useTranslation()
  const panelRef = useRef(null)
  const titleIdRef = useRef(`drawer-title-${Math.random().toString(36).slice(2)}`)
  const closingRef = useRef(false)
  const resizeCleanupRef = useRef(null)
  const [width, setWidth] = useState(() => resolveWidth(size, getViewport()))
  const [mobile, setMobile] = useState(() => getViewport().mobile)
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
    }, 300)
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const vp = getViewport()
    setMobile(vp.mobile)
    setWidth(resolveWidth(size, vp))

    const onResize = () => {
      const v = getViewport()
      setMobile(v.mobile)
      setWidth((prev) => Math.max(MIN_WIDTH, Math.min(prev, v.max)))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [open, size])

  useScrollLock(open)

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && requestClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, requestClose])

  useEffect(() => () => {
    if (resizeCleanupRef.current) {
      resizeCleanupRef.current()
      resizeCleanupRef.current = null
    }
  }, [])

  if (!open) return null

  const startResize = (e) => {
    e.preventDefault()
    const isRtl = document.documentElement.dir === 'rtl'
    const startX = e.clientX
    const startW = width
    const { max } = getViewport()

    const onMove = (ev) => {
      const delta = ev.clientX - startX
      const next = Math.max(MIN_WIDTH, Math.min(max, isRtl ? startW + delta : startW - delta))
      setWidth(next)
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      resizeCleanupRef.current = null
    }

    resizeCleanupRef.current = onUp
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  return (
    <div className="fixed inset-0 z-[90]">
      <div className={`${closing ? 'overlay-out' : 'overlay-in'} absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]`} onClick={requestClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleIdRef.current}
        tabIndex={-1}
        className={`absolute inset-y-0 end-0 flex flex-col bg-white shadow-2xl outline-none transition-transform duration-300 ${
          open && !closing ? 'translate-x-0' : 'translate-x-full rtl:-translate-x-full'
        } ${mobile ? 'w-full' : ''}`}
        style={!mobile && width > 0 ? { width: `${width}px`, maxWidth: '100%' } : undefined}
      >
        {!mobile && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t('common.resize')}
            title={t('common.resize')}
            onPointerDown={startResize}
            className="absolute inset-y-0 start-0 z-10 flex w-2 cursor-col-resize touch-none items-center justify-center bg-slate-100 transition-colors hover:bg-slate-300"
          >
            <span className="h-8 w-0.5 rounded-full bg-slate-300" />
          </div>
        )}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <h3 id={titleIdRef.current} className="text-base font-extrabold text-slate-900">{title}</h3>
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
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  )
}
