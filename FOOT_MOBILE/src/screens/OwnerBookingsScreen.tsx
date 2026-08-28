import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ban, CalendarDays, ChevronLeft, ChevronRight, MapPin, UserPlus } from 'lucide-react-native';

import { getApiErrorMessage } from '@/api/errors';
import {
  type OwnerBooking,
  type OwnerCalendarSlot,
  useDeleteSlotClosure,
  useOwnerCalendar,
} from '@/api/ownerBookings';
import { useOwnerTerrains } from '@/api/ownerTerrains';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { List } from '@/components/ui/List';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { GuestBookingModal } from '@/components/terrain/GuestBookingModal';
import { SlotClosureModal, type WeekDayOption } from '@/components/terrain/SlotClosureModal';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, sizes, spacing } from '@/theme/spacing';

function addDays(dateStr: string, delta: number): string {
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + delta);
  return localDateStr(d);
}

function localDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayStr(): string {
  return localDateStr(new Date());
}

export default function OwnerBookingsScreen(): React.JSX.Element {
  const { t, formatDate } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();

  const terrainsQuery = useOwnerTerrains();
  const terrains = terrainsQuery.data?.terrains ?? [];

  const [terrainId, setTerrainId] = useState<string | number | undefined>(terrains[0]?.id);
  const [anchor, setAnchor] = useState<string>(todayStr());
  const [selectedDate, setSelectedDate] = useState<string>(anchor);
  const [closureOpen, setClosureOpen] = useState(false);
  const [guestOpen, setGuestOpen] = useState(false);
  const [prefill, setPrefill] = useState<{ start?: string; end?: string }>({});
  const [deleteClosure, setDeleteClosure] = useState<{ date: string; closureId: number } | null>(null);

  const activeTerrainId = terrainId ?? terrains[0]?.id;
  const calendarQuery = useOwnerCalendar(activeTerrainId, anchor);
  const deleteClosureMutation = useDeleteSlotClosure();

  const days = useMemo(() => calendarQuery.data?.days ?? [], [calendarQuery.data]);
  const pendingBookings = useMemo(() => calendarQuery.data?.pending_bookings ?? [], [calendarQuery.data]);
  const activeTerrain = terrains.find((t) => String(t.id) === String(activeTerrainId));

  const weekDays: WeekDayOption[] = useMemo(
    () =>
      days.map((d) => ({
        date: d.date,
        label: `${d.day_name ?? ''}`,
      })),
    [days],
  );

  const selectedDayData = days.find((d) => d.date === selectedDate) ?? days[0];
  const effectiveDate = selectedDayData?.date ?? selectedDate;

  const isBusy = deleteClosureMutation.isPending;

  const goToWeek = (delta: number): void => {
    const next = addDays(anchor, delta * 7);
    setAnchor(next);
    setSelectedDate(next);
  };

  const slotColor = (slot: OwnerCalendarSlot): { bg: string; fg: string; label: string } => {
    if (slot.status === 'closed') {
      return { bg: colors.bgMuted, fg: colors.textMuted, label: t('bookings.slot.closed', 'Blocked') };
    }
    if (slot.booking?.status === 'pending') {
      return { bg: colors.amber, fg: colors.textOnPrimary, label: t('bookings.slot.pending', 'Pending') };
    }
    if (slot.status === 'booked' || slot.booking) {
      return { bg: colors.primary, fg: colors.textOnPrimary, label: t('bookings.slot.booked', 'Booked') };
    }
    return { bg: colors.surface, fg: colors.textMuted, label: t('bookings.slot.available', 'Available') };
  };

  const onSlotPress = (slot: OwnerCalendarSlot): void => {
    if (slot.booking?.id != null) {
      router.push({
        pathname: '/(terrain)/bookings/[id]',
        params: { id: String(slot.booking.id), terrainId: String(activeTerrainId), date: effectiveDate },
      });
      return;
    }
    if (slot.closure?.id != null) {
      setDeleteClosure({ date: effectiveDate, closureId: slot.closure.id });
      return;
    }
    setPrefill({ start: slot.start, end: slot.end });
    setGuestOpen(true);
  };

  const confirmDeleteClosure = (): void => {
    if (!deleteClosure) return;
    const { closureId } = deleteClosure;
    deleteClosureMutation.mutate(
      { terrainId: activeTerrainId as number | string, closureId },
      {
        onSuccess: (data) => {
          toast.show(data.message || t('bookings.closure.deleted', 'Closure removed'), 'success');
          setDeleteClosure(null);
        },
        onError: (err) => {
          toast.show(getApiErrorMessage(err, t('bookings.closure.deleteFailed', 'Could not remove closure')), 'error');
          setDeleteClosure(null);
        },
      },
    );
  };

  const openClosure = (): void => {
    setPrefill({});
    setClosureOpen(true);
  };

  const openGuest = (): void => {
    setPrefill({});
    setGuestOpen(true);
  };

  const renderSlot = (slot: OwnerCalendarSlot): React.JSX.Element => {
    const palette = slotColor(slot);
    const booking = slot.booking;
    const who = slot.status === 'closed' ? (slot.closure?.reason ?? t('bookings.closedLabel', 'Closed')) : booking?.is_guest ? (booking.guest_name ?? t('bookings.guestLabel', 'Guest')) : booking?.manager?.name ?? booking?.team?.name ?? t('bookings.unknownGuest', 'Guest');
    return (
      <Pressable
        key={`${slot.start}-${slot.end}`}
        onPress={() => onSlotPress(slot)}
        style={[styles.slotRow, { borderColor: colors.border }]}
        accessibilityRole="button"
      >
        <View style={[styles.slotTime, { backgroundColor: colors.bgMuted }]}>
          <AppText variant="small" style={{ color: colors.text }}>
            {slot.start}
          </AppText>
          <AppText variant="small" subtle>
            {slot.end}
          </AppText>
        </View>
        <View style={[styles.slotBadge, { backgroundColor: palette.bg }]}>
          <AppText variant="small" style={{ color: palette.fg }}>
            {palette.label}
          </AppText>
        </View>
        <View style={styles.slotInfo}>
          <AppText variant="bodyBold" numberOfLines={1}>
            {who}
          </AppText>
          <AppText variant="caption" muted numberOfLines={1}>
            {booking?.booking_type ? t(`bookings.type.${booking.booking_type}`, booking.booking_type) : t('bookings.slot.available', 'Available')}
          </AppText>
        </View>
      </Pressable>
    );
  };

  if (terrainsQuery.isLoading) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('bookings.title', 'Schedule')} />
        <View style={styles.content}>
          <Skeleton height={64} radiusValue={radius.md} />
          <Skeleton height={300} radiusValue={radius.lg} />
        </View>
      </Screen>
    );
  }

  if (!terrains.length) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('bookings.title', 'Schedule')} />
        <ErrorState
          message={terrainsQuery.error ? getApiErrorMessage(terrainsQuery.error, t('bookings.loadFailed', 'Could not load calendar')) : t('bookings.noTerrain', 'Add a field to manage its schedule')}
          onRetry={() => void terrainsQuery.refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('bookings.title', 'Schedule')} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Terrain selector */}
        {terrains.length > 1 ? (
          <View style={styles.terrainRow}>
            {terrains.map((tItem) => {
              const selected = String(tItem.id) === String(activeTerrainId);
              return (
                <Pressable
                  key={tItem.id}
                  onPress={() => {
                    setTerrainId(tItem.id);
                    setAnchor(todayStr());
                    setSelectedDate(todayStr());
                  }}
                  style={[styles.terrainChip, { backgroundColor: selected ? colors.primary : colors.surface, borderColor: selected ? colors.primary : colors.border }]}
                  accessibilityRole="button"
                >
                  <MapPin size={sizes.iconSm} color={selected ? colors.textOnPrimary : colors.textSubtle} />
                  <AppText variant="small" numberOfLines={1} style={{ color: selected ? colors.textOnPrimary : colors.text, flex: 1 }}>
                    {tItem.name ?? t('fields.field', 'Field')}
                  </AppText>
                </Pressable>
              );
            })}
          </View>
        ) : activeTerrain ? (
          <View style={[styles.terrainHeader, { borderColor: colors.border }]}>
            <MapPin size={sizes.iconMd} color={colors.primary} />
            <AppText variant="bodyBold" numberOfLines={1} style={{ flex: 1 }}>
              {activeTerrain.name ?? t('bookings.title', 'Schedule')}
            </AppText>
          </View>
        ) : null}

        {calendarQuery.isLoading && !calendarQuery.data ? (
          <View style={styles.skeletons}>
            <Skeleton height={64} radiusValue={radius.md} />
            <Skeleton height={120} radiusValue={radius.md} />
            <Skeleton height={300} radiusValue={radius.lg} />
          </View>
        ) : calendarQuery.isError ? (
          <ErrorState
            message={calendarQuery.error ? getApiErrorMessage(calendarQuery.error, t('bookings.loadFailed', 'Could not load calendar')) : undefined}
            onRetry={() => void calendarQuery.refetch()}
          />
        ) : (
          <>
            {/* Week navigation + date strip */}
            <Card>
              <View style={styles.weekNav}>
                <Pressable onPress={() => goToWeek(-1)} style={styles.weekArrow} accessibilityRole="button" accessibilityLabel={t('common.prev', 'Previous week')}>
                  <ChevronLeft size={sizes.iconMd} color={colors.text} />
                </Pressable>
                <View style={styles.weekLabel}>
                  <CalendarDays size={sizes.iconMd} color={colors.primary} />
                  <AppText variant="bodyBold">
                    {formatDate(weekDays[0]?.date ?? '', { month: 'short', day: 'numeric' })}
                    {' â€“ '}
                    {formatDate(weekDays[weekDays.length - 1]?.date ?? '', { month: 'short', day: 'numeric' })}
                  </AppText>
                </View>
                <Pressable onPress={() => goToWeek(1)} style={styles.weekArrow} accessibilityRole="button" accessibilityLabel={t('common.next', 'Next week')}>
                  <ChevronRight size={sizes.iconMd} color={colors.text} />
                </Pressable>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateStrip}>
                {weekDays.map((d) => {
                  const selected = d.date === effectiveDate;
                  return (
                    <Pressable
                      key={d.date}
                      onPress={() => setSelectedDate(d.date)}
                      style={[styles.dateChip, { backgroundColor: selected ? colors.primary : colors.bgMuted }]}
                      accessibilityRole="button"
                      accessibilityLabel={d.label}
                    >
                      <AppText variant="small" style={{ color: selected ? colors.textOnPrimary : colors.text }}>
                        {d.label}
                      </AppText>
                      <AppText variant="caption" style={{ color: selected ? colors.textOnPrimary : colors.textSubtle }}>
                        {formatDate(d.date, { day: 'numeric' })}
                      </AppText>
                    </Pressable>
                  );
                })}
              </ScrollView>

              {/* Legend */}
              <View style={styles.legend}>
                <LegendDot color={colors.primary} label={t('bookings.legend.booked', 'Booked')} />
                <LegendDot color={colors.amber} label={t('bookings.legend.pending', 'Pending')} />
                <LegendDot color={colors.bgMuted} label={t('bookings.legend.blocked', 'Blocked')} />
                <LegendDot color={colors.surface} label={t('bookings.legend.available', 'Available')} />
              </View>
            </Card>

            {/* Actions */}
            <View style={styles.actionRow}>
              <Button
                title={t('bookings.blockSlot', 'Block slot')}
                variant="outline"
                leftIcon={<Ban size={sizes.iconMd} color={colors.primary} />}
                style={styles.actionBtn}
                onPress={openClosure}
              />
              <Button
                title={t('bookings.guestBtn', 'Add guest')}
                leftIcon={<UserPlus size={sizes.iconMd} color={colors.textOnPrimary} />}
                style={styles.actionBtn}
                onPress={openGuest}
              />
            </View>

            {/* Day timeline */}
            {selectedDayData && selectedDayData.is_open ? (
              selectedDayData.slots.length ? (
                <View style={styles.timeline}>
                  {selectedDayData.slots.map(renderSlot)}
                </View>
              ) : (
                <AppText variant="caption" muted style={styles.emptyHint}>
                  {t('bookings.noSlots', 'No slots for this day')}
                </AppText>
              )
            ) : (
              <AppText variant="caption" muted style={styles.emptyHint}>
                {t('bookings.dayClosed', 'Field is closed on this day')}
              </AppText>
            )}

            {/* Pending reservations */}
            <AppText variant="h3" style={styles.sectionTitle}>
              {t('bookings.pendingTitle', 'Reservation requests')}
            </AppText>
            {pendingBookings.length ? (
              <List
                data={pendingBookings}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }: { item: OwnerBooking }) => {
                  const who = item.is_guest ? (item.guest_name ?? t('bookings.guestLabel', 'Guest')) : (item.manager?.name ?? item.team?.name ?? t('bookings.unknownGuest', 'Guest'));
                  return (
                    <Card
                      title={who}
                      subtitle={`${item.start_time ?? ''} â€“ ${item.end_time ?? ''}`}
                      metadata={`${item.booking_type ? t(`bookings.type.${item.booking_type}`, item.booking_type) : ''}${item.booking_date ? ` Â· ${formatDate(item.booking_date, { day: 'numeric', month: 'short' })}` : ''}`}
                      statusLabel={t('bookings.slot.pending', 'Pending')}
                      statusVariant="warning"
                      onPress={() =>
                        router.push({
                          pathname: '/(terrain)/bookings/[id]',
                          params: { id: String(item.id), terrainId: String(activeTerrainId), date: effectiveDate },
                        })
                      }
                    />
                  );
                }}
                ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
                contentContainerStyle={styles.pendingList}
              />
            ) : (
              <AppText variant="caption" muted style={styles.emptyHint}>
                {t('bookings.noPending', 'No pending reservation requests')}
              </AppText>
            )}
          </>
        )}
      </ScrollView>

      <SlotClosureModal
        visible={closureOpen}
        terrainId={activeTerrainId as number | string}
        weekDays={weekDays}
        defaultDate={effectiveDate}
        defaultStart={prefill.start}
        onClose={() => setClosureOpen(false)}
      />

      <GuestBookingModal
        visible={guestOpen}
        terrainId={activeTerrainId as number | string}
        weekDays={weekDays}
        defaultDate={effectiveDate}
        defaultStart={prefill.start}
        defaultEnd={prefill.end}
        onClose={() => setGuestOpen(false)}
      />

      <ConfirmationDialog
        visible={deleteClosure != null}
        title={t('bookings.closure.deleteTitle', 'Remove this block?')}
        description={t('bookings.closure.deleteDesc', 'The time slot will become available again.')}
        confirmLabel={t('bookings.closure.delete', 'Remove')}
        cancelLabel={t('common.cancel', 'Cancel')}
        destructive
        loading={isBusy}
        onConfirm={confirmDeleteClosure}
        onCancel={() => setDeleteClosure(null)}
      />
    </Screen>
  );
}

function LegendDot({ color, label }: { color: string; label: string }): React.JSX.Element {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color, borderColor: color === '#ffffff' ? '#cbd5e1' : color }]} />
      <AppText variant="caption" muted>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing['4xl'], gap: spacing.md },
  skeletons: { gap: spacing.md },
  terrainRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  terrainChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: '48%',
  },
  terrainHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  weekNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  weekArrow: { padding: spacing.sm },
  weekLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dateStrip: { gap: spacing.sm, paddingVertical: spacing.xs },
  dateChip: {
    minWidth: 52,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    gap: 2,
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  actionRow: { flexDirection: 'row', gap: spacing.md },
  actionBtn: { flex: 1 },
  timeline: { gap: spacing.sm },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  slotTime: { borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, minWidth: 52, alignItems: 'center' },
  slotBadge: { borderRadius: radius.full, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, minWidth: 88, alignItems: 'center' },
  slotInfo: { flex: 1, gap: 1 },
  sectionTitle: { marginTop: spacing.md },
  emptyHint: { textAlign: 'center', paddingVertical: spacing.lg },
  pendingList: { padding: 0, paddingBottom: spacing.md },
});
