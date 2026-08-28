import { useCallback } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Crown, Phone, Ruler, Shield, Star, UserRound } from 'lucide-react-native';

import { useSquadMemberDetail } from '@/api/managerTeam';
import { getApiErrorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';

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

export default function SquadMemberDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();

  const memberId = Array.isArray(id) ? id[0] : id;
  const { player, isLoading, isError, error, refetch } = useSquadMemberDetail(memberId);

  const handleContact = useCallback(() => {
    if (!player?.phone) {
      toast.show(t('squad.noPhone', 'لا يوجد رقم هاتف'), 'info');
      return;
    }
    Linking.openURL(`tel:${player.phone}`).catch(() => {
      toast.show(t('squad.callFailed', 'تعذر الاتصال'), 'error');
    });
  }, [player, t, toast]);

  if (isLoading) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('team.memberDetail', 'تفاصيل العضو')} showBack />
        <View style={styles.content}>
          <Skeleton height={140} radiusValue={radius.lg} />
          <Skeleton height={120} radiusValue={radius.lg} />
          <Skeleton height={120} radiusValue={radius.lg} />
        </View>
      </Screen>
    );
  }

  if (isError || !player) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('team.memberDetail', 'تفاصيل العضو')} showBack />
        <ErrorState
          message={error ? getApiErrorMessage(error, t('squad.loadFailed', 'تعذر تحميل اللاعب')) : undefined}
          onRetry={() => void refetch()}
        />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('team.memberDetail', 'تفاصيل العضو')} showBack />

      <View style={styles.content}>
        <Card>
          <View style={[styles.avatar, { backgroundColor: colors.bgMuted }]}>
            <UserRound size={34} color={colors.primary} />
          </View>
          <AppText variant="h2" align="center">
            {player.name}
          </AppText>
          {player.number != null ? (
            <AppText variant="caption" muted align="center">
              {t('squad.number', 'رقم القميص: {{n}}').replace('{{n}}', String(player.number))}
            </AppText>
          ) : null}
          <View style={styles.badgeRow}>
            {player.is_essential ? (
              <Badge label={t('squad.essential', 'أساسي')} variant="success" />
            ) : null}
            {player.role ? (
              <Badge label={t(`team.role.${player.role}`, player.role)} variant="info" />
            ) : null}
          </View>
        </Card>

        <Card>
          <AppText variant="h3" style={{ marginBottom: spacing.sm }}>
            {t('squad.positionTitle', 'المركز والمواصفات')}
          </AppText>
          <DetailRow
            icon={<Star size={18} color={colors.primary} />}
            label={t('squad.roleTitle', 'الدور')}
            value={t(`team.role.${player.role ?? 'starter'}`, player.role ?? t('squad.starter', 'أساسي'))}
          />
          <DetailRow
            icon={<Shield size={18} color={colors.primary} />}
            label={t('squad.position', 'المركز الحالي')}
            value={player.position}
          />
          <DetailRow
            icon={<Shield size={18} color={colors.primary} />}
            label={t('squad.preferredPosition', 'المركز المفضل')}
            value={player.preferred_position ?? player.position}
          />
          <DetailRow
            icon={<Ruler size={18} color={colors.primary} />}
            label={t('squad.height', 'الطول (سم)')}
            value={player.height_cm != null ? String(player.height_cm) : undefined}
          />
          <DetailRow
            icon={<Ruler size={18} color={colors.primary} />}
            label={t('squad.weight', 'الوزن (كغ)')}
            value={player.weight_kg != null ? String(player.weight_kg) : undefined}
          />
          <DetailRow
            icon={<Crown size={18} color={colors.primary} />}
            label={t('squad.joined', 'تاريخ الانضمام')}
            value={player.joined_at}
          />
        </Card>

        <Card>
          <AppText variant="h3" style={{ marginBottom: spacing.sm }}>
            {t('squad.contactTitle', 'التواصل')}
          </AppText>
          <DetailRow
            icon={<Phone size={18} color={colors.primary} />}
            label={t('squad.phone', 'الهاتف')}
            value={player.phone}
          />
          <Button
            title={t('squad.call', 'اتصال')}
            leftIcon={<Phone size={18} color={colors.textOnPrimary} />}
            onPress={handleContact}
            disabled={!player.phone}
            fullWidth
          />
        </Card>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing['3xl'], gap: spacing.md },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, justifyContent: 'center' },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailText: { flex: 1 },
});
