export const ROLE = {
  admin: 'admin',
  sub_admin: 'sub_admin',
  manager: 'manager',
  terrain_owner: 'terrain_owner',
  player: 'player',
  committee: 'committee',
} as const;

export type Role = (typeof ROLE)[keyof typeof ROLE];

export const ALL_ROLES: Role[] = Object.values(ROLE);

export const SELF_REGISTRABLE_ROLES: Role[] = [
  ROLE.manager,
  ROLE.terrain_owner,
  ROLE.player,
  ROLE.committee,
];

export const ADMIN_ROLES: Role[] = [ROLE.admin, ROLE.sub_admin];

export const ROLE_LABELS: Record<Role, { ar: string; en: string; fr: string }> = {
  admin: { ar: 'مدير النظام', en: 'Admin', fr: 'Admin' },
  sub_admin: { ar: 'مسؤول فرعي', en: 'Sub-Admin', fr: 'Sous-admin' },
  manager: { ar: 'مسير فريق', en: 'Manager', fr: 'Manager' },
  terrain_owner: { ar: 'صاحب ملعب', en: 'Field Owner', fr: 'Propriétaire' },
  player: { ar: 'لاعب', en: 'Player', fr: 'Joueur' },
  committee: { ar: 'اللجنة المنظمة', en: 'Committee', fr: 'Comité' },
};

// ─── Type guards ────────────────────────────────────────────

export function isAdmin(role: Role): boolean {
  return role === ROLE.admin;
}

export function isSubAdmin(role: Role): boolean {
  return role === ROLE.sub_admin;
}

export function hasAdminAccess(role: Role): boolean {
  return role === ROLE.admin || role === ROLE.sub_admin;
}

export function isManager(role: Role): boolean {
  return role === ROLE.manager;
}

export function isTerrainOwner(role: Role): boolean {
  return role === ROLE.terrain_owner;
}

export function isPlayer(role: Role): boolean {
  return role === ROLE.player;
}

export function isCommittee(role: Role): boolean {
  return role === ROLE.committee;
}

export function isSelfRegistrable(role: Role): boolean {
  return SELF_REGISTRABLE_ROLES.includes(role);
}

export function roleLabel(role: Role, locale: 'ar' | 'en' | 'fr' = 'ar'): string {
  return ROLE_LABELS[role]?.[locale] ?? role;
}
