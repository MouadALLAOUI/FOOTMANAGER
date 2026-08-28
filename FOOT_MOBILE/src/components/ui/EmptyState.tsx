import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';
import { AppText } from './AppText';
import { Button, type ButtonVariant } from './Button';

interface Props {
  title?: string;
  description?: string;
  icon?: ReactNode | string;
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: ButtonVariant;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryActionVariant?: ButtonVariant;
  style?: ViewStyle;
  actionLoading?: boolean;
}

export function EmptyState({
  title,
  description,
  icon = '—',
  actionLabel,
  onAction,
  actionVariant = 'primary',
  secondaryActionLabel,
  onSecondaryAction,
  secondaryActionVariant = 'ghost',
  style,
  actionLoading = false,
}: Props): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, style]} accessibilityRole="summary">
      {typeof icon === 'string' ? (
        <AppText variant="h1" style={[styles.icon, { color: colors.textSubtle }]}>
          {icon}
        </AppText>
      ) : (
        <View style={styles.iconNode}>{icon}</View>
      )}
      <AppText variant="bodyBold" style={styles.title}>
        {title}
      </AppText>
      {description ? (
        <AppText variant="caption" muted style={styles.desc}>
          {description}
        </AppText>
      ) : null}

      {actionLabel && onAction ? (
        <View style={styles.actions}>
          <Button
            title={actionLabel}
            onPress={onAction}
            variant={actionVariant}
            size="md"
            loading={actionLoading}
            disabled={actionLoading}
          />
        </View>
      ) : null}

      {secondaryActionLabel && onSecondaryAction ? (
        <View style={styles.secondary}>
          <Button
            title={secondaryActionLabel}
            onPress={onSecondaryAction}
            variant={secondaryActionVariant}
            size="md"
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: spacing['2xl'], gap: spacing.sm },
  icon: { marginBottom: spacing.xs },
  iconNode: { marginBottom: spacing.xs, justifyContent: 'center', alignItems: 'center' },
  title: { textAlign: 'center' },
  desc: { textAlign: 'center', lineHeight: 18 },
  actions: { marginTop: spacing.sm },
  secondary: { marginTop: spacing.xs },
});
