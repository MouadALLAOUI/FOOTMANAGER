import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { del, get, post, put } from '@/api/client';
import { q } from '@/api/query-keys';

export interface ManagerTeam {
  id: number;
  name: string;
  city?: string | null;
  logo_url?: string | null;
  category?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
}

export interface ManagerUserBrief {
  id: number;
  name: string;
  phone?: string | null;
  wa_phone?: string | null;
  is_whatsapp?: boolean;
  is_online?: boolean;
  avatar_url?: string | null;
}

export interface MatchStadium {
  id: number;
  name: string;
  city?: string | null;
  address?: string | null;
  type?: string | null;
  player_format?: string | null;
  cover_image_url?: string | null;
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

export interface MatchChallengeProposalItem {
  id: number;
  match_request_id: number;
  type: 'registered' | 'guest';
  team_id?: number | null;
  user_id?: number | null;
  guest_team_name?: string | null;
  guest_contact_name?: string | null;
  guest_phone?: string | null;
  notes?: string | null;
  status: 'pending' | 'accepted' | 'declined';
  created_at?: string | null;
  team?: (ManagerTeam & { manager?: ManagerUserBrief | null }) | null;
  user?: ManagerUserBrief | null;
}

export interface ManagerMatchRequest {
  id: number;
  invitation_token?: string | null;
  host_team_id: number;
  target_team_id?: number | null;
  opponent_team_id?: number | null;
  stadium_id?: number | null;
  player_format?: string | null;
  custom_terrain_name?: string | null;
  type?: string | null;
  match_datetime?: string | null;
  status?: string | null;
  status_reason?: string | null;
  notes?: string | null;
  price_per_player?: string | number | null;
  needs_players?: boolean;
  players_needed?: number | null;
  positions_needed?: Record<string, number> | null;
  host_score?: number | null;
  opponent_score?: number | null;
  score_status?: string | null;
  is_guest?: boolean;
  guest_team_name?: string | null;
  guest_contact_name?: string | null;
  guest_phone?: string | null;
  started_at?: string | null;
  created_at?: string | null;
  players_joined_count?: number;
  players_joined?: number;
  players_remaining?: number;
  players_full?: boolean;
  pending_proposals_count?: number;
  hostTeam?: (ManagerTeam & { manager?: ManagerUserBrief | null }) | null;
  opponentTeam?: (ManagerTeam & { manager?: ManagerUserBrief | null }) | null;
  targetTeam?: (ManagerTeam & { manager?: ManagerUserBrief | null }) | null;
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

export interface ManagerMatchFeedResponse {
  matches: ManagerMatchRequest[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ManagerReceivedChallengesResponse {
  challenges: ManagerMatchRequest[];
  pagination: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface MatchChallengeProposalsResponse {
  proposals: MatchChallengeProposalItem[];
  match: ManagerMatchRequest;
}

export interface RegisteredTeamItem {
  id: number;
  name: string;
  city?: string | null;
  logo_url?: string | null;
  points?: number;
  matches_played?: number;
  wins?: number;
  draws?: number;
  losses?: number;
  member_count?: number;
  primary_color?: string | null;
  secondary_color?: string | null;
  manager?: ManagerUserBrief | null;
  manager_online?: boolean;
  is_challengeable?: boolean;
}

export interface RegisteredTeamsResponse {
  data: RegisteredTeamItem[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface MatchApplicantsResponse {
  match_request: ManagerMatchRequest | null;
  applications: MatchPlayerApplication[];
}

export interface StadiumsResponse {
  stadiums: StadiumOption[];
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
  host_manager?: {
    name?: string;
    phone?: string;
    is_whatsapp?: boolean;
  };
}

export interface ScorePayload {
  host_score: number;
  opponent_score: number;
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

export interface SendChallengePayload {
  target_team_id: number;
  stadium_id?: number | null;
  custom_terrain_name?: string;
  match_datetime: string;
  notes?: string;
  price_per_player?: number;
  needs_players?: boolean;
  players_needed?: number;
  positions_needed?: Record<string, number>;
}

export function getManagerMatchRequests(): Promise<ManagerMatchRequestsResponse> {
  return get<ManagerMatchRequestsResponse>('/manager/my-match-requests', {
    params: { status: 'all', per_page: 100 },
  });
}

export type MatchFeedParams = Record<string, string | number | boolean | null | undefined>;

export function getManagerMatchFeed(params?: MatchFeedParams): Promise<ManagerMatchFeedResponse> {
  return get<ManagerMatchFeedResponse>('/manager/match-feed', { params });
}

export function getReceivedChallenges(): Promise<ManagerReceivedChallengesResponse> {
  return get<ManagerReceivedChallengesResponse>('/manager/received-challenges', {
    params: { per_page: 50 },
  });
}

export function getRegisteredTeams(city?: string): Promise<RegisteredTeamsResponse> {
  return get<RegisteredTeamsResponse>(
    '/v1/registered-teams',
    city && city !== 'all' ? { params: { city, per_page: 50 }, auth: false } : { params: { per_page: 50 }, auth: false },
  );
}

export function getMatchApplicants(id: number | string): Promise<MatchApplicantsResponse> {
  return get<MatchApplicantsResponse>(`/manager/matches/${id}/applicants`);
}

export function getMatchChallengeProposals(id: number | string): Promise<MatchChallengeProposalsResponse> {
  return get<MatchChallengeProposalsResponse>(`/manager/match-requests/${id}/proposals`);
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

export function acceptMatchRequest(
  id: number | string,
  payload?: { needs_players?: boolean; players_needed?: number },
): Promise<MessageResponse> {
  return post<MessageResponse>(`/manager/match-requests/${id}/accept`, payload ?? {});
}

export function respondToChallenge(
  id: number | string,
  action: 'accept' | 'decline',
  payload?: { needs_players?: boolean; players_needed?: number },
): Promise<MessageResponse> {
  return put<MessageResponse>(`/manager/challenges/${id}/respond`, {
    action,
    ...(payload ?? {}),
  });
}

export function applyTeamToInvitation(
  token: string,
  notes?: string,
): Promise<MessageResponse> {
  return post<MessageResponse>(`/manager/match-invitations/${token}/apply-team`, {
    notes: notes || undefined,
  });
}

export function confirmChallengeProposal(
  matchId: number | string,
  proposalId: number | string,
): Promise<MessageResponse> {
  return post<MessageResponse>(`/manager/match-requests/${matchId}/confirm-proposal/${proposalId}`);
}

export function deleteOpenMatchRequest(id: number | string): Promise<MessageResponse> {
  return del<MessageResponse>(`/manager/match-requests/${id}`);
}

export function cancelMatchRequest(id: number | string, reason: string): Promise<MessageResponse> {
  return post<MessageResponse>(`/manager/match-requests/${id}/cancel`, { reason });
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

export function sendDirectChallenge(payload: SendChallengePayload): Promise<MessageResponse> {
  return post<MessageResponse>('/manager/challenges', payload);
}

export function useManagerMatchRequests() {
  return useQuery({
    queryKey: q.matchRequests({ scope: 'all' }),
    queryFn: getManagerMatchRequests,
  });
}

export function useManagerMatchFeed(params?: MatchFeedParams) {
  return useQuery({
    queryKey: q.matchFeed(params),
    queryFn: () => getManagerMatchFeed(params),
  });
}

export function useReceivedChallenges() {
  return useQuery({
    queryKey: q.challenges(),
    queryFn: getReceivedChallenges,
  });
}

export function useRegisteredTeams(city?: string) {
  return useQuery({
    queryKey: ['v1', 'registered-teams', city ?? 'all'],
    queryFn: () => getRegisteredTeams(city),
  });
}

export function useManagerMatchDetail(id: number | string | undefined) {
  const myRequests = useManagerMatchRequests();
  const feed = useManagerMatchFeed();
  const challenges = useReceivedChallenges();

  const match =
    myRequests.data?.match_requests.find((m) => String(m.id) === String(id)) ??
    feed.data?.matches.find((m) => String(m.id) === String(id)) ??
    challenges.data?.challenges.find((m) => String(m.id) === String(id));

  return {
    match,
    isLoading: myRequests.isLoading && !match,
    isError: myRequests.isError && !match,
    error: myRequests.error,
    refetch: async () => {
      await Promise.all([
        myRequests.refetch(),
        feed.refetch(),
        challenges.refetch(),
      ]);
    },
  };
}

export function useMatchApplicants(id: number | string) {
  return useQuery({
    queryKey: q.applicants(id),
    queryFn: () => getMatchApplicants(id),
    enabled: id != null && id !== '',
  });
}

export function useMatchChallengeProposals(id: number | string, enabled = true) {
  return useQuery({
    queryKey: ['manager', 'matches', id, 'proposals'],
    queryFn: () => getMatchChallengeProposals(id),
    enabled: enabled && id != null && id !== '',
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

export function useAcceptMatchRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      needs_players,
      players_needed,
    }: {
      id: number | string;
      needs_players?: boolean;
      players_needed?: number;
    }) => acceptMatchRequest(id, { needs_players, players_needed }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manager', 'match-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['manager', 'match-feed'] });
      void queryClient.invalidateQueries({ queryKey: ['manager', 'challenges'] });
      void queryClient.invalidateQueries({ queryKey: ['v1', 'matches'] });
    },
  });
}

export function useRespondToChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      needs_players,
      players_needed,
    }: {
      id: number | string;
      action: 'accept' | 'decline';
      needs_players?: boolean;
      players_needed?: number;
    }) => respondToChallenge(id, action, { needs_players, players_needed }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manager', 'challenges'] });
      void queryClient.invalidateQueries({ queryKey: ['manager', 'match-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['manager', 'match-feed'] });
      void queryClient.invalidateQueries({ queryKey: ['v1', 'matches'] });
    },
  });
}

export function useApplyTeamToInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ token, notes }: { token: string; notes?: string }) =>
      applyTeamToInvitation(token, notes),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['v1', 'matches'] });
      void queryClient.invalidateQueries({ queryKey: ['manager', 'match-requests'] });
    },
  });
}

export function useConfirmChallengeProposal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ matchId, proposalId }: { matchId: number | string; proposalId: number | string }) =>
      confirmChallengeProposal(matchId, proposalId),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['manager', 'matches', variables.matchId, 'proposals'] });
      void queryClient.invalidateQueries({ queryKey: ['manager', 'match-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['v1', 'matches'] });
    },
  });
}

export function useDeleteOpenMatchRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteOpenMatchRequest,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manager', 'match-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['manager', 'match-feed'] });
      void queryClient.invalidateQueries({ queryKey: ['v1', 'matches'] });
    },
  });
}

export function useCancelMatchRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number | string; reason: string }) =>
      cancelMatchRequest(id, reason),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manager', 'match-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['manager', 'match-feed'] });
      void queryClient.invalidateQueries({ queryKey: ['v1', 'matches'] });
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

export function useSendDirectChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: sendDirectChallenge,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manager', 'match-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['manager', 'challenges'] });
      void queryClient.invalidateQueries({ queryKey: ['v1', 'matches'] });
    },
  });
}
