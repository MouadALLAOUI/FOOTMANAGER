import { useLocalSearchParams } from 'expo-router';

import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { EmptyState } from '@/components/ui/EmptyState';
import { useI18n } from '@/i18n/I18nProvider';

export default function BookingDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('booking.detail', 'تفاصيل الحجز')} showBack />
      <EmptyState
        icon="📅"
        description={`${t('common.bookingId', 'حجز رقم')}: ${id}`}
      />
    </Screen>
  );
}
