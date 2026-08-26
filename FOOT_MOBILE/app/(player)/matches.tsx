import { EmptyState } from '@/components/ui/EmptyState';
import { useI18n } from '@/i18n/I18nProvider';

export default function PlayerMatches(): React.JSX.Element {
  const { t } = useI18n();
  return <EmptyState title={t('nav.matches', 'المباريات')} description={t('common.comingSoon', 'قريباً')} />;
}
