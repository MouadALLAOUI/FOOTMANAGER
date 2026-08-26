import { Image, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { sizes } from '@/theme/spacing';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface Props {
  uri?: string | null;
  name?: string;
  size?: AvatarSize;
  style?: ViewStyle;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
}

const dimMap: Record<AvatarSize, number> = {
  sm: sizes.avatarSm,
  md: sizes.avatarMd,
  lg: sizes.avatarLg,
  xl: sizes.avatarXl,
};

export function Avatar({ uri, name, size = 'md', style }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const dim = dimMap[size];
  const fontSize = size === 'sm' ? 12 : size === 'md' ? 14 : size === 'lg' ? 18 : 24;

  return (
    <View
      style={[
        styles.base,
        { width: dim, height: dim, borderRadius: dim / 2, backgroundColor: colors.bgMuted },
        style,
      ]}
      accessibilityLabel={name ? `${name} avatar` : 'avatar'}
      accessibilityRole="image"
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: dim, height: dim, borderRadius: dim / 2 }} />
      ) : (
        <Text style={{ color: colors.textMuted, fontSize, fontWeight: '700' }}>{getInitials(name)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
});
