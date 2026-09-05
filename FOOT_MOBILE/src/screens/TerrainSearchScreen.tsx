import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { MapPin } from 'lucide-react-native';

import { useTerrainCatalog } from '@/api/managerBookings';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { List } from '@/components/ui/List';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radius, spacing } from '@/theme/spacing';

export default function TerrainSearchScreen(): React.JSX.Element {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const [query, setQuery] = useState('');

  const catalog = useTerrainCatalog();
  const stadiums = catalog.data?.stadiums ?? [];

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stadiums;
    return stadiums.filter(
      (s) => s.name?.toLowerCase().includes(q) || s.city?.toLowerCase().includes(q),
    );
  }, [stadiums, query]);

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('terrain.book')} subtitle={t('terrain.bookSubtitle')} />

      <View style={styles.searchWrap}>
        <Input
          value={query}
          onChangeText={setQuery}
          placeholder={t('terrain.searchPlaceholder')}
          autoCorrect={false}
        />
      </View>

      <List
        data={filtered}
        loading={catalog.isLoading}
        error={catalog.isError ? catalog.error : null}
        onRetry={() => void catalog.refetch()}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: colors.surface, borderColor: colors.border },
              pressed && styles.cardPressed,
            ]}
            onPress={() => router.push(`/(manager)/terrain/${item.id}` as never)}
            accessibilityRole="button"
            accessibilityLabel={item.name ?? undefined}
          >
            <View style={styles.cardTop}>
              <AppText variant="bodyBold" numberOfLines={1} style={styles.flex}>
                {item.name}
              </AppText>
              {item.player_format ? <Badge label={item.player_format} variant="info" /> : null}
            </View>
            {item.city ? (
              <View style={styles.metaRow}>
                <MapPin size={13} color={colors.textMuted} />
                <AppText variant="caption" muted style={styles.flex}>
                  {item.city}
                </AppText>
              </View>
            ) : null}
            {item.price_per_hour != null || item.price_per_team != null ? (
              <AppText variant="bodyBold" color={colors.primary}>
                {item.price_per_hour ?? item.price_per_team} {t('terrain.mad')} ·{' '}
                {t('terrain.priceHour')}
              </AppText>
            ) : null}
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.sm,
  },
  listContent: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing['2xl'],
    gap: spacing.sm,
  },
  card: {
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardPressed: {
    opacity: 0.7,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  flex: {
    flex: 1,
  },
});
