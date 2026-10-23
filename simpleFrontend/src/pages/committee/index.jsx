import { lazy, Suspense, useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { CalendarDays, LayoutDashboard, Trophy } from 'lucide-react'
import Shell from '../../components/dashboard/Shell'
import CommitteeMobileNav from '../../domains/committee/components/CommitteeMobileNav'
import PageSkeleton from '../../components/system/PageSkeleton'

const Overview = lazy(() => import('./overview'))
const Tournaments = lazy(() => import('./tournaments'))
const TournamentDetail = lazy(() => import('./tournaments/detail'))
const Notifications = lazy(() => import('./notifications'))
const Settings = lazy(() => import('./settings'))
const Profile = lazy(() => import('./profile'))

const items = [
  { to: '/committee', label: 'nav.committee.overview', icon: LayoutDashboard, prefetch: () => import('./overview') },
  { to: '/committee/tournaments', label: 'nav.committee.tournaments', icon: Trophy, prefetch: () => import('./tournaments') },
]

const quickActions = [
  { label: 'nav.committee.createTournament', to: '/committee/tournaments?new=1', icon: Trophy },
  { label: 'nav.committee.tournaments', to: '/committee/tournaments', icon: CalendarDays },
  { label: 'nav.committee.overview', to: '/committee', icon: LayoutDashboard },
]

export default function CommitteeDashboard() {
  const [activeTourId, setActiveTourId] = useState(() => {
    try {
      return localStorage.getItem('aji_committee_active_tournament_id') || null
    } catch {
      return null
    }
  })

  useEffect(() => {
    const handleStorage = () => {
      try {
        const id = localStorage.getItem('aji_committee_active_tournament_id')
        if (id) setActiveTourId(id)
      } catch {
        // ignore
      }
    }
    window.addEventListener('storage', handleStorage)
    window.addEventListener('aji_tournament_changed', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('aji_tournament_changed', handleStorage)
    }
  }, [])

  return (
    <Shell
      items={items}
      brand="nav.committee.brand"
      homeUrl="/"
      roleLabel="shell.roleCommittee"
      quickActions={quickActions}
      notifPath="/committee/notifications"
      settingsPath="/committee/settings"
      profilePath="/committee/profile"
    >
      <div className="pb-16 lg:pb-0">
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/" element={<Overview onActiveTournamentChange={setActiveTourId} />} />
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/tournaments/:id" element={<TournamentDetail />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </Suspense>
      </div>
      <CommitteeMobileNav activeTournamentId={activeTourId} />
    </Shell>
  )
}
