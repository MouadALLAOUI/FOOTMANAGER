import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, type ListRenderItem } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Trophy } from 'lucide-react-native';
import {
  useManagerMatchRequests,
  type ManagerMatchRequest,
} from '@/api/managerMatches';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { List } from '@/components/ui/List';
import { Skeleton } from '@/components/ui/Skeleton';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';

type StatusTone = { label: string; bg: string; fg: string };

export default function MatchesListScreen(): React.JSX.Element {
  const { t, formatDate } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed'>('all');

  const { data, isLoading, isError, error, refetch } = useManagerMatchRequests();

  const all = useMemo(() => data?.match_requests ?? [], [data]);

  const items = useMemo(() => {
    switch (filter) {
      case 'upcoming':
        return all.filter((m) => !['completed', 'cancelled'].includes(m.status ?? ''));
      case 'completed':
        return all.filter((m) => ['completed', 'cancelled'].includes(m.status ?? ''));
      default:
        return all;
    }
  }, [all, filter]);

  const statusTone = useCallback(
    (status?: string | null): StatusTone => {
      switch (status) {
        case 'live':
          return { label: 'live', bg: colors.danger, fg: '#ffffff' };
        case 'accepted':
          return { label: 'accepted', bg: colors.primary, fg: colors.textOnPrimary };
        case 'open':
          return { label: 'open', bg: colors.amber, fg: '#ffffff' };
        case 'completed':
          return { label: 'completed', bg: colors.bgMuted, fg: colors.textMuted };
        case 'cancelled':
          return { label: 'cancelled', bg: colors.bgMuted, fg: colors.textMuted };
        default:
          return { label: status ?? 'unknown', bg: colors.bgMuted, fg: colors.textMuted };
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

  const renderItem: ListRenderItem<ManagerMatchRequest> = useCallback(
    ({ item }) => {
      const tone = statusTone(item.status);
      const opp = item.opponentTeam?.name;
      const home = item.hostTeam?.name;
      const venue = item.stadium?.name ?? item.custom_terrain_name;
      return (
        <Pressable
          onPress={() => router.push(`/(manager)/matches/${item.id}` as never)}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border },
            pressed && styles.cardPressed,
          ]}
          accessibilityRole="button"
        >
          <View style={styles.cardHeader}>
            <AppText variant="bodyBold" numberOfLines={2} style={styles.cardTitle}>
              {[home, opp].filter(Boolean).join(' vs ') || t('managerMatch.unknownMatch', 'مباراة')}
            </AppText>
            <View style={[styles.badge, { backgroundColor: tone.bg }]}>
              <AppText variant="captionBold" color={tone.fg}>
                {t(`managerMatch.status.${tone.label}`, tone.label)}
              </AppText>
            </View>
          </View>
          {venue ? (
            <AppText variant="caption" muted numberOfLines={1}>
              {venue}
            </AppText>
          ) : null}
          <View style={styles.metaRow}>
            {item.match_datetime ? (
              <AppText variant="small" subtle>
                {formatDate(item.match_datetime)}
              </AppText>
            ) : null}
            {item.player_format ? (
              <AppText variant="small" subtle>
                {item.player_format.toUpperCase()}
              </AppText>
            ) : null}
            {typeof item.players_joined_count === 'number' && item.needs_players ? (
              <AppText variant="small" subtle>
                {t('managerMatch.playersJoined', '{{count}} منضم').replace('{{count}}', String(item.players_joined_count))}
              </AppText>
            ) : null}
          </View>
        </Pressable>
      );
    },
    [router, t, statusTone, colors, formatDate],
  );

  if (isLoading) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('matches.title', 'المباريات')} />
        <View style={styles.content}>
          <Skeleton height={120} radiusValue={radius.lg} />
          <Skeleton height={120} radiusValue={radius.lg} />
          <Skeleton height={120} radiusValue={radius.lg} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('matches.title', 'المباريات')} />

      <View style={[styles.tabs, { backgroundColor: colors.bgMuted }]}>
        {(['all', 'upcoming', 'completed'] as const).map((f) => (
          <Pressable
            key={f}
            onPress={() => setFilter(f)}
            accessibilityRole="button"
            accessibilityState={{ selected: filter === f }}
            style={[styles.segment, filter === f ? { backgroundColor: colors.primary } : null]}
          >
            <AppText
              variant="captionBold"
              color={filter === f ? colors.textOnPrimary : colors.textMuted}
            >
              {t(`managerMatch.filter.${f}`, f)}
            </AppText>
          </Pressable>
        ))}
      </View>

      <List
        data={items}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        style={{ flex: 1 }}
        loading={false}
        error={isError ? error : null}
        onRetry={() => void refetch()}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        emptyIcon={<Trophy size={36} color={colors.textMuted} />}
        emptyTitle={t('managerMatch.emptyTitle', 'لا توجد مباريات')}
        emptyDescription={t('managerMatch.emptyDesc', 'أنشئ مباراة ودية لتبدأ.')}
        emptyActionLabel={t('managerMatch.createAction', 'إنشاء مباراة')}
        onEmptyAction={() => router.push('/(manager)/matches/create' as never)}
      />

      <View style={[styles.fabWrap, { borderTopColor: colors.border }]}>
        <Button
          title={t('managerMatch.createAction', 'إنشاء مباراة')}
          leftIcon={<Plus size={18} color={colors.textOnPrimary} />}
          onPress={() => router.push('/(manager)/matches/create' as never)}
          fullWidth
        />
      </View>
    </Screen>
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardTitle: { flex: 1 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  fabWrap: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});