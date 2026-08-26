import type { ReactNode } from 'react';
import { Text, type TextProps } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import { typography, type TextVariant } from '@/theme/typography';

interface Props extends TextProps {
  variant?: TextVariant;
  children: ReactNode;
  muted?: boolean;
  subtle?: boolean;
  align?: 'left' | 'center' | 'right' | 'justify';
  color?: string;
}

export function AppText({
  variant = 'body',
  children,
  muted = false,
  subtle = false,
  align,
  color,
  style,
  ...rest
}: Props): React.JSX.Element {
  const { colors } = useTheme();
  const textColor = color ?? (subtle ? colors.textSubtle : muted ? colors.textMuted : colors.text);

  return (
    <Text
      style={[typography[variant], { color: textColor }, align ? { textAlign: align } : null, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}
