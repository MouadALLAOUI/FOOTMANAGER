import { lazy, Suspense, useMemo } from 'react'
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
  Inbox,
  BarChart3,
  Bell,
  CreditCard,
  UserPlus,
} from 'lucide-react'
import Shell from '../../components/admin/Shell'
import { usePermission } from '../../context/AuthContext'

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
const Messages = lazy(() => import('./messages'))
const Analytics = lazy(() => import('./analytics'))
const Notifications = lazy(() => import('./notifications'))
const Plans = lazy(() => import('./plans'))
const SubAdmins = lazy(() => import('./sub-admins'))
const Requests = lazy(() => import('./requests'))

const navConfig = [
  {
    label: 'nav.admin.groups.main',
    items: [
      { to: '/admin', label: 'nav.admin.overview', icon: LayoutDashboard, end: true, prefetch: () => import('./overview') },
      { to: '/admin/analytics', label: 'nav.admin.analytics', icon: BarChart3, prefetch: () => import('./analytics'), permission: 'analytics.view' },
      { to: '/admin/notifications', label: 'nav.admin.notifications', icon: Bell, prefetch: () => import('./notifications') },
    ],
  },
  {
    label: 'nav.admin.groups.users',
    items: [
      { to: '/admin/managers', label: 'nav.admin.managers', icon: UserRound, prefetch: () => import('./managers'), permission: 'users.view' },
      { to: '/admin/owners', label: 'nav.admin.owners', icon: Flag, prefetch: () => import('./owners'), permission: 'users.view' },
      { to: '/admin/players', label: 'nav.admin.players', icon: Users, prefetch: () => import('./players'), permission: 'users.view' },
      { to: '/admin/committees', label: 'nav.admin.committees', icon: Trophy, prefetch: () => import('./committees'), permission: 'users.view' },
      { to: '/admin/requests', label: 'nav.admin.requests', icon: Users, prefetch: () => import('./requests'), permission: 'users.view' },
    ],
  },
  {
    label: 'nav.admin.groups.moderation',
    items: [
      { to: '/admin/moderation', label: 'nav.admin.moderation', icon: ShieldAlert, prefetch: () => import('./moderation'), permission: 'moderation.view' },
      { to: '/admin/activities', label: 'nav.admin.activity', icon: ClipboardList, prefetch: () => import('./activity'), permission: 'activity.view' },
    ],
  },
  {
    label: 'nav.admin.groups.platform',
    items: [
      { to: '/admin/messages', label: 'nav.admin.messages', icon: Inbox, prefetch: () => import('./messages'), permission: 'messages.view' },
      { to: '/admin/facilities', label: 'nav.admin.facilities', icon: Hotel, prefetch: () => import('./facilities'), permission: 'facilities.view' },
      { to: '/admin/plans', label: 'nav.admin.plans', icon: CreditCard, prefetch: () => import('./plans'), permission: 'plans.view' },
      { to: '/admin/settings', label: 'nav.admin.settings', icon: Settings, prefetch: () => import('./settings'), permission: 'settings.view' },
      { to: '/admin/profile', label: 'nav.admin.profile', icon: UserCog, prefetch: () => import('./profile') },
    ],
  },
]

const subAdminGroup = {
  label: 'nav.admin.groups.administration',
  items: [
    { to: '/admin/sub-admins', label: 'nav.admin.subAdmins', icon: UserPlus, prefetch: () => import('./sub-admins') },
  ],
}

import PageSkeleton from '../../components/system/PageSkeleton'

export default function AdminDashboard() {
  const can = usePermission()

  const groups = useMemo(() => {
    const filtered = navConfig
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => !item.permission || can(item.permission)),
      }))
      .filter((group) => group.items.length > 0)

    if (can('admin.manage')) {
      filtered.push(subAdminGroup)
    }

    return filtered
  }, [can])

  return (
    <Shell groups={groups} brand="nav.admin.brand">
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/managers" element={<Managers />} />
          <Route path="/owners" element={<Owners />} />
          <Route path="/players" element={<Players />} />
          <Route path="/committees" element={<Committees />} />
          <Route path="/requests" element={<Requests />} />
          <Route path="/moderation" element={<Moderation />} />
          <Route path="/facilities" element={<Facilities />} />
          <Route path="/plans" element={<Plans />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/activities" element={<Activity />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/sub-admins" element={<SubAdmins />} />
        </Routes>
      </Suspense>
    </Shell>
  )
}
