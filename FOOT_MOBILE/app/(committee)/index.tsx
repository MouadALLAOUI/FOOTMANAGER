import { Trophy, Bell } from 'lucide-react-native';

import { HomeShell } from '@/components/home/HomeShell';
import type { QuickAction } from '@/components/home/QuickActions';

const actions: QuickAction[] = [
  { key: 'tournaments', labelKey: 'nav.tournaments', fallback: 'البطولات', Icon: Trophy, href: '/(committee)/tournaments', primary: true },
  { key: 'notifications', labelKey: 'nav.notifications', fallback: 'الإشعارات', Icon: Bell, href: '/(committee)/notifications' },
];

export default function CommitteeHome(): React.JSX.Element {
  return <HomeShell quickActions={actions} upcomingTitleKey="home.upcomingTournaments" upcomingFallback="البطولات القادمة" />;
}
