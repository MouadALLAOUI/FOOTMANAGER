import { StyleSheet, View } from 'react-native';
import { CalendarDays, MapPin, MessageSquare, UserPlus, ArrowLeftRight, UserCheck } from 'lucide-react-native';

import type { PlayerApplication, PlayerApplicationType } from '@/api/team';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';

interface Props {
  application: PlayerApplication;
  responding?: boolean;
  onAccept?: () => void;
  onDecline?: () => void;
  onCancel?: () => void;
}

export function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case 'accepted':
      return 'success';
    case 'declined':
      return 'danger';
    case 'cancelled':
      return 'neutral';
    case 'pending':
    default:
      return 'warning';
  }
}

export function statusLabel(t: (key: string, fallback?: string) => string, status: string): string {
  return t(`applications.status.${status}`, status);
}

function typeMeta(t: (key: string, fallback?: string) => string, type: PlayerApplicationType) {
  return type === 'invite'
    ? { title: t('applications.type.invite', 'دعوة انضمام'), Icon: UserPlus }
    : { title: t('applications.type.apply', 'طلب انضمام لمباراة'), Icon: ArrowLeftRight };
}

export function ApplicationCard({ application, responding, onAccept, onDecline, onCancel }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const { t, formatDate } = useI18n();

  const { title, Icon } = typeMeta(t, application.type);
  const match = application.match_request as
    | { host_team?: { name?: string | null } | null; stadium?: { name?: string | null } | null; match_datetime?: string | null } | null
    | undefined;

  const hostLabel = match?.host_team?.name ?? t('match.unknownTeam', 'فريق');
  const stadiumLabel = match?.stadium?.name ?? t('team.applications.noVenue', 'بدون ملعب');

  const isPending = application.status === 'pending';
  const isInvite = application.type === 'invite';

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: colors.bgMuted }]}>
          <Icon size={18} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <AppText variant="bodyBold" numberOfLines={1}>
            {title}
          </AppText>
          <AppText variant="small" style={{ color: colors.textSubtle }} numberOfLines={1}>
            {hostLabel}
          </AppText>
        </View>
        <Badge label={statusLabel(t, application.status)} variant={statusVariant(application.status)} />
      </View>

      <View style={styles.meta}>
        {match?.match_datetime ? (
          <View style={styles.metaItem}>
            <CalendarDays size={14} color={colors.textMuted} />
            <AppText variant="caption" muted>
              {formatDate(match.match_datetime, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </AppText>
          </View>
        ) : null}
        <View style={styles.metaItem}>
          <MapPin size={14} color={colors.textMuted} />
          <AppText variant="caption" muted>
            {stadiumLabel}
          </AppText>
        </View>
        {application.position ? (
          <View style={styles.metaItem}>
            <UserCheck size={14} color={colors.textMuted} />
            <AppText variant="caption" muted>
              {t(`match.pos.${String(application.position).toLowerCase()}`, application.position)}
            </AppText>
          </View>
        ) : null}
      </View>

      {application.message ? (
        <View style={[styles.message, { backgroundColor: colors.bgMuted }]}>
          <MessageSquare size={14} color={colors.textMuted} />
          <AppText variant="caption" muted style={styles.messageText}>
            {application.message}
          </AppText>
        </View>
      ) : null}

      {isPending && isInvite ? (
        <View style={styles.actions}>
          <Button
            title={t('applications.accept', 'قبول')}
            variant="primary"
            size="sm"
            onPress={onAccept}
            loading={responding}
            style={styles.action}
          />
          <Button
            title={t('applications.decline', 'رفض')}
            variant="outline"
            size="sm"
            onPress={onDecline}
            style={styles.action}
          />
        </View>
      ) : null}

      {isPending && !isInvite ? (
        <View style={styles.actions}>
          <Button
            title={t('applications.cancel', 'إلغاء الطلب')}
            variant="outline"
            size="sm"
            onPress={onCancel}
            loading={responding}
            style={styles.action}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    gap: spacing.md,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  meta: { gap: spacing.xs },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  message: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    borderRadius: radius.md,
  },
  messageText: { flex: 1 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  action: { flex: 1 },
});
