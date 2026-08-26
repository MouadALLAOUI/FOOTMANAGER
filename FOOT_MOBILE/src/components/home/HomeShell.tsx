import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { roleLabel } from '@/auth/roles';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';
import { QuickActions, type QuickAction } from './QuickActions';
import { useState } from 'react';

interface Props {
  quickActions: QuickAction[];
  upcomingTitleKey?: string;
  upcomingFallback?: string;
}

export function HomeShell({ quickActions, upcomingTitleKey = 'home.upcoming', upcomingFallback = 'القادم' }: Props): React.JSX.Element {
  const { user, isActivityLocked, activityLock, refreshUser } = useAuth();
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const [refreshing, setRefreshing] = useState(false);

  const displayRole = user?.role ? roleLabel(user.role as never, locale as 'ar' | 'en' | 'fr') : '';
  const greeting = user?.name ? (locale === 'ar' ? `مرحباً ${user.name}` : locale === 'fr' ? `Bonjour ${user.name}` : `Welcome ${user.name}`) : t('home.welcome', 'مرحباً');

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    try {
      await refreshUser();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <Screen scroll={false} padded={false}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor={colors.primary} />}
      >
        <View style={styles.greetingWrap}>
          <Text style={[styles.greeting, { color: colors.text }]}>{greeting}</Text>
          {displayRole ? <Text style={[styles.role, { color: colors.primary }]}>{displayRole}</Text> : null}
          {user?.team && typeof user.team === 'object' ? (
            <Text style={[styles.team, { color: colors.textMuted }]}>{(user.team as Record<string, unknown>).name as string}</Text>
          ) : null}
        </View>

        {isActivityLocked ? (
          <View style={[styles.lockBanner, { backgroundColor: colors.amber + '14', borderColor: colors.amber + '30' }]}>
            <Text style={[styles.lockText, { color: colors.amber }]}>{t('profile.activityLocked', 'تم تقييد نشاط حسابك')}</Text>
            {activityLock.reason ? <Text style={[styles.lockReason, { color: colors.textMuted }]}>{activityLock.reason}</Text> : null}
          </View>
        ) : null}

        {user?.status && user.status !== 'approved' ? (
          <View style={[styles.statusCard, { backgroundColor: colors.amber + '14', borderColor: colors.amber + '30' }]}>
            <Text style={[styles.statusText, { color: colors.amber }]}>
              {user.status === 'pending' ? t('auth.pendingTitle', 'قيد المراجعة') : user.status === 'blocked' ? t('auth.blockedTitle', 'محظور') : t('auth.rejectedTitle', 'مرفوض')}
            </Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.quickActions', 'إجراءات سريعة')}</Text>
          <QuickActions actions={quickActions} />
        </View>

        <Card>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t(upcomingTitleKey, upcomingFallback)}</Text>
          <Text style={[styles.empty, { color: colors.textMuted }]}>{t('common.comingSoon', 'قريباً')}</Text>
          <Text style={[styles.hint, { color: colors.textSubtle }]}>{t('home.upcomingHint', 'ستظهر هنا الأنشطة القادمة.')}</Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing['3xl'] },
  greetingWrap: { gap: spacing.xs, paddingVertical: spacing.sm },
  greeting: { fontSize: 22, fontWeight: '800' },
  role: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  team: { fontSize: 13, fontWeight: '600' },
  lockBanner: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, gap: 4 },
  lockText: { fontSize: 12, fontWeight: '700' },
  lockReason: { fontSize: 11, lineHeight: 16 },
  statusCard: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, alignItems: 'center' },
  statusText: { fontSize: 12, fontWeight: '700' },
  section: { gap: spacing.md },
  sectionTitle: { fontSize: 13, fontWeight: '700' },
  empty: { fontSize: 13, textAlign: 'center', marginTop: spacing.sm, fontStyle: 'italic' },
  hint: { fontSize: 11, textAlign: 'center', lineHeight: 16 },
});
