import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Globe,
  Lock,
  ShieldCheck,
  Smartphone,
  User,
} from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { homeForRole } from '@/auth/homeForRole';
import { useI18n } from '@/i18n/I18nProvider';
import { persistentStorage } from '@/services/storage/persistent-storage';
import { cleanPhoneNumber, formatPhoneDisplay, getPasswordStrength } from '@/utils';
import { get } from '@/api/client';
import { getValidationErrors, getUserMessage, isValidationError } from '@/api/errors';
import type { SupportedLocale } from '@/types';

// ── Official Google Multi-Colored "G" Icon ─────────────────────────
function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <Path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <Path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <Path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </Svg>
  );
}

// ── Live Password Strength Indicator ──────────────────────────────
function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = getPasswordStrength(password);
  if (!password) return null;

  return (
    <View style={styles.strengthMeterContainer}>
      <View style={styles.strengthBarsRow}>
        <View
          style={[
            styles.strengthBar,
            { backgroundColor: strength.score >= 1 ? strength.color : '#E2E8F0' },
          ]}
        />
        <View
          style={[
            styles.strengthBar,
            { backgroundColor: strength.score >= 2 ? strength.color : '#E2E8F0' },
          ]}
        />
        <View
          style={[
            styles.strengthBar,
            { backgroundColor: strength.score >= 3 ? strength.color : '#E2E8F0' },
          ]}
        />
      </View>
      <View style={styles.strengthInfoRow}>
        <Text style={[styles.strengthLabelText, { color: strength.color }]}>
          قوة كلمة المرور: {strength.labelAr}
        </Text>
        <Text style={styles.strengthHintText}>{strength.feedbackAr}</Text>
      </View>
    </View>
  );
}

interface CountryOption {
  code: string;
  flag: string;
  nameAr: string;
}

const COUNTRIES: CountryOption[] = [
  { code: '+212', flag: '🇲🇦', nameAr: 'المغرب' },
  { code: '+33', flag: '🇫🇷', nameAr: 'فرنسا' },
  { code: '+34', flag: '🇪🇸', nameAr: 'إسبانيا' },
];

interface LanguageOption {
  key: SupportedLocale;
  name: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  { key: 'ar', name: 'العربية', flag: '🇲🇦' },
  { key: 'fr', name: 'Français', flag: '🇫🇷' },
  { key: 'en', name: 'English', flag: '🇬🇧' },
];

export default function ManagerAuthScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const { login, register, getLoginErrorMessage, role } = useAuth();
  const { locale, setLocale, isRTL } = useI18n();

  // Tab State: derived with optional user override
  const defaultTab = params.tab === 'register' ? 'register' : 'login';
  const [selectedTab, setSelectedTab] = useState<'login' | 'register' | null>(null);
  const activeTab = selectedTab ?? defaultTab;

  // Common UI State
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Modals State
  const [selectedCountry, setSelectedCountry] = useState<CountryOption>(COUNTRIES[0]);
  const [showCountryModal, setShowCountryModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);

  // ── Login Form State ──
  const [loginPhone, setLoginPhone] = useState<string>(() => {
    try {
      const saved = persistentStorage.getString('auth.rememberedPhone');
      return saved ? formatPhoneDisplay(saved) : '';
    } catch {
      return '';
    }
  });
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // ── Register Form State ──
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Reset errors when switching tabs
  const handleTabChange = (tab: 'login' | 'register') => {
    setSelectedTab(tab);
    setGlobalError('');
    setFieldErrors({});
  };

  // ── Validation Helpers ──
  const validateMoroccanPhone = (phone: string): boolean => {
    const cleaned = cleanPhoneNumber(phone);
    // Standard Moroccan mobile: 9 digits starting with 6 or 7, or 10 digits starting with 06 or 07
    if (/^(0[67]\d{8}|[67]\d{8})$/.test(cleaned)) {
      return true;
    }
    // Also accept 9 digits for other phone prefixes if length matches
    return cleaned.length >= 9 && cleaned.length <= 10;
  };

  // ── Handle Login ──
  const handleLoginSubmit = async () => {
    setGlobalError('');
    setFieldErrors({});

    const cleaned = cleanPhoneNumber(loginPhone);
    if (!cleaned) {
      setGlobalError('يرجى إدخال رقم الهاتف');
      return;
    }
    if (!validateMoroccanPhone(loginPhone)) {
      setGlobalError('يرجى إدخال رقم هاتف مغربي صحيح (مثال: 0612345678)');
      return;
    }
    if (!loginPassword) {
      setGlobalError('يرجى إدخال كلمة المرور');
      return;
    }

    setLoading(true);
    try {
      if (rememberMe) {
        persistentStorage.setString('auth.rememberedPhone', cleaned);
      } else {
        persistentStorage.remove('auth.rememberedPhone');
      }

      await login(cleaned, loginPassword);
      router.replace(homeForRole(role));
    } catch (e: unknown) {
      setGlobalError(getLoginErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  // ── Handle Register ──
  const handleRegisterSubmit = async () => {
    setGlobalError('');
    setFieldErrors({});

    const trimmedName = registerName.trim();
    if (!trimmedName || trimmedName.length < 3) {
      setGlobalError('يرجى إدخال الاسم الكامل (3 أحرف على الأقل)');
      return;
    }

    const cleaned = cleanPhoneNumber(registerPhone);
    if (!cleaned) {
      setGlobalError('يرجى إدخال رقم الهاتف');
      return;
    }
    if (!validateMoroccanPhone(registerPhone)) {
      setGlobalError('يرجى إدخال رقم هاتف مغربي صحيح (مثال: 0612345678)');
      return;
    }

    if (!registerPassword || registerPassword.length < 8) {
      setGlobalError('يجب أن تتكون كلمة المرور من 8 أحرف على الأقل');
      return;
    }

    if (registerPassword !== confirmPassword) {
      setGlobalError('كلمتا المرور غير متطابقتين');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: trimmedName,
        phone: cleaned,
        password: registerPassword,
        role: 'manager',
      });
      // Registration successful: user defaults to 'pending'
      router.replace('/(auth)/account-pending');
    } catch (e: unknown) {
      if (isValidationError(e)) {
        const errors = getValidationErrors(e);
        if (errors) {
          setFieldErrors(errors);
          const firstErr = Object.values(errors)[0]?.[0];
          setGlobalError(firstErr || getUserMessage(e));
        } else {
          setGlobalError(getUserMessage(e));
        }
      } else {
        setGlobalError(getUserMessage(e));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Handle Google OAuth ──
  const handleGoogleAuth = async () => {
    setGlobalError('');
    setGoogleLoading(true);
    try {
      const res = await get<{ url: string }>('/auth/google/redirect?role=manager&json=1');
      if (res?.url) {
        await Linking.openURL(res.url);
      } else {
        setGlobalError('تعذر الحصول على رابط تسجيل الدخول عبر Google');
      }
    } catch (e: unknown) {
      setGlobalError(getUserMessage(e, 'تعذر الاتصال بخدمة Google'));
    } finally {
      setGoogleLoading(false);
    }
  };

  // Handle back button navigation
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/account-type');
    }
  };

  const ForwardArrow = isRTL ? ChevronLeft : ChevronRight;
  const BackArrow = isRTL ? ChevronRight : ChevronLeft;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Decorative Stadium Background Pattern */}
      <Image
        source={require('../../assets/role-selection-bg.png')}
        style={styles.bgImage}
        resizeMode="cover"
      />

      {/* Top Bar: Back, Brand Emblem & Language Picker */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        {/* Back Button */}
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.iconButton,
            { opacity: pressed ? 0.7 : 1 },
          ]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="رجوع"
        >
          <BackArrow size={22} color="#0B192C" strokeWidth={2.4} />
        </Pressable>

        {/* Brand Emblem */}
        <View style={styles.brandCenter}>
          <Image
            source={require('../../assets/role-header-logo.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>AJI NQSSRO</Text>
        </View>

        {/* Language Selector Pill */}
        <Pressable
          onPress={() => setShowLangModal(true)}
          style={({ pressed }) => [
            styles.langSelector,
            { opacity: pressed ? 0.8 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="تغيير اللغة"
        >
          <Globe size={15} color="#00875A" />
          <Text style={styles.langSelectorText}>
            {LANGUAGES.find((l) => l.key === locale)?.name ?? 'العربية'}
          </Text>
          <ChevronDown size={14} color="#64748B" />
        </Pressable>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Hero Header: Coach Illustration & Role Title ─── */}
          <View style={styles.heroRow}>
            {/* Coach Illustration */}
            <View style={styles.coachWrap}>
              <Image
                source={require('../../assets/manager-auth-coach.png')}
                style={styles.coachImage}
                resizeMode="contain"
              />
            </View>

            {/* Welcome & Role Info */}
            <View style={styles.heroInfo}>
              <View style={styles.badgeRow}>
                <Text style={styles.welcomeText}>مرحبًا بك 👋</Text>
              </View>
              <Text style={styles.roleTitle}>مسيّر الفريق</Text>
              <Text style={styles.roleSubtitle}>
                سجّل الدخول أو أنشئ حساباً جديداً لإدارة فريقك والوصول إلى كافة خدمات المنصة.
              </Text>
            </View>
          </View>

          {/* ─── Main White Auth Card ─── */}
          <View style={styles.cardContainer}>
            {/* Tab Switcher: "تسجيل الدخول" vs "إنشاء حساب جديد" */}
            <View style={styles.tabContainer}>
              <Pressable
                onPress={() => handleTabChange('login')}
                style={[
                  styles.tabButton,
                  activeTab === 'login' && styles.tabButtonActive,
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'login' }}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'login' && styles.tabButtonTextActive,
                  ]}
                >
                  تسجيل الدخول
                </Text>
              </Pressable>

              <Pressable
                onPress={() => handleTabChange('register')}
                style={[
                  styles.tabButton,
                  activeTab === 'register' && styles.tabButtonActive,
                ]}
                accessibilityRole="tab"
                accessibilityState={{ selected: activeTab === 'register' }}
              >
                <Text
                  style={[
                    styles.tabButtonText,
                    activeTab === 'register' && styles.tabButtonTextActive,
                  ]}
                >
                  إنشاء حساب جديد
                </Text>
              </Pressable>
            </View>

            {/* Global Error Banner */}
            {globalError ? (
              <View style={styles.errorAlert}>
                <AlertCircle size={18} color="#DC2626" />
                <Text style={styles.errorAlertText}>{globalError}</Text>
              </View>
            ) : null}

            {/* ─── Tab Content ─── */}
            {activeTab === 'login' ? (
              /* ── LOGIN FORM ── */
              <View style={styles.formWrap}>
                {/* Phone Input with Country Selector */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>رقم الهاتف</Text>
                  <View style={styles.phoneInputRow}>
                    <Pressable
                      onPress={() => setShowCountryModal(true)}
                      style={styles.countryPickerBtn}
                      accessibilityRole="button"
                      accessibilityLabel="رمز الدولة"
                    >
                      <Text style={styles.flagEmoji}>{selectedCountry.flag}</Text>
                      <Text style={styles.countryCodeText}>{selectedCountry.code}</Text>
                      <ChevronDown size={14} color="#64748B" />
                    </Pressable>

                    <TextInput
                      value={loginPhone}
                      onChangeText={(t) => setLoginPhone(formatPhoneDisplay(t))}
                      placeholder="06 12 34 56 78"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      maxLength={14}
                      style={styles.phoneTextInput}
                      textAlign={isRTL ? 'right' : 'left'}
                      autoCapitalize="none"
                    />

                    <View style={styles.inputPrefixIcon}>
                      <Smartphone size={18} color="#94A3B8" />
                    </View>
                  </View>
                </View>

                {/* Password Input */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>كلمة المرور</Text>
                  <View style={styles.passwordInputRow}>
                    <TextInput
                      value={loginPassword}
                      onChangeText={setLoginPassword}
                      placeholder="••••••••"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showLoginPassword}
                      style={styles.passwordTextInput}
                      textAlign={isRTL ? 'right' : 'left'}
                      autoCapitalize="none"
                    />

                    <Pressable
                      onPress={() => setShowLoginPassword((prev) => !prev)}
                      style={styles.eyeToggleBtn}
                      hitSlop={12}
                      accessibilityRole="button"
                      accessibilityLabel={showLoginPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    >
                      {showLoginPassword ? (
                        <EyeOff size={18} color="#64748B" />
                      ) : (
                        <Eye size={18} color="#64748B" />
                      )}
                    </Pressable>

                    <View style={styles.inputPrefixIcon}>
                      <Lock size={18} color="#94A3B8" />
                    </View>
                  </View>
                </View>

                {/* Options Row: Remember Me & Forgot Password */}
                <View style={styles.optionsRow}>
                  {/* Remember Me Checkbox */}
                  <Pressable
                    onPress={() => setRememberMe((prev) => !prev)}
                    style={styles.rememberMeWrap}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: rememberMe }}
                  >
                    <View
                      style={[
                        styles.checkboxBox,
                        rememberMe && styles.checkboxBoxActive,
                      ]}
                    >
                      {rememberMe ? <Check size={13} color="#FFFFFF" strokeWidth={3} /> : null}
                    </View>
                    <Text style={styles.rememberMeText}>تذكرني</Text>
                  </Pressable>

                  {/* Forgot Password Link */}
                  <Pressable
                    onPress={() => router.push('/(auth)/forgot-password')}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="نسيت كلمة المرور؟"
                  >
                    <Text style={styles.forgotPasswordText}>نسيت كلمة المرور؟</Text>
                  </Pressable>
                </View>

                {/* Primary Button: تسجيل الدخول */}
                <Pressable
                  onPress={handleLoginSubmit}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    { opacity: pressed || loading ? 0.88 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="تسجيل الدخول"
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>تسجيل الدخول</Text>
                      <ForwardArrow size={20} color="#FFFFFF" strokeWidth={2.6} />
                    </>
                  )}
                </Pressable>
              </View>
            ) : (
              /* ── REGISTER FORM ── */
              <View style={styles.formWrap}>
                {/* Full Name */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>الاسم الكامل</Text>
                  <View style={styles.standardInputRow}>
                    <TextInput
                      value={registerName}
                      onChangeText={setRegisterName}
                      placeholder="مثال: يوسف المنصوري"
                      placeholderTextColor="#94A3B8"
                      style={styles.standardTextInput}
                      textAlign={isRTL ? 'right' : 'left'}
                      autoCapitalize="words"
                    />
                    <View style={styles.inputPrefixIcon}>
                      <User size={18} color="#94A3B8" />
                    </View>
                  </View>
                  {fieldErrors.name ? (
                    <Text style={styles.fieldErrorText}>{fieldErrors.name[0]}</Text>
                  ) : null}
                </View>

                {/* Phone Input with Country Selector */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>رقم الهاتف</Text>
                  <View style={styles.phoneInputRow}>
                    <Pressable
                      onPress={() => setShowCountryModal(true)}
                      style={styles.countryPickerBtn}
                      accessibilityRole="button"
                    >
                      <Text style={styles.flagEmoji}>{selectedCountry.flag}</Text>
                      <Text style={styles.countryCodeText}>{selectedCountry.code}</Text>
                      <ChevronDown size={14} color="#64748B" />
                    </Pressable>

                    <TextInput
                      value={registerPhone}
                      onChangeText={(t) => setRegisterPhone(formatPhoneDisplay(t))}
                      placeholder="06 12 34 56 78"
                      placeholderTextColor="#94A3B8"
                      keyboardType="phone-pad"
                      maxLength={14}
                      style={styles.phoneTextInput}
                      textAlign={isRTL ? 'right' : 'left'}
                      autoCapitalize="none"
                    />

                    <View style={styles.inputPrefixIcon}>
                      <Smartphone size={18} color="#94A3B8" />
                    </View>
                  </View>
                  {fieldErrors.phone ? (
                    <Text style={styles.fieldErrorText}>{fieldErrors.phone[0]}</Text>
                  ) : null}
                </View>

                {/* Password Input */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>كلمة المرور (8 أحرف على الأقل)</Text>
                  <View style={styles.passwordInputRow}>
                    <TextInput
                      value={registerPassword}
                      onChangeText={setRegisterPassword}
                      placeholder="••••••••"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showRegisterPassword}
                      style={styles.passwordTextInput}
                      textAlign={isRTL ? 'right' : 'left'}
                      autoCapitalize="none"
                    />

                    <Pressable
                      onPress={() => setShowRegisterPassword((prev) => !prev)}
                      style={styles.eyeToggleBtn}
                      hitSlop={12}
                    >
                      {showRegisterPassword ? (
                        <EyeOff size={18} color="#64748B" />
                      ) : (
                        <Eye size={18} color="#64748B" />
                      )}
                    </Pressable>

                    <View style={styles.inputPrefixIcon}>
                      <Lock size={18} color="#94A3B8" />
                    </View>
                  </View>

                  {/* Password Strength Indicator */}
                  <PasswordStrengthMeter password={registerPassword} />
                  {fieldErrors.password ? (
                    <Text style={styles.fieldErrorText}>{fieldErrors.password[0]}</Text>
                  ) : null}
                </View>

                {/* Confirm Password Input */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>تأكيد كلمة المرور</Text>
                  <View style={styles.passwordInputRow}>
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      placeholder="••••••••"
                      placeholderTextColor="#94A3B8"
                      secureTextEntry={!showConfirmPassword}
                      style={styles.passwordTextInput}
                      textAlign={isRTL ? 'right' : 'left'}
                      autoCapitalize="none"
                    />

                    <Pressable
                      onPress={() => setShowConfirmPassword((prev) => !prev)}
                      style={styles.eyeToggleBtn}
                      hitSlop={12}
                    >
                      {showConfirmPassword ? (
                        <EyeOff size={18} color="#64748B" />
                      ) : (
                        <Eye size={18} color="#64748B" />
                      )}
                    </Pressable>

                    <View style={styles.inputPrefixIcon}>
                      <Lock size={18} color="#94A3B8" />
                    </View>
                  </View>
                </View>

                {/* Primary Button: إنشاء حساب جديد */}
                <Pressable
                  onPress={handleRegisterSubmit}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    { opacity: pressed || loading ? 0.88 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="إنشاء حساب جديد"
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.primaryButtonText}>إنشاء حساب جديد</Text>
                      <ForwardArrow size={20} color="#FFFFFF" strokeWidth={2.6} />
                    </>
                  )}
                </Pressable>
              </View>
            )}

            {/* ─── Divider: أو المتابعة مع ─── */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>أو عبر</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* ─── Google OAuth Button ─── */}
            <Pressable
              onPress={handleGoogleAuth}
              disabled={googleLoading}
              style={({ pressed }) => [
                styles.googleButton,
                { opacity: pressed || googleLoading ? 0.75 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="المتابعة مع Google"
            >
              {googleLoading ? (
                <ActivityIndicator size="small" color="#4285F4" />
              ) : (
                <>
                  <GoogleLogo size={20} />
                  <Text style={styles.googleButtonText}>المتابعة مع Google</Text>
                </>
              )}
            </Pressable>

            {/* ─── Security Badge Banner ─── */}
            <View style={styles.securityBadge}>
              <View style={styles.shieldIconWrap}>
                <ShieldCheck size={20} color="#00875A" />
              </View>
              <View style={styles.securityTextWrap}>
                <Text style={styles.securityTitle}>حساب آمن ومحمي</Text>
                <Text style={styles.securitySubtitle}>
                  بياناتك محمية وفق أعلى معايير الأمان والتشفير.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ─── Country Code Picker Modal ─── */}
      <Modal
        visible={showCountryModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCountryModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowCountryModal(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>اختر الدولة</Text>
            {COUNTRIES.map((c) => (
              <Pressable
                key={c.code}
                onPress={() => {
                  setSelectedCountry(c);
                  setShowCountryModal(false);
                }}
                style={[
                  styles.modalItem,
                  selectedCountry.code === c.code && styles.modalItemActive,
                ]}
              >
                <Text style={styles.modalItemFlag}>{c.flag}</Text>
                <Text style={styles.modalItemName}>{c.nameAr}</Text>
                <Text style={styles.modalItemCode}>{c.code}</Text>
                {selectedCountry.code === c.code ? (
                  <Check size={18} color="#00875A" />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* ─── Language Picker Modal ─── */}
      <Modal
        visible={showLangModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLangModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowLangModal(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>اختر لغة التطبيق</Text>
            {LANGUAGES.map((l) => (
              <Pressable
                key={l.key}
                onPress={() => {
                  setLocale(l.key);
                  setShowLangModal(false);
                }}
                style={[
                  styles.modalItem,
                  locale === l.key && styles.modalItemActive,
                ]}
              >
                <Text style={styles.modalItemFlag}>{l.flag}</Text>
                <Text style={styles.modalItemName}>{l.name}</Text>
                {locale === l.key ? (
                  <Check size={18} color="#00875A" />
                ) : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.18,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // ── Top Bar ──
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  brandCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 26,
    height: 26,
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0B192C',
    letterSpacing: 0.5,
  },
  langSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  langSelectorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0B192C',
  },

  // ── Hero Section ──
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 22,
  },
  coachWrap: {
    width: 120,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachImage: {
    width: '100%',
    height: '100%',
  },
  heroInfo: {
    flex: 1,
    paddingStart: 12,
    alignItems: 'flex-start',
  },
  badgeRow: {
    marginBottom: 4,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'right',
  },
  roleTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0B192C',
    marginBottom: 6,
    textAlign: 'right',
  },
  roleSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: '#475569',
    textAlign: 'right',
  },

  // ── Main White Card ──
  cardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
  },

  // ── Segmented Tabs ──
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },
  tabButtonActive: {
    backgroundColor: '#00875A',
    shadowColor: '#00875A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  tabButtonText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },

  // ── Global Error Banner ──
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  errorAlertText: {
    flex: 1,
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '600',
    textAlign: 'right',
  },

  // ── Form Inputs ──
  formWrap: {
    gap: 16,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'right',
  },
  fieldErrorText: {
    fontSize: 11.5,
    color: '#DC2626',
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 2,
  },

  // Phone input row with country prefix
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 12,
  },
  countryPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingEnd: 10,
    borderEndWidth: 1,
    borderEndColor: '#E2E8F0',
  },
  flagEmoji: {
    fontSize: 16,
  },
  countryCodeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  phoneTextInput: {
    flex: 1,
    fontSize: 14.5,
    color: '#0F172A',
    paddingHorizontal: 12,
  },

  // Standard Text Input Row
  standardInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 12,
  },
  standardTextInput: {
    flex: 1,
    fontSize: 14.5,
    color: '#0F172A',
    paddingHorizontal: 8,
  },

  // Password Input Row
  passwordInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 12,
  },
  passwordTextInput: {
    flex: 1,
    fontSize: 14.5,
    color: '#0F172A',
    paddingHorizontal: 8,
  },
  eyeToggleBtn: {
    padding: 6,
  },
  inputPrefixIcon: {
    paddingStart: 4,
  },

  // ── Password Strength Meter ──
  strengthMeterContainer: {
    marginTop: 6,
    gap: 4,
  },
  strengthBarsRow: {
    flexDirection: 'row',
    gap: 5,
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  strengthLabelText: {
    fontSize: 11,
    fontWeight: '700',
  },
  strengthHintText: {
    fontSize: 10.5,
    color: '#64748B',
  },

  // ── Options Row (Remember Me & Forgot Password) ──
  optionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  rememberMeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.6,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxBoxActive: {
    borderColor: '#00875A',
    backgroundColor: '#00875A',
  },
  rememberMeText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  forgotPasswordText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#00875A',
  },

  // ── Primary Button ──
  primaryButton: {
    backgroundColor: '#00875A',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
    shadowColor: '#00875A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ── Divider ──
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 18,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#94A3B8',
  },

  // ── Google OAuth Button ──
  googleButton: {
    backgroundColor: '#FFFFFF',
    height: 50,
    borderRadius: 14,
    borderWidth: 1.4,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  googleButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },

  // ── Security Badge Banner ──
  securityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginTop: 20,
  },
  shieldIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  securityTextWrap: {
    flex: 1,
  },
  securityTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#065F46',
    textAlign: 'right',
  },
  securitySubtitle: {
    fontSize: 11,
    color: '#047857',
    textAlign: 'right',
    marginTop: 1,
  },

  // ── Modal Styles ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 25, 44, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
    gap: 10,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0B192C',
    textAlign: 'center',
    marginBottom: 6,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    gap: 10,
  },
  modalItemActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1,
  },
  modalItemFlag: {
    fontSize: 20,
  },
  modalItemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'right',
  },
  modalItemCode: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
});
