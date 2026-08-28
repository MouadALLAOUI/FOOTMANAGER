import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { spacing } from '@/theme/spacing';

export function ApplicationsSkeleton(): React.JSX.Element {
  return (
    <View style={styles.container}>
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={styles.card}>
          <View style={styles.header}>
            <Skeleton width={36} height={36} />
            <View style={styles.headerText}>
              <Skeleton width="55%" height={14} />
              <Skeleton width="35%" height={12} style={styles.sub} />
            </View>
            <Skeleton width={64} height={22} />
          </View>
          <Skeleton width="80%" height={12} />
          <Skeleton width="50%" height={12} style={styles.sub} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.md },
  card: {
    padding: spacing.lg,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
    gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  headerText: { flex: 1, gap: spacing.xs },
  sub: { marginTop: spacing.xs },
});
