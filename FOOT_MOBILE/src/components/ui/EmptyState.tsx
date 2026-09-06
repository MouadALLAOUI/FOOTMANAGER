import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';
import { AppText } from './AppText';
import { Button, type ButtonVariant } from './Button';
import { GoalpostEmptyIllustration } from './illustrations';

interface Props {
  title?: string;
  description?: string;
  icon?: ReactNode | string;
  illustration?: ReactNode;
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
  icon,
  illustration,
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

  const renderVisual = () => {
    if (illustration) return <View style={styles.illustrationNode}>{illustration}</View>;
    if (icon && typeof icon !== 'string') return <View style={styles.iconNode}>{icon}</View>;
    if (typeof icon === 'string' && icon !== '—') {
      return (
        <AppText variant="h1" style={[styles.icon, { color: colors.textSubtle }]}>
          {icon}
        </AppText>
      );
    }
    // Default: Shared flat goalpost illustration
    return (
      <View style={styles.illustrationNode}>
        <GoalpostEmptyIllustration />
      </View>
    );
  };

  return (
    <View style={[styles.container, style]} accessibilityRole="summary">
      {renderVisual()}

      {title ? (
        <AppText variant="h2" style={styles.title}>
          {title}
        </AppText>
      ) : null}

      {description ? (
        <AppText variant="body" muted style={styles.desc}>
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
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.sm,
  },
  illustrationNode: {
    marginBottom: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: { marginBottom: spacing.xs },
  iconNode: { marginBottom: spacing.xs, justifyContent: 'center', alignItems: 'center' },
  title: { textAlign: 'center', fontWeight: '700' },
  desc: { textAlign: 'center', lineHeight: 22, maxWidth: 300 },
  actions: { marginTop: spacing.md },
  secondary: { marginTop: spacing.xs },
});

