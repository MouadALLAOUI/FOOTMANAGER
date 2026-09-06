import { useState, useRef } from 'react';
import {
  Dimensions,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import {
  Onboarding1Illustration,
  Onboarding2Illustration,
  Onboarding3Illustration,
} from '@/components/ui/illustrations';
import { useI18n } from '@/i18n/I18nProvider';
import { palette } from '@/theme/colors';
import { radius, spacing } from '@/theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Slide {
  id: string;
  illustration: React.ReactNode;
  titleKey: string;
  titleFallback: string;
}

export default function OnboardingScreen(): React.JSX.Element {
  const { t, isRTL } = useI18n();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides: Slide[] = [
    {
      id: '1',
      illustration: <Onboarding1Illustration width={SCREEN_WIDTH * 0.75} height={210} />,
      titleKey: 'onboarding.step1',
      titleFallback: 'ابحث واحجز ملاعب كرة القدم القريبة منك',
    },
    {
      id: '2',
      illustration: <Onboarding2Illustration width={SCREEN_WIDTH * 0.75} height={210} />,
      titleKey: 'onboarding.step2',
      titleFallback: 'نظّم مبارياتك مع أصدقائك بكل سهولة',
    },
    {
      id: '3',
      illustration: <Onboarding3Illustration width={SCREEN_WIDTH * 0.75} height={210} />,
      titleKey: 'onboarding.step3',
      titleFallback: 'كن جزءاً من مجتمع كروي أكبر',
    },
  ];

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentIndex(Math.max(0, Math.min(index, slides.length - 1)));
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({
        index: currentIndex + 1,
        animated: true,
      });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = () => {
    router.replace('/(public)');
  };

  return (
    <Screen padded={false}>
      <View style={styles.container}>
        {/* Top Header with Skip */}
        <View style={styles.topBar}>
          <Pressable
            onPress={handleFinish}
            accessibilityRole="button"
            accessibilityLabel={t('common.skip', 'تخطي')}
            hitSlop={12}
            style={styles.skipButton}
          >
            <Text style={styles.skipText}>{t('common.skip', 'تخطي')}</Text>
          </Pressable>
        </View>

        {/* Carousel Slides */}
        <FlatList
          ref={flatListRef}
          data={slides}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={[styles.slide, { width: SCREEN_WIDTH }]}>
              <View style={styles.illustrationWrap}>{item.illustration}</View>
              <Text style={styles.slideTitle}>{t(item.titleKey, item.titleFallback)}</Text>
            </View>
          )}
        />

        {/* Bottom Section: Dots + Next Button + Skip link */}
        <View style={styles.footer}>
          {/* Pagination Dots */}
          <View style={styles.dotsRow}>
            {slides.map((_, i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  currentIndex === i ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonGroup}>
            <Button
              title={
                currentIndex === slides.length - 1
                  ? t('common.getStarted', 'ابدأ الآن')
                  : t('common.next', 'التالي')
              }
              onPress={handleNext}
              size="lg"
              fullWidth
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    paddingVertical: spacing.lg,
  },
  topBar: {
    height: 44,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  skipButton: {
    padding: spacing.xs,
    minHeight: 44,
    justifyContent: 'center',
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.xl,
  },
  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 220,
  },
  slideTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: palette.navy,
    textAlign: 'center',
    lineHeight: 32,
    paddingHorizontal: spacing.md,
  },
  footer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    width: 24,
    backgroundColor: palette.primaryGreen,
  },
  dotInactive: {
    width: 8,
    backgroundColor: '#CBD5E1',
  },
  buttonGroup: {
    gap: spacing.sm,
  },
});
