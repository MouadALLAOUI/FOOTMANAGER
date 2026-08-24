import { Shield, Swords, Target, HandMetal } from 'lucide-react'

const POSITION_META = {
  goalkeeper: { label: 'حارس المرمى', icon: HandMetal, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30' },
  defender: { label: 'مدافع', icon: Shield, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  midfielder: { label: 'لاعب وسط', icon: Target, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  forward: { label: 'مهاجم', icon: Swords, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/30' },
}

export default function PositionGrid({ availability, compact = false }) {
  if (!availability || Object.keys(availability).length === 0) return null

  return (
    <div className={`grid ${compact ? 'grid-cols-2 gap-2' : 'grid-cols-2 sm:grid-cols-4 gap-3'}`}>
      {Object.entries(availability).map(([pos, data]) => {
        const meta = POSITION_META[pos]
        if (!meta) return null
        const Icon = meta.icon
        const full = data.available <= 0

        return (
          <div
            key={pos}
            className={`relative rounded-xl border p-3 transition-all ${meta.bg} ${meta.border} ${full ? 'opacity-60' : ''}`}
          >
            <div className={`flex items-center gap-2 mb-2 ${meta.color}`}>
              <Icon className="w-4 h-4" />
              <span className="text-xs font-bold">{meta.label}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl font-black ${full ? 'text-gray-400' : meta.color}`}>
                {data.filled}
              </span>
              <span className="text-xs text-gray-400">/ {data.required}</span>
            </div>
            {full ? (
              <span className="absolute top-2 start-2 text-[10px] font-bold text-gray-400 bg-gray-700/50 px-1.5 py-0.5 rounded">
                مكتمل
              </span>
            ) : (
              <span className={`absolute top-2 start-2 text-[10px] font-bold ${meta.color} ${meta.bg} px-1.5 py-0.5 rounded`}>
                {data.available} متاح
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
