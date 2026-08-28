import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, View, type ImageStyle, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';
import { shadows } from '@/theme/shadows';
import { AppText } from './AppText';
import { Badge, type BadgeVariant } from './Badge';

type CardActionVariant = 'primary' | 'outline' | 'ghost';
type RowAction = { label: string; onPress?: () => void; variant?: CardActionVariant };

interface Props {
  children?: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  elevated?: boolean;
  padded?: boolean;
  title?: string;
  subtitle?: string;
  metadata?: string;
  imageUri?: string;
  imageStyle?: ImageStyle;
  leading?: ReactNode;
  statusLabel?: string;
  statusVariant?: BadgeVariant;
  primaryAction?: RowAction;
  secondaryAction?: RowAction;
}

export function Card({
  children,
  style,
  onPress,
  elevated = false,
  padded = true,
  title,
  subtitle,
  metadata,
  imageUri,
  imageStyle,
  leading,
  statusLabel,
  statusVariant,
  primaryAction,
  secondaryAction,
}: Props): React.JSX.Element {
  const { colors } = useTheme();

  const cardStyle: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    ...(padded ? { padding: spacing.lg } : null),
    gap: spacing.md,
    ...(elevated ? shadows.md : null),
  };

  const hasHeader =
    Boolean(title) || Boolean(subtitle) || Boolean(metadata) || Boolean(leading) || Boolean(statusLabel) || Boolean(imageUri);

  const header = hasHeader ? (
    <View style={styles.header}>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.headerText}>
        {title ? <AppText variant="bodyBold" numberOfLines={2}>{title}</AppText> : null}
        {subtitle ? (
          <AppText variant="caption" muted numberOfLines={3}>{subtitle}</AppText>
        ) : null}
        {metadata ? (
          <AppText variant="small" style={{ color: colors.textSubtle }} numberOfLines={1}>
            {metadata}
          </AppText>
        ) : null}
      </View>
      {statusLabel && statusVariant ? (
        <View style={styles.status}>
          <Badge label={statusLabel} variant={statusVariant} />
        </View>
      ) : null}
    </View>
  ) : null;

  const image = imageUri ? (
    <Image source={{ uri: imageUri }} style={[styles.image, imageStyle]} resizeMode="cover" />
  ) : null;

  const hasActions = Boolean(primaryAction || secondaryAction);
  const actions = hasActions ? (
    <View style={styles.actions}>
      {secondaryAction ? (
        <Pressable
          onPress={secondaryAction.onPress}
          accessibilityRole="button"
          accessibilityLabel={secondaryAction.label}
          style={[styles.actionChip, { borderColor: colors.border }]}
        >
          <AppText variant="captionBold" style={{ color: colors.text }}>
            {secondaryAction.label}
          </AppText>
        </Pressable>
      ) : null}
      {primaryAction ? (
        <Pressable
          onPress={primaryAction.onPress}
          accessibilityRole="button"
          accessibilityLabel={primaryAction.label}
          style={[
            styles.actionChip,
            {
              backgroundColor:
                primaryAction.variant === 'outline' || primaryAction.variant === 'ghost'
                  ? 'transparent'
                  : colors.primary,
              borderColor: primaryAction.variant === 'outline' ? colors.primary : 'transparent',
            },
          ]}
        >
          <AppText
            variant="captionBold"
            style={{ color: primaryAction.variant === 'outline' || primaryAction.variant === 'ghost' ? colors.primary : colors.textOnPrimary }}
          >
            {primaryAction.label}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  ) : null;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [cardStyle, pressed && { opacity: 0.96 }, style]}
      >
        {image}
        {header}
        {children}
        {actions}
      </Pressable>
    );
  }

  return (
    <View style={[cardStyle, style]}>
      {image}
      {header}
      {children}
      {actions}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  leading: { justifyContent: 'center', alignItems: 'center' },
  headerText: { flex: 1, gap: 2 },
  status: { justifyContent: 'center', alignItems: 'center' },
  image: { width: '100%', height: 160, borderRadius: radius.md },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  actionChip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    flexGrow: 1,
  },
});
