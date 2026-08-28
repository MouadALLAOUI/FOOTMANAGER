import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Ban,
  CalendarDays,
  Check,
  Clock,
  Mail,
  Phone,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react-native';

import { getApiErrorMessage } from '@/api/errors';
import { type OwnerBooking, useOwnerCalendar, useOwnerManageBooking } from '@/api/ownerBookings';
import { useOwnerTerrains } from '@/api/ownerTerrains';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { sizes, spacing } from '@/theme/spacing';

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }): React.JSX.Element {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>{icon}</View>
      <View style={styles.infoText}>
        <AppText variant="caption" muted>
          {label}
        </AppText>
        <AppText variant="body">{value || '—'}</AppText>
      </View>
    </View>
  );
}

export default function BookingActionScreen(): React.JSX.Element {
  const { id, terrainId } = useLocalSearchParams<{ id: string; terrainId?: string }>();
  const { t, formatDate } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();

  const bookingId = Array.isArray(id) ? id[0] : id;

  const terrainsQuery = useOwnerTerrains();
  const terrains = terrainsQuery.data?.terrains ?? [];
  const resolvedTerrainId = (Array.isArray(terrainId) ? terrainId[0] : terrainId) ?? terrains[0]?.id;

  const calendarQuery = useOwnerCalendar(resolvedTerrainId);
  const booking: OwnerBooking | undefined = calendarQuery.data?.pending_bookings.find(
    (b) => String(b.id) === String(bookingId),
  );

  const manage = useOwnerManageBooking();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [done, setDone] = useState(false);

  const runAction = (status: 'approved' | 'rejected' | 'cancelled', close: () => void): void => {
    if (!bookingId) return;
    close();
    manage.mutate(
      { id: bookingId, status },
      {
        onSuccess: (data) => {
          setDone(true);
          const message = data?.message ?? '';
          toast.show(message || t('bookings.action.done', 'Booking updated'), 'success');
        },
        onError: (err) => {
          toast.show(getApiErrorMessage(err, t('bookings.action.failed', 'Action failed')), 'error');
        },
      },
    );
  };

  const isLoading = terrainsQuery.isLoading || calendarQuery.isLoading || (resolvedTerrainId == null && !terrains.length);

  if (isLoading) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('booking.detail', 'Booking details')} showBack />
        <View style={styles.content}>
          <Skeleton height={140} radiusValue={16} />
          <Skeleton height={160} radiusValue={16} />
          <Skeleton height={80} radiusValue={16} />
        </View>
      </Screen>
    );
  }

  if (!booking) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('booking.detail', 'Booking details')} showBack />
        <ErrorState
          message={calendarQuery.error ? getApiErrorMessage(calendarQuery.error, t('bookings.loadFailed', 'Could not load booking')) : t('booking.notFound', 'Booking not found')}
          onRetry={() => void calendarQuery.refetch()}
        />
      </Screen>
    );
  }

  const customerName = booking.is_guest
    ? (booking.guest_name ?? t('bookings.guestLabel', 'Guest'))
    : (booking.manager?.name ?? booking.team?.name ?? t('bookings.unknownGuest', 'Guest'));
  const contact = booking.is_guest
    ? booking.guest_phone
    : (booking.manager?.phone ?? booking.guest_phone ?? null);
  const email = booking.is_guest ? booking.guest_email : null;

  const customerLabel = booking.is_guest ? t('bookings.guestLabel', 'Guest') : t('bookings.customerLabel', 'Customer');

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('booking.detail', 'Booking details')} showBack />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <AppText variant="h3" style={styles.cardTitle}>
            {customerLabel}
          </AppText>
          <InfoRow icon={<User size={sizes.iconMd} color={colors.primary} />} label={customerLabel} value={customerName} />
          {booking.team?.name ? (
            <InfoRow icon={<Users size={sizes.iconMd} color={colors.primary} />} label={t('bookings.team', 'Team')} value={booking.team.name} />
          ) : null}
          {contact ? (
            <InfoRow icon={<Phone size={sizes.iconMd} color={colors.primary} />} label={t('bookings.contact', 'Contact')} value={contact} />
          ) : null}
          {email ? (
            <InfoRow icon={<Mail size={sizes.iconMd} color={colors.primary} />} label={t('bookings.email', 'Email')} value={email} />
          ) : null}
        </Card>

        <Card style={styles.card}>
          <AppText variant="h3" style={styles.cardTitle}>
            {t('bookings.details', 'Booking details')}
          </AppText>
          <InfoRow
            icon={<CalendarDays size={sizes.iconMd} color={colors.primary} />}
            label={t('bookings.date', 'Date')}
            value={booking.booking_date ? formatDate(booking.booking_date, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
          />
          <InfoRow
            icon={<Clock size={sizes.iconMd} color={colors.primary} />}
            label={t('bookings.hours', 'Reserved hours')}
            value={`${booking.start_time ?? ''} – ${booking.end_time ?? ''}`}
          />
          <InfoRow
            icon={<ShieldCheck size={sizes.iconMd} color={colors.primary} />}
            label={t('bookings.type', 'Match type')}
            value={booking.booking_type ? t(`bookings.type.${booking.booking_type}`, booking.booking_type) : '—'}
          />
          <InfoRow
            icon={<Ban size={sizes.iconMd} color={colors.primary} />}
            label={t('bookings.reservationType', 'Reservation')}
            value={booking.reservation_type
              ? t(`bookings.reservation.${booking.reservation_type}`, booking.reservation_type)
              : '—'}
          />
        </Card>

        <Card style={styles.card}>
          <View style={styles.priceRow}>
            <View style={styles.priceText}>
              <AppText variant="caption" muted>
                {t('bookings.total', 'Total price')}
              </AppText>
              <AppText variant="h2">{booking.price != null ? `${booking.price}` : '—'}</AppText>
            </View>
          </View>
        </Card>

        {booking.notes ? (
          <Card style={styles.card}>
            <AppText variant="caption" muted>
              {t('bookings.notes', 'Notes')}
            </AppText>
            <AppText variant="body">{booking.notes}</AppText>
          </Card>
        ) : null}

        {done ? (
          <Card style={styles.card}>
            <AppText variant="bodyBold" muted align="center">
              {t('bookings.action.doneMsg', 'This reservation has been handled.')}
            </AppText>
            <Button
              title={t('common.back', 'Back')}
              variant="outline"
              onPress={() => router.back()}
              style={{ marginTop: spacing.md }}
            />
          </Card>
        ) : (
          <View style={styles.actions}>
            <Button
              title={t('bookings.action.approve', 'Approve')}
              leftIcon={<Check size={sizes.iconMd} color={colors.textOnPrimary} />}
              onPress={() => runAction('approved', () => {})}
              loading={manage.isPending}
              fullWidth
            />
            <Button
              title={t('bookings.action.reject', 'Reject')}
              variant="danger"
              leftIcon={<Ban size={sizes.iconMd} color={colors.textOnPrimary} />}
              onPress={() => setRejectOpen(true)}
              loading={false}
              fullWidth
            />
            <Button
              title={t('bookings.action.cancel', 'Cancel booking')}
              variant="outline"
              onPress={() => setCancelOpen(true)}
              fullWidth
            />
          </View>
        )}
      </ScrollView>

      <ConfirmationDialog
        visible={rejectOpen}
        title={t('bookings.action.rejectTitle', 'Reject this booking?')}
        description={t('bookings.action.rejectDesc', 'The customer will be notified that the reservation was rejected.')}
        confirmLabel={t('bookings.action.reject', 'Reject')}
        cancelLabel={t('common.cancel', 'Cancel')}
        destructive
        loading={manage.isPending}
        onConfirm={() => runAction('rejected', () => setRejectOpen(false))}
        onCancel={() => setRejectOpen(false)}
      />

      <ConfirmationDialog
        visible={cancelOpen}
        title={t('bookings.action.cancelTitle', 'Cancel this booking?')}
        description={t('bookings.action.cancelDesc', 'The reservation will be cancelled and the slot becomes available.')}
        confirmLabel={t('bookings.action.cancel', 'Cancel booking')}
        cancelLabel={t('common.cancel', 'Cancel')}
        destructive
        loading={manage.isPending}
        onConfirm={() => runAction('cancelled', () => setCancelOpen(false))}
        onCancel={() => setCancelOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing['4xl'], gap: spacing.md },
  cardTitle: { marginBottom: spacing.sm },
  card: { alignSelf: 'stretch' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, paddingVertical: spacing.sm },
  infoIcon: { width: 28, alignItems: 'center', justifyContent: 'center' },
  infoText: { flex: 1, gap: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center' },
  priceText: { flex: 1, gap: 2 },
  actions: { gap: spacing.md, marginTop: spacing.sm, paddingBottom: spacing.xl },
});
