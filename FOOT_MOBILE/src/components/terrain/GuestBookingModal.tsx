import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { UserPlus } from 'lucide-react-native';

import { getApiErrorMessage } from '@/api/errors';
import { type GuestBookingPayload, useCreateGuestBooking } from '@/api/ownerBookings';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, sizes, spacing } from '@/theme/spacing';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface WeekDayOption {
  date: string;
  label: string;
  isToday?: boolean;
}

interface Props {
  visible: boolean;
  terrainId: number | string;
  weekDays: WeekDayOption[];
  defaultDate?: string;
  defaultStart?: string;
  defaultEnd?: string;
  onClose: () => void;
}

export function GuestBookingModal({
  visible,
  terrainId,
  weekDays,
  defaultDate,
  defaultStart,
  defaultEnd,
  onClose,
}: Props): React.JSX.Element | null {
  const { t } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();
  const createGuest = useCreateGuestBooking();

  const [reservationType, setReservationType] = useState<'single' | 'weekly_subscription'>('single');
  const [bookingType, setBookingType] = useState<'training' | 'private' | 'match'>('training');
  const [date, setDate] = useState(defaultDate ?? weekDays[0]?.date ?? '');
  const [dayOfWeek, setDayOfWeek] = useState<string>(new Date().getDay().toString());
  const [startDate, setStartDate] = useState(defaultDate ?? weekDays[0]?.date ?? '');
  const [endDate, setEndDate] = useState('');
  const [start, setStart] = useState(defaultStart ?? '');
  const [end, setEnd] = useState(defaultEnd ?? '');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');

  if (!visible) return null;

  const submit = (): void => {
    if (!name.trim()) {
      toast.show(t('bookings.guest.needName', 'Guest name is required'), 'error');
      return;
    }
    if (!phone.trim() && !email.trim()) {
      toast.show(t('bookings.guest.needContact', 'Enter a phone or email'), 'error');
      return;
    }
    if (!TIME_RE.test(start) || !TIME_RE.test(end)) {
      toast.show(t('bookings.guest.invalidTime', 'Enter valid HH:MM times'), 'error');
      return;
    }
    if (end <= start) {
      toast.show(t('bookings.guest.endAfterStart', 'End time must be after start time'), 'error');
      return;
    }
    if (reservationType === 'single' && !DATE_RE.test(date)) {
      toast.show(t('bookings.guest.invalidDate', 'Choose a valid date'), 'error');
      return;
    }
    if (reservationType === 'weekly_subscription' && !DATE_RE.test(startDate)) {
      toast.show(t('bookings.guest.invalidDate', 'Choose a valid start date'), 'error');
      return;
    }

    const payload: GuestBookingPayload = {
      reservation_type: reservationType,
      booking_type: bookingType,
      start_time: start,
      end_time: end,
      guest_name: name.trim(),
      guest_phone: phone.trim() || undefined,
      guest_email: email.trim() || undefined,
      notes: notes.trim() || undefined,
      ...(reservationType === 'single'
        ? { booking_date: date }
        : {
            day_of_week: Number(dayOfWeek),
            start_date: startDate,
            end_date: endDate.trim() || undefined,
          }),
    };

    createGuest.mutate(
      { terrainId, payload },
      {
        onSuccess: (data) => {
          onClose();
          toast.show(data.message || t('bookings.guest.created', 'Guest booking created'), 'success');
        },
        onError: (err) => {
          toast.show(getApiErrorMessage(err, t('bookings.guest.createFailed', 'Could not create guest booking')), 'error');
        },
      },
    );
  };

  const renderReservationToggle = (): React.JSX.Element => (
    <View style={styles.segmentRow}>
      {(['single', 'weekly_subscription'] as const).map((rt) => {
        const selected = reservationType === rt;
        return (
          <Pressable
            key={rt}
            onPress={() => setReservationType(rt)}
            style={[styles.segment, { backgroundColor: selected ? colors.primary : colors.bgMuted }]}
            accessibilityRole="button"
          >
            <AppText variant="small" style={{ color: selected ? colors.textOnPrimary : colors.text }}>
              {rt === 'single'
                ? t('bookings.guest.single', 'One time')
                : t('bookings.guest.weekly', 'Weekly')}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );

  const renderTypeButtons = (): React.JSX.Element => (
    <View style={styles.segmentRow}>
      {(['training', 'private', 'match'] as const).map((bt) => {
        const selected = bookingType === bt;
        return (
          <Pressable
            key={bt}
            onPress={() => setBookingType(bt)}
            style={[styles.segment, { backgroundColor: selected ? colors.primary : colors.bgMuted }]}
            accessibilityRole="button"
          >
            <AppText variant="small" style={{ color: selected ? colors.textOnPrimary : colors.text }}>
              {t(`bookings.type.${bt}`, bt)}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <Modal visible={visible} onClose={onClose} title={t('bookings.guestTitle', 'Add guest booking')}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
        <View style={styles.row}>
          <UserPlus size={sizes.iconMd} color={colors.primary} />
          <AppText variant="caption" muted>
            {t('bookings.guest.hint', 'Record a walk-in or offline booking directly on the calendar.')}
          </AppText>
        </View>

        <AppText variant="bodyBold" style={styles.labelText}>
          {t('bookings.guest.reservationType', 'Reservation type')}
        </AppText>
        {renderReservationToggle()}

        <AppText variant="bodyBold" style={styles.labelText}>
          {t('bookings.guest.type', 'Match type')}
        </AppText>
        {renderTypeButtons()}

        {reservationType === 'single' ? (
          <>
            <AppText variant="bodyBold" style={styles.labelText}>
              {t('bookings.guest.date', 'Date')}
            </AppText>
            <View style={styles.chipRow}>
              {weekDays.map((d) => {
                const selected = d.date === date;
                return (
                  <Pressable
                    key={d.date}
                    onPress={() => setDate(d.date)}
                    style={[
                      styles.chip,
                      { backgroundColor: selected ? colors.primary : colors.bgMuted, borderColor: selected ? colors.primary : colors.border },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={d.label}
                  >
                    <AppText variant="small" style={{ color: selected ? colors.textOnPrimary : colors.text }}>
                      {d.label}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : (
          <View style={styles.weeklyFields}>
            <Input
              label={t('bookings.guest.dayOfWeek', 'Day of week (0-6)')}
              value={dayOfWeek}
              onChangeText={(v) => setDayOfWeek(v.replace(/[^0-6]/g, ''))}
              keyboardType="numeric"
              maxLength={1}
            />
            <Input
              label={t('bookings.guest.startDate', 'Start date (YYYY-MM-DD)')}
              value={startDate}
              onChangeText={setStartDate}
              containerStyle={{ marginTop: spacing.sm }}
              hint={t('bookings.guest.dateFormatHint', 'e.g. 2026-08-28')}
            />
            <Input
              label={t('bookings.guest.endDate', 'End date (optional)')}
              value={endDate}
              onChangeText={setEndDate}
              containerStyle={{ marginTop: spacing.sm }}
            />
          </View>
        )}

        <View style={styles.timeRow}>
          <Input
            label={t('bookings.guest.start', 'Start')}
            placeholder="18:00"
            value={start}
            onChangeText={setStart}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            containerStyle={styles.timeInput}
          />
          <Input
            label={t('bookings.guest.end', 'End')}
            placeholder="20:00"
            value={end}
            onChangeText={setEnd}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            containerStyle={styles.timeInput}
          />
        </View>

        <Input label={t('bookings.guest.name', 'Guest name')} value={name} onChangeText={setName} containerStyle={{ marginTop: spacing.md }} />
        <View style={styles.timeRow}>
          <Input
            label={t('bookings.guest.phone', 'Phone')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            containerStyle={styles.timeInput}
          />
          <Input
            label={t('bookings.guest.email', 'Email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            containerStyle={styles.timeInput}
          />
        </View>
        <Input
          label={t('bookings.guest.notes', 'Notes (optional)')}
          value={notes}
          onChangeText={setNotes}
          containerStyle={{ marginTop: spacing.md }}
        />

        <Button
          title={t('bookings.guest.create', 'Create booking')}
          onPress={submit}
          loading={createGuest.isPending}
          fullWidth
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { maxHeight: 480 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.md },
  labelText: { marginBottom: spacing.sm, marginTop: spacing.sm },
  segmentRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  segment: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md, alignItems: 'center' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  weeklyFields: { marginBottom: spacing.xs },
  timeRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  timeInput: { flex: 1 },
});
