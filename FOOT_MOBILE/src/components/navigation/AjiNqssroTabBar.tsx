import React from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAuth } from '@/auth/AuthProvider';
import {
  CircleDot,
  Flame,
  Home,
  Landmark,
  Trophy,
  User,
  Users,
} from 'lucide-react-native';

interface TabItem {
  key: string;
  label: string;
  icon: (color: string, size: number) => React.ReactNode;
  route: string;
}

interface AjiNqssroTabBarProps {
  mode?: 'public' | 'manager';
  activeTab?: string;
}

export function AjiNqssroTabBar({
  mode = 'public',
  activeTab,
}: AjiNqssroTabBarProps): React.JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const { sessionState } = useAuth();

  const publicTabs: TabItem[] = [
    {
      key: 'home',
      label: 'الرئيسية',
      icon: (color, size) => <Home size={size} color={color} />,
      route: '/(public)',
    },
    {
      key: 'stadiums',
      label: 'الملاعب',
      icon: (color, size) => <Landmark size={size} color={color} />,
      route: '/(public)/stadiums',
    },
    {
      key: 'challenges',
      label: 'التحديات',
      icon: (color, size) => <Flame size={size} color={color} />,
      route: '/(public)/challenges',
    },
    {
      key: 'tournaments',
      label: 'البطولات',
      icon: (color, size) => <Trophy size={size} color={color} />,
      route: '/(public)/tournaments',
    },
    {
      key: 'profile',
      label: 'حسابي',
      icon: (color, size) => <User size={size} color={color} />,
      route: '/(public)/profile',
    },
  ];

  const managerTabs: TabItem[] = [
    {
      key: 'home',
      label: 'الرئيسية',
      icon: (color, size) => <Home size={size} color={color} />,
      route: '/(manager)',
    },
    {
      key: 'team',
      label: 'الفريق',
      icon: (color, size) => <Users size={size} color={color} />,
      route: '/(manager)/team',
    },
    {
      key: 'matches',
      label: 'المباريات',
      icon: (color, size) => <CircleDot size={size} color={color} />,
      route: '/(manager)/matches',
    },
    {
      key: 'tournaments',
      label: 'البطولات',
      icon: (color, size) => <Trophy size={size} color={color} />,
      route: '/(public)/tournaments',
    },
    {
      key: 'profile',
      label: 'حسابي',
      icon: (color, size) => <User size={size} color={color} />,
      route: '/(manager)/profile',
    },
  ];

  const tabs = mode === 'manager' ? managerTabs : publicTabs;

  return (
    <View style={styles.barContainer}>
      <View style={styles.tabsRow}>
        {tabs.map((tab) => {
          const isActive =
            activeTab === tab.key ||
            pathname === tab.route ||
            (tab.key === 'team' && (pathname.startsWith('/(manager)/team') || pathname === '/(manager)/team')) ||
            (tab.key === 'home' && (pathname === '/(public)' || pathname === '/(public)/' || pathname === '/' || pathname === '/(manager)' || pathname === '/(manager)/'));

          const iconColor = isActive ? '#00875A' : '#94A3B8';

          const handlePress = () => {
            if (mode === 'manager' && sessionState === 'pending') {
              if (tab.key === 'team' || tab.key === 'matches' || tab.key === 'tournaments') {
                Alert.alert(
                  'الخدمة مقفلة مؤقتًا',
                  'فريقك ما زال في انتظار موافقة الإدارة. ستتمكن من استخدام هذه الخدمة بعد قبول الطلب.'
                );
                return;
              }
            }
            router.push(tab.route as any);
          };

          if (mode === 'manager' && isActive) {
            return (
              <TouchableOpacity
                key={tab.key}
                style={styles.activePill}
                onPress={handlePress}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityState={{ selected: true }}
              >
                {tab.icon('#FFFFFF', 18)}
                <Text style={styles.activePillText}>{tab.label}</Text>
              </TouchableOpacity>
            );
          }

          return (
            <TouchableOpacity
              key={tab.key}
              style={styles.tabItem}
              onPress={handlePress}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
            >
              <View style={styles.iconWrap}>{tab.icon(iconColor, 22)}</View>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
              {isActive && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  barContainer: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0FDF4',
    paddingBottom: 22,
    paddingTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 2,
    position: 'relative',
  },
  iconWrap: {
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#94A3B8',
    marginTop: 2,
  },
  tabLabelActive: {
    color: '#00875A',
    fontWeight: '800',
  },
  activePill: {
    backgroundColor: '#00875A',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  activePillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  activeIndicator: {
    width: 16,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#00875A',
    position: 'absolute',
    top: -8,
  },
});
