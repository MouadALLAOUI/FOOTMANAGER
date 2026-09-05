import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarDays, Clock, MapPin } from 'lucide-react-native';

import {
  useCreateManagerBooking,
  useTerrainCatalog,
  useTerrainSlots,
} from '@/api/managerBookings';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Loading } from '@/components/ui/Loading';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radius, spacing } from '@/theme/spacing';

const DAY_COUNT = 14;

export default function TerrainBookScreen(): React.JSX.Element {
  const { t, locale, formatDate } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const terrainId = id ? Number(id) : undefined;

  const catalog = useTerrainCatalog();
  const stadium = useMemo(
    () => catalog.data?.stadiums.find((s) => s.id === terrainId) ?? null,
    [catalog.data, terrainId],
  );

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    return d.toISOString().slice(0, 10);
  });
  const [selectedSlot, setSelectedSlot] = useState<{ start: string; end: string } | null>(null);
  const [notes, setNotes] = useState('');

  const days = useMemo(() => {
    const list: { label: string; iso: string }[] = [];
    const today = new Date();
    for (let i = 0; i < DAY_COUNT; i += 1) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      d.setHours(12, 0, 0, 0);
      list.push({
        label: formatDate(d.toISOString(), { weekday: 'short', day: 'numeric', month: 'short' }),
        iso: d.toISOString().slice(0, 10),
      });
    }
    return list;
  }, [locale, formatDate]);

  const slotsQuery = useTerrainSlots(terrainId, selectedDate);
  const slotsResponse = slotsQuery.data;
  const availableSlots = (slotsResponse?.slots ?? []).filter((s) => s.status === 'available');
  const terrainClosed = Boolean(slotsResponse?.terrain_closed);

  const createBooking = useCreateManagerBooking();

  const pricePerHour = stadium?.price_per_hour ?? stadium?.price_per_team ?? null;
  const total = useMemo(() => {
    if (pricePerHour == null || !selectedSlot) return null;
    const [sh, sm] = selectedSlot.start.split(':').map(Number);
    const [eh, em] = selectedSlot.end.split(':').map(Number);
    const hours = (eh * 60 + em - (sh * 60 + sm)) / 60;
    return hours > 0 ? Math.round(hours * pricePerHour) : null;
  }, [pricePerHour, selectedSlot]);

  const pickSlot = (slot: { start: string; end: string }): void => {
    setSelectedSlot(slot);
  };

  const confirmBooking = (): void => {
    if (!terrainId || !selectedSlot) return;
    createBooking.mutate(
      {
        terrain_id: terrainId,
        booking_date: selectedDate,
        start_time: selectedSlot.start,
        end_time: selectedSlot.end,
        booking_type: 'training',
        notes: notes.trim() || undefined,
      },
      {
        onSuccess: () => {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
          toast.show(t('terrain.bookSuccess'), 'success');
          router.replace('/(manager)/bookings' as never);
        },
        onError: (error) => {
          const message =
            (error as { message?: string })?.message || t('terrain.bookError');
          toast.show(message, 'error');
        },
      },
    );
  };

  return (
    <Screen padded={false}>
      <ScreenHeader
        title={stadium?.name ?? t('terrain.book')}
        subtitle={t('terrain.bookSubtitle')}
        showBack
      />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {stadium ? (
            <View style={styles.metaBlock}>
              {stadium.city ? (
                <View style={styles.metaRow}>
                  <MapPin size={14} color={colors.textMuted} />
                  <AppText variant="caption" muted>
                    {stadium.city}
                  </AppText>
                </View>
              ) : null}
              {stadium.player_format ? (
                <Badge label={stadium.player_format} variant="info" />
              ) : null}
              {pricePerHour != null ? (
                <View style={styles.metaRow}>
                  <Clock size={14} color={colors.textMuted} />
                  <AppText variant="caption" muted>
                    {pricePerHour} {t('terrain.mad')} · {t('terrain.priceHour')}
                  </AppText>
                </View>
              ) : null}
            </View>
          ) : null}

          <View style={styles.sectionRow}>
            <CalendarDays size={16} color={colors.textMuted} />
            <AppText variant="captionBold">{t('terrain.pickDate')}</AppText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daysRow}>
            {days.map((d) => {
              const active = d.iso === selectedDate;
              return (
                <Pressable
                  key={d.iso}
                  onPress={() => {
                    setSelectedDate(d.iso);
                    setSelectedSlot(null);
                  }}
                  style={[
                    styles.dayChip,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    active && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <AppText
                    variant="captionBold"
                    color={active ? colors.textOnPrimary : colors.textMuted}
                  >
                    {d.label}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.sectionRow}>
            <Clock size={16} color={colors.textMuted} />
            <AppText variant="captionBold">{t('terrain.pickTime')}</AppText>
          </View>

          {slotsQuery.isLoading ? (
            <View style={styles.slotGrid}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} style={styles.slotSkeleton} />
              ))}
            </View>
          ) : terrainClosed ? (
            <EmptyState
              icon="⛔"
              title={t('terrain.closed')}
              description={slotsResponse?.closure_reason ?? slotsResponse?.message ?? undefined}
            />
          ) : availableSlots.length === 0 ? (
            <EmptyState
              icon="🕒"
              title={t('terrain.noSlots')}
              description={t('terrain.tryAnotherDay')}
            />
          ) : (
            <View style={styles.slotGrid}>
              {availableSlots.map((slot) => {
                const active = selectedSlot?.start === slot.start;
                return (
                  <Pressable
                    key={slot.start}
                    onPress={() => pickSlot(slot)}
                    style={[
                      styles.slotChip,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      active && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={slot.start}
                  >
                    <AppText
                      variant="captionBold"
                      color={active ? colors.textOnPrimary : colors.text}
                    >
                      {slot.start}
                    </AppText>
                    <AppText
                      variant="small"
                      subtle
                      color={active ? colors.textOnPrimary : colors.textSubtle}
                    >
                      {slot.end}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          )}

          {selectedSlot ? (
            <View style={styles.notesWrap}>
              <Input
                label={t('terrain.notes')}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('terrain.notesPlaceholder')}
                multiline
              />
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.bg, borderTopColor: colors.border }]}>
        <View style={styles.flex}>
          {total != null ? (
            <>
              <AppText variant="caption" muted>
                {t('terrain.total')}
              </AppText>
              <AppText variant="bodyBold" color={colors.primary}>
                {total} {t('terrain.mad')}
              </AppText>
            </>
          ) : (
            <AppText variant="caption" muted>
              {t('terrain.pickTimeHint')}
            </AppText>
          )}
        </View>
        <Button
          title={t('terrain.confirmBook')}
          size="lg"
          disabled={!selectedSlot}
          loading={createBooking.isPending}
          onPress={confirmBooking}
          style={styles.footerButton}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },
  metaBlock: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  daysRow: {
    flexGrow: 0,
  },
  dayChip: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  slotChip: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 88,
    alignItems: 'center',
  },
  slotSkeleton: {
    width: 88,
    height: 44,
    borderRadius: radius.md,
  },
  notesWrap: {
    marginTop: spacing.sm,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    start: 0,
    end: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: layout.screenPadding,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
  },
  footerButton: {
    minWidth: 150,
  },
  flex: {
    flex: 1,
  },
});
