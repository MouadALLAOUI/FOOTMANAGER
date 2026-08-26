/**
 * Deep linking foundation for future notifications.
 * Expo Router already handles `footmanager://` via `app.json` scheme + typedRoutes.
 * This file documents the mapping and provides helpers so Phase 4 can push
 * `footmanager://(manager)/matches/123`, `footmanager://(terrain)/bookings/456`, etc.
 *
 * Supported deep links (all require auth + role):
 *  - footmanager://match/{id}          → role-aware Matches tab + detail
 *  - footmanager://booking/{id}        → role-aware Bookings + detail
 *  - footmanager://team/{id}           → public team page or manager team
 *  - footmanager://terrain/{id}        → terrain detail / fields
 *  - footmanager://notification/{id}   → notifications inbox + detail
 *  - footmanager://tournament/{id}     → tournament detail
 */
export const LINKING_PREFIXES = ['footmanager://', 'https://footmanager.com'] as const;

export const DEEP_LINK_PATHS = {
  match: (id: string | number) => `footmanager://match/${id}`,
  booking: (id: string | number) => `footmanager://booking/${id}`,
  team: (id: string | number) => `footmanager://team/${id}`,
  terrain: (id: string | number) => `footmanager://terrain/${id}`,
  notification: (id: string | number) => `footmanager://notification/${id}`,
  tournament: (id: string | number) => `footmanager://tournament/${id}`,
} as const;

// Role-aware resolution for notifications — future Phase 4 will route based on `role`.
export function notificationTargetForRole(_role: string | null, notificationId: string): string {
  // Placeholder: all roles open their Home first, then deep link is handled by the notification screen.
  return `footmanager://notification/${notificationId}`;
}
