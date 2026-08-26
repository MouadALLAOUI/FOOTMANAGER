import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { layout } from '@/theme/spacing';
import { useTheme } from '@/theme/ThemeProvider';

interface Props {
  children: ReactNode;
  padded?: boolean;
  scroll?: boolean;
  style?: ViewStyle;
}

export function Screen({ children, padded = true, scroll = false, style }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const content = <View style={[styles.inner, padded && styles.padded, style]}>{children}</View>;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.bg }]} edges={['top', 'bottom']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  inner: { flex: 1 },
  padded: { padding: layout.screenPadding },
  scrollContent: { flexGrow: 1, padding: layout.screenPadding },
});
