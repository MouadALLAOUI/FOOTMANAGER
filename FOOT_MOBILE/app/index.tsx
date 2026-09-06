import { Redirect } from 'expo-router';

import { useAuth } from '@/auth/AuthProvider';
import { homeForRole } from '@/auth/homeForRole';

export default function Index(): React.JSX.Element | null {
  const { sessionState, role, isLoading } = useAuth();

  // While checking SecureStore credentials, do not redirect anywhere
  if (isLoading || sessionState === 'restoring') {
    return null;
  }

  if (sessionState === 'pending') {
    return <Redirect href="/(auth)/account-pending" />;
  }
  if (sessionState === 'blocked') {
    return <Redirect href="/(auth)/account-blocked" />;
  }
  if (sessionState === 'rejected') {
    return <Redirect href="/(auth)/account-rejected" />;
  }

  // If authenticated with a valid role, take to role dashboard
  if (sessionState === 'authenticated' && role) {
    return <Redirect href={homeForRole(role)} />;
  }

  // Default for unauthenticated guests: ALWAYS go to Landing page
  return <Redirect href="/(public)" />;
}
