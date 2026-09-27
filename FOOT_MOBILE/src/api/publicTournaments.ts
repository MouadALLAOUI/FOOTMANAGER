import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/client';

export interface PublicTournamentItem {
  id: number;
  uuid?: string | null;
  name: string;
  slug?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  description?: string | null;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: string;
  teams_count?: number;
  category?: string | null;
  edition?: string | null;
}

export interface PublicTournamentsResponse {
  data: PublicTournamentItem[];
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
}

export interface TournamentDetailData extends PublicTournamentItem {
  rules?: string | null;
  registration_fee?: number | null;
  tournament_format?: string | null;
  stadium?: {
    id: number;
    name: string;
    city?: string | null;
    address?: string | null;
    cover_image_url?: string | null;
  } | null;
  organizer?: {
    id: number;
    name: string;
  } | null;
}

export interface TournamentFixtureItem {
  id: number;
  round_name?: string | null;
  group_name?: string | null;
  scheduled_at?: string | null;
  status?: string | null;
  home_team?: {
    id: number;
    name: string;
    logo_url?: string | null;
  } | null;
  away_team?: {
    id: number;
    name: string;
    logo_url?: string | null;
  } | null;
  home_score?: number | null;
  away_score?: number | null;
  match?: {
    id?: number;
    status?: string | null;
    home_score?: number | null;
    away_score?: number | null;
  } | null;
  stadium?: {
    id: number;
    name: string;
  } | null;
}

export interface LiveTournamentMatchItem {
  id: number;
  home_team?: { name: string; logo_url?: string | null } | null;
  away_team?: { name: string; logo_url?: string | null } | null;
  home_score?: number | null;
  away_score?: number | null;
  tournament_name?: string | null;
  status?: string | null;
  scheduled_at?: string | null;
}

export interface LiveTournamentMatchesResponse {
  data: {
    live: LiveTournamentMatchItem[];
    next?: LiveTournamentMatchItem | null;
    upcoming?: LiveTournamentMatchItem[];
  };
}


export function getPublicTournaments(): Promise<PublicTournamentsResponse> {
  return get<PublicTournamentsResponse>('/v1/tournaments', {
    auth: false,
    params: { per_page: 20 },
  });
}

export function usePublicTournaments() {
  return useQuery({
    queryKey: ['public', 'tournaments'],
    queryFn: getPublicTournaments,
    staleTime: 5 * 60 * 1000,
  });
}

export function getTournamentDetail(id: number | string): Promise<{ data: TournamentDetailData }> {
  return get<{ data: TournamentDetailData }>(`/v1/tournaments/${id}`, {
    auth: false,
  });
}

export function useTournamentDetail(id: number | string | undefined) {
  return useQuery({
    queryKey: ['public', 'tournament', String(id)],
    queryFn: () => getTournamentDetail(id!),
    enabled: id !== undefined && id !== null && id !== '',
    staleTime: 5 * 60 * 1000,
  });
}

export function getTournamentFixtures(id: number | string): Promise<{ data: TournamentFixtureItem[] }> {
  return get<{ data: TournamentFixtureItem[] }>(`/v1/tournaments/${id}/fixtures`, {
    auth: false,
  });
}

export function useTournamentFixtures(id: number | string | undefined) {
  return useQuery({
    queryKey: ['public', 'tournament-fixtures', String(id)],
    queryFn: () => getTournamentFixtures(id!),
    enabled: id !== undefined && id !== null && id !== '',
    staleTime: 3 * 60 * 1000,
  });
}

export function getLiveTournamentMatches(): Promise<LiveTournamentMatchesResponse> {
  return get<LiveTournamentMatchesResponse>('/v1/live-tournament-matches', {
    auth: false,
  });
}

export function useLiveTournamentMatches() {
  return useQuery({
    queryKey: ['public', 'live-tournament-matches'],
    queryFn: getLiveTournamentMatches,
    staleTime: 60 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export interface TournamentStandingRow {
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
  team?: {
    id: number;
    name: string;
    logo_url?: string | null;
    city?: string | null;
  } | null;
}

export interface TournamentStandingGroup {
  group_id?: number | null;
  name?: string | null;
  rows: TournamentStandingRow[];
}

export interface TournamentStandingsResponse {
  data: {
    competition_id?: number | null;
    season_id?: number | null;
    groups: TournamentStandingGroup[];
    total: number;
  };
}

export interface TournamentTeamItem {
  id: number;
  tournament_id: number;
  team_id: number;
  team?: {
    id: number;
    name: string;
    logo_url?: string | null;
    city?: string | null;
    category?: string | null;
    level?: string | null;
  } | null;
  group?: {
    id: number;
    name: string;
  } | null;
  group_position?: number | null;
  status?: string | null;
}

export interface TournamentTeamsResponse {
  data: TournamentTeamItem[];
}

export function getTournamentStandings(id: number | string): Promise<TournamentStandingsResponse> {
  return get<TournamentStandingsResponse>(`/v1/tournaments/${id}/standings`, {
    auth: false,
  });
}

export function useTournamentStandings(id: number | string | undefined) {
  return useQuery({
    queryKey: ['public', 'tournament-standings', String(id)],
    queryFn: () => getTournamentStandings(id!),
    enabled: id !== undefined && id !== null && id !== '',
    staleTime: 3 * 60 * 1000,
  });
}

export function getTournamentTeams(id: number | string): Promise<TournamentTeamsResponse> {
  return get<TournamentTeamsResponse>(`/v1/tournaments/${id}/teams`, {
    auth: false,
  });
}

export function useTournamentTeams(id: number | string | undefined) {
  return useQuery({
    queryKey: ['public', 'tournament-teams', String(id)],
    queryFn: () => getTournamentTeams(id!),
    enabled: id !== undefined && id !== null && id !== '',
    staleTime: 5 * 60 * 1000,
  });
}

export interface MatchEventItem {
  id: number;
  type: string;
  minute?: number | null;
  added_time?: number | null;
  period?: string | null;
  description?: string | null;
  team_name?: string | null;
  player_name?: string | null;
  assist_player_name?: string | null;
}

export interface MatchDetailData {
  id: number;
  status: string;
  is_live: boolean;
  is_finished: boolean;
  current_period?: string | null;
  current_minute?: number | null;
  home_team?: {
    id: number;
    name: string;
    logo_url?: string | null;
  } | null;
  away_team?: {
    id: number;
    name: string;
    logo_url?: string | null;
  } | null;
  home_score?: number | null;
  away_score?: number | null;
  stadium?: {
    id: number;
    name: string;
  } | null;
  round?: {
    id: number;
    name: string;
    stage?: string | null;
  } | null;
  group?: {
    id: number;
    name: string;
  } | null;
  scheduled_at?: string | null;
  started_at?: string | null;
  ended_at?: string | null;
  events?: MatchEventItem[];
  referee_name?: string | null;
}

export function getTournamentMatchDetail(
  tournamentId: number | string,
  matchId: number | string
): Promise<{ data: MatchDetailData }> {
  return get<{ data: MatchDetailData }>(`/v1/tournaments/${tournamentId}/matches/${matchId}`, {
    auth: false,
  });
}

export function useTournamentMatchDetail(
  tournamentId: number | string | undefined,
  matchId: number | string | undefined
) {
  return useQuery({
    queryKey: ['public', 'tournament-match-detail', String(tournamentId), String(matchId)],
    queryFn: () => getTournamentMatchDetail(tournamentId!, matchId!),
    enabled: Boolean(tournamentId && matchId),
    staleTime: 30 * 1000,
    refetchInterval: 15 * 1000,
  });
}

export interface TeamSquadMember {
  id: number;
  name: string;
  position?: string | null;
  number?: number | null;
  role?: string | null;
  avatar_url?: string | null;
}

export interface TeamPageData {
  team: {
    id: number;
    name: string;
    logo_url?: string | null;
    cover_image_url?: string | null;
    city?: string | null;
    category?: string | null;
    manager?: string | null;
  };
  stats?: {
    points?: number;
    matches_played?: number;
    wins?: number;
    draws?: number;
    losses?: number;
    goals_for?: number;
    goals_against?: number;
    goal_difference?: number;
  };
  squad?: TeamSquadMember[];
  recent_matches?: Array<{
    id: number;
    home_score?: number | null;
    away_score?: number | null;
    started_at?: string | null;
    ended_at?: string | null;
    homeTeam?: { id: number; name: string; logo_path?: string | null };
    awayTeam?: { id: number; name: string; logo_path?: string | null };
  }>;
}

export function getTeamPage(teamId: number | string): Promise<{ data: TeamPageData }> {
  return get<{ data: TeamPageData }>(`/v1/teams/${teamId}/page`, {
    auth: false,
  });
}

export function useTeamPage(teamId: number | string | undefined) {
  return useQuery({
    queryKey: ['public', 'team-page', String(teamId)],
    queryFn: () => getTeamPage(teamId!),
    enabled: Boolean(teamId),
    staleTime: 5 * 60 * 1000,
  });
}


