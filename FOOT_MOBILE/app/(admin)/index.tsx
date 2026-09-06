import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell,
  CheckCircle,
  Clock,
  FileCheck,
  MapPin,
  Send,
  Shield,
  Sparkles,
  Terminal,
  Trophy,
  Users,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/auth/AuthProvider';
import { useAdminApprovalFeed } from '@/api/adminApprovals';
import { useTerrainCatalog } from '@/api/managerBookings';
import { usePublicTournaments } from '@/api/publicTournaments';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DebugLogsModal } from '@/components/debug/DebugLogsModal';
import { Screen } from '@/components/ui/Screen';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n/I18nProvider';
import { sendLocalTestNotification } from '@/services/notifications/push-notifications';
import { palette, roleAccents } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, sizes, spacing } from '@/theme/spacing';

export default function AdminHome(): React.JSX.Element {
  const { user } = useAuth();
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();

  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);

  const handleTestNotification = async () => {
    setTesting(true);
    setTestStatus(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await sendLocalTestNotification(
        '⚽ FootMANAGER Test Notification',
        'تذكير تجريبي من لوحة المشرف: تم حجز ملعب Oasis اليوم الساعة 18:00',
      );

      if (res.success) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTestStatus(t('admin.notifSuccess', 'تم إرسال الإشعار بنجاح!'));
        toast.show('🔔 تم إرسال الإشعار التجريبي بنجاح عبر الجهاز!', 'success');
      } else {
        setTestStatus(res.message);
        toast.show(res.message, 'info');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to send';
      setTestStatus(msg);
      toast.show(msg, 'error');
    } finally {
      setTesting(false);
    }
  };

  const greeting = user?.name
    ? locale === 'ar'
      ? `مرحباً المدير ${user.name} 👋`
      : `Welcome Admin ${user.name} 👋`
    : t('admin.welcome', 'لوحة تحكم المشرف 👋');

  const { data: approvalsData } = useAdminApprovalFeed();
  const { data: catalogData } = useTerrainCatalog();
  const { data: tournamentsData } = usePublicTournaments();

  const pendingCount =
    (approvalsData?.managers?.length ?? 0) +
    (approvalsData?.owners?.length ?? 0) +
    (approvalsData?.committees?.length ?? 0);

  const stadiumsCount = catalogData?.stadiums?.length ?? 0;
  const tournamentsCount = tournamentsData?.meta?.total ?? tournamentsData?.data?.length ?? 0;

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Admin Badge */}
        <View style={styles.header}>
          <View style={styles.headerTextWrap}>
            <View style={styles.badgeLine}>
              <Badge label={t('role.admin', 'المشرف العام')} variant="approved" />
            </View>
            <Text style={[styles.greetingTitle, { color: colors.text }]}>{greeting}</Text>
            <Text style={[styles.greetingSub, { color: colors.textMuted }]}>
              {t('admin.dashboardDesc', 'لوحة التحكم وإدارة المنصة والخدمات')}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/(admin)/profile' as never)}
            accessibilityRole="button"
            accessibilityLabel={t('nav.profile', 'الملف الشخصي')}
          >
            <Avatar uri={user?.avatar_thumbnail_url ?? user?.avatar_url} name={user?.name ?? 'Admin'} size="md" />
          </Pressable>
        </View>

        {/* Quick KPI Overview Grid */}
        <View style={styles.kpiGrid}>
          {/* Pending Approvals */}
          <Pressable
            onPress={() => router.push('/(admin)/approvals' as never)}
            style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: palette.amber + '40' }]}
          >
            <View style={[styles.kpiIconBox, { backgroundColor: palette.amber + '18' }]}>
              <Clock size={20} color={palette.amber} />
            </View>
            <Text style={[styles.kpiCount, { color: colors.text }]}>{pendingCount}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>
              {t('admin.pendingApprovals', 'طلبات معلقة')}
            </Text>
          </Pressable>

          {/* Registered Users */}
          <Pressable
            onPress={() => router.push('/(admin)/users' as never)}
            style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: palette.accentBlue + '40' }]}
          >
            <View style={[styles.kpiIconBox, { backgroundColor: palette.accentBlue + '18' }]}>
              <Users size={20} color={palette.accentBlue} />
            </View>
            <Text style={[styles.kpiCount, { color: colors.text }]}>
              {pendingCount > 0 ? `${pendingCount}+` : '—'}
            </Text>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>
              {t('admin.totalUsers', 'المستخدمين')}
            </Text>
          </Pressable>

          {/* Fields */}
          <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: palette.primaryGreen + '40' }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: palette.primaryGreen + '18' }]}>
              <MapPin size={20} color={palette.primaryGreen} />
            </View>
            <Text style={[styles.kpiCount, { color: colors.text }]}>{stadiumsCount}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>
              {t('admin.totalFields', 'الملاعب')}
            </Text>
          </View>

          {/* Tournaments */}
          <View style={[styles.kpiCard, { backgroundColor: colors.surface, borderColor: palette.navy + '40' }]}>
            <View style={[styles.kpiIconBox, { backgroundColor: palette.navy + '18' }]}>
              <Trophy size={20} color={palette.navy} />
            </View>
            <Text style={[styles.kpiCount, { color: colors.text }]}>{tournamentsCount}</Text>
            <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>
              {t('admin.totalTournaments', 'البطولات')}
            </Text>
          </View>
        </View>

        {/* Dedicated Notification Testing Center */}
        <Card style={styles.notificationTestCard}>
          <View style={styles.notifCardHeader}>
            <View style={[styles.notifIconWrap, { backgroundColor: palette.primaryGreen + '16' }]}>
              <Bell size={24} color={palette.primaryGreen} />
            </View>
            <View style={styles.notifTitleWrap}>
              <Text style={[styles.notifCardTitle, { color: colors.text }]}>
                {t('admin.notificationCenterTitle', 'مركز اختبار الإشعارات')}
              </Text>
              <Text style={[styles.notifCardSubtitle, { color: colors.textMuted }]}>
                {t('admin.notificationCenterDesc', 'إرسال إشعارات فورية عبر Expo Notifications وتأكيد وصولها على جهازك')}
              </Text>
            </View>
          </View>

          {testStatus ? (
            <View style={[styles.statusBanner, { backgroundColor: palette.primaryGreen + '12', borderColor: palette.primaryGreen + '30' }]}>
              <CheckCircle size={16} color={palette.primaryGreen} />
              <Text style={[styles.statusBannerText, { color: palette.darkGreen }]}>{testStatus}</Text>
            </View>
          ) : null}

          <Button
            title={t('admin.sendTestNotif', 'إرسال إشعار تجريبي (Test Notification)')}
            leftIcon={<Send size={18} color="#FFFFFF" />}
            onPress={() => void handleTestNotification()}
            loading={testing}
            disabled={testing}
            size="lg"
            fullWidth
          />
        </Card>

        {/* Dedicated App Logs & Bugs Inspector Card */}
        <Card style={[styles.notificationTestCard, { borderColor: palette.accentBlue + '40' }]}>
          <View style={styles.notifCardHeader}>
            <View style={[styles.notifIconWrap, { backgroundColor: palette.accentBlue + '16' }]}>
              <Terminal size={24} color={palette.accentBlue} />
            </View>
            <View style={styles.notifTitleWrap}>
              <Text style={[styles.notifCardTitle, { color: colors.text }]}>
                سجل أخطاء وعمليات التطبيق (Logs & Bugs)
              </Text>
              <Text style={[styles.notifCardSubtitle, { color: colors.textMuted }]}>
                معاينة جميع أخطاء التطبيق وطلبات الـ API لحظياً وتصديرها للتحليل
              </Text>
            </View>
          </View>

          <Button
            title="عرض سجل الأخطاء (Inspect Logs & Bugs)"
            variant="secondary"
            onPress={() => setShowLogsModal(true)}
            size="lg"
            fullWidth
          />
        </Card>

        {/* Quick Management Actions */}
        <View style={styles.sectionHeader}>
          <AppText variant="h2" style={{ color: colors.text }}>
            {t('home.quickActions', 'إجراءات سريعة')}
          </AppText>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            onPress={() => router.push('/(admin)/approvals' as never)}
            style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <FileCheck size={22} color={palette.primaryGreen} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>
              {t('nav.approvals', 'مراجعة طلبات التسجيل')}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => router.push('/(admin)/users' as never)}
            style={[styles.actionBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Users size={22} color={palette.accentBlue} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>
              {t('nav.users', 'إدارة المستخدمين والفرق')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      <DebugLogsModal visible={showLogsModal} onClose={() => setShowLogsModal(false)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  headerTextWrap: {
    flex: 1,
    gap: 4,
  },
  badgeLine: {
    alignSelf: 'flex-start',
    marginBottom: 2,
  },
  greetingTitle: {
    fontSize: 22,
    fontWeight: '800',
  },
  greetingSub: {
    fontSize: 13,
    fontWeight: '500',
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  kpiCard: {
    width: '47.5%',
    padding: spacing.md,
    borderRadius: radius.large,
    borderWidth: 1.5,
    gap: 4,
  },
  kpiIconBox: {
    width: 38,
    height: 38,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  kpiCount: {
    fontSize: 22,
    fontWeight: '800',
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  notificationTestCard: {
    padding: spacing.lg,
    borderRadius: radius.large,
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: palette.primaryGreen + '40',
  },
  notifCardHeader: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'flex-start',
  },
  notifIconWrap: {
    width: 48,
    height: 48,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifTitleWrap: {
    flex: 1,
    gap: 4,
  },
  notifCardTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  notifCardSubtitle: {
    fontSize: 12,
    lineHeight: 16,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    borderRadius: radius.medium,
    borderWidth: 1,
  },
  statusBannerText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  actionRow: {
    gap: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.large,
    borderWidth: 1.5,
    minHeight: sizes.touchTarget,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
});

