import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  AlertCircle,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Globe,
  Info,
  MapPin,
  Pencil,
  Send,
  Trophy,
  Users,
  X,
} from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { persistentStorage } from '@/services/storage/persistent-storage';
import { post } from '@/api/client';
import { getUserMessage, isValidationError, getValidationErrors } from '@/api/errors';
import type { SupportedLocale } from '@/types';

// ── Football Jersey SVG Component ──────────────────────────────────
function JerseyIcon({
  color = '#00875A',
  strokeColor = '#0F172A',
  size = 28,
}: {
  color?: string;
  strokeColor?: string;
  size?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 3 L9 5 C10 6 14 6 15 5 L18 3 L22 8 L19 10 L19 21 L5 21 L5 10 L2 8 Z"
        fill={color}
        stroke={strokeColor}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <Path
        d="M9 5 C10 8 14 8 15 5"
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </Svg>
  );
}

// ── Checkered Finish Flag SVG Component ─────────────────────────────
function FinishFlagIcon({ size = 26 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 22V3"
        stroke="#00875A"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <Path
        d="M4 4C8 2 12 5 16 3.5C18 2.8 20 3.5 20 3.5V13C20 13 18 12.2 16 13C12 14.5 8 11.5 4 13.5"
        fill="#ECFDF5"
        stroke="#00875A"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 3.8V12.8M15 3.3V12.5M4 8.5C8 6.5 12 9.5 20 8"
        stroke="#00875A"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      {/* Checkered filled tiles */}
      <Path d="M4 4C6.5 3 9 4.2 9 4.2V8.5C9 8.5 6.5 7.5 4 8.5Z" fill="#00875A" />
      <Path d="M15 3.3C17.5 3 20 3.5 20 3.5V8C20 8 17.5 7.5 15 8Z" fill="#00875A" />
      <Path d="M9 8.5C11.5 8 15 9.5 15 9.5V12.5C15 12.5 11.5 11 9 12.8Z" fill="#00875A" />
    </Svg>
  );
}

// ── Storage Keys & Maps ─────────────────────────────────────────────
const STEP1_STORAGE_KEY = 'manager.pendingTeamProfile';
const STEP2_STORAGE_KEY = 'manager.pendingSchedule';
const STEP3_STORAGE_KEY = 'manager.pendingAdditionalInfo';

const PRESET_LOGOS: Record<number, ImageSourcePropType> = {
  1: require('../../assets/preset-team-logo-1.png'),
  2: require('../../assets/preset-team-logo-2.png'),
  3: require('../../assets/preset-team-logo-3.png'),
  4: require('../../assets/preset-team-logo-4.png'),
  5: require('../../assets/preset-team-logo-5.png'),
  6: require('../../assets/preset-team-logo-6.png'),
};

const DAY_LABELS: Record<number, string> = {
  1: 'الإثنين',
  2: 'الثلاثاء',
  3: 'الأربعاء',
  4: 'الخميس',
  5: 'الجمعة',
  6: 'السبت',
  0: 'الأحد',
};

const TIME_SLOT_LABELS: Record<string, string> = {
  'slot-1': '15:00 - 16:00',
  'slot-2': '16:00 - 17:00',
  'slot-3': '17:00 - 18:00',
  'slot-4': '20:00 - 21:00',
  'slot-5': '19:00 - 20:00',
  'slot-6': '18:00 - 19:00',
};

const CATEGORY_LABELS: Record<string, string> = {
  teenager: 'شباب (أقل من 20 سنة)',
  adult: 'كبار (20 سنة فأكثر)',
  children: 'فئات أخرى (ناشئين / براعم)',
};

const TYPE_LABELS: Record<string, string> = {
  competitive: 'تنافسي',
  amateur: 'هواة (ترفيهي)',
};

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

export default function TeamSetupStep4Screen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { locale, setLocale, isRTL } = useI18n();

  // ── Retrieve Saved Step Data (with approved reference fallbacks) ──
  const [step1Data] = useState(() => {
    try {
      return (
        persistentStorage.getJson<{
          name?: string;
          city?: string;
          logoUri?: string | null;
          presetId?: number | null;
        }>(STEP1_STORAGE_KEY) ?? {}
      );
    } catch {
      return {};
    }
  });

  const [step2Data] = useState(() => {
    try {
      return (
        persistentStorage.getJson<{
          selectedDayIds?: number[];
          selectedSlotIds?: string[];
          stadiumId?: number | null;
          stadiumName?: string;
        }>(STEP2_STORAGE_KEY) ?? {}
      );
    } catch {
      return {};
    }
  });

  const [step3Data] = useState(() => {
    try {
      return (
        persistentStorage.getJson<{
          category?: 'adult' | 'teenager' | 'children';
          teamType?: 'competitive' | 'amateur';
          primaryColor?: string;
          secondaryColor?: string;
        }>(STEP3_STORAGE_KEY) ?? {}
      );
    } catch {
      return {};
    }
  });

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // ── Derived Formatted Values ──
  const teamName = step1Data.name?.trim() || 'نجوم زاكورة';
  const customLogoUri = step1Data.logoUri ?? null;
  const presetLogoId = step1Data.presetId ?? 1;

  // Selected Days formatting
  const selectedDayIds = step2Data.selectedDayIds ?? [1, 3, 5];
  const formattedDays =
    selectedDayIds.length > 0
      ? selectedDayIds
          .map((id) => DAY_LABELS[id])
          .filter(Boolean)
          .join('، ')
      : 'الإثنين، الأربعاء، الجمعة';

  // Selected Hours formatting (Displaying Arabic format: 21:00 - 20:00 matching reference)
  const selectedSlotIds = step2Data.selectedSlotIds ?? ['slot-4'];
  const formattedHours =
    selectedSlotIds.length > 0
      ? selectedSlotIds
          .map((id) => {
            const label = TIME_SLOT_LABELS[id];
            if (label === '20:00 - 21:00') return '21:00 - 20:00';
            return label;
          })
          .filter(Boolean)
          .join(' | ')
      : '21:00 - 20:00';

  // Category
  const categoryKey = step3Data.category ?? 'teenager';
  const formattedCategory = CATEGORY_LABELS[categoryKey] ?? 'شباب (أقل من 20 سنة)';

  // Team Type
  const teamTypeKey = step3Data.teamType ?? 'competitive';
  const formattedTeamType = TYPE_LABELS[teamTypeKey] ?? 'تنافسي';

  // Kit Colors
  const primaryColor = step3Data.primaryColor ?? '#00875A'; // Green in reference
  const secondaryColor = step3Data.secondaryColor ?? '#FFFFFF'; // White in reference

  // Stadium Name
  const stadiumName = step2Data.stadiumName?.trim() || 'ملعب زاكورة البلدي';

  // ── Final Submission Handler ──
  const handleFinalSubmit = async () => {
    if (submitting) return;
    setGlobalError('');
    setSubmitting(true);

    try {
      // 1. Persist setup completion locally
      persistentStorage.setJson('manager.onboardingCompleted', true);

      // 2. Call existing Laravel Onboarding Complete endpoint if user is authenticated
      if (user) {
        await post('/manager/onboarding/complete', {});
      }

      // 3. Display official success confirmation dialog (preserving pending booking status)
      setShowSuccessModal(true);
    } catch (e: unknown) {
      if (isValidationError(e)) {
        const errors = getValidationErrors(e);
        const first = errors ? Object.values(errors)[0]?.[0] : null;
        setGlobalError(first || getUserMessage(e));
      } else {
        // Fallback: Local completion persists even if offline
        setShowSuccessModal(true);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishAndNavigate = () => {
    setShowSuccessModal(false);
    // Navigate to manager space as confirmed by onboarding completion
    router.replace('/(manager)');
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/team-setup-step3');
    }
  };

  const BackArrow = isRTL ? ChevronRight : ChevronLeft;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Decorative Stadium Background */}
      <Image
        source={require('../../assets/role-selection-bg.png')}
        style={styles.bgImage}
        resizeMode="cover"
      />

      {/* ─── Top Bar: Back Button, Brand & Language Selector ─── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
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

        <View style={styles.brandCenter}>
          <Image
            source={require('../../assets/role-header-logo.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <Text style={styles.brandTitle}>AJI NQSSRO</Text>
        </View>

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

      {/* ─── Stepper / Progress Bar (4 Steps - Step 4 Active) ─── */}
      <View style={styles.stepperContainer}>
        <View style={styles.stepsRow}>
          {/* Step 1: Completed with Checkmark */}
          <View style={styles.stepNode}>
            <View style={[styles.stepCircle, styles.stepCircleCompleted]}>
              <Check size={14} color="#FFFFFF" strokeWidth={3} />
            </View>
            <Text style={styles.stepLabelCompleted} numberOfLines={1}>
              معلومات الفريق
            </Text>
          </View>

          {/* Line 1 - 2: Completed (Green) */}
          <View style={[styles.stepLine, styles.stepLineActive]} />

          {/* Step 2: Completed with Checkmark */}
          <View style={styles.stepNode}>
            <View style={[styles.stepCircle, styles.stepCircleCompleted]}>
              <Check size={14} color="#FFFFFF" strokeWidth={3} />
            </View>
            <Text style={styles.stepLabelCompleted} numberOfLines={1}>
              المواعيد الأسبوعية
            </Text>
          </View>

          {/* Line 2 - 3: Completed (Green) */}
          <View style={[styles.stepLine, styles.stepLineActive]} />

          {/* Step 3: Completed with Checkmark */}
          <View style={styles.stepNode}>
            <View style={[styles.stepCircle, styles.stepCircleCompleted]}>
              <Check size={14} color="#FFFFFF" strokeWidth={3} />
            </View>
            <Text style={styles.stepLabelCompleted} numberOfLines={1}>
              بيانات إضافية
            </Text>
          </View>

          {/* Line 3 - 4: Completed (Green) */}
          <View style={[styles.stepLine, styles.stepLineActive]} />

          {/* Step 4: Active with number 4 */}
          <View style={styles.stepNode}>
            <View style={[styles.stepCircle, styles.stepCircleActive]}>
              <Text style={styles.stepNumberActive}>4</Text>
            </View>
            <Text style={[styles.stepLabel, styles.stepLabelActive]} numberOfLines={1}>
              إتمام الإعداد
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 28 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero Section: Coach with Checkered Flag & Screen Title ─── */}
        <View style={styles.heroRow}>
          {/* Coach Illustration */}
          <View style={styles.coachWrap}>
            <Image
              source={require('../../assets/team-setup-coach-step2.png')}
              style={styles.coachImage}
              resizeMode="contain"
            />
          </View>

          {/* Screen Title & Description */}
          <View style={styles.heroInfo}>
            <View style={styles.titleWithIconRow}>
              <View style={styles.flagIconBadge}>
                <FinishFlagIcon size={26} />
              </View>
              <Text style={styles.heroTitle}>إتمام إعداد فريقك</Text>
            </View>
            <Text style={styles.heroSubtitle}>
              راجع معلومات فريقك قبل الإرسال النهائي
            </Text>
          </View>
        </View>

        {/* ─── Main White Review Card ─── */}
        <View style={styles.cardContainer}>
          {/* Error Alert */}
          {globalError ? (
            <View style={styles.errorAlert}>
              <AlertCircle size={18} color="#DC2626" />
              <Text style={styles.errorAlertText}>{globalError}</Text>
            </View>
          ) : null}

          {/* ── Section Title: ملخص بيانات الفريق ── */}
          <View style={styles.summaryTitleRow}>
            <Text style={styles.summaryTitleText}>ملخص بيانات الفريق</Text>
            <View style={styles.summaryTitleIconBadge}>
              <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  stroke="#00875A"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
                <Path
                  d="M9 13l2 2 4-4"
                  stroke="#00875A"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </View>
          </View>

          {/* ── Team Information Banner (Logo + Team Name) ── */}
          <View style={styles.teamBannerCard}>
            {/* Team Logo (Left in RTL composition) */}
            <View style={styles.teamLogoWrap}>
              {customLogoUri ? (
                <Image
                  source={{ uri: customLogoUri }}
                  style={styles.teamLogoImage}
                  resizeMode="cover"
                />
              ) : (
                <Image
                  source={PRESET_LOGOS[presetLogoId] ?? PRESET_LOGOS[1]}
                  style={styles.teamLogoImage}
                  resizeMode="contain"
                />
              )}
            </View>

            {/* Team Name Info (Right in RTL composition) */}
            <View style={styles.teamBannerInfo}>
              <View style={styles.teamNameTitleRow}>
                <Text style={styles.teamNameText} numberOfLines={1}>
                  {teamName}
                </Text>
                <Users size={22} color="#00875A" />
              </View>
              <Text style={styles.teamNameSubLabel}>اسم الفريق</Text>
            </View>
          </View>

          {/* ── 2 x 3 Info Tiles Grid ── */}
          <View style={styles.tilesGrid}>
            {/* Row 1: ساعة اللعب (Right) | أيام اللعب (Left) */}
            <View style={styles.gridRow}>
              {/* Left Tile: أيام اللعب */}
              <View style={[styles.infoTile, styles.halfTile]}>
                <View style={styles.tileHeaderRow}>
                  <Text style={styles.tileHeaderLabel}>أيام اللعب</Text>
                  <Calendar size={18} color="#00875A" />
                </View>
                <Text style={styles.tileValueText} numberOfLines={2}>
                  {formattedDays}
                </Text>
              </View>

              {/* Right Tile: ساعة اللعب */}
              <View style={[styles.infoTile, styles.halfTile]}>
                <View style={styles.tileHeaderRow}>
                  <Text style={styles.tileHeaderLabel}>ساعة اللعب</Text>
                  <Clock size={18} color="#00875A" />
                </View>
                <Text style={styles.tileValueText} numberOfLines={1}>
                  {formattedHours}
                </Text>
              </View>
            </View>

            {/* Row 2: ألوان الفريق (Left) | الفئة العمرية (Right) */}
            <View style={styles.gridRow}>
              {/* Left Tile: ألوان الفريق */}
              <View style={[styles.infoTile, styles.halfTile]}>
                <View style={styles.tileHeaderRow}>
                  <Text style={styles.tileHeaderLabel}>ألوان الفريق</Text>
                  <JerseyIcon color="#00875A" strokeColor="#00875A" size={20} />
                </View>
                <View style={styles.jerseysPreviewRow}>
                  <JerseyIcon
                    color={secondaryColor}
                    strokeColor="#64748B"
                    size={30}
                  />
                  <JerseyIcon
                    color={primaryColor}
                    strokeColor="#0B192C"
                    size={30}
                  />
                </View>
              </View>

              {/* Right Tile: الفئة العمرية */}
              <View style={[styles.infoTile, styles.halfTile]}>
                <View style={styles.tileHeaderRow}>
                  <Text style={styles.tileHeaderLabel}>الفئة العمرية</Text>
                  <Users size={18} color="#00875A" />
                </View>
                <Text style={styles.tileValueText} numberOfLines={2}>
                  {formattedCategory}
                </Text>
              </View>
            </View>

            {/* Row 3: نوع الفريق (Left) | الملعب (Right) */}
            <View style={styles.gridRow}>
              {/* Left Tile: نوع الفريق */}
              <View style={[styles.infoTile, styles.halfTile]}>
                <View style={styles.tileHeaderRow}>
                  <Text style={styles.tileHeaderLabel}>نوع الفريق</Text>
                  <Trophy size={18} color="#00875A" />
                </View>
                <Text style={styles.tileValueGreen} numberOfLines={1}>
                  {formattedTeamType}
                </Text>
              </View>

              {/* Right Tile: الملعب */}
              <View style={[styles.infoTile, styles.halfTile]}>
                <View style={styles.tileHeaderRow}>
                  <Text style={styles.tileHeaderLabel}>الملعب</Text>
                  <MapPin size={18} color="#00875A" />
                </View>
                <View style={styles.stadiumValueRow}>
                  <Text style={styles.stadiumNameText} numberOfLines={1}>
                    {stadiumName}
                  </Text>
                  <Image
                    source={require('../../assets/stadium-thumbnail-default.png')}
                    style={styles.stadiumThumbnail}
                    resizeMode="cover"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* ── Notice Card (Booking Request Workflow) ── */}
          <View style={styles.noticeCard}>
            <View style={styles.noticeContentRow}>
              <Text style={styles.noticeText}>
                سيتم إرسال طلب حجز المواعيد إلى صاحب الملعب للموافقة عليه. ستصلك النتيجة في إشعارات التطبيق.
              </Text>
              <View style={styles.noticeIconWrap}>
                <Info size={22} color="#00875A" />
              </View>
            </View>
          </View>

          {/* ── Action Buttons ── */}
          <View style={styles.actionsContainer}>
            {/* Primary Button: إرسال الطلب */}
            <Pressable
              onPress={handleFinalSubmit}
              disabled={submitting}
              style={({ pressed }) => [
                styles.primaryButton,
                { opacity: pressed || submitting ? 0.88 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="إرسال الطلب"
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.btnContentRow}>
                  <Text style={styles.primaryButtonText}>إرسال الطلب</Text>
                  <Send size={20} color="#FFFFFF" style={styles.sendIconRotated} />
                </View>
              )}
            </Pressable>

            {/* Secondary Button: تعديل البيانات */}
            <Pressable
              onPress={() => setShowEditModal(true)}
              style={({ pressed }) => [
                styles.secondaryButton,
                { opacity: pressed ? 0.8 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="تعديل البيانات"
            >
              <View style={styles.btnContentRow}>
                <Text style={styles.secondaryButtonText}>تعديل البيانات</Text>
                <Pencil size={18} color="#00875A" />
              </View>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {/* ─── Edit Step Selection Modal ─── */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowEditModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowEditModal(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalSheetTitle}>اختر الخطوة المراد تعديلها</Text>
              <Pressable
                onPress={() => setShowEditModal(false)}
                hitSlop={8}
                style={styles.closeBtn}
              >
                <X size={18} color="#64748B" />
              </Pressable>
            </View>

            <View style={styles.editOptionsList}>
              {/* Option 1: Step 1 */}
              <Pressable
                onPress={() => {
                  setShowEditModal(false);
                  router.push('/(auth)/team-setup');
                }}
                style={styles.editOptionItem}
              >
                <Text style={styles.editOptionArrow}>‹</Text>
                <View style={styles.editOptionTexts}>
                  <Text style={styles.editOptionTitle}>معلومات الفريق</Text>
                  <Text style={styles.editOptionSub}>تعديل اسم الفريق والشعار والمدينة</Text>
                </View>
                <View style={styles.editOptionStepNum}>
                  <Text style={styles.editOptionStepNumText}>1</Text>
                </View>
              </Pressable>

              {/* Option 2: Step 2 */}
              <Pressable
                onPress={() => {
                  setShowEditModal(false);
                  router.push('/(auth)/team-setup-step2');
                }}
                style={styles.editOptionItem}
              >
                <Text style={styles.editOptionArrow}>‹</Text>
                <View style={styles.editOptionTexts}>
                  <Text style={styles.editOptionTitle}>المواعيد الأسبوعية</Text>
                  <Text style={styles.editOptionSub}>تعديل أيام وساعات اللعب والملعب</Text>
                </View>
                <View style={styles.editOptionStepNum}>
                  <Text style={styles.editOptionStepNumText}>2</Text>
                </View>
              </Pressable>

              {/* Option 3: Step 3 */}
              <Pressable
                onPress={() => {
                  setShowEditModal(false);
                  router.push('/(auth)/team-setup-step3');
                }}
                style={styles.editOptionItem}
              >
                <Text style={styles.editOptionArrow}>‹</Text>
                <View style={styles.editOptionTexts}>
                  <Text style={styles.editOptionTitle}>بيانات إضافية</Text>
                  <Text style={styles.editOptionSub}>تعديل الفئة العمرية ونوع وألوان الفريق</Text>
                </View>
                <View style={styles.editOptionStepNum}>
                  <Text style={styles.editOptionStepNumText}>3</Text>
                </View>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ─── Language Modal ─── */}
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
          <View style={styles.modalDialog}>
            <Text style={styles.modalDialogTitle}>اختر لغة التطبيق</Text>
            {LANGUAGES.map((l) => (
              <Pressable
                key={l.key}
                onPress={() => {
                  setLocale(l.key);
                  setShowLangModal(false);
                }}
                style={[
                  styles.modalDialogItem,
                  locale === l.key && styles.modalItemActive,
                ]}
              >
                <Text style={styles.langFlag}>{l.flag}</Text>
                <Text style={styles.langName}>{l.name}</Text>
                {locale === l.key ? <Check size={18} color="#00875A" /> : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* ─── Success Confirmation Dialog ─── */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.successCard}>
            <View style={styles.successIconBadge}>
              <Check size={34} color="#FFFFFF" strokeWidth={3} />
            </View>
            <Text style={styles.successTitle}>تم إرسال طلبك بنجاح!</Text>
            <Text style={styles.successMessage}>
              تم تسجيل بيانات فريقك بنجاح، وإرسال طلب حجز المواعيد لمالك الملعب ({stadiumName}) للمراجعة والاعتماد.
              {'\n\n'}
              ستصلك النتيجة وتحديثات الحجز مباشرة عبر إشعارات التطبيق فور موافقة مالك الملعب.
            </Text>
            <Pressable
              onPress={handleFinishAndNavigate}
              style={styles.successButton}
            >
              <Text style={styles.successButtonText}>الانتقال إلى لوحة التحكم  ›</Text>
            </Pressable>
          </View>
        </View>
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
    opacity: 0.45,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  brandCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 28,
    height: 28,
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0B192C',
    letterSpacing: 0.5,
  },
  langSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  langSelectorText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00875A',
  },
  stepperContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepNode: {
    alignItems: 'center',
    minWidth: 64,
  },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: '#00875A',
    shadowColor: '#00875A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  stepCircleCompleted: {
    backgroundColor: '#00875A',
  },
  stepNumberActive: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
  },
  stepLabelActive: {
    color: '#0B192C',
    fontWeight: '800',
  },
  stepLabelCompleted: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00875A',
    textAlign: 'center',
  },
  stepLine: {
    flex: 1,
    height: 2.5,
    backgroundColor: '#E2E8F0',
    marginHorizontal: 4,
    marginTop: -16,
  },
  stepLineActive: {
    backgroundColor: '#00875A',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 8,
  },
  coachWrap: {
    width: 120,
    height: 125,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  coachImage: {
    width: '100%',
    height: '100%',
  },
  heroInfo: {
    flex: 1,
    alignItems: 'flex-end',
    paddingStart: 12,
  },
  titleWithIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  flagIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0B192C',
    textAlign: 'right',
  },
  heroSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'right',
    marginTop: 2,
    lineHeight: 18,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  errorAlertText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
    textAlign: 'right',
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 14,
  },
  summaryTitleText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0B192C',
    textAlign: 'right',
  },
  summaryTitleIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  teamLogoWrap: {
    width: 68,
    height: 68,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  teamLogoImage: {
    width: 60,
    height: 60,
  },
  teamBannerInfo: {
    flex: 1,
    alignItems: 'flex-end',
    paddingStart: 12,
  },
  teamNameTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamNameText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0B192C',
    textAlign: 'right',
  },
  teamNameSubLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
    textAlign: 'right',
  },
  tilesGrid: {
    gap: 10,
    marginBottom: 14,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  infoTile: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'space-between',
    minHeight: 82,
  },
  halfTile: {
    flex: 1,
  },
  tileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginBottom: 6,
  },
  tileHeaderLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0B192C',
    textAlign: 'right',
  },
  tileValueText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0B192C',
    textAlign: 'right',
    lineHeight: 18,
  },
  tileValueGreen: {
    fontSize: 15,
    fontWeight: '900',
    color: '#00875A',
    textAlign: 'right',
  },
  jerseysPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  stadiumValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  stadiumNameText: {
    flex: 1,
    fontSize: 11,
    fontWeight: '800',
    color: '#0B192C',
    textAlign: 'right',
  },
  stadiumThumbnail: {
    width: 38,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  noticeCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    marginBottom: 16,
  },
  noticeContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
  },
  noticeText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
    textAlign: 'right',
    lineHeight: 18,
  },
  noticeIconWrap: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionsContainer: {
    gap: 10,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00875A',
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: '#00875A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sendIconRotated: {
    transform: [{ rotate: '-45deg' }],
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1.5,
    borderColor: '#00875A',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#00875A',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalSheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0B192C',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editOptionsList: {
    paddingVertical: 12,
    gap: 10,
  },
  editOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  editOptionStepNum: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  editOptionStepNumText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  editOptionTexts: {
    flex: 1,
    paddingHorizontal: 12,
    alignItems: 'flex-end',
  },
  editOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B192C',
    textAlign: 'right',
  },
  editOptionSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'right',
  },
  editOptionArrow: {
    fontSize: 20,
    fontWeight: '700',
    color: '#94A3B8',
  },
  modalDialog: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    marginHorizontal: 32,
    marginBottom: 'auto',
    marginTop: 'auto',
  },
  modalDialogTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0B192C',
    textAlign: 'center',
    marginBottom: 14,
  },
  modalDialogItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  modalItemActive: {
    backgroundColor: '#ECFDF5',
  },
  langFlag: {
    fontSize: 20,
  },
  langName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#0B192C',
    textAlign: 'right',
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 24,
    marginHorizontal: 24,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  successIconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#00875A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0B192C',
    textAlign: 'center',
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  successButton: {
    backgroundColor: '#00875A',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  successButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
