/**
 * Query keys — Phase 1.5
 *
 * Ported verbatim from simpleFrontend/src/api/queries.js `q` factory so cache
 * keys and invalidation scopes stay conceptually identical across web/mobile
 * (audit line 861: "Reuse api/queries.js keys verbatim"). Endpoints get wired
 * in the auth/domain phases — the key structure is ready now.
 *
 * First segment = domain scope ('me', 'v1', 'manager', 'owner', 'admin',
 * 'player', 'notifications', 'cities', 'public'), enabling coarse invalidation
 * like invalidateQueries({ queryKey: ['manager'] }).
 */
export type QueryParams = Record<string, unknown>;

export const q = {
  me: () => ['me'],
  home: () => ['v1', 'home'],
  stats: () => ['v1', 'stats'],
  liveMatches: (params?: QueryParams) => ['v1', 'live-matches', params],
  stadiums: (params?: QueryParams) => ['v1', 'stadiums', params],
  matches: (params?: QueryParams) => ['v1', 'matches', params],
  leaderboard: (params?: QueryParams) => ['v1', 'leaderboard', params],

  notifications: (params?: QueryParams) => ['notifications', params],
  notificationPrefs: () => ['notifications', 'prefs'],
  notificationUnreadCount: () => ['notifications', 'unread-count'],

  managerTeamStatistics: (params?: QueryParams) => ['manager', 'team-statistics', params],
  teamProfile: () => ['manager', 'team-profile'],
  matchRequests: (params?: QueryParams) => ['manager', 'match-requests', params],
  bookings: (params?: QueryParams) => ['manager', 'bookings', params],
  players: () => ['manager', 'players'],
  matchFeed: (params?: QueryParams) => ['manager', 'match-feed', params],
  recruitment: (params?: QueryParams) => ['manager', 'recruitment', params],
  challenges: () => ['manager', 'challenges'],
  applicants: (id: number | string) => ['manager', 'matches', id, 'applicants'],
  matchLineup: (matchRequestId: number | string) => ['manager', 'match-lineup', matchRequestId],
  matchLineupRoster: (matchRequestId: number | string) => [
    'manager',
    'match-lineup',
    matchRequestId,
    'roster',
  ],

  ownerTerrains: () => ['owner', 'terrains'],
  ownerStats: () => ['owner', 'stats'],
  ownerBookings: () => ['owner', 'bookings'],
  ownerOverview: () => ['owner', 'overview'],
  ownerOverviewAnalytics: (mode: string) => ['owner', 'analytics', 'overview', mode],
  ownerCalendar: (id: number | string, week?: string | number) => [
    'owner',
    'terrains',
    id,
    'calendar',
    week,
  ],

  adminStats: () => ['admin', 'stats'],

  playerStats: () => ['player', 'stats'],
  playerProfile: () => ['player', 'profile'],
  playerMatches: (params?: QueryParams) => ['player', 'matches', params],
  playerFeed: (params?: QueryParams) => ['player', 'match-feed', params],
  applications: () => ['player', 'applications'],
  playerMatchDetail: (id: number | string) => ['player', 'match-detail', id],

  tournaments: (params?: QueryParams) => ['v1', 'tournaments', params],
  tournamentStatistics: (slug: string) => ['v1', 'tournaments', slug, 'statistics'],
  tournamentStandings: (slug: string) => ['v1', 'tournaments', slug, 'standings'],

  playerLeaderboard: (params?: QueryParams) => ['player', 'leaderboard', params],
  playerDomainStatistics: () => ['player', 'domain-statistics'],
  playerRatings: (params?: QueryParams) => ['player', 'ratings', params],

  publicManagerProfile: (id: number | string) => ['public', 'manager', id],

  cities: () => ['cities'],
  citiesSelect: () => ['cities', 'select'],
} as const;

/** Dev self-test ping key (offline queryFn proves the provider pipeline). */
export const qSelfTestPing = () => ['selftest', 'ping'];
