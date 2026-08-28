import { StyleSheet, View } from 'react-native';
import { AlertTriangle, CircleAlert } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { sizes, spacing } from '@/theme/spacing';
import { AppText } from './AppText';
import { Button, type ButtonVariant } from './Button';
import { Modal } from './Modal';

interface Props {
  visible: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmationDialog({
  visible,
  title,
  description,
  confirmLabel,
  cancelLabel,
  destructive = false,
  loading = false,
  disabled = false,
  onConfirm,
  onCancel,
}: Props): React.JSX.Element {
  const { colors } = useTheme();
  const confirmVariant: ButtonVariant = destructive ? 'danger' : 'primary';
  const accent = destructive ? colors.danger : colors.primary;
  const ConfirmIcon = destructive ? AlertTriangle : CircleAlert;

  const handleCancel = (): void => {
    if (loading) return;
    onCancel();
  };

  return (
    <Modal visible={visible} onClose={handleCancel}>
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: accent + '16' }]}>
          <ConfirmIcon size={sizes.iconLg} color={accent} />
        </View>
        <AppText variant="h3" style={styles.title}>
          {title}
        </AppText>
        {description ? (
          <AppText variant="body" muted style={styles.description}>
            {description}
          </AppText>
        ) : null}
      </View>

      <View style={styles.actions}>
        {cancelLabel ? (
          <Button
            title={cancelLabel}
            onPress={handleCancel}
            variant="ghost"
            disabled={loading}
            style={styles.flex}
          />
        ) : null}
        <Button
          title={confirmLabel}
          onPress={onConfirm}
          variant={confirmVariant}
          loading={loading}
          disabled={disabled || loading}
          style={styles.flex}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: { textAlign: 'center' },
  description: { textAlign: 'center', lineHeight: 20 },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  flex: { flex: 1 },
});
