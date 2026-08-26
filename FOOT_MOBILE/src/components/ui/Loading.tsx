import { ActivityIndicator, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface Props {
  message?: string;
  style?: ViewStyle;
  size?: 'small' | 'large';
}

export function Loading({ message, style, size = 'large' }: Props): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, style]} accessibilityRole="progressbar">
      <ActivityIndicator size={size} color={colors.primary} />
      {message ? <Text style={[styles.text, { color: colors.textMuted }]}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  text: { fontSize: 14, textAlign: 'center' },
});
