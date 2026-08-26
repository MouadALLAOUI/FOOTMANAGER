import { useQuery } from '@tanstack/react-query';

import { get } from '@/api/client';
import { q } from '@/api/query-keys';

export interface City {
  id: number;
  name: string;
  name_ar: string | null;
  name_fr: string | null;
  name_en: string | null;
  slug: string;
  localized_name: string;
}

interface CitiesPaginatedResponse {
  current_page: number;
  data: City[];
  per_page: number;
  total: number;
}

interface CitiesSelectResponse {
  cities: Pick<City, 'id' | 'name' | 'localized_name' | 'slug'>[];
}

export function cityDisplayName(city: City, locale: string): string {
  if (locale === 'ar' && city.name_ar) return city.name_ar;
  if (locale === 'fr' && city.name_fr) return city.name_fr;
  if (locale === 'en' && city.name_en) return city.name_en;
  return city.localized_name || city.name;
}

export function citySelectDisplayName(c: Pick<City, 'id' | 'name' | 'localized_name' | 'slug'>, _locale: string): string {
  // listForSelect only has localized_name computed server-side; use it as fallback, else name
  return c.localized_name || c.name;
}

async function fetchCities(): Promise<City[]> {
  // Use /cities?per_page=200 to get full translations for client-side locale handling
  const res = await get<CitiesPaginatedResponse>('/cities', {
    params: { per_page: 200, active_only: true },
    auth: false,
  });
  return res.data ?? [];
}

async function fetchCitiesSelect(): Promise<CitiesSelectResponse['cities']> {
  const res = await get<CitiesSelectResponse>('/cities/select', { auth: false });
  return res.cities ?? [];
}

export function useCities() {
  return useQuery({
    queryKey: q.cities(),
    queryFn: fetchCities,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}

export function useCitiesSelect() {
  return useQuery({
    queryKey: q.citiesSelect(),
    queryFn: fetchCitiesSelect,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    retry: 1,
  });
}
