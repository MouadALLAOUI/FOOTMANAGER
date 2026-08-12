import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Shell from '../../components/dashboard/Shell'
import {
  faGaugeHigh,
  faMagnifyingGlass,
  faFileCircleCheck,
  faFutbol,
  faUser,
} from '@fortawesome/free-solid-svg-icons'

const Overview = lazy(() => import('./overview'))
const Feed = lazy(() => import('./feed'))
const Applications = lazy(() => import('./applications'))
const Matches = lazy(() => import('./matches'))
const Profile = lazy(() => import('./profile'))

const items = [
  { to: '/player', label: 'nav.player.overview', icon: faGaugeHigh, prefetch: () => import('./overview') },
  { to: '/player/feed', label: 'nav.player.feed', icon: faMagnifyingGlass, prefetch: () => import('./feed') },
  { to: '/player/applications', label: 'nav.player.applications', icon: faFileCircleCheck, prefetch: () => import('./applications') },
  { to: '/player/matches', label: 'nav.player.matches', icon: faFutbol, prefetch: () => import('./matches') },
  { to: '/player/profile', label: 'nav.player.profile', icon: faUser, prefetch: () => import('./profile') },
]

const Fallback = () => (
  <div className="grid min-h-[60vh] place-items-center">
    <div className="size-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-green-500" />
  </div>
)

export default function PlayerDashboard() {
  return (
    <Shell items={items} brand="nav.player.brand" homeUrl="/">
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/feed" element={<Feed />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Suspense>
    </Shell>
  )
}
