import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { LucideIcon } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { radius, spacing } from '@/theme/spacing';

export interface QuickAction {
  key: string;
  labelKey: string;
  fallback: string;
  Icon: LucideIcon;
  href: string;
  primary?: boolean;
}

interface Props {
  actions: QuickAction[];
}

export function QuickActions({ actions }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  return (
    <View style={styles.grid}>
      {actions.map((a) => (
        <Pressable
          key={a.key}
          onPress={() => router.push(a.href as any)}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: a.primary ? colors.primary : colors.surface,
              borderColor: a.primary ? colors.primary : colors.border,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
          accessibilityRole="button"
          accessibilityLabel={t(a.labelKey, a.fallback)}
        >
          <a.Icon size={22} color={a.primary ? colors.textOnPrimary : colors.primary} />
          <Text style={[styles.label, { color: a.primary ? colors.textOnPrimary : colors.text }]}>{t(a.labelKey, a.fallback)}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  card: {
    width: '48%',
    flexGrow: 1,
    minWidth: 140,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 92,
  },
  label: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
