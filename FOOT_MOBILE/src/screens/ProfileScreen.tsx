import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { BadgeCheck, Building2, Mail, Phone, Settings, ShieldCheck, Users, LockKeyhole, Pencil, AlertTriangle } from 'lucide-react-native';
import { settingsPathForRole } from '@/navigation/tabs';

import { useAuth } from '@/auth/AuthProvider';
import { roleLabel } from '@/auth/roles';
import { AvatarPicker } from '@/components/profile/AvatarPicker';
import { ChangePasswordModal } from '@/components/profile/ChangePasswordModal';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';

export function ProfileScreen(): React.JSX.Element {
  const { user, isActivityLocked, refreshUser, role } = useAuth();
  const { colors } = useTheme();
  const { t, locale, isRTL } = useI18n();
  const router = useRouter();
  const [editVisible, setEditVisible] = useState(false);
  const [pwdVisible, setPwdVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleOpenSettings = (): void => {
    router.push(settingsPathForRole(role));
  };

  const canEdit = user?.status === 'approved' && !isActivityLocked;
  const displayRole = role ? roleLabel(role, locale as 'ar' | 'en' | 'fr') : user?.role ?? '—';

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    try {
      await refreshUser();
    } finally {
      setRefreshing(false);
    }
  };

  // Role-specific chip value
  const teamName =
    user?.team && typeof user.team === 'object' ? ((user.team as Record<string, unknown>).name as string | undefined) : undefined;
  const terrainsCount = Array.isArray(user?.terrains) ? user?.terrains.length : undefined;

  return (
    <Screen scroll={false} padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} />}
      >
        {/* ── Header: avatar + name + role ── */}
        <View style={[styles.headerCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AvatarPicker editable={canEdit} />
          <Text style={[styles.name, { color: colors.text }]}>{user?.name ?? '—'}</Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '30' }]}>
            <ShieldCheck size={12} color={colors.primary} />
            <Text style={[styles.roleText, { color: colors.primary }]}>{displayRole}</Text>
          </View>
          {user?.status && user.status !== 'approved' ? (
            <View style={[styles.statusChip, { backgroundColor: colors.amber + '14', borderColor: colors.amber + '30' }]}>
              <AlertTriangle size={12} color={colors.amber} />
              <Text style={[styles.statusText, { color: colors.amber }]}>
                {user.status === 'pending'
                  ? t('auth.pendingTitle', 'قيد المراجعة')
                  : user.status === 'blocked'
                    ? t('auth.blockedTitle', 'محظور')
                    : t('auth.rejectedTitle', 'مرفوض')}
              </Text>
            </View>
          ) : null}
          {teamName ? (
            <View style={[styles.teamChip, { backgroundColor: colors.bgMuted }]}>
              <Users size={12} color={colors.textMuted} />
              <Text style={[styles.teamText, { color: colors.textMuted }]}>{teamName}</Text>
            </View>
          ) : terrainsCount !== undefined ? (
            <View style={[styles.teamChip, { backgroundColor: colors.bgMuted }]}>
              <Building2 size={12} color={colors.textMuted} />
              <Text style={[styles.teamText, { color: colors.textMuted }]}>
                {isRTL ? `${terrainsCount} ملاعب` : `${terrainsCount} fields`}
              </Text>
            </View>
          ) : null}
        </View>

        {!canEdit && user?.status === 'approved' ? (
          <Text style={[styles.editHint, { color: colors.textMuted }]}>
            {t('profile.editDisabledLocked', 'التعديل معطل أثناء تقييد النشاط')}
          </Text>
        ) : null}

        {/* ── Info card ── */}
        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('profile.accountInfo', 'معلومات الحساب')}</Text>

          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '14' }]}>
              <Phone size={16} color={colors.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{t('auth.phone', 'الهاتف')}</Text>
              <Text style={[styles.rowValue, { color: colors.text }]}>{user?.phone ?? '—'}</Text>
            </View>
            {user?.is_whatsapp ? (
              <View style={[styles.whatsappBadge, { backgroundColor: colors.success + '14' }]}>
                <Text style={[styles.whatsappText, { color: colors.success }]}>WhatsApp</Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '14' }]}>
              <Mail size={16} color={colors.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{t('auth.email', 'البريد')}</Text>
              <Text style={[styles.rowValue, { color: colors.text }]}>{user?.email ?? '—'}</Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: colors.border }]} />

          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: colors.primary + '14' }]}>
              <BadgeCheck size={16} color={colors.primary} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowLabel, { color: colors.textMuted }]}>{t('profile.status', 'الحالة')}</Text>
              <Text style={[styles.rowValue, { color: colors.text }]}>
                {user?.status === 'approved'
                  ? t('profile.statusApproved', 'نشط')
                  : user?.status === 'pending'
                    ? t('profile.statusPending', 'قيد المراجعة')
                    : user?.status ?? '—'}
              </Text>
            </View>
          </View>
        </Card>

        {/* ── Actions ── */}
        <View style={styles.actions}>
          <Button
            title={t('profile.editProfile', 'تعديل الملف الشخصي')}
            onPress={() => setEditVisible(true)}
            variant="outline"
            disabled={!canEdit}
            leftIcon={<Pencil size={16} color={canEdit ? colors.text : colors.textSubtle} />}
            fullWidth
          />
          <Button
            title={t('profile.changePassword', 'تغيير كلمة المرور')}
            onPress={() => setPwdVisible(true)}
            variant="ghost"
            disabled={!canEdit}
            leftIcon={<LockKeyhole size={16} color={canEdit ? colors.text : colors.textSubtle} />}
            fullWidth
          />
          <Button
            title={t('settings.title', 'الإعدادات')}
            onPress={handleOpenSettings}
            variant="ghost"
            leftIcon={<Settings size={16} color={colors.text} />}
            fullWidth
          />
          <Link href="/(auth)/forgot-password" asChild>
            <Text style={StyleSheet.flatten([styles.forgotLink, { color: colors.primary }])}>{t('auth.forgotPassword', 'نسيت كلمة المرور؟')}</Text>
          </Link>
        </View>

        <Text style={[styles.footHint, { color: colors.textSubtle }]}>
          {t('profile.deferHint', 'إعدادات الفريق والملاعب المتقدمة متاحة على الويب.')}
        </Text>
      </ScrollView>

      <EditProfileModal visible={editVisible} onClose={() => setEditVisible(false)} />
      <ChangePasswordModal visible={pwdVisible} onClose={() => setPwdVisible(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['3xl'] },
  headerCard: {
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
  },
  name: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999, borderWidth: 1 },
  roleText: { fontSize: 11, fontWeight: '700' },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
  teamChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 9999 },
  teamText: { fontSize: 11, fontWeight: '600' },
  editHint: { fontSize: 11, textAlign: 'center', marginTop: -8 },
  sectionTitle: { fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconBox: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rowText: { flex: 1, gap: 2 },
  rowLabel: { fontSize: 11, fontWeight: '600' },
  rowValue: { fontSize: 13, fontWeight: '600' },
  whatsappBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999 },
  whatsappText: { fontSize: 10, fontWeight: '700' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 2 },
  actions: { gap: spacing.sm, alignItems: 'center' },
  forgotLink: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: spacing.xs },
  footHint: { fontSize: 11, textAlign: 'center', fontStyle: 'italic' },
});
