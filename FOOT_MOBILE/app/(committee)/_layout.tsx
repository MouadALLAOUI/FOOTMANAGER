import { Tabs } from 'expo-router';
import { Home, Trophy, User } from 'lucide-react-native';

import { useI18n } from '@/i18n/I18nProvider';
import { baseTabScreenOptions } from '@/navigation/tabOptions';
import { useTheme } from '@/theme/ThemeProvider';

export default function CommitteeLayout(): React.JSX.Element {
  const { t } = useI18n();
  const { colors } = useTheme();

  return (
    <Tabs screenOptions={baseTabScreenOptions(colors)}>
      <Tabs.Screen
        name="index"
        options={{ title: t('nav.home', 'الرئيسية'), tabBarIcon: ({ color, size }) => <Home size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="tournaments"
        options={{ title: t('nav.tournaments', 'البطولات'), tabBarIcon: ({ color, size }) => <Trophy size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('nav.profile', 'حسابي'), tabBarIcon: ({ color, size }) => <User size={size} color={color} /> }}
      />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
  );
}
