import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import {
  CalendarDays,
  Check,
  Crown,
  MapPin,
  Swords,
  Trophy,
  Users,
  X,
} from 'lucide-react-native';

import { getApiErrorMessage } from '@/api/errors';
import {
  type CommitteeFixture,
  type CommitteeStandings,
  type CommitteeTournamentDetail,
  type CommitteeTournamentTeam,
  useCommitteeTournament,
  useTournamentCancel,
  useTournamentDecideRegistration,
  useTournamentFixtures,
  useTournamentRegistrationAction,
  useTournamentRegistrations,
  useTournamentStandings,
  useTournamentStart,
  useTournamentTeams,
} from '@/api/committeeTournaments';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { ResultEntryModal } from '@/components/tournament/ResultEntryModal';
import { tournamentStatusLabel } from '@/components/tournament/TournamentStatusBadge';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';

type TabKey = 'overview' | 'teams' | 'fixtures';
type TFunc = (key: string, fallback?: string) => string;

const statusColor: Record<string, string> = {
  draft: '#64748b',
  open_for_registration: '#16a34a',
  registration_closed: '#2563eb',
  in_progress: '#d97706',
  completed: '#475569',
  cancelled: '#e11d48',
};

function StatTile({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.statTile, { backgroundColor: colors.bgMuted }]}>
      <View style={styles.statIcon}>{icon}</View>
      <AppText variant="caption" muted align="center">
        {label}
      </AppText>
      <AppText variant="bodyBold" align="center">
        {value}
      </AppText>
    </View>
  );
}

interface DetailActionsProps {
  tournament: CommitteeTournamentDetail;
  onOpenRegistration: () => void;
  onCloseRegistration: () => void;
  onStart: () => void;
  onCancel: () => void;
  loading: boolean;
}

function DetailActions({
  tournament,
  onOpenRegistration,
  onCloseRegistration,
  onStart,
  onCancel,
  loading,
}: DetailActionsProps): React.JSX.Element {
  const { t } = useI18n();
  const status = tournament.status;
  const stats = tournament.stats;
  const canStart =
    status === 'registration_closed' &&
    (stats?.registered_teams ?? 0) >= (tournament.teams_count ?? 0);

  return (
    <View style={styles.actionList}>
      {status === 'draft' ? (
        <Button
          title={t('tournaments.action.openRegistration', 'Open registration')}
          onPress={onOpenRegistration}
          loading={loading}
          fullWidth
        />
      ) : null}

      {status === 'open_for_registration' ? (
        <Button
          title={t('tournaments.action.closeRegistration', 'Close registration')}
          variant="outline"
          onPress={onCloseRegistration}
          loading={loading}
          fullWidth
        />
      ) : null}

      {status === 'registration_closed' ? (
        canStart ? (
          <Button
            title={t('tournaments.action.start', 'Start tournament')}
            leftIcon={<Trophy size={20} color="#fff" />}
            onPress={onStart}
            loading={loading}
            fullWidth
          />
        ) : (
          <AppText variant="caption" muted align="center">
            {t('tournaments.action.startHint', 'Add all teams to start the tournament.')}
          </AppText>
        )
      ) : null}

      {['draft', 'open_for_registration', 'registration_closed'].includes(status) ? (
        <Button
          title={t('tournaments.action.cancel', 'Cancel tournament')}
          variant="danger"
          onPress={onCancel}
          fullWidth
        />
      ) : null}
    </View>
  );
}

function FixtureRow({
  fixture,
  t,
  formatDate,
  onEnterResult,
}: {
  fixture: CommitteeFixture;
  t: TFunc;
  formatDate: (v: string | Date, o?: Intl.DateTimeFormatOptions) => string;
  onEnterResult: (f: CommitteeFixture) => void;
}): React.JSX.Element {
  const m = fixture.match;
  const hasScore = m?.home_score != null && m?.away_score != null;
  const finished = m?.status === 'finished';

  return (
    <Card padded={false} style={styles.fixtureCard}>
      <View style={styles.fixtureRow}>
        <View style={styles.fixtureTeams}>
          <AppText variant="body" numberOfLines={1} style={styles.fixtureTeamName}>
            {fixture.home_team?.name ?? '—'}
          </AppText>
          <View style={styles.fixtureScore}>
            {hasScore ? (
              <AppText variant="h2">{m.home_score} – {m.away_score}</AppText>
            ) : (
              <AppText variant="caption" muted>
                {t('tournaments.fixture.notPlayed', 'Not played')}
              </AppText>
            )}
          </View>
          <AppText variant="body" numberOfLines={1} style={styles.fixtureTeamName}>
            {fixture.away_team?.name ?? '—'}
          </AppText>
        </View>
        <View style={styles.fixtureMeta}>
          {fixture.scheduled_at ? (
            <AppText variant="caption" muted>
              {formatDate(fixture.scheduled_at, { day: 'numeric', month: 'short' })}
            </AppText>
          ) : null}
          {fixture.group?.name ? (
            <AppText variant="caption" muted>
              {fixture.group.name}
            </AppText>
          ) : null}
          <Button
            title={finished ? t('tournaments.result.edit', 'Edit result') : t('tournaments.result.enter', 'Enter result')}
            size="sm"
            variant={finished ? 'outline' : 'secondary'}
            onPress={() => onEnterResult(fixture)}
          />
        </View>
      </View>
    </Card>
  );
}

function StandingsTable({ standings, t }: { standings: CommitteeStandings | undefined; t: TFunc }): React.JSX.Element {
  const { colors } = useTheme();
  const groups = standings?.groups ?? [];

  if (groups.length === 0) {
    return (
      <AppText variant="caption" muted align="center">
        {t('tournaments.standings.empty', 'No standings available yet.')}
      </AppText>
    );
  }

  return (
    <View style={styles.standingsWrap}>
      {groups.map((group, gi) => (
        <View key={gi} style={styles.standingsGroup}>
          <AppText variant="bodyBold" style={styles.groupTitle}>
            {group.name || t('tournaments.standings.unassigned', 'Unassigned')}
          </AppText>
          <View style={[styles.standingsTable, { borderColor: colors.border }]}>
            <View style={[styles.standingsHeader, { backgroundColor: colors.bgMuted }]}>
              <AppText variant="captionBold" style={styles.colTeam}>{t('tournaments.standings.team', 'Team')}</AppText>
              <AppText variant="captionBold" style={styles.colNum}>{t('tournaments.standings.p', 'P')}</AppText>
              <AppText variant="captionBold" style={styles.colNum}>{t('tournaments.standings.w', 'W')}</AppText>
              <AppText variant="captionBold" style={styles.colNum}>{t('tournaments.standings.d', 'D')}</AppText>
              <AppText variant="captionBold" style={styles.colNum}>{t('tournaments.standings.l', 'L')}</AppText>
              <AppText variant="captionBold" style={styles.colPts}>{t('tournaments.standings.pts', 'Pts')}</AppText>
            </View>
            {group.rows.map((row) => (
              <View key={row.team_id} style={styles.standingsRow}>
                <AppText variant="body" numberOfLines={1} style={styles.colTeam}>
                  {row.team?.name ?? `#${row.team_id}`}
                </AppText>
                <AppText variant="body" style={styles.colNum}>{row.played}</AppText>
                <AppText variant="body" style={styles.colNum}>{row.wins}</AppText>
                <AppText variant="body" style={styles.colNum}>{row.draws}</AppText>
                <AppText variant="body" style={styles.colNum}>{row.losses}</AppText>
                <AppText variant="bodyBold" style={styles.colPts}>{row.points}</AppText>
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

export default function TournamentDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const tournamentId = Array.isArray(id) ? id[0] : id;
  const { t, formatDate } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [confirmAction, setConfirmAction] = useState<'open' | 'close' | 'start' | 'cancel' | null>(null);
  const [resultFixture, setResultFixture] = useState<CommitteeFixture | undefined>(undefined);

  const detailQuery = useCommitteeTournament(tournamentId);
  const registrationsQuery = useTournamentRegistrations(tournamentId);
  const teamsQuery = useTournamentTeams(tournamentId);

  const regAction = useTournamentRegistrationAction();
  const startAction = useTournamentStart();
  const cancelAction = useTournamentCancel();
  const decide = useTournamentDecideRegistration();

  const tournament = detailQuery.data?.data;

  const runConfirm = (): void => {
    if (!tournamentId || !confirmAction || !tournament) return;
    const action = confirmAction;

    if (action === 'open' || action === 'close') {
      regAction.mutate(
        { id: tournamentId, action },
        {
          onSuccess: () => {
            toast.show(t(`tournaments.action.${action}Done`, 'Updated'), 'success');
            setConfirmAction(null);
          },
          onError: (err) => {
            toast.show(getApiErrorMessage(err, t('tournaments.action.failed', 'Action failed')), 'error');
            setConfirmAction(null);
          },
        },
      );
      return;
    }

    if (action === 'start') {
      startAction.mutate(tournamentId, {
        onSuccess: () => {
          toast.show(t('tournaments.action.startDone', 'Tournament started'), 'success');
          setConfirmAction(null);
        },
        onError: (err) => {
          toast.show(getApiErrorMessage(err, t('tournaments.action.failed', 'Action failed')), 'error');
          setConfirmAction(null);
        },
      });
      return;
    }

    cancelAction.mutate(tournamentId, {
      onSuccess: () => {
        toast.show(t('tournaments.action.cancelDone', 'Tournament cancelled'), 'success');
        setConfirmAction(null);
      },
      onError: (err) => {
        toast.show(getApiErrorMessage(err, t('tournaments.action.failed', 'Action failed')), 'error');
        setConfirmAction(null);
      },
    });
  };

  const decideRequest = (team: CommitteeTournamentTeam, action: 'approve' | 'reject'): void => {
    const teamId = team?.team?.id;
    if (!tournamentId || !teamId) return;
    decide.mutate(
      { id: tournamentId, teamId, action },
      {
        onSuccess: () => {
          toast.show(
            action === 'approve'
              ? t('tournaments.teams.approved', 'Team approved')
              : t('tournaments.teams.rejected', 'Request declined'),
            'success',
          );
        },
        onError: (err) => {
          toast.show(getApiErrorMessage(err, t('tournaments.teams.actionFailed', 'Action failed')), 'error');
        },
      },
    );
  };

  if (detailQuery.isLoading) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('tournament.detail', 'Tournament details')} showBack />
        <View style={styles.skeletonWrap}>
          <Skeleton height={180} radiusValue={16} />
          <Skeleton height={120} radiusValue={16} />
          <Skeleton height={160} radiusValue={16} />
        </View>
      </Screen>
    );
  }

  if (!tournament) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('tournament.detail', 'Tournament details')} showBack />
        <ErrorState
          message={detailQuery.error ? getApiErrorMessage(detailQuery.error, t('tournaments.loadFailed', 'Could not load tournament')) : t('tournament.notFound', 'Tournament not found')}
          onRetry={() => void detailQuery.refetch()}
        />
      </Screen>
    );
  }

  const stats = tournament.stats;
  const registrations = registrationsQuery.data?.data ?? [];
  const pending = registrations.filter((r) => r.status === 'pending');
  const teams = teamsQuery.data?.data ?? [];

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'overview', label: t('tournaments.tab.overview', 'Overview') },
    { key: 'teams', label: t('tournaments.tab.teams', 'Teams') },
    { key: 'fixtures', label: t('tournaments.tab.fixtures', 'Fixtures') },
  ];

  return (
    <Screen padded={false}>
      <ScreenHeader title={tournament.name ?? t('tournament.detail', 'Tournament details')} showBack />

      <View style={[styles.tabRow, { backgroundColor: colors.bgMuted }]}>
        {tabs.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={[styles.tabButton, { backgroundColor: active ? colors.surface : 'transparent' }]}
            >
              <AppText variant="captionBold" style={{ color: active ? colors.primary : colors.textMuted }}>
                {tab.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' ? (
          <>
            <View style={styles.titleRow}>
              <AppText variant="h2" style={styles.name}>{tournament.name}</AppText>
              <View style={styles.badgeWrap}>
                <View
                  style={{
                    backgroundColor: statusColor[tournament.status] ?? '#64748b',
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: radius.full,
                  }}
                >
                  <AppText variant="captionBold" color="#fff">
                    {tournamentStatusLabel(t, tournament.status)}
                  </AppText>
                </View>
              </View>
            </View>

            {tournament.description ? (
              <AppText variant="body" muted>
                {tournament.description}
              </AppText>
            ) : null}

            <View style={styles.statsGrid}>
              <StatTile icon={<Users size={18} color={colors.primary} />} label={t('tournaments.stats.registered', 'Teams')} value={stats?.registered_teams ?? 0} />
              <StatTile icon={<Users size={18} color={colors.amber} />} label={t('tournaments.stats.pending', 'Pending')} value={stats?.pending_registrations ?? 0} />
              <StatTile icon={<Swords size={18} color={colors.primary} />} label={t('tournaments.stats.fixtures', 'Fixtures')} value={stats?.fixtures ?? 0} />
              <StatTile icon={<Crown size={18} color={colors.amber} />} label={t('tournaments.stats.finished', 'Finished')} value={stats?.finished_matches ?? 0} />
            </View>

            <DetailActions
              tournament={tournament}
              onOpenRegistration={() => setConfirmAction('open')}
              onCloseRegistration={() => setConfirmAction('close')}
              onStart={() => setConfirmAction('start')}
              onCancel={() => setConfirmAction('cancel')}
              loading={regAction.isPending || startAction.isPending}
            />

            <Card>
              <View style={styles.infoBlock}>
                {tournament.stadium ? (
                  <View style={styles.infoRow}>
                    <MapPin size={18} color={colors.primary} />
                    <AppText variant="body" style={styles.infoText}>{tournament.stadium.name}</AppText>
                  </View>
                ) : null}
                {tournament.location ? (
                  <View style={styles.infoRow}>
                    <MapPin size={18} color={colors.primary} />
                    <AppText variant="body" style={styles.infoText}>{tournament.location}</AppText>
                  </View>
                ) : null}
                <View style={styles.infoRow}>
                  <CalendarDays size={18} color={colors.primary} />
                  <AppText variant="body" style={styles.infoText}>
                    {tournament.start_date
                      ? `${formatDate(tournament.start_date, { day: 'numeric', month: 'short', year: 'numeric' })} – ${tournament.end_date ? formatDate(tournament.end_date, { day: 'numeric', month: 'short', year: 'numeric' }) : ''}`
                      : '—'}
                  </AppText>
                </View>
                {tournament.organizer ? (
                  <View style={styles.infoRow}>
                    <Users size={18} color={colors.primary} />
                    <AppText variant="body" style={styles.infoText}>{tournament.organizer.name}</AppText>
                  </View>
                ) : null}
              </View>
            </Card>
          </>
        ) : null}

        {activeTab === 'teams' ? (
          <>
            {pending.length > 0 ? (
              <View style={styles.section}>
                <AppText variant="h3">{t('tournaments.teams.pending', 'Join requests')}</AppText>
                {pending.map((item) => (
                  <Card key={item.team?.id ?? item.id} padded={false} style={styles.teamCard}>
                    <View style={styles.teamRow}>
                      <View style={styles.teamInfo}>
                        <AppText variant="bodyBold">{item.team?.name ?? '—'}</AppText>
                        {item.team?.city ? (
                          <AppText variant="caption" muted>{item.team.city}</AppText>
                        ) : null}
                      </View>
                      <View style={styles.teamActions}>
                        <Button
                          title={t('tournaments.teams.approve', 'Approve')}
                          size="sm"
                          leftIcon={<Check size={16} color="#fff" />}
                          onPress={() => decideRequest(item, 'approve')}
                          loading={decide.isPending}
                        />
                        <Button
                          title={t('tournaments.teams.reject', 'Decline')}
                          size="sm"
                          variant="danger"
                          leftIcon={<X size={16} color="#fff" />}
                          onPress={() => decideRequest(item, 'reject')}
                        />
                      </View>
                    </View>
                  </Card>
                ))}
              </View>
            ) : null}

            <View style={styles.section}>
              <AppText variant="h3">{t('tournaments.teams.registered', 'Registered teams')}</AppText>
              {teamsQuery.isLoading ? (
                <View style={styles.skeletonWrap}>
                  <Skeleton height={60} radiusValue={12} />
                  <Skeleton height={60} radiusValue={12} />
                </View>
              ) : teams.length === 0 ? (
                <AppText variant="caption" muted>
                  {t('tournaments.teams.empty', 'No teams registered yet.')}
                </AppText>
              ) : (
                teams.map((item) => (
                  <Card key={item.team?.id ?? item.id} padded={false} style={styles.teamCard}>
                    <View style={styles.teamRow}>
                      <View style={styles.teamInfo}>
                        <AppText variant="bodyBold">{item.team?.name ?? '—'}</AppText>
                        {item.group ? (
                          <AppText variant="caption" muted>{item.group.name}</AppText>
                        ) : null}
                      </View>
                      {item.payment_status === 'pending' && tournament.requires_registration_fee ? (
                        <AppText variant="caption" muted>
                          {t('tournaments.teams.paymentPending', 'Payment pending')}
                        </AppText>
                      ) : null}
                    </View>
                  </Card>
                ))
              )}
            </View>
          </>
        ) : null}

        {activeTab === 'fixtures' ? (
          <FixturesView tournamentId={tournament.id} onEnterResult={setResultFixture} />
        ) : null}
      </ScrollView>

      <ConfirmationDialog
        visible={confirmAction != null}
        title={
          confirmAction === 'open'
            ? t('tournaments.action.openTitle', 'Open registration?')
            : confirmAction === 'close'
              ? t('tournaments.action.closeTitle', 'Close registration?')
              : confirmAction === 'start'
                ? t('tournaments.action.startTitle', 'Start this tournament?')
                : confirmAction === 'cancel'
                  ? t('tournaments.action.cancelTitle', 'Cancel this tournament?')
                  : ''
        }
        description={
          confirmAction === 'start'
            ? t('tournaments.action.startDesc', 'The draw and team list will be locked.')
            : confirmAction === 'cancel'
              ? t('tournaments.action.cancelDesc', 'This will cancel the tournament permanently.')
              : undefined
        }
        confirmLabel={
          confirmAction === 'start'
            ? t('tournaments.action.start', 'Start')
            : confirmAction === 'cancel'
              ? t('tournaments.action.cancel', 'Cancel tournament')
              : t('common.confirm', 'Confirm')
        }
        cancelLabel={t('common.cancel', 'Cancel')}
        destructive={confirmAction === 'cancel'}
        loading={regAction.isPending || startAction.isPending || cancelAction.isPending}
        onConfirm={runConfirm}
        onCancel={() => setConfirmAction(null)}
      />

      {resultFixture ? (
        <ResultEntryModal
          tournamentId={tournament.id}
          fixture={resultFixture}
          onClose={() => setResultFixture(undefined)}
        />
      ) : null}
    </Screen>
  );
}

function FixturesView({
  tournamentId,
  onEnterResult,
}: {
  tournamentId: number | string;
  onEnterResult: (f: CommitteeFixture) => void;
}): React.JSX.Element {
  const { t, formatDate } = useI18n();
  const { colors } = useTheme();
  const [view, setView] = useState<'fixtures' | 'standings'>('fixtures');

  const fixturesQuery = useTournamentFixtures(tournamentId);
  const standingsQuery = useTournamentStandings(tournamentId);
  const fixtures = fixturesQuery.data?.data ?? [];

  return (
    <>
      <View style={styles.segRow}>
        <View style={[styles.segControl, { backgroundColor: colors.bgMuted }]}>
          <Pressable
            onPress={() => setView('fixtures')}
            style={[styles.segButton, { backgroundColor: view === 'fixtures' ? colors.surface : 'transparent' }]}
          >
            <AppText variant="captionBold" style={{ color: view === 'fixtures' ? colors.primary : colors.textMuted }}>
              {t('tournaments.tab.fixtures', 'Fixtures')}
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => setView('standings')}
            style={[styles.segButton, { backgroundColor: view === 'standings' ? colors.surface : 'transparent' }]}
          >
            <AppText variant="captionBold" style={{ color: view === 'standings' ? colors.primary : colors.textMuted }}>
              {t('tournaments.tab.standings', 'Standings')}
            </AppText>
          </Pressable>
        </View>
      </View>

      {view === 'fixtures' ? (
        fixturesQuery.isLoading ? (
          <View style={styles.skeletonWrap}>
            <Skeleton height={80} radiusValue={12} />
            <Skeleton height={80} radiusValue={12} />
          </View>
        ) : fixturesQuery.error ? (
          <ErrorState
            message={getApiErrorMessage(fixturesQuery.error, t('tournaments.loadFailed', 'Could not load fixtures'))}
            onRetry={() => void fixturesQuery.refetch()}
          />
        ) : fixtures.length === 0 ? (
          <AppText variant="caption" muted align="center">
            {t('tournaments.fixtures.empty', 'No fixtures scheduled yet.')}
          </AppText>
        ) : (
          fixtures.map((fixture) => (
            <FixtureRow
              key={fixture.id}
              fixture={fixture}
              t={t}
              formatDate={formatDate}
              onEnterResult={onEnterResult}
            />
          ))
        )
      ) : standingsQuery.isLoading ? (
        <View style={styles.skeletonWrap}>
          <Skeleton height={120} radiusValue={12} />
        </View>
      ) : standingsQuery.error ? (
        <ErrorState
          message={getApiErrorMessage(standingsQuery.error, t('tournaments.loadFailed', 'Could not load standings'))}
          onRetry={() => void standingsQuery.refetch()}
        />
      ) : (
        <StandingsTable standings={standingsQuery.data?.data} t={t} />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  skeletonWrap: { padding: spacing.lg, gap: spacing.md },
  tabRow: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radius.lg,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  content: { padding: spacing.lg, paddingBottom: spacing['5xl'], gap: spacing.lg },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  name: { flex: 1 },
  badgeWrap: { justifyContent: 'center', marginStart: spacing.sm },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statTile: {
    flex: 1,
    minWidth: '40%',
    borderRadius: radius.lg,
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.xs,
  },
  statIcon: { marginBottom: spacing.xs },
  actionList: { gap: spacing.md },
  infoBlock: { gap: spacing.md },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  infoText: { flex: 1 },
  section: { gap: spacing.md },
  teamCard: { padding: spacing.lg },
  teamRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  teamInfo: { flex: 1, gap: 2 },
  teamActions: { flexDirection: 'row', gap: spacing.sm },
  segRow: { marginBottom: spacing.sm },
  segControl: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    padding: 4,
  },
  segButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  fixtureCard: { padding: spacing.lg },
  fixtureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  fixtureTeams: { flex: 1, gap: spacing.xs },
  fixtureTeamName: { maxWidth: '90%' },
  fixtureScore: { alignItems: 'center' },
  fixtureMeta: { alignItems: 'flex-end', gap: spacing.xs },
  standingsWrap: { gap: spacing.lg },
  standingsGroup: { gap: spacing.sm },
  groupTitle: { marginStart: spacing.xs },
  standingsTable: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, overflow: 'hidden' },
  standingsHeader: { flexDirection: 'row', paddingVertical: spacing.sm, paddingHorizontal: spacing.sm },
  standingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
  },
  colTeam: { flex: 1 },
  colNum: { width: 26, textAlign: 'center' },
  colPts: { width: 36, textAlign: 'center' },
});
