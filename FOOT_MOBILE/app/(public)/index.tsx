import React from 'react';
import {
  Dimensions,
  Image,
  ImageBackground,
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
  ChevronLeft,
  Clock,
  Flame,
  MapPin,
  Sparkles,
  Trophy,
  Users,
} from 'lucide-react-native';

import { AjiNqssroHeader } from '@/components/ui/AjiNqssroHeader';
import { ActionCategoryCards } from '@/components/home/ActionCategoryCards';
import { AjiNqssroTabBar } from '@/components/navigation/AjiNqssroTabBar';
import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/client';

import { usePublicTournaments, useLiveTournamentMatches } from '@/api/publicTournaments';
import { usePublicMatches } from '@/api/matches';
import { resolveImageUrl } from '@/utils/image';

const { width: SW } = Dimensions.get('window');

export default function PublicHomeScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Fetch home summary data from API
  const { data: homeData, isLoading: isHomeLoading } = useQuery({
    queryKey: ['public', 'home'],
    queryFn: async () => {
      try {
        const res = await get<any>('/v1/home');
        return res?.data || res;
      } catch {
        return null;
      }
    },
    staleTime: 60_000,
  });

  // Fetch tournaments
  const { data: tournamentsResponse } = usePublicTournaments();
  const tournaments = tournamentsResponse?.data || [];
  const activeTournament = tournaments.find((t) => t.status === 'in_progress') || tournaments[0];

  // Fetch live and today's matches
  const { data: liveData } = useLiveTournamentMatches();
  const todayLiveMatch = liveData?.data?.live?.[0] || liveData?.data?.next || liveData?.data?.upcoming?.[0];

  // Public challenges/matches
  const { data: matchesResponse } = usePublicMatches();
  const challenges = homeData?.latest_matches?.length ? homeData.latest_matches : matchesResponse?.data || [];
  const primaryChallenge = challenges[0];

  // Nearby Stadiums from live homeData
  const nearbyStadiums: Array<{
    id: number;
    name: string;
    city: string;
    distance: string;
    image: string;
    availableToday: boolean;
  }> =
    homeData?.top_stadiums?.map((s: any) => ({
      id: s.id,
      name: s.name,
      city: s.city || 'تنغير',
      distance: s.distance ? `${s.distance} كم` : 'متاح للحجز',
      image:
        resolveImageUrl(s.cover_image_url) ||
        'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=600&q=80',
      availableToday: s.is_available ?? true,
    })) || [];



  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* 1. Header with Brand Logo, Login, Register, Menu */}
      <AjiNqssroHeader showAuthButtons showMenu />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* 2. Hero Banner: كرة القدم تجمعنا */}
        <View style={styles.heroWrap}>
          <ImageBackground
            source={{
              uri: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1000&q=80',
            }}
            style={styles.heroBackground}
            imageStyle={styles.heroImage}
          >
            <View style={styles.heroOverlay}>
              {/* Location Tag */}
              <View style={styles.heroLocationBadge}>
                <Text style={styles.heroLocationText}>تنغير - الجنوب الشرقي</Text>
                <MapPin size={13} color="#FFFFFF" />
              </View>

              {/* Sub-badge: من ملعبك إلى البطولة */}
              <View style={styles.heroTagBadge}>
                <Text style={styles.heroTagText}>من ملعبك إلى البطولة ↗</Text>
              </View>

              {/* Main Title & Subtitle */}
              <Text style={styles.heroTitle}>كرة القدم{'\n'}تجمعنا</Text>
              <Text style={styles.heroSubtitle}>
                احجز ملعبك .. تحدي فريقك .. تابع البطولات
              </Text>
            </View>
          </ImageBackground>
        </View>

        {/* 3. Three Quick Action Cards: شنو باغي دير؟ */}
        <ActionCategoryCards />

        {/* 4. ملاعب قريبة منك (Nearby Stadiums) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity
              onPress={() => router.push('/(public)/stadiums' as any)}
              style={styles.seeAllBtn}
            >
              <ChevronLeft size={16} color="#00875A" />
              <Text style={styles.seeAllText}>عرض الكل</Text>
            </TouchableOpacity>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>ملاعب قريبة منك</Text>
              <MapPin size={18} color="#00875A" />
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stadiumsScroll}
          >
            {nearbyStadiums.length > 0 ? (
              nearbyStadiums.map((stadium) => (
                <View key={stadium.id} style={styles.nearbyStadiumCard}>
                  <View style={styles.stadiumThumbWrap}>
                    <Image source={{ uri: stadium.image }} style={styles.stadiumThumb} />
                    <View style={styles.distanceBadge}>
                      <Text style={styles.distanceText}>{stadium.distance}</Text>
                    </View>
                  </View>

                  <View style={styles.stadiumCardBody}>
                    <Text style={styles.stadiumCardTitle}>{stadium.name}</Text>
                    <View style={styles.stadiumLocationRow}>
                      <Text style={styles.stadiumLocationText}>{stadium.city}</Text>
                      <MapPin size={12} color="#64748B" />
                    </View>

                    <View style={styles.stadiumAvailabilityRow}>
                      <Text style={styles.stadiumAvailabilityText}>أوقات متاحة اليوم</Text>
                      <Clock size={12} color="#00875A" />
                    </View>

                    <TouchableOpacity
                      style={styles.viewTimesBtn}
                      onPress={() => router.push(`/(public)/stadiums/${stadium.id}` as any)}
                      activeOpacity={0.85}
                    >
                      <ChevronLeft size={14} color="#FFFFFF" />
                      <Text style={styles.viewTimesText}>شوف الأوقات</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.emptyNearbyWrap}>
                <Text style={styles.emptyNearbyText}>جاري تحميل الملاعب المتاحة...</Text>
              </View>
            )}
          </ScrollView>
        </View>

        {/* 5. تحديات مفتوحة (Open Challenges) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity
              onPress={() => router.push('/(public)/challenges' as any)}
              style={styles.seeAllBtn}
            >
              <ChevronLeft size={16} color="#00875A" />
              <Text style={styles.seeAllText}>عرض الكل</Text>
            </TouchableOpacity>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>تحديات مفتوحة</Text>
              <Flame size={18} color="#EA580C" />
            </View>
          </View>

          {primaryChallenge ? (
            <View style={styles.challengeCard}>
              <View style={styles.challengeTopBar}>
                <View style={styles.openChallengeBadge}>
                  <Text style={styles.openChallengeBadgeText}>
                    {primaryChallenge.status === 'open' ? 'تحدي مفتوح' : 'مباراة قادمة'}
                  </Text>
                </View>
                <View style={styles.challengeMetaRow}>
                  <Text style={styles.challengeMetaText}>
                    {primaryChallenge.stadium?.name || primaryChallenge.custom_terrain_name || 'ملعب تنغير'}
                  </Text>
                  <MapPin size={12} color="#00875A" />
                </View>
              </View>

              {/* Matchup Details */}
              <View style={styles.challengeMatchupRow}>
                {/* Team 1 (Host) */}
                <View style={styles.teamCol}>
                  {primaryChallenge.host_team?.logo_url ? (
                    <Image
                      source={{ uri: resolveImageUrl(primaryChallenge.host_team.logo_url) || undefined }}
                      style={styles.teamLogoImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.teamShield, { backgroundColor: '#00875A' }]}>
                      <Text style={styles.teamShieldStar}>★</Text>
                    </View>
                  )}
                  <Text style={styles.teamColName}>
                    {primaryChallenge.host_team?.name || 'فريق التحدي'}
                  </Text>
                  <Text style={styles.teamColCity}>
                    {primaryChallenge.host_team?.city || 'تنغير'}
                  </Text>
                </View>

                <View style={styles.vsCircle}>
                  <Text style={styles.vsText}>VS</Text>
                </View>

                {/* Team 2 / Challenger */}
                <View style={styles.teamCol}>
                  {primaryChallenge.opponent_team?.logo_url ? (
                    <Image
                      source={{ uri: resolveImageUrl(primaryChallenge.opponent_team.logo_url) || undefined }}
                      style={styles.teamLogoImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.teamShield, { backgroundColor: '#EF4444' }]}>
                      <Text style={styles.teamShieldStar}>🛡️</Text>
                    </View>
                  )}
                  <Text style={styles.teamColName}>
                    {primaryChallenge.opponent_team?.name || 'في انتظار منافس'}
                  </Text>
                  <Text style={styles.teamColCity}>
                    {primaryChallenge.opponent_team?.city || 'مفتوح للجميع'}
                  </Text>
                </View>
              </View>

              <View style={styles.challengeTimeFooter}>
                <View style={styles.timeTag}>
                  <Text style={styles.timeTagText}>
                    {primaryChallenge.match_datetime
                      ? new Date(primaryChallenge.match_datetime).toLocaleTimeString('ar-MA', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : '18:00'}
                  </Text>
                  <Clock size={12} color="#00875A" />
                </View>
                <View style={styles.timeTag}>
                  <Text style={styles.timeTagText}>
                    {primaryChallenge.match_datetime
                      ? new Date(primaryChallenge.match_datetime).toLocaleDateString('ar-MA', {
                          day: 'numeric',
                          month: 'short',
                        })
                      : 'اليوم'}
                  </Text>
                  <Calendar size={12} color="#00875A" />
                </View>
              </View>

              <TouchableOpacity
                style={styles.acceptChallengeBtn}
                onPress={() => router.push(`/(public)/challenges/${primaryChallenge.id}` as any)}
                activeOpacity={0.88}
              >
                <Flame size={18} color="#FFFFFF" />
                <Text style={styles.acceptChallengeText}>قبول التحدي</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.challengeCard}
              onPress={() => router.push('/(public)/book-match' as any)}
              activeOpacity={0.88}
            >
              <View style={[styles.challengeTopBar, { justifyContent: 'center' }]}>
                <View style={styles.openChallengeBadge}>
                  <Text style={styles.openChallengeBadgeText}>تحدي جديد</Text>
                </View>
              </View>
              <Text style={[styles.teamColName, { textAlign: 'center', marginVertical: 12 }]}>
                لا يوجد تحدي مفتوح حالياً. كن أول من ينشئ تحدياً!
              </Text>
              <View style={styles.acceptChallengeBtn}>
                <Flame size={18} color="#FFFFFF" />
                <Text style={styles.acceptChallengeText}>إنشاء تحدي جديد</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* 6. البطولات الجارية (Ongoing Tournaments) */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity
              onPress={() => router.push('/(public)/tournaments' as any)}
              style={styles.seeAllBtn}
            >
              <ChevronLeft size={16} color="#00875A" />
              <Text style={styles.seeAllText}>عرض الكل</Text>
            </TouchableOpacity>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>البطولات الجارية</Text>
              <Trophy size={18} color="#00875A" />
            </View>
          </View>

          {activeTournament ? (
            <View style={styles.tournamentCard}>
              <View style={styles.tournamentTop}>
                <View style={styles.tournamentTrophyCircle}>
                  <Trophy size={28} color="#F59E0B" />
                </View>
                <View style={styles.tournamentTextCol}>
                  <Text style={styles.tournamentTitle}>{activeTournament.name}</Text>
                  <Text style={styles.tournamentOrganizer}>
                    {activeTournament.location || 'تنغير - الجنوب الشرقي'}
                  </Text>
                  <View style={styles.tournamentInfoRow}>
                    <Text style={styles.tournamentInfoText}>
                      {activeTournament.status === 'in_progress' ? 'جارية حالياً' : 'مفتوحة للتسجيل'}
                    </Text>
                    <Calendar size={12} color="#00875A" />
                    <Text style={[styles.tournamentInfoText, { marginRight: 10 }]}>
                      {activeTournament.teams_count ?? 16} فرق
                    </Text>
                    <Users size={12} color="#00875A" />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.viewTournamentBtn}
                onPress={() => router.push(`/(public)/tournaments/${activeTournament.id}` as any)}
                activeOpacity={0.88}
              >
                <ChevronLeft size={16} color="#FFFFFF" />
                <Text style={styles.viewTournamentText}>شوف البطولة</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.tournamentCard}>
              <Text style={[styles.teamColName, { textAlign: 'center', marginVertical: 10 }]}>
                جاري إطلاق بطولات كروية جديدة قريباً
              </Text>
            </View>
          )}
        </View>

        {/* 7. مباريات ونتائج اليوم (Today's Matches & Results) */}
        <View style={[styles.sectionContainer, { marginBottom: 30 }]}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity
              onPress={() => router.push('/(public)/tournaments' as any)}
              style={styles.seeAllBtn}
            >
              <ChevronLeft size={16} color="#00875A" />
              <Text style={styles.seeAllText}>عرض الكل</Text>
            </TouchableOpacity>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>مباريات ونتائج اليوم</Text>
              <Calendar size={18} color="#00875A" />
            </View>
          </View>

          <View style={styles.todayMatchCard}>
            <View style={styles.todayMatchTournamentPill}>
              <Text style={styles.todayMatchTournamentText}>
                {todayLiveMatch?.tournament_name || activeTournament?.name || 'دوري أجي نقصرو'}
              </Text>
              <Trophy size={12} color="#00875A" />
            </View>

            <View style={styles.todayMatchRow}>
              <Text style={styles.matchTeam}>
                {todayLiveMatch?.home_team?.name || 'جمعية أجيال'}
              </Text>
              <View style={styles.vsChip}>
                <Text style={styles.vsChipText}>
                  {todayLiveMatch?.home_score != null
                    ? `${todayLiveMatch.home_score} - ${todayLiveMatch.away_score ?? 0}`
                    : 'VS'}
                </Text>
              </View>
              <Text style={styles.matchTeam}>
                {todayLiveMatch?.away_team?.name || 'شباب تودغى'}
              </Text>
              <View style={styles.matchTimeBadge}>
                <Text style={styles.matchTimeText}>
                  {todayLiveMatch?.scheduled_at
                    ? new Date(todayLiveMatch.scheduled_at).toLocaleTimeString('ar-MA', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '16:45'}
                </Text>
              </View>
            </View>
          </View>
        </View>

      </ScrollView>

      {/* 8. Bottom Navigation Tab Bar (Public 5 tabs) */}
      <AjiNqssroTabBar mode="public" activeTab="home" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  heroWrap: {
    marginHorizontal: 16,
    marginTop: 10,
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  heroBackground: {
    width: '100%',
    height: 195,
  },
  heroImage: {
    borderRadius: 22,
  },
  heroOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(6, 78, 59, 0.62)',
    padding: 16,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  heroLocationBadge: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
  },
  heroLocationText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  heroTagBadge: {
    backgroundColor: '#00875A',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  heroTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'right',
    lineHeight: 34,
  },
  heroSubtitle: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.92)',
    textAlign: 'right',
  },
  sectionContainer: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 13,
    color: '#00875A',
    fontWeight: '700',
  },
  stadiumsScroll: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  nearbyStadiumCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  stadiumThumbWrap: {
    width: '100%',
    height: 95,
    position: 'relative',
  },
  stadiumThumb: {
    width: '100%',
    height: '100%',
  },
  distanceBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  distanceText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  stadiumCardBody: {
    padding: 8,
    alignItems: 'flex-end',
  },
  stadiumCardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#064E3B',
    textAlign: 'right',
  },
  stadiumLocationRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  stadiumLocationText: {
    fontSize: 11,
    color: '#64748B',
  },
  stadiumAvailabilityRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
    marginTop: 4,
    marginBottom: 8,
  },
  stadiumAvailabilityText: {
    fontSize: 10,
    color: '#00875A',
    fontWeight: '700',
  },
  viewTimesBtn: {
    width: '100%',
    backgroundColor: '#00875A',
    borderRadius: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  viewTimesText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  challengeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  challengeTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  openChallengeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  openChallengeBadgeText: {
    color: '#00875A',
    fontSize: 11,
    fontWeight: '800',
  },
  challengeMetaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  challengeMetaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  challengeMatchupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
  },
  teamCol: {
    alignItems: 'center',
  },
  teamShield: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  teamLogoImg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  teamShieldStar: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  teamColName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  teamColCity: {
    fontSize: 11,
    color: '#94A3B8',
  },
  vsCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#00875A',
  },
  challengeTimeFooter: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 16,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  timeTag: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  timeTagText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  acceptChallengeBtn: {
    marginTop: 12,
    backgroundColor: '#00875A',
    borderRadius: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  acceptChallengeText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  tournamentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tournamentTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  tournamentTrophyCircle: {
    width: 54,
    height: 54,
    borderRadius: 14,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tournamentTextCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  tournamentTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
  },
  tournamentOrganizer: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
    marginTop: 2,
  },
  tournamentInfoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  tournamentInfoText: {
    fontSize: 11,
    color: '#00875A',
    fontWeight: '600',
  },
  viewTournamentBtn: {
    marginTop: 12,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  viewTournamentText: {
    color: '#00875A',
    fontSize: 13,
    fontWeight: '800',
  },
  todayMatchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  todayMatchTournamentPill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  todayMatchTournamentText: {
    fontSize: 11,
    color: '#00875A',
    fontWeight: '700',
  },
  todayMatchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  matchTeam: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  vsChip: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F1F5F9',
  },
  vsChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  matchTimeBadge: {
    backgroundColor: '#00875A',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  matchTimeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  emptyNearbyWrap: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    width: SW - 32,
  },
  emptyNearbyText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
});

