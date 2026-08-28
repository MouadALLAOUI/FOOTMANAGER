import { CheckCircle, Users, Bell, Shield } from 'lucide-react-native';

import { HomeShell } from '@/components/home/HomeShell';
import type { QuickAction } from '@/components/home/QuickActions';

const actions: QuickAction[] = [
  { key: 'approvals', labelKey: 'nav.approvals', fallback: 'الطلبات', Icon: CheckCircle, href: '/(admin)/approvals', primary: true },
  { key: 'users', labelKey: 'nav.users', fallback: 'المستخدمين', Icon: Users, href: '/(admin)/users' },
  { key: 'profile', labelKey: 'nav.profile', fallback: 'حسابي', Icon: Shield, href: '/(admin)/profile' },
  { key: 'notifications', labelKey: 'nav.notifications', fallback: 'الإشعارات', Icon: Bell, href: '/(admin)/notifications' },
];

export default function AdminHome(): React.JSX.Element {
  return <HomeShell quickActions={actions} upcomingTitleKey="home.pendingApprovals" upcomingFallback="الطلبات المعلقة" />;
}
