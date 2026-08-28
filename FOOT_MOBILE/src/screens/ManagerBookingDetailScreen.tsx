import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarDays, Clock, MapPin, Trophy, Wallet } from 'lucide-react-native';

import {
  useConvertBookingToMatch,
  useManagerBookingDetail,
} from '@/api/managerBookings';
import { getApiErrorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';

function statusVariant(status?: string | null): 'info' | 'success' | 'warning' | 'danger' | 'neutral' {
  switch (status) {
    case 'approved':
      return 'success';
    case 'pending':
      return 'warning';
    case 'completed':
      return 'info';
    case 'cancelled':
    case 'rejected':
      return 'danger';
    default:
      return 'neutral';
  }
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

export default function ManagerBookingDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, formatDate } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();

  const bookingId = Array.isArray(id) ? id[0] : id;
  const { booking, isLoading, isError, error, refetch } = useManagerBookingDetail(bookingId);
  const convertMutation = useConvertBookingToMatch();

  const [convertOpen, setConvertOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [needsPlayers, setNeedsPlayers] = useState(false);
  const [playersNeeded, setPlayersNeeded] = useState('');

  const isSubscription = booking?.reservation_type === 'weekly_subscription';
  const isConvertible = booking?.status === 'approved' && !booking.match_request_id;

  const allowConvert = useMemo(() => {
    if (!isConvertible) return false;
    if (needsPlayers && Number(playersNeeded) < 1) return false;
    return true;
  }, [isConvertible, needsPlayers, playersNeeded]);

  const handleOpenConvert = useCallback(() => {
    setNotes('');
    setNeedsPlayers(false);
    setPlayersNeeded('');
    setConvertOpen(true);
  }, []);

  const handleConvert = useCallback(() => {
    if (!booking) return;
    convertMutation.mutate(
      {
        id: booking.id,
        payload: {
          notes: notes || undefined,
          needs_players: needsPlayers,
          players_needed: needsPlayers ? Number(playersNeeded) || undefined : undefined,
        },
      },
      {
        onSuccess: (res) => {
          setConvertOpen(false);
          toast.show(res.message ?? t('managerBookings.converted', 'تم تحويل الحجز إلى مباراة'), 'success');
          void refetch();
        },
        onError: (err) => {
          toast.show(getApiErrorMessage(err, t('managerBookings.convertFailed', 'تعذر التحويل')), 'error');
        },
      },
    );
  }, [booking, convertMutation, notes, needsPlayers, playersNeeded, refetch, t, toast]);

  if (isLoading) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('booking.detail', 'تفاصيل الحجز')} showBack />
        <View style={styles.content}>
          <Skeleton height={150} radiusValue={radius.lg} />
          <Skeleton height={160} radiusValue={radius.lg} />
          <Skeleton height={90} radiusValue={radius.lg} />
        </View>
      </Screen>
    );
  }

  if (isError || !booking) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('booking.detail', 'تفاصيل الحجز')} showBack />
        <ErrorState
          message={error ? getApiErrorMessage(error, t('managerBookings.loadFailed', 'تعذر تحميل الحجز')) : undefined}
          onRetry={() => void refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('booking.detail', 'تفاصيل الحجز')} showBack />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.vsRow}>
            <AppText variant="h2" style={styles.flex} numberOfLines={2}>
              {booking.terrain?.name ?? t('managerBookings.unknownVenue', 'ملعب')}
            </AppText>
            <Badge label={t(`managerBookings.status.${booking.status ?? 'unknown'}`, booking.status ?? '')} variant={statusVariant(booking.status)} />
          </View>
          {booking.terrain?.city ? (
            <AppText variant="caption" muted>
              {booking.terrain.city}
            </AppText>
          ) : null}
          {booking.team?.name ? (
            <AppText variant="caption" muted>
              {t('managerBookings.team', 'الفريق: {{name}}').replace('{{name}}', booking.team.name)}
            </AppText>
          ) : null}
        </Card>

        <Card>
          <DetailRow
            icon={<CalendarDays size={18} color={colors.primary} />}
            label={t('managerBookings.date', 'التاريخ')}
            value={booking.booking_date ? formatDate(booking.booking_date) : (booking.next_date ? formatDate(booking.next_date) : undefined)}
          />
          <DetailRow
            icon={<Clock size={18} color={colors.primary} />}
            label={t('managerBookings.slotTitle', 'الوقت')}
            value={`${booking.start_time ?? ''}${booking.end_time ? ` — ${booking.end_time}` : ''}`}
          />
          <DetailRow
            icon={<MapPin size={18} color={colors.primary} />}
            label={t('managerBookings.type', 'نوع الحجز')}
            value={t(`managerBookings.reservationType.${booking.reservation_type ?? 'single'}`, booking.reservation_type ?? '')}
          />
          <DetailRow
            icon={<Wallet size={18} color={colors.primary} />}
            label={t('managerBookings.price', 'السعر')}
            value={booking.total != null ? `${booking.total}` : undefined}
          />
          {isSubscription && booking.occurrences_remaining != null ? (
            <DetailRow
              icon={<CalendarDays size={18} color={colors.primary} />}
              label={t('managerBookings.occurrences', 'المتبقي من الجلسات')}
              value={String(booking.occurrences_remaining)}
            />
          ) : null}
        </Card>

        {booking.match_request_id ? (
          <Card>
            <View style={styles.convertedBox}>
              <Trophy size={20} color={colors.success} />
              <AppText variant="body" style={styles.flex}>
                {t('managerBookings.alreadyConverted', 'تم تحويل هذا الحجز إلى مباراة.')}
              </AppText>
            </View>
          </Card>
        ) : (
          <Card>
            <AppText variant="h3" style={{ marginBottom: spacing.xs }}>
              {t('managerBookings.convertTitle', 'تحويل إلى مباراة')}
            </AppText>
            <AppText variant="caption" muted style={{ marginBottom: spacing.md }}>
              {t('managerBookings.convertHint', 'حوّل هذا الحجز إلى طلب مباراة ودية مباشرة.')}
            </AppText>
            <Button
              title={t('managerBookings.convertCta', 'تحويل إلى طلب مباراة')}
              leftIcon={<Trophy size={18} color={colors.textOnPrimary} />}
              onPress={handleOpenConvert}
              disabled={!isConvertible}
              fullWidth
            />
            {!isConvertible ? (
              <AppText variant="caption" muted align="center" style={{ marginTop: spacing.sm }}>
                {t('managerBookings.convertUnavailable', 'يتطلب حجزاً معتمداً لتحويله إلى مباراة.')}
              </AppText>
            ) : null}
          </Card>
        )}

        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <AppText variant="caption" align="center" muted style={{ textDecorationLine: 'underline', paddingVertical: spacing.lg }}>
            {t('common.back', 'رجوع')}
          </AppText>
        </Pressable>
      </ScrollView>

      <Modal visible={convertOpen} onClose={() => setConvertOpen(false)} title={t('managerBookings.convertTitle', 'تحويل إلى مباراة')}>
        <AppText variant="caption" muted style={{ marginBottom: spacing.md }}>
          {t('managerBookings.convertFormHint', 'أكمل تفاصيل طلب المباراة (اختياري).')}
        </AppText>
        <Input
          label={t('managerBookings.notesLabel', 'ملاحظات')}
          placeholder={t('managerBookings.notesPlaceholder', 'تفاصيل إضافية للمباراة')}
          value={notes}
          onChangeText={setNotes}
          multiline
          containerStyle={{ marginBottom: spacing.md }}
        />

        <View style={[styles.segmented, { backgroundColor: colors.bgMuted, marginBottom: spacing.md }]}>
          <Pressable
            onPress={() => setNeedsPlayers(true)}
            style={[styles.segment, needsPlayers ? { backgroundColor: colors.primary } : null]}
            accessibilityRole="button"
            accessibilityState={{ selected: needsPlayers }}
          >
            <AppText variant="captionBold" color={needsPlayers ? colors.textOnPrimary : colors.textMuted}>
              {t('managerMatch.needsPlayersYes', 'أحتاج لاعبين')}
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => setNeedsPlayers(false)}
            style={[styles.segment, !needsPlayers ? { backgroundColor: colors.primary } : null]}
            accessibilityRole="button"
            accessibilityState={{ selected: !needsPlayers }}
          >
            <AppText variant="captionBold" color={!needsPlayers ? colors.textOnPrimary : colors.textMuted}>
              {t('managerMatch.needsPlayersNo', 'لست بحاجة')}
            </AppText>
          </Pressable>
        </View>

        {needsPlayers ? (
          <Input
            label={t('managerMatch.playersNeededLabel', 'عدد اللاعبين المطلوب')}
            placeholder="7"
            keyboardType="numeric"
            value={playersNeeded}
            onChangeText={setPlayersNeeded}
            containerStyle={{ marginBottom: spacing.lg }}
          />
        ) : null}

        <Button
          title={t('managerBookings.confirmConvert', 'تحويل الآن')}
          onPress={() => setConfirmOpen(true)}
          disabled={!allowConvert}
          fullWidth
        />
      </Modal>

      <ConfirmationDialog
        visible={confirmOpen}
        title={t('managerBookings.confirmConvertTitle', 'تحويل الحجز إلى مباراة؟')}
        description={t('managerBookings.confirmConvertDesc', 'سيتم إنشاء طلب مباراة ودية من هذا الحجز. لا يمكن التراجع عن الربط.')}
        confirmLabel={t('managerBookings.confirmConvert', 'تحويل الآن')}
        cancelLabel={t('common.cancel', 'إلغاء')}
        loading={convertMutation.isPending}
        onConfirm={handleConvert}
        onCancel={() => setConfirmOpen(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing['3xl'], gap: spacing.md },
  vsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  flex: { flex: 1 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: { flex: 1 },
  convertedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    padding: spacing.xs,
    gap: spacing.xs,
  },
  segment: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm, borderRadius: radius.md },
});
