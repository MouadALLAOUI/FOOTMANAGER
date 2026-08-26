import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';
import { useI18n } from '@/i18n/I18nProvider';

interface Props {
  label: string;
  value?: string;
  onEdit?: () => void;
  hidden?: boolean;
}

export function ReviewCard({ label, value, onEdit, hidden }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const { t } = useI18n();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text>
        {onEdit ? (
          <Pressable onPress={onEdit} accessibilityRole="button" accessibilityLabel={`${t('common.edit', 'Edit')} ${label}`} hitSlop={8}>
            <Text style={[styles.edit, { color: colors.primary }]}>{t('common.edit', 'Edit')}</Text>
          </Pressable>
        ) : null}
      </View>
      {hidden ? (
        <Text style={[styles.hidden, { color: colors.textSubtle }]}>••••••••</Text>
      ) : (
        <Text style={[styles.value, { color: colors.text }]}>{value || '—'}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  edit: { fontSize: 12, fontWeight: '700' },
  value: { fontSize: 14, fontWeight: '600' },
  hidden: { fontSize: 14, letterSpacing: 2 },
});
