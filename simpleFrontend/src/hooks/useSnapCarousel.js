import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Tracks scroll progress of a snap carousel and reports the active slide,
 * direction-agnostic (works with RTL negative scrollLeft).
 */
export function useSnapCarousel(items) {
  const ref = useRef(null)
  const [state, setState] = useState({ count: 0, active: 0 })

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const count = el.children.length
    const max = Math.abs(el.scrollWidth - el.clientWidth)
    const active =
      max <= 2 || count <= 1
        ? 0
        : Math.min(count - 1, Math.round((Math.min(max, Math.abs(el.scrollLeft)) / max) * (count - 1)))
    setState((prev) => (prev.count === count && prev.active === active ? prev : { count, active }))
  }, [])

  useEffect(() => {
    measure()
    const el = ref.current
    if (!el) return
    el.addEventListener('scroll', measure, { passive: true })
    window.addEventListener('resize', measure)
    return () => {
      el.removeEventListener('scroll', measure)
      window.removeEventListener('resize', measure)
    }
  }, [measure, items])

  const goTo = useCallback((index) => {
    const el = ref.current
    if (!el || !el.children[index]) return
    el.children[index].scrollIntoView({ inline: 'start', block: 'nearest', behavior: 'smooth' })
  }, [])

  return { ref, count: state.count, active: state.active, goTo }
}
