import React, { useState } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  Info,
  Lightbulb,
  Map,
  MapPin,
  ParkingCircle,
  Shirt,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react-native';

import { AjiNqssroHeader } from '@/components/ui/AjiNqssroHeader';
import {
  DayOption,
  DaySlotPicker,
  SlotOption,
} from '@/components/booking/DaySlotPicker';
import { usePublicStadium, useStadiumSlots } from '@/api/stadiums';
import { resolveImageUrl } from '@/utils/image';

function generateDays(): DayOption[] {
  const days: DayOption[] = [];
  const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو',
    'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر',
  ];

  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const fullDate = `${yyyy}-${mm}-${dd}`;
    const dayName = arabicDays[d.getDay()];
    const monthName = arabicMonths[d.getMonth()];

    let label = dayName;
    if (i === 0) label = 'اليوم';
    else if (i === 1) label = 'غداً';

    days.push({
      id: String(i + 1),
      label,
      dateFormatted: `${label} ${d.getDate()} ${monthName}`,
      fullDate,
    });
  }
  return days;
}

export default function StadiumDetailsScreen(): React.JSX.Element {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const days = React.useMemo(() => generateDays(), []);
  const [selectedDayId, setSelectedDayId] = useState<string>('1');

  const selectedDay = days.find((d) => d.id === selectedDayId) || days[0];

  // Fetch real stadium info
  const { data: stadiumResponse } = usePublicStadium(id);
  const stadium = stadiumResponse?.data;

  // Fetch real slots for selected date
  const { data: slotsResponse } = useStadiumSlots(id, selectedDay.fullDate);

  const slots: SlotOption[] = (slotsResponse?.slots && slotsResponse.slots.length > 0)
    ? slotsResponse.slots
        .filter((s) => s.status !== 'closed')
        .map((s, idx) => ({
          id: `${s.start}-${s.end}-${idx}`,
          timeRange: `${s.start.slice(0, 5)} - ${s.end.slice(0, 5)}`,
          status: s.status === 'available' ? 'available' : 'booked',
        }))
    : [];

  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);
  const activeSlot = slots.find((s) => s.id === selectedSlotId) || slots.find((s) => s.status === 'available');

  const handleContinue = () => {
    router.push({
      pathname: '/(public)/book-match' as any,
      params: {
        stadiumId: id || '1',
        stadiumName: stadium?.name || 'ملعب كرة القدم',
        dayLabel: selectedDay.dateFormatted,
        timeSlot: activeSlot?.timeRange || '18:00 - 19:00',
      },
    });
  };

  const stadiumName = stadium?.name || 'ملعب أجيال';
  const locationText = [stadium?.city, stadium?.address].filter(Boolean).join(' - ') || 'تنغير - جماعة أيت سدرين';
  const bannerImage =
    resolveImageUrl(stadium?.cover_image_url) ||
    'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1000&q=80';
  const ratingNum = stadium?.rating ?? 4.8;
  const reviewsCount = stadium?.reviews_count ?? 52;


  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <AjiNqssroHeader
        showBack
        rightAction={
          <TouchableOpacity
            style={styles.mapShortcutBtn}
            onPress={() => router.push('/(public)/stadiums' as any)}
          >
            <Text style={styles.mapShortcutText}>الملاعب</Text>
            <Map size={16} color="#00875A" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Stadium Image Banner */}
        <View style={styles.bannerWrap}>
          <Image
            source={{
              uri: bannerImage,
            }}
            style={styles.bannerImage}
          />
          <View style={styles.bannerLocationBadge}>
            <Text style={styles.bannerLocationText}>{stadium?.city || 'تنغير'}</Text>
            <MapPin size={12} color="#FFFFFF" />
          </View>
          <View style={styles.bannerRatingBadge}>
            <Text style={styles.ratingReviews}>({reviewsCount} تقييم)</Text>
            <Text style={styles.ratingNum}>{ratingNum}</Text>
            <Star size={13} color="#F59E0B" fill="#F59E0B" />
          </View>
        </View>

        {/* Stadium Title & Location */}
        <View style={styles.titleCard}>
          <Text style={styles.stadiumTitle}>{stadiumName}</Text>
          <View style={styles.locationSubtitleRow}>
            <Text style={styles.locationSubtitleText}>
              {locationText}
            </Text>
            <MapPin size={14} color="#00875A" />
          </View>

          {/* Amenities Row */}
          <View style={styles.amenitiesGrid}>
            <View style={styles.amenityItem}>
              <Text style={styles.amenityLabel}>إنارة ليلية</Text>
              <Zap size={18} color="#00875A" />
            </View>
            <View style={styles.amenityItem}>
              <Text style={styles.amenityLabel}>مواقف سيارات</Text>
              <ParkingCircle size={18} color="#00875A" />
            </View>
            <View style={styles.amenityItem}>
              <Text style={styles.amenityLabel}>غرف تغيير الملابس</Text>
              <Shirt size={18} color="#00875A" />
            </View>
            <View style={styles.amenityItem}>
              <Text style={styles.amenityLabel}>عشب صناعي</Text>
              <Sparkles size={18} color="#00875A" />
            </View>
          </View>
        </View>

        {/* Day & Slot Picker */}
        <DaySlotPicker
          days={days}
          selectedDayId={selectedDayId}
          onSelectDay={(d) => setSelectedDayId(d.id)}
          slots={slots}
          selectedSlotId={selectedSlotId}
          onSelectSlot={(s) => setSelectedSlotId(s.id)}
        />

        {/* Info Note */}
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            يمكنك تعديل موعد الحجز لاحقاً من حسابك
          </Text>
          <Calendar size={16} color="#00875A" />
        </View>
      </ScrollView>

      {/* Bottom Sticky CTA Button: متابعة */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.continueBtn}
          onPress={handleContinue}
          activeOpacity={0.88}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
          <Text style={styles.continueBtnText}>متابعة</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 90,
  },
  mapShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  mapShortcutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00875A',
  },
  bannerWrap: {
    width: '100%',
    height: 190,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerLocationBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: '#00875A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  bannerLocationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  bannerRatingBadge: {
    position: 'absolute',
    bottom: 14,
    right: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  ratingNum: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0F172A',
  },
  ratingReviews: {
    fontSize: 11,
    color: '#64748B',
  },
  titleCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: -16,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'flex-end',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  stadiumTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#064E3B',
    textAlign: 'right',
  },
  locationSubtitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationSubtitleText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  amenitiesGrid: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  amenityItem: {
    alignItems: 'center',
    gap: 4,
  },
  amenityLabel: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '700',
  },
  infoBox: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  infoText: {
    fontSize: 12,
    color: '#00875A',
    fontWeight: '700',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  continueBtn: {
    backgroundColor: '#00875A',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
