import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';
import type { SupportedLocale } from '@/types';

const OPTIONS: { locale: SupportedLocale; labelKey: string }[] = [
  { locale: 'en', labelKey: 'language.en' },
  { locale: 'fr', labelKey: 'language.fr' },
  { locale: 'ar', labelKey: 'language.ar' },
];

export function LanguageSwitcher(): React.JSX.Element {
  const { colors } = useTheme();
  const { locale, setLocale, t } = useI18n();

  return (
    <View
      style={styles.container}
      accessibilityRole="radiogroup"
      accessibilityLabel={t('language.select')}
    >
      {OPTIONS.map((opt) => {
        const active = locale === opt.locale;
        return (
          <Pressable
            key={opt.locale}
            onPress={() => setLocale(opt.locale)}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            accessibilityLabel={t(opt.labelKey)}
            style={[
              styles.option,
              {
                backgroundColor: active ? colors.primary : 'transparent',
                borderColor: active ? colors.primary : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: active ? colors.textOnPrimary : colors.textMuted },
                active && styles.labelActive,
              ]}
            >
              {t(opt.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignSelf: 'flex-start',
  },
  option: {
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minWidth: 72,
    alignItems: 'center',
  },
  label: { fontSize: 12, fontWeight: '600' },
  labelActive: { fontWeight: '700' },
});
