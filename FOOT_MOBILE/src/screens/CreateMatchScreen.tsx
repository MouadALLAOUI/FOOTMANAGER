import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Globe, Lock, MapPin } from 'lucide-react-native';

import { useCreateMatchRequest, useStadiums } from '@/api/managerMatches';
import { getApiErrorMessage } from '@/api/errors';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';
import { formatDate } from '@/utils/format';
import type { SupportedLocale } from '@/types';

const FORMATS = ['5v5', '7v7', '8v8', '11v11'] as const;
const TIMES = buildTimeSlots();

function buildTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 9; h <= 22; h += 1) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  return slots;
}

function nextDayOptions(locale: SupportedLocale | string, count = 14): { label: string; iso: string }[] {
  const list: { label: string; iso: string }[] = [];
  const today = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    list.push({
      label: formatDate(d.toISOString(), locale, { weekday: 'short', day: 'numeric', month: 'short' }),
      iso: d.toISOString(),
    });
  }
  return list;
}

export default function CreateMatchScreen(): React.JSX.Element {
  const { t, locale } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();

  const days = useMemo(() => nextDayOptions(locale), [locale]);
  const [dateIso, setDateIso] = useState<string>(days[0]?.iso ?? '');
  const [startTime, setStartTime] = useState<string>(TIMES[0] ?? '19:00');
  const [endTime, setEndTime] = useState<string>('');
  const [format, setFormat] = useState<string>('7v7');
  const [isPublic, setIsPublic] = useState(true);
  const [stadiumId, setStadiumId] = useState<number | null>(null);
  const [customTerrain, setCustomTerrain] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [needsPlayers, setNeedsPlayers] = useState(true);
  const [playersNeeded, setPlayersNeeded] = useState('');

  const stadiumsQuery = useStadiums();
  const stadiums = useMemo(() => stadiumsQuery.data?.data ?? [], [stadiumsQuery.data]);
  const createMutation = useCreateMatchRequest();

  const endTimeValue = endTime || addHour(startTime);
  const startH = startTime.split(':')[0];
  const endH = endTimeValue.split(':')[0];

  const handleCreate = (): void => {
    createMutation.mutate(
      {
        stadium_id: isPublic ? stadiumId : undefined,
        custom_terrain_name: !isPublic && customTerrain ? customTerrain : undefined,
        match_datetime: dateIso,
        start_time: startTime,
        end_time: endTimeValue,
        player_format: format,
        notes: notes || undefined,
        price_per_player: price ? Number(price) : undefined,
        needs_players: needsPlayers,
        players_needed: needsPlayers ? Number(playersNeeded) || undefined : undefined,
        positions_needed: undefined,
      },
      {
        onSuccess: (res) => {
          toast.show(res.message ?? t('managerMatch.created', 'تم إنشاء المباراة'), 'success');
          router.back();
        },
        onError: (err) => {
          toast.show(getApiErrorMessage(err, t('managerMatch.createFailed', 'تعذر إنشاء المباراة')), 'error');
        },
      },
    );
  };

  const canSubmit =
    (isPublic ? stadiumId !== null : customTerrain.trim().length > 0) &&
    (!needsPlayers || Number(playersNeeded) > 0) &&
    Number(startH) < Number(endH);

  return (
    <Screen padded={false}>
      <ScreenHeader title={t('match.create', 'إنشاء مباراة')} showBack />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText variant="label" style={{ color: colors.textMuted }}>
          {t('managerMatch.dateTitle', 'التاريخ')}
        </AppText>
        <View style={styles.chipWrap}>
          {days.map((d) => {
            const selected = d.iso === dateIso;
            return (
              <Pressable
                key={d.iso}
                onPress={() => setDateIso(d.iso)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.chip, { borderColor: selected ? colors.primary : colors.border }, selected && { backgroundColor: colors.primary }]}
              >
                <AppText variant="captionBold" style={{ color: selected ? colors.textOnPrimary : colors.text }}>
                  {d.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <AppText variant="label" style={{ color: colors.textMuted, marginTop: spacing.md }}>
          {t('managerMatch.timeTitle', 'الوقت')} — {t('managerMatch.startLabel', 'البداية')}
        </AppText>
        <View style={styles.chipWrap}>
          {TIMES.map((tSlot) => {
            const selected = tSlot === startTime;
            return (
              <Pressable
                key={tSlot}
                onPress={() => setStartTime(tSlot)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.chip, { borderColor: selected ? colors.primary : colors.border }, selected && { backgroundColor: colors.primary }]}
              >
                <AppText variant="captionBold" style={{ color: selected ? colors.textOnPrimary : colors.text }}>
                  {tSlot}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <AppText variant="label" style={{ color: colors.textMuted, marginTop: spacing.md }}>
          {t('managerMatch.endLabel', 'النهاية (اختياري)')}
        </AppText>
        <View style={styles.chipWrap}>
          {TIMES.filter((s) => Number(s.split(':')[0]) > Number(startTime.split(':')[0])).map((tSlot) => {
            const selected = tSlot === endTimeValue;
            return (
              <Pressable
                key={tSlot}
                onPress={() => setEndTime(tSlot)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.chip, { borderColor: selected ? colors.primary : colors.border }, selected && { backgroundColor: colors.primary }]}
              >
                <AppText variant="captionBold" style={{ color: selected ? colors.textOnPrimary : colors.text }}>
                  {tSlot}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <AppText variant="label" style={{ color: colors.textMuted, marginTop: spacing.md }}>
          {t('managerMatch.formatTitle', 'صيغة الفريق')}
        </AppText>
        <View style={styles.chipWrap}>
          {FORMATS.map((f) => {
            const selected = f === format;
            return (
              <Pressable
                key={f}
                onPress={() => setFormat(f)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.chip, { borderColor: selected ? colors.primary : colors.border }, selected && { backgroundColor: colors.primary }]}
              >
                <AppText variant="captionBold" style={{ color: selected ? colors.textOnPrimary : colors.text }}>
                  {f.toUpperCase()}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        <AppText variant="label" style={{ color: colors.textMuted, marginTop: spacing.md }}>
          {t('managerMatch.visibilityTitle', 'الرؤية')}
        </AppText>
        <View style={[styles.segmented, { backgroundColor: colors.bgMuted }]}>
          <Pressable
            onPress={() => setIsPublic(true)}
            style={[styles.segment, isPublic ? { backgroundColor: colors.primary } : null]}
            accessibilityRole="button"
            accessibilityState={{ selected: isPublic }}
          >
            <Globe size={16} color={isPublic ? colors.textOnPrimary : colors.textMuted} />
            <AppText variant="captionBold" color={isPublic ? colors.textOnPrimary : colors.textMuted}>
              {t('managerMatch.visibilityPublic', 'عامة')}
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => setIsPublic(false)}
            style={[styles.segment, !isPublic ? { backgroundColor: colors.primary } : null]}
            accessibilityRole="button"
            accessibilityState={{ selected: !isPublic }}
          >
            <Lock size={16} color={!isPublic ? colors.textOnPrimary : colors.textMuted} />
            <AppText variant="captionBold" color={!isPublic ? colors.textOnPrimary : colors.textMuted}>
              {t('managerMatch.visibilityPrivate', 'خاصة')}
            </AppText>
          </Pressable>
        </View>

        {isPublic ? (
          <>
            <AppText variant="label" style={{ color: colors.textMuted, marginTop: spacing.md }}>
              {t('managerMatch.venueTitle', 'الملعب')}
            </AppText>
            <View style={styles.chipWrap}>
              {stadiums.map((s) => {
                const selected = s.id === stadiumId;
                return (
                  <Pressable
                    key={s.id}
                    onPress={() => setStadiumId(selected ? null : s.id)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[styles.chip, { borderColor: selected ? colors.primary : colors.border }, selected && { backgroundColor: colors.primary }]}
                  >
                    <AppText variant="captionBold" style={{ color: selected ? colors.textOnPrimary : colors.text }}>
                      {s.name}
                    </AppText>
                  </Pressable>
                );
              })}
              {stadiums.length === 0 ? (
                <View style={styles.hintRow}>
                  <MapPin size={16} color={colors.textMuted} />
                  <AppText variant="caption" muted>
                    {t('managerMatch.noVenues', 'لا توجد ملاعب متاحة')}
                  </AppText>
                </View>
              ) : null}
            </View>
          </>
        ) : (
          <Input
            label={t('managerMatch.customTerrain', 'اسم الملعب (خاص)')}
            placeholder={t('managerMatch.customTerrainPlaceholder', 'مثال: ملعب الحي')}
            value={customTerrain}
            onChangeText={setCustomTerrain}
            containerStyle={{ marginTop: spacing.md }}
          />
        )}

        <Input
          label={t('managerMatch.priceLabel', 'السعر لكل لاعب')}
          placeholder="0"
          keyboardType="numeric"
          value={price}
          onChangeText={setPrice}
          containerStyle={{ marginTop: spacing.md }}
        />
        <Input
          label={t('managerMatch.notesLabel', 'ملاحظات')}
          placeholder={t('managerMatch.notesPlaceholder', 'تفاصيل إضافية للمباراة')}
          value={notes}
          onChangeText={setNotes}
          containerStyle={{ marginTop: spacing.md }}
          multiline
        />

        <View style={[styles.segmented, { backgroundColor: colors.bgMuted, marginTop: spacing.md }]}>
          <Pressable
            onPress={() => setNeedsPlayers(true)}
            style={[styles.segment, needsPlayers ? { backgroundColor: colors.primary } : null]}
            accessibilityRole="button"
            accessibilityState={{ selected: needsPlayers }}
          >
            <AppText variant="captionBold" color={needsPlayers ? colors.textOnPrimary : colors.textMuted}>
              {t('managerMatch.needsPlayersYes', 'أحتاج لاعبين')}
            </AppText>
          </Pressable>
          <Pressable
            onPress={() => setNeedsPlayers(false)}
            style={[styles.segment, !needsPlayers ? { backgroundColor: colors.primary } : null]}
            accessibilityRole="button"
            accessibilityState={{ selected: !needsPlayers }}
          >
            <AppText variant="captionBold" color={!needsPlayers ? colors.textOnPrimary : colors.textMuted}>
              {t('managerMatch.needsPlayersNo', 'لست بحاجة')}
            </AppText>
          </Pressable>
        </View>

        {needsPlayers ? (
          <Input
            label={t('managerMatch.playersNeededLabel', 'عدد اللاعبين المطلوب')}
            placeholder="7"
            keyboardType="numeric"
            value={playersNeeded}
            onChangeText={setPlayersNeeded}
            containerStyle={{ marginTop: spacing.md }}
          />
        ) : null}

        <Button
          title={t('managerMatch.submitCreate', 'إنشاء المباراة')}
          onPress={handleCreate}
          loading={createMutation.isPending}
          disabled={!canSubmit}
          fullWidth
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </Screen>
  );
}

function addHour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const next = (h + 1) % 24;
  return `${String(next).padStart(2, '0')}:${String(m ?? 0).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing['3xl'] },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  segmented: {
    flexDirection: 'row',
    borderRadius: radius.lg,
    padding: spacing.xs,
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
