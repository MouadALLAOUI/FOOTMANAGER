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
  const { colors } = useTheme();
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
        <Text style={[typography.label, { color: colors.textMuted, marginBottom: 6 }]}>{label}</Text>
      ) : null}
      <TextInput
        {...rest}
        editable={editable}
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
            borderColor: hasError ? colors.danger : focused ? colors.primary : colors.border,
            color: colors.text,
            height: sizes.inputHeight,
            textAlign,
          },
          !editable && { opacity: 0.6 },
        ]}
      />
      {hasError ? (
        <Text style={[typography.caption, { color: colors.danger, marginTop: 6 }]}>{error}</Text>
      ) : hint ? (
        <Text style={[typography.caption, { color: colors.textMuted, marginTop: 6 }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  input: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    fontSize: 15,
  },
});
