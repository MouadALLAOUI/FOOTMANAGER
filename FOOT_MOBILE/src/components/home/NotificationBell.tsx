import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';

import { useUnreadNotificationCount } from '@/api/notifications';
import { useAuth } from '@/auth/AuthProvider';
import { notificationsPathForRole } from '@/navigation/tabs';
import { radius, sizes } from '@/theme/spacing';
import { useTheme } from '@/theme/ThemeProvider';
import { useI18n } from '@/i18n/I18nProvider';

interface Props {
  size?: 'sm' | 'md' | 'lg';
}

export function NotificationBell({ size = 'md' }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { role } = useAuth();
  const { data, isLoading } = useUnreadNotificationCount();

  const dim = size === 'sm' ? 36 : size === 'lg' ? 52 : 44;
  const count = data?.unread_count ?? 0;
  const hasUnread = !isLoading && count > 0;

  return (
    <Pressable
      onPress={() => router.push(notificationsPathForRole(role) as never)}
      accessibilityRole="button"
      accessibilityLabel={t('nav.notifications', 'الإشعارات')}
      accessibilityState={{ busy: isLoading }}
      hitSlop={sizes.hitSlop}
      style={({ pressed }) => [
        styles.base,
        { width: dim, height: dim, borderRadius: radius.full, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <Bell size={size === 'lg' ? 24 : 20} color={colors.text} />
      {hasUnread ? (
        <View style={[styles.badge, { backgroundColor: colors.danger }]}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { justifyContent: 'center', alignItems: 'center' },
  badge: {
    position: 'absolute',
    top: -2,
    end: -2,
    minWidth: 16,
    height: 16,
    borderRadius: radius.full,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
