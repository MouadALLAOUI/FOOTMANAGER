import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { CalendarX2, Clock, MapPin, Wallet } from 'lucide-react-native';

import {
  useCancelPlayerBooking,
  usePlayerBookingDetail,
  type PlayerBookingDetail,
} from '@/api/bookings';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';

function StatusBadge({ status }: { status?: string | null }): React.JSX.Element {
  const { colors } = useTheme();
  const { t } = useI18n();
  const key = status ?? 'unknown';
  let bg = colors.bgMuted;
  let fg = colors.textMuted;
  if (key === 'confirmed' || key === 'approved') {
    bg = colors.primary;
    fg = colors.textOnPrimary;
  } else if (key === 'pending') {
    bg = colors.amber;
    fg = '#ffffff';
  }
  return (
    <View style={[styles.statusBadge, { backgroundColor: bg }]}>
      <AppText variant="captionBold" color={fg}>
        {t(`player.bookings.status.${key}`, key)}
      </AppText>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string | null;
}): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.detailRow}>
      <View style={[styles.detailIcon, { backgroundColor: colors.bgMuted }]}>{icon}</View>
      <View style={styles.detailText}>
        <AppText variant="caption" muted>
          {label}
        </AppText>
        <AppText variant="bodyBold">{value || '—'}</AppText>
      </View>
    </View>
  );
}

function DetailSkeleton(): React.JSX.Element {
  return (
    <View style={styles.content}>
      <Skeleton height={120} radiusValue={radius.lg} />
      <Skeleton height={180} radiusValue={radius.lg} />
      <Skeleton height={120} radiusValue={radius.lg} />
    </View>
  );
}

export default function PlayerBookingDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = usePlayerBookingDetail(id);
  const cancelMutation = useCancelPlayerBooking();

  const booking: PlayerBookingDetail | undefined = data?.data;

  const handleCancel = useCallback(() => {
    cancelMutation.mutate(
      { id },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          toast.show(t('player.bookings.cancelled', 'تم إلغاء الحجز'), 'info');
        },
        onError: () => {
          setConfirmOpen(false);
          toast.show(t('player.bookings.cancelFailed', 'تعذر إلغاء الحجز'), 'error');
        },
      },
    );
  }, [cancelMutation, id, toast, t]);

  if (isLoading) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('booking.detail', 'تفاصيل الحجز')} showBack />
        <DetailSkeleton />
      </Screen>
    );
  }

  if (isError || !booking) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('booking.detail', 'تفاصيل الحجز')} showBack />
        {error ? <ErrorState error={error} onRetry={() => void refetch()} /> : <EmptyState icon="📅" />}
      </Screen>
    );
  }

  const stadiumName = booking.stadium?.name;
  const surface = booking.stadium?.type;
  const city = booking.stadium?.city;
  const teamName = booking.team?.name;
  const ownerName = booking.owner?.name;

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('booking.detail', 'تفاصيل الحجز')} showBack />

      <View style={styles.content}>
        <Card elevated>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <AppText variant="h3" numberOfLines={2}>
                {teamName ?? stadiumName ?? t('player.bookings.booking', 'حجز')}
              </AppText>
              <AppText variant="caption" muted>
                {booking.booking_reference ?? ''}
              </AppText>
            </View>
            <StatusBadge status={booking.status} />
          </View>
        </Card>

        <Card>
          <AppText variant="label" style={{ color: colors.textMuted }}>
            {t('player.bookings.venueTitle', 'الملعب')}
          </AppText>
          <DetailRow
            icon={<MapPin size={18} color={colors.primary} />}
            label={t('player.bookings.stadiumName', 'اسم الملعب')}
            value={stadiumName}
          />
          <DetailRow
            icon={<MapPin size={18} color={colors.primary} />}
            label={t('player.bookings.surface', 'نوع الأرضية')}
            value={surface}
          />
          <DetailRow
            icon={<MapPin size={18} color={colors.primary} />}
            label={t('player.bookings.city', 'المدينة')}
            value={city}
          />
        </Card>

        <Card>
          <AppText variant="label" style={{ color: colors.textMuted }}>
            {t('player.bookings.slotTitle', 'الموعد')}
          </AppText>
          <DetailRow
            icon={<CalendarX2 size={18} color={colors.primary} />}
            label={t('player.bookings.date', 'التاريخ')}
            value={booking.booking_date}
          />
          <DetailRow
            icon={<Clock size={18} color={colors.primary} />}
            label={t('player.bookings.time', 'الوقت')}
            value={
              booking.start_time
                ? booking.end_time
                  ? `${booking.start_time} - ${booking.end_time}`
                  : booking.start_time
                : undefined
            }
          />
          {typeof booking.duration_minutes === 'number' ? (
            <DetailRow
              icon={<Clock size={18} color={colors.primary} />}
              label={t('player.bookings.duration', 'المدة')}
              value={`${booking.duration_minutes} ${t('player.bookings.minutes', 'دقيقة')}`}
            />
          ) : null}
          {ownerName ? (
            <DetailRow
              icon={<MapPin size={18} color={colors.primary} />}
              label={t('player.bookings.owner', 'الجهة المالكة')}
              value={ownerName}
            />
          ) : null}
        </Card>

        <Card>
          <AppText variant="label" style={{ color: colors.textMuted }}>
            {t('player.bookings.priceTitle', 'التكلفة')}
          </AppText>
          <DetailRow
            icon={<Wallet size={18} color={colors.primary} />}
            label={t('player.bookings.total', 'الإجمالي')}
            value={typeof booking.total === 'number' ? `${booking.total}` : undefined}
          />
          {typeof booking.subtotal === 'number' ? (
            <DetailRow
              icon={<Wallet size={18} color={colors.primary} />}
              label={t('player.bookings.subtotal', 'المجموع الفرعي')}
              value={`${booking.subtotal}`}
            />
          ) : null}
          {typeof booking.service_fee === 'number' ? (
            <DetailRow
              icon={<Wallet size={18} color={colors.primary} />}
              label={t('player.bookings.serviceFee', 'رسوم الخدمة')}
              value={`${booking.service_fee}`}
            />
          ) : null}
          {booking.payment_status ? (
            <DetailRow
              icon={<Wallet size={18} color={colors.primary} />}
              label={t('player.bookings.payment', 'حالة الدفع')}
              value={t(`player.bookings.paymentStatus.${booking.payment_status}`, booking.payment_status)}
            />
          ) : null}
        </Card>

        {booking.can_cancel ? (
          <Button
            title={t('player.bookings.cancelAction', 'إلغاء الحجز')}
            variant="danger"
            size="lg"
            fullWidth
            loading={cancelMutation.isPending}
            onPress={() => setConfirmOpen(true)}
          />
        ) : null}
      </View>

      <ConfirmationDialog
        visible={confirmOpen}
        title={t('player.bookings.cancelTitle', 'إلغاء الحجز؟')}
        description={t('player.bookings.cancelDesc', 'هل تريد تأكيد إلغاء هذا الحجز؟')}
        confirmLabel={t('player.bookings.cancelConfirm', 'تأكيد الإلغاء')}
        cancelLabel={t('common.back', 'رجوع')}
        destructive
        loading={cancelMutation.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={handleCancel}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing['3xl'], gap: spacing.lg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerText: { flex: 1, gap: 2 },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: { flex: 1, gap: 1 },
});
