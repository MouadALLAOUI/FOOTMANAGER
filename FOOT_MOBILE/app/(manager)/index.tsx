import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  ImageSourcePropType,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  Calendar,
  Check,
  ChevronLeft,
  Clock,
  Edit2,
  Landmark,
  MapPin,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react-native';

import { useAuth } from '@/auth/AuthProvider';
import { useTeamMembers, useTeamProfile } from '@/api/managerTeam';
import { useManagerMatchRequests } from '@/api/managerMatches';
import { useManagerBookings } from '@/api/managerBookings';
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

export default function ManagerDashboardScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user, refreshUser } = useAuth();

  // ── Real API Queries ──
  const {
    data: profileData,
    refetch: refetchProfile,
  } = useTeamProfile();

  const {
    data: membersData,
    refetch: refetchMembers,
  } = useTeamMembers();

  const {
    data: matchesData,
    refetch: refetchMatches,
  } = useManagerMatchRequests();

  const {
    data: bookingsData,
    refetch: refetchBookings,
  } = useManagerBookings('all');

  const { data: notifData } = useUnreadNotificationCount();

  // ── Cached Setup Data Fallbacks ──
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
          teamType?: string;
          primaryColor?: string;
          secondaryColor?: string;
        }>('manager.pendingAdditionalInfo') ?? {}
      );
    } catch {
      return {};
    }
  });

  const [refreshing, setRefreshing] = useState(false);

  // ── Pull-to-refresh ──
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        refreshUser(),
        refetchProfile(),
        refetchMembers(),
        refetchMatches(),
        refetchBookings(),
      ]);
    } catch {
      // ignore network errors
    } finally {
      setRefreshing(false);
    }
  }, [refreshUser, refetchProfile, refetchMembers, refetchMatches, refetchBookings]);

  // ── Derived Team Identity Data ──
  const teamName: string = useMemo(() => {
    if (profileData?.team?.name) return profileData.team.name;
    if (step1Data.name?.trim()) return step1Data.name.trim();
    if (typeof user?.team?.name === 'string') return user.team.name;
    return 'نجوم زاكورة';
  }, [profileData, step1Data, user]);

  const teamCategory: string = useMemo(() => {
    if (profileData?.team?.category) return profileData.team.category;
    if (step3Data.category?.trim()) return step3Data.category.trim();
    return 'فريق كرة قدم';
  }, [profileData, step3Data]);

  const teamLogoSource: ImageSourcePropType = useMemo(() => {
    if (profileData?.team?.logo_url) {
      return { uri: profileData.team.logo_url };
    }
    if (step1Data.logoUri) {
      return { uri: step1Data.logoUri };
    }
    const pid = step1Data.presetId ?? 1;
    return PRESET_LOGOS[pid] ?? PRESET_LOGOS[1];
  }, [profileData, step1Data]);

  // ── Derived Statistics ──
  const playersCount = membersData?.players?.length ?? 24;
  const matchesCount = (profileData?.team as unknown as { matches_played?: number })?.matches_played ?? 8;
  const winsCount = (profileData?.team as unknown as { wins?: number })?.wins ?? 5;
  const drawsCount = (profileData?.team as unknown as { draws?: number })?.draws ?? 2;
  const lossesCount = (profileData?.team as unknown as { losses?: number })?.losses ?? 1;
  const rankNumber = (profileData?.team as unknown as { rank?: number | string })?.rank ?? '12';
  const teamPoints = (profileData?.team as unknown as { points?: number | string })?.points ?? '320';
  const unreadCount = notifData?.unread_count ?? 3;

  // ── Next Pitch Booking ──
  const upcomingBooking = useMemo(() => {
    const list = bookingsData?.bookings ?? [];
    const confirmed = list.find((b) => b.status === 'confirmed');
    if (confirmed) {
      return {
        stadiumName: confirmed.terrain?.name || 'ملعب زاكورة البلدي',
        dateStr: confirmed.booking_date || 'الأربعاء 29 يناير 2025',
        timeStr: confirmed.start_time && confirmed.end_time
          ? `${confirmed.start_time.slice(0, 5)} - ${confirmed.end_time.slice(0, 5)}`
          : '20:00 - 21:00',
        statusStr: 'مؤكّد',
      };
    }
    return {
      stadiumName: 'ملعب زاكورة البلدي',
      dateStr: 'الأربعاء 29 يناير 2025',
      timeStr: '20:00 - 21:00',
      statusStr: 'مؤكّد',
    };
  }, [bookingsData]);

  // ── Next Match ──
  const upcomingMatch = useMemo(() => {
    const list = matchesData?.match_requests ?? [];
    const upcoming = list.find((m) => m.status === 'accepted' || m.status === 'open');
    if (upcoming) {
      return {
        hostName: upcoming.hostTeam?.name || teamName,
        opponentName: upcoming.opponentTeam?.name || 'أطلس زاكورة',
        dateStr: upcoming.match_datetime
          ? new Date(upcoming.match_datetime).toLocaleDateString('ar-MA', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })
          : 'الجمعة 31 يناير 2025',
        timeStr: upcoming.match_datetime?.slice(11, 16) || '21:00',
        stadiumName: upcoming.stadium?.name || 'ملعب زاكورة البلدي',
      };
    }
    return {
      hostName: teamName,
      opponentName: 'أطلس زاكورة',
      dateStr: 'الجمعة 31 يناير 2025',
      timeStr: '21:00',
      stadiumName: 'ملعب زاكورة البلدي',
    };
  }, [matchesData, teamName]);

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

        {/* ─── B. Team Identity Card & Ranking Card (Side by Side) ─── */}
        <View style={styles.teamIdentityRow}>
          {/* Main Team Card */}
          <View style={styles.teamCard}>
            {/* Team Logo with Edit Shortcut */}
            <View style={styles.teamLogoContainer}>
              <Image source={teamLogoSource} style={styles.teamLogoImg} resizeMode="contain" />
              <Pressable
                onPress={() => router.push('/(manager)/profile')}
                style={styles.editLogoBtn}
              >
                <Edit2 size={11} color="#101418" />
              </Pressable>
            </View>

            {/* Team Text Info (RTL) */}
            <View style={styles.teamTextsWrap}>
              <Text style={styles.teamNameText} numberOfLines={1}>
                {teamName}
              </Text>
              <Text style={styles.teamCategoryText}>{teamCategory}</Text>
              <View style={styles.approvedBadge}>
                <View style={styles.checkIconCircle}>
                  <Check size={10} color="#101418" strokeWidth={3} />
                </View>
                <Text style={styles.approvedBadgeText}>معتمد من الإدارة</Text>
              </View>
            </View>
          </View>

          {/* Ranking Card */}
          <View style={styles.rankingCard}>
            <View style={styles.rankingTopRow}>
              <Text style={styles.rankingTitle}>التصنيف</Text>
              <Text style={styles.rankingNumber}>#{rankNumber}</Text>
            </View>
            <View style={styles.rankingDivider} />
            <View style={styles.rankingBottomRow}>
              <Image
                source={require('../../assets/dashboard-ranking-trophy.png')}
                style={styles.rankingTrophyImg}
                resizeMode="contain"
              />
              <View style={styles.rankingPointsTexts}>
                <Text style={styles.rankingPointsLabel}>نقاط الفريق</Text>
                <Text style={styles.rankingPointsValue}>{teamPoints} ⭐</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ─── C. Statistics Bar ─── */}
        <View style={styles.statsBar}>
          {/* 1. Players (Rightmost) */}
          <View style={styles.statCell}>
            <Users size={18} color="#101418" />
            <Text style={styles.statValue}>{playersCount} لاعباً</Text>
          </View>
          <View style={styles.statDivider} />

          {/* 2. Matches */}
          <View style={styles.statCell}>
            <Text style={styles.statEmoji}>⚽</Text>
            <Text style={styles.statValue}>{matchesCount} مباريات</Text>
          </View>
          <View style={styles.statDivider} />

          {/* 3. Wins */}
          <View style={styles.statCell}>
            <Trophy size={18} color="#101418" />
            <Text style={[styles.statValue, styles.statGreen]}>{winsCount} انتصارات</Text>
          </View>
          <View style={styles.statDivider} />

          {/* 4. Draws */}
          <View style={styles.statCell}>
            <Text style={styles.statEmoji}>🤝</Text>
            <Text style={[styles.statValue, styles.statOrange]}>{drawsCount} تعادلات</Text>
          </View>
          <View style={styles.statDivider} />

          {/* 5. Losses (Leftmost) */}
          <View style={styles.statCell}>
            <Text style={styles.statEmoji}>❌</Text>
            <Text style={[styles.statValue, styles.statRed]}>{lossesCount} هزيمة</Text>
          </View>
        </View>

        {/* ─── D. Main Information Cards (Side by Side) ─── */}
        <View style={styles.infoCardsRow}>
          {/* Left Card: المباراة القادمة */}
          <Pressable
            onPress={() => router.push('/(manager)/matches')}
            style={({ pressed }) => [styles.infoCard, pressed && styles.btnPressed]}
          >
            {/* Header Banner */}
            <View style={styles.infoCardHeader}>
              <Calendar size={14} color="#FFFFFF" />
              <Text style={styles.infoCardHeaderTitle}>المباراة القادمة</Text>
            </View>

            {/* Match Card Body */}
            <View style={styles.infoCardBody}>
              {/* Versus Row */}
              <View style={styles.matchVsRow}>
                {/* Host Team */}
                <View style={styles.matchTeamCol}>
                  <Image source={teamLogoSource} style={styles.matchTeamLogo} resizeMode="contain" />
                  <Text style={styles.matchTeamName} numberOfLines={1}>{upcomingMatch.hostName}</Text>
                </View>

                {/* VS Badge */}
                <Text style={styles.vsBadge}>VS</Text>

                {/* Opponent Team */}
                <View style={styles.matchTeamCol}>
                  <Image
                    source={require('../../assets/preset-team-logo-atlas.png')}
                    style={styles.matchTeamLogo}
                    resizeMode="contain"
                  />
                  <Text style={styles.matchTeamName} numberOfLines={1}>{upcomingMatch.opponentName}</Text>
                </View>
              </View>

              {/* Match Details */}
              <View style={styles.matchDetailsBlock}>
                <View style={styles.detailRow}>
                  <Calendar size={11} color="#101418" />
                  <Text style={styles.detailText}>{upcomingMatch.dateStr}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Clock size={11} color="#101418" />
                  <Text style={styles.detailTextBold}>{upcomingMatch.timeStr}</Text>
                </View>
                <View style={styles.detailRow}>
                  <MapPin size={11} color="#101418" />
                  <Text style={styles.detailText} numberOfLines={1}>{upcomingMatch.stadiumName}</Text>
                </View>
              </View>
            </View>
          </Pressable>

          {/* Right Card: حجز الملعب القادم */}
          <Pressable
            onPress={() => router.push('/(public)/stadiums')}
            style={({ pressed }) => [styles.infoCard, pressed && styles.btnPressed]}
          >
            {/* Header Banner */}
            <View style={styles.infoCardHeader}>
              <Landmark size={14} color="#FFFFFF" />
              <Text style={styles.infoCardHeaderTitle}>حجز الملعب القادم</Text>
            </View>

            {/* Booking Card Body */}
            <View style={styles.infoCardBody}>
              {/* Stadium Thumbnail */}
              <Image
                source={require('../../assets/dashboard-pitch-thumb.png')}
                style={styles.stadiumThumbImg}
                resizeMode="cover"
              />

              {/* Stadium Name */}
              <Text style={styles.stadiumNameTitle} numberOfLines={1}>
                {upcomingBooking.stadiumName}
              </Text>

              {/* Date & Time */}
              <View style={styles.bookingDetailsBlock}>
                <View style={styles.detailRow}>
                  <Calendar size={11} color="#101418" />
                  <Text style={styles.detailText}>{upcomingBooking.dateStr}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Clock size={11} color="#101418" />
                  <Text style={styles.detailTextBold}>{upcomingBooking.timeStr}</Text>
                </View>
              </View>

              {/* Confirmed Status Pill */}
              <View style={styles.confirmedPill}>
                <View style={styles.checkCircleWhite}>
                  <Check size={9} color="#101418" strokeWidth={3} />
                </View>
                <Text style={styles.confirmedPillText}>{upcomingBooking.statusStr}</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* ─── E. Management Services Grid (3 Cols x 2 Rows) ─── */}
        <View style={styles.servicesGrid}>
          {/* Row 1 */}
          <View style={styles.servicesRow}>
            {/* 3. البطولات (Left) */}
            <Pressable
              onPress={() => router.push('/(public)/tournaments')}
              style={({ pressed }) => [styles.serviceCard, pressed && styles.btnPressed]}
            >
              <Image
                source={require('../../assets/dashboard-card-trophy.png')}
                style={styles.serviceIconImg}
                resizeMode="contain"
              />
              <Text style={styles.serviceCardTitle}>البطولات</Text>
              <View style={styles.serviceArrowCircle}>
                <ChevronLeft size={13} color="#101418" strokeWidth={2.5} />
              </View>
            </Pressable>

            {/* 2. المباريات والتحديات (Center) */}
            <Pressable
              onPress={() => router.push('/(manager)/matches')}
              style={({ pressed }) => [styles.serviceCard, pressed && styles.btnPressed]}
            >
              <Image
                source={require('../../assets/dashboard-card-ball.png')}
                style={styles.serviceIconImg}
                resizeMode="contain"
              />
              <Text style={styles.serviceCardTitle}>المباريات والتحديات</Text>
              <View style={styles.serviceArrowCircle}>
                <ChevronLeft size={13} color="#101418" strokeWidth={2.5} />
              </View>
            </Pressable>

            {/* 1. إدارة اللاعبين (Right) - Highlighted Mint Card */}
            <Pressable
              onPress={() => router.push('/(manager)/team')}
              style={({ pressed }) => [
                styles.serviceCard,
                styles.serviceCardMint,
                pressed && styles.btnPressed,
              ]}
            >
              <View style={styles.redDotBadge} />
              <Users size={32} color="#101418" />
              <Text style={styles.serviceCardTitleMint}>إدارة اللاعبين</Text>
              <View style={styles.serviceArrowCircle}>
                <ChevronLeft size={13} color="#101418" strokeWidth={2.5} />
              </View>
            </Pressable>
          </View>

          {/* Row 2 */}
          <View style={styles.servicesRow}>
            {/* 6. الإشعارات (Left) */}
            <Pressable
              onPress={() => router.push('/(manager)/notifications')}
              style={({ pressed }) => [styles.serviceCard, pressed && styles.btnPressed]}
            >
              <View style={styles.serviceNotifBadge}>
                <Text style={styles.serviceNotifBadgeText}>{unreadCount}</Text>
              </View>
              <Bell size={32} color="#101418" />
              <Text style={styles.serviceCardTitle}>الإشعارات</Text>
              <View style={styles.serviceArrowCircle}>
                <ChevronLeft size={13} color="#101418" strokeWidth={2.5} />
              </View>
            </Pressable>

            {/* 5. حجوزات الملعب (Center) */}
            <Pressable
              onPress={() => router.push('/(public)/stadiums')}
              style={({ pressed }) => [styles.serviceCard, pressed && styles.btnPressed]}
            >
              <View style={styles.pitchCalendarIconWrap}>
                <Calendar size={30} color="#101418" />
              </View>
              <Text style={styles.serviceCardTitle}>حجوزات الملعب</Text>
              <View style={styles.serviceArrowCircle}>
                <ChevronLeft size={13} color="#101418" strokeWidth={2.5} />
              </View>
            </Pressable>

            {/* 4. معلومات الفريق (Right) */}
            <Pressable
              onPress={() => {
                Alert.alert(
                  'معلومات الفريق',
                  `اسم الفريق: ${teamName}\nالتصنيف: #${rankNumber}\nالفئة: ${teamCategory}\nالنقاط: ${teamPoints} ⭐`
                );
              }}
              style={({ pressed }) => [styles.serviceCard, pressed && styles.btnPressed]}
            >
              <ShieldCheck size={32} color="#101418" />
              <Text style={styles.serviceCardTitle}>معلومات الفريق</Text>
              <View style={styles.serviceArrowCircle}>
                <ChevronLeft size={13} color="#101418" strokeWidth={2.5} />
              </View>
            </Pressable>
          </View>
        </View>

        {/* ─── F. Tournament Promotional Banner ─── */}
        <Pressable
          onPress={() => router.push('/(public)/tournaments')}
          style={({ pressed }) => [styles.tournamentBanner, pressed && styles.btnPressed]}
        >
          {/* Banner Trophy Visual */}
          <Image
            source={require('../../assets/dashboard-banner-trophy.png')}
            style={styles.bannerTrophyImg}
            resizeMode="contain"
          />

          {/* Banner Texts (RTL) */}
          <View style={styles.bannerTextsWrap}>
            <Text style={styles.bannerTitleText}>سجّل فريقك في البطولات</Text>
            <Text style={styles.bannerSubtitleText}>
              شارك في البطولات الرسمية ونافس على الألقاب
            </Text>
          </View>

          {/* Banner Action Circle */}
          <View style={styles.bannerActionCircle}>
            <ChevronLeft size={18} color="#101418" strokeWidth={3} />
          </View>
        </Pressable>
      </ScrollView>
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

  // ── Header ──
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

  // ── Team Identity & Ranking Row ──
  teamIdentityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  teamCard: {
    flex: 1.6,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    gap: 10,
  },
  teamLogoContainer: {
    width: 58,
    height: 58,
    borderRadius: 14,
    backgroundColor: '#F2F4F5',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  teamLogoImg: {
    width: 52,
    height: 52,
  },
  editLogoBtn: {
    position: 'absolute',
    bottom: -2,
    left: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  teamTextsWrap: {
    flex: 1,
    alignItems: 'flex-end',
  },
  teamNameText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0B192C',
    textAlign: 'right',
  },
  teamCategoryText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
    marginBottom: 6,
    textAlign: 'right',
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#00875A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  checkIconCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  approvedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  rankingCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    justifyContent: 'space-between',
  },
  rankingTopRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rankingTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  rankingNumber: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0B192C',
  },
  rankingDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  rankingBottomRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  rankingTrophyImg: {
    width: 28,
    height: 24,
  },
  rankingPointsTexts: {
    alignItems: 'flex-end',
  },
  rankingPointsLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#64748B',
  },
  rankingPointsValue: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0B192C',
  },

  // ── Statistics Bar ──
  statsBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E2E8F0',
  },
  statEmoji: {
    fontSize: 15,
  },
  statValue: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0B192C',
    textAlign: 'center',
  },
  statGreen: {
    color: '#00875A',
  },
  statOrange: {
    color: '#D97706',
  },
  statRed: {
    color: '#EF4444',
  },

  // ── Main Information Cards (Side by Side) ──
  infoCardsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  infoCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  infoCardHeader: {
    backgroundColor: '#00875A',
    paddingVertical: 7,
    paddingHorizontal: 8,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  infoCardHeaderTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  infoCardBody: {
    padding: 8,
  },

  // Match Card Specifics
  matchVsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
    marginBottom: 6,
  },
  matchTeamCol: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  matchTeamLogo: {
    width: 28,
    height: 28,
  },
  matchTeamName: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0B192C',
    textAlign: 'center',
  },
  vsBadge: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748B',
    paddingHorizontal: 4,
  },
  matchDetailsBlock: {
    gap: 4,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 6,
  },
  detailRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
  },
  detailText: {
    fontSize: 9.5,
    color: '#475569',
    fontWeight: '500',
  },
  detailTextBold: {
    fontSize: 10,
    color: '#0B192C',
    fontWeight: '800',
  },

  // Booking Card Specifics
  stadiumThumbImg: {
    width: '100%',
    height: 52,
    borderRadius: 8,
    marginBottom: 6,
  },
  stadiumNameTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0B192C',
    textAlign: 'right',
    marginBottom: 4,
  },
  bookingDetailsBlock: {
    gap: 3,
    marginBottom: 6,
  },
  confirmedPill: {
    backgroundColor: '#101418',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  checkCircleWhite: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmedPillText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ── Management Services Grid ──
  servicesGrid: {
    gap: 10,
    marginBottom: 10,
  },
  servicesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  serviceCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 98,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    position: 'relative',
  },
  serviceCardMint: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
  },
  serviceIconImg: {
    width: 32,
    height: 28,
    marginBottom: 4,
  },
  serviceCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0B192C',
    textAlign: 'center',
    marginBottom: 6,
  },
  serviceCardTitleMint: {
    fontSize: 11,
    fontWeight: '900',
    color: '#101418',
    textAlign: 'center',
    marginBottom: 6,
  },
  serviceArrowCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 1,
    elevation: 1,
  },
  redDotBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#EF4444',
  },
  serviceNotifBadge: {
    position: 'absolute',
    top: 6,
    right: 12,
    backgroundColor: '#EF4444',
    borderRadius: 8,
    minWidth: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  serviceNotifBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  pitchCalendarIconWrap: {
    marginBottom: 4,
  },

  // ── Tournament Promotional Banner ──
  tournamentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#004D34',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 12,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  bannerTrophyImg: {
    width: 58,
    height: 60,
  },
  bannerTextsWrap: {
    flex: 1,
    alignItems: 'flex-end',
    paddingHorizontal: 8,
  },
  bannerTitleText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'right',
  },
  bannerSubtitleText: {
    fontSize: 10.5,
    fontWeight: '500',
    color: '#A7F3D0',
    marginTop: 2,
    textAlign: 'right',
  },
  bannerActionCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  // Helper
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
