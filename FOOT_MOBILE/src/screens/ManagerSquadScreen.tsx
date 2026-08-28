import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Crown, Trash2, Users } from 'lucide-react-native';

import {
  useAssignCaptain,
  useRemoveMember,
  useTeamMembers,
  useTeamProfile,
  useToggleEssential,
  type SquadPlayer,
} from '@/api/managerTeam';
import { getApiErrorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/AppText';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { List } from '@/components/ui/List';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { TeamLogoPicker } from '@/components/team/TeamLogoPicker';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';

export default function ManagerSquadScreen(): React.JSX.Element {
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();

  const [refreshing, setRefreshing] = useState(false);
  const [removeTarget, setRemoveTarget] = useState<SquadPlayer | null>(null);
  const [captainTarget, setCaptainTarget] = useState<SquadPlayer | null>(null);

  const { data, isLoading, isError, error, refetch } = useTeamMembers();
  const { data: profileData } = useTeamProfile();
  const teamProfile = profileData?.team;
  const toggleMutation = useToggleEssential();
  const removeMutation = useRemoveMember();
  const captainMutation = useAssignCaptain();

  const players = data?.players ?? [];

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleToggleEssential = useCallback(
    (player: SquadPlayer) => {
      toggleMutation.mutate(player.id, {
        onError: (err) => {
          toast.show(getApiErrorMessage(err, t('squad.toggleFailed', 'تعذر التحديث')), 'error');
        },
      });
    },
    [toggleMutation, toast, t],
  );

  const handleRemove = useCallback(() => {
    if (!removeTarget) return;
    removeMutation.mutate(removeTarget.id, {
      onSuccess: (res) => {
        setRemoveTarget(null);
        toast.show(res.message ?? t('squad.removed', 'تم حذف اللاعب'), 'success');
      },
      onError: (err) => {
        setRemoveTarget(null);
        toast.show(getApiErrorMessage(err, t('squad.removeFailed', 'تعذر حذف اللاعب')), 'error');
      },
    });
  }, [removeTarget, removeMutation, toast, t]);

  const handleAssignCaptain = useCallback(() => {
    if (!captainTarget) return;
    captainMutation.mutate(captainTarget.id, {
      onSuccess: (res) => {
        setCaptainTarget(null);
        toast.show(res.message ?? t('squad.captainAssigned', 'تم تعيين القائد'), 'success');
      },
      onError: (err) => {
        setCaptainTarget(null);
        toast.show(getApiErrorMessage(err, t('squad.captainFailed', 'تعذر تعيين القائد')), 'error');
      },
    });
  }, [captainTarget, captainMutation, toast, t]);

  const renderItem = useCallback(
    ({ item }: { item: SquadPlayer }) => {
      const essential = item.is_essential;
      return (
        <Card style={styles.memberCard}>
          <Pressable
            onPress={() => router.push(`/(manager)/team/${item.id}` as never)}
            style={styles.memberHeader}
            accessibilityRole="button"
          >
            <View style={[styles.avatar, { backgroundColor: colors.bgMuted }]}>
              <AppText variant="bodyBold" color={colors.primary}>
                {item.number != null ? item.number : '—'}
              </AppText>
            </View>
            <View style={styles.memberInfo}>
              <AppText variant="bodyBold" numberOfLines={1}>
                {item.name}
              </AppText>
              <AppText variant="caption" muted numberOfLines={1}>
                {item.position || t('squad.noPosition', 'بدون مركز')}
              </AppText>
            </View>
            {item.is_essential ? (
              <Badge label={t('squad.essential', 'أساسي')} variant="success" />
            ) : null}
          </Pressable>

          <View style={styles.toggleRow}>
            <AppText variant="body" style={styles.flex}>
              {t('squad.essentialToggle', 'لاعب أساسي')}
            </AppText>
            <Switch
              value={essential}
              onValueChange={() => handleToggleEssential(item)}
              trackColor={{ false: colors.borderStrong, true: colors.primary }}
              thumbColor="#ffffff"
              accessibilityLabel={t('squad.essentialToggle', 'لاعب أساسي')}
            />
          </View>

          <View style={styles.actionsRow}>
            <Button
              title={t('squad.makeCaptain', 'تعيين قائد')}
              leftIcon={<Crown size={16} color={colors.primary} />}
              onPress={() => setCaptainTarget(item)}
              variant="outline"
              style={styles.flex}
            />
            <Button
              title={t('squad.remove', 'حذف')}
              leftIcon={<Trash2 size={16} color={colors.danger} />}
              onPress={() => setRemoveTarget(item)}
              variant="ghost"
              style={styles.flex}
            />
          </View>
        </Card>
      );
    },
    [router, t, colors, handleToggleEssential],
  );

  const teamHeader = teamProfile ? (
    <Card style={styles.teamCard}>
      <TeamLogoPicker
        logoUrl={teamProfile.logo_url}
        logoThumbnailUrl={teamProfile.logo_thumbnail_url}
        name={teamProfile.name}
        editable
        size={64}
      />
      <View style={styles.teamCardInfo}>
        <AppText variant="h3" numberOfLines={1}>
          {teamProfile.name}
        </AppText>
        <AppText variant="caption" muted numberOfLines={1}>
          {teamProfile.category ? `${t(`team.category.${teamProfile.category}`, teamProfile.category)} · ` : ''}
          {t('squad.membersCount', '{{count}} لاعبا').replace('{{count}}', String(teamProfile.member_count ?? 0))}
        </AppText>
      </View>
    </Card>
  ) : null;

  if (isLoading) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('team.title', 'الفريق')} />
        <View style={styles.content}>
          <Skeleton height={120} radiusValue={radius.lg} />
          <Skeleton height={120} radiusValue={radius.lg} />
          <Skeleton height={120} radiusValue={radius.lg} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('team.title', 'الفريق')} />

      <List
        data={players}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        style={{ flex: 1 }}
        loading={false}
        error={isError ? error : null}
        onRetry={() => void refetch()}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        ListHeaderComponent={teamHeader}
        emptyIcon={<Users size={36} color={colors.textMuted} />}
        emptyTitle={t('squad.emptyTitle', 'لا يوجد لاعبون')}
        emptyDescription={t('squad.emptyDesc', 'أضف لاعبين إلى فريقك لعرض القائمة هنا.')}
      />

      <ConfirmationDialog
        visible={removeTarget !== null}
        title={t('squad.removeTitle', 'حذف اللاعب؟')}
        description={
          removeTarget
            ? t('squad.removeDesc', 'سيتم إزالة {{name}} من الفريق. ستبقى سجلاته القديمة محفوظة.').replace('{{name}}', removeTarget.name)
            : undefined
        }
        confirmLabel={t('squad.remove', 'حذف')}
        cancelLabel={t('common.cancel', 'إلغاء')}
        destructive
        loading={removeMutation.isPending}
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      />

      <ConfirmationDialog
        visible={captainTarget !== null}
        title={t('squad.captainTitle', 'تعيين القائد؟')}
        description={
          captainTarget
            ? t('squad.captainDesc', 'سيصبح {{name}} قائد الفريق.').replace('{{name}}', captainTarget.name)
            : undefined
        }
        confirmLabel={t('squad.makeCaptain', 'تعيين قائد')}
        cancelLabel={t('common.cancel', 'إلغاء')}
        loading={captainMutation.isPending}
        onConfirm={handleAssignCaptain}
        onCancel={() => setCaptainTarget(null)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing['3xl'], gap: spacing.md },
  teamCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  teamCardInfo: { flex: 1, gap: 2 },
  memberCard: { gap: spacing.md },
  memberHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInfo: { flex: 1 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  flex: { flex: 1 },
});
