import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, View, type ListRenderItem } from 'react-native';
import { Inbox } from 'lucide-react-native';

import {
  useApplications,
  useCancelPlayerApplication,
  useRespondToApplication,
  type PlayerApplication,
} from '@/api/team';
import { ApplicationCard } from '@/components/applications/ApplicationCard';
import { ApplicationsSkeleton } from '@/components/applications/ApplicationsSkeleton';
import { AppText } from '@/components/ui/AppText';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { List } from '@/components/ui/List';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';

type Row =
  | { kind: 'section'; title: string }
  | { kind: 'application'; application: PlayerApplication };

export default function PlayerApplicationsScreen(): React.JSX.Element {
  const { t } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PlayerApplication | null>(null);

  const { data, isLoading, isError, error, refetch } = useApplications();
  const respondMutation = useRespondToApplication();
  const cancelMutation = useCancelPlayerApplication();

  const invites = useMemo(
    () => (data?.applications ?? []).filter((a) => a.type === 'invite'),
    [data],
  );
  const applies = useMemo(
    () => (data?.applications ?? []).filter((a) => a.type === 'apply'),
    [data],
  );

  const rows = useMemo<Row[]>(() => {
    const result: Row[] = [];
    if (invites.length > 0) {
      result.push({ kind: 'section', title: t('applications.section.invites', 'دعوات الانضمام') });
      invites.forEach((application) => result.push({ kind: 'application', application }));
    }
    if (applies.length > 0) {
      result.push({ kind: 'section', title: t('applications.section.applies', 'طلباتي للانضمام للمباريات') });
      applies.forEach((application) => result.push({ kind: 'application', application }));
    }
    return result;
  }, [invites, applies, t]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleAccept = useCallback(
    (application: PlayerApplication) => {
      setBusyId(application.id);
      respondMutation.mutate(
        { id: application.id, action: 'accept' },
        {
          onSuccess: (res) => toast.show(res.message ?? t('applications.accepted', 'تم قبول الدعوة'), 'success'),
          onError: () => toast.show(t('applications.respondFailed', 'تعذر تنفيذ العملية'), 'error'),
          onSettled: () => setBusyId(null),
        },
      );
    },
    [respondMutation, toast, t],
  );

  const handleDecline = useCallback(
    (application: PlayerApplication) => {
      setBusyId(application.id);
      respondMutation.mutate(
        { id: application.id, action: 'decline' },
        {
          onSuccess: (res) => toast.show(res.message ?? t('applications.declined', 'تم رفض الدعوة'), 'info'),
          onError: () => toast.show(t('applications.respondFailed', 'تعذر تنفيذ العملية'), 'error'),
          onSettled: () => setBusyId(null),
        },
      );
    },
    [respondMutation, toast, t],
  );

  const handleCancelConfirm = useCallback(() => {
    if (!cancelTarget) return;
    const target = cancelTarget;
    setBusyId(target.id);
    cancelMutation.mutate(
      target.id,
      {
        onSuccess: (res) => toast.show(res.message ?? t('applications.cancelled', 'تم إلغاء الطلب'), 'info'),
        onError: () => toast.show(t('applications.cancelFailed', 'تعذر إلغاء الطلب'), 'error'),
        onSettled: () => {
          setBusyId(null);
          setCancelTarget(null);
        },
      },
    );
  }, [cancelTarget, cancelMutation, toast, t]);

  const renderItem: ListRenderItem<Row> = useCallback(
    ({ item }) => {
      if (item.kind === 'section') {
        return (
          <View style={styles.sectionHeader}>
            <AppText variant="bodyBold">{item.title}</AppText>
            <View style={[styles.sectionLine, { backgroundColor: colors.border }]} />
          </View>
        );
      }
      const application = item.application;
      return (
        <ApplicationCard
          application={application}
          responding={busyId === application.id}
          onAccept={() => handleAccept(application)}
          onDecline={() => handleDecline(application)}
          onCancel={() => setCancelTarget(application)}
        />
      );
    },
    [busyId, handleAccept, handleDecline, colors.border],
  );

  if (isLoading) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('applications.title', 'طلباتي')} showBack />
        <ApplicationsSkeleton />
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('applications.title', 'طلباتي')} showBack />

      <List
        data={rows}
        renderItem={renderItem}
        keyExtractor={(item, index) =>
          item.kind === 'section' ? `section-${item.title}` : `app-${item.application.id}`
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.content}
        style={{ flex: 1 }}
        loading={false}
        error={isError ? error : null}
        onRetry={() => void refetch()}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        emptyIcon={<Inbox size={36} color={colors.textMuted} />}
        emptyTitle={t('applications.emptyTitle', 'لا توجد طلبات')}
        emptyDescription={t('applications.emptyDesc', 'طلبات الانضمام والدعوات ستظهر هنا.')}
      />

      <ConfirmationDialog
        visible={cancelTarget !== null}
        title={t('applications.cancelTitle', 'إلغاء الطلب؟')}
        description={t('applications.cancelDesc', 'هل تريد إلغاء طلب الانضمام لهذه المباراة؟')}
        confirmLabel={t('applications.cancel', 'إلغاء الطلب')}
        cancelLabel={t('common.back', 'رجوع')}
        destructive
        loading={busyId !== null && cancelTarget !== null}
        onCancel={() => setCancelTarget(null)}
        onConfirm={handleCancelConfirm}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing['3xl'] },
  separator: { height: spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  sectionLine: { flex: 1, height: StyleSheet.hairlineWidth },
});
