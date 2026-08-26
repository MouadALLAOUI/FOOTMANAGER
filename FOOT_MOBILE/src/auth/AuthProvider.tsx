import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { get, post } from '@/api/client';
import { getUserMessage, isApiError } from '@/api/errors';
import { queryClient } from '@/api/query-client';
import { type CanFn, createCan, type ActivityLockInfo, getActivityLockInfo } from '@/auth/permissions';
import { type Role, isAdmin as checkAdmin, hasAdminAccess as checkAdminAccess } from '@/auth/roles';
import { persistentStorage } from '@/services/storage/persistent-storage';
import { secureStorage } from '@/services/storage/secure-storage';

// ─── Public types ────────────────────────────────────────────

export interface AuthUser {
  id: number;
  name: string;
  role: string;
  status: string;
  isAdmin: boolean;
  is_whatsapp?: boolean;
  avatar_url?: string | null;
  avatar_thumbnail_url?: string | null;
  activity_locked?: boolean;
  activity_lock_reason?: string | null;
  activity_locked_at?: string | null;
  phone?: string;
  email?: string;
  permissions?: string[];
  team?: Record<string, unknown> | null;
  terrains?: Record<string, unknown>[] | null;
  player_profile?: Record<string, unknown> | null;
}

export type RegisterRole = 'manager' | 'player' | 'terrain_owner' | 'committee';

export interface RegisterData {
  name: string;
  phone: string;
  password: string;
  email?: string;
  is_whatsapp?: boolean;
  role: RegisterRole;
  team_name?: string;
  member_count?: number;
  team_category?: 'adult' | 'teenager' | 'children';
  association_name?: string;
  position?: string;
  skill_level?: string;
  birth_year?: number;
  city?: string;
}

export interface RegisterResult {
  message: string;
  user?: {
    id: number;
    name: string;
    role: string;
    status: string;
  };
}

export type SessionState =
  | 'restoring'
  | 'authenticated'
  | 'pending'
  | 'blocked'
  | 'rejected'
  | 'unauthenticated';

export interface AuthContextValue {
  user: AuthUser | null;
  sessionState: SessionState;
  isAuthenticated: boolean;
  isLoading: boolean;
  isActivityLocked: boolean;
  isAdmin: boolean;
  hasAdminAccess: boolean;
  can: CanFn;
  role: Role | null;
  activityLock: ActivityLockInfo;
  login: (login: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<RegisterResult>;
  refreshUser: () => Promise<void>;
  updateCachedUser: (updated: AuthUser) => void;
  getLoginErrorMessage: (error: unknown) => string;
}

const CACHED_USER_KEY = 'auth.cachedUser';

// ─── Context ─────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      return persistentStorage.getJson<AuthUser>(CACHED_USER_KEY);
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(true);

  // ── Session restoration on mount ──
  useEffect(() => {
    let cancelled = false;

    async function restore(): Promise<void> {
      try {
        const token = await secureStorage.getTokenAsync();
        if (!token || cancelled) {
          if (!cancelled) setIsLoading(false);
          return;
        }

        const data = await get<{ user: AuthUser }>('/me');
        if (cancelled) return;

        setUser(data.user);
        persistentStorage.setJson(CACHED_USER_KEY, data.user);
      } catch {
        if (cancelled) return;
        // Token invalid / expired — clear everything
        await secureStorage.deleteTokenAsync().catch(() => {});
        persistentStorage.remove(CACHED_USER_KEY);
        setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void restore();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Login ──
  const login = useCallback(async (loginField: string, password: string): Promise<void> => {
    const res = await post<{ user: AuthUser; token: string }>(
      '/login',
      { login: loginField, password },
      { auth: false },
    );

    await secureStorage.setTokenAsync(res.token);
    persistentStorage.setJson(CACHED_USER_KEY, res.user);
    setUser(res.user);
  }, []);

  // ── Logout ──
  const logout = useCallback(async (): Promise<void> => {
    // Best-effort server-side logout
    try {
      await post('/logout');
    } catch {
      // Offline or token already invalid — proceed with client cleanup
    }

    await secureStorage.deleteTokenAsync().catch(() => {});
    persistentStorage.remove(CACHED_USER_KEY);
    setUser(null);

    // Clear all authenticated React Query cache
    queryClient.clear();

    // Navigate to auth screen
    try {
      const { router } = await import('expo-router');
      router.replace('/(auth)');
    } catch {
      // Navigation may fail in test environments
    }
  }, []);

  // ── Register ──
  const register = useCallback(async (data: RegisterData): Promise<RegisterResult> => {
    const endpoint =
      data.role === 'player'
        ? '/register-player'
        : data.role === 'terrain_owner'
          ? '/register-terrain-owner'
          : data.role === 'committee'
            ? '/register-committee'
            : '/register';

    const payload: Record<string, unknown> = {
      name: data.name,
      phone: data.phone,
      password: data.password,
      password_confirmation: data.password,
    };

    if (data.email) payload.email = data.email;
    if (data.is_whatsapp !== undefined) payload.is_whatsapp = data.is_whatsapp;

    if (data.role === 'manager') {
      payload.team_name = data.team_name;
      payload.member_count = data.member_count;
      payload.team_category = data.team_category;
      if (data.association_name) payload.association_name = data.association_name;
    }

    if (data.role === 'player') {
      if (data.position) payload.position = data.position;
      if (data.skill_level) payload.skill_level = data.skill_level;
      if (data.birth_year) payload.birth_year = data.birth_year;
      if (data.city) payload.city = data.city;
    }

    const res = await post<{ message: string; user?: RegisterResult['user'] }>(
      endpoint,
      payload,
      { auth: false },
    );

    return { message: res.message, user: res.user };
  }, []);

  // ── Refresh user from server ──
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      const data = await get<{ user: AuthUser }>('/me');
      setUser(data.user);
      persistentStorage.setJson(CACHED_USER_KEY, data.user);
    } catch {
      // Token may have been revoked server-side
      await secureStorage.deleteTokenAsync().catch(() => {});
      persistentStorage.remove(CACHED_USER_KEY);
      setUser(null);
    }
  }, []);

  const updateCachedUser = useCallback((updated: AuthUser) => {
    setUser(updated);
    persistentStorage.setJson(CACHED_USER_KEY, updated);
  }, []);

  // ── Human-readable login error messages ──
  const getLoginErrorMessage = useCallback((error: unknown): string => {
    if (isApiError(error)) {
      if (error.kind === 'network' || error.kind === 'timeout') {
        return 'لا يوجد اتصال بالإنترنت';
      }
      if (error.status === 401) {
        return 'بيانات الدخول غير صحيحة';
      }
      if (error.status === 403) {
        const data = error.data as { status?: string; message?: string } | null;
        if (data?.status === 'pending') return 'حسابك قيد المراجعة من قبل الإدارة';
        if (data?.status === 'rejected') return 'تم رفض طلب الانضمام الخاص بك';
        if (data?.status === 'blocked') return 'تم حظر حسابك من قبل الإدارة';
        if (data?.message) return data.message;
        return 'تم رفض الوصول';
      }
    }
    return getUserMessage(error, 'حدث خطأ غير متوقع');
  }, []);

  // ── Derived state ──
  const isAuthenticated = !!user;
  const isActivityLocked = !!user?.activity_locked;
  const userRole = (user?.role as Role) ?? null;
  const isAdminUser = checkAdmin(userRole ?? ('' as Role));
  const hasAdminAccessUser = userRole ? checkAdminAccess(userRole) : false;

  const sessionState: SessionState = isLoading
    ? 'restoring'
    : !user
      ? 'unauthenticated'
      : user.status === 'blocked'
        ? 'blocked'
        : user.status === 'rejected'
          ? 'rejected'
          : user.status === 'pending'
            ? 'pending'
            : 'authenticated';

  const can = useMemo(() => createCan(user), [user]);
  const activityLock = useMemo(() => getActivityLockInfo(user), [user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      sessionState,
      isAuthenticated,
      isLoading,
      isActivityLocked,
      isAdmin: isAdminUser,
      hasAdminAccess: hasAdminAccessUser,
      can,
      role: userRole,
      activityLock,
      login,
      logout,
      register,
      refreshUser,
      updateCachedUser,
      getLoginErrorMessage,
    }),
    [user, sessionState, isAuthenticated, isLoading, isActivityLocked, isAdminUser, hasAdminAccessUser, can, userRole, activityLock, login, logout, register, refreshUser, updateCachedUser, getLoginErrorMessage],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
