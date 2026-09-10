import { useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { Home, LayoutDashboard } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { useAuth } from '@/auth/AuthProvider';
import { homeForRole } from '@/auth/homeForRole';
import { DebugLogsModal } from '@/components/debug/DebugLogsModal';
import { useI18n } from '@/i18n/I18nProvider';
import { palette } from '@/theme/colors';
import { radius, sizes, spacing } from '@/theme/spacing';

export function ModeSwitchFAB(): React.JSX.Element | null {
  const pathname = usePathname();
  const router = useRouter();
  const { role, sessionState } = useAuth();
  const { t, isRTL } = useI18n();

  const [showLogs, setShowLogs] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPress = useRef(false);

  // Determine current context
  const inRoleDashboard =
    pathname.startsWith('/(player)') ||
    pathname.startsWith('/(manager)') ||
    pathname.startsWith('/(terrain)') ||
    pathname.startsWith('/(committee)') ||
    pathname.startsWith('/(admin)');

  const isAuthPage = pathname.startsWith('/(auth)');

  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (inRoleDashboard) {
      router.replace('/(public)');
    } else if (sessionState === 'authenticated' && role) {
      router.replace(homeForRole(role) as never);
    } else {
      router.replace('/(public)');
    }
  };

  // Draggable PanResponder setup with long-press support for Logs & Bugs inspector
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.hypot(gestureState.dx, gestureState.dy) > 10;
      },
      onPanResponderGrant: () => {
        didLongPress.current = false;
        pan.setOffset({
          x: (pan.x as unknown as { _value: number })._value,
          y: (pan.y as unknown as { _value: number })._value,
        });
        pan.setValue({ x: 0, y: 0 });

        // Start long-press timer to open Logs & Bug Inspector
        longPressTimer.current = setTimeout(() => {
          didLongPress.current = true;
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setShowLogs(true);
        }, 800);
      },
      onPanResponderMove: (evt, gestureState) => {
        if (Math.hypot(gestureState.dx, gestureState.dy) > 10 && longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        return Animated.event([null, { dx: pan.x, dy: pan.y }], {
          useNativeDriver: false,
        })(evt, gestureState);
      },
      onPanResponderRelease: () => {
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        pan.flattenOffset();
      },
    })
  ).current;

  const label = inRoleDashboard
    ? t('nav.goToLanding', 'الصفحة الرئيسية')
    : sessionState === 'authenticated'
      ? t('nav.goToDashboard', 'لوحة التحكم')
      : t('nav.home', 'الرئيسية');

  const Icon = inRoleDashboard
    ? Home
    : sessionState === 'authenticated'
      ? LayoutDashboard
      : Home;

  return (
    <>
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          styles.fabContainer,
          isRTL ? styles.fabLeft : styles.fabRight,
          {
            transform: [{ translateX: pan.x }, { translateY: pan.y }],
          },
        ]}
      >
        <Pressable
          onPress={handlePress}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityHint="اضغط للتنقل، اضغط مطولاً لفتح سجل الأخطاء"
          style={({ pressed }) => [
            styles.fabButton,
            {
              backgroundColor: palette.navy,
              opacity: pressed ? 0.92 : 1,
              transform: pressed ? [{ scale: 0.96 }] : [],
            },
          ]}
        >
          <View style={styles.iconCircle}>
            <Icon size={18} color="#FFFFFF" />
          </View>
          <Text style={styles.fabText}>{label}</Text>
        </Pressable>
      </Animated.View>

      <DebugLogsModal visible={showLogs} onClose={() => setShowLogs(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    bottom: 84, // Sits comfortably above bottom tab bars
    zIndex: 9999,
  },
  fabRight: {
    right: 16,
  },
  fabLeft: {
    left: 16,
  },
  fabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: palette.primaryGreen,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
    minHeight: sizes.touchTarget,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: palette.primaryGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
