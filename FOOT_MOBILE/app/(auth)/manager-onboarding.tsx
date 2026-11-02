import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Shirt,
  Trophy,
  Users,
} from 'lucide-react-native';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';

import { useI18n } from '@/i18n/I18nProvider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = Math.min(270, Math.round(SCREEN_HEIGHT * 0.35));

function StadiumBadgeIcon({
  size = 22,
  color = '#00875A',
  strokeWidth = 2.2,
}: {
  size?: number;
  color?: string;
  strokeWidth?: number;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Ellipse cx="12" cy="12" rx="9.5" ry="6.5" stroke={color} strokeWidth={strokeWidth} />
      <Path d="M12 5.5 L12 18.5" stroke={color} strokeWidth={strokeWidth * 0.8} />
      <Circle cx="12" cy="12" r="2.5" stroke={color} strokeWidth={strokeWidth * 0.8} />
      <Circle cx="7" cy="8" r="0.8" fill={color} />
      <Circle cx="17" cy="8" r="0.8" fill={color} />
      <Circle cx="7" cy="16" r="0.8" fill={color} />
      <Circle cx="17" cy="16" r="0.8" fill={color} />
    </Svg>
  );
}

interface FeatureBadge {
  id: string;
  icon: React.ReactNode;
  label: string;
}

interface ManagerSlide {
  id: string;
  heroImage: number;
  title: string;
  description: string;
  badges: FeatureBadge[];
}

const SLIDES: ManagerSlide[] = [
  {
    id: 'team',
    heroImage: require('../../assets/manager-hero-team.png'),
    title: 'أنشئ فريقك وأدره باحتراف',
    description: 'كل ما تحتاجه لإدارة فريقك في مكان واحد بشكل سهل ومنظم.',
    badges: [
      {
        id: 'players',
        icon: <Users size={22} color="#00875A" strokeWidth={2.4} />,
        label: 'إدارة\nاللاعبين',
      },
      {
        id: 'lineup',
        icon: <Shirt size={22} color="#00875A" strokeWidth={2.4} />,
        label: 'إدارة\nالتشكيلة',
      },
      {
        id: 'activity',
        icon: <BarChart3 size={22} color="#00875A" strokeWidth={2.4} />,
        label: 'متابعة\nنشاط الفريق',
      },
    ],
  },
  {
    id: 'booking',
    heroImage: require('../../assets/manager-hero-booking.png'),
    title: 'احجز ملعبك بسهولة',
    description: 'اكتشف الملاعب المتاحة، اختر الملعب والموعد المناسب، وأنجز حجز فريقك من التطبيق.',
    badges: [
      {
        id: 'stadiums',
        icon: <StadiumBadgeIcon size={22} color="#00875A" strokeWidth={2.4} />,
        label: 'اكتشاف\nالملاعب',
      },
      {
        id: 'timing',
        icon: <Calendar size={22} color="#00875A" strokeWidth={2.4} />,
        label: 'اختيار\nالموعد المناسب',
      },
      {
        id: 'guaranteed',
        icon: <CheckCircle2 size={22} color="#00875A" strokeWidth={2.4} />,
        label: 'حجز سريع\nومضمون',
      },
    ],
  },
  {
    id: 'leagues',
    heroImage: require('../../assets/manager-hero-leagues.png'),
    title: 'انضم إلى الدوريات المحلية بسرعة',
    description: 'اكتشف الدوريات والبطولات المحلية، سجّل فريقك عبر التطبيق، وتابع المجموعات والمباريات والترتيب.',
    badges: [
      {
        id: 'tournaments',
        icon: <Trophy size={22} color="#00875A" strokeWidth={2.4} />,
        label: 'اكتشاف\nالدوريات',
      },
      {
        id: 'register_team',
        icon: <Users size={22} color="#00875A" strokeWidth={2.4} />,
        label: 'تسجيل\nفريقك',
      },
      {
        id: 'standings',
        icon: <BarChart3 size={22} color="#00875A" strokeWidth={2.4} />,
        label: 'متابعة\nالمجموعات والنتائج',
      },
    ],
  },
];

export default function TeamManagerOnboardingScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isRTL } = useI18n();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // In RTL Arabic, forward is LEFT (<), backward is RIGHT (>)
  const NextChevron = isRTL ? ChevronLeft : ChevronRight;
  const BackChevron = isRTL ? ChevronRight : ChevronLeft;

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentIndex(Math.max(0, Math.min(index, SLIDES.length - 1)));
  };

  const handleNext = () => {
    if (currentIndex < SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      flatListRef.current?.scrollToIndex({
        index: prevIndex,
        animated: true,
      });
      setCurrentIndex(prevIndex);
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(auth)/account-type');
      }
    }
  };

  const handleFinish = () => {
    // Navigate directly to the existing Team Manager registration flow
    router.replace({
      pathname: '/(auth)/register',
      params: { role: 'manager' },
    } as never);
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* ─── Top Bar: Brand Logo & Skip Action ─── */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: insets.top + 6,
            direction: isRTL ? 'rtl' : 'ltr',
          },
        ]}
      >
        {/* Invisible placeholder for symmetrical centering */}
        <View style={styles.topSideSlot} />

        {/* Center AJI NQSSRO Brand Emblem & Name */}
        <View style={styles.brandCenter}>
          <Image
            source={require('../../assets/role-header-logo.png')}
            style={styles.brandLogo}
            resizeMode="contain"
          />
          <Text style={styles.brandName}>AJI NQSSRO</Text>
        </View>

        {/* Skip Action */}
        <Pressable
          onPress={handleFinish}
          style={({ pressed }) => [
            styles.skipButton,
            { opacity: pressed ? 0.6 : 1 },
          ]}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="تخطي"
        >
          <Text style={styles.skipText}>تخطي</Text>
        </Pressable>
      </View>

      {/* ─── Carousel Content: Horizontal Paging ─── */}
      <FlatList
        ref={flatListRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        keyExtractor={(item) => item.id}
        getItemLayout={(_, index) => ({
          length: SCREEN_WIDTH,
          offset: SCREEN_WIDTH * index,
          index,
        })}
        renderItem={({ item }) => (
          <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
            {/* 1. Hero Artwork Illustration */}
            <View style={styles.heroWrap}>
              <Image
                source={item.heroImage}
                style={styles.heroImage}
                resizeMode="contain"
              />
            </View>

            {/* 2. Text Content */}
            <View style={styles.contentWrap}>
              <Text style={styles.slideTitle}>{item.title}</Text>
              <Text style={styles.slideDescription}>{item.description}</Text>

              {/* 3. Horizontal Row of 3 Feature Badges */}
              <View style={[styles.badgesRow, { direction: isRTL ? 'rtl' : 'ltr' }]}>
                {item.badges.map((badge: FeatureBadge) => (
                  <View key={badge.id} style={styles.badgeCard}>
                    <View style={styles.badgeIconWrap}>{badge.icon}</View>
                    <Text style={styles.badgeLabel}>{badge.label}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      />

      {/* ─── Bottom Navigation Bar ─── */}
      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + 16,
            direction: isRTL ? 'rtl' : 'ltr',
          },
        ]}
      >
        {/* Back Button */}
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [
            styles.backButton,
            { opacity: pressed ? 0.6 : 1 },
          ]}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="رجوع"
        >
          <BackChevron size={18} color="#0B192C" strokeWidth={2.6} />
          <Text style={styles.backText}>رجوع</Text>
        </Pressable>

        {/* 3 Pagination Dots */}
        <View style={styles.dotsRow}>
          {SLIDES.map((_, i) => {
            const isActive = currentIndex === i;
            return (
              <View
                key={i}
                style={[
                  styles.dot,
                  isActive ? styles.dotActive : styles.dotInactive,
                ]}
              />
            );
          })}
        </View>

        {/* Next Circular Arrow OR Start Now Pill Button */}
        {currentIndex === SLIDES.length - 1 ? (
          <Pressable
            onPress={handleFinish}
            style={({ pressed }) => [
              styles.startNowButton,
              {
                opacity: pressed ? 0.88 : 1,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="ابدأ الآن"
          >
            <Text style={styles.startNowText}>ابدأ الآن</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [
              styles.nextCircularButton,
              {
                opacity: pressed ? 0.88 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel="التالي"
          >
            <NextChevron size={22} color="#FFFFFF" strokeWidth={3} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 10,
  },
  topSideSlot: {
    width: 48,
  },
  brandCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogo: {
    width: 42,
    height: 42,
  },
  brandName: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0B192C',
    letterSpacing: 1.2,
    marginTop: -2,
  },
  skipButton: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  slide: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroWrap: {
    width: '100%',
    height: HERO_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  contentWrap: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginTop: 6,
    flex: 1,
    justifyContent: 'flex-start',
  },
  slideTitle: {
    fontSize: Math.min(23, Math.round(SCREEN_WIDTH * 0.062)),
    fontWeight: '900',
    color: '#0B192C',
    textAlign: 'center',
    letterSpacing: -0.3,
    lineHeight: Platform.OS === 'android' ? 34 : 30,
  },
  slideDescription: {
    fontSize: Math.min(13, Math.round(SCREEN_WIDTH * 0.034)),
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
    paddingHorizontal: 12,
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 10,
    marginTop: 20,
  },
  badgeCard: {
    flex: 1,
    height: 82,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: 'rgba(226, 232, 240, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  badgeIconWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeLabel: {
    fontSize: Math.min(10.5, Math.round(SCREEN_WIDTH * 0.027)),
    fontWeight: '700',
    color: '#0B192C',
    textAlign: 'center',
    lineHeight: 14,
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 12,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 64,
  },
  backText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0B192C',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dot: {
    height: 7,
    borderRadius: 3.5,
  },
  dotActive: {
    width: 20,
    backgroundColor: '#00875A',
  },
  dotInactive: {
    width: 7,
    backgroundColor: '#E2E8F0',
  },
  nextCircularButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00875A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  startNowButton: {
    height: 48,
    paddingHorizontal: 24,
    borderRadius: 24,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00875A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  startNowText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
});
