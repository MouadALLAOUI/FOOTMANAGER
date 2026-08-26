import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

interface Props {
  orientation?: 'horizontal' | 'vertical';
  style?: ViewStyle;
}

export function Divider({ orientation = 'horizontal', style }: Props): React.JSX.Element {
  const { colors } = useTheme();
  if (orientation === 'vertical') {
    return <View style={[styles.vertical, { backgroundColor: colors.border }, style]} />;
  }
  return <View style={[styles.horizontal, { backgroundColor: colors.border }, style]} />;
}

const styles = StyleSheet.create({
  horizontal: { height: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
  vertical: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch' },
});
