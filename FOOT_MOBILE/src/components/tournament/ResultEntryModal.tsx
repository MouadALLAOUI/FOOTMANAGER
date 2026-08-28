import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Goal, RotateCcw, Trophy } from 'lucide-react-native';

import { getApiErrorMessage } from '@/api/errors';
import {
  type CommitteeFixture,
  type MatchEventPayload,
  type ResultPayload,
  useTournamentDeleteResult,
  useTournamentFixtureEvents,
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

export function ResultEntryModal({ tournamentId, fixture, onClose }: Props): React.JSX.Element {
  const { t } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();

  const storeResult = useTournamentStoreResult();
  const deleteResult = useTournamentDeleteResult();

  const [home, setHome] = useState(
    fixture.match?.home_score != null ? String(fixture.match.home_score) : '',
  );
  const [away, setAway] = useState(
    fixture.match?.away_score != null ? String(fixture.match.away_score) : '',
  );
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const eventsQuery = useTournamentFixtureEvents(tournamentId, fixture.id);

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

  const events: MatchEventPayload[] = eventsQuery.data?.data ?? [];

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

          {events.length > 0 ? (
            <View style={styles.eventsBlock}>
              <View style={styles.blockTitleRow}>
                <Goal size={sizes.iconSm} color={colors.primary} />
                <AppText variant="bodyBold">{t('tournaments.result.events', 'Events')}</AppText>
              </View>
              {events.map((event) => (
                <View key={event.id} style={styles.eventRow}>
                  <AppText variant="caption" muted style={styles.eventMinute}>
                    {event.minute != null ? `${event.minute}'` : ''}
                  </AppText>
                  <AppText variant="body" numberOfLines={1} style={styles.eventText}>
                    {event.player?.name ?? event.team?.name ?? event.description ?? event.type ?? ''}
                  </AppText>
                </View>
              ))}
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
    </>
  );
}

const styles = StyleSheet.create({
  body: { maxHeight: 460 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  scoreInput: { flex: 1, gap: spacing.xs },
  scoreField: { marginTop: spacing.xs },
  scoreDash: { marginBottom: spacing.lg * 1.6 },
  eventsBlock: { marginTop: spacing.lg, gap: spacing.sm },
  blockTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  eventRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  eventMinute: { width: 40 },
  eventText: { flex: 1 },
  actions: { gap: spacing.md, marginTop: spacing.lg },
});
