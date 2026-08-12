function SkeletonCard() {
  return (
    <div className="animate-pulse overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_rgba(17,24,39,0.08)] ring-1 ring-slate-100">
      <div className="h-[210px] bg-slate-200" />
      <div className="space-y-3 p-6">
        <div className="flex items-center justify-between">
          <div className="h-4 w-16 rounded-full bg-slate-200" />
          <div className="h-5 w-14 rounded-full bg-slate-200" />
        </div>
        <div className="h-5 w-3/4 rounded-full bg-slate-200" />
        <div className="h-3.5 w-1/2 rounded-full bg-slate-200" />
        <div className="h-3.5 w-2/3 rounded-full bg-slate-200" />
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="h-7 w-20 rounded-full bg-slate-200" />
          <div className="h-12 w-32 rounded-2xl bg-slate-200" />
        </div>
      </div>
    </div>
  )
}

export default function LoadingState() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-7 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />
    </div>
  )
}
