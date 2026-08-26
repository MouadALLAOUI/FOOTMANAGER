import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { Button } from './Button';

interface Props {
  title: string;
  description?: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

export function EmptyState({ title, description, icon = '—', actionLabel, onAction, style }: Props): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, style]} accessibilityRole="summary">
      <Text style={[styles.icon, { color: colors.textSubtle }]}>{icon}</Text>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {description ? <Text style={[styles.desc, { color: colors.textMuted }]}>{description}</Text> : null}
      {actionLabel && onAction ? (
        <View style={styles.action}>
          <Button title={actionLabel} onPress={onAction} variant="primary" size="md" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  icon: { fontSize: 32, marginBottom: 4 },
  title: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  desc: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  action: { marginTop: 12 },
});
