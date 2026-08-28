import { Link } from 'expo-router';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { MapPin, Swords, Trophy, Users } from 'lucide-react-native';

import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';

interface Feature {
  icon: React.ReactNode;
  titleKey: string;
  descKey: string;
}

export default function LandingScreen(): React.JSX.Element {
  const { t } = useI18n();
  const { colors } = useTheme();

  const features: Feature[] = [
    { icon: <Swords size={22} color={colors.primary} />, titleKey: 'landing.featureMatchesTitle', descKey: 'landing.featureMatchesDesc' },
    { icon: <Users size={22} color={colors.primary} />, titleKey: 'landing.featureTeamTitle', descKey: 'landing.featureTeamDesc' },
    { icon: <MapPin size={22} color={colors.primary} />, titleKey: 'landing.featureTerrainsTitle', descKey: 'landing.featureTerrainsDesc' },
    { icon: <Trophy size={22} color={colors.primary} />, titleKey: 'landing.featureTournamentsTitle', descKey: 'landing.featureTournamentsDesc' },
  ];

  return (
    <Screen scroll>
      <View style={styles.content}>
        <View style={styles.brand}>
          <View style={[styles.logoCircle, { backgroundColor: colors.primary + '18' }]}>
            <AppText style={styles.logoEmoji}>⚽</AppText>
          </View>
          <AppText variant="h1" align="center">{t('app.name')}</AppText>
          <AppText variant="label" muted align="center">{t('app.tagline')}</AppText>
          <AppText muted align="center" style={styles.subtitle}>{t('landing.subtitle')}</AppText>
        </View>

        <View style={styles.section}>
          <AppText variant="h2">{t('landing.featuresTitle')}</AppText>
          <View style={styles.featureList}>
            {features.map((f) => (
              <Card key={f.titleKey} style={styles.featureCard}>
                <View style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: colors.primary + '14' }]}>{f.icon}</View>
                  <View style={styles.featureText}>
                    <AppText variant="bodyBold">{t(f.titleKey)}</AppText>
                    <AppText variant="caption" muted>{t(f.descKey)}</AppText>
                  </View>
                  <AppText variant="caption" style={{ color: colors.textSubtle }}>‹</AppText>
                </View>
              </Card>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="h2">{t('landing.ctaTitle')}</AppText>
          <View style={styles.ctaList}>
            <Link href="/(auth)" asChild>
              <Button title={t('auth.login')} fullWidth />
            </Link>
            <Link href="/(auth)/register" asChild>
              <Button title={t('auth.register')} variant="outline" fullWidth />
            </Link>
          </View>
        </View>

        <AppText variant="caption" muted align="center" style={styles.footer}>
          {t('landing.footer', '')}
        </AppText>

        {__DEV__ ? (
          <Link href={'/(public)/dev' as never} style={styles.devLink}>
            <AppText variant="small" muted align="center">{t('landing.devTools')}</AppText>
          </Link>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing['2xl'], paddingVertical: spacing['2xl'] },
  brand: { alignItems: 'center', gap: spacing.sm },
  logoCircle: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  logoEmoji: { fontSize: 36 },
  subtitle: { marginTop: spacing.xs, lineHeight: 20, paddingHorizontal: spacing.lg },
  section: { gap: spacing.md },
  featureList: { gap: spacing.md },
  featureCard: { padding: spacing.md },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1, gap: 2 } as ViewStyle,
  ctaList: { gap: spacing.md },
  footer: { marginTop: spacing.sm },
  devLink: { marginTop: spacing.lg },
});
