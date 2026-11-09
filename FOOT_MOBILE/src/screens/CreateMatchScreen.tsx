import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Calendar,
  Check,
  Clock,
  Flame,
  Globe,
  MapPin,
  Minus,
  Plus,
  Shield,
  Swords,
  Users,
} from 'lucide-react-native';

import {
  useCreateMatchRequest,
  useRegisteredTeams,
  useSendDirectChallenge,
  useStadiums,
} from '@/api/managerMatches';
import { getApiErrorMessage } from '@/api/errors';
import { AjiNqssroTabBar } from '@/components/navigation/AjiNqssroTabBar';
import { ManagerFloatingHeader, ManagerPageTitle } from '@/components/ui/ManagerFloatingHeader';
import { useToast } from '@/components/ui/Toast';
import { resolveImageUrl } from '@/utils/image';

const FORMATS = ['5v5', '7v7', '8v8', '11v11'] as const;

const POPULAR_TIMES = [
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
  '22:00',
] as const;

interface DayOption {
  id: string;
  label: string;
  subDate: string;
  yyyyMmDd: string;
}

function buildArabicDayOptions(count = 10): DayOption[] {
  const days: DayOption[] = [];
  const arabicDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  const arabicMonths = [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'ماي',
    'يونيو',
    'يوليوز',
    'غشت',
    'شتنبر',
    'أكتوبر',
    'نونبر',
    'دجنبر',
  ];

  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyyMmDd = `${yyyy}-${mm}-${dd}`;

    let label = arabicDays[d.getDay()];
    if (i === 0) label = 'اليوم';
    else if (i === 1) label = 'غداً';

    days.push({
      id: String(i),
      label,
      subDate: `${d.getDate()} ${arabicMonths[d.getMonth()]}`,
      yyyyMmDd,
    });
  }
  return days;
}

function addTwoHours(startTime: string): string {
  const [hStr, mStr] = startTime.split(':');
  const h = Number(hStr);
  const next = Math.min(23, h + 2);
  return `${String(next).padStart(2, '0')}:${mStr || '00'}`;
}

export default function CreateMatchScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const days = useMemo(() => buildArabicDayOptions(10), []);
  const [selectedDay, setSelectedDay] = useState<DayOption>(days[1] ?? days[0]);
  const [startTime, setStartTime] = useState<string>('19:00');
  const [format, setFormat] = useState<string>('7v7');

  // Mode: Open Match Request vs Direct Team Challenge
  const [requestMode, setRequestMode] = useState<'open_request' | 'direct_challenge'>('open_request');
  const [selectedTargetTeamId, setSelectedTargetTeamId] = useState<number | null>(null);

  // Venue: Certified Stadium vs Custom Terrain
  const [venueMode, setVenueMode] = useState<'stadium' | 'custom'>('stadium');
  const [stadiumId, setStadiumId] = useState<number | null>(null);
  const [customTerrain, setCustomTerrain] = useState<string>('');

  // Recruitment & Extras
  const [needsPlayers, setNeedsPlayers] = useState<boolean>(false);
  const [playersNeeded, setPlayersNeeded] = useState<number>(2);
  const [pricePerPlayer, setPricePerPlayer] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const stadiumsQuery = useStadiums();
  const stadiums = useMemo(() => stadiumsQuery.data?.stadiums ?? [], [stadiumsQuery.data]);

  const registeredTeamsQuery = useRegisteredTeams();
  const registeredTeams = useMemo(
    () => registeredTeamsQuery.data?.data ?? [],
    [registeredTeamsQuery.data],
  );

  const createMatchMutation = useCreateMatchRequest();
  const sendChallengeMutation = useSendDirectChallenge();

  const activeStadiumId = stadiumId ?? stadiums[0]?.id ?? null;

  const isSubmitting = createMatchMutation.isPending || sendChallengeMutation.isPending;

  const handleSubmit = async () => {
    if (venueMode === 'stadium' && !activeStadiumId) {
      Alert.alert('تنبيه', 'يرجى اختيار الملعب أولاً أو التبديل إلى ملعب خارجي.');
      return;
    }
    if (venueMode === 'custom' && !customTerrain.trim()) {
      Alert.alert('تنبيه', 'يرجى كتابة اسم الملعب الخارجي.');
      return;
    }
    if (requestMode === 'direct_challenge' && !selectedTargetTeamId) {
      Alert.alert('تنبيه', 'يرجى اختيار الفريق المنافس الذي ترغب في تحديه.');
      return;
    }

    const matchDatetime = `${selectedDay.yyyyMmDd} ${startTime}:00`;
    const endTime = addTwoHours(startTime);

    try {
      if (requestMode === 'direct_challenge' && selectedTargetTeamId) {
        const res = await sendChallengeMutation.mutateAsync({
          target_team_id: selectedTargetTeamId,
          stadium_id: venueMode === 'stadium' ? activeStadiumId : null,
          custom_terrain_name: venueMode === 'custom' ? customTerrain.trim() : undefined,
          match_datetime: matchDatetime,
          notes: notes.trim() || undefined,
          price_per_player: pricePerPlayer ? Number(pricePerPlayer) : undefined,
          needs_players: needsPlayers,
          players_needed: needsPlayers ? playersNeeded : undefined,
        });
        toast.show(res.message || 'تم إرسال التحدي المباشر للفريق بنجاح!', 'success');
        router.back();
      } else {
        const res = await createMatchMutation.mutateAsync({
          stadium_id: venueMode === 'stadium' ? activeStadiumId : null,
          custom_terrain_name: venueMode === 'custom' ? customTerrain.trim() : undefined,
          match_datetime: matchDatetime,
          start_time: startTime,
          end_time: endTime,
          player_format: format,
          notes: notes.trim() || undefined,
          price_per_player: pricePerPlayer ? Number(pricePerPlayer) : undefined,
          needs_players: needsPlayers,
          players_needed: needsPlayers ? playersNeeded : undefined,
        });
        toast.show(res.message || 'تم نشر طلب المباراة الودية بنجاح!', 'success');
        router.back();
      }
    } catch (err) {
      Alert.alert('تعذر إتمام الطلب', getApiErrorMessage(err));
    }
  };

  return (
    <ImageBackground
      source={require('../../assets/role-selection-bg.png')}
      style={styles.screenBg}
      resizeMode="cover"
    >
      <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
        {/* Floating Header */}
        <ManagerFloatingHeader />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Page Title with Back Button */}
          <ManagerPageTitle
            title="إنشاء مباراة / تحدي"
            subtitle="حدد الملعب والتوقيت وادعُ الفرق للمنافسة"
            icon={<Swords size={20} color="#FFFFFF" />}
            showBack
          />

          {/* ─── Section 1: نوع الطلب (Open Request vs Direct Challenge) ─── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionBanner}>
              <Text style={styles.sectionBannerTitle}>1. نوع المباراة</Text>
              <Flame size={20} color="#FFFFFF" />
            </View>

            <View style={styles.sectionBody}>
              <View style={styles.modeCardsRow}>
                <TouchableOpacity
                  style={[
                    styles.modeOptionCard,
                    requestMode === 'open_request' && styles.modeOptionCardActive,
                  ]}
                  onPress={() => setRequestMode('open_request')}
                  activeOpacity={0.85}
                >
                  <View style={styles.modeOptionHeader}>
                    <Globe
                      size={22}
                      color={requestMode === 'open_request' ? '#00875A' : '#64748B'}
                    />
                    {requestMode === 'open_request' && (
                      <View style={styles.checkBadge}>
                        <Check size={12} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.modeOptionTitle}>تحدي مفتوح</Text>
                  <Text style={styles.modeOptionSub}>متاح لجميع الفرق المعتمدة</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modeOptionCard,
                    requestMode === 'direct_challenge' && styles.modeOptionCardActiveOrange,
                  ]}
                  onPress={() => setRequestMode('direct_challenge')}
                  activeOpacity={0.85}
                >
                  <View style={styles.modeOptionHeader}>
                    <Flame
                      size={22}
                      color={requestMode === 'direct_challenge' ? '#EA580C' : '#64748B'}
                    />
                    {requestMode === 'direct_challenge' && (
                      <View style={[styles.checkBadge, { backgroundColor: '#EA580C' }]}>
                        <Check size={12} color="#FFFFFF" strokeWidth={3} />
                      </View>
                    )}
                  </View>
                  <Text style={styles.modeOptionTitle}>تحدي فريق محدد</Text>
                  <Text style={styles.modeOptionSub}>إرسال دعوة مباشرة لفريق</Text>
                </TouchableOpacity>
              </View>

              {/* Target Team Selector if Direct Challenge */}
              {requestMode === 'direct_challenge' && (
                <View style={styles.targetTeamsWrap}>
                  <Text style={styles.fieldLabel}>اختر الفريق المنافس:</Text>
                  {registeredTeamsQuery.isLoading ? (
                    <ActivityIndicator size="small" color="#00875A" />
                  ) : (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.teamsHorizontalList}
                    >
                      {registeredTeams.map((team) => {
                        const isSelected = selectedTargetTeamId === team.id;
                        const logoUri = resolveImageUrl(team.logo_url);
                        return (
                          <TouchableOpacity
                            key={team.id}
                            style={[
                              styles.teamChipCard,
                              isSelected && styles.teamChipCardSelected,
                            ]}
                            onPress={() => setSelectedTargetTeamId(team.id)}
                            activeOpacity={0.85}
                          >
                            {logoUri ? (
                              <Image
                                source={{ uri: logoUri }}
                                style={styles.teamChipLogo}
                                resizeMode="cover"
                              />
                            ) : (
                              <View
                                style={[
                                  styles.teamChipShield,
                                  { backgroundColor: team.primary_color || '#00875A' },
                                ]}
                              >
                                <Shield size={18} color="#FFFFFF" />
                              </View>
                            )}
                            <Text style={styles.teamChipName} numberOfLines={1}>
                              {team.name}
                            </Text>
                            <View style={styles.onlineRow}>
                              <View
                                style={[
                                  styles.onlineDot,
                                  {
                                    backgroundColor: team.manager_online
                                      ? '#22C55E'
                                      : '#94A3B8',
                                  },
                                ]}
                              />
                              <Text style={styles.onlineText}>
                                {team.manager_online ? 'متصل الآن' : team.city || 'المغرب'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* ─── Section 2: اختيار الملعب وصيغة اللعب ─── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionBanner}>
              <Text style={styles.sectionBannerTitle}>2. الملعب وصيغة اللعب</Text>
              <MapPin size={20} color="#FFFFFF" />
            </View>

            <View style={styles.sectionBody}>
              {/* Venue Type Toggle */}
              <View style={styles.toggleRow}>
                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    venueMode === 'stadium' && styles.toggleBtnActive,
                  ]}
                  onPress={() => setVenueMode('stadium')}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      venueMode === 'stadium' && styles.toggleBtnTextActive,
                    ]}
                  >
                    ملعب معتمد بالمنصة
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    venueMode === 'custom' && styles.toggleBtnActive,
                  ]}
                  onPress={() => setVenueMode('custom')}
                >
                  <Text
                    style={[
                      styles.toggleBtnText,
                      venueMode === 'custom' && styles.toggleBtnTextActive,
                    ]}
                  >
                    ملعب خارجي آخر
                  </Text>
                </TouchableOpacity>
              </View>

              {venueMode === 'stadium' ? (
                <View style={styles.stadiumsListWrap}>
                  {stadiums.map((s) => {
                    const selected = s.id === activeStadiumId;
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={[
                          styles.stadiumOptionRow,
                          selected && styles.stadiumOptionRowSelected,
                        ]}
                        onPress={() => setStadiumId(s.id)}
                        activeOpacity={0.85}
                      >
                        <View style={styles.stadiumCheckCircle}>
                          {selected ? (
                            <Check size={16} color="#FFFFFF" strokeWidth={3} />
                          ) : null}
                        </View>
                        <View style={styles.stadiumInfoCol}>
                          <Text style={styles.stadiumNameText}>{s.name}</Text>
                          <Text style={styles.stadiumMetaText}>
                            {[s.city, s.player_format?.toUpperCase(), s.type]
                              .filter(Boolean)
                              .join(' • ')}
                          </Text>
                        </View>
                        <MapPin size={20} color={selected ? '#00875A' : '#64748B'} />
                      </TouchableOpacity>
                    );
                  })}
                  {stadiums.length === 0 && (
                    <Text style={styles.emptyHintText}>
                      لا توجد ملاعب مسجلة حالياً — يمكنك اختيار &quot;ملعب خارجي آخر&quot;.
                    </Text>
                  )}
                </View>
              ) : (
                <View style={styles.inputGroup}>
                  <Text style={styles.fieldLabel}>اسم الملعب الخارجي:</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="مثال: ملعب القرب الحي الحسني"
                    placeholderTextColor="#94A3B8"
                    value={customTerrain}
                    onChangeText={setCustomTerrain}
                    textAlign="right"
                  />
                </View>
              )}

              {/* Player Format Pills */}
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>صيغة اللعب:</Text>
              <View style={styles.formatRow}>
                {FORMATS.map((f) => {
                  const selected = f === format;
                  return (
                    <TouchableOpacity
                      key={f}
                      style={[
                        styles.formatPill,
                        selected && styles.formatPillActive,
                      ]}
                      onPress={() => setFormat(f)}
                    >
                      <Text
                        style={[
                          styles.formatPillText,
                          selected && styles.formatPillTextActive,
                        ]}
                      >
                        {f.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ─── Section 3: التاريخ والتوقيت ─── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionBanner}>
              <Text style={styles.sectionBannerTitle}>3. التاريخ والتوقيت</Text>
              <Calendar size={20} color="#FFFFFF" />
            </View>

            <View style={styles.sectionBody}>
              <Text style={styles.fieldLabel}>اختر يوم المباراة:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.daysScrollRow}
              >
                {days.map((d) => {
                  const isSelected = d.id === selectedDay.id;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[
                        styles.dayCard,
                        isSelected && styles.dayCardSelected,
                      ]}
                      onPress={() => setSelectedDay(d)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.dayLabelText,
                          isSelected && styles.dayLabelTextSelected,
                        ]}
                      >
                        {d.label}
                      </Text>
                      <Text
                        style={[
                          styles.dayDateText,
                          isSelected && styles.dayDateTextSelected,
                        ]}
                      >
                        {d.subDate}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.fieldLabel, { marginTop: 14 }]}>اختر ساعة البداية:</Text>
              <View style={styles.timeGrid}>
                {POPULAR_TIMES.map((tSlot) => {
                  const isSelected = tSlot === startTime;
                  return (
                    <TouchableOpacity
                      key={tSlot}
                      style={[
                        styles.timePill,
                        isSelected && styles.timePillSelected,
                      ]}
                      onPress={() => setStartTime(tSlot)}
                      activeOpacity={0.85}
                    >
                      <Clock size={14} color={isSelected ? '#FFFFFF' : '#00875A'} />
                      <Text
                        style={[
                          styles.timePillText,
                          isSelected && styles.timePillTextSelected,
                        ]}
                      >
                        {tSlot}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* ─── Section 4: تعزيز الفريق وملاحظات إضافية ─── */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionBanner}>
              <Text style={styles.sectionBannerTitle}>4. تعزيز الصفوف وملاحظات</Text>
              <Users size={20} color="#FFFFFF" />
            </View>

            <View style={styles.sectionBody}>
              {/* Needs Players Toggle */}
              <View style={styles.needsPlayersRow}>
                <View style={styles.toggleRowCompact}>
                  <TouchableOpacity
                    style={[
                      styles.smallToggleBtn,
                      needsPlayers && styles.smallToggleBtnActive,
                    ]}
                    onPress={() => setNeedsPlayers(true)}
                  >
                    <Text
                      style={[
                        styles.smallToggleText,
                        needsPlayers && styles.smallToggleTextActive,
                      ]}
                    >
                      نعم، أحتاج لاعبين
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.smallToggleBtn,
                      !needsPlayers && styles.smallToggleBtnActive,
                    ]}
                    onPress={() => setNeedsPlayers(false)}
                  >
                    <Text
                      style={[
                        styles.smallToggleText,
                        !needsPlayers && styles.smallToggleTextActive,
                      ]}
                    >
                      الفريق مكتمل
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.fieldLabel}>هل تحتاج لاعبين إضافيين؟</Text>
              </View>

              {needsPlayers && (
                <View style={styles.stepperBox}>
                  <View style={styles.stepperControls}>
                    <TouchableOpacity
                      style={styles.stepperCircleBtn}
                      onPress={() => setPlayersNeeded((prev) => Math.max(1, prev - 1))}
                    >
                      <Minus size={18} color="#062F36" />
                    </TouchableOpacity>
                    <Text style={styles.stepperValueText}>{playersNeeded}</Text>
                    <TouchableOpacity
                      style={[styles.stepperCircleBtn, { backgroundColor: '#00875A' }]}
                      onPress={() => setPlayersNeeded((prev) => Math.min(22, prev + 1))}
                    >
                      <Plus size={18} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.stepperLabel}>عدد اللاعبين المطلوبين:</Text>
                </View>
              )}

              <View style={[styles.inputGroup, { marginTop: 12 }]}>
                <Text style={styles.fieldLabel}>المساهمة لكل لاعب (درهم - اختياري):</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="مثال: 25"
                  placeholderTextColor="#94A3B8"
                  keyboardType="numeric"
                  value={pricePerPlayer}
                  onChangeText={setPricePerPlayer}
                  textAlign="right"
                />
              </View>

              <View style={[styles.inputGroup, { marginTop: 12 }]}>
                <Text style={styles.fieldLabel}>ملاحظات للمنافس (اختياري):</Text>
                <TextInput
                  style={[styles.textInput, styles.textArea]}
                  placeholder="مثال: المرجو الحضور قبل 15 دقيقة من موعد المباراة..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  value={notes}
                  onChangeText={setNotes}
                  textAlign="right"
                />
              </View>
            </View>
          </View>

          {/* Submit CTA Button */}
          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && { opacity: 0.65 }]}
            onPress={() => void handleSubmit()}
            disabled={isSubmitting}
            activeOpacity={0.88}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Check size={22} color="#FFFFFF" strokeWidth={3} />
                <Text style={styles.submitBtnText}>
                  {requestMode === 'direct_challenge'
                    ? 'إرسال التحدي المباشر للفريق'
                    : 'نشر طلب المباراة الودية'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>

        <AjiNqssroTabBar mode="manager" />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screenBg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#16A34A',
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 6,
  },
  sectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    backgroundColor: '#00875A',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  sectionBannerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  sectionBody: {
    padding: 16,
  },
  modeCardsRow: {
    flexDirection: 'row-reverse',
    gap: 10,
  },
  modeOptionCard: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    alignItems: 'flex-end',
  },
  modeOptionCardActive: {
    backgroundColor: '#E9FBF2',
    borderColor: '#00875A',
  },
  modeOptionCardActiveOrange: {
    backgroundColor: '#FFF7ED',
    borderColor: '#EA580C',
  },
  modeOptionHeader: {
    width: '100%',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeOptionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#062F36',
  },
  modeOptionSub: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'right',
  },
  targetTeamsWrap: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  teamsHorizontalList: {
    flexDirection: 'row-reverse',
    gap: 10,
    paddingVertical: 6,
  },
  teamChipCard: {
    width: 115,
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    gap: 5,
  },
  teamChipCardSelected: {
    backgroundColor: '#FFF7ED',
    borderColor: '#EA580C',
  },
  teamChipLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  teamChipShield: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamChipName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#062F36',
    textAlign: 'center',
  },
  onlineRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  onlineText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  toggleRow: {
    flexDirection: 'row-reverse',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
    gap: 6,
    marginBottom: 12,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: '#00875A',
  },
  toggleBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  stadiumsListWrap: {
    gap: 8,
  },
  stadiumOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    gap: 10,
  },
  stadiumOptionRowSelected: {
    backgroundColor: '#E9FBF2',
    borderColor: '#00875A',
  },
  stadiumCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stadiumInfoCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  stadiumNameText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#062F36',
  },
  stadiumMetaText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  emptyHintText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 8,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: '#062F36',
    textAlign: 'right',
    marginBottom: 8,
  },
  formatRow: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  formatPill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  formatPillActive: {
    backgroundColor: '#00875A',
    borderColor: '#00875A',
  },
  formatPillText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#062F36',
  },
  formatPillTextActive: {
    color: '#FFFFFF',
  },
  daysScrollRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    paddingVertical: 4,
  },
  dayCard: {
    minWidth: 86,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  dayCardSelected: {
    backgroundColor: '#00875A',
    borderColor: '#00875A',
  },
  dayLabelText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#062F36',
  },
  dayLabelTextSelected: {
    color: '#FFFFFF',
  },
  dayDateText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    marginTop: 2,
  },
  dayDateTextSelected: {
    color: '#DCFCE7',
  },
  timeGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  timePillSelected: {
    backgroundColor: '#00875A',
    borderColor: '#00875A',
  },
  timePillText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#062F36',
  },
  timePillTextSelected: {
    color: '#FFFFFF',
  },
  needsPlayersRow: {
    gap: 6,
  },
  toggleRowCompact: {
    flexDirection: 'row-reverse',
    gap: 8,
  },
  smallToggleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    alignItems: 'center',
  },
  smallToggleBtnActive: {
    backgroundColor: '#00875A',
    borderColor: '#00875A',
  },
  smallToggleText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  smallToggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E9FBF2',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperCircleBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
  },
  stepperValueText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#062F36',
    minWidth: 24,
    textAlign: 'center',
  },
  stepperLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#062F36',
  },
  inputGroup: {
    width: '100%',
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    fontWeight: '700',
    color: '#062F36',
  },
  textArea: {
    minHeight: 76,
    textAlignVertical: 'top',
  },
  submitBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#00A651',
    paddingVertical: 16,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#00875A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitBtnText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
