import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { get, post, put } from '@/api/client';
import { q } from '@/api/query-keys';

export interface ManagerTeam {
  id: number;
  name: string;
  city?: string | null;
  logo_url?: string | null;
  category?: string | null;
}

export interface ManagerUserBrief {
  id: number;
  name: string;
  phone?: string | null;
  avatar_url?: string | null;
}

export interface MatchStadium {
  id: number;
  name: string;
  city?: string | null;
  address?: string | null;
  type?: string | null;
  player_format?: string | null;
  images?: string[];
}

export interface MatchPlayerApplication {
  id: number;
  player_id?: number | null;
  match_request_id?: number | null;
  type?: 'apply' | 'invite' | null;
  position?: string | null;
  message?: string | null;
  status?: string | null;
  player?: ManagerUserBrief | null;
}

export interface ManagerMatchRequest {
  id: number;
  host_team_id: number;
  target_team_id?: number | null;
  opponent_team_id?: number | null;
  stadium_id?: number | null;
  player_format?: string | null;
  custom_terrain_name?: string | null;
  type?: string | null;
  match_datetime?: string | null;
  status?: string | null;
  notes?: string | null;
  price_per_player?: string | number | null;
  needs_players?: boolean;
  players_needed?: number | null;
  positions_needed?: Record<string, number> | null;
  host_score?: number | null;
  opponent_score?: number | null;
  score_status?: string | null;
  started_at?: string | null;
  created_at?: string | null;
  players_joined_count?: number;
  players_joined?: number;
  players_remaining?: number;
  players_full?: boolean;
  hostTeam?: ManagerTeam | null;
  opponentTeam?: (ManagerTeam & { manager?: ManagerUserBrief | null }) | null;
  targetTeam?: ManagerTeam | null;
  stadium?: MatchStadium | null;
  playerApplications?: MatchPlayerApplication[];
}

export interface ManagerMatchRequestsResponse {
  match_requests: ManagerMatchRequest[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface MatchApplicantsResponse {
  match_request: ManagerMatchRequest | null;
  applications: MatchPlayerApplication[];
}

export interface StadiumsResponse {
  data: StadiumOption[];
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
}

export interface StadiumOption {
  id: number;
  slug?: string | null;
  name: string;
  type?: string | null;
  city?: string | null;
  address?: string | null;
  player_format?: string | null;
  capacity?: number | null;
  price_per_hour?: number | null;
  price_per_team?: number | null;
  is_available?: boolean;
}

export interface MessageResponse {
  message: string;
  match_request?: ManagerMatchRequest;
  match?: ManagerMatchRequest;
  application?: MatchPlayerApplication;
}

export interface ScorePayload {
  host_score: number;
  opponent_score: number;
}

export function getManagerMatchRequests(): Promise<ManagerMatchRequestsResponse> {
  return get<ManagerMatchRequestsResponse>('/manager/my-match-requests', {
    params: { status: 'all', per_page: 100 },
  });
}

export function getMatchApplicants(id: number | string): Promise<MatchApplicantsResponse> {
  return get<MatchApplicantsResponse>(`/manager/matches/${id}/applicants`);
}

export function getStadiums(): Promise<StadiumsResponse> {
  return get<StadiumsResponse>('/stadiums', {
    params: { per_page: 50 },
  });
}

export function respondToApplication(
  applicationId: number | string,
  action: 'accept' | 'decline',
): Promise<MessageResponse> {
  return put<MessageResponse>(`/manager/recruitment/applications/${applicationId}/respond`, { action });
}

export function startMatch(id: number | string): Promise<MessageResponse> {
  return post<MessageResponse>(`/manager/match-requests/${id}/start`);
}

export function submitScore(id: number | string, payload: ScorePayload): Promise<MessageResponse> {
  return post<MessageResponse>(`/manager/matches/${id}/submit-score`, payload);
}

export function confirmScore(id: number | string): Promise<MessageResponse> {
  return post<MessageResponse>(`/manager/matches/${id}/confirm-score`);
}

export function disputeScore(id: number | string): Promise<MessageResponse> {
  return post<MessageResponse>(`/manager/matches/${id}/dispute-score`);
}

export function createMatchRequest(payload: CreateMatchPayload): Promise<MessageResponse> {
  return post<MessageResponse>('/manager/match-requests', payload);
}

export interface CreateMatchPayload {
  stadium_id?: number | null;
  custom_terrain_name?: string;
  match_datetime: string;
  start_time: string;
  end_time?: string;
  player_format?: string;
  notes?: string;
  price_per_player?: number;
  needs_players?: boolean;
  players_needed?: number;
  positions_needed?: Record<string, number>;
}

export function useManagerMatchRequests() {
  return useQuery({
    queryKey: q.matchRequests({ scope: 'all' }),
    queryFn: getManagerMatchRequests,
  });
}

export function useManagerMatchDetail(id: number | string | undefined) {
  const list = useManagerMatchRequests();
  const match = list.data?.match_requests.find((m) => String(m.id) === String(id));
  return {
    match,
    isLoading: list.isLoading,
    isError: list.isError,
    error: list.error,
    refetch: list.refetch,
  };
}

export function useMatchApplicants(id: number | string) {
  return useQuery({
    queryKey: q.applicants(id),
    queryFn: () => getMatchApplicants(id),
    enabled: id != null && id !== '',
  });
}

export function useStadiums() {
  return useQuery({
    queryKey: q.stadiums({ scope: 'create-match' }),
    queryFn: getStadiums,
  });
}

export function useRespondToApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ applicationId, action }: { applicationId: number | string; action: 'accept' | 'decline' }) =>
      respondToApplication(applicationId, action),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manager', 'matches'] });
      void queryClient.invalidateQueries({ queryKey: ['manager', 'match-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['manager', 'match-detail'] });
    },
  });
}

export function useStartMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startMatch,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manager', 'match-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['manager', 'match-detail'] });
    },
  });
}

export function useSubmitScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: ScorePayload }) => submitScore(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manager', 'match-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['manager', 'match-detail'] });
      void queryClient.invalidateQueries({ queryKey: ['manager', 'pending-scores'] });
      void queryClient.invalidateQueries({ queryKey: ['manager', 'pending-confirmations'] });
    },
  });
}

export function useConfirmScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: confirmScore,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manager', 'match-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['manager', 'match-detail'] });
      void queryClient.invalidateQueries({ queryKey: ['manager', 'pending-confirmations'] });
      void queryClient.invalidateQueries({ queryKey: ['v1', 'leaderboard'] });
    },
  });
}

export function useDisputeScore() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disputeScore,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manager', 'match-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['manager', 'match-detail'] });
      void queryClient.invalidateQueries({ queryKey: ['manager', 'pending-confirmations'] });
    },
  });
}

export function useCreateMatchRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createMatchRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manager', 'match-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['v1', 'matches'] });
      void queryClient.invalidateQueries({ queryKey: ['v1', 'live-matches'] });
    },
  });
}
