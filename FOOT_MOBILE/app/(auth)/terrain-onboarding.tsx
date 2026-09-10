import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Calendar,
  Clock,
  FilePlus,
  Heart,
  Plus,
  ShieldCheck,
} from 'lucide-react-native';
import Svg, {
  Circle,
  Ellipse,
  G,
  Path,
  Rect,
} from 'react-native-svg';

import { Screen } from '@/components/ui/Screen';
import { AjiNqssroLogo, AjiNqssroMark } from '@/components/ui/AjiNqssroLogo';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';

// ─── Stadium Badge Icon ───────────────────────────────────────────────
function StadiumBadgeIcon({ size = 14, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Ellipse cx="12" cy="12" rx="10" ry="7" stroke={color} strokeWidth="1.8" />
      <Ellipse cx="12" cy="12" rx="6" ry="4" stroke={color} strokeWidth="1.3" strokeDasharray="2 1.5" />
      <Path d="M12 8 L12 16" stroke={color} strokeWidth="1.3" />
    </Svg>
  );
}

// ─── Realistic Pen SVG ────────────────────────────────────────────────
function PenSvg({ size = 42 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 80 80" fill="none">
      <G transform="rotate(-40 40 40)">
        <Rect x="36" y="10" width="8" height="50" rx="4" fill="#1E293B" />
        <Rect x="35" y="18" width="10" height="14" rx="2" fill="#475569" />
        <Path d="M44 20 L48 24 L48 36 L44 34" stroke="#94A3B8" strokeWidth="1.5" fill="#CBD5E1" />
        <Path d="M36 60 L40 72 L44 60 Z" fill="#0F172A" />
      </G>
    </Svg>
  );
}

// ─── Curved Transition Arrow ─────────────────────────────────────────
function CurvedTransitionArrow() {
  return (
    <Svg width={36} height={30} viewBox="0 0 46 40" fill="none">
      <Path
        d="M6 34 C12 12, 28 8, 38 16"
        stroke="#10B981"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <Path
        d="M30 11 L40 16 L37 26"
        stroke="#10B981"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export default function TerrainOnboardingScreen(): React.JSX.Element {
  const { isRTL } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ ownerName?: string }>();
  const ownerName = params.ownerName || 'محمد';

  // Toggle for bookings in notebook
  const [hasBookings, setHasBookings] = useState<'yes' | 'no'>('yes');

  const ForwardArrow = isRTL ? ArrowLeft : ArrowRight;

  const handleStart = () => {
    // Flow logic:
    // If has bookings: terrain infos -> then bookings
    // If no bookings: just terrain infos -> then dashboard
    router.push({
      pathname: '/(auth)/stadium-setup',
      params: {
        ownerName,
        flow: hasBookings === 'yes' ? 'with_bookings' : 'no_bookings',
      },
    } as never);
  };

  const handleSkip = () => {
    router.replace('/(terrain)');
  };

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mainContent}>
          {/* Top Header Bar */}
          <View style={styles.topHeaderBar}>
            <AjiNqssroLogo size={36} layout="horizontal" />

            <View style={styles.roleBadge}>
              <StadiumBadgeIcon size={14} color="#FFFFFF" />
              <Text style={styles.roleBadgeText}>صاحب ملعب</Text>
            </View>
          </View>

          {/* Hero Title & Subtitle */}
          <View style={styles.heroSection}>
            <Text style={[styles.heroMainTitle, { color: colors.text }]}>
              خدم ملعبك <Text style={{ color: '#059669' }}>بأسهل طريقة</Text>
            </Text>

            <Text style={styles.heroSubtitle}>
              ما تبدلش عادتك فاليوم الأول... بدا خطوة بخطوة، وخلي أجي نقصرو يتكلف بالباقي.
            </Text>
          </View>

          {/* ── Comparison Banner: Notebook vs Mobile Screen ── */}
          <View style={styles.comparisonContainer}>
            {/* Left: Physical Notebook ("دفتر الحجوزات") */}
            <View style={styles.notebookCard}>
              <View style={styles.spiralColumn}>
                {[...Array(5)].map((_, i) => (
                  <View key={i} style={styles.spiralRing} />
                ))}
              </View>

              <View style={styles.notebookContent}>
                <Text style={styles.notebookHeader}>دفتر الحجوزات</Text>
                <View style={styles.notebookLine} />

                <View style={styles.notebookRows}>
                  <View style={styles.notebookRow}>
                    <Text style={styles.notebookTime}>16:00</Text>
                    <Text style={styles.notebookStatusBooked}>محجوز</Text>
                  </View>
                  <View style={styles.notebookRow}>
                    <Text style={styles.notebookTime}>17:00</Text>
                    <Text style={styles.notebookStatusBooked}>محجوز</Text>
                  </View>
                  <View style={styles.notebookRow}>
                    <Text style={styles.notebookTime}>18:00</Text>
                    <Text style={styles.notebookStatusBooked}>محجوز</Text>
                  </View>
                  <View style={styles.notebookRow}>
                    <Text style={styles.notebookTime}>19:00</Text>
                    <Text style={styles.notebookStatusAvailable}>متاح</Text>
                  </View>
                </View>
              </View>

              <View style={styles.penOverlay}>
                <PenSvg size={42} />
              </View>
            </View>

            {/* Center: Curving Green Arrow */}
            <View style={styles.arrowBetween}>
              <CurvedTransitionArrow />
            </View>

            {/* Right: Mobile Phone Frame */}
            <View style={styles.phoneFrame}>
              <View style={styles.phoneSpeaker} />

              <View style={styles.phoneScreen}>
                <View style={styles.phoneScreenHeader}>
                  <AjiNqssroMark size={16} color="#059669" />
                  <Text style={styles.phoneBrandText}>جدول الملعب</Text>
                </View>

                <View style={styles.phoneSlots}>
                  <View style={styles.phoneSlotRow}>
                    <Text style={styles.phoneSlotTime}>16:00</Text>
                    <View style={[styles.slotBadge, styles.slotAvailable]}>
                      <Text style={styles.slotAvailableText}>متاح ✓</Text>
                    </View>
                  </View>

                  <View style={styles.phoneSlotRow}>
                    <Text style={styles.phoneSlotTime}>17:00</Text>
                    <View style={[styles.slotBadge, styles.slotBooked]}>
                      <Text style={styles.slotBookedText}>محجوز</Text>
                    </View>
                  </View>

                  <View style={styles.phoneSlotRow}>
                    <Text style={styles.phoneSlotTime}>18:00</Text>
                    <View style={[styles.slotBadge, styles.slotAvailable]}>
                      <Text style={styles.slotAvailableText}>متاح ✓</Text>
                    </View>
                  </View>

                  <View style={styles.phoneSlotRow}>
                    <Text style={styles.phoneSlotTime}>19:00</Text>
                    <View style={[styles.slotBadge, styles.slotNew]}>
                      <Plus size={10} color="#2563EB" />
                      <Text style={styles.slotNewText}>حجز جديد</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Floating Callout */}
          <View style={styles.speechBubbleWrap}>
            <View style={styles.speechBubble}>
              <Text style={styles.speechBubbleText}>نفس الملعب، لكن بطريقة أسهل</Text>
              <Heart size={14} color="#059669" fill="#059669" />
            </View>
          </View>

          {/* ── Benefits Section: "شنو غتستفيد؟" ── */}
          <View style={styles.benefitsCard}>
            <Text style={styles.benefitsHeaderTitle}>شنو غتستفيد؟</Text>

            <View style={styles.benefitsGrid}>
              <View style={styles.benefitItem}>
                <View style={[styles.benefitIconWrap, { backgroundColor: '#DCFCE7' }]}>
                  <ShieldCheck size={20} color="#059669" />
                </View>
                <View style={styles.benefitTextCol}>
                  <Text style={styles.benefitItemTitle}>تفادي التداخل</Text>
                  <Text style={styles.benefitItemDesc}>تلافي أي تضارب</Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <View style={[styles.benefitIconWrap, { backgroundColor: '#E0F2FE' }]}>
                  <Clock size={20} color="#0284C7" />
                </View>
                <View style={styles.benefitTextCol}>
                  <Text style={styles.benefitItemTitle}>توفير الوقت</Text>
                  <Text style={styles.benefitItemDesc}>كلشي فمكان واحد</Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <View style={[styles.benefitIconWrap, { backgroundColor: '#FEF3C7' }]}>
                  <Calendar size={20} color="#D97706" />
                </View>
                <View style={styles.benefitTextCol}>
                  <Text style={styles.benefitItemTitle}>تنظيم أفضل</Text>
                  <Text style={styles.benefitItemDesc}>تتبع الحجوزات</Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <View style={[styles.benefitIconWrap, { backgroundColor: '#F3E8FF' }]}>
                  <Bell size={20} color="#9333EA" />
                </View>
                <View style={styles.benefitTextCol}>
                  <Text style={styles.benefitItemTitle}>إشعارات فورية</Text>
                  <Text style={styles.benefitItemDesc}>إشعار بكل حجز</Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── Notebook Booking Transition Prompt ── */}
          <View style={styles.migrationCard}>
            <View style={styles.migrationRightInfo}>
              <View style={styles.migrationIconWrap}>
                <FilePlus size={20} color="#059669" />
              </View>
              <View style={styles.migrationTextWrap}>
                <Text style={styles.migrationTitle}>عندك حجوزات مسجلة فالدفتر؟</Text>
                <Text style={styles.migrationSubtitle}>
                  فقط أخبرنا لتنظيمها وتفادي أي تداخل.
                </Text>
              </View>
            </View>

            {/* Toggle buttons */}
            <View style={styles.toggleButtonsCol}>
              <Pressable
                onPress={() => setHasBookings('yes')}
                style={[
                  styles.toggleBtn,
                  hasBookings === 'yes' ? styles.toggleBtnActive : styles.toggleBtnInactive,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ checked: hasBookings === 'yes' }}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    hasBookings === 'yes' ? styles.toggleBtnTextActive : styles.toggleBtnTextInactive,
                  ]}
                >
                  عندي حجوزات اليوم ✓
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setHasBookings('no')}
                style={[
                  styles.toggleBtn,
                  hasBookings === 'no' ? styles.toggleBtnActive : styles.toggleBtnInactive,
                ]}
                accessibilityRole="radio"
                accessibilityState={{ checked: hasBookings === 'no' }}
              >
                <Text
                  style={[
                    styles.toggleBtnText,
                    hasBookings === 'no' ? styles.toggleBtnTextActive : styles.toggleBtnTextInactive,
                  ]}
                >
                  ما عنديش حجوزات حالياً
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* ── Main Action Buttons ── */}
        <View style={styles.actionsWrap}>
          <Pressable
            onPress={handleStart}
            style={({ pressed }) => [
              styles.startBtn,
              { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
            accessibilityRole="button"
            accessibilityLabel="متابعة"
          >
            <Text style={styles.startBtnText}>متابعة لإعداد الملعب</Text>
            <ForwardArrow size={20} color="#FFFFFF" strokeWidth={2.6} />
          </Pressable>

          <Pressable
            onPress={handleSkip}
            style={styles.skipBtn}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="يمكن لاحقاً"
          >
            <Clock size={15} color="#64748B" />
            <Text style={styles.skipBtnText}>يمكن لاحقاً (الانتقال للوحة التحكم)</Text>
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  mainContent: {
    gap: 12,
  },
  topHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#059669',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  heroSection: {
    alignItems: 'center',
    gap: 4,
    marginVertical: 2,
  },
  heroMainTitle: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 340,
  },
  // Comparison Container
  comparisonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    width: '100%',
    marginVertical: 4,
  },
  notebookCard: {
    flex: 1,
    backgroundColor: '#FFFDF8',
    borderRadius: 14,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    padding: 10,
    position: 'relative',
    minHeight: 155,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  spiralColumn: {
    position: 'absolute',
    start: 5,
    top: 10,
    bottom: 10,
    justifyContent: 'space-around',
    width: 6,
  },
  spiralRing: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#64748B',
  },
  notebookContent: {
    marginStart: 12,
  },
  notebookHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'right',
    marginBottom: 4,
  },
  notebookLine: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 6,
  },
  notebookRows: {
    gap: 4,
  },
  notebookRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    paddingBottom: 3,
  },
  notebookTime: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  notebookStatusBooked: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
  },
  notebookStatusAvailable: {
    fontSize: 11,
    fontWeight: '700',
    color: '#059669',
  },
  penOverlay: {
    position: 'absolute',
    bottom: -6,
    start: -4,
  },
  arrowBetween: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  phoneFrame: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 6,
    minHeight: 155,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  phoneSpeaker: {
    width: 24,
    height: 3,
    backgroundColor: '#334155',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  phoneScreen: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 7,
    flex: 1,
  },
  phoneScreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 5,
  },
  phoneBrandText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#059669',
  },
  phoneSlots: {
    gap: 4,
  },
  phoneSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phoneSlotTime: {
    fontSize: 9.5,
    fontWeight: '600',
    color: '#334155',
  },
  slotBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 4,
  },
  slotAvailable: {
    backgroundColor: '#DCFCE7',
  },
  slotAvailableText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#166534',
  },
  slotBooked: {
    backgroundColor: '#FEE2E2',
  },
  slotBookedText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#991B1B',
  },
  slotNew: {
    backgroundColor: '#EFF6FF',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  slotNewText: {
    fontSize: 8.5,
    fontWeight: '700',
    color: '#1D4ED8',
  },
  speechBubbleWrap: {
    alignItems: 'center',
    marginTop: -2,
  },
  speechBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  speechBubbleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  // Benefits Card
  benefitsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
    gap: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  benefitsHeaderTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  benefitsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
  },
  benefitItem: {
    width: '48.5%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  benefitIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitTextCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  benefitItemTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  benefitItemDesc: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '600',
  },
  // Migration Card
  migrationCard: {
    backgroundColor: '#F0FDF4',
    borderColor: '#BBF7D0',
    borderWidth: 1.2,
    borderRadius: 16,
    padding: 12,
    gap: 10,
    width: '100%',
  },
  migrationRightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  migrationIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  migrationTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  migrationTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#065F46',
    textAlign: 'right',
  },
  migrationSubtitle: {
    fontSize: 11,
    color: '#047857',
    textAlign: 'right',
    marginTop: 2,
  },
  toggleButtonsCol: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  toggleBtn: {
    flex: 1,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  toggleBtnActive: {
    backgroundColor: '#059669',
  },
  toggleBtnInactive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  toggleBtnText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  toggleBtnTextInactive: {
    color: '#475569',
  },
  // Actions
  actionsWrap: {
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    width: '100%',
  },
  startBtn: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    backgroundColor: '#059669',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#059669',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  startBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
  },
  skipBtnText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '700',
  },
});

