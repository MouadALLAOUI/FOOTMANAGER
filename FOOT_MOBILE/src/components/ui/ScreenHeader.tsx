import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';

import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { sizes, spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { AppText } from './AppText';
import { IconButton } from './IconButton';

interface Props {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backLabel?: string;
  onBack?: () => void;
  rightAction?: ReactNode;
  style?: ViewStyle;
}

export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  backLabel,
  onBack,
  rightAction,
  style,
}: Props): React.JSX.Element {
  const { colors, isRTL } = useTheme();
  const { t } = useI18n();
  const router = useRouter();

  const handleBack = (): void => {
    if (onBack) {
      onBack();
      return;
    }
    if (router.canGoBack()) {
      router.back();
    }
  };

  const BackIcon = isRTL ? ChevronRight : ChevronLeft;

  return (
    <View style={[styles.container, style]}>
      {showBack ? (
        <IconButton
          icon={<BackIcon size={sizes.iconLg} color={colors.text} />}
          onPress={handleBack}
          accessibilityLabel={backLabel ?? t('common.back', 'رجوع')}
          variant="ghost"
          size="md"
        />
      ) : (
        <View style={styles.placeholder} />
      )}

      <View style={styles.titleWrap}>
        <AppText variant="h3" numberOfLines={1} style={styles.title}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" muted numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </AppText>
        ) : null}
      </View>

      <View style={styles.actionSlot}>{rightAction ?? <View style={styles.placeholder} />}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: sizes.buttonHeightMd,
  },
  titleWrap: { flex: 1, alignItems: 'center', gap: 0 },
  title: {
    fontSize: typography.h3.fontSize,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },
  subtitle: {
    marginTop: 2,
    textAlign: 'center',
    width: '100%',
  },
  placeholder: { width: sizes.iconLg * 2 },
  actionSlot: {
    width: sizes.iconLg * 2,
    alignItems: 'flex-end',
  },
});
