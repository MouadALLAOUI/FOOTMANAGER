const gridStyle = { gridTemplateColumns: '3.5rem repeat(7, minmax(0, 1fr))' }

const AVAILABLE_HEIGHT = {
  '--calendar-available-height': 'calc(100dvh - 7.5rem)',
}

export default function CalendarSkeleton() {
  return (
    <div
      className="flex min-h-0 animate-pulse flex-col overflow-hidden rounded-3xl border border-slate-200/70 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
      style={{ ...AVAILABLE_HEIGHT, height: 'var(--calendar-available-height)' }}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
        <div className="size-9 rounded-xl bg-slate-200" />
        <div className="h-4 w-32 rounded-lg bg-slate-200" />
        <div className="ms-auto h-9 w-44 rounded-xl bg-slate-200" />
      </div>

      <div className="grid shrink-0 border-b border-slate-100" style={gridStyle}>
        <div className="bg-slate-50" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5 border-s border-slate-100 bg-slate-50/60 py-2.5">
            <div className="h-2.5 w-10 rounded bg-slate-200" />
            <div className="size-8 rounded-full bg-slate-200" />
          </div>
        ))}
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="grid h-full" style={gridStyle}>
          <div className="space-y-7 bg-white py-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="mx-auto h-2 w-8 rounded bg-slate-100" />
            ))}
          </div>
          {Array.from({ length: 7 }).map((_, col) => (
            <div key={col} className="relative h-full border-s border-slate-100">
              {col === 0 && <div className="absolute end-2 top-8 h-14 w-24 rounded-xl bg-slate-200" />}
              {col === 1 && (
                <>
                  <div className="absolute end-2 top-16 h-24 w-24 rounded-xl bg-slate-200" />
                  <div className="absolute end-2 top-48 h-12 w-20 rounded-xl bg-slate-200" />
                </>
              )}
              {col === 3 && <div className="absolute end-2 top-6 h-16 w-24 rounded-xl bg-slate-200" />}
              {col === 5 && <div className="absolute end-2 top-36 h-20 w-28 rounded-xl bg-slate-200" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
