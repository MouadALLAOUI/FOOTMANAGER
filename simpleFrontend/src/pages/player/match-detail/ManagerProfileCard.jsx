import { Shield, MapPin, Users } from 'lucide-react'

export default function ManagerProfileCard({ manager }) {
  if (!manager) return null

  return (
    <div className="bg-surface rounded-xl border border-border p-4">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden shrink-0">
          {manager.avatar_url ? (
            <img src={manager.avatar_url} alt={manager.name} className="w-full h-full object-cover" />
          ) : (
            <Shield className="w-5 h-5 text-primary" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-sm truncate">{manager.name}</div>
          {manager.team && (
            <div className="text-xs text-muted flex items-center gap-1 mt-0.5">
              <Users className="w-3 h-3 shrink-0" />
              <span className="truncate">{manager.team.name}</span>
            </div>
          )}
          {manager.team?.city && (
            <div className="text-xs text-muted flex items-center gap-1 mt-0.5">
              <MapPin className="w-3 h-3 shrink-0" />
              <span className="truncate">{manager.team.city}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
