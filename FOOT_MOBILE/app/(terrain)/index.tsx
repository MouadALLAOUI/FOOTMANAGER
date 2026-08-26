import { Calendar, MapPin, Eye, BarChart3 } from 'lucide-react-native';

import { HomeShell } from '@/components/home/HomeShell';
import type { QuickAction } from '@/components/home/QuickActions';

const actions: QuickAction[] = [
  { key: 'bookings', labelKey: 'home.todayBookings', fallback: 'حجوزات اليوم', Icon: Calendar, href: '/(terrain)/bookings', primary: true },
  { key: 'calendar', labelKey: 'home.calendar', fallback: 'التقويم', Icon: Eye, href: '/(terrain)/bookings' },
  { key: 'fields', labelKey: 'nav.fields', fallback: 'الملاعب', Icon: MapPin, href: '/(terrain)/fields' },
  { key: 'analytics', labelKey: 'home.analytics', fallback: 'الإحصائيات', Icon: BarChart3, href: '/(terrain)/bookings' },
];

export default function TerrainHome(): React.JSX.Element {
  return <HomeShell quickActions={actions} upcomingTitleKey="home.upcomingBookings" upcomingFallback="الحجوزات القادمة" />;
}
