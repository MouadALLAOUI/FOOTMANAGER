import type { Href } from 'expo-router';

import type { Role } from '@/auth/roles';
import { ROLE, hasAdminAccess } from '@/auth/roles';

export interface TabConfig {
  key: string;
  labelKey: string;
  href: string;
  icon?: string;
}

const MANAGER_TABS: TabConfig[] = [
  { key: 'home', labelKey: 'nav.home', href: '/(manager)' },
  { key: 'matches', labelKey: 'nav.matches', href: '/(manager)/matches' },
  { key: 'team', labelKey: 'nav.team', href: '/(manager)/team' },
  { key: 'bookings', labelKey: 'nav.bookings', href: '/(manager)/bookings' },
  { key: 'profile', labelKey: 'nav.profile', href: '/(manager)/profile' },
];

const PLAYER_TABS: TabConfig[] = [
  { key: 'home', labelKey: 'nav.home', href: '/(player)' },
  { key: 'matches', labelKey: 'nav.matches', href: '/(player)/matches' },
  { key: 'bookings', labelKey: 'nav.bookings', href: '/(player)/bookings' },
  { key: 'team', labelKey: 'nav.team', href: '/(player)/team' },
  { key: 'profile', labelKey: 'nav.profile', href: '/(player)/profile' },
];

const TERRAIN_TABS: TabConfig[] = [
  { key: 'home', labelKey: 'nav.home', href: '/(terrain)' },
  { key: 'bookings', labelKey: 'nav.bookings', href: '/(terrain)/bookings' },
  { key: 'fields', labelKey: 'nav.fields', href: '/(terrain)/fields' },
  { key: 'profile', labelKey: 'nav.profile', href: '/(terrain)/profile' },
];

const COMMITTEE_TABS: TabConfig[] = [
  { key: 'home', labelKey: 'nav.home', href: '/(committee)' },
  { key: 'tournaments', labelKey: 'nav.tournaments', href: '/(committee)/tournaments' },
  { key: 'profile', labelKey: 'nav.profile', href: '/(committee)/profile' },
];

const ADMIN_TABS: TabConfig[] = [
  { key: 'home', labelKey: 'nav.home', href: '/(admin)' },
  { key: 'approvals', labelKey: 'nav.approvals', href: '/(admin)/approvals' },
  { key: 'users', labelKey: 'nav.users', href: '/(admin)/users' },
  { key: 'profile', labelKey: 'nav.profile', href: '/(admin)/profile' },
];

const TABS_BY_ROLE: Record<string, TabConfig[]> = {
  [ROLE.manager]: MANAGER_TABS,
  [ROLE.player]: PLAYER_TABS,
  [ROLE.terrain_owner]: TERRAIN_TABS,
  [ROLE.committee]: COMMITTEE_TABS,
  [ROLE.admin]: ADMIN_TABS,
  [ROLE.sub_admin]: ADMIN_TABS,
};

export function getTabsForRole(role: Role | string | null | undefined): TabConfig[] {
  if (!role) return MANAGER_TABS;
  if (hasAdminAccess(role as Role)) return ADMIN_TABS;
  return TABS_BY_ROLE[role] ?? MANAGER_TABS;
}

const PROFILE_BY_ROLE: Record<string, string> = {
  [ROLE.manager]: '/(manager)/profile',
  [ROLE.player]: '/(player)/profile',
  [ROLE.terrain_owner]: '/(terrain)/profile',
  [ROLE.committee]: '/(committee)/profile',
  [ROLE.admin]: '/(admin)/profile',
  [ROLE.sub_admin]: '/(admin)/profile',
};

const SETTINGS_BY_ROLE: Record<string, string> = {
  [ROLE.manager]: '/(manager)/settings',
  [ROLE.player]: '/(player)/settings',
  [ROLE.terrain_owner]: '/(terrain)/settings',
  [ROLE.committee]: '/(committee)/settings',
  [ROLE.admin]: '/(admin)/settings',
  [ROLE.sub_admin]: '/(admin)/settings',
};

const NOTIFICATIONS_BY_ROLE: Record<string, string> = {
  [ROLE.manager]: '/(manager)/notifications',
  [ROLE.player]: '/(player)/notifications',
  [ROLE.terrain_owner]: '/(terrain)/notifications',
  [ROLE.committee]: '/(committee)/notifications',
  [ROLE.admin]: '/(admin)/notifications',
  [ROLE.sub_admin]: '/(admin)/notifications',
};

export function profilePathForRole(role: Role | string | null | undefined): Href {
  if (!role) return '/(manager)/profile';
  return (PROFILE_BY_ROLE[role] ?? '/(manager)/profile') as Href;
}

export function settingsPathForRole(role: Role | string | null | undefined): Href {
  if (!role) return '/(manager)/settings';
  return (SETTINGS_BY_ROLE[role] ?? '/(manager)/settings') as Href;
}

export function notificationsPathForRole(role: Role | string | null | undefined): Href {
  if (!role) return '/(manager)/notifications';
  return (NOTIFICATIONS_BY_ROLE[role] ?? '/(manager)/notifications') as Href;
}
