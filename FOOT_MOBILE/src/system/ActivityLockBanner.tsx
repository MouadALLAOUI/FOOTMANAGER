import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/useAuth';
import { useTheme } from '@/theme/ThemeProvider';

export function ActivityLockBanner(): React.JSX.Element | null {
  const { isActivityLocked, user } = useAuth();
  const { colors } = useTheme();

  if (!isActivityLocked) return null;

  const reason = user?.activity_lock_reason;

  return (
    <View style={[styles.banner, { backgroundColor: colors.amber }]} accessibilityRole="alert">
      <Text style={[styles.text, { color: '#0f172a' }]}>تم تقييد نشاط حسابك</Text>
      {reason ? <Text style={[styles.reason, { color: '#0f172a' }]}>{reason}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { paddingVertical: 8, paddingHorizontal: 16, alignItems: 'center', gap: 2 },
  text: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
  reason: { fontSize: 11, textAlign: 'center', opacity: 0.9 },
});
