import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, MapPin, Users } from 'lucide-react-native';

import {
  type OwnerTerrain,
  type TerrainType,
  useOwnerTerrains,
} from '@/api/ownerTerrains';
import { AppText } from '@/components/ui/AppText';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { List } from '@/components/ui/List';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';

function typeVariant(type?: TerrainType | null): BadgeVariant {
  switch (type) {
    case 'salle':
      return 'info';
    case 'synthetic':
      return 'success';
    case 'cement':
      return 'neutral';
    case 'minifoot':
      return 'warning';
    case 'grass':
      return 'success';
    default:
      return 'neutral';
  }
}

function money(value: string | number | null | undefined): string {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? String(Math.round(n * 100) / 100) : '-';
}

function FieldCard({ terrain }: { terrain: OwnerTerrain }): React.JSX.Element {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const isAvailable = !!terrain.is_open && terrain.is_available !== false;

  const typeKey = (terrain.type as TerrainType) ?? 'salle';
  const statusVariant: BadgeVariant = isAvailable ? 'success' : 'danger';

  return (
    <Card
      onPress={() => router.push({ pathname: '/(terrain)/fields/[id]', params: { id: String(terrain.id) } })}
      imageUri={terrain.cover_image_url ?? undefined}
      title={terrain.name ?? t('field.unnamed', 'Field')}
      statusLabel={isAvailable ? t('fields.open', 'Open') : t('fields.closed', 'Closed')}
      statusVariant={statusVariant}
      subtitle={`${t(`field.type.${typeKey}`, typeKey)} · ${terrain.player_format ?? '-'}`}
      metadata={terrain.city ? `${terrain.city} · ${money(terrain.price_per_hour || terrain.price_per_team)}/h` : `${money(terrain.price_per_hour || terrain.price_per_team)}/h`}
    >
      <View style={[styles.metaStrip, { borderTopColor: colors.border }]}>
        <View style={styles.metaItem}>
          <Badge label={t(`field.type.${typeKey}`, typeKey)} variant={typeVariant(typeKey)} />
        </View>
        <View style={styles.metaText}>
          <View style={styles.metaLine}>
            <MapPin size={14} color={colors.textSubtle} />
            <AppText variant="small" subtle>
              {terrain.city ?? '-'}
            </AppText>
          </View>
          <View style={styles.metaLine}>
            <Users size={14} color={colors.textSubtle} />
            <AppText variant="small" subtle>
              {terrain.capacity != null ? String(terrain.capacity) : '-'}
            </AppText>
          </View>
          <View style={styles.metaLine}>
            <Clock size={14} color={colors.textSubtle} />
            <AppText variant="small" subtle>
              {money(terrain.price_per_hour || terrain.price_per_team)}
            </AppText>
          </View>
        </View>
      </View>
    </Card>
  );
}

export default function FieldsListScreen(): React.JSX.Element {
  const { t } = useI18n();
  const { data, isLoading, isError, error, refetch, isFetching } = useOwnerTerrains();
  const terrains = data?.terrains ?? [];

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('fields.title', 'Fields')} />
      <List
        data={terrains as OwnerTerrain[]}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => <FieldCard terrain={item} />}
        loading={isLoading}
        error={isError ? error : undefined}
        errorFallback={t('fields.loadFailed', 'Could not load fields')}
        onRetry={handleRefresh}
        onRefresh={handleRefresh}
        refreshing={isFetching}
        emptyIcon="map-pin"
        emptyTitle={t('fields.empty', 'No fields')}
        emptyDescription={t('fields.emptyDesc', 'Create a field to manage bookings and operations here.')}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  metaStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: spacing.md,
  },
  metaItem: { flexShrink: 0 },
  metaText: { flex: 1, gap: spacing.xs },
  metaLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
