import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View, type ListRenderItem } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, CalendarCheck, CheckCheck, Heart, Swords, Trophy, UserPlus, Users } from 'lucide-react-native';

import {
  notificationTarget,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
  useNotifications,
  type AppNotification,
  type NotificationCategory,
} from '@/api/notifications';
import { useAuth } from '@/auth/AuthProvider';
import { AppText } from '@/components/ui/AppText';
import { List } from '@/components/ui/List';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n/I18nProvider';
import { palette, type ThemeColors } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';
import { useTheme } from '@/theme/ThemeProvider';

const categoryIcon: Record<NotificationCategory, typeof Bell> = {
  match: Swords,
  booking: CalendarCheck,
  tournament: Trophy,
  recruitment: UserPlus,
  team: Users,
  social: Heart,
  system: Bell,
};

const categoryColor: Record<NotificationCategory, keyof typeof palette> = {
  match: 'blue',
  booking: 'green',
  tournament: 'amber',
  recruitment: 'blue',
  team: 'green',
  social: 'amber',
  system: 'muted',
};

function categoryTint(category: NotificationCategory, colors: ThemeColors, isDark: boolean): string {
  if (category === 'system') return colors.bgMuted;
  const base = palette[categoryColor[category]];
  return isDark ? `${base}33` : `${base}1A`;
}

function CategoryIcon({ category }: { category: NotificationCategory }): React.JSX.Element {
  const { colors, isDark } = useTheme();
  const Icon = categoryIcon[category] ?? Bell;
  const tone = category === 'system' ? colors.textMuted : palette[categoryColor[category]];
  return (
    <View style={[styles.categoryIcon, { backgroundColor: categoryTint(category, colors, isDark) }]}>
      <Icon size={20} color={tone} />
    </View>
  );
}

export default function NotificationsScreen(): React.JSX.Element {
  const { t, formatRelativeTime } = useI18n();
  const { colors, isDark } = useTheme();
  const { show } = useToast();
  const router = useRouter();
  const { role } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, isError, error, refetch } = useNotifications();
  const markRead = useMarkNotificationAsRead();
  const markAllRead = useMarkAllNotificationsAsRead();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unread_count ?? 0;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handlePress = useCallback(
    (item: AppNotification) => {
      if (!item.is_read) markRead.mutate(item.id);
      const target = notificationTarget(item, role);
      if (target) router.push(target as never);
    },
    [markRead, role, router],
  );

  const handleMarkAllRead = useCallback(() => {
    markAllRead.mutate(undefined, {
      onError: () => show(t('notifications.markAllFailed', 'تعذر تحديث الإشعارات'), 'error'),
    });
  }, [markAllRead, show, t]);

  const renderItem: ListRenderItem<AppNotification> = useCallback(
    ({ item }) => {
      const unreadStyle = item.is_read
        ? { backgroundColor: colors.surface, borderColor: colors.border }
        : { backgroundColor: isDark ? palette.darkCard : '#f0fdf4', borderColor: palette.green + '55' };
      return (
        <Pressable
          onPress={() => handlePress(item)}
          accessibilityRole="button"
          accessibilityLabel={item.title}
          style={({ pressed }) => [styles.row, unreadStyle, pressed && { opacity: 0.95 }]}
        >
          <CategoryIcon category={item.category} />
          <View style={styles.rowBody}>
            <View style={styles.rowTitleWrap}>
              <AppText variant="bodyBold" numberOfLines={2} style={styles.rowTitle}>
                {item.title}
              </AppText>
              {!item.is_read ? <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} /> : null}
            </View>
            {item.body ? (
              <AppText variant="caption" muted numberOfLines={2}>
                {item.body}
              </AppText>
            ) : null}
            <AppText variant="small" style={styles.time}>
              {item.created_at ? formatRelativeTime(item.created_at) : ''}
            </AppText>
          </View>
          {!item.is_read ? (
            <View style={styles.rowAction}>
              <CheckCheck size={16} color={colors.primary} />
            </View>
          ) : null}
        </Pressable>
      );
    },
    [colors, isDark, handlePress, formatRelativeTime],
  );

  return (
    <Screen padded={false} scroll={false}>
      <ScreenHeader title={t('notifications.title', 'الإشعارات')} />
      {unreadCount > 0 ? (
        <Pressable
          onPress={handleMarkAllRead}
          accessibilityRole="button"
          accessibilityLabel={t('notifications.markAllRead', 'تحديد الكل كمقروء')}
          style={({ pressed }) => [styles.markAll, { opacity: pressed ? 0.8 : 1 }]}
        >
          <CheckCheck size={14} color={colors.primary} />
          <AppText variant="captionBold" style={{ color: colors.primary }}>
            {t('notifications.markAllRead', 'تحديد الكل كمقروء')}
          </AppText>
        </Pressable>
      ) : null}
      <List
        data={notifications}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        style={{ flex: 1 }}
        loading={isLoading && notifications.length === 0}
        error={isError ? error : null}
        onRetry={() => void refetch()}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        emptyIcon="🔔"
        emptyTitle={t('notifications.empty', 'لا توجد إشعارات')}
        emptyDescription={t('notifications.emptyDesc', 'ستظهر إشعاراتك هنا عندما تصل.')}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  markAll: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowBody: { flex: 1, gap: 2 },
  rowTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  rowTitle: { flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: radius.full },
  time: { marginTop: spacing.xs },
  rowAction: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
