import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Home, Calendar, MapPin, User } from 'lucide-react-native';
import { useQueryClient } from '@tanstack/react-query';

import { useI18n } from '@/i18n/I18nProvider';
import { baseTabScreenOptions } from '@/navigation/tabOptions';
import { useTheme } from '@/theme/ThemeProvider';
import { roleAccents } from '@/theme/colors';
import { persistentStorage } from '@/services/storage/persistent-storage';
import { post } from '@/api/client';
import { q } from '@/api/query-keys';
import { useAuth } from '@/auth/AuthProvider';

export default function TerrainLayout(): React.JSX.Element {
  const { t } = useI18n();
  const { colors } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // On entry to the approved owner dashboard, sync any pending stadium/bookings from onboarding
  useEffect(() => {
    try {
      const pendingStadium = persistentStorage.getJson<{
        name?: string;
        city?: string;
        address?: string;
        pricePerHour?: string;
        openTime?: string;
        closeTime?: string;
        photos?: string[];
      }>('owner.pendingStadium');
      const pendingBookings = persistentStorage.getJson<any[]>('owner.manualBookings');

      if (pendingStadium || (pendingBookings && pendingBookings.length > 0)) {
        void post('/register-terrain-details', {
          user_id: user?.id,
          phone: user?.phone,
          name: pendingStadium?.name || 'ملعب أجيال',
          city: pendingStadium?.city || 'الدار البيضاء',
          address: pendingStadium?.address || '',
          price_per_hour: parseFloat(pendingStadium?.pricePerHour || '300'),
          open_time: pendingStadium?.openTime || '08:00',
          close_time: pendingStadium?.closeTime || '23:00',
          images: pendingStadium?.photos || [],
          bookings: pendingBookings?.map((b) => ({
            date: b.date,
            start_time: b.start_time,
            end_time: b.end_time,
            customer_name: b.customer_name,
            customer_phone: b.customer_phone,
          })) || [],
        }).then(() => {
          persistentStorage.remove('owner.pendingStadium');
          persistentStorage.remove('owner.manualBookings');
          persistentStorage.remove('owner.pendingUser');
          void queryClient.invalidateQueries({ queryKey: q.ownerTerrains() });
          void queryClient.invalidateQueries({ queryKey: ['owner-calendar'] });
        }).catch(() => {
          // Ignore
        });
      }
    } catch {
      // Ignore
    }
  }, [user?.id, user?.phone, queryClient]);

  return (
    <Tabs screenOptions={baseTabScreenOptions(colors, roleAccents.terrain_owner)}>
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
