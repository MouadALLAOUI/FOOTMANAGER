import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, type ListRenderItem } from 'react-native';
import { useRouter } from 'expo-router';
import { Calendar, History } from 'lucide-react-native';

import {
  usePlayerBookings,
  type PlayerBooking,
  type PlayerBookingScope,
} from '@/api/bookings';
import { AppText } from '@/components/ui/AppText';
import { List } from '@/components/ui/List';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';

type StatusTone = { label: string; bg: string; fg: string };

export default function PlayerBookingsListScreen(): React.JSX.Element {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const [scope, setScope] = useState<PlayerBookingScope>('upcoming');
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, error, refetch } = usePlayerBookings(scope);

  const items = useMemo(() => data?.data ?? [], [data]);

  const statusTone = useCallback(
    (status: string): StatusTone => {
      switch (status) {
        case 'confirmed':
        case 'approved':
          return { label: status, bg: colors.primary, fg: colors.textOnPrimary };
        case 'pending':
          return { label: status, bg: colors.amber, fg: '#ffffff' };
        case 'cancelled':
        case 'completed':
          return { label: status, bg: colors.bgMuted, fg: colors.textMuted };
        default:
          return { label: status, bg: colors.bgMuted, fg: colors.textMuted };
      }
    },
    [colors],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const renderItem: ListRenderItem<PlayerBooking> = useCallback(
    ({ item }) => {
      const tone = statusTone(item.status ?? '');
      return (
        <Pressable
          onPress={() => router.push(`/(player)/bookings/${item.id}` as never)}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && styles.cardPressed,
          ]}
          accessibilityRole="button"
        >
          <View style={styles.cardHeader}>
            <AppText variant="bodyBold" numberOfLines={2} style={styles.teamName}>
              {item.team?.name ?? item.stadium?.name ?? t('player.bookings.unknownBooking', 'حجز')}
            </AppText>
            <View style={[styles.badge, { backgroundColor: tone.bg }]}>
              <AppText variant="captionBold" color={tone.fg}>
                {t(`player.bookings.status.${tone.label}`, tone.label)}
              </AppText>
            </View>
          </View>
          <AppText variant="caption" muted numberOfLines={1}>
            {item.stadium?.name ??
              [item.stadium?.city, item.stadium?.address].filter(Boolean).join(' - ')}
          </AppText>
          <View style={styles.metaRow}>
            <AppText variant="small" subtle>
              {item.booking_date || ''}
            </AppText>
            {item.start_time ? (
              <AppText variant="small" subtle>
                {t('player.bookings.at', 'الساعة')} {item.start_time}
              </AppText>
            ) : null}
            {typeof item.total === 'number' ? (
              <AppText variant="captionBold" style={styles.price}>
                {t('player.bookings.price', 'السعر')}: {item.total}
              </AppText>
            ) : null}
          </View>
        </Pressable>
      );
    },
    [router, t, statusTone, colors],
  );

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('bookings.title', 'الحجوزات')} />

      <View style={[styles.tabs, { backgroundColor: colors.bgMuted }]}>
        <Pressable
          onPress={() => setScope('upcoming')}
          accessibilityRole="button"
          accessibilityState={{ selected: scope === 'upcoming' }}
          style={[styles.segment, scope === 'upcoming' ? { backgroundColor: colors.primary } : null]}
        >
          <Calendar size={16} color={scope === 'upcoming' ? colors.textOnPrimary : colors.textMuted} />
          <AppText variant="captionBold" color={scope === 'upcoming' ? colors.textOnPrimary : colors.textMuted}>
            {t('player.bookings.upcomingTab', 'القادمة')}
          </AppText>
        </Pressable>
        <Pressable
          onPress={() => setScope('history')}
          accessibilityRole="button"
          accessibilityState={{ selected: scope === 'history' }}
          style={[styles.segment, scope === 'history' ? { backgroundColor: colors.primary } : null]}
        >
          <History size={16} color={scope === 'history' ? colors.textOnPrimary : colors.textMuted} />
          <AppText variant="captionBold" color={scope === 'history' ? colors.textOnPrimary : colors.textMuted}>
            {t('player.bookings.historyTab', 'السجل')}
          </AppText>
        </Pressable>
      </View>

      <List
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        style={{ flex: 1 }}
        loading={isLoading}
        error={isError ? error : null}
        onRetry={() => void refetch()}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        emptyIcon={<Calendar size={36} color={colors.textMuted} />}
        emptyTitle={
          scope === 'upcoming'
            ? t('player.bookings.upcomingEmptyTitle', 'لا توجد حجوزات قادمة')
            : t('player.bookings.historyEmptyTitle', 'لا توجد حجوزات سابقة')
        }
        emptyDescription={
          scope === 'upcoming'
            ? t('player.bookings.upcomingEmptyDesc', 'حجوزات فريقك القادمة ستظهر هنا.')
            : t('player.bookings.historyEmptyDesc', 'سجل حجوزات فريقك سابقاً سيظهر هنا.')
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing['3xl'] },
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  teamName: { flex: 1 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  price: { marginStart: 'auto' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
});
