import { useEffect, useState, type ReactNode } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { useAuth } from '@/auth/AuthProvider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Brand palette (Navy #0B192C, Primary green #00875A, Accent green #22C55E)
const BRAND_NAVY = '#0B192C';
const ACCENT_GREEN = '#22C55E';
const MIN_SPLASH_DURATION_MS = 3000;

export function SessionRestoreGate({ children }: { children: ReactNode }): React.JSX.Element {
  const { isLoading } = useAuth();
  const [visible, setVisible] = useState(true);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // Entrance animations using useState to comply with React 19 render rules
  const [contentFade] = useState(() => new Animated.Value(0));
  const [contentScale] = useState(() => new Animated.Value(0.92));
  const [subtitleFade] = useState(() => new Animated.Value(0));
  const [subtitleTranslateY] = useState(() => new Animated.Value(6));

  // Luminous aura breathing animation
  const [glowPulse] = useState(() => new Animated.Value(0.65));

  // Modern progress bar animation
  const [loaderAnim] = useState(() => new Animated.Value(0));

  // Exit handover animation
  const [exitFade] = useState(() => new Animated.Value(1));

  useEffect(() => {
    // 1. Entrance choreography
    Animated.parallel([
      Animated.timing(contentFade, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(contentScale, {
        toValue: 1,
        duration: 500,
        easing: Easing.out(Easing.back(1.2)),
        useNativeDriver: true,
      }),
    ]).start();

    // 2. Subtitle staggered reveal
    Animated.sequence([
      Animated.delay(220),
      Animated.parallel([
        Animated.timing(subtitleFade, {
          toValue: 1,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(subtitleTranslateY, {
          toValue: 0,
          duration: 400,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    ]).start();

    // 3. Subtle ambient pulse loop
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.65,
          duration: 1400,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    pulseLoop.start();

    // 4. Sleek loading bar track loop
    const loaderLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(loaderAnim, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(loaderAnim, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    );
    loaderLoop.start();

    return () => {
      pulseLoop.stop();
      loaderLoop.stop();
    };
  }, [contentFade, contentScale, subtitleFade, subtitleTranslateY, glowPulse, loaderAnim]);

  // Enforce minimum 3-second display duration
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, MIN_SPLASH_DURATION_MS);

    return () => clearTimeout(timer);
  }, []);

  // When session check finishes AND minimum 3 seconds elapsed, smoothly cross-fade to application
  useEffect(() => {
    if (!isLoading && minTimeElapsed) {
      Animated.timing(exitFade, {
        toValue: 0,
        duration: 350,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }).start(() => {
        setVisible(false);
      });
    }
  }, [isLoading, minTimeElapsed, exitFade]);

  if (!visible) {
    return <>{children}</>;
  }

  // Calculate loader bar translation
  const loaderTranslateX = loaderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-50, 50],
  });

  return (
    <View style={styles.container}>
      {/* Underlying app mounted and ready */}
      <View style={StyleSheet.absoluteFill}>{children}</View>

      {/* Animated Splash Screen Overlay */}
      <Animated.View
        style={[styles.splashOverlay, { opacity: exitFade }]}
        pointerEvents={isLoading ? 'auto' : 'none'}
      >
        <StatusBar style="light" />

        {/* Stadium Mascot Background Artwork */}
        <Image
          source={require('../../assets/splash-clean-bg.png')}
          style={styles.backgroundImage}
          resizeMode="cover"
        />

        {/* Ambient emerald stadium beam overlay */}
        <Animated.View style={[styles.ambientGlow, { opacity: glowPulse }]} pointerEvents="none" />

        {/* Top Brand & Typographic Hierarchy */}
        <View style={styles.headerContainer}>
          {/* Arabic Brand Name */}
          <Animated.Text
            style={[
              styles.arabicBrand,
              {
                opacity: contentFade,
                transform: [{ scale: contentScale }],
              },
            ]}
          >
            أجي نقصرو
          </Animated.Text>

          {/* English Brand Name */}
          <Animated.Text
            style={[
              styles.englishBrand,
              {
                opacity: subtitleFade,
                transform: [{ translateY: subtitleTranslateY }],
              },
            ]}
          >
            AJI NQSSRO
          </Animated.Text>

          {/* Subtitle with Flanking Green Accent Lines */}
          <Animated.View
            style={[
              styles.subtitleRow,
              {
                opacity: subtitleFade,
                transform: [{ translateY: subtitleTranslateY }],
              },
            ]}
          >
            <View style={styles.accentLine} />
            <Text style={styles.subtitleText}>FOOTBALL ECOSYSTEM</Text>
            <View style={styles.accentLine} />
          </Animated.View>

          {/* Sleek Minimalist Session Loading Bar */}
          <View style={styles.loaderTrack}>
            <Animated.View
              style={[
                styles.loaderIndicator,
                {
                  transform: [{ translateX: loaderTranslateX }],
                },
              ]}
            />
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND_NAVY,
  },
  splashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: BRAND_NAVY,
    zIndex: 99999,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  ambientGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Math.round(SCREEN_HEIGHT * 0.30),
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
  },
  headerContainer: {
    position: 'absolute',
    top: Platform.OS === 'android' ? Math.round(SCREEN_HEIGHT * 0.055) : Math.round(SCREEN_HEIGHT * 0.065),
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  arabicBrand: {
    color: '#FFFFFF',
    fontSize: Math.min(34, Math.round(SCREEN_WIDTH * 0.088)),
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: Platform.OS === 'android' ? 44 : 40,
    letterSpacing: -0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  englishBrand: {
    color: ACCENT_GREEN,
    fontSize: Math.min(15, Math.round(SCREEN_WIDTH * 0.040)),
    fontWeight: '800',
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 2,
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  accentLine: {
    width: 20,
    height: 1.5,
    backgroundColor: ACCENT_GREEN,
    borderRadius: 1,
  },
  subtitleText: {
    color: '#FFFFFF',
    fontSize: Math.min(9.5, Math.round(SCREEN_WIDTH * 0.025)),
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    opacity: 0.95,
  },
  loaderTrack: {
    width: 80,
    height: 2.5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 2,
    marginTop: 10,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loaderIndicator: {
    width: 30,
    height: '100%',
    backgroundColor: ACCENT_GREEN,
    borderRadius: 2,
    shadowColor: ACCENT_GREEN,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
});
