import { useState } from 'react';
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
  View,
} from 'react-native';
import { Eye, EyeOff, MapPin, Trophy, User, Users } from 'lucide-react-native';

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
import { getValidationErrors, getUserMessage, isValidationError } from '@/api/errors';

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

// ─── Helpers ──────────────────────────────────────────────────────────
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

// ─── Main Wizard ──────────────────────────────────────────────────────
export default function RegisterWizard(): React.JSX.Element {
  const { register } = useAuth();
  const { t, locale, isRTL } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ role?: string }>();

  const initialRole: Role | null =
    params.role && ['player', 'manager', 'terrain_owner', 'committee'].includes(params.role)
      ? (params.role as Role)
      : null;

  // ── step: 1..5 (5 = result)
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(initialRole ? 2 : 1);
  const [role, setRole] = useState<Role | null>(initialRole);

  // Account Info
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isWhatsapp, setIsWhatsapp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);

  // Role info — manager
  const [teamName, setTeamName] = useState('');
  const [memberCount, setMemberCount] = useState('');
  const [teamCategory, setTeamCategory] = useState<string>('adult');
  const [associationName, setAssociationName] = useState('');
  // Role info — player
  const [position, setPosition] = useState('');
  const [skillLevel, setSkillLevel] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [city, setCity] = useState('');

  // Errors & loading
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [globalError, setGlobalError] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ role: Role; message: string } | null>(null);

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

  // ── Validation per step ──
  const validateStep2 = (): boolean => {
    const errs: Record<string, string[]> = {};
    if (!name.trim()) errs.name = [t('auth.nameRequired')];
    if (!phone.trim()) errs.phone = [t('auth.phoneRequired')];
    else if (phone.trim().length > 20) errs.phone = [t('auth.phoneTooLong')];
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = [t('auth.invalidEmail')];
    if (password.length < 8) errs.password = [t('auth.passwordMinLength')];
    if (confirmPassword !== password) errs.password_confirmation = [t('auth.passwordMismatch')];
    if (!terms) errs.terms = [t('auth.termsRequired')];
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      const first = Object.values(errs)[0]?.[0];
      if (first) setGlobalError(first);
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    if (!role) return false;
    const errs: Record<string, string[]> = {};
    if (role === 'manager') {
      if (!teamName.trim()) errs.team_name = [t('auth.teamNameRequired')];
      const c = parseInt(memberCount, 10);
      if (!memberCount || Number.isNaN(c) || c < 1) errs.member_count = [t('auth.memberCountRequired')];
      if (!teamCategory) errs.team_category = [t('auth.categoryRequired')];
    }
    // player fields are all optional — no required validation
    // terrain_owner / committee: no fields — always valid
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) {
      const first = Object.values(errs)[0]?.[0];
      if (first) setGlobalError(first);
      return false;
    }
    return true;
  };

  const handleContinue = (): void => {
    clearErrors();
    if (step === 1) {
      if (!role) {
        setGlobalError(t('auth.chooseAccountType'));
        return;
      }
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!validateStep2()) return;
      setStep(3);
      return;
    }
    if (step === 3) {
      if (!validateStep3()) return;
      setStep(4);
      return;
    }
  };

  const handleCreateAccount = async (): Promise<void> => {
    if (!role) return;
    clearErrors();
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        name: name.trim(),
        phone: phone.trim(),
        password,
        role,
      };
      const em = email.trim();
      if (em) payload.email = em;
      if (isWhatsapp) payload.is_whatsapp = true;

      if (role === 'manager') {
        payload.team_name = teamName.trim();
        payload.member_count = parseInt(memberCount, 10);
        payload.team_category = teamCategory;
        if (associationName.trim()) payload.association_name = associationName.trim();
      }
      if (role === 'player') {
        if (position) payload.position = position;
        if (skillLevel) payload.skill_level = skillLevel;
        if (birthYear.trim()) payload.birth_year = parseInt(birthYear.trim(), 10);
        if (city.trim()) payload.city = city.trim();
      }
      // terrain_owner / committee: no extra fields

      const res = await register(payload as never);
      setResult({ role, message: res.message });
      setStep(5);
    } catch (e: unknown) {
      if (isValidationError(e)) {
        const fe = getValidationErrors(e);
        if (fe) {
          setFieldErrors(fe);
          const first = Object.values(fe)[0]?.[0];
          if (first) setGlobalError(first);
          else setGlobalError(getUserMessage(e));
          // If error is in role-specific fields, jump to step 3
          if (fe.team_name || fe.member_count || fe.team_category || fe.association_name) setStep(3);
          else if (fe.position || fe.skill_level || fe.birth_year || fe.city) setStep(3);
          else if (fe.name || fe.phone || fe.email || fe.password) setStep(2);
        } else {
          setGlobalError(getUserMessage(e));
        }
      } else {
        // 403 registration closed, 429 throttled, network, etc.
        setGlobalError(getUserMessage(e));
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Result screen ──
  if (step === 5 && result) {
    const roleTitle = t(roleTitleKey(result.role));
    return (
      <Screen>
        <View style={styles.center}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '18' }]}>
            <Text style={[styles.iconEmoji, { color: colors.primary }]}>✓</Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>{t('auth.accountCreated')}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted, textAlign: 'center', lineHeight: 20 }]}>{result.message}</Text>
          <Text style={[styles.desc, { color: colors.textMuted, textAlign: 'center', lineHeight: 18 }]}>
            {t('auth.pendingApproval').replace('%s', roleTitle)}
          </Text>
          <View style={styles.resultActions}>
            <Button title={t('auth.goToLogin')} fullWidth onPress={() => router.replace('/(auth)')} />
            <Pressable onPress={handleSupport} accessibilityRole="link" hitSlop={12} style={styles.center}>
              <Text style={StyleSheet.flatten([styles.link, { color: colors.primary }])}>{t('landing.contactSupport')}</Text>
            </Pressable>
          </View>
        </View>
      </Screen>
    );
  }

  // ── Progress label per step ──
  const progressLabel =
    step === 1 ? t('auth.accountType') : step === 2 ? t('auth.accountInfo') : step === 3 ? t('auth.roleInfo') : t('auth.review');

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => {
                if (step === 1) router.replace('/(auth)');
                else if (step === 4) setStep(3);
                else if (step === 3) setStep(2);
                else if (step === 2) setStep(1);
              }}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel={t('auth.wizardBack')}
              style={styles.backBtn}
            >
              <Text style={[styles.backText, { color: colors.text }]}>{t('auth.wizardBack')}</Text>
            </Pressable>
            <Text style={[styles.logo, { color: colors.primary }]}>FootMANAGER</Text>
            <Link href="/(auth)" asChild>
              <Text style={StyleSheet.flatten([styles.loginLink, { color: colors.primary, textAlign: isRTL ? 'right' : 'left' }])}>{t('auth.loginShort')}</Text>
            </Link>
          </View>

          <ProgressIndicator current={step} total={4} label={progressLabel} />

          {step === 1 ? (
            <>
              <View style={styles.titles}>
                <Text style={[styles.title, { color: colors.text }]}>{t('auth.joinTitle')}</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('auth.chooseUsage')}</Text>
              </View>

              <View style={styles.roleGrid}>
                {ROLES.map((r) => (
                  <RoleCard
                    key={r.id}
                    title={t(roleTitleKey(r.id as Role))}
                    description={t(`auth.role${r.id === 'player' ? 'Player' : r.id === 'manager' ? 'Manager' : r.id === 'terrain_owner' ? 'Terrain' : 'Committee'}Desc`)}
                    Icon={r.Icon as never}
                    selected={role === r.id}
                    onPress={() => {
                      setRole(r.id as Role);
                      clearErrors();
                    }}
                  />
                ))}
              </View>

              {globalError ? (
                <View style={[styles.banner, { backgroundColor: colors.danger + '12' }]}>
                  <Text style={[styles.bannerText, { color: colors.danger }]}>{globalError}</Text>
                </View>
              ) : null}

              <Button
                title={t('auth.continue')}
                onPress={handleContinue}
                disabled={!role}
                fullWidth
              />
            </>
          ) : null}

          {step === 2 ? (
            <>
              <View style={styles.titles}>
                <Text style={[styles.title, { color: colors.text }]}>{t('auth.createTitle')}</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('auth.createSubtitle')}</Text>
              </View>

              {globalError ? (
                <View style={[styles.banner, { backgroundColor: colors.danger + '12' }]}>
                  <Text style={[styles.bannerText, { color: colors.danger }]}>{globalError}</Text>
                </View>
              ) : null}

              <View style={styles.form}>
                <Input label={t('auth.fullName')} placeholder={t('auth.fullNamePlaceholder')} value={name} onChangeText={(v) => { setName(v); clearErrors(); }} error={getFieldError('name')} textContentType="name" autoComplete="name" />
                <Input label={t('auth.phone')} placeholder={t('auth.phonePlaceholder')} value={phone} onChangeText={(v) => { setPhone(v); clearErrors(); }} error={getFieldError('phone')} keyboardType="phone-pad" textContentType="telephoneNumber" autoComplete="tel" hint={t('auth.phoneCountryHint')} />
                <View style={[styles.switchRow, { backgroundColor: colors.bgMuted, borderColor: colors.border }]}>
                  <Text style={[styles.switchLabel, { color: colors.text }]}>{t('auth.whatsappNumber')}</Text>
                  <Switch value={isWhatsapp} onValueChange={setIsWhatsapp} trackColor={{ true: colors.primary }} />
                </View>
                <Input label={t('auth.email')} placeholder={t('auth.emailPlaceholder')} value={email} onChangeText={(v) => { setEmail(v); clearErrors(); }} error={getFieldError('email')} keyboardType="email-address" autoCapitalize="none" textContentType="emailAddress" autoComplete="email" />
                <View style={styles.passwordWrap}>
                  <Input
                    label={t('auth.password')}
                    placeholder={t('auth.passwordMinHint')}
                    value={password}
                    onChangeText={(v) => { setPassword(v); clearErrors(); }}
                    secureTextEntry={!showPassword}
                    textContentType="newPassword"
                    autoComplete="new-password"
                    error={getFieldError('password')}
                    hint={password.length > 0 && password.length < 8 ? t('auth.passwordMinHint') : undefined}
                  />
                  <Pressable onPress={() => setShowPassword((v) => !v)} style={styles.eyeBtn} hitSlop={8} accessibilityLabel={showPassword ? 'Hide' : 'Show'}>
                    {showPassword ? <EyeOff size={18} color={colors.textMuted} /> : <Eye size={18} color={colors.textMuted} />}
                  </Pressable>
                </View>
                <Input
                  label={t('auth.confirmPassword')}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChangeText={(v) => { setConfirmPassword(v); clearErrors(); }}
                  secureTextEntry={!showPassword}
                  textContentType="password"
                  error={getFieldError('password_confirmation') || getFieldError('password')}
                />
                <View style={styles.passwordHint}>
                  <Text style={[styles.hintText, { color: password.length >= 8 ? colors.success : colors.textSubtle }]}>{password.length >= 8 ? '✓ ' : '○ '}{t('auth.passwordMinHint')}</Text>
                  <Text style={[styles.hintNote, { color: colors.textSubtle }]}>{t('auth.passwordRequirements')}</Text>
                </View>

                <Pressable onPress={() => setTerms(!terms)} style={styles.termsRow} accessibilityRole="checkbox" accessibilityState={{ checked: terms }}>
                  <View style={[styles.checkbox, { borderColor: terms ? colors.primary : colors.border, backgroundColor: terms ? colors.primary : 'transparent' }]}>
                    {terms ? <Text style={styles.checkMark}>✓</Text> : null}
                  </View>
                  <Text style={[styles.termsText, { color: colors.text }]}>
                    {t('auth.agreeTo')}{' '}
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('auth.termsAndConditions')}</Text>
                    {' '}{t('auth.and')}{' '}
                    <Text style={{ color: colors.primary, fontWeight: '700' }}>{t('auth.privacyPolicy')}</Text>
                  </Text>
                </Pressable>
                {getFieldError('terms') ? <Text style={[styles.fieldError, { color: colors.danger }]}>{getFieldError('terms')}</Text> : null}

                <Button title={t('auth.continue')} onPress={handleContinue} fullWidth />
              </View>
            </>
          ) : null}

          {step === 3 ? (
            <>
              <View style={styles.titles}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {role === 'manager' ? t('auth.teamInfo') : role === 'player' ? t('auth.playerInfo') : t('auth.confirmInfo')}
                </Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                  {role === 'manager' ? t('auth.enterTeamDetails') : role === 'player' ? t('auth.optionalCompleteLater') : t('auth.noExtraInfo')}
                </Text>
              </View>

              {globalError ? (
                <View style={[styles.banner, { backgroundColor: colors.danger + '12' }]}>
                  <Text style={[styles.bannerText, { color: colors.danger }]}>{globalError}</Text>
                </View>
              ) : null}

              {role === 'manager' ? (
                <View style={styles.form}>
                  <Input label={t('auth.teamName')} placeholder={t('auth.fullNamePlaceholder')} value={teamName} onChangeText={(v) => { setTeamName(v); clearErrors(); }} error={getFieldError('team_name')} />
                  <Input label={t('auth.memberCount')} placeholder="18" value={memberCount} onChangeText={(v) => { setMemberCount(v.replace(/[^0-9]/g, '')); clearErrors(); }} keyboardType="numeric" error={getFieldError('member_count')} />
                  <View>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{t('auth.category')}</Text>
                    <View style={styles.chipRow}>
                      {CATEGORIES.map((cat) => (
                        <Pressable
                          key={cat.value}
                          onPress={() => { setTeamCategory(cat.value); clearErrors(); }}
                          style={[styles.chip, { backgroundColor: teamCategory === cat.value ? colors.primary + '20' : colors.surface, borderColor: teamCategory === cat.value ? colors.primary : colors.border }]}
                        >
                          <Text style={[styles.chipText, { color: teamCategory === cat.value ? colors.primary : colors.textMuted }]}>
                            {optionLabel(cat, locale)}
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                    {getFieldError('team_category') ? <Text style={[styles.fieldError, { color: colors.danger }]}>{getFieldError('team_category')}</Text> : null}
                  </View>
                  <Input label={t('auth.association')} placeholder={t('auth.association')} value={associationName} onChangeText={(v) => { setAssociationName(v); clearErrors(); }} error={getFieldError('association_name')} />
                  <Button title={t('auth.continue')} onPress={handleContinue} fullWidth />
                </View>
              ) : null}

              {role === 'player' ? (
                <View style={styles.form}>
                  <View>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{t('auth.positionOptional')}</Text>
                    <View style={styles.chipRow}>
                      {POSITIONS.map((p) => (
                        <Pressable key={p.value} onPress={() => { setPosition(position === p.value ? '' : p.value); clearErrors(); }} style={[styles.chip, { backgroundColor: position === p.value ? colors.primary + '20' : colors.surface, borderColor: position === p.value ? colors.primary : colors.border }]}>
                          <Text style={[styles.chipText, { color: position === p.value ? colors.primary : colors.textMuted }]}>{optionLabel(p, locale)}</Text>
                        </Pressable>
                      ))}
                    </View>
                    {getFieldError('position') ? <Text style={[styles.fieldError, { color: colors.danger }]}>{getFieldError('position')}</Text> : null}
                  </View>
                  <View>
                    <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{t('auth.skillLevelOptional')}</Text>
                    <View style={styles.chipRow}>
                      {SKILL_LEVELS.map((s) => (
                        <Pressable key={s.value} onPress={() => { setSkillLevel(skillLevel === s.value ? '' : s.value); clearErrors(); }} style={[styles.chip, { backgroundColor: skillLevel === s.value ? colors.primary + '20' : colors.surface, borderColor: skillLevel === s.value ? colors.primary : colors.border }]}>
                          <Text style={[styles.chipText, { color: skillLevel === s.value ? colors.primary : colors.textMuted }]}>{optionLabel(s, locale)}</Text>
                        </Pressable>
                      ))}
                    </View>
                    {getFieldError('skill_level') ? <Text style={[styles.fieldError, { color: colors.danger }]}>{getFieldError('skill_level')}</Text> : null}
                  </View>
                  <CitySelect
                    label={t('auth.city')}
                    value={city || null}
                    onChange={(val) => {
                      setCity(val ?? '');
                      clearErrors();
                    }}
                    error={getFieldError('city')}
                    placeholder={t('auth.selectCity')}
                  />
                  <Input label={t('auth.birthYearOptional')} placeholder="1998" value={birthYear} onChangeText={(v) => { setBirthYear(v.replace(/[^0-9]/g, '').slice(0, 4)); clearErrors(); }} keyboardType="numeric" error={getFieldError('birth_year')} />
                  <Button title={t('auth.continue')} onPress={handleContinue} fullWidth />
                </View>
              ) : null}

              {(role === 'terrain_owner' || role === 'committee') ? (
                <View style={styles.form}>
                  <View style={[styles.infoBox, { backgroundColor: colors.primary + '0F', borderColor: colors.primary + '30' }]}>
                    <Text style={[styles.infoText, { color: colors.text }]}>{t('auth.noExtraInfo')}</Text>
                  </View>
                  <Button title={t('auth.continue')} onPress={handleContinue} fullWidth />
                </View>
              ) : null}
            </>
          ) : null}

          {step === 4 ? (
            <>
              <View style={styles.titles}>
                <Text style={[styles.title, { color: colors.text }]}>{t('auth.reviewDetails')}</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>{t('auth.checkInfo')}</Text>
              </View>

              {globalError ? (
                <View style={[styles.banner, { backgroundColor: colors.danger + '12' }]}>
                  <Text style={[styles.bannerText, { color: colors.danger }]}>{globalError}</Text>
                </View>
              ) : null}

              <View style={styles.form}>
                <ReviewCard label={t('auth.accountType')} value={role ? t(roleTitleKey(role as Role)) : '—'} onEdit={() => setStep(1)} />
                <ReviewCard label={t('auth.fullName')} value={name} onEdit={() => setStep(2)} />
                <ReviewCard label={t('auth.email')} value={email || '—'} onEdit={() => setStep(2)} />
                <ReviewCard label={t('auth.phone')} value={`${phone}${isWhatsapp ? ' · WhatsApp' : ''}`} onEdit={() => setStep(2)} />

                {role === 'manager' ? (
                  <>
                    <ReviewCard label={t('auth.teamName')} value={teamName} onEdit={() => setStep(3)} />
                    <ReviewCard label={t('auth.memberCount')} value={memberCount} onEdit={() => setStep(3)} />
                    <ReviewCard label={t('auth.category')} value={optionLabel(CATEGORIES.find((c) => c.value === teamCategory) ?? CATEGORIES[0], locale)} onEdit={() => setStep(3)} />
                    {associationName ? <ReviewCard label={t('auth.association')} value={associationName} onEdit={() => setStep(3)} /> : null}
                  </>
                ) : null}
                {role === 'player' ? (
                  <>
                    {position ? <ReviewCard label={t('auth.position')} value={optionLabel(POSITIONS.find((p) => p.value === position) ?? POSITIONS[0], locale)} onEdit={() => setStep(3)} /> : null}
                    {skillLevel ? <ReviewCard label={t('auth.skillLevel')} value={optionLabel(SKILL_LEVELS.find((s) => s.value === skillLevel) ?? SKILL_LEVELS[0], locale)} onEdit={() => setStep(3)} /> : null}
                    {city ? <ReviewCard label={t('auth.city')} value={city} onEdit={() => setStep(3)} /> : null}
                    {birthYear ? <ReviewCard label={t('auth.birthYear')} value={birthYear} onEdit={() => setStep(3)} /> : null}
                  </>
                ) : null}

                <View style={styles.reviewHint}>
                  <Text style={[styles.hintText, { color: colors.textMuted }]}>{t('auth.passwordNeverDisplayed')}</Text>
                </View>

                <Button title={t('auth.createAccount')} onPress={() => void handleCreateAccount()} loading={loading} disabled={loading} fullWidth />
              </View>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, gap: spacing.xl, paddingVertical: spacing.xl },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { paddingVertical: 6, paddingHorizontal: 4, minWidth: 60 },
  backText: { fontSize: 14, fontWeight: '700' },
  logo: { fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  loginLink: { fontSize: 13, fontWeight: '700', minWidth: 60, textAlign: 'right' },
  titles: { alignItems: 'center', gap: spacing.sm },
  title: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  subtitle: { fontSize: 13, textAlign: 'center', lineHeight: 18, paddingHorizontal: spacing.lg },
  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  form: { gap: spacing.md },
  banner: { borderRadius: 12, padding: spacing.md },
  bannerText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.md, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth },
  switchLabel: { fontSize: 13, fontWeight: '600' },
  passwordWrap: { gap: 0 },
  eyeBtn: { position: 'absolute', end: 12, top: 34, padding: 6 },
  passwordHint: { gap: 4, marginTop: -4 },
  hintText: { fontSize: 12, fontWeight: '600' },
  hintNote: { fontSize: 11, fontStyle: 'italic' },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { borderRadius: radius.full, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  chipText: { fontSize: 13, fontWeight: '600' },
  fieldError: { fontSize: 12, marginTop: 4 },
  infoBox: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1 },
  infoText: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  reviewHint: { alignItems: 'center', marginTop: spacing.sm },
  termsRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', marginTop: spacing.sm },
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  checkMark: { color: '#fff', fontSize: 12, fontWeight: '800' },
  termsText: { flex: 1, fontSize: 12, lineHeight: 18 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: spacing.md, padding: spacing.lg },
  iconCircle: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconEmoji: { fontSize: 32 },
  desc: { fontSize: 13, textAlign: 'center', lineHeight: 18, paddingHorizontal: spacing.lg },
  resultActions: { width: '100%', gap: spacing.md, marginTop: spacing.lg },
  link: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
});
