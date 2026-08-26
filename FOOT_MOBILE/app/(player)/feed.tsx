import { EmptyState } from '@/components/ui/EmptyState';
import { useI18n } from '@/i18n/I18nProvider';

export default function PlayerFeed(): React.JSX.Element {
  const { t } = useI18n();
  return <EmptyState title={t('nav.feed', 'آخر الأخبار')} description={t('common.comingSoon', 'قريباً')} />;
}
