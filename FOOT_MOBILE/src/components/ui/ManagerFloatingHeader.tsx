import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, ChevronLeft } from 'lucide-react-native';

import { useNotifications } from '@/api/notifications';
import { useTheme } from '@/theme/ThemeProvider';

export interface ManagerFloatingHeaderProps {
  /** Optional unread badge override; defaults to live useNotifications() count */
  unreadCountOverride?: number;
  /** Optional right-side greeting role label; defaults to 'مسيّر الفريق' */
  roleLabel?: string;
}

export function ManagerFloatingHeader({
  unreadCountOverride,
  roleLabel = 'مسيّر الفريق',
}: ManagerFloatingHeaderProps): React.JSX.Element {
  const router = useRouter();
  const { colors } = useTheme();
  const { data: notifData } = useNotifications();
  const unreadCount = unreadCountOverride ?? notifData?.unread_count ?? 0;

  return (
    <View style={[styles.headerContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {/* Notification Bell with Badge on Left */}
      <TouchableOpacity
        style={[styles.notifBtn, { backgroundColor: colors.bgMuted, borderColor: colors.border }]}
        onPress={() => router.push('/(manager)/notifications')}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="الإشعارات"
      >
        <Bell size={22} color={colors.charcoal} />
        {unreadCount > 0 && (
          <View style={[styles.notifBadge, { backgroundColor: colors.danger, borderColor: colors.surface }]}>
            <Text style={styles.notifBadgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      {/* AJI NQSSRO Center Logo */}
      <View style={styles.headerCenter}>
        <Image
          source={require('../../../assets/role-header-logo.png')}
          style={styles.headerLogoImg}
          resizeMode="contain"
        />
        <Text style={[styles.headerLogoText, { color: colors.charcoal }]}>AJI NQSSRO</Text>
      </View>

      {/* Manager Greeting & Avatar on Right (RTL) */}
      <TouchableOpacity
        style={styles.coachGreetingWrap}
        onPress={() => router.push('/(manager)/profile')}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="الملف الشخصي"
      >
        <View style={styles.coachGreetingTexts}>
          <Text style={[styles.greetingPrefix, { color: colors.textMuted }]}>مرحبا بك</Text>
          <Text style={[styles.greetingManagerRole, { color: colors.text }]}>{roleLabel}</Text>
        </View>
        <Image
          source={require('../../../assets/dashboard-coach-avatar.png')}
          style={[styles.coachAvatarImg, { borderColor: colors.primary }]}
          resizeMode="cover"
        />
      </TouchableOpacity>
    </View>
  );
}

export interface ManagerPageTitleProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  showBack?: boolean;
  onBackPress?: () => void;
  leftAction?: React.ReactNode;
}

export function ManagerPageTitle({
  title,
  subtitle,
  icon,
  showBack = false,
  onBackPress,
  leftAction,
}: ManagerPageTitleProps): React.JSX.Element {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={styles.titleSectionRow}>
      {/* Left side: Back button or custom action */}
      <View style={styles.leftSlot}>
        {showBack ? (
          <TouchableOpacity
            style={[styles.backCircleBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={onBackPress ?? (() => router.back())}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="رجوع"
          >
            <ChevronLeft size={24} color={colors.charcoal} />
          </TouchableOpacity>
        ) : (
          leftAction
        )}
      </View>

      {/* Right side (RTL): Screen Title & Icon */}
      <View style={styles.titleTextCol}>
        <View style={styles.titleHeadingRow}>
          <Text style={[styles.screenTitleText, { color: colors.text }]}>{title}</Text>
          {icon ? <View style={[styles.greenIconBadge, { backgroundColor: colors.primary }]}>{icon}</View> : null}
        </View>
        {subtitle ? (
          <Text style={[styles.screenSubtitleText, { color: colors.textMuted }]}>{subtitle}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 22,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 3,
    borderWidth: 1,
    shadowColor: '#101418',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1,
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  headerCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogoImg: {
    width: 38,
    height: 32,
  },
  headerLogoText: {
    fontSize: 12,
    fontWeight: '900',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  coachGreetingWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  coachGreetingTexts: {
    alignItems: 'flex-end',
  },
  greetingPrefix: {
    fontSize: 12,
    fontWeight: '600',
  },
  greetingManagerRole: {
    fontSize: 14,
    fontWeight: '900',
  },
  coachAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
  },
  titleSectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    marginTop: 4,
  },
  leftSlot: {
    minWidth: 44,
    alignItems: 'flex-start',
  },
  backCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    borderWidth: 1,
    shadowColor: '#101418',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  titleTextCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  titleHeadingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  greenIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitleText: {
    fontSize: 26,
    fontWeight: '900',
  },
  screenSubtitleText: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
});
