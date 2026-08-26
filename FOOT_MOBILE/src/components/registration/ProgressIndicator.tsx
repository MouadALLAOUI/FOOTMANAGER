import { StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';

interface Props {
  current: number;
  total?: number;
  label?: string;
}

export function ProgressIndicator({ current, total = 4, label }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const { isRTL } = useI18n();
  const stepText = isRTL ? `الخطوة ${current} من ${total}` : `Step ${current} of ${total}`;
  // fallback: if label provided use it else step text
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityValue={{ now: current, min: 1, max: total }}>
      <View style={styles.header}>
        <Text style={[styles.step, { color: colors.primary }]}>{stepText}</Text>
        {label ? <Text style={[styles.label, { color: colors.textMuted }]}>{label}</Text> : null}
      </View>
      <View style={styles.track} accessible={false}>
        <View style={styles.dots}>
          {Array.from({ length: total }).map((_, i) => {
            const active = i + 1 <= current;
            const isCurrent = i + 1 === current;
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: active ? colors.primary : colors.border,
                    width: isCurrent ? 24 : 8,
                    opacity: active ? 1 : 0.6,
                  },
                ]}
              />
            );
          })}
        </View>
        {/* Optional bar alternative */}
        <View style={[styles.bar, { backgroundColor: colors.border }]}>
          <View style={[styles.fill, { backgroundColor: colors.primary, width: `${(current / total) * 100}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  step: { fontSize: 12, fontWeight: '700' },
  label: { fontSize: 12, fontWeight: '600' },
  track: { gap: spacing.sm },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 8, borderRadius: radius.full },
  bar: { height: 4, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: 4, borderRadius: radius.full },
});
