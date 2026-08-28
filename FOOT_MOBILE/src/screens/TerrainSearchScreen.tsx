import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useI18n } from '@/i18n/I18nProvider';

export default function TerrainSearchScreen(): React.JSX.Element {
  const { t } = useI18n();

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('terrain.search', 'البحث عن ملعب')} />
      <EmptyState icon="🔍" description={t('terrain.searchDesc', 'سيتم إضافة خريطة البحث قريباً')} />
    </Screen>
  );
}
