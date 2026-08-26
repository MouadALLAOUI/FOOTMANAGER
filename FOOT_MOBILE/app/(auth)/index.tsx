import { useState } from 'react';
import { Link } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';

export default function LoginScreen(): React.JSX.Element {
  const { login, getLoginErrorMessage } = useAuth();
  const { isRTL } = useI18n();
  const { colors } = useTheme();

  const [loginField, setLoginField] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (!loginField.trim()) {
      setError(isRTL ? 'أدخل البريد الإلكتروني أو رقم الهاتف' : 'Enter your email or phone');
      return;
    }
    if (!password) {
      setError(isRTL ? 'أدخل كلمة المرور' : 'Enter your password');
      return;
    }

    setLoading(true);
    try {
      await login(loginField.trim(), password);
      // Navigation is handled by the auth guard in _layout
    } catch (e: unknown) {
      setError(getLoginErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View style={[styles.logoCircle, { backgroundColor: colors.primary + '18' }]}>
              <Text style={[styles.logoText, { color: colors.primary }]}>⚽</Text>
            </View>
            <Text style={[styles.title, { color: colors.text }]}>
              {isRTL ? 'تسجيل الدخول' : 'Sign In'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              {isRTL ? 'أدخل بياناتك للوصول لحسابك' : 'Enter your credentials to access your account'}
            </Text>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.danger + '12' }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              </View>
            ) : null}

            <Input
              label={isRTL ? 'البريد الإلكتروني أو رقم الهاتف' : 'Email or Phone'}
              placeholder={isRTL ? 'أدخل البريد أو الهاتف' : 'Enter email or phone'}
              value={loginField}
              onChangeText={(v: string) => { setLoginField(v); setError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="username"
              autoComplete="username"
            />

            <Input
              label={isRTL ? 'كلمة المرور' : 'Password'}
              placeholder={isRTL ? 'أدخل كلمة المرور' : 'Enter password'}
              value={password}
              onChangeText={(v: string) => { setPassword(v); setError(''); }}
              secureTextEntry
              textContentType="password"
              autoComplete="password"
              onSubmitEditing={handleSubmit}
              returnKeyType="go"
            />

            <Button
              title={isRTL ? 'تسجيل الدخول' : 'Sign In'}
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              fullWidth
            />
          </View>

          <View style={styles.links}>
            <Link href="/(auth)/forgot-password" asChild>
              <Text style={StyleSheet.flatten([styles.link, { color: colors.primary }])}>
                {isRTL ? 'نسيت كلمة المرور؟' : 'Forgot password?'}
              </Text>
            </Link>

            <View style={styles.registerRow}>
              <Text style={StyleSheet.flatten([styles.registerText, { color: colors.textMuted }])}>
                {isRTL ? 'ليس لديك حساب؟' : "Don't have an account?"}
              </Text>
              <Link href="/(auth)/register" asChild>
                <Text style={StyleSheet.flatten([styles.link, { color: colors.primary }])}>
                  {isRTL ? 'إنشاء حساب' : 'Create one'}
                </Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', gap: spacing['2xl'] },
  header: { alignItems: 'center', gap: spacing.md },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: { fontSize: 32 },
  title: { fontSize: 24, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: spacing.lg },
  form: { gap: spacing.lg },
  errorBanner: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.xs,
  },
  errorText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  links: { alignItems: 'center', gap: spacing.lg },
  link: { fontSize: 14, fontWeight: '600' },
  registerRow: { flexDirection: 'row', gap: spacing.xs, alignItems: 'center' },
  registerText: { fontSize: 14 },
});
