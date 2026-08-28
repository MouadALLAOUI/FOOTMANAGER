import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { get, post, put } from '@/api/client';
import { q, type QueryParams } from '@/api/query-keys';

export interface PositionAvailability {
  required: number;
  filled: number;
  available: number;
}

export interface MatchTeam {
  id: number;
  name: string;
  city?: string | null;
  category?: string | null;
  level?: string | null;
  logo_url?: string | null;
}

export interface MatchStadium {
  id: number;
  name: string;
  city?: string | null;
  type?: string | null;
  player_format?: string | null;
  cover_image_url?: string | null;
}

export interface MatchManagerTeam {
  id: number;
  name: string;
  city?: string | null;
  logo_url?: string | null;
  category?: string | null;
}

export interface MatchManager {
  id: number;
  name: string;
  avatar_url?: string | null;
  team?: MatchManagerTeam | null;
}

export interface PlayerApplication {
  id: number;
  status: string;
  position?: string | null;
}

export interface FeedMatch {
  id: number;
  status: string;
  match_datetime: string;
  notes?: string | null;
  price_per_player?: string | number | null;
  player_format?: string | null;
  custom_terrain_name?: string | null;
  needs_players?: boolean;
  players_needed?: number | null;
  players_joined?: number;
  players_remaining?: number;
  players_full?: boolean;
  positions_needed?: Record<string, number>;
  position_availability?: Record<string, PositionAvailability>;
  host_manager_name?: string | null;
  host_team?: MatchTeam | null;
  stadium?: MatchStadium | null;
}

export interface MatchFeedResponse {
  matches: FeedMatch[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface MatchDetailResponse {
  match: FeedMatch;
  stadium?: MatchStadium | null;
  manager?: MatchManager | null;
  positions_needed?: Record<string, number>;
  position_availability?: Record<string, PositionAvailability>;
  my_application?: PlayerApplication | null;
}

export interface ApplyPayload {
  position?: string;
  message?: string;
}

export interface ApplyResponse {
  message: string;
  application: PlayerApplication;
}

export interface CancelApplicationResponse {
  message: string;
  application: PlayerApplication;
}

export interface MatchFeedFilters {
  stadium_id?: number | string;
  category?: string;
  city?: string;
  date?: string;
  player_format?: string;
  level?: string;
  search?: string;
  sort?: 'newest';
  page?: number;
}

export function getMatchFeed(filters?: MatchFeedFilters): Promise<MatchFeedResponse> {
  return get<MatchFeedResponse>('/player/match-feed', {
    params: {
      stadium_id: filters?.stadium_id,
      category: filters?.category,
      city: filters?.city,
      date: filters?.date,
      player_format: filters?.player_format,
      level: filters?.level,
      search: filters?.search,
      sort: filters?.sort,
      page: filters?.page,
    },
  });
}

export function getMatchDetail(id: number | string): Promise<MatchDetailResponse> {
  return get<MatchDetailResponse>(`/player/matches/${id}`);
}

export function applyToMatch(
  id: number | string,
  payload: ApplyPayload,
): Promise<ApplyResponse> {
  return post<ApplyResponse>(`/player/matches/${id}/apply`, payload);
}

export function cancelApplication(id: number | string): Promise<CancelApplicationResponse> {
  return put<CancelApplicationResponse>(`/player/applications/${id}/cancel`);
}

export function useMatchFeed(filters?: MatchFeedFilters) {
  return useInfiniteQuery({
    queryKey: q.playerFeed(filters as QueryParams | undefined),
    queryFn: ({ pageParam = 1 }) => getMatchFeed({ ...filters, page: pageParam as number }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.current_page < lastPage.last_page ? lastPage.current_page + 1 : undefined,
  });
}

export function useMatchDetail(id: number | string | undefined) {
  return useQuery({
    queryKey: q.playerMatchDetail(String(id)),
    queryFn: () => getMatchDetail(id as number | string),
    enabled: id !== undefined,
  });
}

export function useApplyToMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: ApplyPayload }) =>
      applyToMatch(id, payload),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['player', 'match-feed'] });
      void queryClient.invalidateQueries({ queryKey: ['player', 'match-detail', String(id)] });
      void queryClient.invalidateQueries({ queryKey: ['player', 'applications'] });
    },
  });
}

export function useCancelApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelApplication,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['player', 'match-feed'] });
      void queryClient.invalidateQueries({ queryKey: ['player', 'match-detail'] });
      void queryClient.invalidateQueries({ queryKey: ['player', 'applications'] });
    },
  });
}
