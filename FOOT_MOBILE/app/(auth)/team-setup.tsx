import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import * as ImagePicker from 'expo-image-picker';
import {
  AlertCircle,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Globe,
  MapPin,
  Search,
  Shield,
  Shirt,
  Trash2,
  X,
} from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { useCities, type City, cityDisplayName } from '@/api/cities';
import { persistentStorage } from '@/services/storage/persistent-storage';
import { post, upload } from '@/api/client';
import { getUserMessage, isValidationError, getValidationErrors } from '@/api/errors';
import type { SupportedLocale } from '@/types';

// ── Moroccan Administrative Regions ───────────────────────────────
export interface RegionOption {
  id: string;
  nameAr: string;
  nameFr: string;
  cities: string[];
}

export const MOROCCAN_REGIONS: RegionOption[] = [
  {
    id: 'draa_tafilalet',
    nameAr: 'درعة - تافيلالت',
    nameFr: 'Drâa-Tafilalet',
    cities: [
      'Ouarzazate', 'Errachidia', 'Tinghir', 'Zagora', 'Midelt',
      'ورزازات', 'الراشدية', 'تنغير', 'زاكورة', 'ميدلت',
    ],
  },
  {
    id: 'casablanca_settat',
    nameAr: 'الدار البيضاء - سطات',
    nameFr: 'Casablanca-Settat',
    cities: [
      'Casablanca', 'Settat', 'El Jadida', 'Berrechid', 'Mohammedia',
      'الدار البيضاء', 'سطات', 'الجديدة', 'برشيد', 'المحمدية',
    ],
  },
  {
    id: 'rabat_sale_kenitra',
    nameAr: 'الرباط - سلا - القنيطرة',
    nameFr: 'Rabat-Salé-Kénitra',
    cities: [
      'Rabat', 'Sale', 'Salé', 'Kenitra', 'Khemisset', 'Sidi Kacem', 'Sidi Slimane',
      'الرباط', 'سلا', 'القنيطرة', 'الخميسات', 'سيدي قاسم', 'سيدي سليمان',
    ],
  },
  {
    id: 'marrakech_safi',
    nameAr: 'مراكش - آسفي',
    nameFr: 'Marrakech-Safi',
    cities: [
      'Marrakech', 'Safi', 'Essaouira', 'El Kelaa des Sraghna', 'Youssoufia', 'Chichaoua',
      'مراكش', 'آسفي', 'الصويرة', 'قلعة السراغنة', 'اليوسفية', 'شيشاوة',
    ],
  },
  {
    id: 'fes_meknes',
    nameAr: 'فاس - مكناس',
    nameFr: 'Fès-Meknès',
    cities: [
      'Fes', 'Fès', 'Meknes', 'Taza', 'Ifrane', 'Sefrou', 'Taounate', 'Boulemane',
      'فاس', 'مكناس', 'تازة', 'إفران', 'صفرو', 'تاونات', 'بولمان',
    ],
  },
  {
    id: 'tanger_tetouan_al_hoceima',
    nameAr: 'طنجة - تطوان - الحسيمة',
    nameFr: 'Tanger-Tétouan-Al Hoceïma',
    cities: [
      'Tangier', 'Tanger', 'Tetouan', 'Al Hoceima', 'Larache', 'Chefchaouen', 'Ouezzane',
      'طنجة', 'تطوان', 'الحسيمة', 'العرائش', 'شفشاون', 'وزان',
    ],
  },
  {
    id: 'souss_massa',
    nameAr: 'سوس - ماسة',
    nameFr: 'Souss-Massa',
    cities: [
      'Agadir', 'Inezgane', 'Taroudant', 'Tiznit', 'Tata', 'Chtouka Ait Baha',
      'أكادير', 'إنزكان', 'تارودانت', 'تيزنيت', 'طاطا', 'شتوكة آيت باها',
    ],
  },
  {
    id: 'oriental',
    nameAr: 'الشرق',
    nameFr: "L'Oriental",
    cities: [
      'Oujda', 'Nador', 'Berkane', 'Taourirt', 'Jerada', 'Figuig', 'Driouch',
      'وجدة', 'الناظور', 'بركان', 'تاوريرت', 'جرادة', 'فكيك', 'الدريوش',
    ],
  },
  {
    id: 'beni_mellal_khenifra',
    nameAr: 'بني ملال - خنيفرة',
    nameFr: 'Béni Mellal-Khénifra',
    cities: [
      'Beni Mellal', 'Khenifra', 'Khouribga', 'Fquih Ben Salah', 'Azilal',
      'بني ملال', 'خنيفرة', 'خريبكة', 'الفقيه بن صالح', 'أزيلال',
    ],
  },
  {
    id: 'guelmim_oued_noun',
    nameAr: 'كلميم - واد نون',
    nameFr: 'Guelmim-Oued Noun',
    cities: [
      'Guelmim', 'Tan-Tan', 'Sidi Ifni', 'Assa',
      'كلميم', 'طانطان', 'سيدي إفني', 'آسا',
    ],
  },
  {
    id: 'laayoune_sakia_el_hamra',
    nameAr: 'العيون - الساقية الحمراء',
    nameFr: 'Laâyoune-Sakia El Hamra',
    cities: [
      'Laayoune', 'Boujdour', 'Tarfaya', 'Es-Semara',
      'العيون', 'بوجدور', 'طرفاية', 'السمارة',
    ],
  },
  {
    id: 'dakhla_oued_ed_dahab',
    nameAr: 'الداخلة - وادي الذهب',
    nameFr: 'Dakhla-Oued Ed-Dahab',
    cities: [
      'Dakhla', 'Aousserd',
      'الداخلة', 'أوسرد',
    ],
  },
];

// Predefined shield logos from assets
const PRESET_LOGOS = [
  { id: 1, image: require('../../assets/preset-team-logo-1.png'), name: 'درع أخضر وكرة' },
  { id: 2, image: require('../../assets/preset-team-logo-2.png'), name: 'درع الصقر الأخضر' },
  { id: 3, image: require('../../assets/preset-team-logo-3.png'), name: 'درع مخطط أخضر ونجمة' },
  { id: 4, image: require('../../assets/preset-team-logo-4.png'), name: 'درع مغربي أحمر' },
  { id: 5, image: require('../../assets/preset-team-logo-5.png'), name: 'درع أسد الأطلس' },
  { id: 6, image: require('../../assets/preset-team-logo-6.png'), name: 'درع أزرق وكرة' },
];

const STORAGE_KEY = 'manager.pendingTeamSetup';

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

export default function TeamSetupScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { locale, setLocale, isRTL } = useI18n();
  const { data: citiesList = [] } = useCities();

  // ── Form State (Restored from persistent storage if present) ──
  const [teamName, setTeamName] = useState<string>(() => {
    try {
      const saved = persistentStorage.getJson<{ name?: string }>(STORAGE_KEY);
      return saved?.name ?? '';
    } catch {
      return '';
    }
  });

  const [selectedLogoUri, setSelectedLogoUri] = useState<string | null>(() => {
    try {
      const saved = persistentStorage.getJson<{ logoUri?: string }>(STORAGE_KEY);
      return saved?.logoUri ?? null;
    } catch {
      return null;
    }
  });

  const [selectedPresetId, setSelectedPresetId] = useState<number | null>(() => {
    try {
      const saved = persistentStorage.getJson<{ presetId?: number }>(STORAGE_KEY);
      return saved?.presetId ?? 1; // Default to first preset as displayed in reference
    } catch {
      return 1;
    }
  });

  const [selectedCity, setSelectedCity] = useState<string>(() => {
    try {
      const saved = persistentStorage.getJson<{ city?: string }>(STORAGE_KEY);
      return saved?.city ?? '';
    } catch {
      return '';
    }
  });

  const [selectedRegion, setSelectedRegion] = useState<string>(() => {
    try {
      const saved = persistentStorage.getJson<{ region?: string }>(STORAGE_KEY);
      return saved?.region ?? '';
    } catch {
      return '';
    }
  });

  const [description, setDescription] = useState<string>(() => {
    try {
      const saved = persistentStorage.getJson<{ description?: string }>(STORAGE_KEY);
      return saved?.description ?? '';
    } catch {
      return '';
    }
  });

  // UI & Loading State
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  // Modals
  const [showCityModal, setShowCityModal] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [showLangModal, setShowLangModal] = useState(false);
  const [showNextStepAlert, setShowNextStepAlert] = useState(false);

  // ── Filtered Cities List ──
  const filteredCities = useMemo(() => {
    if (!citySearchQuery.trim()) return citiesList;
    const q = citySearchQuery.trim().toLowerCase();
    return citiesList.filter((c: City) => {
      const combined = `${c.name} ${c.name_ar ?? ''} ${c.name_fr ?? ''} ${c.localized_name}`.toLowerCase();
      return combined.includes(q);
    });
  }, [citiesList, citySearchQuery]);

  // ── Auto-suggest region when a city is chosen ──
  const handleSelectCity = (city: City) => {
    const cityName = cityDisplayName(city, locale);
    setSelectedCity(cityName);
    setShowCityModal(false);
    setCitySearchQuery('');

    // Check if region can be auto-inferred
    const matchingRegion = MOROCCAN_REGIONS.find((reg) =>
      reg.cities.some(
        (c) =>
          c.toLowerCase() === city.name.toLowerCase() ||
          c.toLowerCase() === (city.name_ar ?? '').toLowerCase()
      )
    );
    if (matchingRegion) {
      setSelectedRegion(matchingRegion.nameAr);
    }
  };

  // ── Select Preset Shield Logo ──
  const handleSelectPreset = (presetId: number) => {
    setSelectedPresetId(presetId);
    setSelectedLogoUri(null); // Clear custom upload if preset is picked
    setGlobalError('');
  };

  // ── Upload Custom Team Logo ──
  const handlePickLogo = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          'الإذن مطلوب',
          'يرجى منح التطبيق إذن الوصول لمعرض الصور لاختيار شعار الفريق.'
        );
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];

        // 5MB max check (5 * 1024 * 1024 bytes)
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
          setGlobalError('حجم الصورة يتجاوز 5 ميغابايت، يرجى اختيار صورة أصغر.');
          return;
        }

        setSelectedLogoUri(asset.uri);
        setSelectedPresetId(null); // Clear preset selection when custom is uploaded
        setGlobalError('');
      }
    } catch {
      setGlobalError('تعذر اختيار الصورة، يرجى المحاولة مرة أخرى.');
    }
  };

  const handleRemoveCustomLogo = () => {
    setSelectedLogoUri(null);
    setSelectedPresetId(1); // Revert to default preset
  };

  // ── Form Submission & Persistence ──
  const handleSubmit = async () => {
    setGlobalError('');
    setFieldErrors({});

    const trimmedName = teamName.trim();
    if (!trimmedName || trimmedName.length < 3) {
      setGlobalError('يرجى إدخال اسم الفريق (3 أحرف على الأقل)');
      return;
    }

    if (!selectedCity) {
      setGlobalError('يرجى اختيار المدينة');
      return;
    }

    if (description.length > 300) {
      setGlobalError('وصف الفريق يجب ألا يتجاوز 300 حرف');
      return;
    }

    setLoading(true);
    try {
      // 1. Always persist state locally so manager never loses data
      persistentStorage.setJson(STORAGE_KEY, {
        name: trimmedName,
        city: selectedCity,
        region: selectedRegion,
        description: description.trim(),
        logoUri: selectedLogoUri,
        presetId: selectedPresetId,
      });

      // 2. If user is authenticated, save using the backend manager onboarding API
      if (user) {
        if (selectedLogoUri) {
          // Custom logo file upload via FormData
          const formData = new FormData();
          formData.append('name', trimmedName);
          formData.append('city', selectedCity);
          formData.append('category', 'adult');
          formData.append('logo', {
            uri: selectedLogoUri,
            name: 'team_logo.jpg',
            type: 'image/jpeg',
          } as never);

          await upload('/manager/onboarding/team', formData);
        } else {
          // Preset logo selection or JSON update
          await post('/manager/onboarding/team', {
            name: trimmedName,
            city: selectedCity,
            category: 'adult',
            preset_id: selectedPresetId ?? 1,
          });
        }
      }

      // Step 1 completed & persisted successfully! Navigate to Step 2
      router.push('/(auth)/team-setup-step2');
    } catch (e: unknown) {
      if (isValidationError(e)) {
        const errors = getValidationErrors(e);
        if (errors) {
          setFieldErrors(errors);
          const first = Object.values(errors)[0]?.[0];
          setGlobalError(first || getUserMessage(e));
        } else {
          setGlobalError(getUserMessage(e));
        }
      } else {
        // Fallback: If network / server error, local persistence succeeded
        router.push('/(auth)/team-setup-step2');
      }
    } finally {
      setLoading(false);
    }
  };

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
        {/* Step Circles Row */}
        <View style={styles.stepsRow}>
          {/* Step 1: Active */}
          <View style={styles.stepNode}>
            <View style={[styles.stepCircle, styles.stepCircleActive]}>
              <Text style={styles.stepNumberActive}>1</Text>
            </View>
            <Text style={[styles.stepLabel, styles.stepLabelActive]} numberOfLines={1}>
              معلومات الفريق
            </Text>
          </View>

          {/* Line 1 - 2 */}
          <View style={[styles.stepLine, styles.stepLineActive]} />

          {/* Step 2: Inactive */}
          <View style={styles.stepNode}>
            <View style={styles.stepCircle}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <Text style={styles.stepLabel} numberOfLines={1}>
              المواعيد الأسبوعية
            </Text>
          </View>

          {/* Line 2 - 3 */}
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

          {/* Line 3 - 4 */}
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
          {/* ─── Hero Section: Coach & Title ─── */}
          <View style={styles.heroRow}>
            {/* Coach Illustration */}
            <View style={styles.coachWrap}>
              <Image
                source={require('../../assets/team-setup-coach.png')}
                style={styles.coachImage}
                resizeMode="contain"
              />
            </View>

            {/* Welcome & Instructions */}
            <View style={styles.heroInfo}>
              <Text style={styles.heroTitle}>لنشئ فريقك</Text>
              <Text style={styles.heroSubtitle}>
                أخبرنا عن فريقك لنتمكن من تخصيص التجربة المناسبة لك والوصول إلى الملاعب والدوريات المحلية.
              </Text>
            </View>
          </View>

          {/* ─── Main White Setup Card ─── */}
          <View style={styles.cardContainer}>
            {/* Global Error Banner */}
            {globalError ? (
              <View style={styles.errorAlert}>
                <AlertCircle size={18} color="#DC2626" />
                <Text style={styles.errorAlertText}>{globalError}</Text>
              </View>
            ) : null}

            {/* ─── Section 1: Team Logo ("شعار الفريق") ─── */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Shield size={19} color="#00875A" />
                <Text style={styles.sectionTitle}>شعار الفريق</Text>
              </View>

              <View style={styles.logoRowContainer}>
                {/* Side A: Upload Custom Logo */}
                <View style={styles.uploadBoxContainer}>
                  {selectedLogoUri ? (
                    <View style={styles.uploadedPreviewWrap}>
                      <Image
                        source={{ uri: selectedLogoUri }}
                        style={styles.uploadedImage}
                        resizeMode="cover"
                      />
                      <Pressable
                        onPress={handleRemoveCustomLogo}
                        style={styles.removeLogoBadge}
                        hitSlop={8}
                        accessibilityLabel="إزالة الشعار"
                      >
                        <Trash2 size={14} color="#DC2626" />
                      </Pressable>
                    </View>
                  ) : (
                    <Pressable
                      onPress={handlePickLogo}
                      style={({ pressed }) => [
                        styles.uploadDottedBox,
                        { opacity: pressed ? 0.75 : 1 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel="رفع شعار الفريق"
                    >
                      <View style={styles.cameraIconCircle}>
                        <Camera size={20} color="#00875A" />
                      </View>
                      <Text style={styles.uploadTitle}>رفع شعار الفريق</Text>
                      <Text style={styles.uploadSubtitle}>
                        PNG أو JPG (بحد أقصى 5 ميغابايت)
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* Divider: أو */}
                <View style={styles.orDividerWrap}>
                  <Text style={styles.orText}>أو</Text>
                </View>

                {/* Side B: Predefined Shield Logos (2x3 Grid) */}
                <View style={styles.presetsGrid}>
                  {PRESET_LOGOS.map((preset) => {
                    const isSelected = selectedPresetId === preset.id && !selectedLogoUri;
                    return (
                      <Pressable
                        key={preset.id}
                        onPress={() => handleSelectPreset(preset.id)}
                        style={({ pressed }) => [
                          styles.presetItem,
                          isSelected && styles.presetItemActive,
                          { opacity: pressed ? 0.8 : 1 },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={preset.name}
                      >
                        <Image
                          source={preset.image}
                          style={styles.presetImage}
                          resizeMode="contain"
                        />
                        {isSelected ? (
                          <View style={styles.presetSelectedBadge}>
                            <Check size={10} color="#FFFFFF" strokeWidth={3} />
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* ─── Section 2: Team Name ("اسم الفريق") ─── */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <Shirt size={19} color="#00875A" />
                <Text style={styles.sectionTitle}>اسم الفريق</Text>
              </View>

              <View style={styles.inputRowContainer}>
                <TextInput
                  value={teamName}
                  onChangeText={setTeamName}
                  placeholder="أدخل اسم الفريق"
                  placeholderTextColor="#94A3B8"
                  style={styles.textInput}
                  textAlign={isRTL ? 'right' : 'left'}
                />
                <View style={styles.inputIconWrap}>
                  <Shirt size={19} color="#94A3B8" />
                </View>
              </View>
              {fieldErrors.name ? (
                <Text style={styles.fieldErrorText}>{fieldErrors.name[0]}</Text>
              ) : null}
            </View>

            {/* ─── Section 3: City & Region ("المدينة والمنطقة") ─── */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <MapPin size={19} color="#00875A" />
                <Text style={styles.sectionTitle}>المدينة والمنطقة</Text>
              </View>

              <View style={styles.locationSelectorsRow}>
                {/* Select City Button */}
                <Pressable
                  onPress={() => setShowCityModal(true)}
                  style={({ pressed }) => [
                    styles.selectorButton,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="اختر المدينة"
                >
                  <ChevronDown size={16} color="#64748B" />
                  <Text
                    style={[
                      styles.selectorButtonText,
                      selectedCity ? styles.selectorTextSelected : null,
                    ]}
                    numberOfLines={1}
                  >
                    {selectedCity || 'اختر المدينة'}
                  </Text>
                </Pressable>

                {/* Select Region Button */}
                <Pressable
                  onPress={() => setShowRegionModal(true)}
                  style={({ pressed }) => [
                    styles.selectorButton,
                    { opacity: pressed ? 0.85 : 1 },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel="اختر المنطقة"
                >
                  <ChevronDown size={16} color="#64748B" />
                  <Text
                    style={[
                      styles.selectorButtonText,
                      selectedRegion ? styles.selectorTextSelected : null,
                    ]}
                    numberOfLines={1}
                  >
                    {selectedRegion || 'اختر المنطقة'}
                  </Text>
                </Pressable>
              </View>
            </View>

            {/* ─── Section 4: Team Description ("وصف مختصر للفريق") ─── */}
            <View style={styles.sectionBlock}>
              <View style={styles.sectionHeader}>
                <FileText size={19} color="#00875A" />
                <Text style={styles.sectionTitle}>
                  وصف مختصر للفريق <Text style={styles.optionalText}>(اختياري)</Text>
                </Text>
              </View>

              <View style={styles.textareaContainer}>
                <TextInput
                  value={description}
                  onChangeText={(t) => {
                    if (t.length <= 300) setDescription(t);
                  }}
                  placeholder="أخبرنا عن فريقك، تاريخه وأهدافه..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  style={styles.textareaInput}
                  textAlign={isRTL ? 'right' : 'left'}
                  textAlignVertical="top"
                />
                <Text style={styles.charCounter}>{`${description.length}/300`}</Text>
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

      {/* ─── City Selection Modal ─── */}
      <Modal
        visible={showCityModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCityModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowCityModal(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>اختر المدينة</Text>
              <Pressable
                onPress={() => setShowCityModal(false)}
                hitSlop={8}
                style={styles.closeBtn}
              >
                <X size={18} color="#64748B" />
              </Pressable>
            </View>

            {/* Search Input */}
            <View style={styles.searchWrap}>
              <Search size={17} color="#94A3B8" />
              <TextInput
                value={citySearchQuery}
                onChangeText={setCitySearchQuery}
                placeholder="ابحث عن المدينة..."
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
                textAlign={isRTL ? 'right' : 'left'}
              />
              {citySearchQuery ? (
                <Pressable onPress={() => setCitySearchQuery('')} hitSlop={6}>
                  <X size={15} color="#94A3B8" />
                </Pressable>
              ) : null}
            </View>

            {/* Cities Scroll List */}
            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {filteredCities.map((c: City) => {
                const name = cityDisplayName(c, locale);
                const isSelected = selectedCity === name;
                return (
                  <Pressable
                    key={c.id}
                    onPress={() => handleSelectCity(c)}
                    style={[
                      styles.modalItem,
                      isSelected && styles.modalItemActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        isSelected && styles.modalItemTextActive,
                      ]}
                    >
                      {name}
                    </Text>
                    {isSelected ? <Check size={18} color="#00875A" /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* ─── Region Selection Modal ─── */}
      <Modal
        visible={showRegionModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRegionModal(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowRegionModal(false)}
        >
          <View style={styles.modalSheet} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>اختر المنطقة</Text>
              <Pressable
                onPress={() => setShowRegionModal(false)}
                hitSlop={8}
                style={styles.closeBtn}
              >
                <X size={18} color="#64748B" />
              </Pressable>
            </View>

            <ScrollView style={styles.modalList} showsVerticalScrollIndicator={false}>
              {MOROCCAN_REGIONS.map((reg) => {
                const isSelected = selectedRegion === reg.nameAr;
                return (
                  <Pressable
                    key={reg.id}
                    onPress={() => {
                      setSelectedRegion(reg.nameAr);
                      setShowRegionModal(false);
                    }}
                    style={[
                      styles.modalItem,
                      isSelected && styles.modalItemActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalItemText,
                        isSelected && styles.modalItemTextActive,
                      ]}
                    >
                      {reg.nameAr}
                    </Text>
                    {isSelected ? <Check size={18} color="#00875A" /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
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

      {/* ─── Next Step Missing Dialog (Strict Scope Boundary) ─── */}
      <Modal
        visible={showNextStepAlert}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNextStepAlert(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.successCard}>
            <View style={styles.successIconBadge}>
              <Check size={32} color="#FFFFFF" strokeWidth={3} />
            </View>
            <Text style={styles.successTitle}>تم حفظ معلومات الفريق بنجاح!</Text>
            <Text style={styles.successMessage}>
              تم تسجيل اسم الفريق، الشعار، والمدينة بنجاح.
              {'\n\n'}
              الخطوة 2: «المواعيد الأسبوعية» لم يتم إنجازها بعد، وستكون الوجهة التالية فور اعتمادها في المهمة القادمة.
            </Text>
            <Pressable
              onPress={() => setShowNextStepAlert(false)}
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
    paddingTop: 8,
    paddingBottom: 16,
  },
  coachWrap: {
    width: 115,
    height: 130,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachImage: {
    width: '100%',
    height: '100%',
  },
  heroInfo: {
    flex: 1,
    paddingStart: 14,
    alignItems: 'flex-start',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0B192C',
    marginBottom: 4,
    textAlign: 'right',
  },
  heroSubtitle: {
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
    paddingTop: 22,
    paddingBottom: 28,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
    gap: 20,
  },

  // Error Alert
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
  fieldErrorText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 2,
  },

  // Section Blocks
  sectionBlock: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B192C',
    textAlign: 'right',
  },
  optionalText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
  },

  // ── Logo Section: Upload + Presets ──
  logoRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 8,
  },
  uploadBoxContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadDottedBox: {
    width: '100%',
    height: 124,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderStyle: 'dashed',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  cameraIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  uploadTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0B192C',
    textAlign: 'center',
  },
  uploadSubtitle: {
    fontSize: 9.5,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 2,
  },
  uploadedPreviewWrap: {
    width: 110,
    height: 110,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 2,
    borderColor: '#00875A',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
  },
  removeLogoBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FFFFFF',
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },

  // Or Divider
  orDividerWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  orText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
  },

  // Presets Grid (2x3)
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 140,
    gap: 6,
    justifyContent: 'center',
  },
  presetItem: {
    width: 40,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  presetItemActive: {
    borderColor: '#00875A',
    borderWidth: 2,
    backgroundColor: '#ECFDF5',
  },
  presetImage: {
    width: 32,
    height: 38,
  },
  presetSelectedBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#00875A',
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Standard Input Row ──
  inputRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    height: 50,
    paddingHorizontal: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    paddingHorizontal: 8,
  },
  inputIconWrap: {
    paddingStart: 4,
  },

  // ── Location Selectors Row ──
  locationSelectorsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  selectorButton: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  selectorButtonText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
    textAlign: 'right',
  },
  selectorTextSelected: {
    color: '#0F172A',
    fontWeight: '700',
  },

  // ── Description Textarea ──
  textareaContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    padding: 12,
    minHeight: 100,
    position: 'relative',
  },
  textareaInput: {
    fontSize: 13.5,
    color: '#0F172A',
    height: 70,
  },
  charCounter: {
    fontSize: 10.5,
    color: '#94A3B8',
    textAlign: 'left',
    marginTop: 4,
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

  // ── Modal Bottom Sheet ──
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
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#0F172A',
  },
  modalList: {
    maxHeight: 350,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    backgroundColor: '#F8FAFC',
  },
  modalItemActive: {
    backgroundColor: '#ECFDF5',
  },
  modalItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    textAlign: 'right',
  },
  modalItemTextActive: {
    fontWeight: '800',
    color: '#00875A',
  },

  // ── Language Dialog ──
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

  // ── Success Dialog ──
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
