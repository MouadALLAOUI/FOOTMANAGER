import { Shield, MapPin, Users } from 'lucide-react'
import { useProfileModal } from '../../../components/profile/ProfileModalContext'

export default function ManagerProfileCard({ manager }) {
  const { openManager } = useProfileModal()
  if (!manager) return null

  return (
    <button
      type="button"
      onClick={() => {
        if (manager.id != null) openManager(manager.id, { name: manager.name })
      }}
      className="bg-surface w-full cursor-pointer rounded-xl border border-border p-4 text-start transition-colors hover:border-primary/30 hover:bg-primary/5"
    >
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
    </button>
  )
}
