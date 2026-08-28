import { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import {
  Ban,
  Lock,
  LockOpen,
  Phone,
  Search,
  Unlock,
  Users,
} from 'lucide-react-native';

import {
  type AdminUser,
  type AdminUserRole,
  ALL_ADMIN_USER_ROLES,
  useAdminActivityLock,
  useAdminBlockToggle,
  useAdminUsers,
} from '@/api/adminUsers';
import { getApiErrorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { List } from '@/components/ui/List';
import { Modal } from '@/components/ui/Modal';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';

type ScopeKey = AdminUserRole;

const SCOPE_KEYS: ScopeKey[] = ['all', ...ALL_ADMIN_USER_ROLES];

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function roleLabel(t: ReturnType<typeof useI18n>['t'], role: string): string {
  const map: Record<string, string> = {
    manager: t('users.role.manager', 'Manager'),
    terrain_owner: t('users.role.owner', 'Terrain Owner'),
    committee: t('users.role.committee', 'Committee Member'),
    player: t('users.role.player', 'Player'),
  };
  return map[role] ?? map.manager ?? role;
}

function roleVariant(role: string): BadgeVariant {
  if (role === 'manager') return 'info';
  if (role === 'terrain_owner') return 'warning';
  if (role === 'committee') return 'neutral';
  return 'info';
}

function statusBadge(t: ReturnType<typeof useI18n>['t'], status: string): { label: string; variant: BadgeVariant } {
  const map: Record<string, { label: string; variant: BadgeVariant }> = {
    pending: { label: t('users.status.pending', 'Pending'), variant: 'warning' },
    approved: { label: t('users.status.approved', 'Active'), variant: 'success' },
    rejected: { label: t('users.status.rejected', 'Rejected'), variant: 'danger' },
    blocked: { label: t('users.status.blocked', 'Blocked'), variant: 'danger' },
  };
  return map[status] ?? { label: status, variant: 'neutral' };
}

export default function UsersScreen(): React.JSX.Element {
  const { t, formatDate } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();

  const [scope, setScope] = useState<ScopeKey>('all');
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput.trim(), 350);

  const usersQuery = useAdminUsers(scope, debouncedSearch);
  const blockToggle = useAdminBlockToggle();
  const activityLock = useAdminActivityLock();

  const [confirm, setConfirm] = useState<{ kind: 'block' | 'unblock' | 'unlock'; user: AdminUser } | null>(null);
  const [lockTarget, setLockTarget] = useState<AdminUser | null>(null);
  const [reason, setReason] = useState('');

  const users = usersQuery.data ?? [];

  const scopeLabel = (key: ScopeKey): string =>
    key === 'all' ? t('users.filter.all', 'All') : roleLabel(t, key);

  const runStatus = (kind: 'block' | 'unblock', user: AdminUser): void => {
    blockToggle.mutate(
      { role: user.role as Exclude<AdminUserRole, 'all'>, id: user.id, action: kind },
      {
        onSuccess: (data) => {
          toast.show(
            data.message ||
              (kind === 'block' ? t('users.blocked', 'Account blocked') : t('users.unblocked', 'Account unblocked')),
            'success',
          );
          setConfirm(null);
        },
        onError: (err) =>
          toast.show(
            getApiErrorMessage(err, kind === 'block' ? t('users.blockFailed', 'Could not block') : t('users.unblockFailed', 'Could not unblock')),
            'error',
          ),
      },
    );
  };

  const runLock = (user: AdminUser, action: 'lock' | 'unlock', lockReason?: string): void => {
    activityLock.mutate(
      { user, action, reason: lockReason },
      {
        onSuccess: (data) => {
          toast.show(
            data.message ||
              (action === 'lock' ? t('users.activityLocked', 'Activity restricted') : t('users.activityUnlocked', 'Activity unlocked')),
            'success',
          );
          setLockTarget(null);
          setReason('');
          setConfirm(null);
        },
        onError: (err) =>
          toast.show(
            getApiErrorMessage(
              err,
              action === 'lock' ? t('users.lockFailed', 'Could not restrict activity') : t('users.unlockFailed', 'Could not unlock activity'),
            ),
            'error',
          ),
      },
    );
  };

  const renderCard = ({ item }: { item: AdminUser }): React.JSX.Element => {
    const isBlocked = item.status === 'blocked';
    const isActive = item.status === 'approved';
    const status = statusBadge(t, item.status);
    const dateLabel = item.created_at
      ? formatDate(item.created_at, { year: 'numeric', month: 'short', day: 'numeric' })
      : undefined;

    return (
      <Card
        elevated
        title={item.name}
        subtitle={item.email ?? undefined}
        leading={<Avatar uri={item.avatar_thumbnail_url} name={item.name} size="md" />}
        statusLabel={status.label}
        statusVariant={status.variant}
      >
        <View style={styles.roleRow}>
          <Badge label={roleLabel(t, item.role)} variant={roleVariant(item.role)} />
          {item.activity_locked ? (
            <Badge label={t('users.activityLockedShort', 'Activity restricted')} variant="warning" />
          ) : null}
        </View>

        {item.phone ? (
          <View style={styles.detailRow}>
            <Phone size={15} color={colors.textSubtle} />
            <AppText variant="caption" muted numberOfLines={1} style={styles.phoneText}>
              {item.phone}
            </AppText>
          </View>
        ) : null}

        {item.activity_locked && item.activity_lock_reason ? (
          <AppText variant="small" style={{ color: colors.amber }}>
            {t('users.lockReasonLabel', 'Reason: {reason}').replace('{reason}', item.activity_lock_reason)}
          </AppText>
        ) : null}

        {dateLabel ? (
          <AppText variant="small" style={{ color: colors.textSubtle }}>
            {t('users.registered', 'Registered {date}').replace('{date}', dateLabel)}
          </AppText>
        ) : null}

        <View style={styles.actions}>
          {isActive && item.activity_locked ? (
            <Button
              title={t('users.unlockActivity', 'Unlock activity')}
              variant="outline"
              size="sm"
              leftIcon={<LockOpen size={15} color={colors.primary} />}
              style={styles.flex}
              onPress={() => setConfirm({ kind: 'unlock', user: item })}
            />
          ) : null}
          {isActive && !item.activity_locked ? (
            <Button
              title={t('users.lockActivity', 'Restrict activity')}
              variant="secondary"
              size="sm"
              leftIcon={<Lock size={15} color={colors.text} />}
              style={styles.flex}
              onPress={() => setLockTarget(item)}
            />
          ) : null}
          {isBlocked ? (
            <Button
              title={t('users.unblock', 'Unblock')}
              variant="primary"
              size="sm"
              leftIcon={<Unlock size={15} color={colors.textOnPrimary} />}
              style={styles.flex}
              onPress={() => setConfirm({ kind: 'unblock', user: item })}
            />
          ) : (
            <Button
              title={t('users.block', 'Block')}
              variant="danger"
              size="sm"
              leftIcon={<Ban size={15} color={colors.textOnPrimary} />}
              style={styles.flex}
              onPress={() => setConfirm({ kind: 'block', user: item })}
            />
          )}
        </View>
      </Card>
    );
  };

  const searchBar = (
    <View style={[styles.searchBar, { borderColor: colors.border, backgroundColor: colors.surface }]}>
      <Search size={17} color={colors.textSubtle} />
      <TextInput
        value={searchInput}
        onChangeText={setSearchInput}
        placeholder={t('users.searchPlaceholder', 'Search by name, phone or email...')}
        placeholderTextColor={colors.textSubtle}
        autoCorrect={false}
        returnKeyType="search"
        style={[styles.searchInput, { color: colors.text }]}
      />
    </View>
  );

  const confirmDialog =
    confirm && confirm.kind === 'block' ? (
      <ConfirmationDialog
        visible
        destructive
        title={t('users.blockTitle', 'Block account?')}
        description={t('users.blockPrompt', 'Block "{name}"? They will no longer be able to sign in.').replace('{name}', confirm.user.name)}
        confirmLabel={t('users.block', 'Block')}
        cancelLabel={t('common.cancel', 'Cancel')}
        loading={blockToggle.isPending}
        onConfirm={() => runStatus('block', confirm.user)}
        onCancel={() => setConfirm(null)}
      />
    ) : confirm && confirm.kind === 'unblock' ? (
      <ConfirmationDialog
        visible
        title={t('users.unblockTitle', 'Unblock account?')}
        description={t('users.unblockPrompt', 'Restore access for "{name}"?').replace('{name}', confirm.user.name)}
        confirmLabel={t('users.unblock', 'Unblock')}
        cancelLabel={t('common.cancel', 'Cancel')}
        loading={blockToggle.isPending}
        onConfirm={() => runStatus('unblock', confirm.user)}
        onCancel={() => setConfirm(null)}
      />
    ) : confirm && confirm.kind === 'unlock' ? (
      <ConfirmationDialog
        visible
        title={t('users.unlockTitle', 'Unlock activity?')}
        description={t('users.unlockPrompt', 'Allow "{name}" to use app features again?').replace('{name}', confirm.user.name)}
        confirmLabel={t('users.unlockActivity', 'Unlock activity')}
        cancelLabel={t('common.cancel', 'Cancel')}
        loading={activityLock.isPending}
        onConfirm={() => runLock(confirm.user, 'unlock')}
        onCancel={() => setConfirm(null)}
      />
    ) : null;

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('users.title', 'Users')} />

      <View style={styles.top}>
        {searchBar}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}
        >
          {SCOPE_KEYS.map((key) => {
            const active = key === scope;
            return (
              <Button
                key={key}
                title={scopeLabel(key)}
                size="sm"
                variant={active ? 'primary' : 'secondary'}
                onPress={() => setScope(key)}
                style={styles.chip}
              />
            );
          })}
        </ScrollView>
      </View>

      <List
        data={users}
        keyExtractor={(item) => `${item.role}-${item.id}`}
        renderItem={renderCard}
        loading={usersQuery.isLoading}
        error={usersQuery.error}
        errorTitle={t('users.loadFailedTitle', 'Could not load users')}
        errorFallback={t('users.loadFailed', 'Could not load users')}
        onRetry={() => void usersQuery.refetch()}
        onRefresh={() => void usersQuery.refetch()}
        refreshing={usersQuery.isRefetching}
        emptyIcon={<Users size={36} />}
        emptyTitle={t('users.emptyTitle', 'No users found')}
        emptyDescription={
          debouncedSearch
            ? t('users.noSearchResult', 'No users match your search.')
            : t('users.empty', 'No users found.')
        }
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />

      <Modal
        visible={lockTarget != null}
        onClose={() => setLockTarget(null)}
        title={t('users.lockTitle', 'Restrict activity')}
      >
        <View style={styles.modalBody}>
          <AppText variant="body" muted>
            {t('users.lockPrompt', 'Restrict activity for "{name}"?').
              replace('{name}', lockTarget?.name ?? '')}
          </AppText>
          <AppText variant="caption" muted>
            {t('users.lockHint', 'They stay logged in but cannot take actions until unlocked.')}
          </AppText>
          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder={t('users.lockReasonPlaceholder', 'Reason for restriction (required)...')}
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
              onPress={() => setLockTarget(null)}
            />
            <Button
              title={t('users.lockActivity', 'Restrict activity')}
              variant="danger"
              style={styles.flex}
              disabled={!reason.trim()}
              loading={activityLock.isPending}
              onPress={() => lockTarget && runLock(lockTarget, 'lock', reason.trim())}
            />
          </View>
        </View>
      </Modal>

      {confirmDialog}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    height: 44,
  },
  searchInput: { flex: 1, fontSize: 15 },
  chipScroll: { gap: spacing.sm, paddingBottom: spacing.xs },
  chip: { minWidth: 0 },
  listContent: { padding: spacing.lg, paddingBottom: spacing['4xl'] },
  roleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  phoneText: { flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.xs },
  flex: { flex: 1, minWidth: 120 },
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
