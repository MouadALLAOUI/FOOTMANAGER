import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { del, get, post } from '@/api/client';
import { q } from '@/api/query-keys';

export type TournamentStatus =
  | 'draft'
  | 'open_for_registration'
  | 'registration_closed'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export type TournamentRegistrationStatus = 'pending' | 'registered' | 'rejected';

export interface CommitteeOrganizer {
  id?: number;
  name?: string | null;
}

export interface CommitteeTeamBrief {
  id: number;
  name: string;
  logo_url?: string | null;
  city?: string | null;
  category?: string | null;
  level?: string | null;
  is_free?: boolean;
}

export interface CommitteeTournament {
  id: number;
  uuid?: string | null;
  name: string;
  slug?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  description?: string | null;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: TournamentStatus;
  registration_start_at?: string | null;
  registration_end_at?: string | null;
  registration_fee?: string | number | null;
  requires_registration_fee?: boolean;
  registration_open?: boolean;
  remaining_teams?: number;
  tournament_format?: string | null;
  teams_count?: number;
  groups_count?: number;
  teams_per_group?: number;
  points_for_win?: number;
  points_for_draw?: number;
  points_for_loss?: number;
  organizer?: CommitteeOrganizer | null;
}

export interface CommitteeTournamentDetail extends CommitteeTournament {
  edition?: string | null;
  category?: string | null;
  rules?: string | null;
  group_mode?: string | null;
  match_duration_minutes?: number;
  matches_per_day?: number;
  knockout_teams?: number;
  qualify_per_group?: number;
  competition_id?: number | null;
  season_id?: number | null;
  published_at?: string | null;
  draw_confirmed_at?: string | null;
  stadium?: { id: number; name: string } | null;
  stats?: {
    registered_teams?: number;
    remaining_teams?: number;
    pending_registrations?: number;
    groups?: number;
    fixtures?: number;
    finished_matches?: number;
  };
}

export interface CommitteeTournamentTeam {
  id?: number;
  tournament_id?: number;
  team?: CommitteeTeamBrief | null;
  group?: { id: number; name: string } | null;
  group_position?: number | null;
  status?: TournamentRegistrationStatus;
  payment_status?: string | null;
  created_at?: string | null;
}

export interface CommitteeStadium {
  id: number;
  name: string;
}

export interface CommitteeFixtureMatch {
  id?: number;
  status?: string | null;
  current_period?: string | null;
  current_minute?: number | null;
  home_score?: number | null;
  away_score?: number | null;
  home_penalties?: number | null;
  away_penalties?: number | null;
  extra_time?: boolean;
  notes?: string | null;
  winner_team_id?: number | null;
  ended_at?: string | null;
}

export interface CommitteeFixture {
  id: number;
  match_id?: number | null;
  matchday?: number | null;
  round?: {
    id: number;
    name: string;
    stage?: string | null;
    order_index?: number;
  } | null;
  group?: { id: number; name: string } | null;
  home_team?: CommitteeTeamBrief | null;
  away_team?: CommitteeTeamBrief | null;
  stadium?: CommitteeStadium | null;
  scheduled_at?: string | null;
  status?: string | null;
  leg?: string | null;
  slots?: { home: string | null; away: string | null } | null;
  match?: CommitteeFixtureMatch | null;
}

export interface StandingRow {
  team_id: number;
  group_id?: number | null;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  goal_difference: number;
  points: number;
  form?: string[];
  team?: CommitteeTeamBrief | null;
}

export interface StandingGroup {
  group_id?: number | null;
  name?: string | null;
  rows: StandingRow[];
}

export interface CommitteeStandings {
  competition_id?: number | null;
  season_id?: number | null;
  groups: StandingGroup[];
  total?: number;
}

interface Paginated<T> {
  data: T[];
  meta?: {
    current_page?: number;
    per_page?: number;
    total?: number;
    last_page?: number;
  };
}

function listTournaments(params?: { status?: TournamentStatus; per_page?: number }): Promise<Paginated<CommitteeTournament>> {
  return get<Paginated<CommitteeTournament>>('/committee/tournaments', { params });
}

function getTournament(id: number | string): Promise<{ data: CommitteeTournamentDetail }> {
  return get<{ data: CommitteeTournamentDetail }>(`/committee/tournaments/${id}`);
}

function setRegistration(
  id: number | string,
  action: 'open' | 'close',
): Promise<{ data: CommitteeTournamentDetail }> {
  return post<{ data: CommitteeTournamentDetail }>(
    `/committee/tournaments/${id}/${action === 'open' ? 'open-registration' : 'close-registration'}`,
  );
}

function startTournament(id: number | string): Promise<{ data: CommitteeTournamentDetail }> {
  return post<{ data: CommitteeTournamentDetail }>(`/committee/tournaments/${id}/start`);
}

function cancelTournament(id: number | string): Promise<{ data: CommitteeTournamentDetail }> {
  return post<{ data: CommitteeTournamentDetail }>(`/committee/tournaments/${id}/cancel`);
}

function getRegistrations(id: number | string): Promise<{ data: CommitteeTournamentTeam[] }> {
  return get<{ data: CommitteeTournamentTeam[] }>(`/committee/tournaments/${id}/registrations`);
}

function getTeams(id: number | string): Promise<{ data: CommitteeTournamentTeam[] }> {
  return get<{ data: CommitteeTournamentTeam[] }>(`/committee/tournaments/${id}/teams`);
}

function decideRegistration(
  id: number | string,
  teamId: number | string,
  action: 'approve' | 'reject',
): Promise<{ data: CommitteeTournamentTeam[] }> {
  return post<{ data: CommitteeTournamentTeam[] }>(
    `/committee/tournaments/${id}/teams/${teamId}/${action}`,
  );
}

function markPaid(id: number | string, teamId: number | string): Promise<{ data: CommitteeTournamentTeam[] }> {
  return post<{ data: CommitteeTournamentTeam[] }>(`/committee/tournaments/${id}/teams/${teamId}/payment`);
}

function getFixtures(
  id: number | string,
  filter?: { matchday?: number; round_id?: number; stage?: string },
): Promise<{ data: CommitteeFixture[] }> {
  return get<{ data: CommitteeFixture[] }>(`/committee/tournaments/${id}/fixtures`, {
    params: { matchday: filter?.matchday, round_id: filter?.round_id, stage: filter?.stage },
  });
}

function getStandings(id: number | string): Promise<{ data: CommitteeStandings }> {
  return get<{ data: CommitteeStandings }>(`/committee/tournaments/${id}/standings`);
}

export interface ResultPayload {
  home_score: number;
  away_score: number;
  home_penalties?: number;
  away_penalties?: number;
  extra_time?: boolean;
  notes?: string;
}

function storeResult(
  tournamentId: number | string,
  fixtureId: number | string,
  payload: ResultPayload,
): Promise<{ data: CommitteeFixture; message?: string }> {
  return post<{ data: CommitteeFixture; message?: string }>(
    `/committee/tournaments/${tournamentId}/fixtures/${fixtureId}/result`,
    payload,
  );
}

function deleteResult(tournamentId: number | string, fixtureId: number | string): Promise<{ message?: string }> {
  return del<{ message?: string }>(`/committee/tournaments/${tournamentId}/fixtures/${fixtureId}/result`);
}

function getFixtureEvents(
  tournamentId: number | string,
  fixtureId: number | string,
): Promise<{ data: MatchEventPayload[] }> {
  return get<{ data: MatchEventPayload[] }>(
    `/committee/tournaments/${tournamentId}/fixtures/${fixtureId}/events`,
  );
}

export interface MatchEventPayload {
  id: number;
  type?: string | null;
  icon?: string | null;
  minute?: number | null;
  added_time?: number | null;
  period?: string | null;
  description?: string | null;
  metadata?: unknown;
  team?: { id: number; name: string } | null;
  player?: { id: number; name: string; number?: number } | null;
}

export function useCommitteeTournaments(status?: TournamentStatus) {
  return useQuery({
    queryKey: q.committeeTournaments({ status }),
    queryFn: () => listTournaments({ status }),
  });
}

export function useCommitteeTournament(id: number | string | undefined) {
  return useQuery({
    queryKey: q.committeeTournament(id as number | string),
    queryFn: () => getTournament(id as number | string),
    enabled: id != null && id !== '',
  });
}

export function useTournamentRegistrations(id: number | string | undefined) {
  return useQuery({
    queryKey: q.tournamentRegistrations(id as number | string),
    queryFn: () => getRegistrations(id as number | string),
    enabled: id != null && id !== '',
  });
}

export function useTournamentTeams(id: number | string | undefined) {
  return useQuery({
    queryKey: q.tournamentTeams(id as number | string),
    queryFn: () => getTeams(id as number | string),
    enabled: id != null && id !== '',
  });
}

export function useTournamentFixtures(id: number | string | undefined, filter?: { matchday?: number; round_id?: number }) {
  return useQuery({
    queryKey: filter?.matchday != null || filter?.round_id != null
      ? q.tournamentFixturesFiltered(id as number | string, filter?.matchday, filter?.round_id)
      : q.tournamentFixtures(id as number | string),
    queryFn: () => getFixtures(id as number | string, filter),
    enabled: id != null && id !== '',
  });
}

export function useTournamentStandings(id: number | string | undefined) {
  return useQuery({
    queryKey: q.committeeTournamentStandings(id as number | string),
    queryFn: () => getStandings(id as number | string),
    enabled: id != null && id !== '',
  });
}

export function useTournamentRegistrationAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: number | string; action: 'open' | 'close' }) =>
      setRegistration(id, action),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: q.committeeTournament(id) });
      void queryClient.invalidateQueries({ queryKey: q.committeeTournaments() });
    },
  });
}

export function useTournamentStart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => startTournament(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: q.committeeTournament(id) });
      void queryClient.invalidateQueries({ queryKey: q.committeeTournaments() });
    },
  });
}

export function useTournamentCancel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number | string) => cancelTournament(id),
    onSuccess: (_data, id) => {
      void queryClient.invalidateQueries({ queryKey: q.committeeTournament(id) });
      void queryClient.invalidateQueries({ queryKey: q.committeeTournaments() });
    },
  });
}

export function useTournamentDecideRegistration() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, teamId, action }: { id: number | string; teamId: number | string; action: 'approve' | 'reject' }) =>
      decideRegistration(id, teamId, action),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: q.tournamentRegistrations(id) });
      void queryClient.invalidateQueries({ queryKey: q.tournamentTeams(id) });
      void queryClient.invalidateQueries({ queryKey: q.committeeTournament(id) });
    },
  });
}

export function useTournamentMarkPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, teamId }: { id: number | string; teamId: number | string }) => markPaid(id, teamId),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: q.tournamentRegistrations(id) });
      void queryClient.invalidateQueries({ queryKey: q.tournamentTeams(id) });
      void queryClient.invalidateQueries({ queryKey: q.committeeTournament(id) });
    },
  });
}

export function useTournamentStoreResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      tournamentId,
      fixtureId,
      payload,
    }: {
      tournamentId: number | string;
      fixtureId: number | string;
      payload: ResultPayload;
    }) => storeResult(tournamentId, fixtureId, payload),
    onSuccess: (_data, { tournamentId }) => {
      void queryClient.invalidateQueries({ queryKey: q.tournamentFixtures(tournamentId) });
      void queryClient.invalidateQueries({ queryKey: q.committeeTournamentStandings(tournamentId) });
      void queryClient.invalidateQueries({ queryKey: q.committeeTournament(tournamentId) });
    },
  });
}

export function useTournamentDeleteResult() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ tournamentId, fixtureId }: { tournamentId: number | string; fixtureId: number | string }) =>
      deleteResult(tournamentId, fixtureId),
    onSuccess: (_data, { tournamentId }) => {
      void queryClient.invalidateQueries({ queryKey: q.tournamentFixtures(tournamentId) });
      void queryClient.invalidateQueries({ queryKey: q.committeeTournamentStandings(tournamentId) });
      void queryClient.invalidateQueries({ queryKey: q.committeeTournament(tournamentId) });
    },
  });
}

export function useTournamentFixtureEvents(
  tournamentId: number | string | undefined,
  fixtureId: number | string | undefined,
) {
  return useQuery({
    queryKey: ['committee', 'tournaments', tournamentId, 'fixtures', fixtureId, 'events'],
    queryFn: () => getFixtureEvents(tournamentId as number | string, fixtureId as number | string),
    enabled: tournamentId != null && fixtureId != null,
  });
}
/* ── Match events (goals, cards, own goals…) — mirrors the web control room ── */

export interface StoreMatchEventPayload {
  type: string;
  team_id?: number | string;
  player_id?: number | string;
  minute?: number;
  description?: string;
}

export interface CommitteeTeamPlayer {
  id: number;
  name: string;
  number?: number | null;
  position?: string | null;
  is_essential?: boolean;
}

export function storeFixtureEvent(
  tournamentId: number | string,
  fixtureId: number | string,
  payload: StoreMatchEventPayload,
): Promise<{ data: MatchEventPayload; message?: string }> {
  return post<{ data: MatchEventPayload; message?: string }>(
    `/committee/tournaments/${tournamentId}/fixtures/${fixtureId}/events`,
    payload,
  );
}

export function deleteFixtureEvent(
  tournamentId: number | string,
  fixtureId: number | string,
  eventId: number | string,
): Promise<{ message?: string }> {
  return del<{ message?: string }>(
    `/committee/tournaments/${tournamentId}/fixtures/${fixtureId}/events/${eventId}`,
  );
}

export function useTournamentStoreEvent(tournamentId: number | string, fixtureId: number | string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: StoreMatchEventPayload) => storeFixtureEvent(tournamentId, fixtureId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['committee', 'tournaments', String(tournamentId), 'fixtures', String(fixtureId), 'events'],
      });
      void queryClient.invalidateQueries({ queryKey: q.committeeTournament(String(tournamentId)) });
    },
  });
}

export function useTournamentDeleteEvent(tournamentId: number | string, fixtureId: number | string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: number | string) => deleteFixtureEvent(tournamentId, fixtureId, eventId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['committee', 'tournaments', String(tournamentId), 'fixtures', String(fixtureId), 'events'],
      });
      void queryClient.invalidateQueries({ queryKey: q.committeeTournament(String(tournamentId)) });
    },
  });
}


export function getCommitteeTeamPlayers(
  teamId: number | string,
  search?: string,
): Promise<{ data: CommitteeTeamPlayer[] }> {
  return get<{ data: CommitteeTeamPlayer[] }>(`/committee/teams/${teamId}/players`, {
    params: { search },
  });
}

export function useCommitteeTeamPlayers(teamId: number | string | undefined, search?: string) {
  return useQuery({
    queryKey: ['committee', 'team-players', String(teamId ?? ''), search ?? ''],
    queryFn: () => getCommitteeTeamPlayers(teamId as number | string, search),
    enabled: teamId != null && teamId !== '',
  });
}
