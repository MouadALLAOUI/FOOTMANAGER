import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { darkColors } from '@/theme/colors';

export default function NotFound(): React.JSX.Element {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>404</Text>
        <Text style={styles.subtitle}>Page not found</Text>
        <Link href="/(public)" style={styles.link}>
          Back to home
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkColors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  title: { color: darkColors.text, fontSize: 32, fontWeight: '800' },
  subtitle: { color: darkColors.textMuted, fontSize: 15 },
  link: {
    marginTop: 12,
    color: darkColors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
});
