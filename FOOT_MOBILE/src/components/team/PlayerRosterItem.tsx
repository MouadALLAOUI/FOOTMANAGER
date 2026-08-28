import { StyleSheet, View } from 'react-native';
import { Forward, Goal, Shield, Shirt, Sparkles } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import type { PlayerPosition, Teammate } from '@/api/team';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';
import { AppText } from '@/components/ui/AppText';

interface Props {
  teammate: Teammate;
  isCaptain: boolean;
  isViceCaptain: boolean;
  captainName?: string | null;
}

const positionIcon: Record<string, LucideIcon> = {
  goalkeeper: Goal,
  defender: Shield,
  midfielder: Shirt,
  forward: Forward,
};

function positionKey(position?: PlayerPosition | null): string | null {
  if (!position) return null;
  const p = String(position).toLowerCase();
  if (p.includes('goal') || p.includes('gard')) return 'goalkeeper';
  if (p.includes('def') || p.includes('déf')) return 'defender';
  if (p.includes('mid') || p.includes('mil')) return 'midfielder';
  if (p.includes('forward') || p.includes('atta')) return 'forward';
  return null;
}

const roleLabels = ['starter', 'substitute', 'reserve'] as const;
type RoleKind = (typeof roleLabels)[number];

function roleVariant(role?: string | null): 'success' | 'warning' | 'info' | 'neutral' {
  const r = String(role ?? '').toLowerCase();
  if (r === 'starter') return 'success';
  if (r === 'substitute') return 'warning';
  if (r === 'reserve') return 'info';
  return 'neutral';
}

function isRoleKind(role?: string | null): RoleKind | null {
  return roleLabels.includes(role as RoleKind) ? (role as RoleKind) : null;
}

export function PlayerRosterItem({ teammate, isCaptain, isViceCaptain, captainName }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const { t } = useI18n();

  const pos = positionKey(teammate.position);
  const PositionIcon = pos ? positionIcon[pos] : null;
  const displayPosKey = pos ? `match.pos.${pos}` : null;

  return (
    <View style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.avatarWrap}>
        <Avatar
          uri={teammate.avatar_url}
          name={teammate.name}
          size="md"
        />
        {isCaptain ? (
          <View style={[styles.captainBadge, { backgroundColor: colors.amber }]}>
            <Sparkles size={12} color="#ffffff" />
          </View>
        ) : null}
      </View>

      <View style={styles.info}>
        <View style={styles.nameRow}>
          <AppText variant="bodyBold" numberOfLines={1} style={styles.name}>
            {teammate.name}
          </AppText>
          {isCaptain ? (
            <View style={styles.roleBadges}>
              <Badge label={captainName ?? 'C'} variant="warning" />
            </View>
          ) : isViceCaptain ? (
            <View style={styles.roleBadges}>
              <Badge label={t('team.viceCaptain', 'نائب')} variant="info" />
            </View>
          ) : null}
        </View>
        <View style={styles.metaRow}>
          {PositionIcon ? (
            <View style={styles.position}>
              <PositionIcon size={14} color={colors.textMuted} />
              <AppText variant="caption" muted>
                {displayPosKey ? t(displayPosKey) : teammate.position}
              </AppText>
            </View>
          ) : null}
          {teammate.number ? (
            <AppText variant="caption" subtle>#{teammate.number}</AppText>
          ) : null}
        </View>
      </View>

      {isRoleKind(teammate.role) ? (
        <Badge label={t(`team.role.${teammate.role}`, teammate.role ?? '')} variant={roleVariant(teammate.role)} />
      ) : teammate.is_essential ? (
        <Badge label={t('team.essential', 'أساسي')} variant="success" />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  avatarWrap: { position: 'relative' },
  captainBadge: {
    position: 'absolute',
    bottom: -2,
    insetInlineEnd: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  info: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  name: { flexShrink: 1 },
  roleBadges: { flexDirection: 'row', gap: spacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  position: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
