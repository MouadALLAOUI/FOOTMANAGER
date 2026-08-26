import { useMemo } from 'react';

import type { AuthUser } from '@/auth/AuthProvider';
import { isAdmin, isSubAdmin, type Role } from '@/auth/roles';

// ─── Permission slugs (mirrors backend PermissionSeeder) ───

export const PERMISSION = {
  usersView: 'users.view',
  usersManage: 'users.manage',
  usersAccounts: 'users.accounts',
  analyticsView: 'analytics.view',
  settingsView: 'settings.view',
  settingsManage: 'settings.manage',
  messagesView: 'messages.view',
  messagesManage: 'messages.manage',
  moderationView: 'moderation.view',
  moderationManage: 'moderation.manage',
  facilitiesView: 'facilities.view',
  facilitiesManage: 'facilities.manage',
  plansView: 'plans.view',
  plansManage: 'plans.manage',
  activityView: 'activity.view',
  adminManage: 'admin.manage',
} as const;

export type Permission = (typeof PERMISSION)[keyof typeof PERMISSION];

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSION);

// ─── can() factory ─────────────────────────────────────────

export type CanFn = (slug: Permission) => boolean;

export function createCan(user: AuthUser | null): CanFn {
  if (!user) return () => false;
  if (isAdmin(user.role as Role)) return () => true;
  if (!isSubAdmin(user.role as Role)) return () => false;

  const perms = user.permissions ?? [];
  const set = new Set(perms);
  return (slug: Permission) => set.has(slug);
}

// ─── Hook: usePermission ───────────────────────────────────

export function usePermission(user: AuthUser | null): CanFn {
  return useMemo(() => createCan(user), [user]);
}

// ─── Activity lock helpers ─────────────────────────────────

export interface ActivityLockInfo {
  locked: boolean;
  reason: string | null;
  lockedAt: string | null;
}

export function getActivityLockInfo(user: AuthUser | null): ActivityLockInfo {
  if (!user) return { locked: false, reason: null, lockedAt: null };
  return {
    locked: Boolean(user.activity_locked),
    reason: user.activity_lock_reason ?? null,
    lockedAt: user.activity_locked_at ?? null,
  };
}

export function useActivityLock(user: AuthUser | null): ActivityLockInfo {
  return useMemo(() => getActivityLockInfo(user), [user]);
}
