import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Href } from 'expo-router';

import { get, put } from '@/api/client';
import { q, type QueryParams } from '@/api/query-keys';
import type { Role } from '@/auth/roles';

export type NotificationCategory =
  | 'match'
  | 'booking'
  | 'tournament'
  | 'recruitment'
  | 'team'
  | 'social'
  | 'system';

export interface AppNotification {
  id: number;
  type: string;
  category: NotificationCategory;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  action_url: string | null;
  is_read: boolean;
  is_pinned: boolean;
  is_important: boolean;
  created_at: string;
}

export interface NotificationsResponse {
  notifications: AppNotification[];
  unread_count: number;
  has_more: boolean;
  categories: NotificationCategory[];
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface NotificationsQueryParams {
  filter?: 'unread' | 'read' | 'important' | 'pinned';
  category?: NotificationCategory;
}

export function getNotifications(params?: NotificationsQueryParams): Promise<NotificationsResponse> {
  return get<NotificationsResponse>('/notifications', {
    params: { ...(params?.filter ? { filter: params.filter } : {}), ...(params?.category ? { category: params.category } : {}) },
  });
}

export function getUnreadNotificationCount(): Promise<UnreadCountResponse> {
  return get<UnreadCountResponse>('/notifications/unread-count');
}

export function markNotificationAsRead(id: number): Promise<{ message: string }> {
  return put<{ message: string }>(`/notifications/${id}/read`);
}

export function markAllNotificationsAsRead(): Promise<{ message: string }> {
  return put<{ message: string }>('/notifications/read-all');
}

export function useNotifications(params?: NotificationsQueryParams) {
  return useQuery({
    queryKey: q.notifications(params as QueryParams | undefined),
    queryFn: () => getNotifications(params),
  });
}

export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: q.notificationUnreadCount(),
    queryFn: getUnreadNotificationCount,
    staleTime: 30_000,
  });
}

export function useMarkNotificationAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => markNotificationAsRead(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const prev = queryClient.getQueryData<NotificationsResponse>(q.notifications());
      queryClient.setQueryData<NotificationsResponse>(q.notifications(), (old) =>
        old
          ? { ...old, notifications: old.notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)) }
          : old,
      );
      return { prev };
    },
    onError: (_error, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(q.notifications(), ctx.prev);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

export function useMarkAllNotificationsAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsAsRead,
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['notifications'] });
      const prev = queryClient.getQueryData<NotificationsResponse>(q.notifications());
      queryClient.setQueryData<NotificationsResponse>(q.notifications(), (old) =>
        old
          ? { ...old, notifications: old.notifications.map((n) => ({ ...n, is_read: true })), unread_count: 0 }
          : old,
      );
      return { prev };
    },
    onError: (_error, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(q.notifications(), ctx.prev);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}

function idFrom(data: Record<string, unknown> | null | undefined, keys: string[]): number | null {
  if (!data) return null;
  for (const key of keys) {
    const value = data[key];
    if (typeof value === 'number' || (typeof value === 'string' && value !== '')) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) return parsed;
    }
  }
  return null;
}

/**
 * Resolve a notification to an in-app destination that actually exists.
 * Only player/manager detail routes (matches/[id], bookings/[id]) and the
 * shared team tab are wired. Anything else returns null so the caller can
 * handle it gracefully instead of navigating to a broken route.
 */
export function notificationTarget(
  notification: Pick<AppNotification, 'category' | 'data'>,
  role: Role | null,
): Href | null {
  const kind = notification.category;
  if (kind === 'match') {
    const id = idFrom(notification.data, ['match_request_id', 'match_id', 'fixture_id', 'id']);
    if (id == null) return null;
    if (role === 'manager') return `/(manager)/matches/${id}` as Href;
    if (role === 'player') return `/(player)/matches/${id}` as Href;
    return null;
  }
  if (kind === 'booking') {
    const id = idFrom(notification.data, ['booking_id', 'id']);
    if (role === 'terrain_owner') return '/(terrain)/bookings' as Href;
    if (id == null) return null;
    if (role === 'manager') return `/(manager)/bookings/${id}` as Href;
    if (role === 'player') return `/(player)/bookings/${id}` as Href;
    return null;
  }
  if (kind === 'team' || kind === 'recruitment') {
    if (role === 'manager') return '/(manager)/team' as Href;
    if (role === 'player') return '/(player)/team' as Href;
    return null;
  }
  if (kind === 'tournament') {
    if (role === 'committee') return '/(committee)/tournaments' as Href;
    return '/(public)' as Href;
  }
  return null;
}
