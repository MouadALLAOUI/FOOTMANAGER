import { StyleSheet, View } from 'react-native';
import { Calendar, MapPin, Swords, Users } from 'lucide-react-native';

import type { FeedMatch } from '@/api/matches';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { palette, type ThemeColors } from '@/theme/colors';
import { radius, sizes, spacing } from '@/theme/spacing';
import { formatTime } from '@/utils/format';

const toneByFormat: Record<string, string> = {
  '5': palette.blue,
  '7': palette.green,
  '11': palette.amber,
};

function playerFormatTone(playerFormat: string | null | undefined, colors: ThemeColors, isDark: boolean): string {
  const base = toneByFormat[playerFormat?.replace('v', '') ?? ''] ?? palette.blue;
  return isDark ? `${base}33` : `${base}1A`;
}

export function MatchCard({ match, onPress }: { match: FeedMatch; onPress: () => void }): React.JSX.Element {
  const { t, formatDate, locale } = useI18n();
  const { colors, isDark } = useTheme();

  const teamName = match.host_team?.name ?? t('match.unknownTeam', 'فريق');
  const terrainName = match.stadium?.name ?? match.custom_terrain_name ?? '';
  const city = match.stadium?.city ?? match.host_team?.city ?? '';
  const playerFormat = match.player_format ? `${match.player_format.toUpperCase()}` : '';
  const spots = match.players_remaining ?? 0;
  const isFull = Boolean(match.players_full);
  const needsPlayers = Boolean(match.needs_players);
  const spotsLabel = isFull
    ? t('match.full', 'مكتمل')
    : t('match.spotsLeft', '{{count}} spots left').replace('{{count}}', String(spots));

  return (
    <Card onPress={onPress} padded={false}>
      <View style={[styles.topRow, { backgroundColor: playerFormatTone(match.player_format, colors, isDark) }]}>
        <View style={styles.formatBadge}>
          <Swords size={sizes.iconSm} color={colors.primary} />
          {playerFormat ? (
            <AppText variant="label" style={{ color: colors.primary }}>
              {playerFormat}
            </AppText>
          ) : null}
        </View>
        {needsPlayers ? (
          <View style={styles.availability}>
            <Users size={sizes.iconSm} color={isFull ? colors.danger : colors.success} />
            <AppText
              variant="captionBold"
              style={{ color: isFull ? colors.danger : colors.success }}
            >
              {spotsLabel}
            </AppText>
          </View>
        ) : null}
      </View>

      <View style={styles.body}>
        <AppText variant="bodyBold" numberOfLines={1}>
          {teamName}
        </AppText>

        <View style={styles.row}>
          <Calendar size={sizes.iconSm} color={colors.textMuted} />
          <AppText variant="caption" muted>
            {`${formatDate(match.match_datetime)} · ${formatTime(match.match_datetime, locale)}`}
          </AppText>
        </View>

        <View style={styles.row}>
          <MapPin size={sizes.iconSm} color={colors.textMuted} />
          <AppText variant="caption" muted numberOfLines={1} style={styles.rowText}>
            {[terrainName, city].filter(Boolean).join(' · ') || t('match.noTerrain', 'بدون ملعب')}
          </AppText>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  formatBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  availability: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  body: { padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowText: { flex: 1 },
});
