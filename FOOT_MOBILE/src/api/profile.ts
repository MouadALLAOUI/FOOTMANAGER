import { del, put, upload } from '@/api/client';
import type { AuthUser } from '@/auth/AuthProvider';

export interface UpdateProfilePayload {
  name?: string;
  email?: string | null;
  phone?: string;
  is_whatsapp?: boolean;
  password?: string;
  password_confirmation?: string;
  current_password?: string;
}

export interface ProfileResponse {
  message: string;
  user: AuthUser;
}

export function updateProfile(payload: UpdateProfilePayload): Promise<ProfileResponse> {
  return put<ProfileResponse>('/me', payload);
}

export function uploadAvatar(file: { uri: string; name: string; type: string }): Promise<ProfileResponse> {
  const formData = new FormData();
  // React Native FormData file shape
  formData.append('avatar', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);
  return upload<ProfileResponse>('/me/avatar', formData);
}

export function removeAvatar(): Promise<ProfileResponse> {
  return del<ProfileResponse>('/me/avatar');
}
