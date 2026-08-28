import { StyleSheet, View } from 'react-native';

import { Skeleton } from '@/components/ui/Skeleton';
import { spacing } from '@/theme/spacing';

export function TeamSkeleton(): React.JSX.Element {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Skeleton width={72} height={72} />
        <View style={styles.headerText}>
          <Skeleton width="70%" height={20} />
          <Skeleton width="45%" height={14} style={styles.headerSub} />
        </View>
      </View>
      <View style={styles.statsRow}>
        <Skeleton height={60} radiusValue={16} />
      </View>
      <Skeleton width="40%" height={16} style={styles.sectionTitle} />
      {[0, 1, 2, 3].map((i) => (
        <View key={i} style={styles.row}>
          <Skeleton width={40} height={40} />
          <View style={styles.rowText}>
            <Skeleton width="60%" height={14} />
            <Skeleton width="35%" height={12} style={styles.rowSub} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: spacing.lg, gap: spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  headerText: { flex: 1, gap: spacing.sm },
  headerSub: { marginTop: spacing.xs },
  statsRow: { marginTop: spacing.sm },
  sectionTitle: { marginTop: spacing.xs },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowText: { flex: 1, gap: spacing.xs },
  rowSub: { marginTop: spacing.xs },
});
