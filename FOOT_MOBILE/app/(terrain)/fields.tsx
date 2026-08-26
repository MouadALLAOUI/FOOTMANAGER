import { EmptyState } from '@/components/ui/EmptyState';
import { useI18n } from '@/i18n/I18nProvider';

export default function TerrainFields(): React.JSX.Element {
  const { t } = useI18n();
  return <EmptyState title={t('nav.fields', 'الملاعب')} description={t('common.comingSoon', 'قريباً')} />;
}
