import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { get, post } from '@/api/client';
import { q } from '@/api/query-keys';

export type PlayerBookingScope = 'upcoming' | 'history';

export interface BookingStadium {
  id?: number | null;
  name?: string | null;
  slug?: string | null;
  type?: string | null;
  city?: string | null;
  address?: string | null;
}

export interface BookingOwner {
  id?: number | null;
  name?: string | null;
}

export interface BookingTeam {
  id?: number | null;
  name?: string | null;
}

export interface BookingCancellationPolicy {
  id?: number | null;
  name?: string | null;
  slug?: string | null;
  hours_before?: number | null;
  refund_percentage?: number | null;
}

export interface BookingPayment {
  id: number;
  provider?: string | null;
  provider_reference?: string | null;
  reservation_reference?: string | null;
  amount?: number | null;
  currency?: string | null;
  status?: string | null;
  payment_method?: string | null;
  expires_at?: string | null;
  paid_at?: string | null;
}

export interface PlayerBooking {
  booking_id: number;
  id: number;
  booking_reference?: string | null;
  uuid?: string | null;
  status?: string | null;
  reservation_status?: string | null;
  booking_type?: string | null;
  flow_type?: string | null;
  reservation_type?: string | null;
  booking_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  duration_minutes?: number | null;
  price?: number | null;
  subtotal?: number | null;
  service_fee?: number | null;
  total?: number | null;
  payment_required?: boolean;
  payment_status?: string | null;
  payment_method?: string | null;
  expires_at?: string | null;
  confirmed_at?: string | null;
  cancelled_at?: string | null;
  cancellation_reason?: string | null;
  refund_percentage?: number | null;
  refund_amount?: number | null;
  can_cancel?: boolean;
  stadium?: BookingStadium | null;
  owner?: BookingOwner | null;
  team?: BookingTeam | null;
  cancellation_policy?: BookingCancellationPolicy | null;
  qr_code_url?: string | null;
  receipt_url?: string | null;
  created_at?: string | null;
}

export interface PlayerBookingDetail extends PlayerBooking {
  notes?: string | null;
  payments?: BookingPayment[];
}

export interface BookingListMeta {
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
}

export interface PlayerBookingsResponse {
  data: PlayerBooking[];
  meta?: BookingListMeta;
}

export interface PlayerBookingDetailResponse {
  data: PlayerBookingDetail;
}

export interface CancelBookingResponse {
  data: {
    cancelled?: boolean;
    refund_percentage?: number | null;
    refund_amount?: number | null;
    cancellation_reason?: string | null;
    booking?: PlayerBooking;
  };
}

function getPlayerBookings(scope: PlayerBookingScope): Promise<PlayerBookingsResponse> {
  return get<PlayerBookingsResponse>(`/bookings/${scope}`);
}

function getPlayerBooking(id: number | string): Promise<PlayerBookingDetailResponse> {
  return get<PlayerBookingDetailResponse>(`/bookings/${id}`);
}

function cancelPlayerBooking(id: number | string, reason?: string): Promise<CancelBookingResponse> {
  return post<CancelBookingResponse>(`/bookings/${id}/cancel`, { reason });
}

export function usePlayerBookings(scope: PlayerBookingScope) {
  return useQuery({
    queryKey: q.playerBookings(scope),
    queryFn: () => getPlayerBookings(scope),
  });
}

export function usePlayerBookingDetail(id: number | string) {
  return useQuery({
    queryKey: q.playerBookingDetail(id),
    queryFn: () => getPlayerBooking(id),
    enabled: id != null && id !== '',
  });
}

export function useCancelPlayerBooking() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number | string; reason?: string }) =>
      cancelPlayerBooking(id, reason),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ['player', 'bookings'] });
      void queryClient.invalidateQueries({ queryKey: q.playerBookingDetail(id) });
    },
  });
}
