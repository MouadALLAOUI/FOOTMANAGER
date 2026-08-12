export default function ManagerProfileSkeleton({ className = '' }) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      <div className="h-3 w-28 rounded-md bg-slate-200" />
      <div className="flex items-center gap-3">
        <div className="size-11 shrink-0 rounded-2xl bg-slate-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-28 rounded-md bg-slate-200" />
          <div className="h-2.5 w-20 rounded-md bg-slate-200" />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="h-9 rounded-xl bg-slate-200" />
        <div className="h-9 rounded-xl bg-slate-200" />
      </div>
    </div>
  )
}
