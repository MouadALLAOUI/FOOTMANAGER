import { lazy, Suspense, useEffect, useRef, useState } from 'react'

const LazyAreaTrend = lazy(() => import('./RechartsCore').then((m) => ({ default: m.AreaTrend })))
const LazyDonut = lazy(() => import('./RechartsCore').then((m) => ({ default: m.Donut })))

function useInView(threshold = 0.05) {
  const ref = useRef(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          obs.disconnect()
        }
      },
      { threshold },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])

  return [ref, inView]
}

function ChartFallback({ height }) {
  return (
    <div
      aria-hidden
      style={{ height }}
      className="w-full animate-pulse rounded-2xl bg-slate-100"
    />
  )
}

export function AreaTrend(props) {
  const [ref, inView] = useInView()
  return (
    <div ref={ref} style={{ height: props.height || 220 }} className="w-full">
      {inView ? (
        <Suspense fallback={<ChartFallback height={props.height || 220} />}>
          <LazyAreaTrend {...props} />
        </Suspense>
      ) : (
        <ChartFallback height={props.height || 220} />
      )}
    </div>
  )
}

export function Donut(props) {
  const [ref, inView] = useInView()
  return (
    <div ref={ref} style={{ height: props.height || 200 }} className="w-full">
      {inView ? (
        <Suspense fallback={<ChartFallback height={props.height || 200} />}>
          <LazyDonut {...props} />
        </Suspense>
      ) : (
        <ChartFallback height={props.height || 200} />
      )}
    </div>
  )
}
