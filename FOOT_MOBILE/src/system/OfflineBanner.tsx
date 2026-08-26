import { StyleSheet, Text, View } from 'react-native';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';

export function OfflineBanner(): React.JSX.Element | null {
  const { isOnline } = useNetworkStatus();
  const { t } = useI18n();
  const { colors } = useTheme();

  if (isOnline) return null;

  return (
    <View
      style={[styles.banner, { backgroundColor: colors.amber }]}
      accessibilityRole="alert"
      accessibilityLabel={t('common.offline')}
    >
      <Text style={[styles.text, { color: '#0f172a' }]}>{t('common.offline')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 12, fontWeight: '700', textAlign: 'center' },
});
