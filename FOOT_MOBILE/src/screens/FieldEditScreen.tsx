import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Armchair,
  Clock,
  ImagePlus,
  Images as ImagesIcon,
  MapPin,
  Shield,
  Sun,
  Tag,
  Timer,
  Trophy,
  Users,
  Warehouse,
  Wrench,
} from 'lucide-react-native';

import { getApiErrorMessage } from '@/api/errors';
import {
  type OwnerTerrain,
  type TerrainScheduleDto,
  useOwnerTerrain,
  useSetTerrainCover,
  useToggleTerrainStatus,
  useUpdateTerrain,
  useUpdateWorkingHours,
  useUploadTerrainImages,
} from '@/api/ownerTerrains';
import { AppText } from '@/components/ui/AppText';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { ErrorState } from '@/components/ui/ErrorState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Screen } from '@/components/ui/Screen';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, sizes, spacing } from '@/theme/spacing';
import { compressImage } from '@/utils/image';

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function normalize(value: string | number | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMoney(value: string | number | null | undefined): string {
  const n = normalize(value);
  return Number.isFinite(n) && n >= 0 ? String(Math.round(n * 100) / 100) : '-';
}

function SectionHeader({ icon, title, hint }: { icon: React.ReactNode; title: string; hint?: string }): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={[styles.sectionIcon, { backgroundColor: colors.bgMuted }]}>{icon}</View>
      <View style={styles.sectionHeaderText}>
        <AppText variant="h3">{title}</AppText>
        {hint ? (
          <AppText variant="caption" muted>
            {hint}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

function DetailChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }): React.JSX.Element {
  const { colors } = useTheme();
  return (
    <View style={[styles.chip, { backgroundColor: colors.bgMuted }]}>
      {icon}
      <View style={styles.chipText}>
        <AppText variant="small" subtle>
          {label}
        </AppText>
        <AppText variant="bodyBold">{value}</AppText>
      </View>
    </View>
  );
}

function MetadataGrid({ terrain, t }: { terrain: OwnerTerrain; t: (k: string, f?: string) => string }): React.JSX.Element {
  const { colors } = useTheme();
  const prim = colors.primary;
  const typeKey = terrain.type ?? 'salle';
  return (
    <View style={styles.grid}>
      <DetailChip icon={<Trophy size={sizes.iconMd} color={prim} />} label={t('field.type', 'Type')} value={t(`field.type.${typeKey}`, typeKey)} />
      <DetailChip icon={<Shield size={sizes.iconMd} color={prim} />} label={t('field.format', 'Format')} value={terrain.player_format ?? '—'} />
      <DetailChip icon={<Users size={sizes.iconMd} color={prim} />} label={t('field.capacity', 'Capacity')} value={terrain.capacity != null ? String(terrain.capacity) : '—'} />
      <DetailChip icon={<Sun size={sizes.iconMd} color={prim} />} label={t('field.lighting', 'Lighting')} value={terrain.has_lighting ? t('common.yes', 'Yes') : t('common.no', 'No')} />
      <DetailChip icon={<Warehouse size={sizes.iconMd} color={prim} />} label={t('field.covered', 'Cover')} value={terrain.is_covered ? t('field.indoor', 'Indoor') : t('field.outdoor', 'Outdoor')} />
      <DetailChip icon={<Armchair size={sizes.iconMd} color={prim} />} label={t('field.benches', 'Benches')} value={terrain.has_benches ? t('common.yes', 'Yes') : t('common.no', 'No')} />
      {terrain.address ? (
        <DetailChip icon={<MapPin size={sizes.iconMd} color={prim} />} label={t('field.address', 'Address')} value={terrain.address} />
      ) : null}
    </View>
  );
}

export default function FieldEditScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();
  const toast = useToast();

  const terrainId = Array.isArray(id) ? id[0] : id;
  const { data, isLoading, isError, error, refetch } = useOwnerTerrain(terrainId);
  const terrain = data?.terrain;

  const toggleStatus = useToggleTerrainStatus();
  const updateTerrain = useUpdateTerrain();
  const updateHours = useUpdateWorkingHours();
  const uploadImages = useUploadTerrainImages();
  const setCover = useSetTerrainCover();

  const [priceOpen, setPriceOpen] = useState(false);
  const [priceValue, setPriceValue] = useState('');
  const [closeDialog, setCloseDialog] = useState(false);
  const [closeReason, setCloseReason] = useState('');
  const [rows, setRows] = useState<TerrainScheduleDto[] | null>(null);
  const [preparingPhotos, setPreparingPhotos] = useState(false);

  const scheduleRows = useMemo<TerrainScheduleDto[]>(() => {
    const existing = terrain?.schedules ?? [];
    return DAY_KEYS.map((_, index) => {
      const found = existing.find((s) => s.day_of_week === index);
      return {
        day_of_week: index,
        open_time: found?.open_time ?? '09:00',
        close_time: found?.close_time ?? '23:00',
        is_active: found ? found.is_active : true,
      };
    });
  }, [terrain?.schedules]);

  const rowsValue = rows ?? scheduleRows;

  if (isLoading) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('field.operations', 'Field operations')} showBack />
        <View style={styles.content}>
          <Skeleton height={140} radiusValue={radius.lg} />
          <Skeleton height={150} radiusValue={radius.lg} />
          <Skeleton height={260} radiusValue={radius.lg} />
        </View>
      </Screen>
    );
  }

  if (isError || !terrain) {
    return (
      <Screen padded={false}>
        <ScreenHeader title={t('field.operations', 'Field operations')} showBack />
        <ErrorState
          message={error ? getApiErrorMessage(error, t('fields.loadFailed', 'Could not load field')) : undefined}
          onRetry={() => void refetch()}
        />
      </Screen>
    );
  }

  const statusVariant: BadgeVariant = terrain.is_open ? 'success' : 'danger';
  const statusLabel = terrain.is_open ? t('fields.open', 'Open') : t('fields.closed', 'Closed');

  const openPriceEditor = (): void => {
    setPriceValue(String(normalize(terrain.price_per_hour || terrain.price_per_team)));
    setPriceOpen(true);
  };

  const handleToggle = (): void => {
    if (terrain.is_open) {
      setCloseReason('');
      setCloseDialog(true);
      return;
    }
    toggleStatus.mutate(
      { id: terrain.id, isOpen: true },
      {
        onSuccess: () => toast.show(t('fields.statusUpdatedOpen', 'Field opened'), 'success'),
        onError: (err) => toast.show(getApiErrorMessage(err, t('fields.updateFailed', 'Update failed')), 'error'),
      },
    );
  };

  const confirmClose = (): void => {
    setCloseDialog(false);
    toggleStatus.mutate(
      { id: terrain.id, isOpen: false, closureReason: closeReason || undefined },
      {
        onSuccess: () => toast.show(t('fields.statusUpdatedClosed', 'Field closed'), 'success'),
        onError: (err) => toast.show(getApiErrorMessage(err, t('fields.updateFailed', 'Update failed')), 'error'),
      },
    );
  };

  const savePrice = (): void => {
    const amount = Number(priceValue);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.show(t('field.price.invalid', 'Enter a valid amount'), 'error');
      return;
    }
    updateTerrain.mutate(
      { id: terrain.id, payload: { price_per_team: amount } },
      {
        onSuccess: () => {
          setPriceOpen(false);
          toast.show(t('field.price.saved', 'Price saved'), 'success');
        },
        onError: (err) => toast.show(getApiErrorMessage(err, t('field.price.saveFailed', 'Could not save price')), 'error'),
      },
    );
  };

  const saveHours = (): void => {
    const invalid = rowsValue.some(
      (r) => r.is_active && (!r.open_time || !TIME_RE.test(r.open_time) || !r.close_time || !TIME_RE.test(r.close_time)),
    );
    if (invalid) {
      toast.show(t('field.hours.invalid', 'Enter valid HH:MM times'), 'error');
      return;
    }
    updateHours.mutate(
      { id: terrain.id, schedule: rowsValue },
      {
        onSuccess: () => {
          setRows(null);
          toast.show(t('field.hours.saved', 'Working hours saved'), 'success');
        },
        onError: (err) => toast.show(getApiErrorMessage(err, t('field.hours.saveFailed', 'Could not save hours')), 'error'),
      },
    );
  };

  const pickImages = async (): Promise<void> => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.show(t('field.photos.permission', 'Photo access is required'), 'error');
      return;
    }
    const result: ImagePicker.ImagePickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 6,
      quality: 0.8,
    });
    if (result.canceled || !result.assets.length) return;
    setPreparingPhotos(true);
    try {
      const uris = await Promise.all(
        result.assets.map((asset) =>
          compressImage(asset.uri, { maxWidth: 1600, maxHeight: 1600, quality: 0.75, maxSizeKB: 500 }).then((c) => c.uri),
        ),
      );
      uploadImages.mutate(
        { id: terrain.id, uris },
        {
          onSuccess: () => toast.show(t('field.photos.uploaded', 'Photos uploaded'), 'success'),
          onError: (err) => toast.show(getApiErrorMessage(err, t('field.photos.uploadFailed', 'Upload failed')), 'error'),
        },
      );
    } finally {
      setPreparingPhotos(false);
    }
  };

  const activeImages = terrain.images ?? [];

  return (
    <Screen padded={false}>
      <ScreenHeader title={terrain.name ?? t('field.operations', 'Field operations')} showBack />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Card padded={false} style={styles.heroCard}>
          {terrain.cover_image_url ? (
            <Image source={{ uri: terrain.cover_image_url }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, styles.heroEmpty, { backgroundColor: colors.bgMuted }]}>
              <ImagesIcon size={sizes.iconXl} color={colors.textSubtle} />
            </View>
          )}
          <View style={styles.heroBadge}>
            <Badge label={statusLabel} variant={statusVariant} />
          </View>
        </Card>

        <Card>
          <SectionHeader icon={<Timer size={sizes.iconMd} color={colors.primary} />} title={t('field.availability.title', 'Availability')} />
          <View style={styles.availabilityRow}>
            <View style={styles.availabilityText}>
              <AppText variant="bodyBold">
                {terrain.is_open ? t('field.availability.open', 'Field is open') : t('field.availability.closed', 'Field is closed')}
              </AppText>
              <AppText variant="caption" muted>
                {terrain.is_open
                  ? t('field.availability.openHint', 'Visible for new bookings')
                  : (terrain.closure_reason ?? t('field.availability.closedHint', 'Hidden for new bookings'))}
              </AppText>
            </View>
            <Switch
              value={!!terrain.is_open}
              onValueChange={handleToggle}
              disabled={toggleStatus.isPending}
              trackColor={{ false: colors.borderStrong, true: colors.primary }}
              thumbColor="#ffffff"
            />
          </View>
        </Card>

        <Card>
          <SectionHeader icon={<Wrench size={sizes.iconMd} color={colors.primary} />} title={t('field.metadata', 'Details')} />
          <MetadataGrid terrain={terrain} t={t} />
        </Card>

        <Card>
          <SectionHeader icon={<Tag size={sizes.iconMd} color={colors.primary} />} title={t('field.price.title', 'Hourly rate')} />
          <View style={styles.priceRow}>
            <View style={styles.priceValue}>
              <AppText variant="h2">{formatMoney(terrain.price_per_hour || terrain.price_per_team)}</AppText>
              <AppText variant="caption" muted>
                {t('field.price.currencyUnit', 'per hour')}
              </AppText>
            </View>
            <Button title={t('common.edit', 'Edit')} variant="outline" size="sm" onPress={openPriceEditor} />
          </View>
          <AppText variant="caption" muted>
            {t('field.price.hint', 'Hourly rate charged to teams')}
          </AppText>
        </Card>

        <Card>
          <SectionHeader icon={<Clock size={sizes.iconMd} color={colors.primary} />} title={t('field.hours.title', 'Working hours')} hint={t('field.hours.hint', 'Set open and close time per day')} />
          <View style={styles.hoursList}>
            {rowsValue.map((row) => (
              <View key={row.day_of_week} style={[styles.hoursRow, { borderColor: colors.border }]}>
                <Switch
                  value={row.is_active}
                  onValueChange={(v) => setRows(rowsValue.map((r) => (r.day_of_week === row.day_of_week ? { ...r, is_active: v } : r)))}
                  trackColor={{ false: colors.borderStrong, true: colors.primary }}
                  thumbColor="#ffffff"
                />
                <AppText variant="bodyBold" style={styles.dayName}>
                  {t(`day.${DAY_KEYS[row.day_of_week]}`)}
                </AppText>
                <View style={styles.timeGroup}>
                  <TimeField
                    value={row.open_time ?? ''}
                    active={row.is_active}
                    colors={colors}
                    onChangeText={(v) => setRows(rowsValue.map((r) => (r.day_of_week === row.day_of_week ? { ...r, open_time: v } : r)))}
                  />
                  <AppText variant="caption" muted>
                    —
                  </AppText>
                  <TimeField
                    value={row.close_time ?? ''}
                    active={row.is_active}
                    colors={colors}
                    onChangeText={(v) => setRows(rowsValue.map((r) => (r.day_of_week === row.day_of_week ? { ...r, close_time: v } : r)))}
                  />
                </View>
              </View>
            ))}
          </View>
          <Button
            title={t('field.hours.save', 'Save working hours')}
            leftIcon={<Clock size={sizes.iconMd} color={colors.textOnPrimary} />}
            onPress={saveHours}
            loading={updateHours.isPending}
            fullWidth
            style={{ marginTop: spacing.md }}
          />
        </Card>

        <Card>
          <SectionHeader icon={<ImagePlus size={sizes.iconMd} color={colors.primary} />} title={t('field.photos.title', 'Photos')} hint={t('field.photos.hint', 'Tap a photo to make it the cover')} />
          {activeImages.length ? (
            <View style={styles.photoGrid}>
              {activeImages.map((img) => (
                <Pressable
                  key={img.id ?? img.image_url}
                  style={styles.photoTile}
                  onPress={() =>
                    img.id &&
                    setCover.mutate(
                      { id: terrain.id, imageId: img.id },
                      {
                        onSuccess: () => toast.show(t('field.photos.coverSet', 'Cover updated'), 'success'),
                        onError: (err) => toast.show(getApiErrorMessage(err, t('field.photos.coverFailed', 'Could not set cover')), 'error'),
                      },
                    )
                  }
                  accessibilityLabel={t('field.photos.setCover', 'Set as cover')}
                  accessibilityRole="button"
                >
                  <Image source={{ uri: img.thumbnail_url ?? img.image_url ?? undefined }} style={styles.photoImage} resizeMode="cover" />
                  {img.is_thumbnail ? (
                    <View style={styles.coverBadge}>
                      <Badge label={t('field.photos.cover', 'Cover')} variant="success" />
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ) : (
            <AppText variant="caption" muted style={{ marginBottom: spacing.sm }}>
              {t('field.photos.empty', 'No photos yet')}
            </AppText>
          )}
          <Button
            title={t('field.photos.upload', 'Upload photos')}
            variant="outline"
            leftIcon={<ImagePlus size={sizes.iconMd} color={colors.primary} />}
            onPress={() => void pickImages()}
            loading={uploadImages.isPending || preparingPhotos}
            fullWidth
          />
        </Card>

        <Button
          title={t('common.back', 'Back')}
          variant="ghost"
          onPress={() => router.back()}
          style={{ marginTop: spacing.sm }}
        />
      </ScrollView>

      <Modal visible={priceOpen} onClose={() => setPriceOpen(false)} title={t('field.price.title', 'Hourly rate')}>
        <AppText variant="caption" muted style={{ marginBottom: spacing.md }}>
          {t('field.price.prompt', 'Set the hourly rate charged to teams')}
        </AppText>
        <Input
          label={t('field.price.perHour', 'Price per hour')}
          placeholder="150"
          keyboardType="numeric"
          value={priceValue}
          onChangeText={setPriceValue}
          containerStyle={{ marginBottom: spacing.lg }}
        />
        <Button title={t('common.save', 'Save')} onPress={savePrice} loading={updateTerrain.isPending} fullWidth />
      </Modal>

      <ConfirmationDialog
        visible={closeDialog}
        title={t('field.availability.closeTitle', 'Close this field?')}
        description={t('field.availability.closeDesc', 'The field will be hidden from new bookings. Active bookings stay valid.')}
        confirmLabel={t('field.availability.confirmClose', 'Close field')}
        cancelLabel={t('common.cancel', 'Cancel')}
        destructive
        loading={toggleStatus.isPending}
        onConfirm={confirmClose}
        onCancel={() => setCloseDialog(false)}
      />
    </Screen>
  );
}

function TimeField({
  value,
  active,
  colors,
  onChangeText,
}: {
  value: string;
  active: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
  onChangeText: (v: string) => void;
}): React.JSX.Element {
  return (
    <TextInput
      style={[
        styles.timeInput,
        { backgroundColor: active ? colors.surface : colors.bgMuted, borderColor: colors.border, color: colors.text },
      ]}
      value={value}
      editable={active}
      placeholder="09:00"
      placeholderTextColor={colors.textSubtle}
      keyboardType="numbers-and-punctuation"
      onChangeText={onChangeText}
      maxLength={5}
    />
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing['4xl'], gap: spacing.md },
  heroCard: { padding: 0, overflow: 'hidden' },
  heroImage: { width: '100%', height: 150 },
  heroEmpty: { alignItems: 'center', justifyContent: 'center' },
  heroBadge: { position: 'absolute', top: spacing.md, end: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  sectionIcon: { width: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  sectionHeaderText: { flex: 1 },
  availabilityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  availabilityText: { flex: 1, gap: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: '47%',
    flexGrow: 1,
  },
  chipText: { gap: 1, flex: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  priceValue: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: spacing.xs },
  hoursList: { gap: spacing.sm },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  dayName: { flex: 1 },
  timeGroup: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeInput: {
    width: 64,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  photoTile: { width: 96, height: 96, borderRadius: radius.md, overflow: 'hidden', position: 'relative' },
  photoImage: { width: '100%', height: '100%' },
  coverBadge: { position: 'absolute', top: spacing.xs, start: spacing.xs },
});
