import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell, ChevronLeft } from 'lucide-react-native';

import { useNotifications } from '@/api/notifications';

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
  const { data: notifData } = useNotifications();
  const unreadCount = unreadCountOverride ?? notifData?.unread_count ?? 0;

  return (
    <View style={styles.headerContainer}>
      {/* Notification Bell with Badge on Left */}
      <TouchableOpacity
        style={styles.notifBtn}
        onPress={() => router.push('/(manager)/notifications')}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel="الإشعارات"
      >
        <Bell size={24} color="#0B192C" />
        {unreadCount > 0 && (
          <View style={styles.notifBadge}>
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
        <Text style={styles.headerLogoText}>AJI NQSSRO</Text>
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
          <Text style={styles.greetingPrefix}>مرحبا بك</Text>
          <Text style={styles.greetingManagerRole}>{roleLabel}</Text>
        </View>
        <Image
          source={require('../../../assets/dashboard-coach-avatar.png')}
          style={styles.coachAvatarImg}
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

  return (
    <View style={styles.titleSectionRow}>
      {/* Left side: Back button or custom action */}
      <View style={styles.leftSlot}>
        {showBack ? (
          <TouchableOpacity
            style={styles.backCircleBtn}
            onPress={onBackPress ?? (() => router.back())}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="رجوع"
          >
            <ChevronLeft size={26} color="#062F36" />
          </TouchableOpacity>
        ) : (
          leftAction
        )}
      </View>

      {/* Right side (RTL): Screen Title & Icon */}
      <View style={styles.titleTextCol}>
        <View style={styles.titleHeadingRow}>
          <Text style={styles.screenTitleText}>{title}</Text>
          {icon ? <View style={styles.greenIconBadge}>{icon}</View> : null}
        </View>
        {subtitle ? (
          <Text style={styles.screenSubtitleText}>{subtitle}</Text>
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
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
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
    width: 42,
    height: 34,
  },
  headerLogoText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#064E3B',
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
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },
  greetingManagerRole: {
    fontSize: 15,
    color: '#062F36',
    fontWeight: '900',
  },
  coachAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#22C55E',
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
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
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
    borderRadius: 17,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitleText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#062F36',
  },
  screenSubtitleText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
});
