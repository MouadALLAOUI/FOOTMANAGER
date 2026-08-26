import { Users, CheckCircle, Settings, Shield } from 'lucide-react-native';

import { HomeShell } from '@/components/home/HomeShell';
import type { QuickAction } from '@/components/home/QuickActions';

const actions: QuickAction[] = [
  { key: 'users', labelKey: 'nav.users', fallback: 'المستخدمين', Icon: Users, href: '/(admin)/users', primary: true },
  { key: 'approvals', labelKey: 'nav.approvals', fallback: 'الطلبات', Icon: CheckCircle, href: '/(admin)/approvals' },
  { key: 'settings', labelKey: 'nav.settings', fallback: 'الإعدادات', Icon: Settings, href: '/(admin)/settings' },
  { key: 'profile', labelKey: 'nav.profile', fallback: 'حسابي', Icon: Shield, href: '/(admin)/profile' },
];

export default function AdminHome(): React.JSX.Element {
  return <HomeShell quickActions={actions} upcomingTitleKey="home.pendingApprovals" upcomingFallback="الطلبات المعلقة" />;
}
