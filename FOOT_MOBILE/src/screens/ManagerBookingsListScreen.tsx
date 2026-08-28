import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { CalendarDays, Clock, MapPin } from 'lucide-react-native';

import {
  useManagerBookings,
  type ManagerBooking,
  type ManagerBookingFilter,
} from '@/api/managerBookings';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { List } from '@/components/ui/List';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';

const FILTERS: ManagerBookingFilter[] = ['upcoming', 'past', 'cancelled', 'all'];

function statusVariant(status?: string | null): 'info' | 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'approved':
      return 'success';
    case 'pending':
      return 'warning';
    case 'completed':
      return 'info';
    case 'cancelled':
    case 'rejected':
      return 'danger';
    default:
      return 'neutral';
  }
}

export default function ManagerBookingsListScreen(): React.JSX.Element {
  const { t, formatDate } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<ManagerBookingFilter>('upcoming');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, error, refetch } = useManagerBookings(filter);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: ManagerBooking }) => {
      const venue = item.terrain?.name;
      return (
        <Pressable
          onPress={() => router.push(`/(manager)/bookings/${item.id}` as never)}
          accessibilityRole="button"
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && styles.cardPressed,
          ]}
        >
          <View style={styles.cardHeader}>
            <AppText variant="bodyBold" numberOfLines={1} style={styles.flex}>
              {venue || t('managerBookings.unknownVenue', 'ملعب')}
            </AppText>
            <Badge label={t(`managerBookings.status.${item.status ?? 'unknown'}`, item.status ?? '')} variant={statusVariant(item.status)} />
          </View>

          <View style={styles.metaRow}>
            {item.booking_date ? (
              <MetaItem icon={<CalendarDays size={14} color={colors.textMuted} />} text={formatDate(item.booking_date)} />
            ) : item.next_date ? (
              <MetaItem icon={<CalendarDays size={14} color={colors.textMuted} />} text={formatDate(item.next_date)} />
            ) : null}
            {item.start_time ? (
              <MetaItem icon={<Clock size={14} color={colors.textMuted} />} text={`${item.start_time}${item.end_time ? `—${item.end_time}` : ''}`} />
            ) : null}
            {item.terrain?.city ? (
              <MetaItem icon={<MapPin size={14} color={colors.textMuted} />} text={item.terrain.city} />
            ) : null}
          </View>

          {item.team?.name ? (
            <AppText variant="caption" muted>
              {t('managerBookings.team', 'الفريق: {{name}}').replace('{{name}}', item.team.name)}
            </AppText>
          ) : null}
        </Pressable>
      );
    },
    [router, t, colors, formatDate],
  );

  if (isLoading) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('bookings.title', 'الحجوزات')} />
        <View style={styles.content}>
          <Skeleton height={110} radiusValue={radius.lg} />
          <Skeleton height={110} radiusValue={radius.lg} />
          <Skeleton height={110} radiusValue={radius.lg} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('bookings.title', 'الحجوزات')} />

      <View style={[styles.tabs, { backgroundColor: colors.bgMuted }]}>
        {FILTERS.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f }}
            style={[styles.segment, filter === f ? { backgroundColor: colors.primary } : null]}
          >
            <AppText variant="captionBold" color={filter === f ? colors.textOnPrimary : colors.textMuted}>
              {t(`managerBookings.filter.${f}`, f)}
            </AppText>
          </Pressable>
        ))}
      </View>

      <List
        data={data?.bookings ?? []}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        style={{ flex: 1 }}
        loading={false}
        error={isError ? error : null}
        onRetry={() => void refetch()}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        emptyTitle={t('managerBookings.emptyTitle', 'لا توجد حجوزات')}
        emptyDescription={t('managerBookings.emptyDesc', 'لا توجد حجوزات في هذه الفئة.')}
      />
    </Screen>
  );
}

function MetaItem({ icon, text }: { icon: React.ReactNode; text: string }): React.JSX.Element {
  return (
    <View style={styles.metaItem}>
      {icon}
      <AppText variant="small" subtle>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing['3xl'], gap: spacing.md },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  cardPressed: { opacity: 0.92 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  flex: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
