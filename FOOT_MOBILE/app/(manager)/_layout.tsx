import { Tabs } from 'expo-router';
import { Home, Trophy, Users, Calendar, User } from 'lucide-react-native';

import { useI18n } from '@/i18n/I18nProvider';
import { baseTabScreenOptions } from '@/navigation/tabOptions';
import { useTheme } from '@/theme/ThemeProvider';

import { roleAccents } from '@/theme/colors';

export default function ManagerLayout(): React.JSX.Element {
  const { t } = useI18n();
  const { colors } = useTheme();

  return (
    <Tabs screenOptions={baseTabScreenOptions(colors, roleAccents.manager)}>
      <Tabs.Screen
        name="index"
        options={{ title: t('nav.home', 'الرئيسية'), tabBarIcon: ({ color, size }) => <Home size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="matches"
        options={{ title: t('nav.matches', 'المباريات'), tabBarIcon: ({ color, size }) => <Trophy size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="team"
        options={{ title: t('nav.team', 'الفريق'), tabBarIcon: ({ color, size }) => <Users size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="bookings"
        options={{ title: t('nav.bookings', 'الحجوزات'), tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: t('nav.profile', 'حسابي'), tabBarIcon: ({ color, size }) => <User size={size} color={color} /> }}
      />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="terrain" options={{ href: null }} />
    </Tabs>
  );
}
