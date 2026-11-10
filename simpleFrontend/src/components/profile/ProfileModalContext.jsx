import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import UserProfileModal from './UserProfileModal'

const ProfileModalContext = createContext(null)

function resolveTeamId(t) {
  if (t == null) return null
  if (typeof t === 'number' || typeof t === 'string') {
    const str = String(t).trim()
    return str || null
  }
  const rawId = t?.team?.id ?? t?.team_id ?? t?.id ?? null
  return rawId != null ? rawId : null
}

export function ProfileModalProvider({ children }) {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)

  const openTeam = useCallback(
    (t) => {
      const teamId = resolveTeamId(t)
      if (teamId == null) return
      setUser(null)
      if (typeof document !== 'undefined') {
        document.body.style.overflow = ''
      }
      navigate(`/teams/${encodeURIComponent(String(teamId))}`)
    },
    [navigate],
  )

  const openUser = useCallback((type, id, fallback) => {
    if (id != null) setUser({ type, id, fallback })
  }, [])

  const value = useMemo(
    () => ({
      openTeam,
      openManager: (id, fallback) => openUser('manager', id, fallback),
      openPlayer: (id, fallback) => openUser('player', id, fallback),
      openOwner: (id, fallback) => openUser('owner', id, fallback),
      openCommittee: (id, fallback) => openUser('committee', id, fallback),
    }),
    [openTeam, openUser],
  )

  return (
    <ProfileModalContext.Provider value={value}>
      {children}
      <UserProfileModal user={user} onClose={() => setUser(null)} />
    </ProfileModalContext.Provider>
  )
}

const FALLBACK = {
  openTeam: () => {},
  openManager: () => {},
  openPlayer: () => {},
  openOwner: () => {},
  openCommittee: () => {},
}

export function useProfileModal() {
  const ctx = useContext(ProfileModalContext)
  if (!ctx) {
    // Fail soft: a missing provider must never take down a page that renders
    // shared row components (leaderboard, tournament sections). Warn loudly instead.
    console.warn('useProfileModal used outside ProfileModalProvider — profile modal disabled for this render')
    return FALLBACK
  }
  return ctx
}
