import React, { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Image,
  Modal,
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
  Bell,
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  MapPin,
  Trash2,
  X,
} from 'lucide-react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';

import { Screen } from '@/components/ui/Screen';
import { CitySelect } from '@/components/registration/CitySelect';
import { useToast } from '@/components/ui/Toast';
import { persistentStorage } from '@/services/storage/persistent-storage';
import { post } from '@/api/client';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';

// Stadium Icon for avatar & checklist
function StadiumListIcon({ size = 22, color = '#059669' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Ellipse cx="12" cy="12" rx="10" ry="7" stroke={color} strokeWidth="1.8" />
      <Ellipse cx="12" cy="12" rx="6" ry="4" stroke={color} strokeWidth="1.3" strokeDasharray="2 1.5" />
      <Path d="M12 8 L12 16" stroke={color} strokeWidth="1.3" />
    </Svg>
  );
}

interface StepItem {
  id: 'name' | 'location' | 'photos' | 'prices' | 'hours';
  title: string;
  icon: (color: string) => React.JSX.Element;
  description: string;
}

const STORAGE_KEY = 'owner.pendingStadium';

export default function StadiumSetupScreen(): React.JSX.Element {
  const { isRTL } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ ownerName?: string; flow?: string }>();

  const ownerName = params.ownerName || 'محمد';

  // Setup state (initialized from persistent storage if present)
  const [stadiumName, setStadiumName] = useState('');
  const [cityName, setCityName] = useState('');
  const [address, setAddress] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [pricePerHour, setPricePerHour] = useState('300');
  const [openTime, setOpenTime] = useState('08:00');
  const [closeTime, setCloseTime] = useState('23:00');
  const [isPickingImage, setIsPickingImage] = useState(false);

  // Active editing modal
  const [activeModal, setActiveModal] = useState<StepItem['id'] | null>(null);

  // Load previously saved stadium details on mount
  useEffect(() => {
    try {
      const saved = persistentStorage.getJson<{
        name?: string;
        city?: string;
        address?: string;
        pricePerHour?: string;
        openTime?: string;
        closeTime?: string;
        photos?: string[];
      }>(STORAGE_KEY);

      if (saved) {
        if (saved.name) setStadiumName(saved.name);
        if (saved.city) setCityName(saved.city);
        if (saved.address) setAddress(saved.address);
        if (saved.pricePerHour) setPricePerHour(saved.pricePerHour);
        if (saved.openTime) setOpenTime(saved.openTime);
        if (saved.closeTime) setCloseTime(saved.closeTime);
        if (saved.photos) setPhotos(saved.photos);
      }
    } catch {
      // Ignore cache load failure
    }
  }, []);

  // Calculate completion percentage dynamically based on filled fields
  let completedCount = 0;
  if (stadiumName.trim()) completedCount++;
  if (cityName.trim()) completedCount++;
  if (photos.length > 0) completedCount++;
  if (pricePerHour.trim()) completedCount++;
  if (openTime.trim() && closeTime.trim()) completedCount++;

  const completionPercentage = Math.max(20, Math.min(100, Math.round((completedCount / 5) * 100)));

  const locationSummary = cityName
    ? `${cityName}${address.trim() ? ' - ' + address.trim() : ''}`
    : '';

  const hoursSummary = `يومياً من ${openTime} إلى ${closeTime}`;

  const STEPS: StepItem[] = [
    {
      id: 'name',
      title: 'اسم الملعب',
      description: stadiumName || 'حدد اسم ملعبك التجاري',
      icon: (c) => <StadiumListIcon size={22} color={c} />,
    },
    {
      id: 'location',
      title: 'الموقع',
      description: locationSummary || 'المدينة والعنوان الجغرافي',
      icon: (c) => <MapPin size={22} color={c} />,
    },
    {
      id: 'photos',
      title: 'الصور',
      description: photos.length > 0 ? `تم إضافة ${photos.length} صور` : 'أضف صور عالية الدقة للملعب',
      icon: (c) => <Camera size={22} color={c} />,
    },
    {
      id: 'prices',
      title: 'الأسعار',
      description: pricePerHour ? `${pricePerHour} درهم / ساعة` : 'حدد تسعيرة الحجز لكل ساعة',
      icon: (c) => <Coins size={22} color={c} />,
    },
    {
      id: 'hours',
      title: 'أوقات العمل',
      description: hoursSummary,
      icon: (c) => <Clock size={22} color={c} />,
    },
  ];

  // Pick photos using expo-image-picker
  const handlePickPhotos = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.show('يرجى منح صلاحية الوصول إلى معرض الصور', 'info');
        return;
      }

      setIsPickingImage(true);
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        selectionLimit: 6,
        quality: 0.7,
        base64: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const newUris = res.assets.map((a) =>
          a.base64 ? `data:image/jpeg;base64,${a.base64}` : a.uri
        );
        setPhotos((prev) => [...prev, ...newUris].slice(0, 6));
        toast.show(`تمت إضافة ${newUris.length} صور بنجاح`, 'success');
      }
    } catch {
      toast.show('تعذر اختيار الصور، يرجى المحاولة لاحقاً', 'error');
    } finally {
      setIsPickingImage(false);
    }
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveSection = () => {
    // Persist current state immediately
    persistentStorage.setJson(STORAGE_KEY, {
      name: stadiumName,
      city: cityName,
      address,
      pricePerHour,
      openTime,
      closeTime,
      photos,
    });
    setActiveModal(null);
  };

  const handleFinish = () => {
    // Save to persistent storage
    persistentStorage.setJson(STORAGE_KEY, {
      name: stadiumName || 'ملعب أجيال',
      city: cityName || 'الدار البيضاء',
      address,
      pricePerHour: pricePerHour || '300',
      openTime: openTime || '08:00',
      closeTime: closeTime || '23:00',
      photos,
    });

    // Auto sync to backend API so the admin sees the stadium in dashboard immediately
    try {
      const pendingUser = persistentStorage.getJson<{ phone?: string; id?: number }>('owner.pendingUser');
      if (pendingUser?.phone || pendingUser?.id) {
        void post('/register-terrain-details', {
          phone: pendingUser.phone,
          user_id: pendingUser.id,
          name: stadiumName || 'ملعب أجيال',
          city: cityName || 'الدار البيضاء',
          address,
          price_per_hour: parseFloat(pricePerHour) || 300,
          open_time: openTime || '08:00',
          close_time: closeTime || '23:00',
          images: photos,
        }).catch(() => {
          // Safe offline fallback
        });
      }
    } catch {
      // Ignore
    }

    toast.show('تم حفظ معلومات الملعب بنجاح!', 'success');
    if (params.flow === 'with_bookings') {
      router.push({
        pathname: '/(auth)/add-booking',
        params: { ownerName },
      });
    } else {
      router.replace('/(terrain)');
    }
  };

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const ChevronIcon = isRTL ? ChevronRight : ChevronLeft;

  return (
    <Screen padded={false}>
      {/* Top Header Bar */}
      <View style={styles.headerBar}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backBtn, { opacity: pressed ? 0.7 : 1 }]}
          accessibilityRole="button"
          accessibilityLabel="رجوع"
          hitSlop={12}
        >
          <BackArrow size={22} color={colors.text} />
        </Pressable>

        {/* User Info Avatar & Greeting */}
        <View style={styles.profileBadgeWrap}>
          <View style={styles.profileTextWrap}>
            <Text style={[styles.greetingTitle, { color: colors.text }]}>
              مرحباً {ownerName}
            </Text>
            <Text style={styles.greetingRole}>صاحب ملعب</Text>
          </View>

          <View style={styles.avatarCircle}>
            <StadiumListIcon size={20} color="#059669" />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Progress Card ("إعداد الملعب") */}
        <View style={styles.progressCard}>
          <View style={styles.progressCardHeader}>
            <View style={styles.progressBadge}>
              <Text style={styles.progressBadgeText}>
                مكتمل {completionPercentage}%
              </Text>
            </View>
            <Text style={[styles.progressCardTitle, { color: colors.text }]}>
              إعداد الملعب
            </Text>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${completionPercentage}%` },
              ]}
            />
          </View>
        </View>

        {/* Step Items List */}
        <View style={styles.itemsList}>
          {STEPS.map((item) => {
            const isCompleted =
              (item.id === 'name' && !!stadiumName.trim()) ||
              (item.id === 'location' && !!cityName.trim()) ||
              (item.id === 'photos' && photos.length > 0) ||
              (item.id === 'prices' && !!pricePerHour.trim()) ||
              (item.id === 'hours' && !!openTime.trim() && !!closeTime.trim());

            return (
              <Pressable
                key={item.id}
                onPress={() => setActiveModal(item.id)}
                style={({ pressed }) => [
                  styles.itemRow,
                  {
                    backgroundColor: colors.surface,
                    transform: [{ scale: pressed ? 0.99 : 1 }],
                  },
                ]}
                accessibilityRole="button"
                accessibilityLabel={item.title}
              >
                {/* Leading Chevron */}
                <ChevronIcon size={20} color="#94A3B8" />

                {/* Title & info */}
                <View style={styles.itemTextWrap}>
                  <Text style={[styles.itemTitle, { color: colors.text }]}>
                    {item.title}
                  </Text>
                  {isCompleted ? (
                    <Text style={styles.itemSubtextDone}>{item.description}</Text>
                  ) : (
                    <Text style={styles.itemSubtextPending}>انقر لتحديد التفاصيل</Text>
                  )}
                  {item.id === 'photos' && photos.length > 0 ? (
                    <View style={styles.cardPhotosRow}>
                      {photos.slice(0, 4).map((p, idx) => (
                        <Image
                          key={idx}
                          source={{ uri: p }}
                          style={styles.cardPhotoThumb}
                          resizeMode="cover"
                        />
                      ))}
                      {photos.length > 4 ? (
                        <View style={styles.cardPhotoMoreBadge}>
                          <Text style={styles.cardPhotoMoreText}>+{photos.length - 4}</Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>

                {/* Right Icon Circle */}
                <View
                  style={[
                    styles.itemIconCircle,
                    {
                      backgroundColor: isCompleted ? '#D1FAE5' : '#F1F5F9',
                    },
                  ]}
                >
                  {item.icon(isCompleted ? '#059669' : '#64748B')}
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Encouragement Tip Card at Bottom */}
        <View style={styles.tipCard}>
          <View style={styles.tipIconWrap}>
            <Bell size={22} color="#059669" />
          </View>
          <Text style={styles.tipText}>
            كلما أكملت معلومات ملعبك، سيظهر بشكل أفضل للزوار.
          </Text>
        </View>

        {/* Finish / Next Step Button */}
        <Pressable
          onPress={handleFinish}
          style={({ pressed }) => [
            styles.finishBtn,
            { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            params.flow === 'with_bookings'
              ? 'حفظ ومتابعة لتسجيل الحجوزات'
              : 'حفظ ومتابعة إلى لوحة التحكم'
          }
        >
          <Text style={styles.finishBtnText}>
            {params.flow === 'with_bookings'
              ? 'حفظ ومتابعة لتسجيل الحجوزات'
              : 'حفظ ومتابعة إلى لوحة التحكم'}
          </Text>
          <Check size={20} color="#FFFFFF" strokeWidth={2.4} />
        </Pressable>
      </ScrollView>

      {/* Interactive Detail Modal */}
      <Modal
        visible={activeModal !== null}
        animationType="fade"
        transparent
        onRequestClose={() => setActiveModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => setActiveModal(null)}
                style={styles.closeBtn}
                hitSlop={10}
              >
                <X size={20} color="#64748B" />
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {STEPS.find((s) => s.id === activeModal)?.title}
              </Text>
            </View>

            {/* Section 1: اسم الملعب */}
            {activeModal === 'name' ? (
              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>أدخل اسم الملعب التجاري:</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.text }]}
                  placeholder="مثال: ملعب أجيال المعشوب"
                  placeholderTextColor="#94A3B8"
                  value={stadiumName}
                  onChangeText={setStadiumName}
                  autoFocus
                />
              </View>
            ) : null}

            {/* Section 2: الموقع */}
            {activeModal === 'location' ? (
              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>اختر المدينة:</Text>
                <CitySelect
                  value={cityName || null}
                  onChange={(val) => setCityName(val ?? '')}
                  placeholder="اختر مدينة الملعب"
                />
                <Text style={[styles.modalLabel, { marginTop: 8 }]}>العنوان التفصيلي (اختياري):</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.text }]}
                  placeholder="مثال: حي السلام قرب المركز التجاري"
                  placeholderTextColor="#94A3B8"
                  value={address}
                  onChangeText={setAddress}
                />
              </View>
            ) : null}

            {/* Section 3: الصور */}
            {activeModal === 'photos' ? (
              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>صور الملعب (حتى 6 صور):</Text>
                {photos.length > 0 ? (
                  <View style={styles.photosGrid}>
                    {photos.map((uri, idx) => (
                      <View key={uri + idx} style={styles.photoThumbWrap}>
                        <Image
                          source={{ uri }}
                          style={styles.photoThumb}
                          resizeMode="cover"
                        />
                        <Pressable
                          onPress={() => handleRemovePhoto(idx)}
                          style={styles.photoDeleteBtn}
                        >
                          <Trash2 size={12} color="#FFFFFF" />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                ) : null}

                <Pressable
                  onPress={handlePickPhotos}
                  disabled={isPickingImage}
                  style={styles.photoPickerBox}
                >
                  {isPickingImage ? (
                    <ActivityIndicator color="#059669" />
                  ) : (
                    <>
                      <Camera size={28} color="#059669" />
                      <Text style={styles.photoPickerText}>
                        {photos.length > 0 ? 'إضافة المزيد من الصور' : 'انقر لاختيار صور من المعرض'}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            ) : null}

            {/* Section 4: الأسعار */}
            {activeModal === 'prices' ? (
              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>السعر لكل ساعة (بالدرهم المغربي):</Text>
                <TextInput
                  style={[styles.modalInput, { color: colors.text }]}
                  placeholder="300"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={pricePerHour}
                  onChangeText={(val) => setPricePerHour(val.replace(/[^0-9]/g, ''))}
                />
                <View style={styles.presetsRow}>
                  {['200', '250', '300', '350', '400'].map((p) => (
                    <Pressable
                      key={p}
                      onPress={() => setPricePerHour(p)}
                      style={[
                        styles.presetChip,
                        pricePerHour === p && styles.presetChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          pricePerHour === p && styles.presetChipTextActive,
                        ]}
                      >
                        {p} د.م
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Section 5: أوقات العمل */}
            {activeModal === 'hours' ? (
              <View style={styles.modalBody}>
                <Text style={styles.modalLabel}>أوقات العمل اليومية:</Text>
                <View style={styles.hoursInputsRow}>
                  <View style={styles.hourInputBlock}>
                    <Text style={styles.hourInputLabel}>إلى:</Text>
                    <TextInput
                      style={[styles.modalInput, { textAlign: 'center' }]}
                      placeholder="23:00"
                      value={closeTime}
                      onChangeText={setCloseTime}
                    />
                  </View>
                  <View style={styles.hourInputBlock}>
                    <Text style={styles.hourInputLabel}>من:</Text>
                    <TextInput
                      style={[styles.modalInput, { textAlign: 'center' }]}
                      placeholder="08:00"
                      value={openTime}
                      onChangeText={setOpenTime}
                    />
                  </View>
                </View>

                <View style={styles.presetsRow}>
                  {[
                    { label: '08:00 - 23:00', open: '08:00', close: '23:00' },
                    { label: '09:00 - 00:00', open: '09:00', close: '00:00' },
                    { label: '14:00 - 01:00', open: '14:00', close: '01:00' },
                  ].map((preset) => (
                    <Pressable
                      key={preset.label}
                      onPress={() => {
                        setOpenTime(preset.open);
                        setCloseTime(preset.close);
                      }}
                      style={[
                        styles.presetChip,
                        openTime === preset.open && closeTime === preset.close && styles.presetChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.presetChipText,
                          openTime === preset.open && closeTime === preset.close && styles.presetChipTextActive,
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            <Pressable
              onPress={handleSaveSection}
              style={styles.modalSaveBtn}
            >
              <Text style={styles.modalSaveBtnText}>حفظ ومتابعة</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBadgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileTextWrap: {
    alignItems: 'flex-end',
  },
  greetingTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  greetingRole: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '700',
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#DCFCE7',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  progressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  progressCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressCardTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  progressBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
  },
  progressBadgeText: {
    color: '#166534',
    fontSize: 13,
    fontWeight: '800',
  },
  progressTrack: {
    height: 10,
    backgroundColor: '#E2E8F0',
    borderRadius: 5,
    overflow: 'hidden',
    direction: 'ltr',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#059669',
    borderRadius: 5,
  },
  itemsList: {
    gap: spacing.sm,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  itemTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
    marginHorizontal: 12,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  itemSubtextDone: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
    marginTop: 2,
  },
  itemSubtextPending: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 2,
  },
  itemIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1.2,
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  tipIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#D1FAE5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: {
    flex: 1,
    color: '#065F46',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
    textAlign: 'right',
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#059669',
    height: 54,
    borderRadius: 27,
    marginTop: spacing.sm,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  finishBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxHeight: '85%',
    borderRadius: 20,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    gap: 8,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'right',
  },
  modalInput: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    height: 50,
    paddingHorizontal: 14,
    fontSize: 15,
    textAlign: 'right',
  },
  presetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  presetChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  presetChipActive: {
    backgroundColor: '#DCFCE7',
    borderColor: '#10B981',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  presetChipTextActive: {
    color: '#065F46',
  },
  hoursInputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  hourInputBlock: {
    flex: 1,
    gap: 4,
  },
  hourInputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'right',
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  cardPhotosRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  cardPhotoThumb: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#E2E8F0',
  },
  cardPhotoMoreBadge: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  cardPhotoMoreText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  photoThumbWrap: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
  },
  photoThumb: {
    width: '100%',
    height: '100%',
  },
  photoDeleteBtn: {
    position: 'absolute',
    top: 2,
    end: 2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPickerBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#059669',
    borderRadius: 16,
    height: 90,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
  },
  photoPickerText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '700',
  },
  modalSaveBtn: {
    backgroundColor: '#059669',
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  modalSaveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
