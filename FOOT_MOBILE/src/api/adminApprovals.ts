import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { get, put } from '@/api/client';
import { q } from '@/api/query-keys';

export type AdminApprovalRole = 'manager' | 'terrain_owner' | 'committee';

export interface AdminApplicant {
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
  team?: { id?: number; name?: string | null } | null;
}

interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

interface ManagersResponse {
  managers: AdminApplicant[];
  pagination: PaginationMeta;
}

interface OwnersResponse {
  owners: AdminApplicant[];
  pagination: PaginationMeta;
}

interface CommitteesResponse {
  committees: AdminApplicant[];
  pagination: PaginationMeta;
}

export interface AdminApprovalFeed {
  managers: AdminApplicant[];
  owners: AdminApplicant[];
  committees: AdminApplicant[];
}

const roleEndpointMap: Record<AdminApprovalRole, string> = {
  manager: 'managers',
  terrain_owner: 'terrain-owners',
  committee: 'committees',
};

const ROLE_DATA_KEY: Record<AdminApprovalRole, 'managers' | 'owners' | 'committees'> = {
  manager: 'managers',
  terrain_owner: 'owners',
  committee: 'committees',
};

async function fetchApplicants(role: AdminApprovalRole): Promise<AdminApplicant[]> {
  const endpoint = roleEndpointMap[role];
  const data = await get<
    | ManagersResponse
    | OwnersResponse
    | CommitteesResponse
  >(`/admin/${endpoint}`, { params: { status: 'pending', per_page: 100 } });
  return ((data as unknown) as Record<string, AdminApplicant[]>)[ROLE_DATA_KEY[role]] ?? [];
}

export async function getApprovalFeed(): Promise<AdminApprovalFeed> {
  const [managers, owners, committees] = await Promise.all([
    fetchApplicants('manager'),
    fetchApplicants('terrain_owner'),
    fetchApplicants('committee'),
  ]);
  return { managers, owners, committees };
}

export interface AdminDecisionInput {
  role: AdminApprovalRole;
  id: number | string;
  action: 'approve' | 'reject';
}

export async function decideApplicant({ role, id, action }: AdminDecisionInput): Promise<{ message: string }> {
  const endpoint = roleEndpointMap[role];
  return put<{ message: string }>(`/admin/${endpoint}/${id}/${action}`);
}

export function useAdminApprovalFeed() {
  return useQuery({
    queryKey: q.adminApprovalFeed(),
    queryFn: () => getApprovalFeed(),
  });
}

export function useAdminDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AdminDecisionInput) => decideApplicant(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}
