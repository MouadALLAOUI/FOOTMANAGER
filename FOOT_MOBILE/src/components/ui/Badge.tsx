import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { palette } from '@/theme/colors';
import { radius } from '@/theme/spacing';

type Variant = 'neutral' | 'success' | 'warning' | 'danger' | 'info';

export type BadgeVariant = Variant;

interface Props {
  label: string;
  variant?: Variant;
  style?: ViewStyle;
}

const variantBg: Record<Variant, string> = {
  neutral: '#e2e8f0',
  success: palette.greenLight,
  warning: palette.amberLight,
  danger: palette.dangerLight,
  info: palette.blueLight,
};

const variantColor: Record<Variant, string> = {
  neutral: '#334155',
  success: palette.greenDark,
  warning: palette.amberDark,
  danger: palette.dangerDark,
  info: palette.blueDark,
};

export function Badge({ label, variant = 'neutral', style }: Props): React.JSX.Element {
  const { isDark } = useTheme();
  const bg = isDark ? `${variantBg[variant]}CC` : variantBg[variant];
  const color = variantColor[variant];

  return (
    <View style={[styles.base, { backgroundColor: bg }, style]}>
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
});
