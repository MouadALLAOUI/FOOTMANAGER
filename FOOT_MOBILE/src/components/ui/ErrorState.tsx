import { StyleSheet, View, type ViewStyle } from 'react-native';
import { AlertTriangle } from 'lucide-react-native';

import { getApiErrorMessage } from '@/api/errors';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, sizes, spacing } from '@/theme/spacing';
import { AppText } from './AppText';
import { Button, type ButtonVariant } from './Button';

interface Props {
  message?: string;
  error?: unknown;
  fallback?: string;
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  secondaryActionVariant?: ButtonVariant;
  retryVariant?: ButtonVariant;
  retryLoading?: boolean;
  style?: ViewStyle;
}

export function ErrorState({
  message,
  error,
  fallback,
  title,
  onRetry,
  retryLabel,
  secondaryActionLabel,
  onSecondaryAction,
  secondaryActionVariant = 'ghost',
  retryVariant = 'primary',
  retryLoading = false,
  style,
}: Props): React.JSX.Element {
  const { colors } = useTheme();

  const resolvedMessage = message ?? getApiErrorMessage(error, fallback);

  return (
    <View style={[styles.container, style]} accessibilityRole="alert">
      <View style={[styles.iconWrap, { backgroundColor: colors.danger + '16' }]}>
        <AlertTriangle size={sizes.iconMd} color={colors.danger} />
      </View>
      {title ? (
        <AppText variant="bodyBold" style={styles.title}>
          {title}
        </AppText>
      ) : null}
      <AppText variant="caption" muted style={styles.message}>
        {resolvedMessage}
      </AppText>
      {onRetry && retryLabel ? (
        <View style={styles.actions}>
          <Button
            title={retryLabel}
            onPress={onRetry}
            variant={retryVariant}
            size="md"
            loading={retryLoading}
            disabled={retryLoading}
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
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: { textAlign: 'center' },
  message: { textAlign: 'center', lineHeight: 18 },
  actions: { marginTop: spacing.sm },
  secondary: { marginTop: spacing.xs },
});
