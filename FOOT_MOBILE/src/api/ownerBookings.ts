import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { del, get, post, put } from '@/api/client';
import { q } from '@/api/query-keys';

export type BookingStatus = 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';

export interface OwnerBookingManager {
  id?: number;
  name?: string | null;
  phone?: string | null;
  playerProfile?: { name?: string | null } | null;
}

export interface OwnerBookingTeam {
  id?: number;
  name?: string | null;
}

export interface OwnerBookingTerrain {
  id?: number;
  name?: string | null;
}

export interface OwnerBooking {
  id: number;
  booking_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  price?: number | string | null;
  total?: number | string | null;
  status?: BookingStatus | null;
  booking_type?: string | null;
  flow_type?: string | null;
  reservation_type?: string | null;
  notes?: string | null;
  created_at?: string | null;
  manager?: OwnerBookingManager | null;
  team?: OwnerBookingTeam | null;
  terrain?: OwnerBookingTerrain | null;
  guest_name?: string | null;
  guest_phone?: string | null;
  guest_email?: string | null;
  is_guest?: boolean;
  whatsapp_notification_url?: string | null;
}

export type OwnerCalendarSlotStatus = 'booked' | 'available' | 'closed';

export interface OwnerCalendarSlot {
  start: string;
  end: string;
  status: OwnerCalendarSlotStatus;
  booking?: {
    id: number;
    booking_type?: string | null;
    flow_type?: string | null;
    reservation_type?: string | null;
    status?: BookingStatus | null;
    price?: number | string | null;
    start_time?: string | null;
    end_time?: string | null;
    manager?: OwnerBookingManager | null;
    team?: OwnerBookingTeam | null;
    guest_name?: string | null;
    guest_phone?: string | null;
    guest_email?: string | null;
    is_guest?: boolean;
  } | null;
  closure?: {
    id: number;
    reason?: string | null;
  } | null;
}

export interface OwnerCalendarDay {
  date: string;
  day_name?: string | null;
  is_open: boolean;
  slots: OwnerCalendarSlot[];
}

export interface OwnerCalendarResponse {
  terrain?: {
    id?: number;
    name?: string | null;
    type?: string | null;
    player_format?: string | null;
    price_per_team?: number | string | null;
    is_open?: boolean;
    closure_reason?: string | null;
  } | null;
  week: {
    start: string;
    end: string;
  };
  stats: {
    total_bookings?: number;
    active_subscriptions?: number;
    empty_slots?: number;
  };
  days: OwnerCalendarDay[];
  pending_bookings: OwnerBooking[];
}

export interface TerrainSlotClosure {
  id: number;
  terrain_id?: number;
  closure_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  reason?: string | null;
  created_at?: string | null;
}

export interface SlotClosuresResponse {
  closures: TerrainSlotClosure[];
}

export interface SlotClosureStoreResponse {
  message: string;
  closure: TerrainSlotClosure;
}

export type OwnerManageStatus = 'approved' | 'rejected' | 'completed' | 'cancelled';

export interface OwnerManageBookingResponse {
  message: string;
  booking: OwnerBooking;
  whatsapp_notification_url?: string | null;
}

export interface GuestBookingResponse {
  message: string;
  booking: OwnerBooking;
  whatsapp_notification_url?: string | null;
}

export interface GuestBookingPayload {
  reservation_type: 'single' | 'weekly_subscription';
  booking_date?: string;
  day_of_week?: number;
  start_date?: string;
  end_date?: string;
  start_time: string;
  end_time: string;
  booking_type: 'training' | 'private' | 'match';
  guest_name: string;
  guest_phone?: string;
  guest_email?: string;
  notes?: string;
}

function getOwnerCalendar(
  terrainId: number | string,
  weekStart?: string,
): Promise<OwnerCalendarResponse> {
  return get<OwnerCalendarResponse>(`/owner/terrains/${terrainId}/calendar`, {
    params: { week_start: weekStart, weeks: 1 },
  });
}

function manageBooking(
  bookingId: number | string,
  status: OwnerManageStatus,
): Promise<OwnerManageBookingResponse> {
  return put<OwnerManageBookingResponse>(`/owner/bookings/${bookingId}/status`, { status });
}

function getSlotClosures(terrainId: number | string): Promise<SlotClosuresResponse> {
  return get<SlotClosuresResponse>(`/owner/terrains/${terrainId}/slot-closures`);
}

function createSlotClosure(
  terrainId: number | string,
  payload: { closure_date: string; start_time: string; end_time: string; reason?: string },
): Promise<SlotClosureStoreResponse> {
  return post<SlotClosureStoreResponse>(`/owner/terrains/${terrainId}/slot-closures`, payload);
}

function deleteSlotClosure(terrainId: number | string, closureId: number | string): Promise<{ message: string }> {
  return del<{ message: string }>(`/owner/terrains/${terrainId}/slot-closures/${closureId}`);
}

function createGuestBooking(
  terrainId: number | string,
  payload: GuestBookingPayload,
): Promise<GuestBookingResponse> {
  return post<GuestBookingResponse>(`/owner/terrains/${terrainId}/guest-bookings`, payload);
}

export function useOwnerCalendar(terrainId: number | string | undefined, weekStart?: string) {
  return useQuery({
    queryKey: q.ownerCalendar(terrainId, weekStart),
    queryFn: () => getOwnerCalendar(terrainId as number | string, weekStart),
    enabled: terrainId != null && terrainId !== '',
  });
}

export function useOwnerManageBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: number | string; status: OwnerManageStatus }) =>
      manageBooking(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['owner'] });
    },
  });
}

export function useSlotClosures(terrainId: number | string | undefined) {
  return useQuery({
    queryKey: q.ownerSlotClosures(terrainId),
    queryFn: () => getSlotClosures(terrainId as number | string),
    enabled: terrainId != null && terrainId !== '',
  });
}

export function useCreateSlotClosure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      terrainId,
      payload,
    }: {
      terrainId: number | string;
      payload: { closure_date: string; start_time: string; end_time: string; reason?: string };
    }) => createSlotClosure(terrainId, payload),
    onSuccess: (_data, { terrainId }) => {
      void queryClient.invalidateQueries({ queryKey: q.ownerCalendar(terrainId) });
      void queryClient.invalidateQueries({ queryKey: q.ownerSlotClosures(terrainId) });
    },
  });
}

export function useDeleteSlotClosure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      terrainId,
      closureId,
    }: {
      terrainId: number | string;
      closureId: number | string;
    }) => deleteSlotClosure(terrainId, closureId),
    onSuccess: (_data, { terrainId }) => {
      void queryClient.invalidateQueries({ queryKey: q.ownerCalendar(terrainId) });
      void queryClient.invalidateQueries({ queryKey: q.ownerSlotClosures(terrainId) });
    },
  });
}

export function useCreateGuestBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      terrainId,
      payload,
    }: {
      terrainId: number | string;
      payload: GuestBookingPayload;
    }) => createGuestBooking(terrainId, payload),
    onSuccess: (_data, { terrainId }) => {
      void queryClient.invalidateQueries({ queryKey: q.ownerCalendar(terrainId) });
    },
  });
}
