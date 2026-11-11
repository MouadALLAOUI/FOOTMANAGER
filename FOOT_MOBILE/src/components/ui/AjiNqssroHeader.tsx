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
import { useTheme } from '@/theme/ThemeProvider';

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
  const { colors } = useTheme();
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
              style={[styles.circleBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              accessibilityLabel="رجوع"
              accessibilityRole="button"
            >
              <ArrowLeft size={20} color={colors.charcoal} />
            </TouchableOpacity>
          )}

          {showAuthButtons && (
            <View style={styles.authGroup}>
              <TouchableOpacity
                onPress={() => router.push('/(auth)')}
                style={[styles.loginBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                accessibilityRole="button"
              >
                <Text style={[styles.loginBtnText, { color: colors.text }]}>دخول</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/register')}
                style={[styles.registerBtn, { backgroundColor: colors.primary }]}
                accessibilityRole="button"
              >
                <Text style={[styles.registerBtnText, { color: colors.charcoal }]}>إنشاء حساب</Text>
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
              <Menu size={24} color={colors.charcoal} />
            </TouchableOpacity>
          )}
        </View>

        {/* Center / Right Brand Logo */}
        <View style={styles.centerLogo}>
          <AjiNqssroLogo size={36} showText layout="vertical" color={colors.charcoal} textColor={colors.charcoal} />
        </View>

        {/* Custom right action if provided */}
        {rightAction ? (
          <View style={styles.rightActionWrap}>{rightAction}</View>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {/* Screen Title & Subtitle (Optional) */}
      {title ? (
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            {titleIcon && <View style={styles.titleIconWrap}>{titleIcon}</View>}
            <Text style={[styles.titleText, { color: colors.text }]}>{title}</Text>
          </View>
          {subtitle ? <Text style={[styles.subtitleText, { color: colors.textMuted }]}>{subtitle}</Text> : null}
        </View>
      ) : null}

      {/* Drawer Menu Modal */}
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
          <View style={[styles.drawerContent, { backgroundColor: colors.surface }]}>
            {/* Drawer Header */}
            <View style={[styles.drawerHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setIsMenuOpen(false)}
                style={[styles.closeBtn, { backgroundColor: colors.bgMuted }]}
                accessibilityRole="button"
                accessibilityLabel="إغلاق"
              >
                <X size={20} color={colors.text} />
              </TouchableOpacity>
              <AjiNqssroLogo size={32} showText={false} color={colors.charcoal} />
            </View>

            {/* Menu Links */}
            <View style={styles.menuList}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigateTo('/(public)')}
              >
                <ChevronLeft size={18} color={colors.textSubtle} />
                <View style={styles.menuItemLabelWrap}>
                  <Text style={[styles.menuItemText, { color: colors.text }]}>الرئيسية</Text>
                  <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(168, 255, 36, 0.15)' }]}>
                    <Home size={18} color={colors.charcoal} />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigateTo('/(public)/stadiums')}
              >
                <ChevronLeft size={18} color={colors.textSubtle} />
                <View style={styles.menuItemLabelWrap}>
                  <Text style={[styles.menuItemText, { color: colors.text }]}>الملاعب</Text>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#E0F2FE' }]}>
                    <MapPin size={18} color="#0284C7" />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigateTo('/(public)/challenges')}
              >
                <ChevronLeft size={18} color={colors.textSubtle} />
                <View style={styles.menuItemLabelWrap}>
                  <Text style={[styles.menuItemText, { color: colors.text }]}>التحديات</Text>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#FFEDD5' }]}>
                    <Flame size={18} color="#EA580C" />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigateTo('/(public)/tournaments')}
              >
                <ChevronLeft size={18} color={colors.textSubtle} />
                <View style={styles.menuItemLabelWrap}>
                  <Text style={[styles.menuItemText, { color: colors.text }]}>البطولات</Text>
                  <View style={[styles.menuIconCircle, { backgroundColor: '#FEF3C7' }]}>
                    <Trophy size={18} color="#D97706" />
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigateTo('/(public)/book-match')}
              >
                <ChevronLeft size={18} color={colors.textSubtle} />
                <View style={styles.menuItemLabelWrap}>
                  <Text style={[styles.menuItemText, { color: colors.text }]}>حجز موعد</Text>
                  <View style={[styles.menuIconCircle, { backgroundColor: 'rgba(168, 255, 36, 0.15)' }]}>
                    <Calendar size={18} color={colors.charcoal} />
                  </View>
                </View>
              </TouchableOpacity>

              <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => navigateTo('/(public)/profile')}
              >
                <ChevronLeft size={18} color={colors.textSubtle} />
                <View style={styles.menuItemLabelWrap}>
                  <Text style={[styles.menuItemText, { color: colors.text }]}>حسابي</Text>
                  <View style={[styles.menuIconCircle, { backgroundColor: colors.bgMuted }]}>
                    <User size={18} color={colors.textMuted} />
                  </View>
                </View>
              </TouchableOpacity>
            </View>

            {/* Bottom Drawer Actions */}
            <View style={[styles.drawerFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.drawerLoginBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}
                onPress={() => navigateTo('/(auth)')}
              >
                <Text style={[styles.drawerLoginText, { color: colors.text }]}>تسجيل الدخول</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.drawerRegisterBtn, { backgroundColor: colors.primary }]}
                onPress={() => navigateTo('/(auth)/register')}
              >
                <Text style={[styles.drawerRegisterText, { color: colors.charcoal }]}>حساب جديد</Text>
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
    paddingBottom: 10,
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
    borderRadius: 14,
    borderWidth: 1,
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
    borderRadius: 14,
    borderWidth: 1,
  },
  loginBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  registerBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
  },
  registerBtnText: {
    fontSize: 13,
    fontWeight: '800',
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
    fontWeight: '900',
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(16, 20, 24, 0.6)',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  drawerContent: {
    width: '78%',
    maxWidth: 320,
    height: '100%',
    paddingTop: 48,
    paddingHorizontal: 20,
    paddingBottom: 24,
    shadowColor: '#101418',
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
    marginBottom: 16,
  },
  closeBtn: {
    padding: 6,
    borderRadius: 10,
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
  },
  menuIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuDivider: {
    height: 1,
    marginVertical: 10,
  },
  drawerFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 8,
  },
  drawerLoginBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
  },
  drawerLoginText: {
    fontSize: 14,
    fontWeight: '700',
  },
  drawerRegisterBtn: {
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
  },
  drawerRegisterText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
