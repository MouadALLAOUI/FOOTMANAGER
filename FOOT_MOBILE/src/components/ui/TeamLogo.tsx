import { useEffect, useState } from 'react';
import { Image, StyleSheet, View, type ViewStyle } from 'react-native';
import { Shield } from 'lucide-react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { radius } from '@/theme/spacing';
import { resolveImageUrl } from '@/utils/image';

export type TeamLogoSize = 'sm' | 'md' | 'lg' | 'xl';

interface Props {
  uri?: string | null;
  name?: string;
  size?: TeamLogoSize;
  style?: ViewStyle;
}

const dimMap: Record<TeamLogoSize, number> = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 72,
};

const radiusMap: Record<TeamLogoSize, number> = {
  sm: radius.small,
  md: radius.medium,
  lg: radius.medium,
  xl: radius.large,
};

export function TeamLogo({ uri, name, size = 'md', style }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const dim = dimMap[size];
  const borderRadius = radiusMap[size];
  const iconSize = Math.round(dim * 0.55);

  const resolvedUri = resolveImageUrl(uri);
  const [hasError, setHasError] = useState(false);

  // Reset error when URI changes
  useEffect(() => {
    setHasError(false);
  }, [resolvedUri]);

  const showImage = !!resolvedUri && !hasError;

  return (
    <View
      style={[
        styles.base,
        {
          width: dim,
          height: dim,
          borderRadius,
          backgroundColor: colors.surface,
          borderColor: colors.border,
        },
        style,
      ]}
      accessibilityLabel={name ? `${name} logo` : 'team logo'}
      accessibilityRole="image"
    >
      {showImage ? (
        <Image
          source={{ uri: resolvedUri }}
          style={{ width: dim - 8, height: dim - 8 }}
          resizeMode="contain"
          onError={() => setHasError(true)}
        />
      ) : (
        <View style={[styles.fallback, { borderRadius: borderRadius - 2, backgroundColor: colors.primary + '12' }]}>
          <Shield size={iconSize} color={colors.primary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  fallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
