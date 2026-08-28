import { Users, Calendar, Search, Bell, Inbox } from 'lucide-react-native';

import { HomeShell } from '@/components/home/HomeShell';
import type { QuickAction } from '@/components/home/QuickActions';

const actions: QuickAction[] = [
  { key: 'find', labelKey: 'home.findMatch', fallback: 'البحث عن مباراة', Icon: Search, href: '/(player)/matches', primary: true },
  { key: 'applications', labelKey: 'nav.applications', fallback: 'طلباتي', Icon: Inbox, href: '/(player)/applications' },
  { key: 'bookings', labelKey: 'nav.bookings', fallback: 'الحجوزات', Icon: Calendar, href: '/(player)/bookings' },
  { key: 'team', labelKey: 'nav.team', fallback: 'الفريق', Icon: Users, href: '/(player)/team' },
  { key: 'notifications', labelKey: 'nav.notifications', fallback: 'الإشعارات', Icon: Bell, href: '/(player)/notifications' },
];

export default function PlayerHome(): React.JSX.Element {
  return <HomeShell quickActions={actions} upcomingTitleKey="home.upcomingMatches" upcomingFallback="المباريات القادمة" />;
}
