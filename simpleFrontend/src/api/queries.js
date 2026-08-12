import { useQuery } from '@tanstack/react-query'
import api from './client'
import { queryClient } from './queryClient'

const DEFAULTS = { staleTime: 60 * 1000, gcTime: 5 * 60 * 1000, retry: 2 }

const get = (url, params) =>
  api.get(url, params ? { params } : undefined).then((r) => r.data)

export const q = {
  me: () => ['me'],
  home: () => ['v1', 'home'],
  stats: () => ['v1', 'stats'],
  liveMatches: (params) => ['v1', 'live-matches', params],
  stadiums: (params) => ['v1', 'stadiums', params],
  matches: (params) => ['v1', 'matches', params],
  leaderboard: (params) => ['v1', 'leaderboard', params],
  notifications: (params) => ['notifications', params],
  notificationPrefs: () => ['notifications', 'prefs'],
  teamProfile: () => ['manager', 'team-profile'],
  matchRequests: (params) => ['manager', 'match-requests', params],
  bookings: () => ['manager', 'bookings'],
  players: () => ['manager', 'players'],
  matchFeed: (params) => ['manager', 'match-feed', params],
  recruitment: (params) => ['manager', 'recruitment', params],
  challenges: () => ['manager', 'challenges'],
  applicants: (id) => ['manager', 'matches', id, 'applicants'],
  ownerTerrains: () => ['owner', 'terrains'],
  ownerStats: () => ['owner', 'stats'],
  ownerBookings: () => ['owner', 'bookings'],
  ownerOverviewAnalytics: (mode) => ['owner', 'analytics', 'overview', mode],
  ownerCalendar: (id, week) => ['owner', 'terrains', id, 'calendar', week],
  adminStats: () => ['admin', 'stats'],
  playerStats: () => ['player', 'stats'],
  playerProfile: () => ['player', 'profile'],
  playerMatches: (params) => ['player', 'matches', params],
  playerFeed: (params) => ['player', 'match-feed', params],
  applications: () => ['player', 'applications'],
  cities: () => ['cities'],
  citiesSelect: () => ['cities', 'select'],
}

function useTypedQuery(key, fetcher, options) {
  return useQuery({
    queryKey: key,
    queryFn: fetcher,
    ...DEFAULTS,
    ...options,
  })
}

export const useMe = (options) => useTypedQuery(q.me(), () => get('/me'), options)
export const useHome = (options) => useTypedQuery(q.home(), () => get('/v1/home'), options)
export const useStats = (options) => useTypedQuery(q.stats(), () => get('/v1/stats'), options)
export const useLiveMatches = (params, options) =>
  useTypedQuery(q.liveMatches(params), () => get('/v1/live-matches', params), options)
export const useStadiums = (params, options) =>
  useTypedQuery(q.stadiums(params), () => get('/v1/stadiums', params), options)
export const useV1Matches = (params, options) =>
  useTypedQuery(q.matches(params), () => get('/v1/matches', params), options)
export const useLeaderboard = (params, options) =>
  useTypedQuery(q.leaderboard(params), () => get('/v1/leaderboard', params), options)
export const useNotifications = (params, options) =>
  useTypedQuery(q.notifications(params), () => get('/notifications', params), options)
export const useNotificationPrefs = (options) =>
  useTypedQuery(q.notificationPrefs(), () => get('/notifications/preferences'), options)
export const useTeamProfile = (options) =>
  useTypedQuery(q.teamProfile(), () => get('/manager/team-profile'), options)
export const useMatchRequests = (params, options) =>
  useTypedQuery(q.matchRequests(params), () => get('/manager/my-match-requests', params), options)
export const useManagerBookings = (options) =>
  useTypedQuery(q.bookings(), () => get('/manager/bookings'), options)
export const useManagerPlayers = (options) =>
  useTypedQuery(q.players(), () => get('/manager/players'), options)
export const useMatchFeed = (params, options) =>
  useTypedQuery(q.matchFeed(params), () => get('/manager/match-feed', params), options)
export const useRecruitment = (params, options) =>
  useTypedQuery(q.recruitment(params), () => get('/manager/recruitment/search', params), options)
export const useChallenges = (options) =>
  useTypedQuery(q.challenges(), () => get('/manager/received-challenges'), options)
export const useOwnerTerrains = (options) =>
  useTypedQuery(q.ownerTerrains(), () => get('/owner/terrains'), options)
export const useOwnerStats = (options) =>
  useTypedQuery(q.ownerStats(), () => get('/owner/stats'), options)
export const useOwnerBookings = (options) =>
  useTypedQuery(q.ownerBookings(), () => get('/owner/bookings'), options)
export const useOwnerOverviewAnalytics = (mode, options) =>
  useTypedQuery(q.ownerOverviewAnalytics(mode), () => get('/owner/analytics/overview', { mode }), options)
export const useAdminStats = (options) =>
  useTypedQuery(q.adminStats(), () => get('/admin/stats'), options)
export const usePlayerStats = (options) =>
  useTypedQuery(q.playerStats(), () => get('/player/stats'), options)
export const usePlayerProfile = (options) =>
  useTypedQuery(q.playerProfile(), () => get('/player/profile'), options)
export const usePlayerMatches = (params, options) =>
  useTypedQuery(q.playerMatches(params), () => get('/player/matches', params), options)
export const usePlayerFeed = (params, options) =>
  useTypedQuery(q.playerFeed(params), () => get('/player/match-feed', params), options)
export const useApplications = (options) =>
  useTypedQuery(q.applications(), () => get('/player/applications'), options)
export const useCities = (options) =>
  useTypedQuery(q.cities(), () => get('/cities', { active_only: true }), options)
export const useCitiesSelect = (options) =>
  useTypedQuery(q.citiesSelect(), () => get('/cities/select', { active_only: true }), options)

export function prefetchQuery(key, fetcher) {
  return queryClient.prefetchQuery({ queryKey: key, queryFn: fetcher, ...DEFAULTS })
}

export function invalidateKeys(keys) {
  return queryClient.invalidateQueries({ queryKey: keys })
}

export function invalidateManager() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['manager'] }),
    queryClient.invalidateQueries({ queryKey: ['notifications'] }),
    queryClient.invalidateQueries({ queryKey: ['v1', 'leaderboard'] }),
  ])
}
