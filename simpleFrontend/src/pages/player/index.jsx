import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Shell from '../../components/dashboard/Shell'
import { FileCheck, Search, ShieldCheck, Swords, UserRound, Users } from 'lucide-react'
import {
  faGaugeHigh,
  faMagnifyingGlass,
  faFileCircleCheck,
  faFutbol,
  faUser,
} from '@fortawesome/free-solid-svg-icons'

const Overview = lazy(() => import('./overview'))
const Feed = lazy(() => import('./feed'))
const MatchDetail = lazy(() => import('./match-detail'))
const Applications = lazy(() => import('./applications'))
const Matches = lazy(() => import('./matches'))
const Profile = lazy(() => import('./profile'))
const Notifications = lazy(() => import('./notifications'))
const Settings = lazy(() => import('./settings'))
const Requests = lazy(() => import('./requests'))
const Team = lazy(() => import('./team'))

const items = [
  { to: '/player', label: 'nav.player.overview', icon: faGaugeHigh, prefetch: () => import('./overview') },
  { to: '/player/feed', label: 'nav.player.feed', icon: faMagnifyingGlass, prefetch: () => import('./feed') },
  { to: '/player/applications', label: 'nav.player.applications', icon: faFileCircleCheck, prefetch: () => import('./applications') },
  { to: '/player/requests', label: 'nav.player.requests', icon: Users, prefetch: () => import('./requests') },
  { to: '/player/matches', label: 'nav.player.matches', icon: faFutbol, prefetch: () => import('./matches') },
  { to: '/player/team', label: 'nav.player.team', icon: ShieldCheck, prefetch: () => import('./team') },
  { to: '/player/profile', label: 'nav.player.profile', icon: faUser, prefetch: () => import('./profile') },
]

const quickActions = [
  { label: 'player.overview.quick.findMatch', to: '/player/feed', icon: Search },
  { label: 'player.overview.quick.applications', to: '/player/applications', icon: FileCheck },
  { label: 'player.overview.quick.matches', to: '/player/matches', icon: Swords },
  { label: 'player.overview.quick.profile', to: '/player/profile', icon: UserRound },
]

import PageSkeleton from '../../components/system/PageSkeleton'

export default function PlayerDashboard() {
  return (
    <Shell
      items={items}
      brand="nav.player.brand"
      homeUrl="/"
      roleLabel="shell.rolePlayer"
      quickActions={quickActions}
      notifPath="/player/notifications"
      settingsPath="/player/settings"
      profilePath="/player/profile"
    >
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/matches/:matchId" element={<MatchDetail />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/team" element={<Team />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Suspense>
    </Shell>
  )
}
