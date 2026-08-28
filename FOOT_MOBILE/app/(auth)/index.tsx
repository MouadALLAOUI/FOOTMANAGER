import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/auth/AuthProvider';
import { homeForRole } from '@/auth/homeForRole';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';

export default function LoginScreen(): React.JSX.Element {
  const { login, getLoginErrorMessage, role } = useAuth();
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();

  const [loginField, setLoginField] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (!loginField.trim()) {
      setError(t('auth.emailOrPhoneRequired'));
      return;
    }
    if (!password) {
      setError(t('auth.passwordRequired'));
      return;
    }

    setLoading(true);
    try {
      await login(loginField.trim(), password);
      router.replace(homeForRole(role));
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
            <AppText variant="h1" align="center">
              {t('auth.loginTitle')}
            </AppText>
            <AppText variant="label" muted align="center">
              {t('auth.enterCredentials')}
            </AppText>
          </View>

          <View style={styles.form}>
            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.danger + '12' }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              </View>
            ) : null}

            <Input
              label={t('auth.emailOrPhone')}
              placeholder={t('auth.emailOrPhonePlaceholder')}
              value={loginField}
              onChangeText={(v: string) => { setLoginField(v); setError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="username"
              autoComplete="username"
            />

            <Input
              label={t('auth.password')}
              placeholder={t('auth.passwordPlaceholder')}
              value={password}
              onChangeText={(v: string) => { setPassword(v); setError(''); }}
              secureTextEntry
              textContentType="password"
              autoComplete="password"
              onSubmitEditing={handleSubmit}
              returnKeyType="go"
            />

            <Button
              title={t('auth.login')}
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              fullWidth
            />
          </View>

          <View style={styles.links}>
            <Link href="/(auth)/forgot-password" asChild>
              <Text style={StyleSheet.flatten([styles.link, { color: colors.primary }])}>
                {t('auth.forgotPassword')}
              </Text>
            </Link>

            <View style={styles.registerRow}>
              <Text style={StyleSheet.flatten([styles.registerText, { color: colors.textMuted }])}>
                {t('auth.dontHaveAccount')}
              </Text>
              <Link href="/(auth)/register" asChild>
                <Text style={StyleSheet.flatten([styles.link, { color: colors.primary }])}>
                  {t('auth.createAccountLink')}
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
