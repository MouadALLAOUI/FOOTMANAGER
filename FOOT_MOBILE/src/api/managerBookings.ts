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
