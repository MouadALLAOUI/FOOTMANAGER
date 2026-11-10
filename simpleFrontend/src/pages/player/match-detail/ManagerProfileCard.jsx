import { Link } from 'react-router-dom'
import { Shield, MapPin, Users } from 'lucide-react'
import { useProfileModal } from '../../../components/profile/ProfileModalContext'

export default function ManagerProfileCard({ manager }) {
  const { openManager } = useProfileModal()
  if (!manager) return null

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if (e.target.closest('button, a')) return
        if (manager.id != null) openManager(manager.id, { name: manager.name })
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          if (manager.id != null) openManager(manager.id, { name: manager.name })
        }
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
              <span className="truncate">
                {manager.team.id != null && manager.team.name ? (
                  <Link
                    to={`/teams/${manager.team.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="hover:text-primary transition-colors"
                  >
                    {manager.team.name}
                  </Link>
                ) : (
                  manager.team.name
                )}
              </span>
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
