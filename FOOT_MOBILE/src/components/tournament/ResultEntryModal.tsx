import { useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import { Goal, Plus, RotateCcw, Trash2, Trophy } from 'lucide-react-native';

import { getApiErrorMessage } from '@/api/errors';
import {
  type CommitteeFixture,
  type MatchEventPayload,
  type ResultPayload,
  useCommitteeTeamPlayers,
  useTournamentDeleteEvent,
  useTournamentDeleteResult,
  useTournamentFixtureEvents,
  useTournamentStoreEvent,
  useTournamentStoreResult,
} from '@/api/committeeTournaments';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { sizes, spacing } from '@/theme/spacing';

interface Props {
  tournamentId: number | string;
  fixture: CommitteeFixture;
  onClose: () => void;
}

/** Match statuses that no longer accept events or result edits. */
const LOCKED_STATUSES = ['finished', 'cancelled', 'postponed'];

const EVENT_TYPES: { type: string; label: string; emoji: string }[] = [
  { type: 'goal', label: 'Goal', emoji: '⚽' },
  { type: 'penalty_goal', label: 'Penalty', emoji: '🥅' },
  { type: 'own_goal', label: 'Own goal', emoji: '🙈' },
  { type: 'yellow_card', label: 'Yellow', emoji: '🟨' },
  { type: 'red_card', label: 'Red', emoji: '🟥' },
];

export function ResultEntryModal({ tournamentId, fixture, onClose }: Props): React.JSX.Element {
  const { t } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();

  const storeResult = useTournamentStoreResult();
  const deleteResult = useTournamentDeleteResult();
  const storeEvent = useTournamentStoreEvent(tournamentId, fixture.id);
  const deleteEvent = useTournamentDeleteEvent(tournamentId, fixture.id);

  const [home, setHome] = useState(
    fixture.match?.home_score != null ? String(fixture.match.home_score) : '',
  );
  const [away, setAway] = useState(
    fixture.match?.away_score != null ? String(fixture.match.away_score) : '',
  );
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Events
  const eventsQuery = useTournamentFixtureEvents(tournamentId, fixture.id);
  const events: MatchEventPayload[] = eventsQuery.data?.data ?? [];
  const [addingEvent, setAddingEvent] = useState(false);
  const [eventType, setEventType] = useState<string>('goal');
  const [eventTeam, setEventTeam] = useState<'home' | 'away'>('home');
  const [eventMinute, setEventMinute] = useState('');
  const [playerModalOpen, setPlayerModalOpen] = useState(false);
  const [playerSearch, setPlayerSearch] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<{ id: number; name: string } | null>(null);
  const [deleteEventTarget, setDeleteEventTarget] = useState<MatchEventPayload | null>(null);

  const homeId = fixture.home_team?.id;
  const awayId = fixture.away_team?.id;
  const teamId = eventTeam === 'home' ? homeId : awayId;
  const playersQuery = useCommitteeTeamPlayers(addingEvent ? teamId : undefined, playerSearch);
  const players = playersQuery.data?.data ?? [];

  const matchStatus = fixture.match?.status ?? null;
  const hasMatch = fixture.match?.id != null && matchStatus != null;
  const matchEditable = hasMatch && !LOCKED_STATUSES.includes(matchStatus as string);

  const hasResult = fixture.match?.home_score != null && fixture.match?.away_score != null;

  const submitResult = (): void => {
    const h = Number(home);
    const a = Number(away);
    if (!Number.isInteger(h) || h < 0 || !Number.isInteger(a) || a < 0) {
      toast.show(t('tournaments.result.invalidScore', 'Enter valid scores'), 'error');
      return;
    }
    const payload: ResultPayload = { home_score: h, away_score: a };
    storeResult.mutate(
      { tournamentId, fixtureId: fixture.id, payload },
      {
        onSuccess: (data) => {
          toast.show(data.message || t('tournaments.result.saved', 'Result saved'), 'success');
          onClose();
        },
        onError: (err) => {
          toast.show(getApiErrorMessage(err, t('tournaments.result.saveFailed', 'Could not save result')), 'error');
        },
      },
    );
  };

  const removeResult = (): void => {
    deleteResult.mutate(
      { tournamentId, fixtureId: fixture.id },
      {
        onSuccess: () => {
          toast.show(t('tournaments.result.deleted', 'Result removed'), 'success');
          setConfirmDeleteOpen(false);
          onClose();
        },
        onError: (err) => {
          toast.show(getApiErrorMessage(err, t('tournaments.result.deleteFailed', 'Could not remove result')), 'error');
        },
      },
    );
  };

  const saveEvent = (): void => {
    const minute = Number(eventMinute);
    if (!Number.isInteger(minute) || minute < 0 || minute > 130) {
      toast.show(t('tournaments.events.invalidMinute', 'Enter a valid minute'), 'error');
      return;
    }
    storeEvent.mutate(
      {
        type: eventType,
        team_id: teamId ?? undefined,
        player_id: selectedPlayer?.id,
        minute,
      },
      {
        onSuccess: () => {
          toast.show(t('tournaments.events.saved', 'Event added'), 'success');
          setAddingEvent(false);
          setSelectedPlayer(null);
          setEventMinute('');
        },
        onError: (err) => {
          toast.show(getApiErrorMessage(err, t('tournaments.events.saveFailed', 'Could not add event')), 'error');
        },
      },
    );
  };

  const removeEvent = (): void => {
    if (!deleteEventTarget) return;
    deleteEvent.mutate(
      deleteEventTarget.id,
      {
        onSuccess: () => {
          toast.show(t('tournaments.events.deleted', 'Event removed'), 'success');
          setDeleteEventTarget(null);
        },
        onError: (err) => {
          toast.show(getApiErrorMessage(err, t('tournaments.events.deleteFailed', 'Could not remove event')), 'error');
          setDeleteEventTarget(null);
        },
      },
    );
  };


  const eventSummary = (event: MatchEventPayload): string => {
    const label = EVENT_TYPES.find((et) => et.type === event.type)?.label;
    if (event.player?.name) return `${event.icon ?? '•'} ${event.player.name} · ${label ?? event.type}`;
    return `${event.icon ?? '•'} ${label ?? event.description ?? event.type}`;
  };

  return (
    <>
      <Modal visible onClose={onClose} title={t('tournaments.result.title', 'Enter result')}>
        <ScrollView showsVerticalScrollIndicator={false} style={styles.body}>
          <View style={styles.scoreRow}>
            <View style={styles.scoreInput}>
              <AppText variant="caption" muted numberOfLines={1}>
                {fixture.home_team?.name ?? t('tournaments.result.home', 'Home')}
              </AppText>
              <Input
                value={home}
                onChangeText={setHome}
                keyboardType="numeric"
                maxLength={2}
                containerStyle={styles.scoreField}
              />
            </View>
            <AppText variant="h2" muted style={styles.scoreDash}>
              –
            </AppText>
            <View style={styles.scoreInput}>
              <AppText variant="caption" muted numberOfLines={1}>
                {fixture.away_team?.name ?? t('tournaments.result.away', 'Away')}
              </AppText>
              <Input
                value={away}
                onChangeText={setAway}
                keyboardType="numeric"
                maxLength={2}
                containerStyle={styles.scoreField}
              />
            </View>
          </View>

          {hasMatch ? (
            <View style={styles.eventsBlock}>
              <View style={styles.blockTitleRow}>
                <Goal size={sizes.iconSm} color={colors.primary} />
                <AppText variant="bodyBold">{t('tournaments.result.events', 'Events')}</AppText>
              </View>

              {events.length === 0 && !addingEvent ? (
                <AppText variant="caption" muted>
                  {t('tournaments.events.none', 'No events recorded yet')}
                </AppText>
              ) : null}

              {events.map((event) => (
                <View key={event.id} style={styles.eventRow}>
                  <AppText variant="caption" muted style={styles.eventMinute}>
                    {event.minute != null ? `${event.minute}'` : ''}
                  </AppText>
                  <AppText variant="body" numberOfLines={1} style={styles.eventText}>
                    {eventSummary(event)}
                  </AppText>
                  {matchEditable ? (
                    <Button
                      title=""
                      variant="ghost"
                      size="sm"
                      leftIcon={<Trash2 size={sizes.iconSm} color={colors.danger} />}
                      accessibilityLabel={t('tournaments.events.delete', 'Remove event')}
                      onPress={() => setDeleteEventTarget(event)}
                    />
                  ) : null}
                </View>
              ))}

              {matchEditable ? (
                addingEvent ? (
                  <View style={styles.addEventForm}>
                    <View style={styles.typeRow}>
                      {EVENT_TYPES.map((et) => {
                        const active = et.type === eventType;
                        return (
                          <Button
                            key={et.type}
                            title={`${et.emoji} ${et.label}`}
                            size="sm"
                            variant={active ? 'primary' : 'outline'}
                            onPress={() => setEventType(et.type)}
                            style={styles.typeChip}
                          />
                        );
                      })}
                    </View>

                    <View style={styles.teamRow}>
                      <Button
                        title={fixture.home_team?.name ?? t('tournaments.result.home', 'Home')}
                        size="sm"
                        variant={eventTeam === 'home' ? 'primary' : 'outline'}
                        onPress={() => {
                          setEventTeam('home');
                          setSelectedPlayer(null);
                        }}
                        style={styles.flex}
                      />
                      <Button
                        title={fixture.away_team?.name ?? t('tournaments.result.away', 'Away')}
                        size="sm"
                        variant={eventTeam === 'away' ? 'primary' : 'outline'}
                        onPress={() => {
                          setEventTeam('away');
                          setSelectedPlayer(null);
                        }}
                        style={styles.flex}
                      />
                    </View>

                    <Button
                      title={
                        selectedPlayer
                          ? `${t('tournaments.events.player', 'Player')}: ${selectedPlayer.name}`
                          : t('tournaments.events.selectPlayer', 'Select player')
                      }
                      variant="outline"
                      size="sm"
                      fullWidth
                      onPress={() => setPlayerModalOpen(true)}
                    />

                    <Input
                      label={t('tournaments.events.minute', 'Minute')}
                      value={eventMinute}
                      onChangeText={setEventMinute}
                      keyboardType="numeric"
                      maxLength={3}
                    />

                    <View style={styles.eventActions}>
                      <Button
                        title={t('tournaments.events.save', 'Add event')}
                        size="sm"
                        onPress={saveEvent}
                        loading={storeEvent.isPending}
                        style={styles.flex}
                      />
                      <Button
                        title={t('common.cancel', 'Cancel')}
                        size="sm"
                        variant="ghost"
                        onPress={() => setAddingEvent(false)}
                        style={styles.flex}
                      />
                    </View>
                  </View>
                ) : (
                  <Button
                    title={t('tournaments.events.add', 'Add event')}
                    variant="outline"
                    size="sm"
                    leftIcon={<Plus size={sizes.iconSm} color={colors.primary} />}
                    fullWidth
                    onPress={() => setAddingEvent(true)}
                  />
                )
              ) : (
                <AppText variant="caption" muted>
                  {t('tournaments.events.locked', 'Match finished — events are locked')}
                </AppText>
              )}
            </View>
          ) : null}

          <View style={styles.actions}>
            <Button
              title={t('tournaments.result.save', 'Save result')}
              leftIcon={<Trophy size={sizes.iconMd} color={colors.textOnPrimary} />}
              onPress={submitResult}
              loading={storeResult.isPending}
              fullWidth
            />
            {hasResult ? (
              <Button
                title={t('tournaments.result.undo', 'Remove result')}
                variant="danger"
                leftIcon={<RotateCcw size={sizes.iconMd} color={colors.textOnPrimary} />}
                onPress={() => setConfirmDeleteOpen(true)}
                fullWidth
              />
            ) : null}
          </View>
        </ScrollView>
      </Modal>

      <Modal
        visible={playerModalOpen}
        onClose={() => setPlayerModalOpen(false)}
        title={t('tournaments.events.selectPlayer', 'Select player')}
      >
        <Input
          value={playerSearch}
          onChangeText={setPlayerSearch}
          placeholder={t('tournaments.events.playerSearch', 'Search players…')}
        />
        {playersQuery.isLoading ? (
          <AppText variant="caption" muted>
            {t('common.loading', 'Loading…')}
          </AppText>
        ) : players.length === 0 ? (
          <AppText variant="caption" muted>
            {t('tournaments.events.noPlayers', 'No players found for this team')}
          </AppText>
        ) : (
          <FlatList
            data={players}
            keyExtractor={(p) => String(p.id)}
            style={styles.playerList}
            renderItem={({ item }) => (
              <Button
                title={item.number != null ? `${item.number} · ${item.name}` : item.name}
                variant={selectedPlayer?.id === item.id ? 'primary' : 'outline'}
                size="sm"
                fullWidth
                onPress={() => {
                  setSelectedPlayer({ id: item.id, name: item.name });
                  setPlayerModalOpen(false);
                }}
              />
            )}
          />
        )}
      </Modal>

      <ConfirmationDialog
        visible={confirmDeleteOpen}
        title={t('tournaments.result.undoTitle', 'Remove this result?')}
        description={t('tournaments.result.undoDesc', 'The score and match outcome will be cleared.')}
        confirmLabel={t('tournaments.result.undo', 'Remove result')}
        cancelLabel={t('common.cancel', 'Cancel')}
        destructive
        loading={deleteResult.isPending}
        onConfirm={removeResult}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <ConfirmationDialog
        visible={deleteEventTarget != null}
        title={t('tournaments.events.deleteTitle', 'Remove this event?')}
        description={deleteEventTarget ? eventSummary(deleteEventTarget) : ''}
        confirmLabel={t('tournaments.events.delete', 'Remove event')}
        cancelLabel={t('common.cancel', 'Cancel')}
        destructive
        loading={deleteEvent.isPending}
        onConfirm={removeEvent}
        onCancel={() => setDeleteEventTarget(null)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  body: { maxHeight: 520 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  scoreInput: { flex: 1, gap: spacing.xs },
  scoreField: { marginTop: spacing.xs },
  scoreDash: { marginBottom: spacing.lg * 1.6 },
  eventsBlock: { marginTop: spacing.lg, gap: spacing.sm },
  blockTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  eventMinute: { width: 40 },
  eventText: { flex: 1 },
  addEventForm: { gap: spacing.md, marginTop: spacing.xs },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeChip: { flexGrow: 1 },
  teamRow: { flexDirection: 'row', gap: spacing.sm },
  eventActions: { flexDirection: 'row', gap: spacing.sm },
  playerList: { maxHeight: 320 },
  flex: { flex: 1 },
  actions: { gap: spacing.md, marginTop: spacing.lg },
});
