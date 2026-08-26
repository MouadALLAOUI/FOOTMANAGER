import { StyleSheet, Text, View } from 'react-native';

import { useAuth } from '@/auth/AuthProvider';
import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { spacing } from '@/theme/spacing';

export default function AccountRejectedScreen(): React.JSX.Element {
  const { logout } = useAuth();
  const { t } = useI18n();
  const { colors } = useTheme();

  return (
    <Screen>
      <View style={styles.container}>
        <View style={[styles.iconCircle, { backgroundColor: colors.danger + '18' }]}>
          <Text style={[styles.iconText, { color: colors.danger }]}>✕</Text>
        </View>

        <Text style={[styles.title, { color: colors.text }]}>
          {t('auth.rejectedTitle', 'تم رفض طلبك')}
        </Text>
        <Text style={[styles.description, { color: colors.textMuted }]}>
          {t('auth.rejectedDescription', 'لم يتم قبول طلب الانضمام. يمكنك إعادة التسجيل ببيانات مختلفة.')}
        </Text>

        <View style={styles.actions}>
          <Button
            title={t('auth.logout', 'تسجيل الخروج')}
            onPress={logout}
            variant="danger"
            fullWidth
          />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 40, fontWeight: '800' },
  title: { fontSize: 20, fontWeight: '800', textAlign: 'center' },
  description: { fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: spacing.md },
  actions: { width: '100%', gap: spacing.sm },
});
