import { StyleSheet, View } from 'react-native';

import type { Teammate } from '@/api/team';
import { AppText } from '@/components/ui/AppText';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';

interface Props {
  teammates: Teammate[];
  memberCount?: number;
}

export function TeamStatsBar({ teammates, memberCount }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const { t, formatNumber } = useI18n();

  const starters = teammates.filter((m) => m.role === 'starter').length;
  const substitutes = teammates.filter((m) => m.role === 'substitute').length;
  const total = memberCount ?? teammates.length;

  const items: { label: string; value: number }[] = [
    { label: t('team.stats.total', 'أعضاء'), value: total },
    { label: t('team.stats.starters', 'أساسيون'), value: starters },
    { label: t('team.stats.substitutes', 'بدلاء'), value: substitutes },
  ];

  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {items.map((item, idx) => (
        <View key={item.label} style={styles.itemWrap}>
          {idx > 0 ? <View style={[styles.divider, { backgroundColor: colors.border }]} /> : null}
          <View style={styles.item}>
            <AppText variant="h3">{formatNumber(item.value)}</AppText>
            <AppText variant="caption" muted>{item.label}</AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.lg,
  },
  itemWrap: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
  divider: { width: StyleSheet.hairlineWidth, marginVertical: -spacing.md },
  item: { flex: 1, alignItems: 'center', gap: 2 },
});
