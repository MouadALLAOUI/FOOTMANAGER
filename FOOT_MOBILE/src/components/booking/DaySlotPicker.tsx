import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, Check, Clock, MinusCircle } from 'lucide-react-native';

export interface DayOption {
  id: string;
  label: string; // e.g. "اليوم" or "غداً" or "السبت"
  dateFormatted: string; // e.g. "12 شتنبر" or "10 سبتمبر"
  fullDate: string; // e.g. "2026-09-12"
}

export interface SlotOption {
  id: string;
  timeRange: string; // e.g. "18:00 - 19:00"
  status: 'available' | 'booked' | 'selected';
}

interface DaySlotPickerProps {
  days: DayOption[];
  selectedDayId: string;
  onSelectDay: (day: DayOption) => void;
  slots: SlotOption[];
  selectedSlotId: string | null;
  onSelectSlot: (slot: SlotOption) => void;
  titleDayStep?: string;
  titleSlotStep?: string;
}

export function DaySlotPicker({
  days,
  selectedDayId,
  onSelectDay,
  slots,
  selectedSlotId,
  onSelectSlot,
  titleDayStep = 'اختر النهار',
  titleSlotStep = 'اختر الساعة',
}: DaySlotPickerProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      {/* Step: Select Day */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{titleDayStep}</Text>
        <Calendar size={18} color="#00875A" />
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
              onPress={() => onSelectDay(day)}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>
                {day.label}
              </Text>
              <Text style={[styles.dayDate, isSelected && styles.dayDateSelected]}>
                {day.dateFormatted}
              </Text>

              <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                {isSelected ? (
                  <Check size={12} color="#00875A" />
                ) : (
                  <View style={styles.radioEmpty} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Step: Select Time Slot */}
      <View style={[styles.sectionHeader, styles.slotHeaderMargin]}>
        <Text style={styles.sectionTitle}>{titleSlotStep}</Text>
        <Clock size={18} color="#00875A" />
      </View>

      {slots.length > 0 ? (
        <View style={styles.slotsGrid}>
          {slots.map((slot) => {
            const isBooked = slot.status === 'booked';
            const isSelected = slot.id === selectedSlotId;

            return (
              <TouchableOpacity
                key={slot.id}
                style={[
                  styles.slotCard,
                  isBooked && styles.slotCardBooked,
                  isSelected && styles.slotCardSelected,
                ]}
                disabled={isBooked}
                onPress={() => onSelectSlot(slot)}
                activeOpacity={0.8}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.slotTimeText,
                    isBooked && styles.slotTimeTextBooked,
                    isSelected && styles.slotTimeTextSelected,
                  ]}
                >
                  {slot.timeRange}
                </Text>

                <View style={styles.slotStatusRow}>
                  {isBooked ? (
                    <View style={styles.bookedBadge}>
                      <Text style={styles.bookedBadgeText}>محجوز</Text>
                      <MinusCircle size={12} color="#DC2626" />
                    </View>
                  ) : isSelected ? (
                    <View style={styles.selectedBadge}>
                      <Check size={14} color="#FFFFFF" />
                    </View>
                  ) : (
                    <View style={styles.availableBadge}>
                      <Text style={styles.availableBadgeText}>متاح</Text>
                      <View style={styles.availableDot} />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : (
        <View style={styles.emptySlotsWrap}>
          <Clock size={28} color="#94A3B8" />
          <Text style={styles.emptySlotsText}>لا توجد أوقات متاحة في هذا اليوم</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  sectionHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#064E3B',
    textAlign: 'right',
  },
  daysScroll: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 16,
    gap: 10,
  },
  dayCard: {
    width: 82,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 90,
  },
  dayCardSelected: {
    backgroundColor: '#00875A',
    borderColor: '#00875A',
  },
  dayLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  dayLabelSelected: {
    color: '#FFFFFF',
  },
  dayDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  dayDateSelected: {
    color: 'rgba(255, 255, 255, 0.9)',
  },
  checkCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    marginTop: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  checkCircleSelected: {
    borderColor: '#FFFFFF',
    backgroundColor: '#FFFFFF',
  },
  radioEmpty: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'transparent',
  },
  slotHeaderMargin: {
    marginTop: 20,
  },
  slotsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: 16,
  },
  slotCard: {
    width: '48%',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  slotCardBooked: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    opacity: 0.8,
  },
  slotCardSelected: {
    backgroundColor: '#00875A',
    borderColor: '#00875A',
  },
  slotTimeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064E3B',
  },
  slotTimeTextBooked: {
    color: '#991B1B',
  },
  slotTimeTextSelected: {
    color: '#FFFFFF',
  },
  slotStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookedBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  bookedBadgeText: {
    fontSize: 11,
    color: '#DC2626',
    fontWeight: '700',
  },
  selectedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  availableBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  availableBadgeText: {
    fontSize: 11,
    color: '#00875A',
    fontWeight: '700',
  },
  availableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00875A',
  },
  emptySlotsWrap: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 6,
  },
  emptySlotsText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '700',
  },
});
