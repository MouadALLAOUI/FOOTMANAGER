import { useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useI18n } from '@/i18n/I18nProvider';

export default function FieldDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('field.detail', 'تفاصيل الملعب')} showBack />
      <EmptyState
        icon="🏟️"
        description={`${t('common.fieldId', 'ملعب رقم')}: ${id}`}
      />
    </Screen>
  );
}
