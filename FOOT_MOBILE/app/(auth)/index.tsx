import React, { useState } from 'react';
import { Link, useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Phone,
  Smartphone,
} from 'lucide-react-native';

import { Screen } from '@/components/ui/Screen';
import { AjiNqssroLogo } from '@/components/ui/AjiNqssroLogo';
import { useAuth } from '@/auth/AuthProvider';
import { homeForRole } from '@/auth/homeForRole';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';
import { cleanPhoneNumber, formatPhoneDisplay } from '@/utils';

export default function LoginScreen(): React.JSX.Element {
  const { login, getLoginErrorMessage, role } = useAuth();
  const { isRTL } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();

  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');

    const loginIdentifier = phone.includes('@') ? phone.trim() : cleanPhoneNumber(phone);

    if (!loginIdentifier) {
      setError('يرجى إدخال رقم الهاتف أو البريد الإلكتروني');
      return;
    }
    if (!password) {
      setError('يرجى إدخال كلمة المرور');
      return;
    }

    setLoading(true);
    try {
      await login(loginIdentifier, password);
      router.replace(homeForRole(role));
    } catch (e: unknown) {
      setError(getLoginErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const ForwardArrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Logo */}
          <View style={styles.logoWrap}>
            <AjiNqssroLogo size={58} />
          </View>

          {/* Title */}
          <View style={styles.titleWrap}>
            <Text style={[styles.mainTitle, { color: colors.text }]}>
              تسجيل الدخول
            </Text>
          </View>

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorAlert}>
              <Text style={styles.errorAlertText}>{error}</Text>
            </View>
          ) : null}

          {/* Form Fields */}
          <View style={styles.form}>
            {/* Phone Number Field */}
            <View style={styles.inputFieldBox}>
              <TextInput
                style={[styles.textInput, { color: colors.text, textAlign: 'right' }]}
                placeholder="06 XX XX XX XX"
                placeholderTextColor="#94A3B8"
                value={phone}
                onChangeText={(v) => {
                  setPhone(v.includes('@') ? v : formatPhoneDisplay(v));
                  setError('');
                }}
                keyboardType="phone-pad"
                autoCapitalize="none"
                textContentType="username"
              />
              <View style={styles.inputIconWrap}>
                <Phone size={20} color="#94A3B8" />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputFieldBox}>
              <Pressable
                onPress={() => setShowPassword((prev) => !prev)}
                hitSlop={10}
                style={styles.eyeToggle}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? (
                  <EyeOff size={20} color="#94A3B8" />
                ) : (
                  <Eye size={20} color="#94A3B8" />
                )}
              </Pressable>

              <TextInput
                style={[styles.textInput, { color: colors.text, textAlign: 'right' }]}
                placeholder="كلمة المرور"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setError('');
                }}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={!showPassword}
                textContentType="password"
                onSubmitEditing={handleSubmit}
                returnKeyType="go"
              />

              <View style={styles.inputIconWrap}>
                <Lock size={20} color="#94A3B8" />
              </View>
            </View>

            {/* Primary Action: دخول → */}
            <Pressable
              onPress={() => void handleSubmit()}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryPillBtn,
                {
                  opacity: loading ? 0.7 : pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="دخول"
            >
              <Text style={styles.primaryPillBtnText}>
                {loading ? 'جاري الدخول...' : 'دخول'}
              </Text>
              <ForwardArrow size={20} color="#FFFFFF" strokeWidth={2.4} />
            </Pressable>

            {/* Forgot Password Link */}
            <View style={styles.forgotWrap}>
              <Link href="/(auth)/forgot-password" asChild>
                <Pressable hitSlop={10}>
                  <Text style={styles.forgotText}>نسيت كلمة المرور؟</Text>
                </Pressable>
              </Link>
            </View>
          </View>

          {/* Tip Banner from the sheet */}
          <View style={styles.tipCard}>
            <View style={styles.tipIconWrap}>
              <Smartphone size={22} color="#059669" />
            </View>
            <Text style={styles.tipText}>
              يمكنك تفعيل حفظ بيانات الدخول على هاتفك لتسهيل الولوج لاحقاً.
            </Text>
          </View>

          {/* Register Link */}
          <View style={styles.registerWrap}>
            <Text style={[styles.registerMuted, { color: '#64748B' }]}>
              ليس لديك حساب؟
            </Text>
            <Link href="/(auth)/account-type" asChild>
              <Pressable hitSlop={10}>
                <Text style={styles.registerLink}>أنشئ حسابك الآن</Text>
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
  scroll: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
    justifyContent: 'center',
  },
  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  titleWrap: {
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  errorAlert: {
    backgroundColor: '#FEE2E2',
    borderColor: '#F87171',
    borderWidth: 1,
    borderRadius: 14,
    padding: spacing.md,
  },
  errorAlertText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  form: {
    gap: spacing.md,
  },
  inputFieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 16,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  inputIconWrap: {
    marginStart: 12,
  },
  eyeToggle: {
    marginEnd: 12,
    padding: 4,
  },
  primaryPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#059669',
    height: 54,
    borderRadius: 27,
    marginTop: spacing.xs,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryPillBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  forgotWrap: {
    alignItems: 'center',
    marginTop: 4,
  },
  forgotText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  tipIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    flex: 1,
    color: '#166534',
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'right',
  },
  registerWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
  },
  registerMuted: {
    fontSize: 14,
  },
  registerLink: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '800',
  },
});
