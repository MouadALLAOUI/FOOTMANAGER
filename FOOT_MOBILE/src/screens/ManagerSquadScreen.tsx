import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ImageSourcePropType,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  Bell,
  Check,
  ChevronLeft,
  Clock,
  Filter,
  Mail,
  MoreVertical,
  Shield,
  UserPlus,
  Users,
  X,
} from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { useTeamMembers, useTeamProfile } from '@/api/managerTeam';
import { useUnreadNotificationCount } from '@/api/notifications';
import { persistentStorage } from '@/services/storage/persistent-storage';

// ── Preset Team Logos Map ──────────────────────────────────────────
const PRESET_LOGOS: Record<number, ImageSourcePropType> = {
  1: require('../../assets/preset-team-logo-1.png'),
  2: require('../../assets/preset-team-logo-2.png'),
  3: require('../../assets/preset-team-logo-3.png'),
  4: require('../../assets/preset-team-logo-4.png'),
  5: require('../../assets/preset-team-logo-5.png'),
  6: require('../../assets/preset-team-logo-6.png'),
};

// ── Fallback Reference Avatars ──────────────────────────────────────
const REF_AVATARS: Record<number, ImageSourcePropType> = {
  1: require('../../assets/ref-player-avatar-1.png'),
  2: require('../../assets/ref-player-avatar-2.png'),
  3: require('../../assets/ref-player-avatar-3.png'),
  4: require('../../assets/ref-player-avatar-4.png'),
  5: require('../../assets/ref-player-avatar-5.png'),
};

// ── Football Jersey SVG Badge ──────────────────────────────────────
function JerseyBadge({
  number,
  isGoalkeeper = false,
}: {
  number: number | string;
  isGoalkeeper?: boolean;
}) {
  const fillColor = isGoalkeeper ? '#EAB308' : '#A8FF24';
  const strokeColor = isGoalkeeper ? '#CA8A04' : '#101418';
  const textColor = '#101418';

  return (
    <View style={styles.jerseyBadgeWrap}>
      <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
        <Path
          d="M6 3 L9 5 C10 6 14 6 15 5 L18 3 L22 8 L19 10 L19 21 L5 21 L5 10 L2 8 Z"
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <Path
          d="M9 5 C10 8 14 8 15 5"
          stroke={strokeColor}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </Svg>
      <Text style={[styles.jerseyBadgeNumber, { color: textColor }]}>
        {number}
      </Text>
    </View>
  );
}

// ── Position Pill Component ─────────────────────────────────────────
function PositionPill({ position }: { position?: string | null }) {
  const norm = (position || '').toLowerCase();

  if (norm.includes('gk') || norm.includes('حارس') || norm.includes('goal')) {
    return (
      <View style={[styles.positionPill, styles.posPillGk]}>
        <Text style={styles.posPillIcon}>🧤</Text>
        <Text style={[styles.posPillText, styles.posTextGk]}>حارس مرمى</Text>
      </View>
    );
  }

  if (norm.includes('def') || norm.includes('مدافع') || norm.includes('cb') || norm.includes('lb') || norm.includes('rb')) {
    return (
      <View style={[styles.positionPill, styles.posPillDef]}>
        <Shield size={12} color="#0369A1" />
        <Text style={[styles.posPillText, styles.posTextDef]}>مدافع</Text>
      </View>
    );
  }

  if (norm.includes('mid') || norm.includes('وسط') || norm.includes('cm') || norm.includes('cdm') || norm.includes('cam')) {
    return (
      <View style={[styles.positionPill, styles.posPillMid]}>
        <Text style={styles.posPillIcon}>🥅</Text>
        <Text style={[styles.posPillText, styles.posTextMid]}>وسط</Text>
      </View>
    );
  }

  // Default: Forward / مهاجم
  return (
    <View style={[styles.positionPill, styles.posPillFwd]}>
      <Text style={styles.posPillIcon}>⚽</Text>
      <Text style={[styles.posPillText, styles.posTextFwd]}>مهاجم</Text>
    </View>
  );
}

export default function ManagerSquadScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();

  // Queries
  const { data: teamData, refetch: refetchProfile } = useTeamProfile();
  const { data: squadData, refetch: refetchMembers } = useTeamMembers();
  const { data: notifData } = useUnreadNotificationCount();

  // Local UI State
  const [activeTab, setActiveTab] = useState<'squad' | 'pending' | 'invitations'>('squad');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPosition, setFilterPosition] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Cached Setup Fallbacks
  const [step1Data] = useState(() => {
    try {
      return (
        persistentStorage.getJson<{
          name?: string;
          logoUri?: string;
          presetId?: number;
        }>('manager.pendingTeamInfo') ?? {}
      );
    } catch {
      return {};
    }
  });

  const [step3Data] = useState(() => {
    try {
      return (
        persistentStorage.getJson<{
          category?: string;
        }>('manager.pendingAdditionalInfo') ?? {}
      );
    } catch {
      return {};
    }
  });

  // Pull to refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([refreshUser(), refetchProfile(), refetchMembers()]);
    } catch {
      // ignore network errors
    } finally {
      setRefreshing(false);
    }
  }, [refreshUser, refetchProfile, refetchMembers]);

  // Derived Team Info
  const teamName: string = useMemo(() => {
    if (teamData?.team?.name) return teamData.team.name;
    if (step1Data.name?.trim()) return step1Data.name.trim();
    if (typeof user?.team?.name === 'string') return user.team.name;
    return 'نجوم زاكورة';
  }, [teamData, step1Data, user]);

  const teamCategory: string = useMemo(() => {
    if (teamData?.team?.category) return teamData.team.category;
    if (step3Data.category?.trim()) return step3Data.category.trim();
    return 'فريق كرة قدم';
  }, [teamData, step3Data]);

  const teamLogoSource: ImageSourcePropType = useMemo(() => {
    if (teamData?.team?.logo_url) {
      return { uri: teamData.team.logo_url };
    }
    if (step1Data.logoUri) {
      return { uri: step1Data.logoUri };
    }
    const pid = step1Data.presetId ?? 1;
    return PRESET_LOGOS[pid] ?? PRESET_LOGOS[1];
  }, [teamData, step1Data]);

  const unreadCount = notifData?.unread_count ?? 3;

  // Reference Player List (Approved Benchmark)
  const referencePlayers = useMemo(
    () => [
      {
        id: 1,
        name: 'محمد أمين الإدريسي',
        number: 9,
        position: 'مهاجم',
        isGoalkeeper: false,
        status: 'نشط',
        avatarSource: REF_AVATARS[1],
      },
      {
        id: 2,
        name: 'سفيان الوردي',
        number: 10,
        position: 'وسط',
        isGoalkeeper: false,
        status: 'نشط',
        avatarSource: REF_AVATARS[2],
      },
      {
        id: 3,
        name: 'ياسين بنعلي',
        number: 4,
        position: 'مدافع',
        isGoalkeeper: false,
        status: 'نشط',
        avatarSource: REF_AVATARS[3],
      },
      {
        id: 4,
        name: 'أيوب القاسمي',
        number: 1,
        position: 'حارس مرمى',
        isGoalkeeper: true,
        status: 'نشط',
        avatarSource: REF_AVATARS[4],
      },
      {
        id: 5,
        name: 'عمر الزهراوي',
        number: 8,
        position: 'وسط',
        isGoalkeeper: false,
        status: 'نشط',
        avatarSource: REF_AVATARS[5],
      },
    ],
    []
  );

  // Active Players List
  const playersList = useMemo(() => {
    const apiPlayers = squadData?.players;
    if (apiPlayers && apiPlayers.length > 0) {
      return apiPlayers.map((p, index) => {
        const pos = p.position || p.preferred_position || 'مهاجم';
        const isGk = pos.toLowerCase().includes('gk') || pos.toLowerCase().includes('حارس');
        return {
          id: p.id,
          name: p.name,
          number: p.number ?? index + 1,
          position: pos,
          isGoalkeeper: isGk,
          status: 'نشط',
          avatarSource: p.avatar_url
            ? { uri: p.avatar_url }
            : REF_AVATARS[(index % 5) + 1],
        };
      });
    }
    return referencePlayers;
  }, [squadData, referencePlayers]);

  // Filtered Players
  const filteredPlayers = useMemo(() => {
    return playersList.filter((p) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        String(p.number).includes(searchQuery);

      const matchesFilter =
        !filterPosition ||
        (filterPosition === 'gk' && p.isGoalkeeper) ||
        (filterPosition === 'fwd' && p.position.includes('مهاجم')) ||
        (filterPosition === 'mid' && p.position.includes('وسط')) ||
        (filterPosition === 'def' && p.position.includes('مدافع'));

      return matchesSearch && matchesFilter;
    });
  }, [playersList, searchQuery, filterPosition]);

  const totalPlayersCount = playersList.length;

  // More Actions Handler
  const handlePlayerActions = (playerName: string) => {
    Alert.alert(
      `إجراءات اللاعب: ${playerName}`,
      'اختر الإجراء المطلوب:',
      [
        {
          text: 'عرض الملف الشخصي',
          onPress: () => router.push('/(manager)/team/add-player'),
        },
        {
          text: 'تعيين كقائد الفريق',
          onPress: () => Alert.alert('تم التعيين', `تم تعيين ${playerName} قائداً للفريق.`),
        },
        { text: 'إلغاء', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />

      {/* Background Stadium Atmosphere */}
      <Image
        source={require('../../assets/role-selection-bg.png')}
        style={styles.bgImage}
        resizeMode="cover"
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 6, paddingBottom: 96 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#101418']} />
        }
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
              source={require('../../assets/role-header-logo.png')}
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
                source={require('../../assets/dashboard-coach-avatar.png')}
                style={styles.coachAvatarImg}
                resizeMode="cover"
              />
            </View>
          </Pressable>
        </View>

        {/* ─── B. Screen Title Block ─── */}
        <View style={styles.screenTitleRow}>
          {/* Circular Back Button */}
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtnCircle, pressed && styles.btnPressed]}
          >
            <ChevronLeft size={22} color="#0B192C" strokeWidth={2.5} />
          </Pressable>

          {/* Title & Subtitle */}
          <View style={styles.screenTitleTexts}>
            <View style={styles.titleWithIcon}>
              <Users size={24} color="#101418" />
              <Text style={styles.screenTitleText}>إدارة الفريق</Text>
            </View>
            <Text style={styles.screenSubtitleText}>إدارة لاعبي فريقك وبياناتهم</Text>
          </View>
        </View>

        {/* ─── C. Team Identity Card ─── */}
        <View style={styles.teamIdentityCard}>
          {/* Main Info (Left) */}
          <View style={styles.teamCardMain}>
            <Image source={teamLogoSource} style={styles.teamLogoImg} resizeMode="contain" />
            <View style={styles.teamTextsWrap}>
              <Text style={styles.teamNameTitle} numberOfLines={1}>
                {teamName}
              </Text>
              <Text style={styles.teamCategorySubtitle}>{teamCategory}</Text>
            </View>
          </View>

          {/* Player Count Cell (Right) */}
          <View style={styles.teamCardCountCell}>
            <Users size={26} color="#101418" />
            <Text style={styles.countCellLabel}>عدد اللاعبين</Text>
            <Text style={styles.countCellValue}>{totalPlayersCount}</Text>
          </View>
        </View>

        {/* ─── D. Player Management Tabs (3 Tabs) ─── */}
        <View style={styles.tabsRow}>
          {/* Tab 3: دعوات الانضمام (Left) */}
          <Pressable
            onPress={() => setActiveTab('invitations')}
            style={[styles.tabBtn, activeTab === 'invitations' && styles.tabBtnActive]}
          >
            <View style={styles.redBadgeNumber}>
              <Text style={styles.redBadgeText}>2</Text>
            </View>
            <Mail size={16} color={activeTab === 'invitations' ? '#FFFFFF' : '#64748B'} />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'invitations' && styles.tabBtnTextActive,
              ]}
            >
              دعوات الانضمام
            </Text>
          </Pressable>

          {/* Tab 2: طلبات معلقة (Center) */}
          <Pressable
            onPress={() => setActiveTab('pending')}
            style={[styles.tabBtn, activeTab === 'pending' && styles.tabBtnActive]}
          >
            <View style={styles.amberBadgeNumber}>
              <Text style={styles.amberBadgeText}>1</Text>
            </View>
            <Clock size={16} color={activeTab === 'pending' ? '#FFFFFF' : '#64748B'} />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'pending' && styles.tabBtnTextActive,
              ]}
            >
              طلبات معلقة
            </Text>
          </Pressable>

          {/* Tab 1: قائمة اللاعبين (Right - Active) */}
          <Pressable
            onPress={() => setActiveTab('squad')}
            style={[styles.tabBtn, activeTab === 'squad' && styles.tabBtnActive]}
          >
            <Users size={17} color={activeTab === 'squad' ? '#FFFFFF' : '#64748B'} />
            <Text
              style={[
                styles.tabBtnText,
                activeTab === 'squad' && styles.tabBtnTextActive,
              ]}
            >
              قائمة اللاعبين
            </Text>
          </Pressable>
        </View>

        {/* ─── E. Search and Filter Bar ─── */}
        <View style={styles.searchFilterRow}>
          {/* Filter Button (Left) */}
          <Pressable
            onPress={() => setShowFilterModal(true)}
            style={({ pressed }) => [
              styles.filterBtn,
              filterPosition && styles.filterBtnActive,
              pressed && styles.btnPressed,
            ]}
          >
            <Filter size={20} color="#101418" />
          </Pressable>

          {/* Search Input (Right) */}
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="البحث عن لاعب (الاسم أو الرقم)..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              textAlign="right"
            />
            <Text style={styles.searchIconEmoji}>🔍</Text>
          </View>
        </View>

        {/* ─── F. Player List ─── */}
        {activeTab === 'squad' && (
          <View style={styles.playersListWrap}>
            {filteredPlayers.length > 0 ? (
              filteredPlayers.map((player) => (
                <View key={player.id} style={styles.playerCard}>
                  {/* Left: Actions menu & Status Badge */}
                  <View style={styles.playerCardLeft}>
                    <Pressable
                      onPress={() => handlePlayerActions(player.name)}
                      style={styles.moreActionsBtn}
                    >
                      <MoreVertical size={18} color="#64748B" />
                    </Pressable>

                    <View style={styles.activeStatusPill}>
                      <View style={styles.activeCheckCircle}>
                        <Check size={9} color="#101418" strokeWidth={3} />
                      </View>
                      <Text style={styles.activeStatusText}>نشط</Text>
                    </View>
                  </View>

                  {/* Center: Position Pill */}
                  <View style={styles.playerPositionCell}>
                    <PositionPill position={player.position} />
                  </View>

                  {/* Right: Player Name, Jersey Badge, Avatar, Navigation Arrow */}
                  <Pressable
                    onPress={() => router.push(`/(manager)/team/${player.id}`)}
                    style={styles.playerCardRight}
                  >
                    <Text style={styles.playerNameTitle}>{player.name}</Text>

                    <JerseyBadge
                      number={player.number}
                      isGoalkeeper={player.isGoalkeeper}
                    />

                    <Image
                      source={player.avatarSource}
                      style={styles.playerAvatarImg}
                      resizeMode="cover"
                    />

                    <ChevronLeft size={18} color="#94A3B8" strokeWidth={2.5} />
                  </Pressable>
                </View>
              ))
            ) : (
              <View style={styles.emptySquadCard}>
                <Users size={36} color="#94A3B8" />
                <Text style={styles.emptySquadTitle}>
                  {searchQuery ? 'لا توجد نتائج مطابقة للبحث' : 'لا يوجد لاعبين مضافين حالياً'}
                </Text>
                <Text style={styles.emptySquadSubtitle}>
                  {searchQuery
                    ? 'جرب البحث برقم أو اسم آخر'
                    : 'ابدأ بإضافة لاعبي فريقك لتنظيم التشكيلة'}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Pending Requests Tab View */}
        {activeTab === 'pending' && (
          <View style={styles.emptySquadCard}>
            <Clock size={36} color="#F59E0B" />
            <Text style={styles.emptySquadTitle}>طلب معلق واحد (1) في انتظار الموافقة</Text>
            <Text style={styles.emptySquadSubtitle}>
              اللاعب: كمال السعدي - مركز وسط - تم التقديم منذ يومين
            </Text>
          </View>
        )}

        {/* Invitations Tab View */}
        {activeTab === 'invitations' && (
          <View style={styles.emptySquadCard}>
            <Mail size={36} color="#101418" />
            <Text style={styles.emptySquadTitle}>دعوتا انضمام مرسلتان (2)</Text>
            <Text style={styles.emptySquadSubtitle}>
              تم إرسال دعوات عبر رمز الفريق ورابط الانضمام السريع
            </Text>
          </View>
        )}

        {/* ─── G. Add Player Big Button ─── */}
        <Pressable
          onPress={() => router.push('/(manager)/team/add-player')}
          style={({ pressed }) => [styles.addPlayerBigBtn, pressed && styles.btnPressed]}
        >
          <Text style={styles.addPlayerBigBtnText}>إضافة لاعب جديد</Text>
          <UserPlus size={22} color="#101418" strokeWidth={2.5} />
        </Pressable>
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.filterModalCard}>
            <View style={styles.filterModalHeader}>
              <Pressable onPress={() => setShowFilterModal(false)}>
                <X size={20} color="#64748B" />
              </Pressable>
              <Text style={styles.filterModalTitle}>تصفية حسب المركز</Text>
            </View>

            <View style={styles.filterOptionsCol}>
              <Pressable
                onPress={() => {
                  setFilterPosition(null);
                  setShowFilterModal(false);
                }}
                style={[
                  styles.filterOptionBtn,
                  filterPosition === null && styles.filterOptionBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    filterPosition === null && styles.filterOptionTextActive,
                  ]}
                >
                  جميع المراكز (الكل)
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setFilterPosition('fwd');
                  setShowFilterModal(false);
                }}
                style={[
                  styles.filterOptionBtn,
                  filterPosition === 'fwd' && styles.filterOptionBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    filterPosition === 'fwd' && styles.filterOptionTextActive,
                  ]}
                >
                  ⚽ خط الهجوم (مهاجم)
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setFilterPosition('mid');
                  setShowFilterModal(false);
                }}
                style={[
                  styles.filterOptionBtn,
                  filterPosition === 'mid' && styles.filterOptionBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    filterPosition === 'mid' && styles.filterOptionTextActive,
                  ]}
                >
                  🥅 خط الوسط
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setFilterPosition('def');
                  setShowFilterModal(false);
                }}
                style={[
                  styles.filterOptionBtn,
                  filterPosition === 'def' && styles.filterOptionBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    filterPosition === 'def' && styles.filterOptionTextActive,
                  ]}
                >
                  🛡️ خط الدفاع
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  setFilterPosition('gk');
                  setShowFilterModal(false);
                }}
                style={[
                  styles.filterOptionBtn,
                  filterPosition === 'gk' && styles.filterOptionBtnActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterOptionText,
                    filterPosition === 'gk' && styles.filterOptionTextActive,
                  ]}
                >
                  🧤 حراسة المرمى
                </Text>
              </Pressable>
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
    backgroundColor: '#FFFFFF',
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

  // ── B. Screen Title ──
  screenTitleRow: {
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
  screenTitleTexts: {
    alignItems: 'flex-end',
  },
  titleWithIcon: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  screenTitleText: {
    fontSize: 21,
    fontWeight: '900',
    color: '#0B192C',
    textAlign: 'right',
  },
  screenSubtitleText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'right',
  },

  // ── C. Team Identity Card ──
  teamIdentityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  teamCardMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  teamLogoImg: {
    width: 62,
    height: 62,
  },
  teamTextsWrap: {
    flex: 1,
    alignItems: 'flex-start',
  },
  teamNameTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0B192C',
    textAlign: 'left',
  },
  teamCategorySubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
    textAlign: 'left',
  },
  teamCardCountCell: {
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#F1F5F9',
    paddingLeft: 14,
    minWidth: 80,
  },
  countCellLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 2,
  },
  countCellValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0B192C',
    marginTop: 1,
  },

  // ── D. Player Management Tabs ──
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    position: 'relative',
  },
  tabBtnActive: {
    backgroundColor: '#101418',
    borderColor: '#101418',
  },
  tabBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#0B192C',
  },
  tabBtnTextActive: {
    color: '#A8FF24',
    fontWeight: '900',
  },
  amberBadgeNumber: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amberBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  redBadgeNumber: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  redBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },

  // ── E. Search and Filter Bar ──
  searchFilterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#A7F3D0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  filterBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#00875A',
  },
  searchBar: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#0B192C',
    paddingRight: 8,
  },
  searchIconEmoji: {
    fontSize: 16,
  },

  // ── F. Player List ──
  playersListWrap: {
    gap: 10,
    marginBottom: 14,
  },
  playerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  playerCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  moreActionsBtn: {
    padding: 4,
  },
  activeStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00875A',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  activeCheckCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStatusText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  playerPositionCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  positionPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  posPillFwd: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  posTextFwd: {
    color: '#166534',
  },
  posPillMid: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  posTextMid: {
    color: '#166534',
  },
  posPillDef: {
    backgroundColor: '#E0F2FE',
    borderWidth: 1,
    borderColor: '#BAE6FD',
  },
  posTextDef: {
    color: '#0369A1',
  },
  posPillGk: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  posTextGk: {
    color: '#92400E',
  },
  posPillIcon: {
    fontSize: 12,
  },
  posPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  playerCardRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  playerNameTitle: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#0B192C',
    textAlign: 'right',
  },
  jerseyBadgeWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  jerseyBadgeNumber: {
    position: 'absolute',
    top: 10,
    fontSize: 10.5,
    fontWeight: '900',
    textAlign: 'center',
  },
  playerAvatarImg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#00875A',
  },

  // ── G. Add Player Big Button ──
  addPlayerBigBtn: {
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
    marginBottom: 16,
  },
  addPlayerBigBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#101418',
  },

  // Empty State
  emptySquadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptySquadTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0B192C',
    marginTop: 10,
    textAlign: 'center',
  },
  emptySquadSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },

  // Filter Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  filterModalCard: {
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
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    paddingBottom: 10,
  },
  filterModalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0B192C',
  },
  filterOptionsCol: {
    gap: 8,
  },
  filterOptionBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'flex-end',
  },
  filterOptionBtnActive: {
    backgroundColor: '#ECFDF5',
    borderColor: '#00875A',
  },
  filterOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  filterOptionTextActive: {
    color: '#00875A',
    fontWeight: '900',
  },

  // Helper
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
