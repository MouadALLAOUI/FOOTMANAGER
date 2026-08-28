import { Tabs } from 'expo-router';
import { Home, Calendar, MapPin, User } from 'lucide-react-native';

import { useI18n } from '@/i18n/I18nProvider';
import { baseTabScreenOptions } from '@/navigation/tabOptions';
import { useTheme } from '@/theme/ThemeProvider';

export default function TerrainLayout(): React.JSX.Element {
  const { t } = useI18n();
  const { colors } = useTheme();

  return (
    <Tabs screenOptions={baseTabScreenOptions(colors)}>
      <Tabs.Screen
        name="index"
        options={{ title: t('nav.home', 'الرئيسية'), tabBarIcon: ({ color, size }) => <Home size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="bookings"
        options={{ title: t('nav.bookings', 'الحجوزات'), tabBarIcon: ({ color, size }) => <Calendar size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="fields"
        options={{ title: t('nav.fields', 'الملاعب'), tabBarIcon: ({ color, size }) => <MapPin size={size} color={color} /> }}
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
