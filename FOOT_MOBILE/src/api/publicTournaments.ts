import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/client';

export interface PublicTournamentItem {
  id: number;
  uuid?: string | null;
  name: string;
  slug?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  description?: string | null;
  location?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: string;
  teams_count?: number;
}

export interface PublicTournamentsResponse {
  data: PublicTournamentItem[];
  meta?: {
    current_page?: number;
    last_page?: number;
    per_page?: number;
    total?: number;
  };
}

export function getPublicTournaments(): Promise<PublicTournamentsResponse> {
  return get<PublicTournamentsResponse>('/v1/tournaments', {
    auth: false,
    params: { per_page: 10 },
  });
}

export function usePublicTournaments() {
  return useQuery({
    queryKey: ['public', 'tournaments'],
    queryFn: getPublicTournaments,
    staleTime: 5 * 60 * 1000,
  });
}
