import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import { Ban, CalendarDays, CalendarCheck, CircleX, LayoutDashboard, Map } from 'lucide-react'
import Shell from '../../components/dashboard/Shell'

const Overview = lazy(() => import('./overview'))
const Terrains = lazy(() => import('./terrains'))
const Calendar = lazy(() => import('./calendar'))
const Bookings = lazy(() => import('./bookings'))
const Closures = lazy(() => import('./closures'))
const Cancellations = lazy(() => import('./cancellations'))
const Notifications = lazy(() => import('./notifications'))
const Settings = lazy(() => import('./settings'))
const Profile = lazy(() => import('./profile'))

const items = [
  { to: '/terrain', label: 'nav.terrain.overview', icon: LayoutDashboard, prefetch: () => import('./overview') },
  { to: '/terrain/terrains', label: 'nav.terrain.terrains', icon: Map, prefetch: () => import('./terrains') },
  { to: '/terrain/calendar', label: 'nav.terrain.calendar', icon: CalendarDays, prefetch: () => import('./calendar') },
  { to: '/terrain/bookings', label: 'nav.terrain.bookings', icon: CalendarCheck, prefetch: () => import('./bookings') },
  { to: '/terrain/closures', label: 'nav.terrain.closures', icon: Ban, prefetch: () => import('./closures') },
  { to: '/terrain/cancellations', label: 'nav.terrain.cancellations', icon: CircleX, prefetch: () => import('./cancellations') },
]

const quickActions = [
  { label: 'nav.terrain.quick.newTerrain', to: '/terrain/terrains?new=1', icon: Map },
  { label: 'nav.terrain.quick.calendar', to: '/terrain/calendar', icon: CalendarDays },
  { label: 'nav.terrain.quick.manageBookings', to: '/terrain/bookings', icon: CalendarCheck },
  { label: 'nav.terrain.quick.addClosure', to: '/terrain/closures?new=1', icon: Ban },
]

const Fallback = () => (
  <div className="grid min-h-[60vh] place-items-center">
    <div className="size-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-green-500" />
  </div>
)

export default function TerrainDashboard() {
  return (
    <Shell
      items={items}
      brand="nav.terrain.brand"
      homeUrl="/"
      roleLabel="shell.roleTerrainOwner"
      quickActions={quickActions}
      notifPath="/terrain/notifications"
      settingsPath="/terrain/settings"
      profilePath="/terrain/profile"
    >
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/terrains" element={<Terrains />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/closures" element={<Closures />} />
          <Route path="/cancellations" element={<Cancellations />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Suspense>
    </Shell>
  )
}
