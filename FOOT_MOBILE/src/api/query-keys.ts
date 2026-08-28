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
  managerMatchDetail: (id: number | string) => ['manager', 'match-detail', id],
  managerPendingScores: () => ['manager', 'pending-scores'],
  managerPendingConfirmations: () => ['manager', 'pending-confirmations'],

  teamMembers: (params?: QueryParams) => ['manager', 'team-members', params],
  squadMemberDetail: (id: number | string) => ['manager', 'team-members', id],
  managerBookingDetail: (id: number | string) => ['manager', 'bookings', id],

  ownerTerrains: () => ['owner', 'terrains'],
  ownerTerrainDetail: (id: number | string | undefined) => ['owner', 'terrains', id],
  ownerStats: () => ['owner', 'stats'],
  ownerBookings: () => ['owner', 'bookings'],
  ownerOverview: () => ['owner', 'overview'],
  ownerOverviewAnalytics: (mode: string) => ['owner', 'analytics', 'overview', mode],
  ownerCalendar: (id: number | string | undefined, week?: string | number) => [
    'owner',
    'terrains',
    id,
    'calendar',
    week,
  ],
  ownerSlotClosures: (terrainId: number | string | undefined) => [
    'owner',
    'terrains',
    terrainId,
    'slot-closures',
  ],
  ownerCancellationRequests: () => ['owner', 'cancellation-requests'],
  ownerPendingBookings: () => ['owner', 'pending-bookings'],

  adminStats: () => ['admin', 'stats'],

  adminApprovalFeed: () => ['admin', 'approvals', 'feed'],
  adminPendingManagers: () => ['admin', 'approvals', 'managers'],
  adminPendingOwners: () => ['admin', 'approvals', 'owners'],
  adminPendingCommittees: () => ['admin', 'approvals', 'committees'],

  adminUsers: (scope: string, search?: string) => ['admin', 'users', scope ?? 'all', search ?? ''],

  committeeTournaments: (params?: QueryParams) => ['committee', 'tournaments', params],
  committeeTournament: (id: number | string) => ['committee', 'tournaments', id],
  tournamentRegistrations: (id: number | string) => ['committee', 'tournaments', id, 'registrations'],
  tournamentTeams: (id: number | string) => ['committee', 'tournaments', id, 'teams'],
  tournamentFixtures: (id: number | string) => ['committee', 'tournaments', id, 'fixtures'],
  tournamentFixturesFiltered: (id: number | string, matchday?: number, roundId?: number) => [
    'committee',
    'tournaments',
    id,
    'fixtures',
    { matchday, roundId },
  ],

  playerStats: () => ['player', 'stats'],
  playerProfile: () => ['player', 'profile'],
  playerMatches: (params?: QueryParams) => ['player', 'matches', params],
  playerFeed: (params?: QueryParams) => ['player', 'match-feed', params],
  applications: () => ['player', 'applications'],
  playerMatchDetail: (id: number | string) => ['player', 'match-detail', id],
  myTeam: () => ['player', 'my-team'],
  playerBookings: (scope?: string) => ['player', 'bookings', scope ?? 'list'],
  playerBookingDetail: (id: number | string) => ['player', 'bookings', id],

  tournaments: (params?: QueryParams) => ['v1', 'tournaments', params],
  tournamentStatistics: (slug: string) => ['v1', 'tournaments', slug, 'statistics'],
  tournamentStandings: (slug: string) => ['v1', 'tournaments', slug, 'standings'],

  committeeTournamentStandings: (id: number | string) => ['committee', 'tournaments', id, 'standings'],

  playerLeaderboard: (params?: QueryParams) => ['player', 'leaderboard', params],
  playerDomainStatistics: () => ['player', 'domain-statistics'],
  playerRatings: (params?: QueryParams) => ['player', 'ratings', params],

  publicManagerProfile: (id: number | string) => ['public', 'manager', id],

  cities: () => ['cities'],
  citiesSelect: () => ['cities', 'select'],
} as const;

/** Dev self-test ping key (offline queryFn proves the provider pipeline). */
export const qSelfTestPing = () => ['selftest', 'ping'];
