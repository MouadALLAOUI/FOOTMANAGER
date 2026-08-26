import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button } from './Button';

interface Props {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  style?: ViewStyle;
}

export function ErrorState({ title, message, onRetry, retryLabel, style }: Props): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, style]} accessibilityRole="alert">
      <Text style={[styles.icon, { color: colors.danger }]}>!</Text>
      {title ? <Text style={[styles.title, { color: colors.text }]}>{title}</Text> : null}
      <Text style={[styles.message, { color: colors.textMuted }]}>{message}</Text>
      {onRetry && retryLabel ? (
        <View style={styles.action}>
          <Button title={retryLabel} onPress={onRetry} variant="primary" size="md" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  icon: {
    fontSize: 24,
    fontWeight: '800',
    width: 40,
    height: 40,
    textAlign: 'center',
    lineHeight: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  title: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  message: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  action: { marginTop: 12 },
});
