import { Tabs } from 'expo-router';
import { Home, Users, CheckCircle, User } from 'lucide-react-native';

import { useI18n } from '@/i18n/I18nProvider';
import { baseTabScreenOptions } from '@/navigation/tabOptions';
import { useTheme } from '@/theme/ThemeProvider';

import { roleAccents } from '@/theme/colors';

export default function AdminLayout(): React.JSX.Element {
  const { t } = useI18n();
  const { colors } = useTheme();

  return (
    <Tabs screenOptions={baseTabScreenOptions(colors, roleAccents.admin)}>
      <Tabs.Screen
        name="index"
        options={{ title: t('nav.home', 'الرئيسية'), tabBarIcon: ({ color, size }) => <Home size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="approvals"
        options={{ title: t('nav.approvals', 'الطلبات'), tabBarIcon: ({ color, size }) => <CheckCircle size={size} color={color} /> }}
      />
      <Tabs.Screen
        name="users"
        options={{ title: t('nav.users', 'المستخدمين'), tabBarIcon: ({ color, size }) => <Users size={size} color={color} /> }}
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
