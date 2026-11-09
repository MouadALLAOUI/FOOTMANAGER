import React, { useState } from 'react';
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
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Globe,
  Palette,
  Plus,
  Share2,
  Trophy,
  Users,
  X,
} from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { persistentStorage } from '@/services/storage/persistent-storage';
import { put } from '@/api/client';
import { getUserMessage, isValidationError, getValidationErrors } from '@/api/errors';
import type { SupportedLocale } from '@/types';

// ── Football Jersey SVG Icon ───────────────────────────────────────
function JerseyIcon({
  color = '#00875A',
  strokeColor = '#0F172A',
  size = 32,
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

// ── TikTok SVG Icon ────────────────────────────────────────────────
function TikTokIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="#000000">
      <Path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.3 0 .59.05.86.13V9.4a6.34 6.34 0 0 0-.86-.06A6.33 6.33 0 0 0 3.1 15.67a6.33 6.33 0 0 0 9.14 5.63V12.9a8.28 8.28 0 0 0 5.15 1.78v-3.45a4.83 4.83 0 0 1-2.2-1.54 4.83 4.83 0 0 1-.6-3z" />
    </Svg>
  );
}

// ── WhatsApp SVG Icon ──────────────────────────────────────────────
function WhatsAppIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="#22C55E">
      <Path d="M20.52 3.48A11.93 11.93 0 0 0 12.06 0C5.46 0 .09 5.37.09 11.97c0 2.11.55 4.17 1.6 5.99L0 24l6.21-1.63a11.93 11.93 0 0 0 5.85 1.52h.01c6.6 0 11.97-5.37 11.97-11.97 0-3.2-.1.25-1.25-4.48-3.52-6.44zM12.07 21.87h-.01c-1.8 0-3.56-.48-5.1-1.4l-.37-.22-3.79 1 1.01-3.69-.24-.38a9.92 9.92 0 0 1-1.52-5.21c0-5.48 4.46-9.94 9.95-9.94 2.66 0 5.15 1.03 7.03 2.91a9.88 9.88 0 0 1 2.91 7.03c0 5.49-4.46 9.94-9.95 9.94zm5.45-7.44c-.3-.15-1.77-.87-2.04-.97-.28-.1-.48-.15-.68.15-.2.3-.77.97-.95 1.17-.17.2-.35.23-.65.08-.3-.15-1.26-.47-2.4-1.49-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.14-.14.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.68-1.64-.93-2.25-.24-.59-.49-.51-.68-.52h-.58c-.2 0-.53.08-.8.38-.28.3-1.05 1.03-1.05 2.51s1.08 2.91 1.23 3.11c.15.2 2.12 3.24 5.14 4.54.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.18-1.42-.08-.13-.28-.2-.58-.35z" />
    </Svg>
  );
}

// ── Facebook SVG Icon ──────────────────────────────────────────────
function FacebookIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="#1877F2">
      <Path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </Svg>
  );
}

// ── Instagram SVG Icon ─────────────────────────────────────────────
function InstagramIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="#E1306C">
      <Path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </Svg>
  );
}

// ── YouTube SVG Icon ───────────────────────────────────────────────
function YouTubeIcon({ size = 22 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="#FF0000">
      <Path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </Svg>
  );
}

// ── Kit Colors Options ─────────────────────────────────────────────
const KIT_COLORS = [
  { label: 'أخضر', hex: '#00875A' },
  { label: 'أبيض', hex: '#FFFFFF' },
  { label: 'أسود', hex: '#18181B' },
  { label: 'أزرق داكن', hex: '#0F172A' },
  { label: 'أزرق ملكي', hex: '#1D4ED8' },
  { label: 'أزرق سماوي', hex: '#0EA5E9' },
  { label: 'أحمر', hex: '#DC2626' },
  { label: 'أصفر', hex: '#EAB308' },
  { label: 'برتقالي', hex: '#F97316' },
  { label: 'بنفسجي', hex: '#7C3AED' },
];

const STEP3_STORAGE_KEY = 'manager.pendingAdditionalInfo';

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

export default function TeamSetupStep3Screen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { locale, setLocale, isRTL } = useI18n();

  // ── Section A: Category (كبار / شباب / فئات أخرى) ──
  // Matches backend: in:adult,teenager,children
  const [category, setCategory] = useState<'adult' | 'teenager' | 'children'>(() => {
    try {
      const saved = persistentStorage.getJson<{ category?: 'adult' | 'teenager' | 'children' }>(
        STEP3_STORAGE_KEY
      );
      return saved?.category ?? 'teenager'; // Pre-selected in reference
    } catch {
      return 'teenager';
    }
  });

  // ── Section B: Team Type (تنافسي / هواة) ──
  // Matches backend Team level: competitive / amateur
  const [teamType, setTeamType] = useState<'competitive' | 'amateur'>(() => {
    try {
      const saved = persistentStorage.getJson<{ teamType?: 'competitive' | 'amateur' }>(
        STEP3_STORAGE_KEY
      );
      return saved?.teamType ?? 'competitive'; // Pre-selected in reference
    } catch {
      return 'competitive';
    }
  });

  // ── Section C: Kit Colors ──
  const [primaryColor, setPrimaryColor] = useState<string>(() => {
    try {
      const saved = persistentStorage.getJson<{ primaryColor?: string }>(STEP3_STORAGE_KEY);
      return saved?.primaryColor ?? '#00875A'; // Green in reference
    } catch {
      return '#00875A';
    }
  });

  const [secondaryColor, setSecondaryColor] = useState<string>(() => {
    try {
      const saved = persistentStorage.getJson<{ secondaryColor?: string }>(STEP3_STORAGE_KEY);
      return saved?.secondaryColor ?? '#FFFFFF'; // White in reference
    } catch {
      return '#FFFFFF';
    }
  });

  // ── Section D: Optional Social Media ──
  const [socialLinks, setSocialLinks] = useState<{
    whatsapp?: string;
    facebook?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
  }>(() => {
    try {
      const saved = persistentStorage.getJson<{ socialLinks?: Record<string, string> }>(
        STEP3_STORAGE_KEY
      );
      return saved?.socialLinks ?? {};
    } catch {
      return {};
    }
  });

  // Modal State
  const [activeColorPicker, setActiveColorPicker] = useState<'primary' | 'secondary' | null>(null);
  const [activeSocialPlatform, setActiveSocialPlatform] = useState<
    'whatsapp' | 'facebook' | 'instagram' | 'tiktok' | 'youtube' | null
  >(null);
  const [socialInputText, setSocialInputText] = useState('');
  const [showLangModal, setShowLangModal] = useState(false);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  // ── Open Social Input Modal ──
  const handleOpenSocial = (
    platform: 'whatsapp' | 'facebook' | 'instagram' | 'tiktok' | 'youtube'
  ) => {
    setActiveSocialPlatform(platform);
    setSocialInputText(socialLinks[platform] ?? '');
  };

  // ── Save Social Media Value ──
  const handleSaveSocial = () => {
    if (!activeSocialPlatform) return;
    const trimmed = socialInputText.trim();
    setSocialLinks((prev) => ({
      ...prev,
      [activeSocialPlatform]: trimmed || undefined,
    }));
    setActiveSocialPlatform(null);
    setSocialInputText('');
  };

  // ── Form Submission ──
  const handleSubmit = async () => {
    setGlobalError('');
    setLoading(true);

    try {
      // 1. Always persist locally
      persistentStorage.setJson(STEP3_STORAGE_KEY, {
        category,
        teamType,
        primaryColor,
        secondaryColor,
        socialLinks,
      });

      // 2. Persist to backend if authenticated
      if (user) {
        await put('/manager/team', {
          category,
          primary_color: primaryColor,
          secondary_color: secondaryColor,
        });
      }

      // 3. Step 3 Completed! Navigate to Step 4 (إتمام الإعداد)
      router.push('/(auth)/team-setup-step4');
    } catch (e: unknown) {
      if (isValidationError(e)) {
        const errors = getValidationErrors(e);
        const firstErr = errors ? Object.values(errors)[0]?.[0] : null;
        setGlobalError(firstErr || getUserMessage(e));
      } else {
        // Fallback: Local persistence succeeded
        router.push('/(auth)/team-setup-step4');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(auth)/team-setup-step2');
    }
  };

  const ForwardArrow = isRTL ? ChevronLeft : ChevronRight;
  const BackArrow = isRTL ? ChevronRight : ChevronLeft;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Decorative Background */}
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

          {/* Step 3: Active with number 3 */}
          <View style={styles.stepNode}>
            <View style={[styles.stepCircle, styles.stepCircleActive]}>
              <Text style={styles.stepNumberActive}>3</Text>
            </View>
            <Text style={[styles.stepLabel, styles.stepLabelActive]} numberOfLines={1}>
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
                <View style={styles.clipboardIconBadge}>
                  <ClipboardList size={18} color="#00875A" />
                </View>
                <Text style={styles.heroTitle}>بيانات إضافية لفريقك</Text>
              </View>
              <Text style={styles.heroSubtitle}>
                أكمل بعض المعلومات لتقديم فريقك بشكل أفضل
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

            {/* ─── SECTION A: الفئة العمرية للفريق ─── */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Users size={19} color="#00875A" />
                <Text style={styles.sectionTitle}>الفئة العمرية للفريق</Text>
              </View>

              <View style={styles.cardsRow}>
                {/* 1. كبار (20 سنة فأكثر) */}
                <Pressable
                  onPress={() => setCategory('adult')}
                  style={[
                    styles.selectableCard,
                    category === 'adult' && styles.selectableCardActive,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: category === 'adult' }}
                >
                  <Users
                    size={24}
                    color={category === 'adult' ? '#00875A' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.cardMainText,
                      category === 'adult' && styles.cardMainTextActive,
                    ]}
                  >
                    كبار
                  </Text>
                  <Text style={styles.cardSubText}>(20 سنة فأكثر)</Text>

                  {category === 'adult' ? (
                    <View style={styles.tileCheckBadge}>
                      <Check size={11} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  ) : null}
                </Pressable>

                {/* 2. شباب (أقل من 20 سنة) - Selected by default */}
                <Pressable
                  onPress={() => setCategory('teenager')}
                  style={[
                    styles.selectableCard,
                    category === 'teenager' && styles.selectableCardActive,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: category === 'teenager' }}
                >
                  <Users
                    size={24}
                    color={category === 'teenager' ? '#00875A' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.cardMainText,
                      category === 'teenager' && styles.cardMainTextActive,
                    ]}
                  >
                    شباب
                  </Text>
                  <Text style={styles.cardSubText}>(أقل من 20 سنة)</Text>

                  {category === 'teenager' ? (
                    <View style={styles.tileCheckBadge}>
                      <Check size={11} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  ) : null}
                </Pressable>

                {/* 3. فئات أخرى */}
                <Pressable
                  onPress={() => setCategory('children')}
                  style={[
                    styles.selectableCard,
                    category === 'children' && styles.selectableCardActive,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: category === 'children' }}
                >
                  <Users
                    size={24}
                    color={category === 'children' ? '#00875A' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.cardMainText,
                      category === 'children' && styles.cardMainTextActive,
                    ]}
                  >
                    فئات أخرى
                  </Text>
                  <Text style={styles.cardSubText}>(ناشئين / براعم)</Text>

                  {category === 'children' ? (
                    <View style={styles.tileCheckBadge}>
                      <Check size={11} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  ) : null}
                </Pressable>
              </View>
            </View>

            {/* ─── SECTION B: نوع الفريق ─── */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Trophy size={19} color="#00875A" />
                <Text style={styles.sectionTitle}>نوع الفريق</Text>
              </View>

              <View style={styles.cardsRow}>
                {/* 1. هواة (لعب ترفيهي) */}
                <Pressable
                  onPress={() => setTeamType('amateur')}
                  style={[
                    styles.selectableCard,
                    styles.halfCard,
                    teamType === 'amateur' && styles.selectableCardActive,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: teamType === 'amateur' }}
                >
                  <Users
                    size={24}
                    color={teamType === 'amateur' ? '#00875A' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.cardMainText,
                      teamType === 'amateur' && styles.cardMainTextActive,
                    ]}
                  >
                    هواة
                  </Text>
                  <Text style={styles.cardSubText}>(لعب ترفيهي)</Text>

                  {teamType === 'amateur' ? (
                    <View style={styles.tileCheckBadge}>
                      <Check size={11} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  ) : null}
                </Pressable>

                {/* 2. تنافسي (يشارك في بطولات) - Selected by default */}
                <Pressable
                  onPress={() => setTeamType('competitive')}
                  style={[
                    styles.selectableCard,
                    styles.halfCard,
                    teamType === 'competitive' && styles.selectableCardActive,
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: teamType === 'competitive' }}
                >
                  <Trophy
                    size={24}
                    color={teamType === 'competitive' ? '#00875A' : '#64748B'}
                  />
                  <Text
                    style={[
                      styles.cardMainText,
                      teamType === 'competitive' && styles.cardMainTextActive,
                    ]}
                  >
                    تنافسي
                  </Text>
                  <Text style={styles.cardSubText}>(يشارك في بطولات)</Text>

                  {teamType === 'competitive' ? (
                    <View style={styles.tileCheckBadge}>
                      <Check size={11} color="#FFFFFF" strokeWidth={3} />
                    </View>
                  ) : null}
                </Pressable>
              </View>
            </View>

            {/* ─── SECTION C: ألوان الفريق ─── */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Palette size={19} color="#00875A" />
                <Text style={styles.sectionTitle}>ألوان الفريق</Text>
              </View>

              <View style={styles.colorSelectorsRow}>
                {/* 1. اللون الأساسي */}
                <View style={styles.colorColumn}>
                  <Text style={styles.colorLabel}>اللون الأساسي</Text>
                  <Pressable
                    onPress={() => setActiveColorPicker('primary')}
                    style={styles.colorButton}
                    accessibilityRole="button"
                    accessibilityLabel="اختر اللون الأساسي"
                  >
                    <ChevronDown size={16} color="#64748B" />
                    <JerseyIcon color={primaryColor} size={34} />
                  </Pressable>
                </View>

                {/* 2. اللون الثانوي */}
                <View style={styles.colorColumn}>
                  <Text style={styles.colorLabel}>اللون الثانوي</Text>
                  <Pressable
                    onPress={() => setActiveColorPicker('secondary')}
                    style={styles.colorButton}
                    accessibilityRole="button"
                    accessibilityLabel="اختر اللون الثانوي"
                  >
                    <ChevronDown size={16} color="#64748B" />
                    <JerseyIcon color={secondaryColor} strokeColor="#94A3B8" size={34} />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* ─── SECTION D: وسائل التواصل (اختيارية) ─── */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Share2 size={19} color="#00875A" />
                <Text style={styles.sectionTitle}>
                  وسائل التواصل <Text style={styles.optionalText}>(اختيارية)</Text>
                </Text>
              </View>

              <View style={styles.socialIconsRow}>
                {/* WhatsApp */}
                <Pressable
                  onPress={() => handleOpenSocial('whatsapp')}
                  style={styles.socialTile}
                  accessibilityRole="button"
                  accessibilityLabel="واتساب"
                >
                  <WhatsAppIcon size={26} />
                  <View
                    style={[
                      styles.socialPlusBadge,
                      socialLinks.whatsapp && styles.socialCheckBadge,
                    ]}
                  >
                    {socialLinks.whatsapp ? (
                      <Check size={9} color="#FFFFFF" strokeWidth={3} />
                    ) : (
                      <Plus size={10} color="#FFFFFF" strokeWidth={3} />
                    )}
                  </View>
                </Pressable>

                {/* Facebook */}
                <Pressable
                  onPress={() => handleOpenSocial('facebook')}
                  style={styles.socialTile}
                  accessibilityRole="button"
                  accessibilityLabel="فيسبوك"
                >
                  <FacebookIcon size={26} />
                  <View
                    style={[
                      styles.socialPlusBadge,
                      socialLinks.facebook && styles.socialCheckBadge,
                    ]}
                  >
                    {socialLinks.facebook ? (
                      <Check size={9} color="#FFFFFF" strokeWidth={3} />
                    ) : (
                      <Plus size={10} color="#FFFFFF" strokeWidth={3} />
                    )}
                  </View>
                </Pressable>

                {/* Instagram */}
                <Pressable
                  onPress={() => handleOpenSocial('instagram')}
                  style={styles.socialTile}
                  accessibilityRole="button"
                  accessibilityLabel="إنستغرام"
                >
                  <InstagramIcon size={26} />
                  <View
                    style={[
                      styles.socialPlusBadge,
                      socialLinks.instagram && styles.socialCheckBadge,
                    ]}
                  >
                    {socialLinks.instagram ? (
                      <Check size={9} color="#FFFFFF" strokeWidth={3} />
                    ) : (
                      <Plus size={10} color="#FFFFFF" strokeWidth={3} />
                    )}
                  </View>
                </Pressable>

                {/* TikTok */}
                <Pressable
                  onPress={() => handleOpenSocial('tiktok')}
                  style={styles.socialTile}
                  accessibilityRole="button"
                  accessibilityLabel="تيك توك"
                >
                  <TikTokIcon size={24} />
                  <View
                    style={[
                      styles.socialPlusBadge,
                      socialLinks.tiktok && styles.socialCheckBadge,
                    ]}
                  >
                    {socialLinks.tiktok ? (
                      <Check size={9} color="#FFFFFF" strokeWidth={3} />
                    ) : (
                      <Plus size={10} color="#FFFFFF" strokeWidth={3} />
                    )}
                  </View>
                </Pressable>

                {/* YouTube */}
                <Pressable
                  onPress={() => handleOpenSocial('youtube')}
                  style={styles.socialTile}
                  accessibilityRole="button"
                  accessibilityLabel="يوتيوب"
                >
                  <YouTubeIcon size={26} />
                  <View
                    style={[
                      styles.socialPlusBadge,
                      socialLinks.youtube && styles.socialCheckBadge,
                    ]}
                  >
                    {socialLinks.youtube ? (
                      <Check size={9} color="#FFFFFF" strokeWidth={3} />
                    ) : (
                      <Plus size={10} color="#FFFFFF" strokeWidth={3} />
                    )}
                  </View>
                </Pressable>
              </View>
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

      {/* ─── Color Picker Modal ─── */}
      <Modal
        visible={activeColorPicker !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveColorPicker(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setActiveColorPicker(null)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {activeColorPicker === 'primary' ? 'اختر اللون الأساسي' : 'اختر اللون الثانوي'}
              </Text>
              <Pressable
                onPress={() => setActiveColorPicker(null)}
                hitSlop={8}
                style={styles.closeBtn}
              >
                <X size={18} color="#64748B" />
              </Pressable>
            </View>

            <View style={styles.colorsPaletteGrid}>
              {KIT_COLORS.map((item) => {
                const isSelected =
                  (activeColorPicker === 'primary' ? primaryColor : secondaryColor) ===
                  item.hex;
                return (
                  <Pressable
                    key={item.hex}
                    onPress={() => {
                      if (activeColorPicker === 'primary') {
                        setPrimaryColor(item.hex);
                      } else {
                        setSecondaryColor(item.hex);
                      }
                      setActiveColorPicker(null);
                    }}
                    style={[
                      styles.colorPaletteItem,
                      isSelected && styles.colorPaletteItemActive,
                    ]}
                  >
                    <JerseyIcon
                      color={item.hex}
                      strokeColor={item.hex === '#FFFFFF' ? '#64748B' : '#0B192C'}
                      size={36}
                    />
                    <Text style={styles.colorPaletteLabel}>{item.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* ─── Social Media Input Modal ─── */}
      <Modal
        visible={activeSocialPlatform !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveSocialPlatform(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setActiveSocialPlatform(null)}
        >
          <View style={styles.socialModalDialog} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>
              {activeSocialPlatform === 'whatsapp'
                ? 'رقم الواتساب'
                : activeSocialPlatform === 'facebook'
                ? 'رابط أو اسم صفحة فيسبوك'
                : activeSocialPlatform === 'instagram'
                ? 'حساب إنستغرام'
                : activeSocialPlatform === 'tiktok'
                ? 'حساب تيك توك'
                : 'قناة يوتيوب'}
            </Text>

            <TextInput
              value={socialInputText}
              onChangeText={setSocialInputText}
              placeholder={
                activeSocialPlatform === 'whatsapp'
                  ? '06 12 34 56 78'
                  : '@yourteam / link'
              }
              placeholderTextColor="#94A3B8"
              keyboardType={activeSocialPlatform === 'whatsapp' ? 'phone-pad' : 'default'}
              style={styles.socialTextInput}
              textAlign={isRTL ? 'right' : 'left'}
              autoCapitalize="none"
            />

            <View style={styles.socialModalActions}>
              <Pressable
                onPress={() => setActiveSocialPlatform(null)}
                style={styles.socialCancelBtn}
              >
                <Text style={styles.socialCancelText}>إلغاء</Text>
              </Pressable>
              <Pressable
                onPress={handleSaveSocial}
                style={styles.socialSaveBtn}
              >
                <Text style={styles.socialSaveText}>حفظ</Text>
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

      {/* ─── Success Confirmation Dialog (Step 4 is next) ─── */}
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
            <Text style={styles.successTitle}>تم حفظ البيانات الإضافية بنجاح!</Text>
            <Text style={styles.successMessage}>
              تم تسجيل الفئة العمرية ({category === 'adult' ? 'كبار' : category === 'teenager' ? 'شباب' : 'فئات أخرى'})، ونوع الفريق ({teamType === 'competitive' ? 'تنافسي' : 'هواة'})، وألوان الفريق بنجاح.
              {'\n\n'}
              الخطوة 4 (إتمام الإعداد) هي الخطوة النهائية القادمة بعد اعتماد مراجعة هذه الشاشة.
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
  clipboardIconBadge: {
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
    gap: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0B192C',
    textAlign: 'right',
  },
  optionalText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },

  // ── Horizontal Cards Row ──
  cardsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  selectableCard: {
    flex: 1,
    height: 92,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    gap: 3,
    padding: 6,
  },
  halfCard: {
    flex: 1,
    height: 86,
  },
  selectableCardActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#00875A',
    borderWidth: 1.8,
  },
  cardMainText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0B192C',
    marginTop: 2,
  },
  cardMainTextActive: {
    color: '#00875A',
  },
  cardSubText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
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

  // ── Kit Colors Row ──
  colorSelectorsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  colorColumn: {
    flex: 1,
    gap: 6,
  },
  colorLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  colorButton: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },

  // ── Social Media Icons Row ──
  socialIconsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  socialTile: {
    flex: 1,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  socialPlusBadge: {
    position: 'absolute',
    bottom: 5,
    alignSelf: 'center',
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  socialCheckBadge: {
    backgroundColor: '#00875A',
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
    marginTop: 6,
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
    maxHeight: '65%',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0B192C',
  },
  closeBtn: {
    padding: 4,
  },
  colorsPaletteGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  colorPaletteItem: {
    width: 72,
    height: 72,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  colorPaletteItemActive: {
    borderColor: '#00875A',
    borderWidth: 2,
    backgroundColor: '#ECFDF5',
  },
  colorPaletteLabel: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#334155',
  },

  // Social Modal Dialog
  socialModalDialog: {
    width: '88%',
    maxWidth: 340,
    alignSelf: 'center',
    marginBottom: 'auto',
    marginTop: 'auto',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    gap: 14,
  },
  socialTextInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 14,
    color: '#0F172A',
  },
  socialModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  socialCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  socialCancelText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  socialSaveBtn: {
    backgroundColor: '#00875A',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  socialSaveText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
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
