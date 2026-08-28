import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { get, put, upload } from '@/api/client';
import { q } from '@/api/query-keys';

export type TerrainType = 'salle' | 'synthetic' | 'cement' | 'minifoot' | 'grass';

export interface TerrainImageDto {
  id?: number;
  image_path?: string | null;
  thumbnail_path?: string | null;
  is_thumbnail?: boolean;
  image_url?: string | null;
  thumbnail_url?: string | null;
}

export interface TerrainScheduleDto {
  id?: number;
  day_of_week: number;
  open_time?: string | null;
  close_time?: string | null;
  slot_duration_minutes?: number | null;
  is_active: boolean;
}

export interface TerrainFacility {
  id?: number;
  name?: string | null;
  icon?: string | null;
}

export interface OwnerTerrain {
  id: number;
  name?: string | null;
  slug?: string | null;
  city?: string | null;
  city_id?: number | null;
  address?: string | null;
  description?: string | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  capacity?: number | null;
  owner_id?: number | null;
  type?: TerrainType | null;
  player_format?: string | null;
  is_covered?: boolean;
  has_benches?: boolean;
  supports_tournaments?: boolean;
  has_lighting?: boolean;
  has_vestiaires?: boolean;
  price_per_team?: number | string | null;
  price_per_hour?: number | string | null;
  total_price?: number | string | null;
  is_available?: boolean;
  is_open?: boolean;
  closure_reason?: string | null;
  google_maps_url?: string | null;
  rating?: number | string | null;
  reviews_count?: number | null;
  cover_image?: string | null;
  cover_thumbnail_path?: string | null;
  cover_image_url?: string | null;
  cover_thumbnail_url?: string | null;
  images?: TerrainImageDto[];
  schedules?: TerrainScheduleDto[];
  facilities?: TerrainFacility[];
}

export interface OwnerTerrainsResponse {
  terrains: OwnerTerrain[];
}

export interface OwnerTerrainResponse {
  terrain: OwnerTerrain;
}

export interface ToggleStatusResponse {
  message: string;
  terrain: { id: number; name?: string; is_open: boolean; closure_reason?: string | null };
}

export interface WorkingHoursResponse {
  message: string;
  schedule: TerrainScheduleDto[];
}

export interface UploadImagesResponse {
  message: string;
  images: TerrainImageDto[];
}

export interface UpdateTerrainPayload {
  name?: string;
  address?: string | null;
  type?: TerrainType;
  player_format?: string;
  price_per_team?: number;
  has_benches?: boolean;
  has_lighting?: boolean;
  has_vestiaires?: boolean;
  supports_tournaments?: boolean;
  is_covered?: boolean;
}

function getOwnerTerrains(): Promise<OwnerTerrainsResponse> {
  return get<OwnerTerrainsResponse>('/owner/terrains');
}

function getOwnerTerrain(id: number | string): Promise<OwnerTerrainResponse> {
  return get<OwnerTerrainResponse>(`/owner/terrains/${id}`);
}

function updateTerrain(id: number | string, payload: UpdateTerrainPayload): Promise<OwnerTerrainResponse> {
  return put<OwnerTerrainResponse>(`/owner/terrains/${id}`, payload);
}

function toggleTerrainStatus(id: number | string, isOpen: boolean, closureReason?: string): Promise<ToggleStatusResponse> {
  return put<ToggleStatusResponse>(`/owner/terrains/${id}/toggle-status`, {
    is_open: isOpen,
    closure_reason: isOpen ? undefined : closureReason,
  });
}

function updateWorkingHours(id: number | string, schedule: TerrainScheduleDto[]): Promise<WorkingHoursResponse> {
  return put<WorkingHoursResponse>(`/owner/terrains/${id}/working-hours`, { schedule });
}

function uploadTerrainImages(id: number | string, uris: string[]): Promise<UploadImagesResponse> {
  const formData = new FormData();
  for (const uri of uris) {
    const filename = uri.split('/').pop() ?? `terrain-${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1] === 'jpg' ? 'jpeg' : match[1]}` : 'image/jpeg';
    formData.append('images[]', { uri, name: filename, type } as unknown as Blob);
  }
  return upload<UploadImagesResponse>(`/owner/terrains/${id}/images`, formData);
}

function setTerrainCover(id: number | string, imageId: number | string): Promise<OwnerTerrainResponse> {
  return put<OwnerTerrainResponse>(`/owner/terrains/${id}/cover`, { image_id: imageId });
}

export function useOwnerTerrains() {
  return useQuery({
    queryKey: q.ownerTerrains(),
    queryFn: getOwnerTerrains,
  });
}

export function useOwnerTerrain(id: number | string | undefined) {
  return useQuery({
    queryKey: q.ownerTerrainDetail(id),
    queryFn: () => getOwnerTerrain(id as number | string),
    enabled: id != null && id !== '',
  });
}

export function useUpdateTerrain() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: UpdateTerrainPayload }) =>
      updateTerrain(id, payload),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: q.ownerTerrains() });
      void queryClient.invalidateQueries({ queryKey: q.ownerTerrainDetail(id) });
    },
  });
}

export function useToggleTerrainStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isOpen, closureReason }: { id: number | string; isOpen: boolean; closureReason?: string }) =>
      toggleTerrainStatus(id, isOpen, closureReason),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: q.ownerTerrains() });
      void queryClient.invalidateQueries({ queryKey: q.ownerTerrainDetail(id) });
    },
  });
}

export function useUpdateWorkingHours() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, schedule }: { id: number | string; schedule: TerrainScheduleDto[] }) =>
      updateWorkingHours(id, schedule),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: q.ownerTerrains() });
      void queryClient.invalidateQueries({ queryKey: q.ownerTerrainDetail(id) });
    },
  });
}

export function useUploadTerrainImages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, uris }: { id: number | string; uris: string[] }) => uploadTerrainImages(id, uris),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: q.ownerTerrains() });
      void queryClient.invalidateQueries({ queryKey: q.ownerTerrainDetail(id) });
    },
  });
}

export function useSetTerrainCover() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, imageId }: { id: number | string; imageId: number | string }) => setTerrainCover(id, imageId),
    onSuccess: (_data, { id }) => {
      void queryClient.invalidateQueries({ queryKey: q.ownerTerrains() });
      void queryClient.invalidateQueries({ queryKey: q.ownerTerrainDetail(id) });
    },
  });
}
