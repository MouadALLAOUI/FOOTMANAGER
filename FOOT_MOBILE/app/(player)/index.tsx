import { Trophy, Users, Newspaper, Search } from 'lucide-react-native';

import { HomeShell } from '@/components/home/HomeShell';
import type { QuickAction } from '@/components/home/QuickActions';

const actions: QuickAction[] = [
  { key: 'find', labelKey: 'home.findMatch', fallback: 'البحث عن مباراة', Icon: Search, href: '/(player)/matches', primary: true },
  { key: 'applications', labelKey: 'home.myApplications', fallback: 'طلباتي', Icon: Trophy, href: '/(player)/matches' },
  { key: 'team', labelKey: 'nav.team', fallback: 'الفريق', Icon: Users, href: '/(player)/team' },
  { key: 'feed', labelKey: 'nav.feed', fallback: 'آخر الأخبار', Icon: Newspaper, href: '/(player)/feed' },
];

export default function PlayerHome(): React.JSX.Element {
  return <HomeShell quickActions={actions} />;
}
