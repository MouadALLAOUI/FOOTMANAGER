/**
 * Deep linking configuration for FOOT_MOBILE.
 *
 * Expo Router handles deep linking automatically via:
 * - app.json `scheme: "footmanager"`
 * - File-based route structure
 * - typedRoutes: true
 *
 * This module provides:
 * - Link prefix constants for external use
 * - Deep link URL builders
 * - Role-aware deep link resolvers
 *
 * Supported deep links (all require auth + role). Plural forms are the
 * canonical URLs; singular forms stay accepted for backwards compatibility:
 *  footmanager://matches/{id}       → (manager|player)/matches/[id]
 *  footmanager://tournaments/{id}   → (committee)/tournaments/[id]
 *  footmanager://fields/{id}        → (terrain)/fields/[id] (owner) or manager terrain
 *  footmanager://bookings/{id}      → role-aware bookings detail
 *  footmanager://notifications      → Notifications inbox
 */
import type { Href } from 'expo-router';

import type { Role } from '@/auth/roles';

export const LINKING_PREFIXES = ['footmanager://', 'https://footmanager.com'] as const;

export const DEEP_LINK_PATHS = {
  match: (id: string | number) => `footmanager://match/${id}`,
  matches: (id: string | number) => `footmanager://matches/${id}`,
  booking: (id: string | number) => `footmanager://booking/${id}`,
  bookings: (id: string | number) => `footmanager://bookings/${id}`,
  field: (id: string | number) => `footmanager://field/${id}`,
  fields: (id: string | number) => `footmanager://fields/${id}`,
  tournament: (id: string | number) => `footmanager://tournament/${id}`,
  tournaments: (id: string | number) => `footmanager://tournaments/${id}`,
  notifications: () => 'footmanager://notifications',
} as const;

export interface DeepLinkTarget {
  href: string;
  tab?: string;
}

export type DeepLinkKind = 'match' | 'booking' | 'field' | 'tournament' | 'notifications';

export interface ParsedDeepLink {
  kind: DeepLinkKind;
  /** Numeric id (or slug for tournaments) present for all kinds except `notifications`. */
  id?: string;
}

const KIND_MAP: Record<string, DeepLinkKind> = {
  match: 'match',
  matches: 'match',
  booking: 'booking',
  bookings: 'booking',
  field: 'field',
  fields: 'field',
  terrain: 'field',
  tournament: 'tournament',
  tournaments: 'tournament',
  notifications: 'notifications',
};

const NEEDS_ID: DeepLinkKind[] = ['match', 'booking', 'field', 'tournament'];

/**
 * Parse a deep link URL into its kind + identifier.
 *
 * Accepts `footmanager://matches/12`, `footmanager:///matches/12` and the old
 * singular `footmanager://match/12` spelling. Query strings are ignored.
 */
export function parseDeepLink(url: string): ParsedDeepLink | null {
  if (!url) return null;
  const clean = url.split(/[?#]/)[0].trim();
  if (!clean) return null;

  const schemeMatch = /^([a-z][a-z0-9+.-]*):\/\/(.*)$/i.exec(clean);
  const rest = (schemeMatch ? schemeMatch[2] : clean).replace(/^\/+/, '');
  const segments = rest
    .split('/')
    .map((s) => decodeURIComponent(s))
    .filter(Boolean);

  if (segments.length === 0) return null;

  const kindSeg = segments[0].toLowerCase();
  const kind = KIND_MAP[kindSeg];
  if (!kind) return null;

  if (kind === 'notifications') return { kind: 'notifications' };

  const idSeg = segments[1];
  if (!idSeg || NEEDS_ID.includes(kind) && !idSeg) return null;

  return { kind, id: idSeg };
}

export function resolveMatchLink(id: string, role: string | null): DeepLinkTarget {
  switch (role) {
    case 'manager':
      return { href: `/(manager)/matches/${id}`, tab: 'matches' };
    case 'player':
      return { href: `/(player)/matches/${id}`, tab: 'matches' };
    default:
      return { href: `/(manager)/matches/${id}` };
  }
}

export function resolveBookingLink(id: string, role: string | null): DeepLinkTarget {
  switch (role) {
    case 'manager':
      return { href: `/(manager)/bookings/${id}`, tab: 'bookings' };
    case 'player':
      return { href: `/(player)/bookings/${id}`, tab: 'bookings' };
    case 'terrain_owner':
      return { href: `/(terrain)/bookings/${id}`, tab: 'bookings' };
    default:
      return { href: `/(manager)/bookings/${id}` };
  }
}

export function resolveFieldLink(id: string, role: string | null): DeepLinkTarget {
  switch (role) {
    case 'terrain_owner':
      return { href: `/(terrain)/fields/${id}`, tab: 'fields' };
    case 'manager':
      return { href: `/(manager)/terrain`, tab: 'terrain' };
    default:
      return { href: `/(terrain)/fields/${id}` };
  }
}

export function resolveTournamentLink(id: string, role: string | null): DeepLinkTarget {
  switch (role) {
    case 'committee':
      return { href: `/(committee)/tournaments/${id}`, tab: 'tournaments' };
    default:
      return { href: `/(committee)/tournaments/${id}` };
  }
}

export function resolveNotificationLink(_id: string, role: string | null): DeepLinkTarget {
  const group = role === 'admin' || role === 'sub_admin' ? 'admin' : role ?? 'manager';
  return { href: `/${group}/notifications` };
}

/** Resolve a parsed deep link to a router href the current role can open. */
export function deepLinkTarget(parsed: ParsedDeepLink, role: Role | null): Href | null {
  if (parsed.kind === 'notifications') {
    return resolveNotificationLink('', role).href as Href;
  }
  if (!parsed.id) return null;
  switch (parsed.kind) {
    case 'match':
      return resolveMatchLink(parsed.id, role).href as Href;
    case 'booking':
      return resolveBookingLink(parsed.id, role).href as Href;
    case 'field':
      return resolveFieldLink(parsed.id, role).href as Href;
    case 'tournament':
      return resolveTournamentLink(parsed.id, role).href as Href;
    default:
      return null;
  }
}

export function resolveDeepLink(url: string, role: string | null): DeepLinkTarget | null {
  const parsed = parseDeepLink(url);
  if (!parsed) return null;

  if (parsed.kind === 'notifications') return resolveNotificationLink('', role);
  if (!parsed.id) return null;

  switch (parsed.kind) {
    case 'match':
      return resolveMatchLink(parsed.id, role);
    case 'booking':
      return resolveBookingLink(parsed.id, role);
    case 'field':
      return resolveFieldLink(parsed.id, role);
    case 'tournament':
      return resolveTournamentLink(parsed.id, role);
    default:
      return null;
  }
}