import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { post } from '@/api/client';
import { spacing } from '@/theme/spacing';

type Status = 'validating' | 'valid' | 'invalid';

export default function ResetPasswordScreen(): React.JSX.Element {
  const router = useRouter();
  const { isRTL } = useI18n();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ token?: string; email?: string }>();

  const [status, setStatus] = useState<Status>('validating');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const token = params.token;
    const email = params.email;
    if (!token || !email) {
      setStatus('invalid');
      return;
    }
    post<{ valid?: boolean }>('/forgot-password/validate-token', { token, login: decodeURIComponent(email) }, { auth: false })
      .then((res) => setStatus(res.valid ? 'valid' : 'invalid'))
      .catch(() => setStatus('invalid'));
  }, [params.token, params.email]);

  const handleSubmit = async () => {
    setError('');
    if (!password) {
      setError(isRTL ? 'أدخل كلمة المرور الجديدة' : 'Enter a new password');
      return;
    }
    if (password.length < 8) {
      setError(isRTL ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters');
      return;
    }
    if (password !== passwordConfirm) {
      setError(isRTL ? 'كلمتا المرور غير متطابقتين' : 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await post('/reset-password', {
        token: params.token,
        login: decodeURIComponent(params.email ?? ''),
        password,
        password_confirmation: passwordConfirm,
      }, { auth: false });
      setSuccess(true);
    } catch (e: unknown) {
      const msg = (e as { data?: { message?: string }; message?: string }).data?.message
        ?? (e as { message?: string }).message
        ?? (isRTL ? 'الرابط غير صالح أو منتهي الصلاحية' : 'Invalid or expired link');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'validating') {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={[styles.spinner, { color: colors.primary }]}>⏳</Text>
          <Text style={[styles.desc, { color: colors.textMuted }]}>
            {isRTL ? 'جارٍ التحقق من صلاحية الرابط…' : 'Validating link…'}
          </Text>
        </View>
      </Screen>
    );
  }

  if (status === 'invalid' && !success) {
    return (
      <Screen>
        <View style={styles.center}>
          <View style={[styles.iconCircle, { backgroundColor: colors.danger + '18' }]}>
            <Text style={[styles.iconEmoji, { color: colors.danger }]}>✕</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {isRTL ? 'الرابط غير صالح' : 'Invalid Link'}
          </Text>
          <Text style={[styles.desc, { color: colors.textMuted }]}>
            {isRTL ? 'اطلب رابطاً جديداً لإعادة تعيين كلمة المرور' : 'Request a new password reset link'}
          </Text>
          <Button
            title={isRTL ? 'طلب رابط جديد' : 'Request New Link'}
            variant="primary"
            fullWidth
            onPress={() => router.replace('/(auth)/forgot-password')}
            style={{ marginTop: spacing['2xl'] }}
          />
          <Button
            title={isRTL ? 'العودة' : 'Go Back'}
            variant="ghost"
            fullWidth
            onPress={() => router.replace('/(auth)')}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      </Screen>
    );
  }

  if (success) {
    return (
      <Screen>
        <View style={styles.center}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '18' }]}>
            <Text style={[styles.iconEmoji, { color: colors.primary }]}>✓</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {isRTL ? 'تم تحديث كلمة المرور' : 'Password Updated'}
          </Text>
          <Text style={[styles.desc, { color: colors.textMuted }]}>
            {isRTL ? 'يمكنك الآن تسجيل الدخول بكلمة المرور الجديدة' : 'You can now log in with your new password'}
          </Text>
          <Button
            title={isRTL ? 'تسجيل الدخول' : 'Log In'}
            fullWidth
            onPress={() => router.replace('/(auth)')}
            style={{ marginTop: spacing['2xl'] }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.center}>
        <View style={[styles.iconCircle, { backgroundColor: colors.primary + '18' }]}>
          <Text style={[styles.iconEmoji, { color: colors.primary }]}>🔑</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          {isRTL ? 'كلمة مرور جديدة' : 'New Password'}
        </Text>
        <Text style={[styles.desc, { color: colors.textMuted }]}>
          {isRTL ? 'أنشئ كلمة مرور جديدة لحسابك' : 'Create a new password for your account'}
        </Text>

        <View style={styles.form}>
          <Input
            label={isRTL ? 'كلمة المرور الجديدة' : 'New Password'}
            placeholder={isRTL ? '8 أحرف على الأقل' : 'At least 8 characters'}
            value={password}
            onChangeText={(v: string) => { setPassword(v); setError(''); }}
            secureTextEntry={!showPassword}
            textContentType="newPassword"
            autoComplete="new-password"
          />

          <Input
            label={isRTL ? 'تأكيد كلمة المرور' : 'Confirm Password'}
            placeholder={isRTL ? 'أعد إدخال كلمة المرور' : 'Re-enter password'}
            value={passwordConfirm}
            onChangeText={(v: string) => { setPasswordConfirm(v); setError(''); }}
            secureTextEntry={!showPassword}
            textContentType="newPassword"
            autoComplete="new-password"
            error={error}
          />

          <Button
            title={isRTL ? 'حفظ كلمة المرور الجديدة' : 'Save New Password'}
            onPress={handleSubmit}
            loading={loading}
            disabled={loading}
            fullWidth
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  iconEmoji: { fontSize: 28 },
  spinner: { fontSize: 32 },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  desc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.lg,
  },
  form: {
    width: '100%',
    marginTop: spacing['2xl'],
    gap: spacing.lg,
  },
});
