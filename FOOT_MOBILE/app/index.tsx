import { Redirect } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { homeForRole } from '@/auth/homeForRole';

export default function Index(): React.JSX.Element {
  const { sessionState, role } = useAuth();

  if (sessionState === 'restoring' || sessionState === 'pending' || sessionState === 'blocked' || sessionState === 'rejected') {
    return <Redirect href="/(auth)" />;
  }

  if (sessionState === 'unauthenticated') {
    return <Redirect href="/(auth)" />;
  }

  return <Redirect href={homeForRole(role)} />;
}
