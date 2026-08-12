import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import {
  LayoutDashboard,
  UserRound,
  Flag,
  Users,
  ShieldAlert,
  ClipboardList,
  Hotel,
  Settings,
  UserCog,
  Trophy,
} from 'lucide-react'
import Shell from '../../components/admin/Shell'

const Overview = lazy(() => import('./overview'))
const Managers = lazy(() => import('./managers'))
const Owners = lazy(() => import('./owners'))
const Players = lazy(() => import('./players'))
const Committees = lazy(() => import('./committees'))
const Moderation = lazy(() => import('./moderation'))
const Facilities = lazy(() => import('./facilities'))
const SettingsPage = lazy(() => import('./settings'))
const Activity = lazy(() => import('./activity'))
const Profile = lazy(() => import('./profile'))

const groups = [
  {
    label: 'nav.admin.groups.main',
    items: [{ to: '/admin', label: 'nav.admin.overview', icon: LayoutDashboard, end: true, prefetch: () => import('./overview') }],
  },
  {
    label: 'nav.admin.groups.users',
    items: [
      { to: '/admin/managers', label: 'nav.admin.managers', icon: UserRound, prefetch: () => import('./managers') },
      { to: '/admin/owners', label: 'nav.admin.owners', icon: Flag, prefetch: () => import('./owners') },
      { to: '/admin/players', label: 'nav.admin.players', icon: Users, prefetch: () => import('./players') },
      { to: '/admin/committees', label: 'nav.admin.committees', icon: Trophy, prefetch: () => import('./committees') },
    ],
  },
  {
    label: 'nav.admin.groups.moderation',
    items: [
      { to: '/admin/moderation', label: 'nav.admin.moderation', icon: ShieldAlert, prefetch: () => import('./moderation') },
      { to: '/admin/activities', label: 'nav.admin.activity', icon: ClipboardList, prefetch: () => import('./activity') },
    ],
  },
  {
    label: 'nav.admin.groups.platform',
    items: [
      { to: '/admin/facilities', label: 'nav.admin.facilities', icon: Hotel, prefetch: () => import('./facilities') },
      { to: '/admin/settings', label: 'nav.admin.settings', icon: Settings, prefetch: () => import('./settings') },
      { to: '/admin/profile', label: 'nav.admin.profile', icon: UserCog, prefetch: () => import('./profile') },
    ],
  },
]

const Fallback = () => (
  <div className="grid min-h-[60vh] place-items-center">
    <div className="size-9 animate-spin rounded-full border-[3px] border-slate-200 border-t-green-500" />
  </div>
)

export default function AdminDashboard() {
  return (
    <Shell groups={groups} brand="nav.admin.brand">
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/managers" element={<Managers />} />
          <Route path="/owners" element={<Owners />} />
          <Route path="/players" element={<Players />} />
          <Route path="/committees" element={<Committees />} />
          <Route path="/moderation" element={<Moderation />} />
          <Route path="/facilities" element={<Facilities />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/activities" element={<Activity />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </Suspense>
    </Shell>
  )
}
