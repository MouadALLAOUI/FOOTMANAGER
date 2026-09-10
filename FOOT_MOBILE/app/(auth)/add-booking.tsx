import React, { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Dimensions,
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
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  Info,
  Phone,
  Plus,
  RotateCcw,
  Smartphone,
  Trash2,
  User,
  X,
} from 'lucide-react-native';
import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
  Rect,
} from 'react-native-svg';

import { Screen } from '@/components/ui/Screen';
import { AjiNqssroLogo } from '@/components/ui/AjiNqssroLogo';
import { useToast } from '@/components/ui/Toast';
import { persistentStorage } from '@/services/storage/persistent-storage';
import { post } from '@/api/client';
import { formatPhoneDisplay } from '@/utils';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';

// ─── Stadium Badge Icon ───────────────────────────────────────────────
function StadiumPillIcon({ size = 16, color = '#059669' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Ellipse cx="12" cy="12" rx="10" ry="7" stroke={color} strokeWidth="1.8" />
      <Ellipse cx="12" cy="12" rx="6" ry="4" stroke={color} strokeWidth="1.3" strokeDasharray="2 1.5" />
      <Path d="M12 8 L12 16" stroke={color} strokeWidth="1.3" />
    </Svg>
  );
}

// ─── Calendar with Soccer Ball Illustration ─────────────────────────
function CalendarBallIllustration({ size = 72 }: { size?: number }) {
  return (
    <Svg width={size} height={size * 0.9} viewBox="0 0 80 72" fill="none">
      <Rect x="6" y="10" width="46" height="52" rx="8" fill="#FFFFFF" stroke="#10B981" strokeWidth="2.5" />
      <Rect x="6" y="10" width="46" height="14" rx="6" fill="#059669" />
      <Circle cx="16" cy="8" r="3" fill="#10B981" />
      <Circle cx="42" cy="8" r="3" fill="#10B981" />
      <Path d="M14 34 L44 34 M14 44 L44 44 M14 54 L32 54" stroke="#CBD5E1" strokeWidth="2" strokeLinecap="round" />
      <Path d="M24 28 L24 56 M34 28 L34 56" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" />

      <G transform="translate(38, 30)">
        <Circle cx="18" cy="18" r="17" fill="#FFFFFF" stroke="#0F172A" strokeWidth="2" />
        <Path d="M18 10 L23 14 L21 20 L15 20 L13 14 Z" fill="#0F172A" />
        <Path d="M18 10 L18 3 M23 14 L30 14 M21 20 L26 28 M15 20 L10 28 M13 14 L6 14" stroke="#0F172A" strokeWidth="1.6" />
      </G>
    </Svg>
  );
}

// Generate Next 10 Days in Arabic
function generateUpcomingDays() {
  const days: { label: string; dateStr: string; isToday: boolean }[] = [];
  const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو',
    'يوليوز', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر'
  ];

  const now = new Date();
  for (let i = 0; i < 10; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);

    const dayName = arabicDays[d.getDay()];
    const dayNum = d.getDate();
    const monthName = arabicMonths[d.getMonth()];
    const year = d.getFullYear();

    const label = i === 0
      ? `اليوم (${dayName} ${dayNum} ${monthName})`
      : i === 1
        ? `غداً (${dayName} ${dayNum} ${monthName})`
        : `${dayName} ${dayNum} ${monthName} ${year}`;

    const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

    days.push({ label, dateStr, isToday: i === 0 });
  }
  return days;
}

// All 24 hours from 00:00 to 23:00 - none locked by default
const ALL_HOURS = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];

export interface BookingRecord {
  id: string;
  stadium: string;
  date: string;
  dateLabel: string;
  start_time: string;
  end_time: string;
  duration: number;
  customer_name: string;
  customer_phone: string;
  created_at: string;
}

export default function AddBookingScreen(): React.JSX.Element {
  const { isRTL } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const params = useLocalSearchParams<{ ownerName?: string }>();

  // Load stadium name from persistent storage
  const [stadiumName, setStadiumName] = useState('ملعب أجيال');

  // Bookings list from persistent storage
  const [allBookings, setAllBookings] = useState<BookingRecord[]>([]);

  useEffect(() => {
    try {
      const savedStadium = persistentStorage.getJson<{ name?: string }>('owner.pendingStadium');
      if (savedStadium?.name) {
        setStadiumName(savedStadium.name);
      }

      const savedBookings = persistentStorage.getJson<BookingRecord[]>('owner.manualBookings');
      if (savedBookings && Array.isArray(savedBookings)) {
        setAllBookings(savedBookings);
      }
    } catch {
      // Ignore
    }
  }, []);

  const upcomingDays = useMemo(() => generateUpcomingDays(), []);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const selectedDateObject = upcomingDays[selectedDayIndex] || upcomingDays[0];

  // Filter bookings for the selected date
  const bookingsForSelectedDay = useMemo(() => {
    return allBookings.filter((b) => b.date === selectedDateObject.dateStr);
  }, [allBookings, selectedDateObject.dateStr]);

  // Helper: Convert time string "HH:MM" to minutes from midnight
  const timeToMinutes = (t: string): number => {
    const parts = t.split(':');
    const h = parseInt(parts[0] || '0', 10);
    const m = parseInt(parts[1] || '0', 10);
    return h * 60 + m;
  };

  // Find the booking covering a 1-hour slot (e.g. 19:00 slot covers [19:00, 20:00))
  // A 60min booking covers 1 slot; 120min booking covers 2 slots!
  const getBookingForSlot = (hour: string): BookingRecord | undefined => {
    const slotStart = timeToMinutes(hour);
    const slotEnd = slotStart + 60;

    return bookingsForSelectedDay.find((b) => {
      const bStart = timeToMinutes(b.start_time);
      let bEnd = timeToMinutes(b.end_time);
      if (bEnd <= bStart) bEnd += 24 * 60; // Overnight wrap

      return slotStart < bEnd && slotEnd > bStart;
    });
  };

  // Check if a time slot or range conflicts with any existing booking
  const checkBookingConflict = (
    start: string,
    duration: number,
    excludeBookingId?: string
  ): BookingRecord | undefined => {
    const propStart = timeToMinutes(start);
    const propEnd = propStart + duration;

    return bookingsForSelectedDay.find((b) => {
      if (excludeBookingId && b.id === excludeBookingId) return false;
      const bStart = timeToMinutes(b.start_time);
      let bEnd = timeToMinutes(b.end_time);
      if (bEnd <= bStart) bEnd += 24 * 60;

      return propStart < bEnd && propEnd > bStart;
    });
  };

  // Check if an hour slot is covered by any booking in a given list
  const isSlotOccupiedInList = (hour: string, bookingsList: BookingRecord[]): boolean => {
    const slotStart = timeToMinutes(hour);
    const slotEnd = slotStart + 60;

    return bookingsList.some((b) => {
      const bStart = timeToMinutes(b.start_time);
      let bEnd = timeToMinutes(b.end_time);
      if (bEnd <= bStart) bEnd += 24 * 60;

      return slotStart < bEnd && slotEnd > bStart;
    });
  };

  const [selectedTime, setSelectedTime] = useState('19:00');
  const [durationMinutes, setDurationMinutes] = useState(60);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Edit / View modal state
  const [editingBooking, setEditingBooking] = useState<BookingRecord | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);

  // Dynamic end time calculation
  const calculateEndTime = (start: string, duration: number): string => {
    const parts = start.split(':');
    if (parts.length < 2) return '20:00';
    const hours = parseInt(parts[0], 10);
    const mins = parseInt(parts[1], 10);
    const totalMins = hours * 60 + mins + duration;
    const endH = Math.floor(totalMins / 60) % 24;
    const endM = totalMins % 60;
    return `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
  };

  const endTime = calculateEndTime(selectedTime, durationMinutes);
  const durationLabel = durationMinutes === 60 ? '1 ساعة (فترة واحدة)' : durationMinutes === 90 ? '1.5 ساعة' : '2 ساعتان (فترتان)';

  // Handle clicking on a slot chip
  const handlePressSlot = (hour: string, bookedRecord?: BookingRecord) => {
    if (bookedRecord) {
      // Already booked by a 60/120min reservation: open view/edit modal for that booking
      setEditingBooking({ ...bookedRecord });
      setShowEditModal(true);
    } else {
      // Free slot: select for booking
      setSelectedTime(hour);
    }
  };

  const handleConfirmBooking = () => {
    // Check for collision with existing bookings (e.g. 120min overlaps another booked slot)
    const conflict = checkBookingConflict(selectedTime, durationMinutes);
    if (conflict) {
      toast.show(
        `المدة المحددة تتعارض مع حجز قائم من ${conflict.start_time} إلى ${conflict.end_time}`,
        'error'
      );
      return;
    }

    setIsSubmitting(true);

    const bookingRecord: BookingRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      stadium: stadiumName,
      date: selectedDateObject.dateStr,
      dateLabel: selectedDateObject.label,
      start_time: selectedTime,
      end_time: endTime,
      duration: durationMinutes,
      customer_name: customerName.trim() || 'زبون عبر الهاتف',
      customer_phone: customerPhone.trim() || '—',
      created_at: new Date().toISOString(),
    };

    const updated = [bookingRecord, ...allBookings];
    setAllBookings(updated);

    try {
      persistentStorage.setJson('owner.manualBookings', updated);
    } catch {
      // Ignore
    }

    // Auto sync to backend API so admin sees the reservations immediately
    try {
      const pendingUser = persistentStorage.getJson<{ phone?: string; id?: number }>('owner.pendingUser');
      const pendingStadium = persistentStorage.getJson<{
        name?: string;
        city?: string;
        address?: string;
        pricePerHour?: string;
        openTime?: string;
        closeTime?: string;
      }>('owner.pendingStadium');

      void post('/register-terrain-details', {
        phone: pendingUser?.phone,
        user_id: pendingUser?.id,
        name: pendingStadium?.name || stadiumName || 'ملعب أجيال',
        city: pendingStadium?.city || 'الدار البيضاء',
        address: pendingStadium?.address || '',
        price_per_hour: parseFloat(pendingStadium?.pricePerHour || '300'),
        open_time: pendingStadium?.openTime || '08:00',
        close_time: pendingStadium?.closeTime || '23:00',
        bookings: updated.map((b) => ({
          date: b.date,
          start_time: b.start_time,
          end_time: b.end_time,
          customer_name: b.customer_name,
          customer_phone: b.customer_phone,
        })),
      }).catch(() => {
        // Ignore network failure
      });
    } catch {
      // Ignore
    }

    // Auto advance selected time to next available slot that is NOT covered by any booking
    const dayBookings = updated.filter((b) => b.date === selectedDateObject.dateStr);
    const nextFree = ALL_HOURS.find(
      (h) => !isSlotOccupiedInList(h, dayBookings) && h !== selectedTime
    );
    if (nextFree) setSelectedTime(nextFree);

    setTimeout(() => {
      setIsSubmitting(false);
      setShowSuccessModal(true);
      toast.show('تم تأكيد وحفظ الحجز بنجاح!', 'success');
    }, 350);
  };

  const handleResetForNextBooking = () => {
    setShowSuccessModal(false);
    setCustomerName('');
    setCustomerPhone('');
  };

  // Save changes from Edit Modal
  const handleSaveEditBooking = () => {
    if (!editingBooking) return;

    // Check conflict when duration is extended (e.g. from 60 to 120min)
    const conflict = checkBookingConflict(editingBooking.start_time, editingBooking.duration, editingBooking.id);
    if (conflict) {
      toast.show(
        `المدة المحدثة تتعارض مع حجز قائم من ${conflict.start_time} إلى ${conflict.end_time}`,
        'error'
      );
      return;
    }

    const newEndTime = calculateEndTime(editingBooking.start_time, editingBooking.duration);
    const updated = allBookings.map((b) => {
      if (b.id === editingBooking.id || (b.date === editingBooking.date && b.start_time === editingBooking.start_time)) {
        return {
          ...b,
          customer_name: editingBooking.customer_name.trim() || 'زبون عبر الهاتف',
          customer_phone: editingBooking.customer_phone.trim() || '—',
          duration: editingBooking.duration,
          end_time: newEndTime,
        };
      }
      return b;
    });

    setAllBookings(updated);
    try {
      persistentStorage.setJson('owner.manualBookings', updated);
    } catch {
      // Ignore
    }

    // Auto sync to backend
    try {
      const pendingUser = persistentStorage.getJson<{ phone?: string; id?: number }>('owner.pendingUser');
      const pendingStadium = persistentStorage.getJson<{ name?: string }>('owner.pendingStadium');
      void post('/register-terrain-details', {
        phone: pendingUser?.phone,
        user_id: pendingUser?.id,
        name: pendingStadium?.name || stadiumName || 'ملعب أجيال',
        bookings: updated.map((b) => ({
          date: b.date,
          start_time: b.start_time,
          end_time: b.end_time,
          customer_name: b.customer_name,
          customer_phone: b.customer_phone,
        })),
      }).catch(() => {});
    } catch {}

    setShowEditModal(false);
    setEditingBooking(null);
    toast.show('تم تحديث بيانات الحجز بنجاح!', 'success');
  };

  // Delete / Cancel booking from Edit Modal
  const handleDeleteBooking = () => {
    if (!editingBooking) return;

    const updated = allBookings.filter(
      (b) => !(b.id === editingBooking.id || (b.date === editingBooking.date && b.start_time === editingBooking.start_time))
    );

    setAllBookings(updated);
    try {
      persistentStorage.setJson('owner.manualBookings', updated);
    } catch {
      // Ignore
    }

    // Auto sync to backend
    try {
      const pendingUser = persistentStorage.getJson<{ phone?: string; id?: number }>('owner.pendingUser');
      const pendingStadium = persistentStorage.getJson<{ name?: string }>('owner.pendingStadium');
      void post('/register-terrain-details', {
        phone: pendingUser?.phone,
        user_id: pendingUser?.id,
        name: pendingStadium?.name || stadiumName || 'ملعب أجيال',
        bookings: updated.map((b) => ({
          date: b.date,
          start_time: b.start_time,
          end_time: b.end_time,
          customer_name: b.customer_name,
          customer_phone: b.customer_phone,
        })),
      }).catch(() => {});
    } catch {}

    setShowEditModal(false);
    setEditingBooking(null);
    toast.show('تم حذف الحجز وأصبح الوقت متاحاً الآن', 'info');
  };

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const ForwardArrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Bar */}
        <View style={styles.topHeaderBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backCircleBtn, { opacity: pressed ? 0.7 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="رجوع"
            hitSlop={12}
          >
            <BackArrow size={20} color="#0F172A" />
          </Pressable>

          <AjiNqssroLogo size={38} layout="vertical" />

          {/* Stadium Selector / Badge */}
          <View style={styles.stadiumSelectorBadge}>
            <StadiumPillIcon size={16} color="#059669" />
            <Text style={styles.stadiumSelectorText}>{stadiumName}</Text>
          </View>
        </View>

        {/* Title Header with Green Plus */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <View style={styles.plusCircle}>
              <Plus size={22} color="#FFFFFF" strokeWidth={3} />
            </View>
            <Text style={[styles.mainTitleText, { color: colors.text }]}>
              إضافة حجز
            </Text>
          </View>

          <Text style={styles.subtitleText}>
            سجّل الحجز اللي جاك عبر الهاتف أو بطريقة أخرى.
          </Text>
        </View>

        {/* Main Content Layout */}
        <View style={styles.contentLayout}>
          {/* Form Card (Steps 1 to 4) */}
          <View style={styles.formCard}>
            {/* ── Step 1: اختر اليوم ── */}
            <View style={styles.stepBlock}>
              <View style={styles.stepHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>1</Text>
                </View>
                <Text style={styles.stepTitle}>اختر اليوم</Text>
              </View>

              <Pressable
                onPress={() => setShowDatePicker(true)}
                style={styles.dateSelectorRow}
                accessibilityRole="button"
                accessibilityLabel="تغيير اليوم"
              >
                <ChevronDown size={18} color="#059669" />
                <View style={styles.dateTextWrap}>
                  <Text style={styles.dateText}>{selectedDateObject.label}</Text>
                  <Calendar size={18} color="#059669" />
                </View>
              </Pressable>
            </View>

            {/* ── Step 2: أوقات العمل وحجز المواعيد ── */}
            <View style={styles.stepBlock}>
              <View style={styles.stepHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>2</Text>
                </View>
                <Text style={styles.stepTitle}>أوقات العمل (اختر توقيت الحجز)</Text>
              </View>

              {/* Grid of 24 Hours Time Slots */}
              <View style={styles.slotsGrid}>
                {ALL_HOURS.map((hour) => {
                  const bookedRecord = getBookingForSlot(hour);
                  const isBooked = !!bookedRecord;

                  // Selection covers all slots within the selected duration (60m = 1 slot, 120m = 2 slots)
                  const slotStartMin = timeToMinutes(hour);
                  const slotEndMin = slotStartMin + 60;
                  const selStartMin = timeToMinutes(selectedTime);
                  const selEndMin = selStartMin + durationMinutes;
                  const isSelected = !isBooked && (slotStartMin < selEndMin && slotEndMin > selStartMin);

                  return (
                    <Pressable
                      key={hour}
                      onPress={() => handlePressSlot(hour, bookedRecord)}
                      style={({ pressed }) => [
                        styles.slotChip,
                        isSelected && styles.slotChipSelected,
                        isBooked && styles.slotChipBooked,
                        pressed && { opacity: 0.8 },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`${hour} ${isBooked ? 'محجوز (اضغط للعرض والتعديل)' : isSelected ? 'محدد حالياً' : 'متاح'}`}
                    >
                      {isBooked ? (
                        <User size={11} color="#14532D" strokeWidth={2.5} />
                      ) : isSelected ? (
                        <Check size={12} color="#FFFFFF" strokeWidth={2.8} />
                      ) : (
                        <View style={styles.availableDot} />
                      )}
                      <Text
                        style={[
                          styles.slotChipText,
                          isSelected && styles.slotChipTextSelected,
                          isBooked && styles.slotChipTextBooked,
                        ]}
                      >
                        {hour}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Informative Legend at bottom */}
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={styles.legendSelectedDot} />
                  <Text style={styles.legendText}>محدد للطلب</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={styles.legendBookedDot} />
                  <Text style={styles.legendText}>محجوز (أخضر ليموني - اضغط للتعديل)</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={styles.legendAvailableDot} />
                  <Text style={styles.legendText}>متاح</Text>
                </View>
              </View>
            </View>

            {/* ── Step 3: مدة الحجز ── */}
            <View style={styles.stepBlock}>
              <View style={styles.stepHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>3</Text>
                </View>
                <Text style={styles.stepTitle}>مدة الحجز</Text>
              </View>

              <View style={styles.durationRow}>
                {/* Duration readout on right */}
                <View style={styles.durationReadout}>
                  <View style={styles.durationHeader}>
                    <Clock size={16} color="#059669" />
                    <Text style={styles.durationTitle}>{durationLabel}</Text>
                  </View>
                  <Text style={styles.durationSubtext}>
                    من {selectedTime} إلى {endTime}
                  </Text>
                </View>

                {/* Duration chips on left */}
                <View style={styles.durationChips}>
                  {[60, 90, 120].map((mins) => {
                    const isSelected = durationMinutes === mins;
                    return (
                      <Pressable
                        key={mins}
                        onPress={() => setDurationMinutes(mins)}
                        style={[
                          styles.durationChip,
                          isSelected && styles.durationChipSelected,
                        ]}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected }}
                      >
                        <Text
                          style={[
                            styles.durationChipText,
                            isSelected && styles.durationChipTextSelected,
                          ]}
                        >
                          {mins} د
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* ── Step 4: معلومات الزبون (اختيارية) ── */}
            <View style={styles.stepBlock}>
              <View style={styles.stepHeader}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>4</Text>
                </View>
                <Text style={styles.stepTitle}>معلومات الزبون (اختيارية)</Text>
              </View>

              <View style={styles.inputsStack}>
                {/* Field 1: اسم الزبون */}
                <View style={styles.inputBox}>
                  <TextInput
                    style={[styles.inputControl, { textAlign: 'right' }]}
                    placeholder="اسم الزبون (مثال: فريق الأمل)"
                    placeholderTextColor="#94A3B8"
                    value={customerName}
                    onChangeText={setCustomerName}
                  />
                  <View style={styles.inputIcon}>
                    <User size={18} color="#94A3B8" />
                  </View>
                </View>

                {/* Field 2: رقم الهاتف */}
                <View style={styles.inputBox}>
                  <TextInput
                    style={[styles.inputControl, { textAlign: 'right' }]}
                    placeholder="06 XX XX XX XX"
                    placeholderTextColor="#94A3B8"
                    value={customerPhone}
                    onChangeText={(val) => setCustomerPhone(formatPhoneDisplay(val))}
                    keyboardType="phone-pad"
                  />
                  <View style={styles.inputIcon}>
                    <Phone size={18} color="#94A3B8" />
                  </View>
                </View>
              </View>
            </View>

            {/* ── Primary Action Button: "تأكيد الحجز ✓" ── */}
            <Pressable
              onPress={handleConfirmBooking}
              disabled={isSubmitting}
              style={({ pressed }) => [
                styles.confirmBtn,
                { opacity: isSubmitting ? 0.7 : pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
              accessibilityRole="button"
              accessibilityLabel="تأكيد الحجز"
            >
              <Check size={20} color="#FFFFFF" strokeWidth={2.6} />
              <Text style={styles.confirmBtnText}>
                {isSubmitting ? 'جاري الحفظ والتأكيد...' : 'تأكيد الحجز'}
              </Text>
            </Pressable>

            {/* Direct Dashboard Link */}
            <Pressable
              onPress={() => router.replace('/(terrain)')}
              style={({ pressed }) => [styles.skipToDashboardBtn, { opacity: pressed ? 0.7 : 1 }]}
              accessibilityRole="button"
              accessibilityLabel="متابعة إلى لوحة التحكم مباشرة"
            >
              <Text style={styles.skipToDashboardText}>متابعة إلى لوحة التحكم مباشرة ←</Text>
            </Pressable>
          </View>

          {/* Right Info Box (Callout Tip Card) */}
          <View style={styles.infoCardSidebar}>
            <View style={styles.phoneTipCard}>
              <View style={styles.phoneIconCircle}>
                <Smartphone size={22} color="#059669" />
              </View>
              <Text style={styles.phoneTipTitle}>حجز هاتفي؟</Text>
              <Text style={styles.phoneTipDesc}>
                يمكنك تسجيل الحجز هنا بسرعة وسهولة.
              </Text>
            </View>

            {/* Curved handwritten reminder note */}
            <View style={styles.curvedNoteWrap}>
              <Text style={styles.curvedNoteText}>
                مهم جداً باش ما يكونش تداخل في المواعيد
              </Text>
            </View>

            {/* Illustration */}
            <View style={styles.illustrationWrap}>
              <CalendarBallIllustration size={90} />
            </View>

            {/* Auto sync notice */}
            <View style={styles.autoSyncNotice}>
              <Info size={16} color="#059669" />
              <Text style={styles.autoSyncText}>
                بعد الحجز، يظهر باللون الأخضر الليموني ويمكنك الضغط عليه لتعديله أو حذفه.
              </Text>
            </View>
          </View>
        </View>

        {/* Bottom Slogan */}
        <View style={styles.bottomSlogan}>
          <View style={styles.sloganDash} />
          <Text style={styles.sloganText}>معاً من أجل كرة قدم محلية أقوى</Text>
          <View style={styles.sloganDash} />
        </View>
      </ScrollView>

      {/* ── Date Picker Sheet Modal ── */}
      <Modal
        visible={showDatePicker}
        animationType="fade"
        transparent
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setShowDatePicker(false)} style={styles.closeBtn}>
                <X size={20} color="#64748B" />
              </Pressable>
              <Text style={[styles.modalTitle, { color: colors.text }]}>اختر تاريخ الحجز</Text>
            </View>

            <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
              {upcomingDays.map((item, idx) => {
                const isSelected = selectedDayIndex === idx;
                return (
                  <Pressable
                    key={item.dateStr}
                    onPress={() => {
                      setSelectedDayIndex(idx);
                      setShowDatePicker(false);
                    }}
                    style={[
                      styles.dateOptionItem,
                      isSelected && styles.dateOptionItemSelected,
                    ]}
                  >
                    {isSelected ? <Check size={18} color="#059669" /> : <View style={{ width: 18 }} />}
                    <Text
                      style={[
                        styles.dateOptionText,
                        isSelected && styles.dateOptionTextSelected,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ── Edit / View Existing Booking Modal ── */}
      <Modal
        visible={showEditModal && editingBooking !== null}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowEditModal(false);
          setEditingBooking(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Pressable
                onPress={() => {
                  setShowEditModal(false);
                  setEditingBooking(null);
                }}
                style={styles.closeBtn}
              >
                <X size={20} color="#64748B" />
              </Pressable>
              <View style={styles.editModalTitleWrap}>
                <Text style={[styles.modalTitle, { color: colors.text }]}>تفاصيل الحجز</Text>
                <View style={styles.bookedSlimeBadge}>
                  <Text style={styles.bookedSlimeBadgeText}>محجوز</Text>
                </View>
              </View>
            </View>

            {editingBooking && (
              <View style={styles.editModalContent}>
                {/* Time & Date summary */}
                <View style={styles.editInfoBox}>
                  <View style={styles.editInfoRow}>
                    <Text style={styles.editInfoVal}>{editingBooking.dateLabel}</Text>
                    <Text style={styles.editInfoKey}>اليوم:</Text>
                  </View>
                  <View style={styles.editInfoRow}>
                    <Text style={styles.editInfoVal}>
                      {editingBooking.start_time} إلى {calculateEndTime(editingBooking.start_time, editingBooking.duration)}
                    </Text>
                    <Text style={styles.editInfoKey}>الوقت:</Text>
                  </View>
                </View>

                {/* Editable: Customer Name */}
                <View style={styles.editFieldBlock}>
                  <Text style={styles.editFieldLabel}>اسم الزبون / الفريق:</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={[styles.inputControl, { textAlign: 'right' }]}
                      placeholder="اسم الزبون"
                      placeholderTextColor="#94A3B8"
                      value={editingBooking.customer_name}
                      onChangeText={(val) =>
                        setEditingBooking((prev) => (prev ? { ...prev, customer_name: val } : null))
                      }
                    />
                    <View style={styles.inputIcon}>
                      <User size={18} color="#94A3B8" />
                    </View>
                  </View>
                </View>

                {/* Editable: Phone */}
                <View style={styles.editFieldBlock}>
                  <Text style={styles.editFieldLabel}>رقم الهاتف:</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      style={[styles.inputControl, { textAlign: 'right' }]}
                      placeholder="06 XX XX XX XX"
                      placeholderTextColor="#94A3B8"
                      value={editingBooking.customer_phone === '—' ? '' : editingBooking.customer_phone}
                      onChangeText={(val) =>
                        setEditingBooking((prev) => (prev ? { ...prev, customer_phone: formatPhoneDisplay(val) } : null))
                      }
                      keyboardType="phone-pad"
                    />
                    <View style={styles.inputIcon}>
                      <Phone size={18} color="#94A3B8" />
                    </View>
                  </View>
                </View>

                {/* Editable: Duration */}
                <View style={styles.editFieldBlock}>
                  <Text style={styles.editFieldLabel}>تعديل مدة الحجز:</Text>
                  <View style={styles.durationChips}>
                    {[60, 90, 120].map((mins) => {
                      const isSelected = editingBooking.duration === mins;
                      return (
                        <Pressable
                          key={mins}
                          onPress={() =>
                            setEditingBooking((prev) => (prev ? { ...prev, duration: mins } : null))
                          }
                          style={[
                            styles.durationChip,
                            isSelected && styles.durationChipSelected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.durationChipText,
                              isSelected && styles.durationChipTextSelected,
                            ]}
                          >
                            {mins} د
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>

                {/* Modal Action Buttons */}
                <View style={styles.editModalButtons}>
                  <Pressable
                    onPress={handleSaveEditBooking}
                    style={styles.saveEditBtn}
                    accessibilityRole="button"
                    accessibilityLabel="حفظ التعديلات"
                  >
                    <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.saveEditBtnText}>حفظ التعديلات</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleDeleteBooking}
                    style={styles.deleteBookingBtn}
                    accessibilityRole="button"
                    accessibilityLabel="إلغاء وحذف الحجز"
                  >
                    <Trash2 size={16} color="#DC2626" />
                    <Text style={styles.deleteBookingBtnText}>إلغاء / حذف الحجز</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Booking Success Confirmation Modal ── */}
      <Modal
        visible={showSuccessModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, paddingVertical: spacing.xl }]}>
            <View style={styles.successIconCircle}>
              <Check size={36} color="#FFFFFF" strokeWidth={3} />
            </View>

            <Text style={[styles.successModalTitle, { color: colors.text }]}>
              تم تأكيد الحجز بنجاح!
            </Text>

            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryValue}>{stadiumName}</Text>
                <Text style={styles.summaryLabel}>الملعب:</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryValue}>{selectedDateObject.label}</Text>
                <Text style={styles.summaryLabel}>التاريخ:</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryValue}>من {selectedTime} إلى {endTime} ({durationLabel})</Text>
                <Text style={styles.summaryLabel}>الوقت:</Text>
              </View>
              {customerName ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryValue}>{customerName}</Text>
                  <Text style={styles.summaryLabel}>الزبون:</Text>
                </View>
              ) : null}
            </View>

            <View style={styles.successModalActions}>
              <Pressable
                onPress={handleResetForNextBooking}
                style={styles.addAnotherBtn}
              >
                <RotateCcw size={18} color="#059669" />
                <Text style={styles.addAnotherBtnText}>إضافة حجز آخر</Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setShowSuccessModal(false);
                  router.replace('/(terrain)');
                }}
                style={styles.goToDashboardBtn}
              >
                <Text style={styles.goToDashboardBtnText}>متابعة إلى لوحة التحكم</Text>
                <ForwardArrow size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const screenWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  backCircleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  stadiumSelectorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  stadiumSelectorText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '800',
  },
  titleSection: {
    alignItems: 'center',
    gap: 4,
    marginVertical: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  plusCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainTitleText: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  contentLayout: {
    gap: spacing.md,
  },
  formCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    gap: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  stepBlock: {
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    padding: 12,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
  },
  stepBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  dateSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  dateTextWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  slotsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    justifyContent: 'space-between',
  },
  slotChip: {
    width: (screenWidth - spacing.md * 2 - 24 - 24) / 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  slotChipSelected: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  // Slime Green for booked slots!
  slotChipBooked: {
    backgroundColor: '#84CC16',
    borderColor: '#65A30D',
    borderWidth: 1.5,
    shadowColor: '#65A30D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#CBD5E1',
  },
  slotChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1E293B',
  },
  slotChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  slotChipTextBooked: {
    color: '#14532D',
    fontWeight: '900',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 6,
    paddingEnd: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendSelectedDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#059669',
  },
  legendAvailableDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#CBD5E1',
  },
  legendBookedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#84CC16',
    borderWidth: 1.5,
    borderColor: '#65A30D',
  },
  legendText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  durationReadout: {
    alignItems: 'flex-start',
    gap: 2,
  },
  durationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  durationTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  durationSubtext: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  durationChips: {
    flexDirection: 'row',
    gap: 6,
  },
  durationChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  durationChipSelected: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  durationChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E293B',
  },
  durationChipTextSelected: {
    color: '#FFFFFF',
  },
  inputsStack: {
    gap: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    height: 48,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
  },
  inputControl: {
    flex: 1,
    fontSize: 13,
    height: '100%',
  },
  inputIcon: {
    marginStart: 8,
  },
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#059669',
    height: 52,
    borderRadius: 26,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
    marginTop: 4,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  skipToDashboardBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  skipToDashboardText: {
    color: '#059669',
    fontSize: 13,
    fontWeight: '800',
  },
  // Info Card Sidebar
  infoCardSidebar: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1.2,
    borderRadius: 20,
    padding: spacing.md,
    gap: 12,
    alignItems: 'center',
  },
  phoneTipCard: {
    alignItems: 'center',
    gap: 4,
  },
  phoneIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  phoneTipTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#065F46',
  },
  phoneTipDesc: {
    fontSize: 12,
    color: '#047857',
    textAlign: 'center',
  },
  curvedNoteWrap: {
    paddingHorizontal: 8,
  },
  curvedNoteText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#059669',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  illustrationWrap: {
    marginVertical: 4,
  },
  autoSyncNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: '100%',
  },
  autoSyncText: {
    flex: 1,
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
    textAlign: 'right',
  },
  bottomSlogan: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: spacing.xs,
  },
  sloganDash: {
    width: 24,
    height: 1.5,
    backgroundColor: '#10B981',
  },
  sloganText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#059669',
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    borderRadius: 22,
    padding: spacing.lg,
    gap: spacing.md,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  editModalTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bookedSlimeBadge: {
    backgroundColor: '#84CC16',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  bookedSlimeBadgeText: {
    color: '#14532D',
    fontSize: 11,
    fontWeight: '900',
  },
  closeBtn: {
    padding: 4,
  },
  editModalContent: {
    gap: 12,
  },
  editInfoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 6,
  },
  editInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editInfoKey: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  editInfoVal: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '800',
  },
  editFieldBlock: {
    gap: 4,
  },
  editFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'right',
  },
  editModalButtons: {
    gap: 8,
    marginTop: 6,
  },
  saveEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#059669',
  },
  saveEditBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  deleteBookingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
  },
  deleteBookingBtnText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '800',
  },
  dateOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dateOptionItemSelected: {
    backgroundColor: '#F0FDF4',
  },
  dateOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  dateOptionTextSelected: {
    color: '#059669',
    fontWeight: '800',
  },
  successIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#059669',
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  successModalTitle: {
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  summaryBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '800',
  },
  successModalActions: {
    gap: 10,
    marginTop: 4,
  },
  addAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: '#059669',
    backgroundColor: '#FFFFFF',
  },
  addAnotherBtnText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '800',
  },
  goToDashboardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#059669',
  },
  goToDashboardBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
