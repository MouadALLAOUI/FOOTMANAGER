import React from 'react';
import { Tabs } from 'expo-router';

import { AjiNqssroTabBar } from '@/components/navigation/AjiNqssroTabBar';

export default function ManagerLayout(): React.JSX.Element {
  return (
    <Tabs
      tabBar={() => <AjiNqssroTabBar mode="manager" />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="team" />
      <Tabs.Screen name="matches" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="bookings" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      <Tabs.Screen name="terrain" options={{ href: null }} />
    </Tabs>
  );
}
