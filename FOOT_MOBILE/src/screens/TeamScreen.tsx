import { useCallback, useState } from 'react';
import { FlatList, Image, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Inbox, Users } from 'lucide-react-native';

import { useMyTeam, type Teammate } from '@/api/team';
import { PlayerRosterItem } from '@/components/team/PlayerRosterItem';
import { TeamSkeleton } from '@/components/team/TeamSkeleton';
import { TeamStatsBar } from '@/components/team/TeamStatsBar';
import { AppText } from '@/components/ui/AppText';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';

export default function TeamScreen(): React.JSX.Element {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, error, refetch } = useMyTeam();

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  if (isLoading) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('team.title', 'الفريق')} />
        <TeamSkeleton />
      </Screen>
    );
  }

  if (isError || !data) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('team.title', 'الفريق')} />
        <ErrorState
          error={error}
          fallback={t('team.loadError', 'تعذر تحميل الفريق')}
          onRetry={() => void refetch()}
        />
      </Screen>
    );
  }

  const { membership, team, teammates } = data;

  if (!membership || !team) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('team.title', 'الفريق')} />
        <EmptyState
          icon={<Users size={40} color={colors.textMuted} />}
          title={t('team.noTeam.title', 'ليس لديك فريق حالياً')}
          description={t('team.noTeam.desc', 'عندما ينضم حساب لعضو في فريق، ستظهر تفاصيل الفريق هنا.')}
          actionLabel={t('team.openApplications', 'عرض طلبات الانضمام')}
          onAction={() => router.push('/(player)/applications' as never)}
        />
      </Screen>
    );
  }

  const captainId = team.captain_id;
  const viceCaptainId = team.vice_captain_id;

  const header = (
    <View style={styles.headerWrap}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={[styles.logo, { backgroundColor: colors.bgMuted }]}>
          {team.logo_thumbnail_url || team.logo_url ? (
            <Image source={{ uri: team.logo_thumbnail_url ?? team.logo_url ?? undefined }} style={styles.logoImage} resizeMode="cover" />
          ) : (
            <Users size={28} color={colors.textMuted} />
          )}
        </View>
        <View style={styles.headerText}>
          <AppText variant="h2">{team.name}</AppText>
          <AppText variant="caption" muted>
            {[team.city, team.category].filter(Boolean).join(' · ') || t('team.unknownMeta', '—')}
          </AppText>
        </View>
      </View>

      <TeamStatsBar teammates={teammates} memberCount={team.member_count} />

      <View style={styles.sectionTitle}>
        <AppText variant="bodyBold">{t('team.roster.title', 'التشكيلة')}</AppText>
        <AppText variant="caption" muted>
          {t('team.roster.count', '{{count}} لاعب')?.replace('{{count}}', String(teammates.length))}
        </AppText>
      </View>
    </View>
  );

  const footer = (
    <View style={styles.footer}>
      <View
        style={[styles.applicationsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      >
        <Inbox size={20} color={colors.primary} />
        <AppText variant="bodyBold" style={styles.applicationsTitle}>
          {t('team.applications.title', 'طلبات الانضمام')}
        </AppText>
        <AppText variant="caption" muted>
          {t('team.applications.desc', 'تابع عروض الانضمام والدعوات لمبارياتك.')}
        </AppText>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Teammate }) => (
    <PlayerRosterItem
      teammate={item}
      isCaptain={item.id === captainId}
      isViceCaptain={item.id === viceCaptainId}
      captainName={t('team.captain', 'قائد')}
    />
  );

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('team.title', 'الفريق')} />
      <FlatList
        data={teammates}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void handleRefresh()} tintColor={colors.primary} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Users size={40} color={colors.textMuted} />}
            title={t('team.roster.empty', 'لا يوجد أعضاء')}
            description={t('team.roster.emptyDesc', 'لا يوجد لاعبون نشطون في الفريق حالياً.')}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: { gap: spacing.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoImage: { width: '100%', height: '100%' },
  headerText: { flex: 1, gap: 4 },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  content: { padding: spacing.lg, paddingBottom: spacing['3xl'], gap: spacing.md },
  separator: { height: spacing.sm },
  footer: { marginTop: spacing.lg },
  applicationsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  applicationsTitle: { flex: 1 },
});
