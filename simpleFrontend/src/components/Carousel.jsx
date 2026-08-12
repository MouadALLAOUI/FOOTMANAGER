import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'

export default function Carousel({ step = 348, children, className }) {
  const { i18n } = useTranslation()
  const ref = useRef(null)

  const scroll = (dir) => {
    const el = ref.current
    if (!el || el.children.length === 0) return
    const max = Math.abs(el.scrollWidth - el.clientWidth)
    const pos = Math.abs(el.scrollLeft)
    const atEnd = pos >= max - 2
    const atStart = pos <= 2
    if (dir > 0 && atEnd) {
      el.children[0].scrollIntoView({ inline: 'start', block: 'nearest', behavior: 'smooth' })
    } else if (dir < 0 && atStart) {
      el.children[el.children.length - 1].scrollIntoView({ inline: 'end', block: 'nearest', behavior: 'smooth' })
    } else {
      el.scrollBy({ left: dir * step, behavior: 'smooth' })
    }
  }

  const isRtl = i18n.language.startsWith('ar')
  const backIcon = isRtl ? faChevronRight : faChevronLeft
  const nextIcon = isRtl ? faChevronLeft : faChevronRight

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label="previous"
        className="absolute start-0 top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-slate-600 shadow-[0_8px_25px_rgba(17,24,39,0.15)] ring-1 ring-slate-100 transition hover:scale-105 hover:text-green-600 md:grid"
      >
        <FontAwesomeIcon icon={backIcon} className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label="next"
        className="absolute end-0 top-1/2 z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white text-slate-600 shadow-[0_8px_25px_rgba(17,24,39,0.15)] ring-1 ring-slate-100 transition hover:scale-105 hover:text-green-600 md:grid"
      >
        <FontAwesomeIcon icon={nextIcon} className="size-5" />
      </button>

      <div
        ref={ref}
        className={`no-scrollbar flex snap-x gap-7 overflow-x-auto scroll-smooth px-2 pb-4 md:px-14 ${className ?? ''}`}
      >
        {children}
      </div>
    </div>
  )
}
