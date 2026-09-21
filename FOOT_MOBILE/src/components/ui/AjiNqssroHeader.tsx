import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  Flame,
  Home,
  MapPin,
  Menu,
  Trophy,
  User,
  X,
} from 'lucide-react-native';
import { AjiNqssroLogo } from './AjiNqssroLogo';

interface AjiNqssroHeaderProps {
  showBack?: boolean;
  onBack?: () => void;
  title?: string;
  subtitle?: string;
  titleIcon?: React.ReactNode;
  showAuthButtons?: boolean;
  showMenu?: boolean;
  rightAction?: React.ReactNode;
}

export function AjiNqssroHeader({
  showBack = false,
  onBack,
  title,
  subtitle,
  titleIcon,
  showAuthButtons = false,
  showMenu = false,
  rightAction,
}: AjiNqssroHeaderProps): React.JSX.Element {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  const navigateTo = (path: string) => {
    setIsMenuOpen(false);
    router.push(path as any);
  };

  return (
    <View style={styles.headerContainer}>
      {/* Top row: Logo, Auth buttons or Back button */}
      <View style={styles.topRow}>
        {/* Left side actions */}
        <View style={styles.leftActions}>
          {showBack && (
            <TouchableOpacity
              onPress={handleBack}
              style={styles.circleBtn}
              accessibilityLabel="رجوع"
              accessibilityRole="button"
            >
              <ArrowLeft size={20} color="#1E293B" />
            </TouchableOpacity>
          )}

          {showAuthButtons && (
            <View style={styles.authGroup}>
              <TouchableOpacity
                onPress={() => router.push('/(auth)')}
                style={styles.loginBtn}
                accessibilityRole="button"
              >
                <Text style={styles.loginBtnText}>دخول</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/register')}
                style={styles.registerBtn}
                accessibilityRole="button"
              >
                <Text style={styles.registerBtnText}>إنشاء حساب</Text>
              </TouchableOpacity>
            </View>
          )}

          {showMenu && (
            <TouchableOpacity
              style={styles.menuBtn}
              onPress={() => setIsMenuOpen(true)}
              accessibilityRole="button"
              accessibilityLabel="القائمة"
            >
              <Menu size={24} color="#00875A" />
            </TouchableOpacity>
          )}
        </View>

        {/* Center / Right Brand Logo */}
        <View style={styles.centerLogo}>
          <AjiNqssroLogo size={36} showText layout="vertical" color="#00875A" textColor="#00875A" />
        </View>

        {/* Custom right action if provided */}
        {rightAction ? (
          <View style={styles.rightActionWrap}>{rightAction}</View>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {/* Optional Title / Subtitle section below top row */}
      {title && (
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            {titleIcon && <View style={styles.titleIconWrap}>{titleIcon}</View>}
            <Text style={styles.titleText}>{title}</Text>
          </View>
          {subtitle && <Text style={styles.subtitleText}>{subtitle}</Text>}
        </View>
      )}

      {/* Navigation Drawer Modal */}
      <Modal
        visible={isMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsMenuOpen(false)}
        >
          <View
            style={styles.drawerContent}
            onStartShouldSetResponder={() => true}
          >
            {/* Drawer Header */}
            <View style={styles.drawerHeader}>
              <TouchableOpacity
                onPress={() => setIsMenuOpen(false)}
                style={styles.closeBtn}
                accessibilityLabel="إغلاق"
              >
                <X size={22} color="#1E293B" />
              </TouchableOpacity>
              <AjiNqssroLogo size={32} showText color="#00875A" textColor="#00875A" />
            </View>

            {/* Menu Items */}
            <View style={styles.menuList}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigateTo('/')}
              >
                <ChevronLeft size={18} color="#94A3B8" />
                <View style={styles.menuItemLabelWrap}>
                  <Text style={styles.menuItemText}>الرئيسية</Text>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#F0FDF4' }]}>
                    <Home size={18} color="#00875A" />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigateTo('/(public)/stadiums')}
              >
                <ChevronLeft size={18} color="#94A3B8" />
                <View style={styles.menuItemLabelWrap}>
                  <Text style={styles.menuItemText}>الملاعب</Text>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#F0FDF4' }]}>
                    <MapPin size={18} color="#00875A" />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigateTo('/(public)/challenges')}
              >
                <ChevronLeft size={18} color="#94A3B8" />
                <View style={styles.menuItemLabelWrap}>
                  <Text style={styles.menuItemText}>التحديات الكروية</Text>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#FFF7ED' }]}>
                    <Flame size={18} color="#EA580C" />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigateTo('/(public)/tournaments')}
              >
                <ChevronLeft size={18} color="#94A3B8" />
                <View style={styles.menuItemLabelWrap}>
                  <Text style={styles.menuItemText}>البطولات</Text>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#FEF3C7' }]}>
                    <Trophy size={18} color="#D97706" />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigateTo('/(public)/book-match')}
              >
                <ChevronLeft size={18} color="#94A3B8" />
                <View style={styles.menuItemLabelWrap}>
                  <Text style={styles.menuItemText}>حجز ماتش جديد</Text>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#F0FDF4' }]}>
                    <Calendar size={18} color="#00875A" />
                  </View>
                </View>
              </TouchableOpacity>

              <View style={styles.menuDivider} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigateTo('/(public)/profile')}
              >
                <ChevronLeft size={18} color="#94A3B8" />
                <View style={styles.menuItemLabelWrap}>
                  <Text style={styles.menuItemText}>حسابي</Text>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#EFF6FF' }]}>
                    <User size={18} color="#0284C7" />
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Auth Buttons inside Drawer */}
            <View style={styles.drawerFooter}>
              <TouchableOpacity
                style={styles.drawerLoginBtn}
                onPress={() => navigateTo('/(auth)')}
              >
                <Text style={styles.drawerLoginText}>تسجيل الدخول</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.drawerRegisterBtn}
                onPress={() => navigateTo('/(auth)/register')}
              >
                <Text style={styles.drawerRegisterText}>إنشاء حساب جديد</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0FDF4',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loginBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  loginBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  registerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#00875A',
  },
  registerBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  menuBtn: {
    padding: 6,
    marginLeft: 4,
  },
  centerLogo: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 40,
  },
  rightActionWrap: {
    minWidth: 40,
    alignItems: 'flex-end',
  },
  titleSection: {
    marginTop: 10,
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  titleIconWrap: {
    marginLeft: 6,
  },
  titleText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#065F46',
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  drawerContent: {
    width: '78%',
    maxWidth: 320,
    height: '100%',
    backgroundColor: '#FFFFFF',
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 12,
  },
  drawerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 16,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  menuList: {
    flex: 1,
    gap: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  menuItemLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  drawerFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  drawerLoginBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#00875A',
    alignItems: 'center',
  },
  drawerLoginText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#00875A',
  },
  drawerRegisterBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#00875A',
    alignItems: 'center',
  },
  drawerRegisterText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
