import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/client';
import { q, type QueryParams } from '@/api/query-keys';

export interface StadiumApiItem {
  id: number;
  slug?: string | null;
  name: string;
  type?: string | null;
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  player_format?: string | null;
  is_covered?: boolean;
  capacity?: number | null;
  price_per_hour?: number | null;
  price_per_team?: number | null;
  total_price?: number | null;
  rating?: number | null;
  reviews_count?: number;
  is_open?: boolean;
  is_available?: boolean;
  supports_tournaments?: boolean;
  google_maps_url?: string | null;
  cover_image_url?: string | null;
  images?: string[];
  facilities?: string[];
  distance?: number | null;
}

export interface StadiumsResponse {
  data: StadiumApiItem[];
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
    filters?: {
      cities?: string[];
      types?: string[];
      player_formats?: string[];
    };
  };
}

export interface StadiumDetailResponse {
  data: StadiumApiItem & {
    owner?: {
      id?: number;
      name?: string;
      phone?: string;
    };
    schedules?: Array<{
      day_of_week: number;
      start_time: string;
      end_time: string;
      is_open: boolean;
    }>;
  };
}

export interface BackendSlotItem {
  start: string;
  end: string;
  status: 'available' | 'booked' | 'closed';
  booking?: {
    id: number;
    booking_type?: string;
    reservation_type?: string;
    status?: string;
    manager?: { id: number; name: string } | null;
    team?: { id: number; name: string } | null;
  } | null;
  closure?: {
    id: number | null;
    reason?: string | null;
  } | null;
}

export interface TerrainSlotsResponse {
  terrain?: {
    id: number;
    name: string;
    type?: string;
    player_format?: string;
    price_per_team?: number;
    is_open?: boolean;
    closure_reason?: string | null;
  };
  schedule?: {
    open_time?: string;
    close_time?: string;
    slot_duration?: number;
  };
  date: string;
  slots: BackendSlotItem[];
  terrain_closed?: boolean;
  closure_reason?: string | null;
  message?: string;
}

export function getPublicStadiums(params?: QueryParams): Promise<StadiumsResponse> {
  return get<StadiumsResponse>('/v1/stadiums', {
    auth: false,
    params: params as Record<string, string | number | boolean | undefined | null>,
  });
}

export function getPublicStadium(id: number | string): Promise<StadiumDetailResponse> {
  return get<StadiumDetailResponse>(`/v1/stadiums/${id}`, {
    auth: false,
  });
}

export function getStadiumSlots(id: number | string, date: string): Promise<TerrainSlotsResponse> {
  return get<TerrainSlotsResponse>(`/terrains/${id}/slots`, {
    auth: false,
    params: { date },
  });
}

export function usePublicStadiums(params?: QueryParams) {
  return useQuery({
    queryKey: q.stadiums(params),
    queryFn: () => getPublicStadiums(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function usePublicStadium(id: number | string | undefined) {
  return useQuery({
    queryKey: ['v1', 'stadium', String(id)],
    queryFn: () => getPublicStadium(id!),
    enabled: id !== undefined && id !== null && id !== '',
    staleTime: 5 * 60 * 1000,
  });
}

export function useStadiumSlots(id: number | string | undefined, date: string) {
  return useQuery({
    queryKey: ['terrains', 'slots', String(id), date],
    queryFn: () => getStadiumSlots(id!, date),
    enabled: !!id && !!date,
    staleTime: 60 * 1000,
  });
}
