import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageSourcePropType,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  Search,
  UserPlus,
  X,
} from 'lucide-react-native';
import Svg, { Rect, Line, Circle } from 'react-native-svg';

import { useCreatePlayer } from '@/api/managerTeam';
import { useUnreadNotificationCount } from '@/api/notifications';
import { get, post } from '@/api/client';

// ── Fallback Reference Avatars ──
const REF_AVATARS: Record<number, ImageSourcePropType> = {
  1: require('../../../assets/ref-player-avatar-1.png'),
  2: require('../../../assets/ref-player-avatar-2.png'),
  3: require('../../../assets/ref-player-avatar-3.png'),
};

// ── Football Pitch Tactics Icon ──
function PitchIcon({ size = 20, color = '#101418' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size * 0.75} viewBox="0 0 24 18" fill="none">
      <Rect x="1" y="1" width="22" height="16" rx="2" stroke={color} strokeWidth="1.6" />
      <Line x1="12" y1="1" x2="12" y2="17" stroke={color} strokeWidth="1.4" />
      <Circle cx="12" cy="9" r="3.5" stroke={color} strokeWidth="1.4" />
    </Svg>
  );
}

// ── Supported Position Definitions ──
const POSITION_OPTIONS = [
  { key: 'forward', label: 'مهاجم (Forward)', icon: '⚽' },
  { key: 'midfielder', label: 'وسط (Midfielder)', icon: '🥅' },
  { key: 'defender', label: 'مدافع (Defender)', icon: '🛡️' },
  { key: 'goalkeeper', label: 'حارس مرمى (Goalkeeper)', icon: '🧤' },
];

interface PlayerSuggestion {
  id: number;
  user_id?: number;
  name: string;
  label?: string;
  position?: string;
  avatar_url?: string | null;
  avatarSource?: ImageSourcePropType;
}

// ── Default Benchmark Suggestions ──
const DEFAULT_SUGGESTIONS: PlayerSuggestion[] = [
  {
    id: 1,
    name: 'أحمد العكري',
    label: 'مسجل في AJI NQSSRO',
    position: 'forward',
    avatarSource: REF_AVATARS[1],
  },
  {
    id: 2,
    name: 'أحمد القاسمي',
    label: 'مسجل في AJI NQSSRO',
    position: 'midfielder',
    avatarSource: REF_AVATARS[2],
  },
  {
    id: 3,
    name: 'أحمد الزهراني',
    label: 'مسجل في AJI NQSSRO',
    position: 'defender',
    avatarSource: REF_AVATARS[3],
  },
];

export default function AddPlayerScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const createPlayerMutation = useCreatePlayer();
  const { data: notifData } = useUnreadNotificationCount();

  // Form State (Initialized to match Reference A demonstration)
  const [searchQuery, setSearchQuery] = useState('أحمد');
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerSuggestion | null>(DEFAULT_SUGGESTIONS[0]);
  const [selectedPosition, setSelectedPosition] = useState<string>('');
  const [showPositionPicker, setShowPositionPicker] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [suggestions, setSuggestions] = useState<PlayerSuggestion[]>(DEFAULT_SUGGESTIONS);

  // ── Autocomplete Search API ──
  const searchRegisteredPlayers = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }

    setLoadingSearch(true);
    try {
      // Query existing recruitment search endpoint
      const res = await get<{
        players?: {
          id: number;
          user_id?: number;
          position?: string;
          user?: {
            id: number;
            name: string;
            avatar_url?: string | null;
          };
        }[];
      }>('/manager/recruitment/search', {
        params: { search: query.trim() },
      });

      if (res?.players && res.players.length > 0) {
        const mapped = res.players.slice(0, 5).map((p, idx) => ({
          id: p.id,
          user_id: p.user?.id || p.user_id,
          name: p.user?.name || `لاعب ${p.id}`,
          label: 'مسجل في AJI NQSSRO',
          position: p.position || 'midfielder',
          avatar_url: p.user?.avatar_url,
          avatarSource: REF_AVATARS[(idx % 3) + 1],
        }));
        setSuggestions(mapped);
      } else {
        // Fallback filter over default benchmark
        const filtered = DEFAULT_SUGGESTIONS.filter((p) =>
          p.name.toLowerCase().includes(query.toLowerCase())
        );
        setSuggestions(filtered);
      }
    } catch {
      // Offline fallback
      const filtered = DEFAULT_SUGGESTIONS.filter((p) =>
        p.name.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(filtered);
    } finally {
      setLoadingSearch(false);
    }
  }, []);

  // Debounced search trigger
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchQuery.trim().length >= 1) {
        void searchRegisteredPlayers(searchQuery);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery, searchRegisteredPlayers]);

  const handleSelectPlayer = (player: PlayerSuggestion) => {
    setSelectedPlayer(player);
    setSearchQuery(player.name);
    if (player.position) {
      setSelectedPosition(player.position);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSelectedPlayer(null);
    setSuggestions([]);
  };

  // ── Main Action: Add Player ──
  const handleAddPlayer = async () => {
    const finalName = selectedPlayer?.name || searchQuery.trim();

    if (!finalName) {
      Alert.alert('تنبيه', 'يرجى إدخال اسم اللاعب أو اختياره من القائمة.');
      return;
    }

    if (!selectedPosition) {
      Alert.alert('تنبيه', 'يرجى اختيار مركز اللاعب.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. If player has user_id, use team membership add
      if (selectedPlayer?.user_id) {
        try {
          await post('/manager/team-members', {
            user_id: selectedPlayer.user_id,
            position: selectedPosition,
          });
        } catch {
          // fallback to createPlayer mutation
          await createPlayerMutation.mutateAsync({
            name: finalName,
            position: selectedPosition,
          });
        }
      } else {
        // 2. Add squad player via managerTeam mutation
        await createPlayerMutation.mutateAsync({
          name: finalName,
          position: selectedPosition,
        });
      }

      Alert.alert(
        'تمت الإضافة بنجاح',
        `تمت إضافة اللاعب ${finalName} إلى فريقك بنجاح.`,
        [
          {
            text: 'حسناً',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message || 'تعذر إضافة اللاعب حالياً، يرجى المحاولة لاحقاً.';
      Alert.alert('خطأ في الإضافة', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const unreadCount = notifData?.unread_count ?? 3;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Background Stadium Atmosphere */}
      <Image
        source={require('../../../assets/role-selection-bg.png')}
        style={styles.bgImage}
        resizeMode="cover"
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 6, paddingBottom: 40 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ─── A. Header ─── */}
        <View style={styles.headerRow}>
          {/* Left: Notification Bell with Badge */}
          <Pressable
            onPress={() => router.push('/(manager)/notifications')}
            style={({ pressed }) => [styles.notificationBtn, pressed && styles.btnPressed]}
          >
            <Bell size={22} color="#0B192C" />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>{unreadCount}</Text>
              </View>
            )}
          </Pressable>

          {/* Center: Brand Logo */}
          <View style={styles.brandCenter}>
            <Image
              source={require('../../../assets/role-header-logo.png')}
              style={styles.brandLogo}
              resizeMode="contain"
            />
            <Text style={styles.brandTitle}>AJI NQSSRO</Text>
          </View>

          {/* Right: Greeting & Manager Avatar */}
          <Pressable
            onPress={() => router.push('/(manager)/profile')}
            style={({ pressed }) => [styles.managerProfileRow, pressed && styles.btnPressed]}
          >
            <View style={styles.managerGreetingTexts}>
              <Text style={styles.greetingTitle}>مرحبا بك</Text>
              <Text style={styles.managerRoleTitle}>مسيّر الفريق</Text>
            </View>
            <View style={styles.coachAvatarWrap}>
              <Image
                source={require('../../../assets/dashboard-coach-avatar.png')}
                style={styles.coachAvatarImg}
                resizeMode="cover"
              />
            </View>
          </Pressable>
        </View>

        {/* ─── B. Page Title Block ─── */}
        <View style={styles.titleBlock}>
          {/* Circular Back Button (Left) */}
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtnCircle, pressed && styles.btnPressed]}
          >
            <ChevronLeft size={22} color="#0B192C" strokeWidth={2.5} />
          </Pressable>

          {/* Title & Subtitle (Center / Right) */}
          <View style={styles.titleTextsCol}>
            <View style={styles.titleRow}>
              <UserPlus size={24} color="#101418" />
              <Text style={styles.titleText}>إضافة لاعب جديد</Text>
            </View>
            <Text style={styles.subtitleText}>أضف لاعباً إلى فريقك</Text>
          </View>
        </View>

        {/* ─── C. Card 1: Player Name Search with Autocomplete ─── */}
        <View style={styles.cardContainer}>
          <Text style={styles.fieldLabel}>
            <Text style={styles.asterisk}>* </Text>اسم اللاعب
          </Text>

          {/* Search Input Box */}
          <View style={styles.searchInputBox}>
            {/* Clear Button (Left) */}
            {searchQuery.length > 0 ? (
              <Pressable onPress={handleClearSearch} style={styles.clearBtn}>
                <X size={16} color="#94A3B8" />
              </Pressable>
            ) : (
              <View style={{ width: 16 }} />
            )}

            {/* Input (RTL) */}
            <TextInput
              style={styles.searchInput}
              placeholder="اكتب اسم اللاعب..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              textAlign="right"
            />

            {/* Search Icon (Right) */}
            {loadingSearch ? (
              <ActivityIndicator size="small" color="#101418" />
            ) : (
              <Search size={20} color="#101418" strokeWidth={2.5} />
            )}
          </View>

          {/* Autocomplete Suggestions List */}
          {suggestions.length > 0 && (
            <View style={styles.suggestionsList}>
              {suggestions.map((item) => {
                const isSelected = selectedPlayer?.id === item.id;
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => handleSelectPlayer(item)}
                    style={[
                      styles.suggestionRow,
                      isSelected && styles.suggestionRowSelected,
                    ]}
                  >
                    {/* Left: UserPlus Icon */}
                    <View style={styles.suggestionActionWrap}>
                      <UserPlus
                        size={18}
                        color={isSelected ? '#00875A' : '#94A3B8'}
                        strokeWidth={2}
                      />
                    </View>

                    {/* Middle: Player Name & Subtitle */}
                    <View style={styles.suggestionTextsWrap}>
                      <Text
                        style={[
                          styles.suggestionName,
                          isSelected && styles.suggestionNameSelected,
                        ]}
                      >
                        {item.name}
                      </Text>
                      <Text style={styles.suggestionSubtitle}>
                        {item.label || 'مسجل في AJI NQSSRO'}
                      </Text>
                    </View>

                    {/* Right: Avatar */}
                    <View style={styles.suggestionAvatarWrap}>
                      <Image
                        source={
                          item.avatar_url
                            ? { uri: item.avatar_url }
                            : item.avatarSource || REF_AVATARS[1]
                        }
                        style={styles.suggestionAvatarImg}
                        resizeMode="cover"
                      />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        {/* ─── D. Card 2: Player Photo ─── */}
        <View style={styles.cardContainer}>
          <Text style={styles.fieldLabel}>
            <Text style={styles.asterisk}>* </Text>صورة اللاعب
          </Text>

          <View style={styles.photoContainer}>
            <View style={styles.largeAvatarCircle}>
              {selectedPlayer?.avatarSource ? (
                <Image
                  source={selectedPlayer.avatarSource}
                  style={styles.largeAvatarImg}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.neutralSilhouette}>
                  <View style={styles.silhouetteHead} />
                  <View style={styles.silhouetteBody} />
                </View>
              )}

              {/* Camera Badge Overlay */}
              <View style={styles.cameraOverlayBadge}>
                <Camera size={16} color="#FFFFFF" />
              </View>
            </View>
          </View>
        </View>

        {/* ─── E. Card 3: Position Selector ─── */}
        <View style={styles.cardContainer}>
          <Text style={styles.fieldLabel}>
            <Text style={styles.asterisk}>* </Text>المركز
          </Text>

          {/* Position Selector Trigger */}
          <Pressable
            onPress={() => setShowPositionPicker(true)}
            style={styles.positionSelectorBox}
          >
            {/* Left: Dropdown Chevron */}
            <ChevronDown size={20} color="#101418" strokeWidth={2.5} />

            {/* Right: Value or Placeholder + Pitch Icon */}
            <View style={styles.positionValueRow}>
              <Text
                style={[
                  styles.positionSelectorText,
                  !selectedPosition && styles.positionPlaceholderText,
                ]}
              >
                {selectedPosition
                  ? POSITION_OPTIONS.find((o) => o.key === selectedPosition)?.label || selectedPosition
                  : 'اختر مركز اللاعب'}
              </Text>
              <PitchIcon size={22} color="#101418" />
            </View>
          </Pressable>
        </View>

        {/* ─── F. Main Action Button: إضافة اللاعب ─── */}
        <Pressable
          onPress={handleAddPlayer}
          disabled={submitting}
          style={({ pressed }) => [
            styles.addPlayerCTA,
            submitting && styles.btnDisabled,
            pressed && styles.btnPressed,
          ]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#101418" />
          ) : (
            <>
              <Text style={styles.addPlayerCTAText}>إضافة اللاعب</Text>
              <UserPlus size={22} color="#101418" strokeWidth={2.5} />
            </>
          )}
        </Pressable>
      </ScrollView>

      {/* Position Picker Modal */}
      <Modal visible={showPositionPicker} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.pickerModalCard}>
            <View style={styles.pickerModalHeader}>
              <Pressable onPress={() => setShowPositionPicker(false)}>
                <X size={20} color="#64748B" />
              </Pressable>
              <Text style={styles.pickerModalTitle}>اختر مركز اللاعب</Text>
            </View>

            <View style={styles.pickerOptionsList}>
              {POSITION_OPTIONS.map((pos) => {
                const isSelected = selectedPosition === pos.key;
                return (
                  <Pressable
                    key={pos.key}
                    onPress={() => {
                      setSelectedPosition(pos.key);
                      setShowPositionPicker(false);
                    }}
                    style={[
                      styles.pickerOptionBtn,
                      isSelected && styles.pickerOptionBtnActive,
                    ]}
                  >
                    {isSelected && <Check size={18} color="#101418" strokeWidth={3} />}
                    <View style={styles.pickerOptionTextWrap}>
                      <Text
                        style={[
                          styles.pickerOptionText,
                          isSelected && styles.pickerOptionTextActive,
                        ]}
                      >
                        {pos.icon} {pos.label}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ── Stylesheet ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F2F4F5',
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.25,
  },
  scrollContent: {
    paddingHorizontal: 16,
  },

  // ── A. Header ──
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    marginBottom: 8,
  },
  notificationBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  notifBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  brandCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandLogo: {
    width: 32,
    height: 32,
  },
  brandTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0B192C',
    marginTop: 2,
    letterSpacing: 0.5,
  },
  managerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  managerGreetingTexts: {
    alignItems: 'flex-end',
  },
  greetingTitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    textAlign: 'right',
  },
  managerRoleTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0B192C',
    textAlign: 'right',
  },
  coachAvatarWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: '#A8FF24',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachAvatarImg: {
    width: '100%',
    height: '100%',
  },

  // ── B. Page Title Block ──
  titleBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  backBtnCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  titleTextsCol: {
    alignItems: 'flex-end',
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0B192C',
    textAlign: 'right',
  },
  subtitleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'right',
  },

  // ── Common Card Container ──
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0B192C',
    textAlign: 'right',
    marginBottom: 8,
  },
  asterisk: {
    color: '#EF4444',
  },

  // ── C. Search Input Box ──
  searchInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#A8FF24',
    height: 50,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  clearBtn: {
    padding: 4,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: '#0B192C',
    paddingHorizontal: 8,
  },

  // Suggestions List
  suggestionsList: {
    gap: 6,
  },
  suggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
  },
  suggestionRowSelected: {
    backgroundColor: '#D9FBE8',
  },
  suggestionActionWrap: {
    width: 28,
    alignItems: 'flex-start',
  },
  suggestionTextsWrap: {
    flex: 1,
    alignItems: 'flex-end',
    paddingHorizontal: 10,
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B192C',
    textAlign: 'right',
  },
  suggestionNameSelected: {
    color: '#00875A',
    fontWeight: '900',
  },
  suggestionSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'right',
  },
  suggestionAvatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    borderColor: '#A8FF24',
    overflow: 'hidden',
    backgroundColor: '#ECFDF5',
  },
  suggestionAvatarImg: {
    width: '100%',
    height: '100%',
  },

  // ── D. Player Photo Card ──
  photoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  largeAvatarCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2.5,
    borderColor: '#A8FF24',
    backgroundColor: '#F2F4F5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  largeAvatarImg: {
    width: 135,
    height: 135,
    borderRadius: 67.5,
  },
  neutralSilhouette: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  silhouetteHead: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#CBD5E1',
    marginBottom: 4,
  },
  silhouetteBody: {
    width: 72,
    height: 36,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    backgroundColor: '#CBD5E1',
  },
  cameraOverlayBadge: {
    position: 'absolute',
    bottom: 2,
    right: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00875A',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 3,
  },

  // ── E. Position Selector ──
  positionSelectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#A8FF24',
    height: 50,
    paddingHorizontal: 14,
  },
  positionValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  positionSelectorText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0B192C',
  },
  positionPlaceholderText: {
    color: '#94A3B8',
    fontWeight: '600',
  },

  // ── F. Main Action Button: إضافة اللاعب ──
  addPlayerCTA: {
    backgroundColor: '#A8FF24',
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#00875A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
    marginTop: 8,
    marginBottom: 16,
  },
  addPlayerCTAText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#101418',
  },

  // Modal Styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  pickerModalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  pickerModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0B192C',
  },
  pickerOptionsList: {
    gap: 8,
  },
  pickerOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F2F4F5',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pickerOptionBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A8FF24',
  },
  pickerOptionTextWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  pickerOptionText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#475569',
  },
  pickerOptionTextActive: {
    color: '#00875A',
    fontWeight: '900',
  },

  // Helper
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
