import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { useI18n } from '@/i18n/I18nProvider';
import type { TournamentStatus } from '@/api/committeeTournaments';

export function tournamentStatusVariant(status: TournamentStatus | undefined): BadgeVariant {
  switch (status) {
    case 'open_for_registration':
      return 'success';
    case 'registration_closed':
      return 'info';
    case 'in_progress':
      return 'warning';
    case 'completed':
      return 'neutral';
    case 'cancelled':
      return 'danger';
    case 'draft':
    default:
      return 'neutral';
  }
}

export function tournamentStatusLabel(t: (key: string, fallback?: string) => string, status: TournamentStatus | undefined): string {
  const map: Record<string, string> = {
    draft: t('tournaments.status.draft', 'Draft'),
    open_for_registration: t('tournaments.status.open', 'Open for registration'),
    registration_closed: t('tournaments.status.closed', 'Registration closed'),
    in_progress: t('tournaments.status.inProgress', 'In progress'),
    completed: t('tournaments.status.completed', 'Completed'),
    cancelled: t('tournaments.status.cancelled', 'Cancelled'),
  };
  return status ? (map[status] ?? status) : t('tournaments.status.unknown', 'Unknown');
}

interface Props {
  status: TournamentStatus | undefined;
  variant?: BadgeVariant;
}

export function TournamentStatusBadge({ status, variant }: Props): React.JSX.Element {
  const { t } = useI18n();
  return (
    <Badge label={tournamentStatusLabel(t, status)} variant={variant ?? tournamentStatusVariant(status)} />
  );
}
