import { Link } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { MapPin, Swords, Trophy, Users } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useI18n } from '@/i18n/I18nProvider';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, radius, spacing } from '@/theme/spacing';

interface Feature {
  icon: React.ReactNode;
  titleKey: string;
}

const FEATURES: Feature[] = [
  { icon: <Swords size={20} color={palette.green} />, titleKey: 'landing.featureMatchesTitle' },
  { icon: <Users size={20} color={palette.green} />, titleKey: 'landing.featureTeamTitle' },
  { icon: <MapPin size={20} color={palette.green} />, titleKey: 'landing.featureTerrainsTitle' },
  { icon: <Trophy size={20} color={palette.green} />, titleKey: 'landing.featureTournamentsTitle' },
];

export default function LandingScreen(): React.JSX.Element {
  const { t } = useI18n();
  const { colors } = useTheme();

  return (
    <Screen padded={false}>
      {/* Match-night hero: brand + one dominant action */}
      <View style={styles.hero}>
        <View style={styles.heroInner}>
          <View style={styles.logoCircle}>
            <AppText style={styles.logoEmoji}>⚽</AppText>
          </View>
          <AppText variant="h1" align="center" style={styles.heroTitle}>
            {t('app.name')}
          </AppText>
          <AppText variant="body" align="center" style={styles.heroTagline}>
            {t('app.tagline')}
          </AppText>

          <View style={styles.ctaList}>
            <Link href="/(auth)" asChild>
              <Button title={t('landing.getStarted')} size="lg" fullWidth />
            </Link>
            <Link href="/(auth)/register" asChild>
              <Button
                title={t('auth.register')}
                size="lg"
                variant="outline"
                fullWidth
                style={styles.registerButton}
              />
            </Link>
          </View>
        </View>
      </View>

      {/* What you can do — recognition over reading */}
      <View style={styles.features}>
        {FEATURES.map((f) => (
          <Card key={f.titleKey} style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: colors.primary + '14' }]}>
              {f.icon}
            </View>
            <AppText variant="bodyBold" style={styles.flex}>
              {t(f.titleKey)}
            </AppText>
          </Card>
        ))}
      </View>

      <AppText variant="caption" muted align="center" style={styles.footer}>
        {t('landing.footer', '')}
      </AppText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: palette.dark,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingTop: spacing['4xl'],
    paddingBottom: spacing['3xl'],
    paddingHorizontal: layout.screenPaddingLarge,
  },
  heroInner: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  logoCircle: {
    width: 84,
    height: 84,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.green,
    marginBottom: spacing.sm,
  },
  logoEmoji: { fontSize: 40 },
  heroTitle: {
    color: '#ffffff',
  },
  heroTagline: {
    color: 'rgba(255,255,255,0.72)',
    marginBottom: spacing.xl,
  },
  ctaList: {
    alignSelf: 'stretch',
    gap: spacing.md,
  },
  registerButton: {
    borderColor: 'rgba(255,255,255,0.4)',
  },
  features: {
    paddingHorizontal: layout.screenPaddingLarge,
    paddingTop: spacing['2xl'],
    gap: spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flex: { flex: 1 },
  footer: {
    marginTop: spacing['2xl'],
    marginBottom: spacing.xl,
  },
});
