import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  X,
} from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { useStadiums, type StadiumOption } from '@/api/managerMatches';
import { persistentStorage } from '@/services/storage/persistent-storage';
import { post } from '@/api/client';
import { getUserMessage, isValidationError, getValidationErrors } from '@/api/errors';
import type { SupportedLocale } from '@/types';

// ── Day Options (0: Sunday, 1: Monday, ... 6: Saturday in PHP Carbon) ──
export interface DayItem {
  id: number;
  nameAr: string;
}

export const PLAY_DAYS_ROW_1: DayItem[] = [
  { id: 1, nameAr: 'الإثنين' },
  { id: 2, nameAr: 'الثلاثاء' },
  { id: 3, nameAr: 'الأربعاء' },
  { id: 4, nameAr: 'الخميس' },
];

export const PLAY_DAYS_ROW_2: DayItem[] = [
  { id: 5, nameAr: 'الجمعة' },
  { id: 6, nameAr: 'السبت' },
  { id: 0, nameAr: 'الأحد' },
];

// ── Time Slot Options ──────────────────────────────────────────────
export interface TimeSlotItem {
  id: string;
  start: string;
  end: string;
  displayAr: string;
}

export const TIME_SLOTS: TimeSlotItem[] = [
  { id: '15-16', start: '15:00', end: '16:00', displayAr: '16:00 - 15:00' },
  { id: '16-17', start: '16:00', end: '17:00', displayAr: '17:00 - 16:00' },
  { id: '17-18', start: '17:00', end: '18:00', displayAr: '18:00 - 17:00' },
  { id: '18-19', start: '18:00', end: '19:00', displayAr: '19:00 - 18:00' },
  { id: '19-20', start: '19:00', end: '20:00', displayAr: '20:00 - 19:00' },
  { id: '20-21', start: '20:00', end: '21:00', displayAr: '21:00 - 20:00' },
];

const SCHEDULE_STORAGE_KEY = 'manager.pendingSchedule';
const TEAM_STORAGE_KEY = 'manager.pendingTeamSetup';

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

export default function TeamSetupStep2Screen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { locale, setLocale, isRTL } = useI18n();

  // Fetch real stadiums from existing backend API
  const stadiumsQuery = useStadiums();
  const stadiumsList: StadiumOption[] = useMemo(
    () => stadiumsQuery.data?.stadiums ?? [],
    [stadiumsQuery.data]
  );

  // Retrieve step 1 data to know team city for smart stadium sorting
  const step1Data = useMemo(() => {
    try {
      return persistentStorage.getJson<{
        name?: string;
        city?: string;
        region?: string;
      }>(TEAM_STORAGE_KEY);
    } catch {
      return null;
    }
  }, []);

  // ── Selected Days State (Multi-selection) ──
  // Pre-select Monday, Wednesday, Friday as shown in approved reference
  const [selectedDayIds, setSelectedDayIds] = useState<number[]>(() => {
    try {
      const saved = persistentStorage.getJson<{ selectedDayIds?: number[] }>(
        SCHEDULE_STORAGE_KEY
      );
      return saved?.selectedDayIds ?? [1, 3, 5];
    } catch {
      return [1, 3, 5];
    }
  });

  // ── Selected Hours Slots State ──
  // Pre-select 20:00 - 21:00 as shown in approved reference
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>(() => {
    try {
      const saved = persistentStorage.getJson<{ selectedSlotIds?: string[] }>(
        SCHEDULE_STORAGE_KEY
      );
      return saved?.selectedSlotIds ?? ['20-21'];
    } catch {
      return ['20-21'];
    }
  });

  // ── Selected Pitch / Stadium ──
  const [selectedStadiumId, setSelectedStadiumId] = useState<number | null>(() => {
    try {
      const saved = persistentStorage.getJson<{ stadiumId?: number }>(
        SCHEDULE_STORAGE_KEY
      );
      return saved?.stadiumId ?? null;
    } catch {
      return null;
    }
  });

  // UI & Loading State
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [showStadiumModal, setShowStadiumModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);

  // Find currently selected stadium object
  const currentStadium = useMemo(() => {
    if (!selectedStadiumId) return stadiumsList[0] ?? null;
    return stadiumsList.find((s) => s.id === selectedStadiumId) ?? stadiumsList[0] ?? null;
  }, [stadiumsList, selectedStadiumId]);

  // ── Toggle Day Selection ──
  const handleToggleDay = (dayId: number) => {
    setSelectedDayIds((prev) => {
      if (prev.includes(dayId)) {
        if (prev.length === 1) return prev; // Keep at least one day selected
        return prev.filter((id) => id !== dayId);
      }
      return [...prev, dayId];
    });
    setGlobalError('');
  };

  // ── Toggle Time Slot Selection ──
  const handleToggleSlot = (slotId: string) => {
    setSelectedSlotIds((prev) => {
      if (prev.includes(slotId)) {
        if (prev.length === 1) return prev; // Keep at least one slot selected
        return prev.filter((id) => id !== slotId);
      }
      return [...prev, slotId];
    });
    setGlobalError('');
  };

  // ── Form Submission & Backend Booking Request ──
  const handleSubmit = async () => {
    setGlobalError('');

    if (selectedDayIds.length === 0) {
      setGlobalError('يرجى اختيار يوم واحد على الأقل للعب الأسبوعي');
      return;
    }

    if (selectedSlotIds.length === 0) {
      setGlobalError('يرجى اختيار موعد لعب واحد على الأقل');
      return;
    }

    setLoading(true);
    try {
      const stadiumIdToUse = currentStadium?.id ?? selectedStadiumId ?? null;
      const stadiumNameToUse = currentStadium?.name ?? 'ملعب اعتيادي';

      // 1. Build schedule items array conforming strictly to Laravel OnboardingController
      const schedulesPayload = selectedDayIds.flatMap((dayId) =>
        selectedSlotIds.map((slotId) => {
          const slot = TIME_SLOTS.find((s) => s.id === slotId);
          return {
            day_of_week: dayId,
            start_time: slot?.start ?? '20:00',
            end_time: slot?.end ?? '21:00',
            pitch_name: stadiumNameToUse,
            terrain_id: stadiumIdToUse,
            reservation_type: 'weekly_subscription',
          };
        })
      );

      // 2. Persist locally to ensure no data loss
      persistentStorage.setJson(SCHEDULE_STORAGE_KEY, {
        selectedDayIds,
        selectedSlotIds,
        stadiumId: stadiumIdToUse,
        stadiumName: stadiumNameToUse,
      });

      // 3. Submit through existing Laravel Onboarding API when user is authenticated
      if (user) {
        await post('/manager/onboarding/schedule', {
          has_regular_time: true,
          schedules: schedulesPayload,
        });
      }

      // 4. Report Step 2 completion & navigate to Step 3 (بيانات إضافية)
      router.push('/(auth)/team-setup-step3');
    } catch (e: unknown) {
      if (isValidationError(e)) {
        const errors = getValidationErrors(e);
        if (errors) {
          const firstErr = Object.values(errors)[0]?.[0];
          setGlobalError(firstErr || getUserMessage(e));
        } else {
          setGlobalError(getUserMessage(e));
        }
      } else {
        // Fallback: If network / server error, local persistence succeeded
        router.push('/(auth)/team-setup-step3');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/team-setup');
    }
  };

  const ForwardArrow = isRTL ? ChevronLeft : ChevronRight;
  const BackArrow = isRTL ? ChevronRight : ChevronLeft;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Background Pattern */}
      <Image
        source={require('../../assets/role-selection-bg.png')}
        style={styles.bgImage}
        resizeMode="cover"
      />

      {/* ─── Top Bar: Back, Brand & Language ─── */}
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

      {/* ─── Stepper / Progress Bar (4 Steps) ─── */}
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

          {/* Step 2: Active */}
          <View style={styles.stepNode}>
            <View style={[styles.stepCircle, styles.stepCircleActive]}>
              <Text style={styles.stepNumberActive}>2</Text>
            </View>
            <Text style={[styles.stepLabel, styles.stepLabelActive]} numberOfLines={1}>
              المواعيد الأسبوعية
            </Text>
          </View>

          {/* Line 2 - 3: Inactive */}
          <View style={styles.stepLine} />

          {/* Step 3: Inactive */}
          <View style={styles.stepNode}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <Text style={styles.stepLabel} numberOfLines={1}>
              بيانات إضافية
            </Text>
          </View>

          {/* Line 3 - 4: Inactive */}
          <View style={styles.stepLine} />

          {/* Step 4: Inactive */}
          <View style={styles.stepNode}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>4</Text>
            </View>
            <Text style={styles.stepLabel} numberOfLines={1}>
              إتمام الإعداد
            </Text>
          </View>
        </View>
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
          {/* ─── Hero Section: Coach with Thumbs-up & Screen Title ─── */}
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
                <View style={styles.calendarIconBadge}>
                  <Calendar size={18} color="#00875A" />
                </View>
                <Text style={styles.heroTitle}>مواعيد فريقك الأسبوعية</Text>
              </View>
              <Text style={styles.heroSubtitle}>
                اختر الأيام والساعات التي يلعب فيها فريقك كل أسبوع
              </Text>
            </View>
          </View>

          {/* ─── Main White Setup Card ─── */}
          <View style={styles.cardContainer}>
            {/* Error Alert */}
            {globalError ? (
              <View style={styles.errorAlert}>
                <AlertCircle size={18} color="#DC2626" />
                <Text style={styles.errorAlertText}>{globalError}</Text>
              </View>
            ) : null}

            {/* ─── SECTION 1: اختر أيام اللعب ─── */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionNumberBadge}>
                  <Text style={styles.sectionNumberText}>1</Text>
                </View>
                <Text style={styles.sectionTitle}>اختر أيام اللعب</Text>
                <Calendar size={18} color="#00875A" />
              </View>

              {/* Row 1: 4 Days (الإثنين, الثلاثاء, الأربعاء, الخميس) */}
              <View style={styles.daysRow}>
                {PLAY_DAYS_ROW_1.map((day) => {
                  const isSelected = selectedDayIds.includes(day.id);
                  return (
                    <Pressable
                      key={day.id}
                      onPress={() => handleToggleDay(day.id)}
                      style={[
                        styles.dayTile,
                        isSelected && styles.dayTileActive,
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={day.nameAr}
                    >
                      <Calendar
                        size={22}
                        color={isSelected ? '#00875A' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.dayTileText,
                          isSelected && styles.dayTileTextActive,
                        ]}
                      >
                        {day.nameAr}
                      </Text>

                      {isSelected ? (
                        <View style={styles.tileCheckBadge}>
                          <Check size={11} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>

              {/* Row 2: 3 Days (الجمعة, السبت, الأحد) */}
              <View style={styles.daysRow}>
                {PLAY_DAYS_ROW_2.map((day) => {
                  const isSelected = selectedDayIds.includes(day.id);
                  return (
                    <Pressable
                      key={day.id}
                      onPress={() => handleToggleDay(day.id)}
                      style={[
                        styles.dayTile,
                        isSelected && styles.dayTileActive,
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={day.nameAr}
                    >
                      <Calendar
                        size={22}
                        color={isSelected ? '#00875A' : '#64748B'}
                      />
                      <Text
                        style={[
                          styles.dayTileText,
                          isSelected && styles.dayTileTextActive,
                        ]}
                      >
                        {day.nameAr}
                      </Text>

                      {isSelected ? (
                        <View style={styles.tileCheckBadge}>
                          <Check size={11} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ─── SECTION 2: اختر ساعة اللعب ─── */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionNumberBadge}>
                  <Text style={styles.sectionNumberText}>2</Text>
                </View>
                <Text style={styles.sectionTitle}>اختر ساعة اللعب</Text>
                <Clock size={18} color="#00875A" />
              </View>

              {/* 3x2 Grid for Time Slots */}
              <View style={styles.timeSlotsGrid}>
                {TIME_SLOTS.map((slot) => {
                  const isSelected = selectedSlotIds.includes(slot.id);
                  return (
                    <Pressable
                      key={slot.id}
                      onPress={() => handleToggleSlot(slot.id)}
                      style={[
                        styles.slotTile,
                        isSelected && styles.slotTileActive,
                      ]}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: isSelected }}
                      accessibilityLabel={slot.displayAr}
                    >
                      <Clock
                        size={19}
                        color={isSelected ? '#00875A' : '#1E293B'}
                      />
                      <Text
                        style={[
                          styles.slotTileText,
                          isSelected && styles.slotTileTextActive,
                        ]}
                      >
                        {slot.displayAr}
                      </Text>

                      {isSelected ? (
                        <View style={styles.tileCheckBadge}>
                          <Check size={11} color="#FFFFFF" strokeWidth={3} />
                        </View>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>

            {/* ─── SECTION 3: اختيار الملعب (Real Pitch Selection) ─── */}
            <View style={styles.sectionBlock}>
              <View style={styles.pitchHeaderRow}>
                <View style={styles.pitchTitleWrap}>
                  <MapPin size={17} color="#00875A" />
                  <Text style={styles.pitchSectionTitle}>الملعب المفضل للفريق</Text>
                </View>
                {step1Data?.city ? (
                  <Text style={styles.pitchCityBadge}>مدينة {step1Data.city}</Text>
                ) : null}
              </View>

              <Pressable
                onPress={() => setShowStadiumModal(true)}
                style={styles.stadiumSelectorButton}
                accessibilityRole="button"
                accessibilityLabel="اختر الملعب"
              >
                <ChevronDown size={16} color="#64748B" />
                <View style={styles.stadiumSelectedTextWrap}>
                  <Text style={styles.stadiumSelectedName} numberOfLines={1}>
                    {currentStadium?.name ?? 'اختر الملعب المتاح في منطقتك'}
                  </Text>
                  {currentStadium?.address ? (
                    <Text style={styles.stadiumSelectedAddress} numberOfLines={1}>
                      {currentStadium.address}
                    </Text>
                  ) : null}
                </View>
                <MapPin size={19} color="#00875A" />
              </Pressable>
            </View>

            {/* ─── Approval Workflow Notice ─── */}
            <View style={styles.workflowNoticeBox}>
              <Info size={17} color="#0369A1" />
              <Text style={styles.workflowNoticeText}>
                إرسال المواعيد ينشئ طلب حجز معلق (قيد المراجعة). يصبح الحجز مؤكداً فقط بعد موافقة مالك الملعب عبر النظام.
              </Text>
            </View>

            {/* ─── Primary Submit Button: متابعة ─── */}
            <Pressable
              onPress={handleSubmit}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryButton,
                { opacity: pressed || loading ? 0.88 : 1 },
              ]}
              accessibilityRole="button"
              accessibilityLabel="متابعة"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>متابعة</Text>
                  <ForwardArrow size={22} color="#FFFFFF" strokeWidth={2.6} />
                </>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ─── Stadium Selection Modal ─── */}
      <Modal
        visible={showStadiumModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStadiumModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowStadiumModal(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>اختر الملعب</Text>
              <Pressable
                onPress={() => setShowStadiumModal(false)}
                hitSlop={8}
                style={styles.closeBtn}
              >
                <X size={18} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {stadiumsList.length === 0 ? (
                <View style={styles.emptyStadiumsWrap}>
                  <Text style={styles.emptyStadiumsText}>
                    جاري تحميل الملاعب المتاحة من الخادم...
                  </Text>
                </View>
              ) : (
                stadiumsList.map((stadium) => {
                  const isSelected = (currentStadium?.id ?? selectedStadiumId) === stadium.id;
                  return (
                    <Pressable
                      key={stadium.id}
                      onPress={() => {
                        setSelectedStadiumId(stadium.id);
                        setShowStadiumModal(false);
                      }}
                      style={[
                        styles.stadiumItem,
                        isSelected && styles.stadiumItemActive,
                      ]}
                    >
                      <View style={styles.stadiumItemInfo}>
                        <Text style={styles.stadiumItemName}>{stadium.name}</Text>
                        <Text style={styles.stadiumItemSub}>
                          {[stadium.city, stadium.address, stadium.player_format]
                            .filter(Boolean)
                            .join(' • ')}
                        </Text>
                      </View>
                      {isSelected ? <Check size={18} color="#00875A" /> : null}
                    </Pressable>
                  );
                })
              )}
            </ScrollView>
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
            <Text style={styles.modalTitle}>اختر لغة التطبيق</Text>
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
        visible={showSuccessAlert}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessAlert(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.successCard}>
            <View style={styles.successIconBadge}>
              <Check size={32} color="#FFFFFF" strokeWidth={3} />
            </View>
            <Text style={styles.successTitle}>تم تسجيل المواعيد بنجاح!</Text>
            <Text style={styles.successMessage}>
              تم إرسال طلب الحجز لمالك الملعب ({currentStadium?.name ?? 'الملعب المحدد'}).
              {'\n\n'}
              الحالة الحالية: «قيد المراجعة» بانتظار موافقة مالك الملعب وفق نظام الحجوزات الرسمي.
              {'\n\n'}
              الخطوة 3 (بيانات إضافية) قيد الاعتماد للمهمة القادمة.
            </Text>
            <Pressable
              onPress={() => setShowSuccessAlert(false)}
              style={styles.successButton}
            >
              <Text style={styles.successButtonText}>حسناً، فهمت</Text>
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
    opacity: 0.16,
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
    paddingBottom: 8,
    zIndex: 10,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
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

  // ── Stepper ──
  stepperContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  stepNode: {
    alignItems: 'center',
    width: 72,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 5,
  },
  stepCircleCompleted: {
    backgroundColor: '#00875A',
  },
  stepCircleActive: {
    backgroundColor: '#00875A',
    shadowColor: '#00875A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  stepNumberActive: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  stepLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#94A3B8',
    textAlign: 'center',
  },
  stepLabelCompleted: {
    fontSize: 10,
    fontWeight: '700',
    color: '#00875A',
    textAlign: 'center',
  },
  stepLabelActive: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0B192C',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginTop: 13,
  },
  stepLineActive: {
    backgroundColor: '#00875A',
  },

  // ── Hero Section ──
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 16,
  },
  coachWrap: {
    width: 120,
    height: 125,
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
  titleWithIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  calendarIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0B192C',
    textAlign: 'right',
  },
  heroSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: '#475569',
    textAlign: 'right',
  },

  // ── Main Card ──
  cardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 28,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
    gap: 20,
  },

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
  },
  errorAlertText: {
    flex: 1,
    fontSize: 12.5,
    color: '#B91C1C',
    fontWeight: '600',
    textAlign: 'right',
  },

  // ── Sections ──
  sectionBlock: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionNumberBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNumberText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0B192C',
    textAlign: 'right',
  },

  // ── Days Grid ──
  daysRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dayTile: {
    flex: 1,
    height: 82,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    gap: 6,
  },
  dayTileActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#00875A',
    borderWidth: 1.8,
  },
  dayTileText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#0B192C',
  },
  dayTileTextActive: {
    color: '#00875A',
    fontWeight: '800',
  },
  tileCheckBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    backgroundColor: '#00875A',
    width: 17,
    height: 17,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Time Slots Grid ──
  timeSlotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotTile: {
    width: '31.5%',
    height: 70,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    gap: 4,
  },
  slotTileActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#00875A',
    borderWidth: 1.8,
  },
  slotTileText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1E293B',
  },
  slotTileTextActive: {
    color: '#00875A',
    fontWeight: '800',
  },

  // ── Pitch Selection ──
  pitchHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pitchTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pitchSectionTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#0B192C',
  },
  pitchCityBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#00875A',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  stadiumSelectorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  stadiumSelectedTextWrap: {
    flex: 1,
    marginHorizontal: 10,
    alignItems: 'flex-start',
  },
  stadiumSelectedName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#0F172A',
  },
  stadiumSelectedAddress: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  // Workflow Notice Box
  workflowNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0F9FF',
    borderWidth: 1,
    borderColor: '#BAE6FD',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  workflowNoticeText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
    color: '#0369A1',
    textAlign: 'right',
  },

  // ── Primary Action Button ──
  primaryButton: {
    backgroundColor: '#00875A',
    height: 52,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
    shadowColor: '#00875A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ── Modals ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 25, 44, 0.45)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0B192C',
  },
  closeBtn: {
    padding: 4,
  },
  modalList: {
    maxHeight: 350,
  },
  emptyStadiumsWrap: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  emptyStadiumsText: {
    fontSize: 13,
    color: '#64748B',
  },
  stadiumItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stadiumItemActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#00875A',
  },
  stadiumItemInfo: {
    flex: 1,
    marginEnd: 10,
    alignItems: 'flex-start',
  },
  stadiumItemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  stadiumItemSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },

  // Language Dialog
  modalDialog: {
    width: '85%',
    maxWidth: 320,
    alignSelf: 'center',
    marginBottom: 'auto',
    marginTop: 'auto',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    gap: 10,
  },
  modalDialogItem: {
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
  },
  langFlag: {
    fontSize: 20,
  },
  langName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'right',
  },

  // Success Confirmation Dialog
  successCard: {
    width: '88%',
    maxWidth: 340,
    alignSelf: 'center',
    marginBottom: 'auto',
    marginTop: 'auto',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  successIconBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0B192C',
    textAlign: 'center',
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 13,
    lineHeight: 20,
    color: '#475569',
    textAlign: 'center',
    marginBottom: 20,
  },
  successButton: {
    backgroundColor: '#00875A',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 14,
    width: '100%',
    alignItems: 'center',
  },
  successButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
