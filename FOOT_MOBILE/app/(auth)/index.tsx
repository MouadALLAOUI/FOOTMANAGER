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
  Sparkles,
} from 'lucide-react-native';

import { Screen } from '@/components/ui/Screen';
import { AjiNqssroLogo } from '@/components/ui/AjiNqssroLogo';
import { useAuth } from '@/auth/AuthProvider';
import { homeForRole } from '@/auth/homeForRole';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';
import { cleanPhoneNumber, formatPhoneDisplay } from '@/utils';
import { setPreviewModeActive } from '@/preview/previewState';

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

          {/* Development Preview Mode Card */}
          {__DEV__ && (
            <View style={styles.previewCard}>
              <View style={styles.previewCardHeader}>
                <Sparkles size={18} color={colors.charcoal} />
                <Text style={styles.previewCardTitle}>
                  وضع المعاينة السريعة (Preview Mode)
                </Text>
              </View>
              <Text style={styles.previewCardDesc}>
                استعرض واختبر جميع واجهات التطبيق محلياً بدون تسجيل دخول وبدون الحاجة للاتصال بالسيرفر.
              </Text>
              <Pressable
                onPress={() => {
                  setPreviewModeActive(true);
                  router.push('/(public)/preview');
                }}
                style={({ pressed }) => [
                  styles.previewCardBtn,
                  pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                ]}
                accessibilityRole="button"
              >
                <Text style={styles.previewCardBtnText}>
                  فتح دليل الشاشات والتجربة 🎨
                </Text>
              </Pressable>
            </View>
          )}

          {/* Error Banner */}
          {error ? (
            <View style={styles.errorAlert}>
              <Text style={styles.errorAlertText}>{error}</Text>
            </View>
          ) : null}

          {/* Form */}
          <View style={styles.form}>
            {/* Phone/Email Field */}
            <View style={styles.inputFieldBox}>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    color: colors.text,
                    textAlign: isRTL ? 'right' : 'left',
                  },
                ]}
                placeholder="رقم الهاتف أو البريد الإلكتروني"
                placeholderTextColor="#94A3B8"
                value={phone}
                onChangeText={(val) => {
                  // Only format if digits-only
                  if (/^\d*$/.test(val.replace(/\s+/g, ''))) {
                    setPhone(formatPhoneDisplay(val));
                  } else {
                    setPhone(val);
                  }
                }}
                keyboardType="default"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.inputIconWrap}>
                <Phone size={20} color="#94A3B8" />
              </View>
            </View>

            {/* Password Field */}
            <View style={styles.inputFieldBox}>
              <Pressable
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeToggle}
                hitSlop={8}
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
                style={[
                  styles.textInput,
                  {
                    color: colors.text,
                    textAlign: isRTL ? 'right' : 'left',
                  },
                ]}
                placeholder="كلمة المرور"
                placeholderTextColor="#94A3B8"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />

              <View style={styles.inputIconWrap}>
                <Lock size={20} color="#94A3B8" />
              </View>
            </View>

            {/* Submit Button */}
            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryPillBtn,
                pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
                loading && { opacity: 0.6 },
              ]}
              accessibilityRole="button"
            >
              <Text style={styles.primaryPillBtnText}>
                {loading ? 'جاري الدخول...' : 'دخول'}
              </Text>
              {!loading && <ForwardArrow size={18} color="#101418" strokeWidth={2.5} />}
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
              <Smartphone size={22} color={colors.charcoal} />
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
  previewCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E2E6E9',
    borderRadius: 18,
    padding: 16,
    gap: 8,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 2,
  },
  previewCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  previewCardTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#101418',
    textAlign: 'right',
  },
  previewCardDesc: {
    fontSize: 12,
    color: '#4B5563',
    textAlign: 'right',
    lineHeight: 18,
  },
  previewCardBtn: {
    backgroundColor: '#101418',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  previewCardBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
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
    backgroundColor: '#A8FF24',
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
    color: '#101418',
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
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E6E9',
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
    backgroundColor: 'rgba(168, 255, 36, 0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    flex: 1,
    color: '#101418',
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
