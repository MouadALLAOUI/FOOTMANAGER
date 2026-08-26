import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';

export function SessionRestoreGate({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { isLoading } = useAuth();
  const { colors } = useTheme();

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bg }]}>
        <View style={[styles.logoCircle, { backgroundColor: colors.primary + '18' }]}>
          <Text style={[styles.logoText, { color: colors.primary }]}>⚽</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>FootMANAGER</Text>
        <ActivityIndicator size="large" color={colors.primary} style={styles.spinner} />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.lg,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontSize: 40 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: 0.5 },
  spinner: { marginTop: spacing.md },
});
