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
  Calendar,
  Check,
  ChevronLeft,
  Flame,
  MapPin,
  MinusCircle,
  Plus,
  Shield,
  Sparkles,
  Users,
} from 'lucide-react-native';

import { AjiNqssroHeader } from '@/components/ui/AjiNqssroHeader';
import { usePublicStadium, usePublicStadiums, useStadiumSlots } from '@/api/stadiums';

function generateDays() {
  const days = [];
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
      date: `${d.getDate()} ${monthName}`,
      fullDate,
    });
  }
  return days;
}

export default function BookMatchScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{
    stadiumId?: string;
    stadiumName?: string;
    dayLabel?: string;
    timeSlot?: string;
  }>();
  const insets = useSafeAreaInsets();

  const days = React.useMemo(() => generateDays(), []);
  const [selectedDayId, setSelectedDayId] = useState('1');
  const selectedDay = days.find((d) => d.id === selectedDayId) || days[0];

  // Fetch stadiums or specific stadium
  const { data: stadiumsResponse } = usePublicStadiums();
  const allStadiums = stadiumsResponse?.data || [];
  const currentStadiumId = params.stadiumId || (allStadiums[0]?.id ? String(allStadiums[0].id) : '1');

  const { data: stadiumDetailResponse } = usePublicStadium(currentStadiumId);
  const stadium = stadiumDetailResponse?.data || allStadiums.find((s) => String(s.id) === currentStadiumId);

  // Fetch slots for this stadium and selected date
  const { data: slotsResponse } = useStadiumSlots(currentStadiumId, selectedDay.fullDate);
  const apiSlots = slotsResponse?.slots || [];

  const slots = apiSlots.length > 0
    ? apiSlots
        .filter((s) => s.status !== 'closed')
        .map((s, idx) => ({
          id: `${s.start}-${s.end}-${idx}`,
          time: `${s.start.slice(0, 5)} - ${s.end.slice(0, 5)}`,
          status: s.status === 'booked' ? 'booked' : idx === 0 ? 'selected' : 'available',
        }))
    : [];

  const opponentTeams = [
    { id: '1', name: 'شباب أيت لحسن', shieldColor: '#00875A' },
    { id: '2', name: 'اتحاد دادس', shieldColor: '#0284C7' },
    { id: '3', name: 'نجوم تودغى', shieldColor: '#6366F1' },
    { id: '4', name: 'فريق آخر', shieldColor: '#94A3B8', isAdd: true },
  ];

  const [selectedSlotId, setSelectedSlotId] = useState(slots[0]?.id || '1');
  const [matchType, setMatchType] = useState<'friendly' | 'challenge'>('friendly');
  const [selectedOpponentId, setSelectedOpponentId] = useState('1');

  const chosenSlot = slots.find((s) => s.id === selectedSlotId) || slots[0];
  const chosenStadiumName = stadium?.name || (params.stadiumName as string) || 'ملعب كرة القدم';

  const handleConfirm = () => {
    if (matchType === 'challenge') {
      router.push({
        pathname: `/challenges/created/${currentStadiumId}` as any,
        params: {
          stadiumName: chosenStadiumName,
          date: `${selectedDay.label} ${selectedDay.date}`,
          time: chosenSlot?.time || '18:00 - 19:00',
        },
      });
    } else {
      router.push({
        pathname: '/(public)/booking-confirm' as any,
        params: {
          stadiumName: chosenStadiumName,
          date: `${selectedDay.label} ${selectedDay.date}`,
          time: chosenSlot?.time || '18:00 - 19:00',
          matchType: 'مباراة ودية',
        },
      });
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* Header */}
      <AjiNqssroHeader
        showBack
        title="حجز ملعب"
        subtitle="احجز ملعبك وابدأ المباراة"
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Step 1: اختر الملعب */}
        <View style={styles.stepContainer}>
          <View style={styles.stepHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeNum}>1</Text>
            </View>
            <Text style={styles.stepTitle}>اختر الملعب</Text>
          </View>

          <TouchableOpacity
            style={styles.stadiumSelectCard}
            activeOpacity={0.88}
            onPress={() => router.push('/(public)/stadiums' as any)}
          >
            <Image
              source={{
                uri:
                  stadium?.cover_image_url ||
                  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=600&q=80',
              }}
              style={styles.stadiumSelectThumb}
            />

            <View style={styles.stadiumSelectInfo}>
              <Text style={styles.stadiumSelectName}>
                {stadium?.name || chosenStadiumName}
              </Text>
              <View style={styles.stadiumSelectLocationRow}>
                <Text style={styles.stadiumSelectLocationText}>
                  {[stadium?.city, stadium?.address].filter(Boolean).join(' - ') ||
                    'تنغير - جماعة أيت سدرين'}
                </Text>
                <MapPin size={12} color="#00875A" />
              </View>

              <View style={styles.stadiumSelectTagsRow}>
                <View style={styles.specTag}>
                  <Text style={styles.specTagText}>{stadium?.player_format || '7 × 7'}</Text>
                  <Users size={11} color="#00875A" />
                </View>
                <View style={styles.specTag}>
                  <Text style={styles.specTagText}>{stadium?.type || 'عشب اصطناعي'}</Text>
                  <Sparkles size={11} color="#00875A" />
                </View>
              </View>
            </View>

            <View style={styles.stadiumSelectChevron}>
              <ChevronLeft size={18} color="#00875A" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Step 2: اختر النهار */}
        <View style={styles.stepContainer}>
          <View style={styles.stepHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeNum}>2</Text>
            </View>
            <Text style={styles.stepTitle}>اختر النهار</Text>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.daysScroll}
          >
            {days.map((day) => {
              const isSelected = day.id === selectedDayId;
              return (
                <TouchableOpacity
                  key={day.id}
                  style={[styles.dayCard, isSelected && styles.dayCardSelected]}
                  onPress={() => setSelectedDayId(day.id)}
                  activeOpacity={0.8}
                >
                  <Calendar size={16} color={isSelected ? '#FFFFFF' : '#00875A'} />
                  <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>
                    {day.label}
                  </Text>
                  <Text style={[styles.dayDate, isSelected && styles.dayDateSelected]}>
                    {day.date}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Step 3: اختر الساعة */}
        <View style={styles.stepContainer}>
          <View style={styles.stepHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeNum}>3</Text>
            </View>
            <Text style={styles.stepTitle}>اختر الساعة</Text>
          </View>

          <View style={styles.slotsRow}>
            {slots.map((slot) => {
              const isSelected = slot.id === selectedSlotId;
              const isBooked = slot.status === 'booked';

              return (
                <TouchableOpacity
                  key={slot.id}
                  disabled={isBooked}
                  style={[
                    styles.slotPill,
                    isBooked && styles.slotPillBooked,
                    isSelected && styles.slotPillSelected,
                  ]}
                  onPress={() => setSelectedSlotId(slot.id)}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.slotPillTime,
                      isBooked && styles.slotPillTimeBooked,
                      isSelected && styles.slotPillTimeSelected,
                    ]}
                  >
                    {slot.time}
                  </Text>

                  {isBooked ? (
                    <View style={styles.statusInnerRow}>
                      <Text style={styles.statusBookedText}>محجوز</Text>
                      <MinusCircle size={12} color="#DC2626" />
                    </View>
                  ) : isSelected ? (
                    <View style={styles.statusCheckedCircle}>
                      <Check size={12} color="#FFFFFF" />
                    </View>
                  ) : (
                    <View style={styles.statusInnerRow}>
                      <Text style={styles.statusAvailableText}>متاح</Text>
                      <View style={styles.statusAvailableDot} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Step 4: نوع المباراة */}
        <View style={styles.stepContainer}>
          <View style={styles.stepHeader}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeNum}>4</Text>
            </View>
            <Text style={styles.stepTitle}>نوع المباراة</Text>
          </View>

          <View style={styles.matchTypesRow}>
            {/* Friendly match card */}
            <TouchableOpacity
              style={[
                styles.matchTypeCard,
                matchType === 'friendly' && styles.matchTypeCardActiveFriendly,
              ]}
              onPress={() => setMatchType('friendly')}
              activeOpacity={0.85}
            >
              <View style={styles.matchTypeTop}>
                <View style={[styles.typeIconBox, { backgroundColor: '#F0FDF4' }]}>
                  <Users size={22} color="#00875A" />
                </View>
                <View
                  style={[
                    styles.typeRadio,
                    matchType === 'friendly' && styles.typeRadioActiveFriendly,
                  ]}
                >
                  {matchType === 'friendly' && <Check size={12} color="#FFFFFF" />}
                </View>
              </View>
              <Text style={styles.matchTypeTitle}>مباراة ودية</Text>
              <Text style={styles.matchTypeSubtitle}>عندي الخصم</Text>
            </TouchableOpacity>

            {/* Challenge match card */}
            <TouchableOpacity
              style={[
                styles.matchTypeCard,
                matchType === 'challenge' && styles.matchTypeCardActiveChallenge,
              ]}
              onPress={() => setMatchType('challenge')}
              activeOpacity={0.85}
            >
              <View style={styles.matchTypeTop}>
                <View style={[styles.typeIconBox, { backgroundColor: '#FFF7ED' }]}>
                  <Flame size={22} color="#EA580C" />
                </View>
                <View
                  style={[
                    styles.typeRadio,
                    matchType === 'challenge' && styles.typeRadioActiveChallenge,
                  ]}
                >
                  {matchType === 'challenge' && <Check size={12} color="#FFFFFF" />}
                </View>
              </View>
              <Text style={styles.matchTypeTitle}>تحدي</Text>
              <Text style={styles.matchTypeSubtitle}>مازال كنقلب على خصم</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Step 5: اختر الخصم (if friendly match selected) */}
        {matchType === 'friendly' && (
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeNum}>5</Text>
              </View>
              <Text style={styles.stepTitle}>اختر الخصم</Text>
            </View>

            <View style={styles.opponentsRow}>
              {opponentTeams.map((team) => {
                const isSelected = team.id === selectedOpponentId;
                return (
                  <TouchableOpacity
                    key={team.id}
                    style={[
                      styles.opponentCard,
                      isSelected && styles.opponentCardSelected,
                    ]}
                    onPress={() => setSelectedOpponentId(team.id)}
                    activeOpacity={0.8}
                  >
                    {isSelected && (
                      <View style={styles.selectedOpponentCheck}>
                        <Check size={10} color="#FFFFFF" />
                      </View>
                    )}
                    <View
                      style={[
                        styles.teamShieldIcon,
                        { backgroundColor: team.shieldColor },
                      ]}
                    >
                      {team.isAdd ? (
                        <Plus size={16} color="#FFFFFF" />
                      ) : (
                        <Shield size={16} color="#FFFFFF" />
                      )}
                    </View>
                    <Text
                      style={[
                        styles.teamShieldName,
                        isSelected && styles.teamShieldNameSelected,
                      ]}
                    >
                      {team.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Bottom Sticky CTA Button: تأكيد الحجز */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={handleConfirm}
          activeOpacity={0.88}
        >
          <Calendar size={18} color="#FFFFFF" />
          <Text style={styles.confirmBtnText}>تأكيد الحجز</Text>
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
  stepContainer: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  stepHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeNum: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#064E3B',
    textAlign: 'right',
  },
  stadiumSelectCard: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  stadiumSelectThumb: {
    width: 80,
    height: 60,
    borderRadius: 10,
  },
  stadiumSelectInfo: {
    flex: 1,
    alignItems: 'flex-end',
  },
  stadiumSelectName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064E3B',
  },
  stadiumSelectLocationRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  stadiumSelectLocationText: {
    fontSize: 11,
    color: '#64748B',
  },
  stadiumSelectTagsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginTop: 4,
  },
  specTag: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
  },
  specTagText: {
    fontSize: 10,
    color: '#00875A',
    fontWeight: '600',
  },
  stadiumSelectChevron: {
    padding: 6,
  },
  daysScroll: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  dayCard: {
    width: 78,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 4,
  },
  dayCardSelected: {
    backgroundColor: '#00875A',
    borderColor: '#00875A',
  },
  dayLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
  },
  dayLabelSelected: {
    color: '#FFFFFF',
  },
  dayDate: {
    fontSize: 10,
    color: '#64748B',
  },
  dayDateSelected: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  slotsRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  slotPill: {
    width: '48%',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  slotPillBooked: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    opacity: 0.75,
  },
  slotPillSelected: {
    backgroundColor: '#00875A',
    borderColor: '#00875A',
  },
  slotPillTime: {
    fontSize: 13,
    fontWeight: '800',
    color: '#064E3B',
  },
  slotPillTimeBooked: {
    color: '#991B1B',
  },
  slotPillTimeSelected: {
    color: '#FFFFFF',
  },
  statusInnerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  statusBookedText: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '700',
  },
  statusAvailableText: {
    fontSize: 10,
    color: '#00875A',
    fontWeight: '700',
  },
  statusAvailableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00875A',
  },
  statusCheckedCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  matchTypesRow: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  matchTypeCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'flex-end',
  },
  matchTypeCardActiveFriendly: {
    borderColor: '#00875A',
    backgroundColor: '#F0FDF4',
  },
  matchTypeCardActiveChallenge: {
    borderColor: '#EA580C',
    backgroundColor: '#FFF7ED',
  },
  matchTypeTop: {
    width: '100%',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  typeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeRadioActiveFriendly: {
    borderColor: '#00875A',
    backgroundColor: '#00875A',
  },
  typeRadioActiveChallenge: {
    borderColor: '#EA580C',
    backgroundColor: '#EA580C',
  },
  matchTypeTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
  },
  matchTypeSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'right',
  },
  opponentsRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  opponentCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    position: 'relative',
  },
  opponentCardSelected: {
    borderColor: '#00875A',
    backgroundColor: '#F0FDF4',
  },
  selectedOpponentCheck: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamShieldIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  teamShieldName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'center',
  },
  teamShieldNameSelected: {
    color: '#00875A',
    fontWeight: '800',
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
  confirmBtn: {
    backgroundColor: '#00875A',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
