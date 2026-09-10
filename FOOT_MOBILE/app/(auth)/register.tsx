import React, { useEffect, useState } from 'react';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  Lightbulb,
  Lock,
  MapPin,
  Phone,
  Trophy,
  User,
  Users,
} from 'lucide-react-native';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { useToast } from '@/components/ui/Toast';
import { CitySelect } from '@/components/registration/CitySelect';
import { ProgressIndicator } from '@/components/registration/ProgressIndicator';
import { ReviewCard } from '@/components/registration/ReviewCard';
import { RoleCard } from '@/components/registration/RoleCard';
import { useAuth, type RegisterRole } from '@/auth/AuthProvider';
import { getSupportContact } from '@/config/env';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';
import { persistentStorage } from '@/services/storage/persistent-storage';
import { getValidationErrors, getUserMessage, isValidationError } from '@/api/errors';
import { cleanPhoneNumber, formatPhoneDisplay, getPasswordStrength } from '@/utils';

// ─── Stadium Icon for Header Badge ─────────────────────────────────────
function StadiumBadgeIcon({ size = 18, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Ellipse cx="12" cy="12" rx="10" ry="7" stroke={color} strokeWidth="1.8" />
      <Ellipse cx="12" cy="12" rx="6" ry="4" stroke={color} strokeWidth="1.4" strokeDasharray="2 1.5" />
      <Path d="M12 8 L12 16" stroke={color} strokeWidth="1.4" />
    </Svg>
  );
}

// ─── Celebration Checkmark with Radiating Particles ──────────────────
function CelebrationCheckmark({ size = 110 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      {/* Outer Radiating Confetti Dots & Bursts */}
      {/* Top green dot */}
      <Circle cx="60" cy="12" r="3.5" fill="#10B981" />
      {/* Top right orange dot */}
      <Circle cx="86" cy="20" r="3" fill="#F59E0B" />
      {/* Right green dot */}
      <Circle cx="106" cy="42" r="3.5" fill="#10B981" />
      {/* Right teal dot */}
      <Circle cx="108" cy="74" r="3" fill="#06B6D4" />
      {/* Bottom right orange dot */}
      <Circle cx="94" cy="98" r="3" fill="#F59E0B" />
      {/* Bottom green dot */}
      <Circle cx="60" cy="108" r="3.5" fill="#10B981" />
      {/* Bottom left blue dot */}
      <Circle cx="26" cy="98" r="3" fill="#3B82F6" />
      {/* Left teal dot */}
      <Circle cx="12" cy="72" r="3.5" fill="#06B6D4" />
      {/* Left green dot */}
      <Circle cx="14" cy="40" r="3" fill="#10B981" />
      {/* Top left orange dot */}
      <Circle cx="34" cy="20" r="3.5" fill="#F59E0B" />

      {/* Little star / ray marks */}
      <Path d="M48 18 L51 14" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M72 18 L69 14" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M102 58 L107 58" stroke="#F59E0B" strokeWidth="2.5" strokeLinecap="round" />
      <Path d="M13 58 L18 58" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" />

      {/* Center Circle Shadow */}
      <Circle cx="60" cy="62" r="35" fill="#059669" fillOpacity="0.15" />

      {/* Solid Main Green Circle */}
      <Circle cx="60" cy="60" r="32" fill="#059669" />

      {/* Bold White Checkmark */}
      <Path
        d="M47 60 L56 69 L74 51"
        stroke="#FFFFFF"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// ─── Role & option constants ──────────────────────────────────────────
type Role = RegisterRole;

const ROLES: { id: Role; Icon: typeof Users }[] = [
  { id: 'player', Icon: User },
  { id: 'manager', Icon: Users },
  { id: 'terrain_owner', Icon: MapPin },
  { id: 'committee', Icon: Trophy },
];

const CATEGORIES = [
  { value: 'adult', labelAr: 'كبار', labelEn: 'Adult', labelFr: 'Adulte' },
  { value: 'teenager', labelAr: 'ناشئين', labelEn: 'Teenager', labelFr: 'Adolescent' },
  { value: 'children', labelAr: 'أطفال', labelEn: 'Children', labelFr: 'Enfants' },
] as const;

const POSITIONS = [
  { value: 'goalkeeper', labelAr: 'حارس', labelEn: 'Goalkeeper', labelFr: 'Gardien' },
  { value: 'defender', labelAr: 'مدافع', labelEn: 'Defender', labelFr: 'Défenseur' },
  { value: 'midfielder', labelAr: 'وسط ميدان', labelEn: 'Milieu', labelFr: 'Milieu' },
  { value: 'forward', labelAr: 'مهاجم', labelEn: 'Forward', labelFr: 'Attaquant' },
] as const;

const SKILL_LEVELS = [
  { value: 'beginner', labelAr: 'مبتدئ', labelEn: 'Beginner', labelFr: 'Débutant' },
  { value: 'amateur', labelAr: 'هاوي', labelEn: 'Amateur', labelFr: 'Amateur' },
  { value: 'semi_pro', labelAr: 'شبه محترف', labelEn: 'Semi-pro', labelFr: 'Semi-pro' },
  { value: 'pro', labelAr: 'محترف', labelEn: 'Pro', labelFr: 'Pro' },
] as const;

function roleTitleKey(role: Role): string {
  switch (role) {
    case 'manager': return 'auth.roleManagerTitle';
    case 'player': return 'auth.rolePlayerTitle';
    case 'terrain_owner': return 'auth.roleTerrainTitle';
    default: return 'auth.roleCommitteeTitle';
  }
}

function optionLabel(
  value: { labelAr: string; labelEn: string; labelFr: string },
  locale: string,
): string {
  if (locale === 'ar') return value.labelAr;
  if (locale === 'fr') return value.labelFr;
  return value.labelEn;
}

// ─── Live Password Strength Indicator Component ─────────────────────
function PasswordStrengthMeter({ password }: { password: string }) {
  if (!password) return null;
  const strength = getPasswordStrength(password);

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

export default function RegisterWizard(): React.JSX.Element {
  const { register } = useAuth();
  const { t, locale, isRTL } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ role?: string }>();

  // Redirect to Step 1 (Account Type Selection) if role is not selected yet
  useEffect(() => {
    if (!params.role) {
      router.replace('/(auth)/account-type');
    }
  }, [params.role, router]);

  const initialRole: Role =
    params.role && ['player', 'manager', 'terrain_owner', 'committee'].includes(params.role)
      ? (params.role as Role)
      : 'terrain_owner';

  const [role, setRole] = useState<Role>(initialRole);
  const [step, setStep] = useState<number>(2); // 2: create account, 3: success (for terrain_owner)

  // Account Info
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Fallback fields for other roles
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isWhatsapp, setIsWhatsapp] = useState(false);
  const [terms, setTerms] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [memberCount, setMemberCount] = useState('');
  const [teamCategory, setTeamCategory] = useState<string>('adult');
  const [associationName, setAssociationName] = useState('');
  const [position, setPosition] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [city, setCity] = useState('');

  // Errors & loading
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);

  const clearErrors = (): void => {
    setFieldErrors({});
    setGlobalError('');
  };

  const getFieldError = (key: string): string | undefined => fieldErrors[key]?.[0];

  const handleSupport = (): void => {
    const contact = getSupportContact();
    if (!contact) {
      toast.show(t('landing.supportNotConfigured'), 'info');
      return;
    }
    Linking.openURL(contact).catch(() => toast.show(t('landing.supportNotConfigured'), 'error'));
  };

  // ── Terrain Owner Form Submission ──
  const handleTerrainOwnerSubmit = async (): Promise<void> => {
    clearErrors();
    const errs: Record<string, string[]> = {};
    const cleanedPhone = cleanPhoneNumber(phone);
    if (!name.trim()) errs.name = ['يرجى إدخال الاسم الكامل'];
    if (!cleanedPhone) errs.phone = ['يرجى إدخال رقم الهاتف'];
    else if (cleanedPhone.length < 9) errs.phone = ['يرجى إدخال رقم هاتف صحيح'];
    if (!password) errs.password = ['يرجى إدخال كلمة المرور'];
    else if (password.length < 6) errs.password = ['كلمة المرور يجب أن تتكون من 6 أحرف أو أرقام على الأقل'];

    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      setGlobalError(Object.values(errs)[0][0]);
      return;
    }

    setLoading(true);
    try {
      // Clear previous user's pending stadium & bookings so they never pollute new signup
      try {
        persistentStorage.remove('owner.pendingStadium');
        persistentStorage.remove('owner.manualBookings');
        persistentStorage.remove('owner.pendingUser');
      } catch {
        // Ignore
      }

      await register({
        name: name.trim(),
        phone: cleanedPhone,
        password,
        role: 'terrain_owner',
      });

      // Save registered user phone/name for onboarding association
      try {
        persistentStorage.setJson('owner.pendingUser', {
          name: name.trim(),
          phone: cleanedPhone,
        });
      } catch {
        // Ignore
      }

      // Move immediately to Step 3 (Success screen)
      setStep(3);
    } catch (e: unknown) {
      if (isValidationError(e)) {
        const fe = getValidationErrors(e);
        if (fe) {
          setFieldErrors(fe);
          const first = Object.values(fe)[0]?.[0];
          setGlobalError(first || getUserMessage(e));
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

  const ForwardArrow = isRTL ? ArrowLeft : ArrowRight;
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  // ═══════════════════════════════════════════════════════════════════════
  // TERRAIN OWNER DEDICATED FLOW (Exact match to design sheet)
  // ═══════════════════════════════════════════════════════════════════════
  if (role === 'terrain_owner') {
    // ── Screen 3: "تم إنشاء حسابك بنجاح" ──
    if (step === 3) {
      return (
        <Screen padded={false}>
          <ScrollView
            contentContainerStyle={styles.successScroll}
            showsVerticalScrollIndicator={false}
          >
            {/* Celebratory Checkmark Icon */}
            <View style={styles.celebrationWrap}>
              <CelebrationCheckmark size={120} />
            </View>

            {/* Header Titles */}
            <View style={styles.successTextWrap}>
              <Text style={[styles.successTitle, { color: colors.text }]}>
                مرحباً بك في أجي نقصرو !
              </Text>
              <Text style={[styles.successSubtitle, { color: '#64748B' }]}>
                تم إنشاء حسابك بنجاح.
              </Text>
            </View>

            {/* Info Box with Lightbulb */}
            <View style={styles.infoBox}>
              <View style={styles.infoIconWrap}>
                <Lightbulb size={22} color="#059669" />
              </View>
              <Text style={styles.infoText}>
                يمكنك الآن الدخول للمنصة وتكملة إعداد ملعبك من بعد.
              </Text>
            </View>

            {/* Actions Buttons */}
            <View style={styles.successActions}>
              {/* Primary Green Pill: "نكمل دابا" */}
              <Pressable
                onPress={() => {
                  router.push({
                    pathname: '/(auth)/terrain-onboarding',
                    params: { ownerName: name.trim() || 'محمد' },
                  } as never);
                }}
                style={({ pressed }) => [
                  styles.primaryPillBtn,
                  { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel="نكمل دابا"
              >
                <Text style={styles.primaryPillBtnText}>نكمل دابا</Text>
                <ForwardArrow size={20} color="#FFFFFF" strokeWidth={2.4} />
              </Pressable>

              {/* Secondary Outline Pill: "نكمل من بعد" */}
              <Pressable
                onPress={() => {
                  router.replace('/(auth)');
                }}
                style={({ pressed }) => [
                  styles.outlinePillBtn,
                  { opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
                accessibilityRole="button"
                accessibilityLabel="نكمل من بعد"
              >
                <Text style={styles.outlinePillBtnText}>نكمل من بعد</Text>
              </Pressable>
            </View>
          </ScrollView>
        </Screen>
      );
    }

    // ── Screen 2: "أنشئ حسابك" ──
    return (
      <Screen padded={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.flex}
        >
          {/* Top Bar with Back Arrow and Badge "صاحب ملعب" */}
          <View style={styles.sheetHeaderBar}>
            <Pressable
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/(auth)/account-type'))}
              style={({ pressed }) => [styles.backArrowBtn, { opacity: pressed ? 0.7 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="الرجوع"
              hitSlop={12}
            >
              <BackArrow size={22} color={colors.text} />
            </Pressable>

            <View style={styles.headerBadge}>
              <StadiumBadgeIcon size={16} color="#FFFFFF" />
              <Text style={styles.headerBadgeText}>صاحب ملعب</Text>
            </View>

            {/* Spacer to balance header */}
            <View style={{ width: 40 }} />
          </View>

          <ScrollView
            contentContainerStyle={styles.sheetScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Title & Subtitle */}
            <View style={styles.headingWrap}>
              <Text style={[styles.mainHeading, { color: colors.text }]}>
                إنشاء حسابك
              </Text>
              <Text style={[styles.subHeading, { color: '#64748B' }]}>
                باش نبداو، دخل المعلومات التالية
              </Text>
            </View>

            {/* Error Banner */}
            {globalError ? (
              <View style={styles.errorAlert}>
                <Text style={styles.errorAlertText}>{globalError}</Text>
              </View>
            ) : null}

            {/* 3 Form Inputs */}
            <View style={styles.formContainer}>
              {/* Field 1: الاسم الكامل */}
              <View style={styles.inputBlock}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>الاسم الكامل</Text>
                <View
                  style={[
                    styles.inputFieldBox,
                    {
                      borderColor: getFieldError('name') ? '#EF4444' : '#E2E8F0',
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.textInput, { color: colors.text, textAlign: 'right' }]}
                    placeholder="مثال: محمد العلوي"
                    placeholderTextColor="#94A3B8"
                    value={name}
                    onChangeText={(val) => {
                      setName(val);
                      clearErrors();
                    }}
                    autoCapitalize="words"
                    textContentType="name"
                  />
                  <View style={styles.inputIconWrap}>
                    <User size={20} color="#94A3B8" />
                  </View>
                </View>
                {getFieldError('name') ? (
                  <Text style={styles.errorNote}>{getFieldError('name')}</Text>
                ) : null}
              </View>

              {/* Field 2: رقم الهاتف */}
              <View style={styles.inputBlock}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>رقم الهاتف</Text>
                <View
                  style={[
                    styles.inputFieldBox,
                    {
                      borderColor: getFieldError('phone') ? '#EF4444' : '#E2E8F0',
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  <TextInput
                    style={[styles.textInput, { color: colors.text, textAlign: 'right' }]}
                    placeholder="06 XX XX XX XX"
                    placeholderTextColor="#94A3B8"
                    value={phone}
                    onChangeText={(val) => {
                      setPhone(formatPhoneDisplay(val));
                      clearErrors();
                    }}
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                  />
                  <View style={styles.inputIconWrap}>
                    <Phone size={20} color="#94A3B8" />
                  </View>
                </View>
                {getFieldError('phone') ? (
                  <Text style={styles.errorNote}>{getFieldError('phone')}</Text>
                ) : null}
              </View>

              {/* Field 3: كلمة المرور */}
              <View style={styles.inputBlock}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>كلمة المرور</Text>
                <View
                  style={[
                    styles.inputFieldBox,
                    {
                      borderColor: getFieldError('password') ? '#EF4444' : '#E2E8F0',
                      backgroundColor: colors.surface,
                    },
                  ]}
                >
                  {/* Eye Toggle on left */}
                  <Pressable
                    onPress={() => setShowPassword((prev) => !prev)}
                    hitSlop={10}
                    style={styles.eyeToggle}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? 'إخفاء' : 'إظهار'}
                  >
                    {showPassword ? (
                      <EyeOff size={20} color="#94A3B8" />
                    ) : (
                      <Eye size={20} color="#94A3B8" />
                    )}
                  </Pressable>

                  <TextInput
                    style={[styles.textInput, { color: colors.text, textAlign: 'right' }]}
                    placeholder="•••••••••••••"
                    placeholderTextColor="#94A3B8"
                    value={password}
                    onChangeText={(val) => {
                      setPassword(val);
                      clearErrors();
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry={!showPassword}
                    textContentType="newPassword"
                  />

                  <View style={styles.inputIconWrap}>
                    <Lock size={20} color="#94A3B8" />
                  </View>
                </View>

                {/* Live Password Strength Meter */}
                <PasswordStrengthMeter password={password} />

                {getFieldError('password') ? (
                  <Text style={styles.errorNote}>{getFieldError('password')}</Text>
                ) : null}
              </View>

              {/* Primary Green Action Button: "متابعة →" */}
              <Pressable
                onPress={() => void handleTerrainOwnerSubmit()}
                disabled={loading}
                style={({ pressed }) => [
                  styles.primaryPillBtn,
                  {
                    opacity: loading ? 0.7 : pressed ? 0.9 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                    marginTop: spacing.md,
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel="متابعة"
              >
                <Text style={styles.primaryPillBtnText}>
                  {loading ? 'جاري التسجيل...' : 'متابعة'}
                </Text>
                <ForwardArrow size={20} color="#FFFFFF" strokeWidth={2.4} />
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Screen>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FALLBACK FOR OTHER ROLES (Manager, Player, Committee)
  // ═══════════════════════════════════════════════════════════════════════
  const handleGenericSubmit = async () => {
    clearErrors();
    setLoading(true);
    try {
      const cleanedPhone = cleanPhoneNumber(phone);
      const payload: Record<string, unknown> = {
        name: name.trim(),
        phone: cleanedPhone,
        password,
        role,
      };
      if (email.trim()) payload.email = email.trim();
      if (isWhatsapp) payload.is_whatsapp = true;

      if (role === 'manager') {
        payload.team_name = teamName.trim();
        payload.member_count = parseInt(memberCount, 10) || 11;
        payload.team_category = teamCategory;
        if (associationName.trim()) payload.association_name = associationName.trim();
      }
      if (role === 'player') {
        if (position) payload.position = position;
        if (skillLevel) payload.skill_level = skillLevel;
        if (birthYear.trim()) payload.birth_year = parseInt(birthYear.trim(), 10);
        if (city.trim()) payload.city = city.trim();
      }

      await register(payload as never);
      setStep(3);
    } catch (e: unknown) {
      if (isValidationError(e)) {
        const fe = getValidationErrors(e);
        if (fe) {
          setFieldErrors(fe);
          const first = Object.values(fe)[0]?.[0];
          setGlobalError(first || getUserMessage(e));
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

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.sheetScroll}>
        <View style={styles.headingWrap}>
          <Text style={[styles.mainHeading, { color: colors.text }]}>
            {t('auth.createTitle')}
          </Text>
          <Text style={[styles.subHeading, { color: '#64748B' }]}>
            {t('auth.createSubtitle')}
          </Text>
        </View>

        {globalError ? (
          <View style={styles.errorAlert}>
            <Text style={styles.errorAlertText}>{globalError}</Text>
          </View>
        ) : null}

        <View style={styles.formContainer}>
          <Input label={t('auth.fullName')} value={name} onChangeText={setName} error={getFieldError('name')} />
          <Input
            label={t('auth.phone')}
            value={phone}
            onChangeText={(val) => setPhone(formatPhoneDisplay(val))}
            keyboardType="phone-pad"
            placeholder="06 XX XX XX XX"
            error={getFieldError('phone')}
          />
          <Input
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            error={getFieldError('password')}
          />
          <PasswordStrengthMeter password={password} />

          <Button
            title={t('auth.continue')}
            onPress={() => void handleGenericSubmit()}
            loading={loading}
            fullWidth
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sheetHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backArrowBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  sheetScroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  headingWrap: {
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.xs,
  },
  mainHeading: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  subHeading: {
    fontSize: 14,
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
  formContainer: {
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  inputBlock: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'right',
  },
  inputFieldBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    height: 56,
    paddingHorizontal: 14,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  inputIconWrap: {
    marginStart: 10,
  },
  eyeToggle: {
    marginEnd: 10,
    padding: 4,
  },
  errorNote: {
    color: '#EF4444',
    fontSize: 12,
    textAlign: 'right',
    marginTop: 2,
  },
  primaryPillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#059669',
    height: 54,
    borderRadius: 27,
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
  outlinePillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#059669',
    backgroundColor: '#FFFFFF',
    height: 54,
    borderRadius: 27,
  },
  outlinePillBtnText: {
    color: '#059669',
    fontSize: 16,
    fontWeight: '800',
  },
  // ── Success Screen Styles ──
  successScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    gap: spacing.xl,
  },
  celebrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  successTextWrap: {
    alignItems: 'center',
    gap: 6,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1.2,
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    width: '100%',
  },
  infoIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    flex: 1,
    color: '#065F46',
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'right',
  },
  successActions: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  // ── Password Strength Meter Styles ──
  strengthMeterContainer: {
    marginTop: 8,
    gap: 6,
    width: '100%',
  },
  strengthBarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  strengthBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  strengthInfoRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  strengthLabelText: {
    fontSize: 12,
    fontWeight: '700',
  },
  strengthHintText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
});
