import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { post } from '@/api/client';
import { spacing } from '@/theme/spacing';

export default function ForgotPasswordScreen(): React.JSX.Element {
  const { isRTL } = useI18n();
  const { colors } = useTheme();
  const [login, setLogin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    setError('');
    if (!login.trim()) {
      setError(isRTL ? 'أدخل بريدك الإلكتروني أو رقم هاتفك' : 'Enter your email or phone');
      return;
    }
    setLoading(true);
    try {
      await post('/forgot-password', { login: login.trim() }, { auth: false });
      setSent(true);
    } catch (e: unknown) {
      const msg = (e as { data?: { message?: string }; message?: string }).data?.message
        ?? (e as { message?: string }).message
        ?? (isRTL ? 'حدث خطأ، حاول مجدداً' : 'Something went wrong');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Screen>
        <View style={styles.center}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '18' }]}>  
            <Text style={[styles.iconEmoji, { color: colors.primary }]}>✓</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            {isRTL ? 'تم الإرسال' : 'Email Sent'}
          </Text>
          <Text style={[styles.desc, { color: colors.textMuted }]}>
            {isRTL
              ? 'إذا كان حسابك مرتبطاً ببريد إلكتروني أو رقم هاتف، ستصل رسالة إعادة التعيين خلال دقائق.'
              : 'If your account is linked to an email or phone, you\'ll receive a reset link shortly.'}
          </Text>
          <Button
            title={isRTL ? 'العودة لتسجيل الدخول' : 'Back to login'}
            variant="outline"
            fullWidth
            onPress={() => {}}
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
          <Text style={[styles.iconEmoji, { color: colors.primary }]}>✉</Text>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>
          {isRTL ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
        </Text>
        <Text style={[styles.desc, { color: colors.textMuted }]}>
          {isRTL
            ? 'أدخل بريدك الإلكتروني أو رقم هاتفك وسنرسل لك رابطاً لإعادة التعيين'
            : 'Enter your email or phone and we\'ll send you a reset link'}
        </Text>

        <View style={styles.form}>
          <Input
            label={isRTL ? 'البريد الإلكتروني أو رقم الهاتف' : 'Email or phone'}
            placeholder={isRTL ? 'أدخل البريد أو الهاتف' : 'Enter email or phone'}
            value={login}
            onChangeText={(v: string) => { setLogin(v); setError(''); }}
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
            autoComplete="email"
            error={error}
          />

          <Button
            title={isRTL ? 'إرسال رابط إعادة التعيين' : 'Send Reset Link'}
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
