import type { Href } from 'expo-router';

import type { Role } from '@/auth/roles';
import { ROLE, hasAdminAccess } from '@/auth/roles';

const ROLE_HOMES: Record<Role, Href> = {
  [ROLE.admin]: '/(admin)',
  [ROLE.sub_admin]: '/(admin)',
  [ROLE.manager]: '/(manager)',
  [ROLE.terrain_owner]: '/(terrain)',
  [ROLE.player]: '/(player)',
  [ROLE.committee]: '/(committee)',
};

const FALLBACK_HOME: Href = '/(public)';

export function homeForRole(role: Role | string | undefined | null): Href {
  if (!role) return FALLBACK_HOME;
  if (hasAdminAccess(role as Role)) return ROLE_HOMES[ROLE.admin];
  return ROLE_HOMES[role as Role] ?? FALLBACK_HOME;
}
