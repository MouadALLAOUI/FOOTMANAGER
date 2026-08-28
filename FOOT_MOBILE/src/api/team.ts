import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { get, put } from '@/api/client';
import { q } from '@/api/query-keys';

export type PlayerPosition = 'goalkeeper' | 'defender' | 'midfielder' | 'forward' | string;

export interface Teammate {
  id: number;
  name: string;
  position?: PlayerPosition | null;
  number?: number | null;
  is_essential?: boolean;
  role?: string | null;
  avatar_url?: string | null;
}

export interface TeamMembership {
  player_id: number;
  position?: PlayerPosition | null;
  number?: number | null;
  is_essential?: boolean;
  role?: string | null;
  joined_at?: string | null;
}

export interface PlayerTeam {
  id: number;
  name: string;
  logo_url?: string | null;
  logo_thumbnail_url?: string | null;
  city?: string | null;
  category?: string | null;
  captain_id?: number | null;
  vice_captain_id?: number | null;
  member_count?: number;
}

export interface MyTeamResponse {
  membership: TeamMembership | null;
  team: PlayerTeam | null;
  teammates: Teammate[];
}

export type PlayerApplicationStatus = 'pending' | 'accepted' | 'declined' | 'cancelled';
export type PlayerApplicationType = 'apply' | 'invite';

export interface ApplicationHostManager {
  id: number;
  name?: string | null;
}

export interface ApplicationHostTeam {
  id: number;
  name?: string | null;
  city?: string | null;
  logo_url?: string | null;
  manager?: ApplicationHostManager | null;
}

export interface ApplicationStadium {
  id: number;
  name?: string | null;
  city?: string | null;
  images?: unknown[];
}

export interface ApplicationMatch {
  id: number;
  status?: string | null;
  match_datetime?: string | null;
  notes?: string | null;
  needs_players?: boolean;
  host_team?: ApplicationHostTeam | null;
  stadium?: ApplicationStadium | null;
}

export interface PlayerApplication {
  id: number;
  player_id?: number;
  match_request_id?: number;
  type: PlayerApplicationType;
  status: PlayerApplicationStatus;
  position?: string | null;
  message?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  match_request?: ApplicationMatch | null;
}

export interface ApplicationsResponse {
  applications: PlayerApplication[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface ApplicationActionResponse {
  message: string;
  application: PlayerApplication;
}

export type ApplicationAction = 'accept' | 'decline';

export function getMyTeam(): Promise<MyTeamResponse> {
  return get<MyTeamResponse>('/player/my-team');
}

export function useMyTeam() {
  return useQuery({
    queryKey: q.myTeam(),
    queryFn: getMyTeam,
  });
}

function getApplications(page = 1): Promise<ApplicationsResponse> {
  return get<ApplicationsResponse>('/player/applications', { params: { page } });
}

export function useApplications() {
  return useQuery({
    queryKey: q.applications(),
    queryFn: () => getApplications(),
  });
}

export function respondToApplication(
  id: number | string,
  action: ApplicationAction,
): Promise<ApplicationActionResponse> {
  return put<ApplicationActionResponse>(`/player/applications/${id}/respond`, { action });
}

export function cancelPlayerApplication(id: number | string): Promise<ApplicationActionResponse> {
  return put<ApplicationActionResponse>(`/player/applications/${id}/cancel`);
}

export function useRespondToApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: number | string; action: ApplicationAction }) =>
      respondToApplication(id, action),
    onMutate: async ({ id, action }: { id: number | string; action: ApplicationAction }) => {
      await queryClient.cancelQueries({ queryKey: ['player', 'applications'] });
      const previous = queryClient.getQueryData<ApplicationsResponse>(['player', 'applications']);
      if (previous) {
        queryClient.setQueryData<ApplicationsResponse>(['player', 'applications'], {
          ...previous,
          applications: previous.applications.map((app) =>
            app.id === Number(id)
              ? { ...app, status: action === 'accept' ? 'accepted' : 'declined' }
              : app,
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['player', 'applications'], context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['player', 'applications'] });
    },
  });
}

export function useCancelPlayerApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: cancelPlayerApplication,
    onMutate: async (id: number | string) => {
      await queryClient.cancelQueries({ queryKey: ['player', 'applications'] });
      const previous = queryClient.getQueryData<ApplicationsResponse>(['player', 'applications']);
      if (previous) {
        queryClient.setQueryData<ApplicationsResponse>(['player', 'applications'], {
          ...previous,
          applications: previous.applications.map((app) =>
            app.id === Number(id) ? { ...app, status: 'cancelled' } : app,
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['player', 'applications'], context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['player', 'applications'] });
    },
  });
}
