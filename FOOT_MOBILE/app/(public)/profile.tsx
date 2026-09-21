import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  ChevronLeft,
  Globe,
  HelpCircle,
  LogIn,
  Moon,
  Shield,
  User,
  UserCheck,
  UserPlus,
} from 'lucide-react-native';

import { AjiNqssroHeader } from '@/components/ui/AjiNqssroHeader';
import { AjiNqssroTabBar } from '@/components/navigation/AjiNqssroTabBar';
import { useAuth } from '@/auth/AuthProvider';

export default function PublicProfileScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sessionState, user, logout } = useAuth();

  const isAuthenticated = sessionState === 'authenticated' && user;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <AjiNqssroHeader title="حسابي" subtitle="إدارة بياناتك وإعدادات التطبيق" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* User Card */}
        {isAuthenticated ? (
          <View style={styles.userCard}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
            <Text style={styles.userName}>{user.name}</Text>
            <Text style={styles.userRole}>
              {user.role === 'manager' ? 'مدير فريق' : 'لاعب'}
            </Text>

            <TouchableOpacity
              style={styles.switchRoleBtn}
              onPress={() => router.push('/(manager)')}
            >
              <Text style={styles.switchRoleText}>الدخول إلى لوحة المدير ➔</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.guestCard}>
            <View style={styles.guestIconBox}>
              <User size={36} color="#00875A" />
            </View>
            <Text style={styles.guestTitle}>مرحباً بك في أجي نقصرو!</Text>
            <Text style={styles.guestSubtitle}>
              سجل الدخول أو أنشئ حساباً جديداً لحجز الملاعب وتحدي الفرق
            </Text>

            <View style={styles.authButtonsRow}>
              <TouchableOpacity
                style={styles.loginActionBtn}
                onPress={() => router.push('/(auth)')}
                activeOpacity={0.88}
              >
                <LogIn size={16} color="#FFFFFF" />
                <Text style={styles.loginActionText}>تسجيل الدخول</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.registerActionBtn}
                onPress={() => router.push('/(auth)/register')}
                activeOpacity={0.88}
              >
                <UserPlus size={16} color="#00875A" />
                <Text style={styles.registerActionText}>إنشاء حساب جديد</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Settings Menu List */}
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuItem}>
            <ChevronLeft size={18} color="#94A3B8" />
            <View style={styles.menuItemRight}>
              <Text style={styles.menuItemTitle}>الإشعارات</Text>
              <Bell size={18} color="#00875A" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <ChevronLeft size={18} color="#94A3B8" />
            <View style={styles.menuItemRight}>
              <Text style={styles.menuItemTitle}>اللغة (العربية)</Text>
              <Globe size={18} color="#00875A" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <ChevronLeft size={18} color="#94A3B8" />
            <View style={styles.menuItemRight}>
              <Text style={styles.menuItemTitle}>مركز المساعدة والدعم</Text>
              <HelpCircle size={18} color="#00875A" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, { borderBottomWidth: 0 }]}>
            <ChevronLeft size={18} color="#94A3B8" />
            <View style={styles.menuItemRight}>
              <Text style={styles.menuItemTitle}>سياسة الخصوصية والشروط</Text>
              <Shield size={18} color="#00875A" />
            </View>
          </TouchableOpacity>
        </View>

        {isAuthenticated && (
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => logout()}
            activeOpacity={0.85}
          >
            <Text style={styles.logoutBtnText}>تسجيل الخروج</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Tab Bar */}
      <AjiNqssroTabBar mode="public" activeTab="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 24,
    paddingHorizontal: 16,
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 14,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarInitial: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  userName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  userRole: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  switchRoleBtn: {
    marginTop: 14,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  switchRoleText: {
    color: '#00875A',
    fontWeight: '800',
    fontSize: 13,
  },
  guestCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 14,
  },
  guestIconBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  guestTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#064E3B',
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 18,
  },
  authButtonsRow: {
    width: '100%',
    gap: 10,
    marginTop: 18,
  },
  loginActionBtn: {
    width: '100%',
    backgroundColor: '#00875A',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loginActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  registerActionBtn: {
    width: '100%',
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  registerActionText: {
    color: '#00875A',
    fontSize: 15,
    fontWeight: '800',
  },
  menuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 18,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  menuItemRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  menuItemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
  },
  logoutBtn: {
    marginTop: 16,
    backgroundColor: '#FEE2E2',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '800',
  },
});
