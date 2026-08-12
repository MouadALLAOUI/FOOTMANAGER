import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import {
  CalendarCheck,
  Handshake,
  LayoutDashboard,
  Radar,
  Shield,
  Swords,
  Users,
} from 'lucide-react'
import Shell from '../../components/dashboard/Shell'

const Overview = lazy(() => import('./overview'))
const Matches = lazy(() => import('./matches'))
const Feed = lazy(() => import('./feed'))
const Team = lazy(() => import('./team'))
const Players = lazy(() => import('./players'))
const Bookings = lazy(() => import('./bookings'))
const Recruitment = lazy(() => import('./recruitment'))
const Notifications = lazy(() => import('./notifications'))
const Settings = lazy(() => import('./settings'))
const Profile = lazy(() => import('./profile'))

const items = [
  { to: '/dashboard', label: 'nav.manager.overview', icon: LayoutDashboard, prefetch: () => import('./overview') },
  { to: '/dashboard/matches', label: 'nav.manager.matches', icon: Swords, prefetch: () => import('./matches') },
  { to: '/dashboard/feed', label: 'nav.manager.feed', icon: Radar, prefetch: () => import('./feed') },
  { to: '/dashboard/recruitment', label: 'nav.manager.recruitment', icon: Handshake, prefetch: () => import('./recruitment') },
  { to: '/dashboard/team', label: 'nav.manager.team', icon: Shield, prefetch: () => import('./team') },
  { to: '/dashboard/players', label: 'nav.manager.players', icon: Users, prefetch: () => import('./players') },
  { to: '/dashboard/bookings', label: 'nav.manager.bookings', icon: CalendarCheck, prefetch: () => import('./bookings') },
]

const Fallback = () => (
  <div className="grid min-h-[60vh] place-items-center">
    <div className="size-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-green-500" />
  </div>
)

export default function ManagerDashboard() {
  return (
    <Shell items={items} brand="nav.manager.brand" homeUrl="/">
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/recruitment" element={<Recruitment />} />
          <Route path="/team" element={<Team />} />
          <Route path="/players" element={<Players />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Suspense>
    </Shell>
  )
}
