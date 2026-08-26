export type AppEnv = 'development' | 'preview' | 'production';

export type Role =
  | 'public'
  | 'player'
  | 'manager'
  | 'terrain_owner'
  | 'committee'
  | 'admin'
  | 'sub_admin';

export type SupportedLocale = 'ar' | 'en' | 'fr';

export interface ApiEnvelope<T> {
  data: T;
  message?: string;
}

export interface PaginatedEnvelope<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}
