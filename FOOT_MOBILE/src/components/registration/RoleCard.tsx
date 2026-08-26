import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';

interface Props {
  title: string;
  description: string;
  Icon: LucideIcon;
  selected: boolean;
  onPress: () => void;
  testID?: string;
}

export function RoleCard({ title, description, Icon, selected, onPress, testID }: Props): React.JSX.Element {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: selected ? colors.primary + '0F' : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View
        style={[
          styles.iconBox,
          {
            backgroundColor: selected ? colors.primary : colors.primary + '14',
          },
        ]}
      >
        <Icon size={20} color={selected ? colors.textOnPrimary : colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.desc, { color: colors.textMuted }]}>{description}</Text>
      {selected ? <View style={[styles.check, { backgroundColor: colors.primary }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    minHeight: 148,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '800', textAlign: 'center' },
  desc: { fontSize: 11, lineHeight: 16, textAlign: 'center' },
  check: { position: 'absolute', top: 10, end: 10, width: 8, height: 8, borderRadius: 4 },
});
