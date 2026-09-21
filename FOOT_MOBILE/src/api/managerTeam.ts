import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { del, get, post, put, upload } from '@/api/client';
import { q } from '@/api/query-keys';

export type PlayerPosition = 'goalkeeper' | 'defender' | 'midfielder' | 'forward' | string;

export interface SquadPlayer {
  id: number;
  user_id?: number | null;
  team_id?: number | null;
  name: string;
  position?: PlayerPosition | null;
  preferred_position?: PlayerPosition | null;
  number?: number | null;
  phone?: string | null;
  is_whatsapp?: boolean;
  role?: string | null;
  preferred_foot?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  status?: string | null;
  is_essential?: boolean;
  joined_at?: string | null;
  avatar_url?: string | null;
  notes?: string | null;
}

export interface SquadMembersResponse {
  players: SquadPlayer[];
}

export interface SquadPlayerResponse {
  message: string;
  player: SquadPlayer;
}

export interface MessageResponse {
  message: string;
}

export interface TeamBrief {
  id?: number;
  name?: string | null;
  captain_id?: number | null;
  vice_captain_id?: number | null;
  captain?: { id: number; name: string; number?: number | null; role?: string | null } | null;
  vice_captain?: { id: number; name: string; number?: number | null; role?: string | null } | null;
  [key: string]: unknown;
}

export interface TeamResponse {
  message: string;
  team: TeamBrief;
}

export interface ManagerTeamProfile {
  id: number;
  name: string;
  logo_url?: string | null;
  logo_thumbnail_url?: string | null;
  city?: string | null;
  category?: string | null;
  association_name?: string | null;
  member_count?: number;
  [key: string]: unknown;
}

export interface ManagerTeamProfileResponse {
  message?: string;
  team: ManagerTeamProfile;
}

export function getTeamMembers(): Promise<SquadMembersResponse> {
  return get<SquadMembersResponse>('/manager/team-members');
}

export function getTeamProfile(): Promise<ManagerTeamProfileResponse> {
  return get<ManagerTeamProfileResponse>('/manager/team-profile');
}

export function uploadTeamLogo(file: { uri: string; name: string; type: string }): Promise<ManagerTeamProfileResponse> {
  const formData = new FormData();
  formData.append('logo', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);
  return upload<ManagerTeamProfileResponse>('/manager/team-profile/logo', formData);
}

export function useTeamProfile() {
  return useQuery({
    queryKey: q.teamProfile(),
    queryFn: getTeamProfile,
  });
}

export function useUploadTeamLogo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: uploadTeamLogo,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: q.teamProfile() });
      void queryClient.invalidateQueries({ queryKey: ['manager', 'team-members'] });
      void queryClient.invalidateQueries({ queryKey: ['player', 'my-team'] });
    },
  });
}

export function toggleEssential(id: number | string): Promise<SquadPlayerResponse> {
  return put<SquadPlayerResponse>(`/manager/team-members/${id}/essential`);
}

export function removeMember(id: number | string): Promise<MessageResponse> {
  return del<MessageResponse>(`/manager/team-members/${id}`);
}

export function changePosition(id: number | string, position: string): Promise<SquadPlayerResponse> {
  return put<SquadPlayerResponse>(`/manager/team-members/${id}/position`, { position });
}

export function assignCaptain(playerId: number | string): Promise<TeamResponse> {
  return put<TeamResponse>(`/manager/team/captain/${playerId}`);
}

export function assignViceCaptain(playerId: number | string): Promise<TeamResponse> {
  return put<TeamResponse>(`/manager/team/vice-captain/${playerId}`);
}

export function removeCaptain(): Promise<TeamResponse> {
  return del<TeamResponse>('/manager/team/captain');
}

export function useTeamMembers() {
  return useQuery({
    queryKey: q.teamMembers({ scope: 'roster' }),
    queryFn: getTeamMembers,
  });
}

export function useSquadMemberDetail(id: number | string | undefined) {
  const list = useTeamMembers();
  const player = list.data?.players.find((p) => String(p.id) === String(id));
  return {
    player,
    isLoading: list.isLoading,
    isError: list.isError,
    error: list.error,
    refetch: list.refetch,
  };
}

export function useToggleEssential() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: toggleEssential,
    onMutate: async (id: number | string) => {
      await queryClient.cancelQueries({ queryKey: ['manager', 'team-members'] });
      const previous = queryClient.getQueryData<SquadMembersResponse>(q.teamMembers({ scope: 'roster' }));
      if (previous) {
        queryClient.setQueryData<SquadMembersResponse>(q.teamMembers({ scope: 'roster' }), {
          ...previous,
          players: previous.players.map((p) =>
            String(p.id) === String(id) ? { ...p, is_essential: !p.is_essential } : p,
          ),
        });
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(q.teamMembers({ scope: 'roster' }), context.previous);
      }
    },
    onSettled: (_data, _error, id) => {
      void queryClient.invalidateQueries({ queryKey: ['manager', 'team-members'] });
      void queryClient.invalidateQueries({ queryKey: q.squadMemberDetail(id) });
      void queryClient.invalidateQueries({ queryKey: ['player', 'my-team'] });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeMember,
    onMutate: async (id: number | string) => {
      await queryClient.cancelQueries({ queryKey: ['manager', 'team-members'] });
      const previous = queryClient.getQueryData<SquadMembersResponse>(q.teamMembers({ scope: 'roster' }));
      if (previous) {
        queryClient.setQueryData<SquadMembersResponse>(q.teamMembers({ scope: 'roster' }), {
          ...previous,
          players: previous.players.filter((p) => String(p.id) !== String(id)),
        });
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(q.teamMembers({ scope: 'roster' }), context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['manager', 'team-members'] });
      void queryClient.invalidateQueries({ queryKey: ['player', 'my-team'] });
    },
  });
}

export function useChangePosition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, position }: { id: number | string; position: string }) =>
      changePosition(id, position),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['manager', 'team-members'] });
      void queryClient.invalidateQueries({ queryKey: q.squadMemberDetail(id) });
    },
  });
}

export function useAssignCaptain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignCaptain,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manager', 'team-members'] });
      void queryClient.invalidateQueries({ queryKey: ['manager', 'team-profile'] });
      void queryClient.invalidateQueries({ queryKey: ['player', 'my-team'] });
    },
  });
}

export function useAssignViceCaptain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: assignViceCaptain,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manager', 'team-members'] });
      void queryClient.invalidateQueries({ queryKey: ['manager', 'team-profile'] });
      void queryClient.invalidateQueries({ queryKey: ['player', 'my-team'] });
    },
  });
}

export function useRemoveCaptain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: removeCaptain,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manager', 'team-members'] });
      void queryClient.invalidateQueries({ queryKey: ['manager', 'team-profile'] });
      void queryClient.invalidateQueries({ queryKey: ['player', 'my-team'] });
    },
  });
}

export interface CreatePlayerPayload {
  name: string;
  position?: string;
  number?: number | string;
  phone?: string;
  is_whatsapp?: boolean;
  notes?: string;
  role?: string;
  preferred_foot?: string;
  height_cm?: number;
  weight_kg?: number;
  photo?: { uri: string; name: string; type: string };
}

export async function createPlayer(payload: CreatePlayerPayload): Promise<SquadPlayerResponse> {
  if (payload.photo) {
    const formData = new FormData();
    formData.append('photo', {
      uri: payload.photo.uri,
      name: payload.photo.name,
      type: payload.photo.type,
    } as unknown as Blob);
    formData.append('name', payload.name);
    if (payload.position) formData.append('position', payload.position);
    if (payload.number != null && payload.number !== '') formData.append('number', String(payload.number));
    if (payload.phone) formData.append('phone', payload.phone);
    if (payload.is_whatsapp) formData.append('is_whatsapp', '1');
    if (payload.notes) formData.append('notes', payload.notes);
    if (payload.role) formData.append('role', payload.role);
    if (payload.preferred_foot) formData.append('preferred_foot', payload.preferred_foot);
    if (payload.height_cm) formData.append('height_cm', String(payload.height_cm));
    if (payload.weight_kg) formData.append('weight_kg', String(payload.weight_kg));
    return upload<SquadPlayerResponse>('/manager/players', formData);
  }

  return post<SquadPlayerResponse>('/manager/players', {
    name: payload.name,
    position: payload.position,
    number: payload.number ? Number(payload.number) : undefined,
    phone: payload.phone,
    is_whatsapp: payload.is_whatsapp,
    notes: payload.notes,
    role: payload.role,
    preferred_foot: payload.preferred_foot,
    height_cm: payload.height_cm ? Number(payload.height_cm) : undefined,
    weight_kg: payload.weight_kg ? Number(payload.weight_kg) : undefined,
  });
}

export function useCreatePlayer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPlayer,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manager', 'team-members'] });
      void queryClient.invalidateQueries({ queryKey: q.teamMembers({ scope: 'roster' }) });
    },
  });
}

