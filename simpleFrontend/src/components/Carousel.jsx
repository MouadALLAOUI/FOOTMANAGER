import { useTranslation } from 'react-i18next'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { useSnapCarousel } from '../hooks/useSnapCarousel'

export function CarouselDots({ count, active, goTo }) {
  const { t } = useTranslation()
  if (count <= 1) return null
  return (
    <div className="mt-1 flex justify-center gap-1.5 md:hidden">
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => goTo(i)}
          aria-label={t('common.goToSlide', { index: i + 1 })}
          aria-current={active === i ? 'true' : undefined}
          className={`h-2 rounded-full transition-all duration-300 ${
            active === i ? 'w-6 bg-green-500' : 'w-2 bg-slate-300 hover:bg-slate-400'
          }`}
        />
      ))}
    </div>
  )
}

export default function Carousel({ step = 348, children, className, showDots = false }) {
  const { i18n } = useTranslation()
  const { ref, count, active, goTo } = useSnapCarousel(children)

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
        className={`no-scrollbar flex snap-x gap-7 overflow-x-auto scroll-smooth scroll-ps-2 px-2 pb-4 md:scroll-ps-14 md:px-14 ${className ?? ''}`}
      >
        {children}
      </div>

      {showDots && <CarouselDots count={count} active={active} goTo={goTo} />}
    </div>
  )
}
