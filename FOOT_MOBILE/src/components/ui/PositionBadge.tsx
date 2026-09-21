import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export type PositionCode = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LM' | 'RM' | 'LW' | 'RW' | 'W' | 'ST' | 'CF';

interface PositionBadgeProps {
  position: string;
  size?: 'sm' | 'md' | 'lg';
}

const positionConfig: Record<string, { bg: string; labelAr: string }> = {
  GK: { bg: '#00875A', labelAr: 'حارس المرمى' },
  CB: { bg: '#0284C7', labelAr: 'قلب دفاع' },
  LB: { bg: '#0284C7', labelAr: 'ظهير أيسر' },
  RB: { bg: '#0284C7', labelAr: 'ظهير أيمن' },
  CDM: { bg: '#0D9488', labelAr: 'وسط دفاعي' },
  CM: { bg: '#7C3AED', labelAr: 'وسط ميدان' },
  CAM: { bg: '#6366F1', labelAr: 'صانع ألعاب' },
  LM: { bg: '#D97706', labelAr: 'وسط أيسر' },
  RM: { bg: '#D97706', labelAr: 'وسط أيمن' },
  LW: { bg: '#EA580C', labelAr: 'جناح أيسر' },
  RW: { bg: '#EA580C', labelAr: 'جناح أيمن' },
  W: { bg: '#D97706', labelAr: 'جناح' },
  ST: { bg: '#E11D48', labelAr: 'مهاجم' },
  CF: { bg: '#E11D48', labelAr: 'مهاجم متقدم' },
};

export function getPositionColor(pos: string): string {
  const normalized = pos.toUpperCase().trim();
  return positionConfig[normalized]?.bg ?? '#64748B';
}

export function getPositionArabic(pos: string): string {
  const normalized = pos.toUpperCase().trim();
  return positionConfig[normalized]?.labelAr ?? pos;
}

export function PositionBadge({ position, size = 'md' }: PositionBadgeProps): React.JSX.Element {
  const normalized = position.toUpperCase().trim();
  const config = positionConfig[normalized] ?? { bg: '#64748B', labelAr: position };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }, styles[size]]}>
      <Text style={[styles.text, styles[`${size}Text`]]}>{normalized}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sm: {
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  md: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  lg: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '800',
    textAlign: 'center',
  },
  smText: {
    fontSize: 11,
  },
  mdText: {
    fontSize: 13,
  },
  lgText: {
    fontSize: 15,
  },
});
