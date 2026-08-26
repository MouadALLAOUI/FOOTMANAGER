/**
 * Re-export centralized auth hook.
 *
 * The full implementation lives in AuthProvider.tsx.
 * This file exists so existing imports from '@/auth/useAuth' keep working.
 */
export { useAuth, type AuthUser } from './AuthProvider';
