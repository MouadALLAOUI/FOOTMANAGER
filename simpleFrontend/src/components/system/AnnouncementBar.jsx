import { useEffect, useMemo, useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Megaphone, TriangleAlert, CircleCheck, Info, X, ChevronLeft, ChevronRight } from 'lucide-react'
import { usePublicSettings } from '../../api/queries'

const TONES = {
  promo: { icon: Megaphone, bar: 'bg-[#16a34a] text-white' },
  info: { icon: Info, bar: 'bg-[#16a34a] text-white' },
  success: { icon: CircleCheck, bar: 'bg-emerald-600 text-white' },
  warning: { icon: TriangleAlert, bar: 'bg-amber-500 text-white' },
  alert: { icon: TriangleAlert, bar: 'bg-amber-500 text-white' },
}

const FALLBACK_TONE = 'info'
const STORAGE_KEY = 'announcements_dismissed'
const ROTATION_MS = 6000

function loadDismissed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? new Set(parsed) : new Set()
  } catch {
    return new Set()
  }
}

function isActive(ann) {
  if (!ann) return false
  const now = Date.now()
  const s = ann.activeFrom ? new Date(ann.activeFrom).getTime() : null
  const e = ann.expiresAt ? new Date(ann.expiresAt).getTime() : null
  if (s !== null && !Number.isNaN(s) && now < s) return false
  if (e !== null && !Number.isNaN(e) && now > e) return false
  return true
}

export default function AnnouncementBar({ announcements: propAnnouncements = [], sticky = false }) {
  const { t } = useTranslation()
  const barRef = useRef(null)
  const [dismissed, setDismissed] = useState(loadDismissed)
  const [closing, setClosing] = useState(false)
  const [animatedIn, setAnimatedIn] = useState(false)
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const { data } = usePublicSettings()
  const settings = data?.settings || {}
  const enabled = settings?.announcement_enabled === true || settings?.announcement_enabled === '1'
  const text = settings?.announcement_text
  const type = settings?.announcement_type || 'info'

  const announcements = useMemo(() => {
    const list = Array.isArray(propAnnouncements) && propAnnouncements.length > 0
      ? propAnnouncements.map((a, i) => ({
          id: a.id ?? `prop-${i}`,
          text: a.text ?? a.message ?? '',
          type: a.type ?? 'promo',
          cta: a.cta,
          activeFrom: a.activeFrom,
          expiresAt: a.expiresAt,
        }))
      : enabled && text
        ? [{ id: `db-${type}-${text}`, text, type, cta: null }]
        : []
    return list.filter((a) => a.text)
  }, [propAnnouncements, enabled, text, type])

  const active = useMemo(
    () => announcements.filter(isActive).filter((a) => !dismissed.has(a.id)),
    [announcements, dismissed],
  )

  const safeIndex = active.length > 0 ? Math.min(index, active.length - 1) : 0
  const current = active[safeIndex]
  const tone = current ? TONES[current.type] || TONES[FALLBACK_TONE] : null
  const Icon = tone?.icon

  /* Publish bar height so the fixed header can offset below it without hard-coding pixels. */
  useLayoutEffect(() => {
    const root = document.documentElement
    const el = barRef.current
    root.style.setProperty('--announce-height', el ? `${el.getBoundingClientRect().height}px` : '0px')
    return () => root.style.setProperty('--announce-height', '0px')
  }, [active.length, closing, current?.id])

  /* Entrance animation runs once per mount (page load), not per SPA route. */
  useEffect(() => {
    if (active.length === 0) return
    const raf = requestAnimationFrame(() => setAnimatedIn(true))
    return () => cancelAnimationFrame(raf)
  }, [active.length])

  /* Rotation — paused on hover OR keyboard focus. */
  useEffect(() => {
    if (active.length <= 1 || paused) return
    const timer = setTimeout(() => {
      setIndex((i) => (i + 1) % active.length)
    }, ROTATION_MS)
    return () => clearTimeout(timer)
  }, [active.length, paused, index])

  if (active.length === 0) return null

  const handleDismiss = () => {
    setClosing(true)
    setTimeout(() => {
      const next = new Set(loadDismissed())
      next.add(current.id)
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]))
      } catch {
        /* storage unavailable (private mode) — bar reappears next visit */
      }
      setDismissed(next)
      setClosing(false)
      setIndex(0)
    }, 220)
  }

  const go = (dir) => {
    setIndex((i) => (i + dir + active.length) % active.length)
  }

  return (
    <div
      ref={barRef}
      role="region"
      aria-label={t('dash.announcementBar')}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={`relative overflow-hidden transition-[height,opacity,transform] duration-300 ease-out ${tone.bar} ${
        closing ? 'announce-collapse' : ''
      } ${sticky ? 'sticky top-0 z-[49]' : ''}`}
    >
      <div
        className={`mx-auto flex min-h-[40px] max-w-[1400px] flex-col items-start justify-center gap-1.5 px-12 py-2 sm:flex-row sm:items-center sm:gap-3 sm:px-14 md:px-16 ${
          animatedIn && !closing ? 'announce-enter' : ''
        }`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-black/10">
            <Icon className="size-3.5" aria-hidden="true" />
          </span>
          <div
            key={current.id}
            className="announce-fade min-w-0 whitespace-pre-wrap text-[13px] leading-snug font-bold sm:leading-none"
          >
            {current.text}
          </div>
        </div>

        {current.cta?.label && current.cta?.href && (
          <a
            href={current.cta.href}
            target={current.cta.target || '_self'}
            rel={current.cta.target === '_blank' ? 'noopener noreferrer' : undefined}
            className="shrink-0 rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-bold text-white ring-1 ring-white/25 transition-colors hover:bg-white/25"
          >
            {current.cta.label}
          </a>
        )}

        {active.length > 1 && (
          <div className="flex shrink-0 items-center gap-1.5" aria-hidden="true">
            <button
              type="button"
              tabIndex={-1}
              onClick={() => go(-1)}
              className="hidden size-6 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white sm:grid"
            >
              <ChevronLeft className="size-4" />
            </button>
            {active.map((a, i) => (
              <button
                key={a.id}
                type="button"
                tabIndex={-1}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === safeIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                }`}
              />
            ))}
            <button
              type="button"
              tabIndex={-1}
              onClick={() => go(1)}
              className="hidden size-6 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white sm:grid"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        aria-label={t('common.close')}
        className="absolute end-2.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-white/80 transition-colors hover:bg-white/15 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}
