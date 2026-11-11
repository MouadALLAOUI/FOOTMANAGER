import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, sizes } from '@/theme/spacing';
import { typography } from '@/theme/typography';

interface Props extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  containerStyle?: ViewStyle;
}

export function Input({ label, error, hint, containerStyle, editable = true, ...rest }: Props): React.JSX.Element {
  const { colors, isDark } = useTheme();
  const { isRTL } = useI18n();
  const [focused, setFocused] = useState(false);
  const hasError = !!error;
  const isLtrField =
    rest.keyboardType === 'phone-pad' ||
    rest.keyboardType === 'email-address' ||
    rest.keyboardType === 'numeric' ||
    !!rest.secureTextEntry;
  const textAlign = isLtrField ? 'left' : isRTL ? 'right' : 'left';

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? (
        <Text style={[typography.arabicLabelBold, { color: colors.text, marginBottom: 6, textAlign: isRTL ? 'right' : 'left' }]}>
          {label}
        </Text>
      ) : null}
      <TextInput
        {...rest}
        editable={editable}
        autoCapitalize={rest.autoCapitalize ?? (rest.secureTextEntry ? 'none' : undefined)}
        autoCorrect={rest.autoCorrect ?? (rest.secureTextEntry ? false : undefined)}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        placeholderTextColor={colors.textSubtle}
        accessibilityLabel={label ?? rest.accessibilityLabel}
        style={[
          styles.input,
          {
            backgroundColor: colors.surface,
            borderColor: hasError ? colors.danger : focused ? (isDark ? colors.primary : colors.charcoal) : colors.border,
            borderWidth: focused ? 1.5 : 1,
            color: colors.text,
            height: sizes.inputHeight,
            textAlign,
          },
          !editable && { opacity: 0.6 },
        ]}
      />
      {hasError ? (
        <Text style={[typography.caption, { color: colors.danger, marginTop: 4, textAlign: isRTL ? 'right' : 'left' }]}>
          {error}
        </Text>
      ) : hint ? (
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: 4, textAlign: isRTL ? 'right' : 'left' }]}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  input: {
    borderRadius: radius.md,
    paddingHorizontal: 16,
    fontSize: 15,
    fontWeight: '600',
  },
});
