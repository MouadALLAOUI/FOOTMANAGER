import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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
  MapPin,
  Plus,
  Shield,
  Swords,
  Trophy,
  Users,
  X,
} from 'lucide-react-native';

import {
  useAcceptMatchRequest,
  useManagerMatchFeed,
  useManagerMatchRequests,
  useReceivedChallenges,
  useRespondToChallenge,
  type ManagerMatchRequest,
} from '@/api/managerMatches';
import { AjiNqssroTabBar } from '@/components/navigation/AjiNqssroTabBar';
import { ManagerFloatingHeader, ManagerPageTitle } from '@/components/ui/ManagerFloatingHeader';
import { getApiErrorMessage } from '@/api/errors';
import { resolveImageUrl } from '@/utils/image';

type TopSectionTab = 'my_matches' | 'open_feed' | 'received_challenges';
type MyMatchesFilter = 'all' | 'upcoming' | 'completed';

interface StatusBadgeInfo {
  label: string;
  bg: string;
  fg: string;
  border: string;
}

function getStatusBadge(status?: string | null): StatusBadgeInfo {
  switch (status) {
    case 'live':
    case 'in_progress':
      return { label: 'مباشر الآن 🔴', bg: '#FEE2E2', fg: '#DC2626', border: '#FCA5A5' };
    case 'accepted':
    case 'matched':
      return { label: 'مؤكدة ✓', bg: '#DCFCE7', fg: '#00875A', border: '#86EFAC' };
    case 'open':
      return { label: 'تنتظر الخصم ⏳', bg: '#FEF3C7', fg: '#D97706', border: '#FDE68A' };
    case 'completed':
      return { label: 'منتهية', bg: '#EAF7FF', fg: '#0284C7', border: '#BAE6FD' };
    case 'cancelled':
    case 'declined':
      return { label: 'ملغاة', bg: '#F1F5F9', fg: '#64748B', border: '#CBD5E1' };
    default:
      return { label: status ?? 'مباراة', bg: '#F1F5F9', fg: '#475569', border: '#CBD5E1' };
  }
}

function formatArabicDateTime(datetime?: string | null): { date: string; time: string } {
  if (!datetime) {
    return { date: 'غير محدد', time: '--:--' };
  }
  const d = new Date(datetime);
  if (Number.isNaN(d.getTime())) {
    return { date: datetime, time: '' };
  }
  const dateStr = d.toLocaleDateString('ar-MA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const timeStr = d.toLocaleTimeString('ar-MA', {
    hour: '2-digit',
    minute: '2-digit',
  });
  return { date: dateStr, time: timeStr };
}

export default function MatchesListScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [activeTab, setActiveTab] = useState<TopSectionTab>('my_matches');
  const [filter, setFilter] = useState<MyMatchesFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  const myMatchesQuery = useManagerMatchRequests();
  const feedQuery = useManagerMatchFeed();
  const challengesQuery = useReceivedChallenges();

  const acceptFeedMutation = useAcceptMatchRequest();
  const respondChallengeMutation = useRespondToChallenge();

  const myMatchesAll = useMemo(
    () => myMatchesQuery.data?.match_requests ?? [],
    [myMatchesQuery.data],
  );
  const openFeedMatches = useMemo(
    () => feedQuery.data?.matches ?? [],
    [feedQuery.data],
  );
  const receivedChallenges = useMemo(
    () => challengesQuery.data?.challenges ?? [],
    [challengesQuery.data],
  );

  const filteredMyMatches = useMemo(() => {
    switch (filter) {
      case 'upcoming':
        return myMatchesAll.filter((m) => !['completed', 'cancelled', 'declined'].includes(m.status ?? ''));
      case 'completed':
        return myMatchesAll.filter((m) => ['completed', 'cancelled', 'declined'].includes(m.status ?? ''));
      default:
        return myMatchesAll;
    }
  }, [myMatchesAll, filter]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        myMatchesQuery.refetch(),
        feedQuery.refetch(),
        challengesQuery.refetch(),
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [myMatchesQuery, feedQuery, challengesQuery]);

  const handleAcceptOpenMatch = (match: ManagerMatchRequest) => {
    const hostName = match.hostTeam?.name ?? 'الفريق المنظم';
    Alert.alert(
      'قبول التحدي ⚽',
      `هل تريد قبول مواجهة فريق "${hostName}" في هذا التوقيت؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'تأكيد وقبول التحدي',
          onPress: async () => {
            try {
              const res = await acceptFeedMutation.mutateAsync({ id: match.id });
              Alert.alert('تم تأكيد المباراة! 🎉', res.message || 'تم قبول التحدي بنجاح.', [
                {
                  text: 'عرض تفاصيل المباراة',
                  onPress: () => router.push(`/(manager)/matches/${match.id}` as never),
                },
              ]);
            } catch (err) {
              Alert.alert('تنبيه', getApiErrorMessage(err));
            }
          },
        },
      ],
    );
  };

  const handleRespondToChallenge = (match: ManagerMatchRequest, action: 'accept' | 'decline') => {
    const hostName = match.hostTeam?.name ?? 'الفريق المتحدي';
    const title = action === 'accept' ? 'قبول التحدي المباشر' : 'رفض التحدي';
    const msg =
      action === 'accept'
        ? `هل تؤكد قبول التحدي المرسل من فريق "${hostName}"؟`
        : `هل أنت متأكد من رفض تحدي فريق "${hostName}"؟`;

    Alert.alert(title, msg, [
      { text: 'تراجع', style: 'cancel' },
      {
        text: action === 'accept' ? 'نعم، قبول' : 'رفض التحدي',
        style: action === 'decline' ? 'destructive' : 'default',
        onPress: async () => {
          try {
            const res = await respondChallengeMutation.mutateAsync({
              id: match.id,
              action,
            });
            Alert.alert('تم بنجاح', res.message || (action === 'accept' ? 'تم قبول التحدي' : 'تم رفض التحدي'));
          } catch (err) {
            Alert.alert('تنبيه', getApiErrorMessage(err));
          }
        },
      },
    ]);
  };

  const renderMatchCard = (item: ManagerMatchRequest, mode: TopSectionTab) => {
    const badge = getStatusBadge(item.status);
    const hostName = item.hostTeam?.name ?? 'فريق مستضيف';
    const oppName =
      item.opponentTeam?.name ??
      item.guest_team_name ??
      item.targetTeam?.name ??
      null;
    const hostLogo = resolveImageUrl(item.hostTeam?.logo_url);
    const oppLogo = resolveImageUrl(item.opponentTeam?.logo_url ?? item.targetTeam?.logo_url);
    const stadiumName = item.stadium?.name ?? item.custom_terrain_name ?? 'ملعب محلي';
    const city = item.stadium?.city ?? item.hostTeam?.city ?? '';
    const { date, time } = formatArabicDateTime(item.match_datetime);
    const hasScore = item.host_score != null && item.opponent_score != null;

    return (
      <TouchableOpacity
        key={item.id}
        style={styles.matchCard}
        onPress={() => router.push(`/(manager)/matches/${item.id}` as never)}
        activeOpacity={0.9}
        accessibilityRole="button"
      >
        {/* Top Banner: Status Pill & Format */}
        <View style={styles.cardTopBar}>
          <View style={styles.formatTag}>
            <Swords size={14} color="#00875A" />
            <Text style={styles.formatTagText}>
              {(item.player_format || '7v7').toUpperCase()}
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              { backgroundColor: badge.bg, borderColor: badge.border },
            ]}
          >
            <Text style={[styles.statusBadgeText, { color: badge.fg }]}>
              {badge.label}
            </Text>
          </View>
        </View>

        {/* VS Matchup Body */}
        <View style={styles.vsRow}>
          {/* Host Team (Right in RTL) */}
          <View style={styles.teamColumn}>
            {hostLogo ? (
              <Image source={{ uri: hostLogo }} style={styles.teamAvatar} resizeMode="cover" />
            ) : (
              <View style={[styles.teamShieldCircle, { backgroundColor: '#00875A' }]}>
                <Shield size={22} color="#FFFFFF" />
              </View>
            )}
            <Text style={styles.teamNameText} numberOfLines={1}>
              {hostName}
            </Text>
            <Text style={styles.teamSubRole}>المنظم</Text>
          </View>

          {/* Center Score or VS */}
          <View style={styles.centerScoreCol}>
            {hasScore ? (
              <View style={styles.scorePill}>
                <Text style={styles.scorePillText}>
                  {item.host_score} - {item.opponent_score}
                </Text>
              </View>
            ) : (
              <View style={styles.vsCircle}>
                <Text style={styles.vsCircleText}>VS</Text>
              </View>
            )}
            {item.type === 'direct_challenge' && (
              <View style={styles.directChallengeTag}>
                <Flame size={12} color="#EA580C" />
                <Text style={styles.directChallengeTagText}>تحدي مباشر</Text>
              </View>
            )}
          </View>

          {/* Opponent Team (Left in RTL) */}
          <View style={styles.teamColumn}>
            {oppLogo ? (
              <Image source={{ uri: oppLogo }} style={styles.teamAvatar} resizeMode="cover" />
            ) : (
              <View
                style={[
                  styles.teamShieldCircle,
                  { backgroundColor: oppName ? '#0284C7' : '#E2E8F0' },
                ]}
              >
                <Shield size={22} color={oppName ? '#FFFFFF' : '#64748B'} />
              </View>
            )}
            <Text
              style={[styles.teamNameText, !oppName && styles.waitingOpponentText]}
              numberOfLines={1}
            >
              {oppName ?? 'بانتظار الخصم'}
            </Text>
            <Text style={styles.teamSubRole}>المنافس</Text>
          </View>
        </View>

        {/* Stadium & Time Metadata */}
        <View style={styles.cardMetaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaItemText} numberOfLines={1}>
              {[stadiumName, city].filter(Boolean).join(' • ')}
            </Text>
            <MapPin size={15} color="#00875A" />
          </View>

          <View style={styles.metaDateTimeRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaItemText}>{time}</Text>
              <Clock size={14} color="#00875A" />
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaItemText}>{date}</Text>
              <Calendar size={14} color="#00875A" />
            </View>
          </View>

          {item.needs_players && (
            <View style={styles.recruitmentNotice}>
              <Users size={14} color="#0284C7" />
              <Text style={styles.recruitmentNoticeText}>
                مطلوب تعزيز: {item.players_joined_count ?? 0} / {item.players_needed ?? 1} لاعبين
              </Text>
            </View>
          )}
        </View>

        {/* Action Buttons for Open Feed or Received Challenges */}
        {mode === 'open_feed' && item.status === 'open' && (
          <View style={styles.cardActionRow}>
            <TouchableOpacity
              style={styles.acceptChallengeBtn}
              onPress={() => handleAcceptOpenMatch(item)}
              disabled={acceptFeedMutation.isPending}
              activeOpacity={0.88}
            >
              <Flame size={18} color="#FFFFFF" />
              <Text style={styles.acceptChallengeBtnText}>قبول التحدي ومواجهة الفريق</Text>
            </TouchableOpacity>
          </View>
        )}

        {mode === 'received_challenges' && item.status === 'open' && (
          <View style={styles.challengeRespondRow}>
            <TouchableOpacity
              style={styles.declineBtn}
              onPress={() => handleRespondToChallenge(item, 'decline')}
              disabled={respondChallengeMutation.isPending}
              activeOpacity={0.85}
            >
              <X size={18} color="#DC2626" />
              <Text style={styles.declineBtnText}>رفض</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.acceptDirectBtn}
              onPress={() => handleRespondToChallenge(item, 'accept')}
              disabled={respondChallengeMutation.isPending}
              activeOpacity={0.88}
            >
              <Check size={18} color="#FFFFFF" />
              <Text style={styles.acceptDirectBtnText}>قبول التحدي</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const activeList =
    activeTab === 'my_matches'
      ? filteredMyMatches
      : activeTab === 'open_feed'
        ? openFeedMatches
        : receivedChallenges;

  const isCurrentTabLoading =
    (activeTab === 'my_matches' && myMatchesQuery.isLoading) ||
    (activeTab === 'open_feed' && feedQuery.isLoading) ||
    (activeTab === 'received_challenges' && challengesQuery.isLoading);

  return (
    <ImageBackground
      source={require('../../assets/role-selection-bg.png')}
      style={styles.screenBg}
      resizeMode="cover"
    >
      <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
        {/* Floating AJI NQSSRO Header */}
        <ManagerFloatingHeader />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void handleRefresh()}
              tintColor="#00875A"
              colors={['#00875A']}
            />
          }
        >
          {/* Page Title + Create Button */}
          <ManagerPageTitle
            title="المباريات والتحديات"
            subtitle="نظم مباريات فريقك الودية واقبل تحديات الفرق"
            icon={<Swords size={20} color="#FFFFFF" />}
            leftAction={
              <TouchableOpacity
                style={styles.createHeaderBtn}
                onPress={() => router.push('/(manager)/matches/create' as never)}
                activeOpacity={0.88}
                accessibilityRole="button"
              >
                <Plus size={18} color="#FFFFFF" strokeWidth={3} />
                <Text style={styles.createHeaderBtnText}>مباراة جديدة</Text>
              </TouchableOpacity>
            }
          />

          {/* Top 3-Mode Section Tabs */}
          <View style={styles.modeTabsCard}>
            <TouchableOpacity
              style={[
                styles.modeTabBtn,
                activeTab === 'my_matches' && styles.modeTabBtnActive,
              ]}
              onPress={() => setActiveTab('my_matches')}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.modeTabText,
                  activeTab === 'my_matches' && styles.modeTabTextActive,
                ]}
              >
                مبارياتي ({myMatchesAll.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeTabBtn,
                activeTab === 'open_feed' && styles.modeTabBtnActive,
              ]}
              onPress={() => setActiveTab('open_feed')}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.modeTabText,
                  activeTab === 'open_feed' && styles.modeTabTextActive,
                ]}
              >
                تحديات متاحة ({openFeedMatches.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modeTabBtn,
                activeTab === 'received_challenges' && styles.modeTabBtnActive,
              ]}
              onPress={() => setActiveTab('received_challenges')}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.modeTabText,
                  activeTab === 'received_challenges' && styles.modeTabTextActive,
                ]}
              >
                تحديات واردة ({receivedChallenges.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sub-Filters for My Matches */}
          {activeTab === 'my_matches' && (
            <View style={styles.subFilterRow}>
              {(
                [
                  { key: 'all', label: 'الكل' },
                  { key: 'upcoming', label: 'القادمة والنشطة' },
                  { key: 'completed', label: 'السابقة والمنتهية' },
                ] as const
              ).map((f) => {
                const isSelected = filter === f.key;
                return (
                  <TouchableOpacity
                    key={f.key}
                    style={[
                      styles.subFilterPill,
                      isSelected && styles.subFilterPillActive,
                    ]}
                    onPress={() => setFilter(f.key)}
                    activeOpacity={0.85}
                  >
                    <Text
                      style={[
                        styles.subFilterPillText,
                        isSelected && styles.subFilterPillTextActive,
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Loading State */}
          {isCurrentTabLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator size="large" color="#00875A" />
              <Text style={styles.stateTitle}>جاري تحميل المباريات...</Text>
            </View>
          ) : activeList.length === 0 ? (
            /* Empty State */
            <View style={styles.stateCard}>
              <View style={styles.emptyIconCircle}>
                <Trophy size={36} color="#00875A" />
              </View>
              <Text style={styles.stateTitle}>
                {activeTab === 'my_matches'
                  ? 'لا توجد مباريات مسجلة حالياً'
                  : activeTab === 'open_feed'
                    ? 'لا توجد تحديات مفتوحة من فرق أخرى حالياً'
                    : 'لا توجد تحديات واردة لفريقك حالياً'}
              </Text>
              <Text style={styles.stateSubtitle}>
                {activeTab === 'my_matches'
                  ? 'أنشئ طلب مباراة ودية أو تحدَّ فريقاً آخر لبدء المنافسة.'
                  : 'يمكنك نشر طلب مباراة جديد ليظهر للفرق الأخرى في منطقتك.'}
              </Text>
              <TouchableOpacity
                style={styles.emptyActionBtn}
                onPress={() => router.push('/(manager)/matches/create' as never)}
                activeOpacity={0.88}
              >
                <Plus size={20} color="#FFFFFF" strokeWidth={3} />
                <Text style={styles.emptyActionBtnText}>إنشاء مباراة / تحدي جديد</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Matches List */
            <View style={styles.cardsList}>
              {activeList.map((item) => renderMatchCard(item, activeTab))}
            </View>
          )}
        </ScrollView>

        {/* Bottom Navigation Bar */}
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
    paddingBottom: 28,
  },
  createHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#00A651',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#00875A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
  },
  createHeaderBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  modeTabsCard: {
    flexDirection: 'row-reverse',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 5,
    gap: 6,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    elevation: 2,
  },
  modeTabBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTabBtnActive: {
    backgroundColor: '#00875A',
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'center',
  },
  modeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '900',
  },
  subFilterRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 14,
  },
  subFilterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.88)',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
  },
  subFilterPillActive: {
    backgroundColor: '#062F36',
    borderColor: '#062F36',
  },
  subFilterPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#062F36',
  },
  subFilterPillTextActive: {
    color: '#FFFFFF',
  },
  cardsList: {
    gap: 14,
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#16A34A',
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
  },
  formatTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  formatTagText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#00875A',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '900',
  },
  vsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  teamColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 5,
  },
  teamAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: '#00875A',
  },
  teamShieldCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamNameText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#062F36',
    textAlign: 'center',
  },
  waitingOpponentText: {
    color: '#64748B',
    fontWeight: '800',
  },
  teamSubRole: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  centerScoreCol: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
    gap: 6,
  },
  vsCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EAF7FF',
    borderWidth: 2,
    borderColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsCircleText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0284C7',
  },
  scorePill: {
    backgroundColor: '#062F36',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  scorePillText: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  directChallengeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  directChallengeTagText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#EA580C',
  },
  cardMetaGrid: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  metaDateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaItemText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E293B',
  },
  recruitmentNotice: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EAF7FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginTop: 2,
  },
  recruitmentNoticeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0284C7',
  },
  cardActionRow: {
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  acceptChallengeBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00A651',
    paddingVertical: 12,
    borderRadius: 14,
  },
  acceptChallengeBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  challengeRespondRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  declineBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  declineBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#DC2626',
  },
  acceptDirectBtn: {
    flex: 2,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00A651',
    paddingVertical: 11,
    borderRadius: 14,
  },
  acceptDirectBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  stateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    marginTop: 8,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#062F36',
    textAlign: 'center',
    marginTop: 6,
  },
  stateSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 20,
  },
  emptyActionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00A651',
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 16,
    marginTop: 18,
  },
  emptyActionBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
