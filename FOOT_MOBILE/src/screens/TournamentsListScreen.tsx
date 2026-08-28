import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight, MapPin, Users } from 'lucide-react-native';

import { type TournamentStatus, useCommitteeTournaments } from '@/api/committeeTournaments';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { List } from '@/components/ui/List';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import {
  tournamentStatusLabel,
  tournamentStatusVariant,
} from '@/components/tournament/TournamentStatusBadge';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';

type FilterKey = 'all' | TournamentStatus;

const FILTERS: FilterKey[] = [
  'all',
  'open_for_registration',
  'registration_closed',
  'in_progress',
  'completed',
  'draft',
];

export default function TournamentsListScreen(): React.JSX.Element {
  const { t, formatDate } = useI18n();
  const { colors, isRTL } = useTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<FilterKey>('all');

  const query = useCommitteeTournaments(filter === 'all' ? undefined : filter);
  const tournaments = query.data?.data ?? [];

  const Chevron = isRTL ? ChevronRight : ChevronLeft;

  const filterLabel = (key: FilterKey): string =>
    key === 'all'
      ? t('tournaments.filter.all', 'All')
      : tournamentStatusLabel(t, key);

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('tournaments.title', 'Tournaments')} />

      <View style={styles.filterRow}>
        <View style={[styles.filterScroll, { borderColor: colors.border }]}>
          {FILTERS.map((key) => {
            const active = key === filter;
            return (
              <Pressable
                key={key}
                onPress={() => setFilter(key)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: active ? colors.primary : colors.bgMuted,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <AppText variant="captionBold" style={{ color: active ? colors.textOnPrimary : colors.text }}>
                  {filterLabel(key)}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <List
        data={tournaments}
        keyExtractor={(item) => String(item.id)}
        loading={query.isLoading}
        error={query.error}
        errorTitle={t('tournaments.loadFailedTitle', 'Could not load tournaments')}
        errorFallback={t('tournaments.loadFailed', 'Could not load tournaments')}
        onRetry={() => void query.refetch()}
        onRefresh={() => void query.refetch()}
        refreshing={query.isRefetching}
        emptyIcon="🏆"
        emptyTitle={t('tournaments.emptyTitle', 'No tournaments')}
        emptyDescription={t('tournaments.empty', 'No tournaments are available right now.')}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
        renderItem={({ item }) => {
          const dateLabel = item.start_date
            ? formatDate(item.start_date, { day: 'numeric', month: 'short', year: 'numeric' })
            : '';
          return (
            <Card
              elevated
              onPress={() =>
                router.push({ pathname: '/(committee)/tournaments/[id]', params: { id: String(item.id) } })
              }
              imageUri={item.cover_url ?? item.logo_url ?? undefined}
              title={item.name}
              subtitle={item.description ?? undefined}
              metadata={dateLabel || undefined}
              statusLabel={tournamentStatusLabel(t, item.status)}
              statusVariant={tournamentStatusVariant(item.status)}
              leading={
                <View style={styles.leadingIcon}>
                  <Users size={20} color={colors.primary} />
                </View>
              }
            >
              <View style={styles.metaRow}>
                {item.remaining_teams != null ? (
                  <View style={styles.metaItem}>
                    <Users size={14} color={colors.textSubtle} />
                    <AppText variant="caption" muted>
                      {t('tournaments.remaining', '{count} spots left').replace('{count}', String(item.remaining_teams))}
                    </AppText>
                  </View>
                ) : null}
                {item.location ? (
                  <View style={styles.metaItem}>
                    <MapPin size={14} color={colors.textSubtle} />
                    <AppText variant="caption" muted numberOfLines={1} style={styles.metaText}>
                      {item.location}
                    </AppText>
                  </View>
                ) : null}
                <View style={styles.chevron}>
                  <Chevron size={18} color={colors.textSubtle} />
                </View>
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  filterScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    borderRadius: radius.lg,
    padding: spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  listContent: { padding: spacing.lg, paddingBottom: spacing['4xl'] },
  leadingIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#16a34a1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { maxWidth: 160 },
  chevron: { flex: 1, alignItems: 'flex-end', justifyContent: 'center' },
});
