import { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { BrandLogoMark } from '@/components/ui/illustrations';
import { useAuth } from '@/auth/AuthProvider';
import { homeForRole } from '@/auth/homeForRole';
import { useI18n } from '@/i18n/I18nProvider';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, sizes, spacing } from '@/theme/spacing';

export default function LoginScreen(): React.JSX.Element {
  const { login, getLoginErrorMessage, role } = useAuth();
  const { t, isRTL } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();

  const [loginField, setLoginField] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (!loginField.trim()) {
      setError(t('auth.emailOrPhoneRequired', 'يرجى إدخال البريد الإلكتروني أو رقم الهاتف'));
      return;
    }
    if (!password) {
      setError(t('auth.passwordRequired', 'يرجى إدخال كلمة المرور'));
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

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  return (
    <Screen>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* Top Return to Landing Bar */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.replace('/(public)')}
            style={({ pressed }) => [styles.backButton, { opacity: pressed ? 0.7 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel={t('nav.backToLanding', 'العودة للصفحة الرئيسية')}
          >
            <View style={[styles.backIconCircle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <BackArrow size={18} color={colors.text} />
            </View>
            <Text style={[styles.backText, { color: colors.text }]}>
              {t('nav.backToLanding', 'الصفحة الرئيسية')}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Header */}
          <View style={styles.header}>
            <BrandLogoMark size={70} />
            <AppText variant="h1" align="center" style={styles.title}>
              {t('auth.welcomeBack', 'مرحباً بعودتك')}
            </AppText>
            <AppText variant="body" muted align="center" style={styles.subtitle}>
              {t('auth.enterCredentials', 'سجّل الدخول للمتابعة إلى حسابك')}
            </AppText>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.danger + '14', borderColor: colors.danger + '40' }]}>
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
              </View>
            ) : null}

            <Input
              label={t('auth.emailOrPhone', 'البريد أو الهاتف')}
              placeholder={t('auth.emailOrPhonePlaceholder', 'example@domain.com / 06...')}
              value={loginField}
              onChangeText={(v: string) => {
                setLoginField(v);
                setError('');
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              textContentType="username"
              autoComplete="username"
            />

            <View>
              <Input
                label={t('auth.password', 'كلمة المرور')}
                placeholder={t('auth.passwordPlaceholder', '••••••••')}
                value={password}
                onChangeText={(v: string) => {
                  setPassword(v);
                  setError('');
                }}
                secureTextEntry={!showPassword}
                textContentType="password"
                autoComplete="password"
                onSubmitEditing={handleSubmit}
                returnKeyType="go"
              />
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                hitSlop={12}
                style={styles.passwordToggle}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? (
                  <EyeOff size={20} color={colors.textMuted} />
                ) : (
                  <Eye size={20} color={colors.textMuted} />
                )}
              </Pressable>
            </View>

            <View style={styles.forgotRow}>
              <Link href="/(auth)/forgot-password" asChild>
                <Pressable hitSlop={10}>
                  <Text style={[styles.forgotText, { color: palette.primaryGreen }]}>
                    {t('auth.forgotPassword', 'نسيت كلمة المرور؟')}
                  </Text>
                </Pressable>
              </Link>
            </View>

            <Button
              title={t('auth.login', 'تسجيل الدخول')}
              onPress={handleSubmit}
              loading={loading}
              disabled={loading}
              fullWidth
              size="lg"
            />
          </View>

          {/* Social Login Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
            <Text style={[styles.dividerText, { color: colors.textMuted }]}>
              {t('auth.orContinueWith', 'أو تابع عبر')}
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
          </View>

          {/* Social Action Tiles */}
          <View style={styles.socialRow}>
            <View style={[styles.socialTile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.socialIcon}>G</Text>
              <Text style={[styles.socialLabel, { color: colors.text }]}>Google</Text>
            </View>
            <View style={[styles.socialTile, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.socialIcon}></Text>
              <Text style={[styles.socialLabel, { color: colors.text }]}>Apple</Text>
            </View>
          </View>

          {/* Don't have an account */}
          <View style={styles.registerRow}>
            <Text style={[styles.registerText, { color: colors.textMuted }]}>
              {t('auth.dontHaveAccount', 'ليس لديك حساب؟')}
            </Text>
            <Link href="/(auth)/account-type" asChild>
              <Pressable hitSlop={10}>
                <Text style={[styles.registerLink, { color: palette.primaryGreen }]}>
                  {t('auth.createAccountLink', 'إنشاء حساب جديد')}
                </Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: sizes.touchTarget,
  },
  backIconCircle: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.lg,
    paddingVertical: spacing.sm,
  },
  header: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    maxWidth: 320,
  },
  form: {
    gap: spacing.md,
  },
  passwordToggle: {
    position: 'absolute',
    end: 14,
    top: 38,
    height: 36,
    justifyContent: 'center',
  },
  forgotRow: {
    alignItems: 'flex-end',
    marginTop: -4,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '700',
  },
  errorBanner: {
    borderRadius: radius.medium,
    borderWidth: 1,
    padding: spacing.md,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginVertical: spacing.xs,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 12,
    fontWeight: '600',
  },
  socialRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  socialTile: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: sizes.buttonHeightMd,
    borderRadius: radius.large,
    borderWidth: 1,
  },
  socialIcon: {
    fontSize: 18,
    fontWeight: '800',
  },
  socialLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  registerText: {
    fontSize: 14,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '800',
  },
});

