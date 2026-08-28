import { Redirect } from 'expo-router';

export function DevOnlyGate({ children }: { children: React.ReactNode }): React.JSX.Element {
  if (!__DEV__) return <Redirect href="/" />;
  return <>{children}</>;
}
