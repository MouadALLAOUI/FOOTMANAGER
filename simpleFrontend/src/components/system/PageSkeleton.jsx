export default function PageSkeleton({ full = false }) {
  return (
    <div className={full ? 'min-h-screen bg-[#f6f7fb] px-5 py-10' : 'min-h-[60vh]'} aria-hidden="true">
      <div className="page-enter animate-pulse space-y-6">
        <div className="h-7 w-44 rounded-xl bg-slate-200/80" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="h-28 rounded-3xl bg-slate-200/70" />
          <div className="h-28 rounded-3xl bg-slate-200/70" />
          <div className="h-28 rounded-3xl bg-slate-200/70" />
        </div>
        <div className="space-y-3">
          <div className="h-20 rounded-3xl bg-slate-200/70" />
          <div className="h-20 rounded-3xl bg-slate-200/70" />
        </div>
      </div>
    </div>
  )
}
