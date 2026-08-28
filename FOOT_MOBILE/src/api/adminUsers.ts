import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { get, put } from '@/api/client';
import { q } from '@/api/query-keys';

export type AdminUserRole = 'manager' | 'terrain_owner' | 'committee' | 'player' | 'all';

export interface AdminUser {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  is_whatsapp?: boolean;
  role: string;
  status: string;
  avatar_url?: string | null;
  avatar_thumbnail_url?: string | null;
  email_verified_at?: string | null;
  created_at?: string | null;
  plan_name?: string | null;
  activity_locked?: boolean;
  activity_lock_reason?: string | null;
  activity_locked_at?: string | null;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

type ListResponse = {
  managers?: AdminUser[];
  owners?: AdminUser[];
  committees?: AdminUser[];
  players?: AdminUser[];
  pagination: PaginationMeta;
};

const DATA_KEY: Record<Exclude<AdminUserRole, 'all'>, keyof Omit<ListResponse, 'pagination'>> = {
  manager: 'managers',
  terrain_owner: 'owners',
  committee: 'committees',
  player: 'players',
};

const SINGLE_ENDPOINT: Record<Exclude<AdminUserRole, 'all'>, string> = {
  manager: 'managers',
  terrain_owner: 'terrain-owners',
  committee: 'committees',
  player: 'players',
};

export const ALL_ADMIN_USER_ROLES: Exclude<AdminUserRole, 'all'>[] = [
  'manager',
  'terrain_owner',
  'committee',
  'player',
];

async function fetchRoleUsers(
  role: Exclude<AdminUserRole, 'all'>,
  search?: string,
): Promise<AdminUser[]> {
  const data = await get<ListResponse>(`/admin/${SINGLE_ENDPOINT[role]}`, {
    params: { status: 'all', search: search ?? '', per_page: 50 },
  });
  return data[DATA_KEY[role]] ?? [];
}

export async function getAdminUsers(scope: AdminUserRole, search?: string): Promise<AdminUser[]> {
  if (scope === 'all') {
    const lists = await Promise.all(ALL_ADMIN_USER_ROLES.map((r) => fetchRoleUsers(r, search)));
    return lists.flat().sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? '') * -1);
  }
  return fetchRoleUsers(scope, search);
}

export function useAdminUsers(scope: AdminUserRole, search: string) {
  return useQuery({
    queryKey: q.adminUsers(scope, search),
    queryFn: () => getAdminUsers(scope, search),
  });
}

export interface AdminBlockToggleInput {
  role: Exclude<AdminUserRole, 'all'>;
  id: number | string;
  action: 'block' | 'unblock';
}

export async function toggleBlock({ role, id, action }: AdminBlockToggleInput): Promise<{ message: string }> {
  return put<{ message: string }>(`/admin/${SINGLE_ENDPOINT[role]}/${id}/${action}`);
}

export function useAdminBlockToggle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminBlockToggleInput) => toggleBlock(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

export interface ActivityLockInput {
  id: number | string;
  reason?: string;
}

export async function lockActivity({ id, reason }: ActivityLockInput): Promise<{ message: string }> {
  return put<{ message: string }>(`/admin/accounts/${id}/lock-activity`, { reason });
}

export async function unlockActivity(id: number | string): Promise<{ message: string }> {
  return put<{ message: string }>(`/admin/accounts/${id}/unlock-activity`);
}

export function useAdminActivityLock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { user: AdminUser; action: 'lock' | 'unlock'; reason?: string }) =>
      input.action === 'lock' ? lockActivity({ id: input.user.id, reason: input.reason }) : unlockActivity(input.user.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}
