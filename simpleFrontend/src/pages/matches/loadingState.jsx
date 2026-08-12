function SectionTitleSkeleton() {
  return (
    <div className="flex flex-col items-center">
      <div className="h-5 w-28 animate-pulse rounded-full bg-slate-200" />
      <div className="mt-5 h-9 w-64 animate-pulse rounded-xl bg-slate-200" />
      <div className="mt-3 h-4 w-80 max-w-[80%] animate-pulse rounded-lg bg-slate-200" />
    </div>
  )
}

function LiveSkeleton() {
  return (
    <div className="h-[260px] w-[min(420px,86vw)] shrink-0 animate-pulse rounded-[28px] bg-slate-200" />
  )
}

function TeamSkeleton() {
  return (
    <div className="animate-pulse rounded-[28px] bg-white p-6 shadow-[0_8px_30px_rgba(17,24,39,0.05)] ring-1 ring-slate-100">
      <div className="mx-auto size-[88px] rounded-[26px] bg-slate-200" />
      <div className="mx-auto mt-4 h-5 w-32 rounded-full bg-slate-200" />
      <div className="mx-auto mt-2.5 h-6 w-20 rounded-full bg-slate-200" />
      <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-5">
        <div className="h-4 w-full rounded-full bg-slate-200" />
        <div className="h-4 w-3/4 rounded-full bg-slate-200" />
        <div className="h-4 w-2/3 rounded-full bg-slate-200" />
      </div>
      <div className="mt-5 h-[50px] rounded-2xl bg-slate-200" />
    </div>
  )
}

function LeaderboardSkeleton() {
  return (
    <div className="animate-pulse rounded-[28px] bg-white p-6 shadow-[0_24px_70px_rgba(17,24,39,0.05)] ring-1 ring-slate-100">
      <div className="space-y-4">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="size-11 rounded-2xl bg-slate-200" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/3 rounded-full bg-slate-200" />
              <div className="h-3 w-1/4 rounded-full bg-slate-200" />
            </div>
            <div className="h-6 w-10 rounded-lg bg-slate-200" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LoadingState() {
  return (
    <div className="fade-in bg-white">
      <section className="pt-[100px] lg:pt-[120px]">
        <div className="mx-auto max-w-[1400px] px-6">
          <SectionTitleSkeleton />
          <div className="mt-12 flex gap-7 overflow-hidden">
            <LiveSkeleton />
            <LiveSkeleton />
            <LiveSkeleton />
          </div>
        </div>
      </section>

      <section className="mt-[100px] bg-slate-50 py-[100px] lg:mt-[120px] lg:py-[120px]">
        <div className="mx-auto max-w-[1400px] px-6">
          <SectionTitleSkeleton />
          <div className="mt-12 grid grid-cols-1 gap-7 sm:grid-cols-2 xl:grid-cols-4">
            <TeamSkeleton />
            <TeamSkeleton />
            <TeamSkeleton />
            <TeamSkeleton />
          </div>
        </div>
      </section>

      <section className="pt-[100px] lg:pt-[120px]">
        <div className="mx-auto max-w-[1400px] px-6">
          <SectionTitleSkeleton />
          <div className="mt-12">
            <LeaderboardSkeleton />
          </div>
        </div>
      </section>
    </div>
  )
}
