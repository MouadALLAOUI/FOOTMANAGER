import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CalendarDays, Check, Clock, MapPin, Trophy, Users, X } from 'lucide-react-native';

import {
  useConfirmScore,
  useDisputeScore,
  useManagerMatchDetail,
  useMatchApplicants,
  useRespondToApplication,
  useStartMatch,
  useSubmitScore,
} from '@/api/managerMatches';
import { getApiErrorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { EmptyState } from '@/components/ui/EmptyState';
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
    case 'live':
      return 'danger';
    case 'accepted':
      return 'success';
    case 'open':
      return 'warning';
    case 'completed':
      return 'info';
    default:
      return 'neutral';
  }
}

export default function ManagerMatchDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, formatDate, isRTL } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();

  const matchId = Array.isArray(id) ? id[0] : id;

  const { match, isLoading, isError, error, refetch } = useManagerMatchDetail(matchId);
  const applicantsQuery = useMatchApplicants(matchId);

  const respondMutation = useRespondToApplication();
  const startMutation = useStartMatch();
  const submitMutation = useSubmitScore();
  const confirmMutation = useConfirmScore();
  const disputeMutation = useDisputeScore();

  const [startOpen, setStartOpen] = useState(false);
  const [scoreOpen, setScoreOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [hostScore, setHostScore] = useState('');
  const [oppScore, setOppScore] = useState('');

  const status = match?.status;
  const isLiveOrFinished = status === 'live' || status === 'completed';
  const isFinished = status === 'completed';
  const canStart = status === 'open' || status === 'accepted';
  const scoreStatus = match?.score_status;

  const applicants = useMemo(() => applicantsQuery.data?.applications ?? [], [applicantsQuery.data]);
  const pendingApplicants = useMemo(
    () => applicants.filter((a) => a.status === 'pending'),
    [applicants],
  );
  const joinedPlayers = useMemo(
    () => applicants.filter((a) => a.status === 'accepted'),
    [applicants],
  );

  const resetScores = useCallback(() => {
    setHostScore(String(match?.host_score ?? ''));
    setOppScore(String(match?.opponent_score ?? ''));
  }, [match?.host_score, match?.opponent_score]);

  const handleRespond = (applicationId: number, action: 'accept' | 'decline'): void => {
    respondMutation.mutate(
      { applicationId, action },
      {
        onSuccess: (res) => {
          toast.show(
            res.message ?? (action === 'accept' ? t('managerMatch.approved', 'تم القبول') : t('managerMatch.declined', 'تم الرفض')),
            'success',
          );
          void applicantsQuery.refetch();
        },
        onError: (err) => {
          toast.show(getApiErrorMessage(err, t('managerMatch.respondFailed', 'تعذر تحديث الطلب')), 'error');
        },
      },
    );
  };

  const handleStart = (): void => {
    if (!match) return;
    startMutation.mutate(match.id, {
      onSuccess: (res) => {
        setStartOpen(false);
        toast.show(res.message ?? t('managerMatch.started', 'بدأت المباراة'), 'success');
        void refetch();
      },
      onError: (err) => {
        setStartOpen(false);
        toast.show(getApiErrorMessage(err, t('managerMatch.startFailed', 'تعذر بدء المباراة')), 'error');
      },
    });
  };

  const openScore = (): void => {
    resetScores();
    setScoreOpen(true);
  };

  const handleSubmitScore = (): void => {
    if (!match || (!hostScore && !oppScore)) return;
    const payload = { host_score: Number(hostScore) || 0, opponent_score: Number(oppScore) || 0 };
    submitMutation.mutate(
      { id: match.id, payload },
      {
        onSuccess: (res) => {
          setScoreOpen(false);
          toast.show(res.message ?? t('managerMatch.scoreSubmitted', 'تم إرسال النتيجة'), 'success');
          void refetch();
        },
        onError: (err) => {
          toast.show(getApiErrorMessage(err, t('managerMatch.scoreFailed', 'تعذر إرسال النتيجة')), 'error');
        },
      },
    );
  };

  const handleConfirm = (): void => {
    if (!match) return;
    confirmMutation.mutate(match.id, {
      onSuccess: (res) => {
        setConfirmOpen(false);
        toast.show(res.message ?? t('managerMatch.scoreConfirmed', 'تم تأكيد النتيجة'), 'success');
        void refetch();
      },
      onError: (err) => {
        setConfirmOpen(false);
        toast.show(getApiErrorMessage(err, t('managerMatch.confirmFailed', 'تعذر تأكيد النتيجة')), 'error');
      },
    });
  };

  const handleDispute = (): void => {
    if (!match) return;
    disputeMutation.mutate(match.id, {
      onSuccess: (res) => {
        setDisputeOpen(false);
        toast.show(res.message ?? t('managerMatch.disputed', 'تم الاعتراض على النتيجة'), 'info');
        void refetch();
      },
      onError: (err) => {
        setDisputeOpen(false);
        toast.show(getApiErrorMessage(err, t('managerMatch.disputeFailed', 'تعذر تسجيل الاعتراض')), 'error');
      },
    });
  };

  if (isLoading) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('matches.detail', 'تفاصيل المباراة')} showBack />
        <View style={styles.content}>
          <Skeleton height={150} radiusValue={radius.lg} />
          <Skeleton height={120} radiusValue={radius.lg} />
          <Skeleton height={180} radiusValue={radius.lg} />
        </View>
      </Screen>
    );
  }

  if (isError || !match) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('matches.detail', 'تفاصيل المباراة')} showBack />
        <ErrorState
          message={error ? getApiErrorMessage(error, t('managerMatch.loadFailed', 'تعذر تحميل المباراة')) : undefined}
          onRetry={() => void refetch()}
        />
      </Screen>
    );
  }

  const venue = match.stadium?.name ?? match.custom_terrain_name;
  const home = match.hostTeam?.name ?? t('managerMatch.home', 'فريقي');
  const away = match.opponentTeam?.name ?? match.targetTeam?.name ?? t('managerMatch.unknownOpponent', 'فريق آخر');

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('matches.detail', 'تفاصيل المباراة')} showBack />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card>
          <View style={styles.vsRow}>
            <AppText variant="bodyBold" style={styles.teamName} numberOfLines={2}>
              {home}
            </AppText>
            <AppText variant="h3" muted>
              VS
            </AppText>
            <AppText variant="bodyBold" align={isRTL ? 'left' : 'right'} style={styles.teamName} numberOfLines={2}>
              {away}
            </AppText>
          </View>

          {isLiveOrFinished ? (
            <View style={[styles.scoreRow, { backgroundColor: colors.bgMuted }]}>
              <AppText variant="h2">{match.host_score ?? 0}</AppText>
              <AppText variant="h3" muted>
                —
              </AppText>
              <AppText variant="h2">{match.opponent_score ?? 0}</AppText>
            </View>
          ) : null}

          <View style={styles.badgeRow}>
            <Badge label={t(`managerMatch.status.${status}`, status ?? '')} variant={statusVariant(status)} />
            {scoreStatus ? (
              <Badge label={t(`managerMatch.scoreStatus.${scoreStatus}`, scoreStatus)} variant="info" />
            ) : null}
          </View>
        </Card>

        <Card>
          <DetailRow icon={<CalendarDays size={18} color={colors.primary} />} label={t('managerMatch.date', 'التاريخ')} value={match.match_datetime ? formatDate(match.match_datetime) : undefined} />
          <DetailRow icon={<Clock size={18} color={colors.primary} />} label={t('managerMatch.format', 'الصيغة')} value={match.player_format ? match.player_format.toUpperCase() : undefined} />
          <DetailRow icon={<MapPin size={18} color={colors.primary} />} label={t('managerMatch.venue', 'الملعب')} value={venue} />
          <DetailRow icon={<Users size={18} color={colors.primary} />} label={t('managerMatch.playersJoined', 'لاعبون منضمون')} value={String(match.players_joined_count ?? joinedPlayers.length)} />
        </Card>

        {canStart ? (
          <Button
            title={t('managerMatch.startMatch', 'بدء المباراة')}
            leftIcon={<Trophy size={18} color={colors.textOnPrimary} />}
            onPress={() => setStartOpen(true)}
            loading={startMutation.isPending}
            fullWidth
          />
        ) : null}

        {isLiveOrFinished ? (
          <Card>
            <AppText variant="h3" style={{ marginBottom: spacing.sm }}>
              {t('managerMatch.scoreTitle', 'النتيجة')}
            </AppText>
            {scoreStatus === 'pending_confirmation' ? (
              <AppText variant="caption" muted style={{ marginBottom: spacing.md }}>
                {t('managerMatch.pendingConfirmHint', 'بانتظار تأكيد الفريق الآخر. تأكد من النتيجة أو سجّل اعتراضاً.')}
              </AppText>
            ) : null}
            <View style={styles.actionRow}>
              <Button title={t('managerMatch.editScore', 'تعديل النتيجة')} onPress={openScore} variant="outline" style={styles.flex} />
              {scoreStatus === 'pending_confirmation' ? (
                <>
                  <Button title={t('managerMatch.confirmScore', 'تأكيد')} onPress={() => setConfirmOpen(true)} variant="secondary" style={styles.flex} />
                  <Button title={t('managerMatch.disputeScore', 'اعتراض')} onPress={() => setDisputeOpen(true)} variant="danger" style={styles.flex} disabled={isFinished} />
                </>
              ) : null}
            </View>
            {!isFinished && scoreStatus !== 'pending_confirmation' ? (
              <Button
                title={t('managerMatch.submitScore', 'إرسال النتيجة')}
                onPress={openScore}
                loading={submitMutation.isPending}
                fullWidth
                style={{ marginTop: spacing.sm }}
              />
            ) : null}
          </Card>
        ) : null}

        <View style={styles.sectionHeader}>
          <AppText variant="h3">{t('managerMatch.applicantsTitle', 'الطلبات')}</AppText>
        </View>
        {pendingApplicants.length === 0 ? (
          <EmptyState
            title={t('managerMatch.noApplicants', 'لا توجد طلبات')}
            description={t('managerMatch.noApplicantsDesc', 'لا يوجد لاعبون طلبوا الانضمام بعد.')}
          />
        ) : (
          pendingApplicants.map((app) => {
            const busy = respondMutation.isPending;
            return (
              <Card key={app.id} style={styles.applicantCard}>
                <View style={styles.applicantRow}>
                  <AppText variant="body">{app.player?.name ?? app.position ?? 'player'}</AppText>
                  {app.position ? <AppText variant="caption" muted>{app.position}</AppText> : null}
                </View>
                <View style={styles.actionRow}>
                  <Button
                    title={t('managerMatch.accept', 'قبول')}
                    leftIcon={<Check size={16} color={colors.textOnPrimary} />}
                    onPress={() => handleRespond(app.id, 'accept')}
                    disabled={busy}
                    style={styles.flex}
                  />
                  <Button
                    title={t('managerMatch.decline', 'رفض')}
                    leftIcon={<X size={16} color={colors.danger} />}
                    onPress={() => handleRespond(app.id, 'decline')}
                    variant="ghost"
                    disabled={busy}
                    style={styles.flex}
                  />
                </View>
              </Card>
            );
          })
        )}

        <View style={styles.sectionHeader}>
          <AppText variant="h3">{t('managerMatch.rosterTitle', 'القائمة')}</AppText>
        </View>
        {joinedPlayers.length === 0 ? (
          <EmptyState
            title={t('managerMatch.emptyRoster', 'القائمة فارغة')}
            description={t('managerMatch.emptyRosterDesc', 'اللاعبون المقبولون سيظهرون هنا.')}
          />
        ) : (
          joinedPlayers.map((p) => (
            <View key={p.id} style={[styles.rosterRow, { borderColor: colors.border }]}>
              <View style={[styles.avatar, { backgroundColor: colors.bgMuted }]}>
                <Users size={16} color={colors.textMuted} />
              </View>
              <AppText variant="body" style={styles.flex}>
                {p.player?.name ?? t('managerMatch.player', 'لاعب')}
              </AppText>
              {p.position ? (
                <AppText variant="caption" muted>
                  {p.position}
                </AppText>
              ) : null}
            </View>
          ))
        )}

        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <AppText variant="caption" align="center" muted style={{ textDecorationLine: 'underline', paddingVertical: spacing.lg }}>
            {t('common.back', 'رجوع')}
          </AppText>
        </Pressable>
      </ScrollView>

      <ConfirmationDialog
        visible={startOpen}
        title={t('managerMatch.confirmStartTitle', 'بدء المباراة؟')}
        description={t('managerMatch.confirmStartDesc', 'سيتم تحديث الحالة إلى مباشرة. لا يمكن التراجع بعد ذلك.')}
        confirmLabel={t('managerMatch.startMatch', 'بدء')}
        cancelLabel={t('common.cancel', 'إلغاء')}
        loading={startMutation.isPending}
        onConfirm={handleStart}
        onCancel={() => setStartOpen(false)}
      />

      <Modal visible={scoreOpen} onClose={() => setScoreOpen(false)} title={t('managerMatch.submitScore', 'إرسال النتيجة')}>
        <AppText variant="caption" muted style={{ marginBottom: spacing.md }}>
          {t('managerMatch.scoreFormHint', 'أدخل عدد أهداف كل فريق.')}
        </AppText>
        <Input
          label={home}
          keyboardType="numeric"
          value={hostScore}
          onChangeText={setHostScore}
          placeholder="0"
          containerStyle={{ marginBottom: spacing.md }}
        />
        <Input
          label={away}
          keyboardType="numeric"
          value={oppScore}
          onChangeText={setOppScore}
          placeholder="0"
          containerStyle={{ marginBottom: spacing.lg }}
        />
        <Button
          title={t('managerMatch.submitScore', 'إرسال')}
          onPress={handleSubmitScore}
          loading={submitMutation.isPending}
          fullWidth
        />
      </Modal>

      <ConfirmationDialog
        visible={confirmOpen}
        title={t('managerMatch.confirmScoreTitle', 'تأكيد النتيجة؟')}
        description={t('managerMatch.confirmScoreDesc', 'بالتأكيد، النتيجة المعروضة صحيحة.')}
        confirmLabel={t('managerMatch.confirmScore', 'تأكيد')}
        cancelLabel={t('common.cancel', 'إلغاء')}
        loading={confirmMutation.isPending}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />

      <ConfirmationDialog
        visible={disputeOpen}
        title={t('managerMatch.disputeTitle', 'الاعتراض على النتيجة؟')}
        description={t('managerMatch.disputeDesc', 'سيتم إرجاع النتيجة للمراجعة ويمكنك إرسال نتيجة جديدة.')}
        destructive
        confirmLabel={t('managerMatch.disputeScore', 'اعتراض')}
        cancelLabel={t('common.cancel', 'إلغاء')}
        loading={disputeMutation.isPending}
        onConfirm={handleDispute}
        onCancel={() => setDisputeOpen(false)}
      />
    </Screen>
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

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing['3xl'], gap: spacing.md },
  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  teamName: { flex: 1 },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    marginTop: spacing.md,
  },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, flexWrap: 'wrap' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: { flex: 1 },
  sectionHeader: { marginTop: spacing.sm },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
  applicantCard: { gap: spacing.md },
  applicantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
