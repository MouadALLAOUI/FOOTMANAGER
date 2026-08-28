import { ActivityIndicator, StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';
import { AppText } from './AppText';

interface Props {
  message?: string;
  style?: ViewStyle;
  size?: 'small' | 'large';
  variant?: 'full' | 'inline';
}

export function Loading({ message, style, size = 'large', variant = 'full' }: Props): React.JSX.Element {
  const { colors } = useTheme();

  const containerStyle =
    variant === 'inline'
      ? [styles.inlineContainer, style]
      : [styles.fullContainer, style];

  return (
    <View style={containerStyle} accessibilityRole="progressbar">
      <ActivityIndicator
        size={size === 'small' ? 'small' : 'large'}
        color={colors.primary}
      />
      {message ? (
        <AppText variant="caption" muted style={styles.text}>
          {message}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fullContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing['2xl'], gap: spacing.md },
  inlineContainer: { padding: spacing.lg, justifyContent: 'center', alignItems: 'center', gap: spacing.md },
  text: { textAlign: 'center' },
});
