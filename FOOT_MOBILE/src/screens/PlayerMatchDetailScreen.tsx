import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Calendar, MapPin, Swords, Users } from 'lucide-react-native';

import { getApiErrorMessage } from '@/api/errors';
import {
  useApplyToMatch,
  useCancelApplication,
  useMatchDetail,
  type PositionAvailability,
} from '@/api/matches';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Loading } from '@/components/ui/Loading';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, sizes, spacing } from '@/theme/spacing';
import { formatTime } from '@/utils/format';

const POSITIONS = ['goalkeeper', 'defender', 'midfielder', 'forward'] as const;
type Position = (typeof POSITIONS)[number];

export default function PlayerMatchDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, formatDate, locale } = useI18n();
  const { colors } = useTheme();
  const { show } = useToast();
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  const { data, isLoading, isError, error, refetch } = useMatchDetail(id);
  const apply = useApplyToMatch();
  const cancel = useCancelApplication();

  const detail = data;
  const match = detail?.match;
  const myApplication = detail?.my_application;

  const needsPositions = useMemo(
    () => Boolean(JSON.stringify(detail?.positions_needed) !== '{}' && detail?.positions_needed),
    [detail],
  );

  const availablePositions = useMemo(() => {
    const avail = detail?.position_availability ?? {};
    return POSITIONS.filter((p) => {
      const a: PositionAvailability | undefined = avail[p];
      if (!a) return false;
      return a.available > 0;
    });
  }, [detail]);

  const isFull = Boolean(match?.players_full) || (needsPositions && availablePositions.length === 0);
  const alreadyApplied = Boolean(myApplication);
  const applicationPending = myApplication?.status === 'pending';
  const applicationAccepted = myApplication?.status === 'accepted';
  const applicationOther = alreadyApplied && !applicationPending && !applicationAccepted;
  const applyDisabled = isFull || apply.isPending || alreadyApplied || (needsPositions && !selectedPosition);

  const teamName = match?.host_team?.name ?? t('match.unknownTeam', 'فريق');
  const terrainName = match?.stadium?.name ?? match?.custom_terrain_name ?? '';
  const city = match?.stadium?.city ?? match?.host_team?.city ?? '';
  const managerName = detail?.manager?.name;

  const handleApply = (): void => {
    if (applyDisabled) return;
    apply.mutate(
      { id, payload: { position: selectedPosition ?? undefined } },
      {
        onSuccess: () => {
          show(t('match.applicationSent', 'تم إرسال طلب الانضمام، بانتظار تأكيد المسير'), 'success');
          setSelectedPosition(null);
        },
        onError: (err) => {
          show(getApiErrorMessage(err, t('match.applyFailed', 'تعذر إرسال طلب الانضمام')), 'error');
        },
      },
    );
  };

  const handleCancel = (): void => {
    if (!myApplication) return;
    cancel.mutate(myApplication.id, {
      onSuccess: () => show(t('match.applicationCancelled', 'تم إلغاء طلب الانضمام'), 'success'),
      onError: (err) => show(getApiErrorMessage(err, t('match.cancelFailed', 'تعذر إلغاء الطلب')), 'error'),
    });
  };

  if (isLoading) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('match.detail', 'تفاصيل المباراة')} showBack />
        <Loading />
      </Screen>
    );
  }

  if (isError || !match) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('match.detail', 'تفاصيل المباراة')} showBack />
        <ErrorState
          error={error}
          fallback={t('match.loadError', 'تعذر تحميل المباراة')}
          onRetry={() => void refetch()}
          retryLabel={t('common.retry', 'إعادة المحاولة')}
        />
      </Screen>
    );
  }

  const spots = match.players_remaining ?? 0;
  const price = match.price_per_player;

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('match.detail', 'تفاصيل المباراة')} showBack />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card padded={false}>
          <View style={[styles.hero, { backgroundColor: colors.bgMuted }]}>
            <View style={styles.heroBadge}>
              <Swords size={sizes.iconSm} color={colors.primary} />
              <AppText variant="label" style={{ color: colors.primary }}>
                {match.player_format ? match.player_format.toUpperCase() : ''}
              </AppText>
            </View>
            <Badge label={t('match.open', 'مفتوحة')} variant="success" />
          </View>
          <View style={styles.cardBody}>
            <AppText variant="h3">{teamName}</AppText>
            <View style={styles.row}>
              <Calendar size={sizes.iconMd} color={colors.textMuted} />
              <AppText variant="body" muted>
                {`${formatDate(match.match_datetime)} · ${formatTime(match.match_datetime, locale)}`}
              </AppText>
            </View>
            <View style={styles.row}>
              <MapPin size={sizes.iconMd} color={colors.textMuted} />
              <AppText variant="body" muted style={styles.rowText}>
                {[terrainName, city].filter(Boolean).join(' · ') || t('match.noTerrain', 'بدون ملعب')}
              </AppText>
            </View>
            {managerName ? (
              <AppText variant="caption" subtle>
                {t('match.byManager', 'بواسطة: {{name}}').replace('{{name}}', managerName)}
              </AppText>
            ) : null}
          </View>
        </Card>

        <Card>
          <View style={styles.infoRow}>
            <Users size={sizes.iconMd} color={colors.textMuted} />
            <View style={styles.infoText}>
              <AppText variant="bodyBold">
                {isFull
                  ? t('match.full', 'المواقع ممتلئة')
                  : t('match.spotsLeft', '{{count}} spots left').replace('{{count}}', String(spots))}
              </AppText>
              <AppText variant="caption" muted>
                {t('match.playersJoined', '{{count}} joined').replace('{{count}}', String(match.players_joined ?? 0))}
              </AppText>
            </View>
          </View>
          {price !== null && price !== undefined && price !== '' ? (
            <View style={styles.infoRow}>
              <Swords size={sizes.iconMd} color={colors.textMuted} />
              <AppText variant="body" muted>
                {t('match.pricePerPlayer', '{{value}} per player').replace('{{value}}', String(price))}
              </AppText>
            </View>
          ) : null}
          {match.notes ? (
            <View style={styles.infoRow}>
              <AppText variant="caption" muted style={styles.notes}>
                {match.notes}
              </AppText>
            </View>
          ) : null}
        </Card>

        {needsPositions ? (
          <Card>
            <AppText variant="bodyBold">{t('match.choosePosition', 'اختر مركزك')}</AppText>
            <AppText variant="caption" muted>
              {t('match.choosePositionHint', 'هذه المباراة تتطلب تحديد المركز')}
            </AppText>
            <View style={styles.positionWrap}>
              {POSITIONS.map((pos) => {
                const available = (detail?.position_availability?.[pos]?.available ?? 0) > 0;
                const selected = selectedPosition === pos;
                return (
                  <Pressable
                    key={pos}
                    onPress={() => setSelectedPosition(selected ? null : pos)}
                    disabled={!available}
                    accessibilityRole="button"
                    accessibilityLabel={t(`match.pos.${pos}`, pos)}
                    accessibilityState={{ selected, disabled: !available }}
                    style={[
                      styles.chip,
                      { borderColor: available ? colors.borderStrong : colors.border, opacity: available ? 1 : 0.5 },
                      selected && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                  >
                    <AppText
                      variant="captionBold"
                      style={{ color: selected ? colors.textOnPrimary : colors.text }}
                    >
                      {t(`match.pos.${pos}`, pos)}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </Card>
        ) : null}

        <View style={styles.actionArea}>
          {applicationPending ? (
            <>
              <Badge label={t('match.applicationPending', 'طلبك قيد المراجعة')} variant="warning" style={styles.pendingBadge} />
              <Button title={t('match.cancelApplication', 'إلغاء الطلب')} variant="outline" onPress={handleCancel} loading={cancel.isPending} disabled={cancel.isPending} fullWidth />
            </>
          ) : applicationAccepted ? (
            <Badge label={t('match.joined', 'انضممت لهذه المباراة')} variant="success" style={styles.pendingBadge} />
          ) : applicationOther ? (
            <Badge label={t('match.applicationClosed', 'لم يتم قبول طلبك')} variant="neutral" style={styles.pendingBadge} />
          ) : (
            <Button
              title={t('match.join', 'طلب الانضمام')}
              onPress={handleApply}
              loading={apply.isPending}
              disabled={applyDisabled}
              fullWidth
            />
          )}
          {needsPositions && !selectedPosition && !alreadyApplied ? (
            <AppText variant="caption" subtle align="center">
              {t('match.selectPositionFirst', 'اختر مركزاً للتقديم')}
            </AppText>
          ) : null}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing.md, paddingBottom: spacing['3xl'], gap: spacing.md },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  cardBody: { padding: spacing.lg, gap: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowText: { flex: 1 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  infoText: { gap: 0 },
  notes: { flex: 1 },
  positionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  actionArea: { marginTop: spacing.sm, gap: spacing.md },
  pendingBadge: { alignSelf: 'center' },
});
