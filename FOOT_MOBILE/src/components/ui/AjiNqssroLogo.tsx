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
  color = '#059669',
}: {
  size?: number;
  color?: string;
}): React.JSX.Element {
  // The stylized green athlete/arch emblem with head circle and crossbar
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      {/* Top Head / Ball */}
      <Circle cx="32" cy="12" r="7" fill={color} />

      {/* Main Arch / A-frame Legs */}
      <Path
        d="M17 52 L32 23 L47 52"
        stroke={color}
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Horizontal Crossbar */}
      <Path
        d="M13 39 L51 39"
        stroke={color}
        strokeWidth="5.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function AjiNqssroLogo({
  size = 48,
  showText = true,
  layout = 'vertical',
  color = '#059669',
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
