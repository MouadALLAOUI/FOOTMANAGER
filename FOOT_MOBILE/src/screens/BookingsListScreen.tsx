import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useI18n } from '@/i18n/I18nProvider';

export default function BookingsListScreen(): React.JSX.Element {
  const { t } = useI18n();

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('bookings.title', 'الحجوزات')} />
      <EmptyState icon="📅" description={t('bookings.empty', 'لا توجد حجوزات حالياً')} />
    </Screen>
  );
}
