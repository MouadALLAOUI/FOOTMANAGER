import { useCallback, useState } from 'react';
import { StyleSheet, View, type ListRenderItem } from 'react-native';
import { useRouter } from 'expo-router';
import { Swords } from 'lucide-react-native';

import { useMatchFeed, type FeedMatch } from '@/api/matches';
import { MatchCard } from '@/components/matches/MatchCard';
import { List } from '@/components/ui/List';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';

export default function PlayerMatchesScreen(): React.JSX.Element {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMatchFeed();

  const matches = data?.pages.flatMap((page) => page.matches) ?? [];
  const initialLoading = isLoading && matches.length === 0;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const renderItem: ListRenderItem<FeedMatch> = useCallback(
    ({ item }) => (
      <View style={styles.item}>
        <MatchCard
          match={item}
          onPress={() => router.push(`/(player)/matches/${item.id}` as never)}
        />
      </View>
    ),
    [router],
  );

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('matches.title', 'المباريات')} />
      <List
        data={matches}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.content}
        style={{ flex: 1 }}
        loading={initialLoading || (isFetchingNextPage && matches.length > 0)}
        error={isError ? error : null}
        onRetry={() => void refetch()}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
        }}
        onEndReachedThreshold={0.4}
        emptyIcon={<Swords size={36} color={colors.textMuted} />}
        emptyTitle={t('matches.emptyTitle', 'لا توجد مباريات متاحة')}
        emptyDescription={t('matches.emptyDesc', 'حالياً لا توجد مباريات مفتوحة للانضمام. حاول مرة أخرى لاحقاً.')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { marginHorizontal: spacing.md },
  separator: { height: spacing.md },
  content: { paddingVertical: spacing.md, paddingBottom: spacing['3xl'] },
});
