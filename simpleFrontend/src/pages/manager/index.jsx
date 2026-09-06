import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import {
  BarChart3,
  CalendarCheck,
  Goal,
  Handshake,
  LayoutDashboard,
  Radar,
  Shield,
  Swords,
  Trophy,
  Users,
} from 'lucide-react'
import Shell from '../../components/dashboard/Shell'

const Overview = lazy(() => import('./overview'))
const Matches = lazy(() => import('./matches'))
const Feed = lazy(() => import('./feed'))
const Team = lazy(() => import('./team'))
const Players = lazy(() => import('./players'))
const Formation = lazy(() => import('./formation'))
const Bookings = lazy(() => import('./bookings'))
const Tournaments = lazy(() => import('./tournaments'))
const Recruitment = lazy(() => import('./recruitment'))
const Analytics = lazy(() => import('./analytics'))
const Notifications = lazy(() => import('./notifications'))
const Settings = lazy(() => import('./settings'))
const Profile = lazy(() => import('./profile'))
const LiveMatch = lazy(() => import('./live'))

const items = [
  { to: '/dashboard', label: 'nav.manager.overview', shortLabel: 'nav.manager.shortOverview', icon: LayoutDashboard, prefetch: () => import('./overview') },
  { to: '/dashboard/analytics', label: 'nav.manager.analytics', icon: BarChart3, prefetch: () => import('./analytics') },
  { to: '/dashboard/matches', label: 'nav.manager.matches', icon: Swords, prefetch: () => import('./matches') },
  { to: '/dashboard/feed', label: 'nav.manager.feed', shortLabel: 'nav.manager.shortFeed', icon: Radar, prefetch: () => import('./feed') },
  { to: '/dashboard/recruitment', label: 'nav.manager.recruitment', shortLabel: 'nav.manager.shortRecruitment', icon: Handshake, prefetch: () => import('./recruitment') },
  { to: '/dashboard/team', label: 'nav.manager.team', icon: Shield, prefetch: () => import('./team') },
  { to: '/dashboard/formation', label: 'nav.manager.formation', shortLabel: 'nav.manager.shortFormation', icon: Goal, prefetch: () => import('./formation') },
  { to: '/dashboard/players', label: 'nav.manager.players', icon: Users, prefetch: () => import('./players') },
  { to: '/dashboard/bookings', label: 'nav.manager.bookings', icon: CalendarCheck, prefetch: () => import('./bookings') },
  { to: '/dashboard/tournaments', label: 'nav.manager.tournaments', icon: Trophy, prefetch: () => import('./tournaments') },
]

import PageSkeleton from '../../components/system/PageSkeleton'
import { TeamProvider } from '../../context/TeamContext'
import TeamSwitcher from '../../components/dashboard/TeamSwitcher'

export default function ManagerDashboard() {
  return (
    <TeamProvider>
      <Shell items={items} brand="nav.manager.brand" homeUrl="/" headerSlot={<TeamSwitcher />}>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
            <Route path="/" element={<Overview />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/matches" element={<Matches />} />
            <Route path="/feed" element={<Feed />} />
            <Route path="/recruitment" element={<Recruitment />} />
            <Route path="/team" element={<Team />} />
            <Route path="/formation" element={<Formation />} />
            <Route path="/players" element={<Players />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/tournaments" element={<Tournaments />} />
            <Route path="/live/:matchId" element={<LiveMatch />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </Suspense>
      </Shell>
    </TeamProvider>
  )
}

