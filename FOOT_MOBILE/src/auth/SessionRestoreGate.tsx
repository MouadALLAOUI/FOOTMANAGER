import { ActivityIndicator, StyleSheet, Text, View, Dimensions } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { BrandLogoMark, StadiumPitchBackground } from '@/components/ui/illustrations';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export function SessionRestoreGate({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.container}>
        {/* Pitch perspective at bottom */}
        <View style={styles.pitchBackground}>
          <StadiumPitchBackground width={SCREEN_WIDTH} height={SCREEN_WIDTH * 0.65} />
        </View>

        {/* Centered Brand Mark */}
        <View style={styles.content}>
          <View style={styles.brandCard}>
            <BrandLogoMark size={90} />
            <Text style={styles.appName}>أجي نقصروا</Text>
            <Text style={styles.appSub}>FOOTMANAGER</Text>
            <Text style={styles.tagline}>More Football · Stronger Communities</Text>
          </View>

          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={palette.primaryGreen} />
          </View>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    paddingHorizontal: spacing.lg,
  },
  brandCard: {
    alignItems: 'center',
    gap: 6,
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: palette.navy,
    textAlign: 'center',
    marginTop: 8,
  },
  appSub: {
    fontSize: 16,
    fontWeight: '800',
    color: palette.primaryGreen,
    letterSpacing: 2,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    textAlign: 'center',
    marginTop: 4,
  },
  loadingBox: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  pitchBackground: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    opacity: 0.95,
  },
});

