import { Calendar, MapPin, Bell, Clock } from 'lucide-react-native';

import { HomeShell } from '@/components/home/HomeShell';
import type { QuickAction } from '@/components/home/QuickActions';

const actions: QuickAction[] = [
  { key: 'bookings', labelKey: 'home.todayBookings', fallback: 'حجوزات اليوم', Icon: Calendar, href: '/(terrain)/bookings', primary: true },
  { key: 'fields', labelKey: 'nav.fields', fallback: 'الملاعب', Icon: MapPin, href: '/(terrain)/fields' },
  { key: 'schedule', labelKey: 'home.schedule', fallback: 'الجدول', Icon: Clock, href: '/(terrain)/bookings' },
  { key: 'notifications', labelKey: 'nav.notifications', fallback: 'الإشعارات', Icon: Bell, href: '/(terrain)/notifications' },
];

export default function TerrainHome(): React.JSX.Element {
  return <HomeShell quickActions={actions} upcomingTitleKey="home.upcomingBookings" upcomingFallback="الحجوزات القادمة" />;
}
