import { useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { Check, Phone, Users, X } from 'lucide-react-native';

import {
  type AdminApprovalRole,
  type AdminApplicant,
  useAdminApprovalFeed,
  useAdminDecision,
} from '@/api/adminApprovals';
import { getApiErrorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { Loading } from '@/components/ui/Loading';
import { Modal } from '@/components/ui/Modal';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';

type RoleKey = 'managers' | 'owners' | 'committees';

interface RoleSection {
  key: RoleKey;
  role: AdminApprovalRole;
  count: number;
  iconEmoji: string;
}

function roleLabel(t: ReturnType<typeof useI18n>['t'], key: RoleKey): string {
  const map: Record<RoleKey, string> = {
    managers: t('approvals.section.managers', 'Managers'),
    owners: t('approvals.section.owners', 'Terrain Owners'),
    committees: t('approvals.section.committees', 'Committee Members'),
  };
  return map[key];
}

function roleBadgeVariant(key: RoleKey): BadgeVariant {
  if (key === 'managers') return 'info';
  if (key === 'owners') return 'warning';
  return 'neutral';
}

export default function ApprovalsScreen(): React.JSX.Element {
  const { t, formatDate } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();

  const feedQuery = useAdminApprovalFeed();
  const decision = useAdminDecision();
  const [rejectTarget, setRejectTarget] = useState<{ role: AdminApprovalRole; applicant: AdminApplicant } | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const feed = feedQuery.data;

  const sections: RoleSection[] = [
    { key: 'managers', role: 'manager', count: feed?.managers.length ?? 0, iconEmoji: '🧑‍💼' },
    { key: 'owners', role: 'terrain_owner', count: feed?.owners.length ?? 0, iconEmoji: '🏟️' },
    { key: 'committees', role: 'committee', count: feed?.committees.length ?? 0, iconEmoji: '🏅' },
  ];

  const totalPending = sections.reduce((sum, s) => sum + s.count, 0);

  const applicantsFor = (key: RoleKey, role: AdminApprovalRole): AdminApplicant[] => {
    if (key === 'managers') return feed?.managers ?? [];
    if (key === 'owners') return feed?.owners ?? [];
    return feed?.committees ?? [];
  };

  const handleApprove = (role: AdminApprovalRole, applicant: AdminApplicant): void => {
    decision.mutate(
      { role, id: applicant.id, action: 'approve' },
      {
        onSuccess: (data) => toast.show(data.message || t('approvals.approved', 'Account approved'), 'success'),
        onError: (err) => toast.show(getApiErrorMessage(err, t('approvals.approveFailed', 'Could not approve')), 'error'),
      },
    );
  };

  const openReject = (role: AdminApprovalRole, applicant: AdminApplicant): void => {
    setRejectReason('');
    setRejectTarget({ role, applicant });
  };

  const handleReject = (): void => {
    if (!rejectTarget) return;
    decision.mutate(
      { role: rejectTarget.role, id: rejectTarget.applicant.id, action: 'reject' },
      {
        onSuccess: (data) => {
          toast.show(data.message || t('approvals.rejected', 'Application rejected'), 'success');
          setRejectTarget(null);
          setRejectReason('');
        },
        onError: (err) => toast.show(getApiErrorMessage(err, t('approvals.rejectFailed', 'Could not reject')), 'error'),
      },
    );
  };

  const loading = feedQuery.isLoading && !totalPending;
  const error = feedQuery.isError && !totalPending;

  const renderCard = (role: AdminApprovalRole, applicant: AdminApplicant, key: RoleKey): React.JSX.Element => {
    const dateLabel = applicant.created_at
      ? formatDate(applicant.created_at, { day: 'numeric', month: 'short', year: 'numeric' })
      : undefined;
    return (
      <Card
        key={`${key}-${applicant.id}`}
        elevated={false}
        title={applicant.name}
        subtitle={applicant.email ?? undefined}
        leading={
          <Avatar uri={applicant.avatar_thumbnail_url} name={applicant.name} size="md" />
        }
        statusLabel={roleLabel(t, key)}
        statusVariant={roleBadgeVariant(key)}
      >
        <View style={styles.detailRow}>
          <Phone size={15} color={colors.textSubtle} />
          <AppText variant="caption" muted numberOfLines={1} style={styles.phoneText}>
            {applicant.phone || '—'}
          </AppText>
          {applicant.is_whatsapp ? (
            <Badge label={t('approvals.whatsapp', 'WhatsApp')} variant="success" style={styles.smallBadge} />
          ) : null}
        </View>
        {dateLabel ? (
          <AppText variant="small" style={{ color: colors.textSubtle }}>
            {t('approvals.registered', 'Registered {date}').replace('{date}', dateLabel)}
          </AppText>
        ) : null}

        <View style={styles.actions}>
          <Button
            title={t('approvals.approve', 'Approve')}
            variant="primary"
            size="sm"
            leftIcon={<Check size={15} color={colors.textOnPrimary} />}
            style={styles.flex}
            onPress={() => handleApprove(role, applicant)}
          />
          <Button
            title={t('approvals.reject', 'Reject')}
            variant="outline"
            size="sm"
            leftIcon={<X size={15} color={colors.danger} />}
            style={styles.flex}
            onPress={() => openReject(role, applicant)}
          />
        </View>
      </Card>
    );
  };

  const renderSection = (section: RoleSection): React.JSX.Element => {
    const applicants = applicantsFor(section.key, section.role);
    return (
      <View key={section.key} style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <AppText variant="h3">{section.iconEmoji}</AppText>
            <AppText variant="bodyBold">{roleLabel(t, section.key)}</AppText>
            <Badge label={String(section.count)} variant={roleBadgeVariant(section.key)} />
          </View>
        </View>
        {applicants.length === 0 ? (
          <EmptyState
            icon="✅"
            title={t('approvals.noPendingRole', 'No pending applications')}
            description={t('approvals.noPendingRoleDesc', 'This role has no pending requests.')}
            style={styles.roleEmpty}
          />
        ) : (
          <View style={styles.cards}>
            {applicants.map((a) => renderCard(section.role, a, section.key))}
          </View>
        )}
      </View>
    );
  };

  const renderBody = (): React.JSX.Element => {
    if (loading) return <Loading variant="full" />;
    if (error)
      return (
        <ErrorState
          error={feedQuery.error}
          fallback={t('approvals.loadFailed', 'Could not load applications')}
          onRetry={() => void feedQuery.refetch()}
        />
      );
    if (totalPending === 0)
      return (
        <EmptyState
          icon="✅"
          title={t('approvals.emptyTitle', 'No pending applications')}
          description={t('approvals.empty', 'There are no pending registration requests right now.')}
        />
      );
    return (
      <View style={styles.sections}>
        {sections.map((s) => renderSection(s))}
      </View>
    );
  };

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('approvals.title', 'Registration Requests')} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={feedQuery.isRefetching}
            onRefresh={() => void feedQuery.refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {totalPending > 0 ? (
          <View style={styles.totalRow}>
            <View style={[styles.totalIcon, { backgroundColor: colors.primary + '1A' }]}>
              <Users size={18} color={colors.primary} />
            </View>
            <AppText variant="body" muted>
              {t('approvals.total', '{count} pending applications').replace('{count}', String(totalPending))}
            </AppText>
          </View>
        ) : null}
        {renderBody()}
      </ScrollView>

      <Modal
        visible={rejectTarget != null}
        onClose={() => setRejectTarget(null)}
        title={t('approvals.rejectTitle', 'Reject application')}
      >
        <View style={styles.modalBody}>
          <AppText variant="body" muted>
            {t('approvals.rejectPrompt', 'Reject the application of "{name}"?').replace(
              '{name}',
              rejectTarget?.applicant.name ?? '',
            )}
          </AppText>
          <TextInput
            value={rejectReason}
            onChangeText={setRejectReason}
            placeholder={t('approvals.rejectReasonPlaceholder', 'Optional rejection reason...')}
            placeholderTextColor={colors.textSubtle}
            multiline
            numberOfLines={3}
            style={[
              styles.reasonInput,
              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text },
            ]}
          />
          <View style={styles.modalActions}>
            <Button
              title={t('common.cancel', 'Cancel')}
              variant="ghost"
              style={styles.flex}
              onPress={() => setRejectTarget(null)}
            />
            <Button
              title={t('approvals.reject', 'Reject')}
              variant="danger"
              style={styles.flex}
              loading={decision.isPending}
              onPress={handleReject}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scrollContent: { padding: spacing.lg, paddingBottom: spacing['4xl'] },
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  totalIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sections: { gap: spacing.xl },
  section: { gap: spacing.md },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  cards: { gap: spacing.md },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  phoneText: { flex: 1 },
  smallBadge: { paddingHorizontal: 8, paddingVertical: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  flex: { flex: 1 },
  roleEmpty: { paddingVertical: spacing.xl },
  modalBody: { gap: spacing.md },
  reasonInput: {
    minHeight: 72,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
});
