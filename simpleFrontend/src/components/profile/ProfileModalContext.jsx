import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import TeamProfileModal from './TeamProfileModal'
import UserProfileModal from './UserProfileModal'

const ProfileModalContext = createContext(null)

export function ProfileModalProvider({ children }) {
  const [team, setTeam] = useState(null)
  const [user, setUser] = useState(null)

  const openTeam = useCallback((t) => {
    if (t && t.id != null) setTeam(t)
  }, [])

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
      <TeamProfileModal team={team} onClose={() => setTeam(null)} />
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