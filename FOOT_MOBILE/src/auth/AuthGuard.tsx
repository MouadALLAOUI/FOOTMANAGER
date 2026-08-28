import { useEffect } from 'react';
import { type Href, useRouter, useSegments } from 'expo-router';

import { useAuth, type SessionState } from '@/auth/AuthProvider';
import { homeForRole } from '@/auth/homeForRole';
import type { Role } from '@/auth/roles';

const ACCOUNT_STATE_ROUTES: Partial<Record<SessionState, Href>> = {
  pending: '/(auth)/account-pending',
  blocked: '/(auth)/account-blocked',
  rejected: '/(auth)/account-rejected',
};

const ALLOWED_GROUPS: Record<string, string[]> = {
  manager: ['(manager)'],
  terrain_owner: ['(terrain)'],
  player: ['(player)'],
  committee: ['(committee)'],
  admin: ['(admin)'],
  sub_admin: ['(admin)'],
};

function resolveGroup(segments: string[]): string | null {
  for (const seg of segments) {
    if (seg.startsWith('(') && seg.endsWith(')')) {
      return seg;
    }
  }
  return null;
}

export function AuthGuard({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { sessionState, role } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const route = ACCOUNT_STATE_ROUTES[sessionState];
    if (route) {
      router.replace(route);
      return;
    }
    if (sessionState !== 'authenticated' || !role) return;

    const group = resolveGroup(segments);

    if (group === '(auth)' || group === '(public)' || !group) {
      if ((group === '(auth)' || group === '(public)') && sessionState === 'authenticated' && role) {
        router.replace(homeForRole(role as Role));
      }
      return;
    }

    const allowed = ALLOWED_GROUPS[role as Role] ?? [];
    if (allowed.length > 0 && !allowed.includes(group)) {
      router.replace(homeForRole(role as Role));
    }
  }, [sessionState, role, segments, router]);

  return <>{children}</>;
}
