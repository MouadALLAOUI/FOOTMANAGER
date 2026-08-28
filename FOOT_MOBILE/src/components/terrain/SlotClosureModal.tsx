import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { CalendarX2 } from 'lucide-react-native';

import { getApiErrorMessage } from '@/api/errors';
import { useCreateSlotClosure } from '@/api/ownerBookings';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, sizes, spacing } from '@/theme/spacing';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

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
  onClose: () => void;
}

export function SlotClosureModal({
  visible,
  terrainId,
  weekDays,
  defaultDate,
  defaultStart,
  onClose,
}: Props): React.JSX.Element | null {
  const { t } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();
  const createClosure = useCreateSlotClosure();

  const initialDate = useMemo(() => {
    if (defaultDate && weekDays.some((d) => d.date === defaultDate)) return defaultDate;
    return weekDays[0]?.date ?? '';
  }, [defaultDate, weekDays]);

  const [date, setDate] = useState(initialDate);
  const [start, setStart] = useState(defaultStart ?? '');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');

  const submit = (): void => {
    if (!date) {
      toast.show(t('bookings.closure.needDate', 'Choose a date'), 'error');
      return;
    }
    if (!TIME_RE.test(start) || !TIME_RE.test(end)) {
      toast.show(t('bookings.closure.invalidTime', 'Enter valid HH:MM times'), 'error');
      return;
    }
    if (end <= start) {
      toast.show(t('bookings.closure.endAfterStart', 'End time must be after start time'), 'error');
      return;
    }
    createClosure.mutate(
      { terrainId, payload: { closure_date: date, start_time: start, end_time: end, reason: reason.trim() || undefined } },
      {
        onSuccess: (data) => {
          onClose();
          toast.show(data.message || t('bookings.closure.saved', 'Slot closed'), 'success');
        },
        onError: (err) => {
          toast.show(getApiErrorMessage(err, t('bookings.closure.saveFailed', 'Could not close slot')), 'error');
        },
      },
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} onClose={onClose} title={t('bookings.closureTitle', 'Block a slot')}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
        <View style={styles.row}>
          <CalendarX2 size={sizes.iconMd} color={colors.primary} />
          <AppText variant="caption" muted>
            {t('bookings.closure.hint', 'Block a time slot for maintenance or events. Active bookings in that window block saving.')}
          </AppText>
        </View>

        <AppText variant="bodyBold" style={styles.labelText}>
          {t('bookings.closure.date', 'Date')}
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
                  {
                    backgroundColor: selected ? colors.primary : colors.bgMuted,
                    borderColor: selected ? colors.primary : colors.border,
                  },
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

        <View style={styles.timeRow}>
          <Input
            label={t('bookings.closure.start', 'Start')}
            placeholder="18:00"
            value={start}
            onChangeText={setStart}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            containerStyle={styles.timeInput}
          />
          <Input
            label={t('bookings.closure.end', 'End')}
            placeholder="20:00"
            value={end}
            onChangeText={setEnd}
            keyboardType="numbers-and-punctuation"
            maxLength={5}
            containerStyle={styles.timeInput}
          />
        </View>

        <Input
          label={t('bookings.closure.reason', 'Reason (optional)')}
          placeholder={t('bookings.closure.reasonPlaceholder', 'Maintenance, private event…')}
          value={reason}
          onChangeText={setReason}
          containerStyle={{ marginTop: spacing.md }}
        />

        <Button
          title={t('bookings.closure.save', 'Block slot')}
          onPress={submit}
          loading={createClosure.isPending}
          fullWidth
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  body: { maxHeight: 460 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, marginBottom: spacing.md },
  labelText: { marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  timeRow: { flexDirection: 'row', gap: spacing.md },
  timeInput: { flex: 1 },
});
