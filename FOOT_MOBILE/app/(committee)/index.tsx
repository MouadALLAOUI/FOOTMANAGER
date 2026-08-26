import { Trophy, Users, Calendar } from 'lucide-react-native';

import { HomeShell } from '@/components/home/HomeShell';
import type { QuickAction } from '@/components/home/QuickActions';

const actions: QuickAction[] = [
  { key: 'tournaments', labelKey: 'nav.tournaments', fallback: 'البطولات', Icon: Trophy, href: '/(committee)/tournaments', primary: true },
  { key: 'teams', labelKey: 'home.teams', fallback: 'الفرق', Icon: Users, href: '/(committee)/tournaments' },
  { key: 'fixtures', labelKey: 'home.fixtures', fallback: 'المباريات', Icon: Calendar, href: '/(committee)/tournaments' },
];

export default function CommitteeHome(): React.JSX.Element {
  return <HomeShell quickActions={actions} upcomingTitleKey="home.upcomingTournaments" upcomingFallback="البطولات القادمة" />;
}
