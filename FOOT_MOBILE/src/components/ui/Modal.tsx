import type { ReactNode } from 'react';
import { Modal as RNModal, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';
import { shadows } from '@/theme/shadows';

interface Props {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  style?: ViewStyle;
}

export function Modal({ visible, onClose, title, children, style }: Props): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={onClose} />
      <View style={styles.centered} pointerEvents="box-none">
        <View style={[styles.sheet, { backgroundColor: colors.surface }, shadows.lg, style]}>
          {title ? (
            <Text style={[styles.title, { color: colors.text, borderBottomColor: colors.border }]}>{title}</Text>
          ) : null}
          <View style={styles.content}>{children}</View>
        </View>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  sheet: {
    width: '100%',
    maxWidth: 480,
    borderRadius: radius.xl,
    overflow: 'hidden',
    maxHeight: '85%',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    padding: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  content: { padding: spacing.lg },
});
