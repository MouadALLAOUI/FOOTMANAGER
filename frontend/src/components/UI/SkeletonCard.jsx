export default function SkeletonCard({ className = '', avatar = false, lines = 3 }) {
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm p-4 animate-pulse ${className}`}>
      {avatar && (
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-slate-200/70 shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-3 bg-slate-200/70 rounded-full w-2/3" />
            <div className="h-2.5 bg-slate-200/70 rounded-full w-1/3" />
          </div>
        </div>
      )}
      <div className="space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className="h-3 bg-slate-200/70 rounded-full"
            style={{ width: `${[100, 90, 75, 60][i % 4]}%` }}
          />
        ))}
      </div>
    </div>
  );
}
