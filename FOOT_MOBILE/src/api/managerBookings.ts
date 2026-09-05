import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { get, post } from '@/api/client';
import { q } from '@/api/query-keys';

export type ManagerBookingFilter = 'upcoming' | 'past' | 'cancelled' | 'all';

export interface ManagerBookingTerrain {
  id: number;
  name?: string | null;
  city?: string | null;
  type?: string | null;
}

export interface ManagerBookingTeam {
  id: number;
  name?: string | null;
}

export interface ManagerBooking {
  id: number;
  booking_reference?: string | null;
  uuid?: string | null;
  status?: string | null;
  booking_type?: string | null;
  flow_type?: string | null;
  reservation_type?: string | null;
  booking_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  duration_minutes?: number | null;
  price?: number | null;
  total?: number | null;
  payment_status?: string | null;
  notes?: string | null;
  terrain_id?: number | null;
  team_id?: number | null;
  match_request_id?: number | null;
  next_date?: string | null;
  subscription_status?: string | null;
  occurrences_remaining?: number | null;
  terrain?: ManagerBookingTerrain | null;
  team?: ManagerBookingTeam | null;
}

export interface ManagerBookingsResponse {
  bookings: ManagerBooking[];
  counts?: {
    upcoming?: number;
    past?: number;
    cancelled?: number;
    all?: number;
    [key: string]: number | undefined;
  };
  pagination?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
}

export interface ConvertFromBookingResponse {
  message: string;
  match_request?: {
    id?: number;
    status?: string | null;
    match_datetime?: string | null;
    stadium?: { id?: number; name?: string | null } | null;
    hostTeam?: { id?: number; name?: string | null } | null;
  } | null;
}

export interface ConvertFromBookingPayload {
  notes?: string;
  date?: string;
  needs_players?: boolean;
  players_needed?: number;
}

export function getManagerBookings(filter: ManagerBookingFilter): Promise<ManagerBookingsResponse> {
  return get<ManagerBookingsResponse>('/manager/bookings', {
    params: { filter, per_page: 100 },
  });
}

export function convertBookingToMatch(
  bookingId: number | string,
  payload: ConvertFromBookingPayload,
): Promise<ConvertFromBookingResponse> {
  return post<ConvertFromBookingResponse>(`/manager/match-requests/from-booking/${bookingId}`, payload);
}

export function useManagerBookings(filter: ManagerBookingFilter) {
  return useQuery({
    queryKey: q.bookings({ filter }),
    queryFn: () => getManagerBookings(filter),
  });
}

export function useManagerBookingDetail(id: number | string | undefined) {
  const list = useManagerBookings('all');
  const booking = list.data?.bookings.find((b) => String(b.id) === String(id));
  return {
    booking,
    isLoading: list.isLoading,
    isError: list.isError,
    error: list.error,
    refetch: list.refetch,
  };
}

export function useConvertBookingToMatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: ConvertFromBookingPayload }) =>
      convertBookingToMatch(id, payload),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['manager', 'bookings'] });
      void queryClient.invalidateQueries({ queryKey: q.managerBookingDetail(id) });
      void queryClient.invalidateQueries({ queryKey: ['manager', 'match-requests'] });
      void queryClient.invalidateQueries({ queryKey: ['v1', 'matches'] });
    },
  });
}

/* ── Terrain discovery & booking (core mobile flow) ─────────────────────── */

export interface TerrainSlot {
  start: string;
  end: string;
  status?: string | null;
}

export interface TerrainSlotsResponse {
  terrain?: {
    id: number;
    name?: string | null;
    type?: string | null;
    player_format?: string | null;
    price_per_team?: number | null;
    is_open?: boolean;
    closure_reason?: string | null;
  } | null;
  slots?: TerrainSlot[];
  terrain_closed?: boolean;
  closure_reason?: string | null;
  message?: string | null;
}

export interface CreateManagerBookingPayload {
  terrain_id: number | string;
  booking_date: string;
  start_time: string;
  end_time: string;
  booking_type?: string;
  notes?: string;
}

export interface CreateManagerBookingResponse {
  message?: string;
  booking?: ManagerBooking;
  [key: string]: unknown;
}

/** Public availability endpoint — returns the schedule slots for one day,
 *  already marked busy where bookings/closures/fixtures overlap. */
export function getTerrainSlots(terrainId: number | string, date: string): Promise<TerrainSlotsResponse> {
  return get<TerrainSlotsResponse>(`/terrains/${terrainId}/slots`, {
    params: { date },
  });
}

export function createManagerTrainingBooking(
  payload: CreateManagerBookingPayload,
): Promise<CreateManagerBookingResponse> {
  return post<CreateManagerBookingResponse>('/manager/bookings/training', payload);
}

export function useTerrainSlots(terrainId: number | string | undefined, date: string | undefined) {
  return useQuery({
    queryKey: ['terrain', 'slots', String(terrainId), date],
    queryFn: () => getTerrainSlots(terrainId as number | string, date as string),
    enabled: Boolean(terrainId && date),
  });
}

export function useCreateManagerBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateManagerBookingPayload) => createManagerTrainingBooking(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['manager', 'bookings'] });
      void queryClient.invalidateQueries({ queryKey: ['terrain', 'slots'] });
    },
  });
}

export interface TerrainCatalogItem {
  id: number;
  name: string;
  slug?: string | null;
  type?: string | null;
  city?: string | null;
  address?: string | null;
  player_format?: string | null;
  price_per_hour?: number | null;
  price_per_team?: number | null;
  is_available?: boolean;
}

export interface TerrainCatalogResponse {
  stadiums: TerrainCatalogItem[];
}

/** Public terrain catalog used by the mobile booking flow. */
export function getTerrainCatalog(): Promise<TerrainCatalogResponse> {
  return get<TerrainCatalogResponse>('/stadiums', {
    params: { per_page: 100 },
  });
}

export function useTerrainCatalog() {
  return useQuery({
    queryKey: ['terrain', 'catalog'],
    queryFn: getTerrainCatalog,
    staleTime: 5 * 60 * 1000,
  });
}
