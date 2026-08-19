export default function PlanSkeleton() {
  return (
    <div className="flex flex-wrap justify-center gap-8">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-full max-w-lg animate-pulse rounded-[26px] bg-white p-8 shadow-[0_8px_30px_rgba(17,24,39,0.08)] ring-1 ring-slate-100 lg:p-10"
        >
          <div className="h-5 w-1/3 rounded-full bg-slate-200" />
          <div className="mt-3 h-3.5 w-2/3 rounded-full bg-slate-200" />
          <div className="mt-6 h-10 w-1/2 rounded-full bg-slate-200" />
          <div className="mt-8 space-y-3 border-t border-slate-100 pt-8">
            <div className="h-3.5 w-3/4 rounded-full bg-slate-200" />
            <div className="h-3.5 w-2/3 rounded-full bg-slate-200" />
            <div className="h-3.5 w-3/5 rounded-full bg-slate-200" />
          </div>
          <div className="mt-8 h-12 w-full rounded-2xl bg-slate-200" />
        </div>
      ))}
    </div>
  )
}
