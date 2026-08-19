import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { CalendarDays, LayoutDashboard, Trophy } from 'lucide-react'
import Shell from '../../components/dashboard/Shell'

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

import PageSkeleton from '../../components/system/PageSkeleton'

export default function CommitteeDashboard() {
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
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/tournaments" element={<Tournaments />} />
          <Route path="/tournaments/:id" element={<TournamentDetail />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Suspense>
    </Shell>
  )
}
