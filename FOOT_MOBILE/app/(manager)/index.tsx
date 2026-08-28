import { Trophy, Users, Calendar, Search } from 'lucide-react-native';

import { HomeShell } from '@/components/home/HomeShell';
import type { QuickAction } from '@/components/home/QuickActions';

const actions: QuickAction[] = [
  { key: 'new', labelKey: 'home.newMatch', fallback: 'طلب مباراة', Icon: Trophy, href: '/(manager)/matches/create', primary: true },
  { key: 'browse', labelKey: 'home.browseMatches', fallback: 'استعراض الطلبات', Icon: Search, href: '/(manager)/matches' },
  { key: 'team', labelKey: 'nav.team', fallback: 'الفريق', Icon: Users, href: '/(manager)/team' },
  { key: 'bookings', labelKey: 'nav.bookings', fallback: 'الحجوزات', Icon: Calendar, href: '/(manager)/bookings' },
];

export default function ManagerHome(): React.JSX.Element {
  return <HomeShell quickActions={actions} upcomingTitleKey="home.upcomingMatches" upcomingFallback="المباريات القادمة" />;
}
