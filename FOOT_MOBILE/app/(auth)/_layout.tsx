import { Stack } from 'expo-router';

export default function Layout(): React.JSX.Element {
  return <Stack screenOptions={{ headerShown: false }} />;
}

