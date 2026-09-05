import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faList, faXmark } from '@fortawesome/free-solid-svg-icons'

export default function FloatingToc({ sections, label }) {
  const [open, setOpen] = useState(false)
  const [activeId, setActiveId] = useState(sections[0]?.id)
  const panelRef = useRef(null)

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean)
    if (!els.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id)
        }
      },
      { rootMargin: '-15% 0px -55% 0px', threshold: 0 },
    )

    els.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [sections])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const jump = (id) => {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' })
      setActiveId(id)
    }
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="btn-ripple fixed bottom-6 end-6 z-[90] flex h-12 items-center gap-2.5 rounded-2xl bg-slate-950 px-5 text-sm font-bold text-white shadow-[0_16px_45px_rgba(2,6,23,0.45)] ring-1 ring-white/10 transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-slate-800 active:translate-y-0"
      >
        <FontAwesomeIcon icon={open ? faXmark : faList} className="size-4 text-green-400" />
        {label}
      </button>

      {open &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[95] cursor-default" onClick={() => setOpen(false)} />
            <div
              ref={panelRef}
              role="dialog"
              aria-label={label}
              className="pop-in fixed bottom-24 end-6 z-[96] flex max-h-[min(65vh,520px)] w-[min(360px,calc(100vw-48px))] flex-col overflow-hidden rounded-3xl bg-white shadow-[0_24px_80px_-12px_rgba(2,6,23,0.35)] ring-1 ring-slate-200/70"
            >
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <p className="flex items-center gap-2.5 text-sm font-black uppercase tracking-wide text-slate-900">
                  <span className="grid size-7 place-items-center rounded-lg bg-green-500/10 text-green-600">
                    <FontAwesomeIcon icon={faList} className="size-3.5" />
                  </span>
                  {label}
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label={`${label} close`}
                  className="grid size-8 place-items-center rounded-full bg-slate-100 text-slate-500 transition hover:rotate-90 hover:bg-slate-200 hover:text-slate-900"
                >
                  <FontAwesomeIcon icon={faXmark} className="size-4" />
                </button>
              </div>
              <ol className="flex-1 overflow-y-auto overscroll-contain p-2.5">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => jump(s.id)}
                      aria-current={activeId === s.id ? 'true' : undefined}
                      className={`group flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-start text-[13px] font-bold transition ${
                        activeId === s.id
                          ? 'bg-green-500 text-white shadow-[0_8px_20px_rgba(22,163,74,0.3)]'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <span
                        className={`grid size-6 shrink-0 place-items-center rounded-lg text-[11px] font-black ${
                          activeId === s.id
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 text-slate-400 group-hover:bg-green-500/10 group-hover:text-green-600'
                        }`}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">{s.title}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </>,
          document.body,
        )}
    </>
  )
}