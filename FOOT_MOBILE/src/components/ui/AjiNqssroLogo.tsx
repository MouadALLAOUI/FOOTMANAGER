import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

interface AjiNqssroLogoProps {
  size?: number;
  showText?: boolean;
  layout?: 'vertical' | 'horizontal';
  color?: string;
  textColor?: string;
}

export function AjiNqssroMark({
  size = 48,
  color = '#00875A',
}: {
  size?: number;
  color?: string;
}): React.JSX.Element {
  // Stylized runner athlete with ball inside
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {/* Top Head */}
      <Circle cx="32" cy="11" r="6.5" fill={color} />

      {/* Dynamic Athletic Arch */}
      <Path
        d="M17 53 C20 33 26 23 32 23 C38 23 44 33 47 53"
        stroke={color}
        strokeWidth="5.5"
        strokeLinecap="round"
      />

      {/* Arms spreading outward */}
      <Path
        d="M14 36 C22 33 42 33 50 36"
        stroke={color}
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* Soccer Ball at center */}
      <Circle cx="32" cy="46" r="6" fill="#FFFFFF" stroke={color} strokeWidth="2" />
      <Path
        d="M32 43 L34 45 L33 47 L31 47 L30 45 Z"
        fill={color}
      />
    </Svg>
  );
}

export function AjiNqssroLogo({
  size = 48,
  showText = true,
  layout = 'vertical',
  color = '#00875A',
  textColor,
}: AjiNqssroLogoProps): React.JSX.Element {
  const isVertical = layout === 'vertical';

  return (
    <View style={[styles.container, isVertical ? styles.vertical : styles.horizontal]}>
      <AjiNqssroMark size={size} color={color} />
      {showText ? (
        <View style={[styles.textWrap, isVertical && styles.textWrapCenter]}>
          <Text
            style={[
              styles.arabicText,
              { color: textColor ?? color, fontSize: Math.max(18, Math.round(size * 0.42)) },
            ]}
          >
            أجي نقصرو
          </Text>
          <Text
            style={[
              styles.latinText,
              { color: textColor ?? '#1E293B', fontSize: Math.max(11, Math.round(size * 0.22)) },
            ]}
          >
            Aji Nqssro
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  vertical: {
    flexDirection: 'column',
    gap: 4,
  },
  horizontal: {
    flexDirection: 'row',
    gap: 10,
  },
  textWrap: {
    justifyContent: 'center',
  },
  textWrapCenter: {
    alignItems: 'center',
  },
  arabicText: {
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  latinText: {
    fontWeight: '700',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginTop: -2,
  },
});
