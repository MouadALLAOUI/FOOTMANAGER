import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal as RNModal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ChevronDown, Search, X } from 'lucide-react-native';

import { useCities, type City, cityDisplayName } from '@/api/cities';
import { useI18n } from '@/i18n/I18nProvider';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

interface Props {
  label?: string;
  value: string | null;
  onChange: (value: string | null, city: City | null) => void;
  error?: string;
  placeholder?: string;
}

export function CitySelect({ label, value, onChange, error, placeholder }: Props): React.JSX.Element {
  const { colors } = useTheme();
  const { locale, isRTL, t } = useI18n();
  const { data: cities, isLoading, isError, refetch, isFetching } = useCities();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo(() => cities?.find((c) => c.name === value) ?? null, [cities, value]);
  const displayValue = selected ? cityDisplayName(selected, locale) : value || '';

  const filtered = useMemo(() => {
    if (!cities) return [];
    if (!query.trim()) return cities;
    const q = query.trim().toLowerCase();
    return cities.filter((c) => {
      const hay = `${c.name} ${c.name_ar ?? ''} ${c.name_fr ?? ''} ${c.name_en ?? ''} ${c.slug}`.toLowerCase();
      return hay.includes(q);
    });
  }, [cities, query]);

  const handleSelect = (city: City): void => {
    onChange(city.name, city);
    setOpen(false);
    setQuery('');
  };

  const handleClear = (): void => {
    onChange(null, null);
  };

  return (
    <View style={styles.container}>
      {label ? <Text style={[typography.label, { color: colors.textMuted, marginBottom: 6 }]}>{label}</Text> : null}
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={label ?? 'City'}
        style={({ pressed }) => [
          styles.field,
          {
            backgroundColor: colors.surface,
            borderColor: error ? colors.danger : colors.border,
            opacity: pressed ? 0.92 : 1,
          },
        ]}
      >
        <Text style={[styles.fieldText, { color: displayValue ? colors.text : colors.textSubtle }]} numberOfLines={1}>
          {displayValue || placeholder || (isRTL ? 'اختر المدينة' : locale === 'fr' ? 'Choisir une ville' : 'Select city')}
        </Text>
        <View style={styles.fieldRight}>
          {value ? (
            <Pressable onPress={handleClear} hitSlop={8} accessibilityLabel={t('common.clear', 'Clear')}>
              <X size={16} color={colors.textMuted} />
            </Pressable>
          ) : null}
          <ChevronDown size={16} color={colors.textMuted} />
        </View>
      </Pressable>
      {error ? <Text style={[typography.caption, { color: colors.danger, marginTop: 6 }]}>{error}</Text> : null}

      <RNModal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable style={[styles.backdrop, { backgroundColor: colors.overlay }]} onPress={() => setOpen(false)} />
        <View style={styles.centered} pointerEvents="box-none">
          <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
            <View style={[styles.sheetHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.sheetTitle, { color: colors.text }]}>{isRTL ? 'اختر المدينة' : locale === 'fr' ? 'Choisir une ville' : 'Select city'}</Text>
              <Pressable onPress={() => setOpen(false)} hitSlop={8} accessibilityLabel={t('common.close', 'Close')}>
                <X size={18} color={colors.textMuted} />
              </Pressable>
            </View>

            <View style={[styles.searchWrap, { borderColor: colors.border, backgroundColor: colors.bgMuted }]}>
              <Search size={16} color={colors.textMuted} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder={isRTL ? 'بحث...' : locale === 'fr' ? 'Rechercher...' : 'Search...'}
                placeholderTextColor={colors.textSubtle}
                style={[styles.searchInput, { color: colors.text, textAlign: isRTL ? 'right' : 'left' }]}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {query ? (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <X size={14} color={colors.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {isLoading ? (
              <View style={styles.stateBox}>
                <ActivityIndicator color={colors.primary} />
                <Text style={[styles.stateText, { color: colors.textMuted }]}>{isRTL ? 'جاري التحميل...' : 'Loading...'}</Text>
              </View>
            ) : isError ? (
              <View style={styles.stateBox}>
                <Text style={[styles.stateText, { color: colors.danger }]}>{isRTL ? 'فشل تحميل المدن' : 'Failed to load cities'}</Text>
                <Pressable onPress={() => void refetch()} style={[styles.retryBtn, { backgroundColor: colors.primary }]}>
                  <Text style={[styles.retryText, { color: colors.textOnPrimary }]}>{isRTL ? 'إعادة المحاولة' : 'Retry'}</Text>
                </Pressable>
              </View>
            ) : filtered.length === 0 ? (
              <View style={styles.stateBox}>
                <Text style={[styles.stateText, { color: colors.textMuted }]}>{isRTL ? 'لا توجد نتائج' : 'No results'}</Text>
              </View>
            ) : (
              <FlatList
                data={filtered}
                keyExtractor={(item) => String(item.id)}
                keyboardShouldPersistTaps="handled"
                style={styles.list}
                contentContainerStyle={styles.listContent}
                refreshing={isFetching}
                onRefresh={() => void refetch()}
                renderItem={({ item }) => {
                  const active = item.name === value;
                  return (
                    <Pressable onPress={() => handleSelect(item)} style={({ pressed }) => [styles.item, { backgroundColor: active ? colors.primary + '14' : 'transparent', borderColor: active ? colors.primary : 'transparent', opacity: pressed ? 0.8 : 1 }]}>
                      <Text style={[styles.itemTitle, { color: active ? colors.primary : colors.text }]}>{cityDisplayName(item, locale)}</Text>
                      <Text style={[styles.itemSub, { color: colors.textMuted }]}>{item.name} · {item.slug}</Text>
                    </Pressable>
                  );
                }}
              />
            )}

            <View style={[styles.footer, { borderTopColor: colors.border }]}>
              <Pressable onPress={() => setOpen(false)} style={[styles.footerBtn, { backgroundColor: colors.bgMuted }]}>
                <Text style={[styles.footerText, { color: colors.textMuted }]}>{isRTL ? 'إلغاء' : locale === 'fr' ? 'Annuler' : 'Cancel'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </RNModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 0 },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    height: 44,
    gap: 8,
  },
  fieldText: { flex: 1, fontSize: 15, fontWeight: '500' },
  fieldRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  backdrop: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
  sheet: { width: '100%', maxWidth: 480, borderRadius: radius.xl, overflow: 'hidden', maxHeight: '80%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  sheetTitle: { fontSize: 16, fontWeight: '700' },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, margin: spacing.md, paddingHorizontal: 12, height: 40, borderRadius: radius.md, borderWidth: StyleSheet.hairlineWidth },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 0 },
  stateBox: { padding: spacing.xl, alignItems: 'center', gap: spacing.sm },
  stateText: { fontSize: 13, textAlign: 'center' },
  retryBtn: { marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.full },
  retryText: { fontSize: 13, fontWeight: '700' },
  list: { flexGrow: 0, maxHeight: 320 },
  listContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: 4 },
  item: { padding: spacing.md, borderRadius: radius.md, borderWidth: 1, gap: 2 },
  itemTitle: { fontSize: 14, fontWeight: '700' },
  itemSub: { fontSize: 11 },
  footer: { padding: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  footerBtn: { paddingHorizontal: spacing.xl, paddingVertical: spacing.sm, borderRadius: radius.full },
  footerText: { fontSize: 12, fontWeight: '600' },
});
