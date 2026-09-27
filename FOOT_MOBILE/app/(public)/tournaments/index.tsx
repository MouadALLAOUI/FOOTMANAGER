import React from 'react';
import {
  Image,
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
  MapPin,
  Shield,
  Trophy,
  Users,
} from 'lucide-react-native';

import { AjiNqssroHeader } from '@/components/ui/AjiNqssroHeader';
import { AjiNqssroTabBar } from '@/components/navigation/AjiNqssroTabBar';
import { usePublicTournaments, useLiveTournamentMatches } from '@/api/publicTournaments';
import { resolveImageUrl } from '@/utils/image';

export default function TournamentsListScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: tournamentsResponse, isLoading } = usePublicTournaments();
  const allTournaments = tournamentsResponse?.data || [];

  const { data: liveMatchesData } = useLiveTournamentMatches();
  const recentResults = liveMatchesData?.data?.live?.length
    ? liveMatchesData.data.live
    : (liveMatchesData?.data?.upcoming?.slice(0, 3) || []);

  const ongoingTournaments = allTournaments
    .filter((t) => t.status === 'in_progress' || t.status === 'active')
    .map((t) => ({
      id: t.id,
      title: t.name,
      location: t.location || 'تنغير',
      dates: t.start_date
        ? `من ${new Date(t.start_date).toLocaleDateString('ar-MA', { day: 'numeric', month: 'short' })} إلى ${t.end_date ? new Date(t.end_date).toLocaleDateString('ar-MA', { day: 'numeric', month: 'short' }) : 'نهاية الشهر'}`
        : 'جارية حالياً',
      teamsCount: t.teams_count ?? 16,
      image:
        resolveImageUrl(t.cover_url || t.logo_url) ||
        'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=600&q=80',
    }));

  const upcomingTournaments = allTournaments
    .filter((t) => t.status !== 'in_progress' && t.status !== 'active')
    .map((t) => ({
      id: t.id,
      title: t.name,
      location: t.location || 'تنغير',
      startDate: t.start_date
        ? `يبدأ في ${new Date(t.start_date).toLocaleDateString('ar-MA', { day: 'numeric', month: 'short' })}`
        : 'يبدأ قريباً',
      teamsCount: t.teams_count ?? 16,
      image:
        resolveImageUrl(t.cover_url || t.logo_url) ||
        'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=600&q=80',
    }));

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* Header */}
      <AjiNqssroHeader showAuthButtons />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Card with Trophy */}
        <View style={styles.heroCard}>
          <View style={styles.trophyIllustrationBox}>
            <Trophy size={48} color="#D97706" />
          </View>
          <View style={styles.heroContent}>
            <Text style={styles.heroTitle}>البطولات</Text>
            <Text style={styles.heroDesc}>
              اكتشف البطولات الجارية والقادمة وسجل في المنافسات الأقرب إليك
            </Text>
          </View>
        </View>

        {/* Section 1: البطولات الجارية */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity style={styles.seeAllBtn}>
              <ChevronLeft size={16} color="#00875A" />
              <Text style={styles.seeAllText}>عرض الكل</Text>
            </TouchableOpacity>
            <View style={styles.sectionTitleGroup}>
              <Text style={styles.sectionTitle}>البطولات الجارية</Text>
              <View style={styles.liveDot} />
            </View>
          </View>

          {ongoingTournaments.map((t) => (
            <View key={t.id} style={styles.tournamentItemCard}>
              <View style={styles.tournamentTopRow}>
                <View style={styles.tournamentThumbWrap}>
                  <Image source={{ uri: t.image }} style={styles.tournamentThumb} />
                  <View style={styles.activePill}>
                    <Text style={styles.activePillText}>جارية</Text>
                    <View style={styles.greenMiniDot} />
                  </View>
                </View>

                <View style={styles.tournamentMeta}>
                  <View style={styles.trophyMiniBadge}>
                    <Trophy size={16} color="#00875A" />
                  </View>
                  <Text style={styles.tournamentItemTitle}>{t.title}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{t.location}</Text>
                    <MapPin size={12} color="#00875A" />
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{t.dates}</Text>
                    <Calendar size={12} color="#00875A" />
                    <Text style={[styles.metaText, { marginRight: 8 }]}>
                      {t.teamsCount} فريق
                    </Text>
                    <Users size={12} color="#00875A" />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.viewTournamentBtn}
                onPress={() => router.push(`/(public)/tournaments/${t.id}` as any)}
                activeOpacity={0.88}
              >
                <ChevronLeft size={16} color="#FFFFFF" />
                <Text style={styles.viewTournamentBtnText}>شوف البطولة</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Section 2: بطولات قادمة */}
        <View style={styles.sectionWrap}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity style={styles.seeAllBtn}>
              <ChevronLeft size={16} color="#00875A" />
              <Text style={styles.seeAllText}>عرض الكل</Text>
            </TouchableOpacity>
            <View style={styles.sectionTitleGroup}>
              <Text style={styles.sectionTitle}>بطولات قادمة</Text>
              <Calendar size={18} color="#00875A" />
            </View>
          </View>

          {upcomingTournaments.map((t) => (
            <View key={t.id} style={styles.tournamentItemCard}>
              <View style={styles.tournamentTopRow}>
                <View style={styles.tournamentThumbWrap}>
                  <Image source={{ uri: t.image }} style={styles.tournamentThumb} />
                  <View style={styles.upcomingPill}>
                    <Text style={styles.upcomingPillText}>قادمة</Text>
                  </View>
                </View>

                <View style={styles.tournamentMeta}>
                  <View style={styles.trophyMiniBadge}>
                    <Trophy size={16} color="#0284C7" />
                  </View>
                  <Text style={styles.tournamentItemTitle}>{t.title}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{t.location}</Text>
                    <MapPin size={12} color="#00875A" />
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{t.startDate}</Text>
                    <Calendar size={12} color="#00875A" />
                    <Text style={[styles.metaText, { marginRight: 8 }]}>
                      {t.teamsCount} فريق
                    </Text>
                    <Users size={12} color="#00875A" />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.upcomingDetailsBtn}
                onPress={() => router.push(`/(public)/tournaments/${t.id}` as any)}
                activeOpacity={0.88}
              >
                <ChevronLeft size={16} color="#00875A" />
                <Text style={styles.upcomingDetailsBtnText}>التفاصيل</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Section 3: آخر النتائج */}
        <View style={[styles.sectionWrap, { marginBottom: 30 }]}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity
              style={styles.seeAllBtn}
              onPress={() => {
                const targetTournamentId = ongoingTournaments[0]?.id || upcomingTournaments[0]?.id || 1;
                router.push(`/(public)/tournaments/${targetTournamentId}/matches` as any);
              }}
            >
              <ChevronLeft size={16} color="#00875A" />
              <Text style={styles.seeAllText}>عرض الكل</Text>
            </TouchableOpacity>
            <View style={styles.sectionTitleGroup}>
              <Text style={styles.sectionTitle}>آخر النتائج</Text>
              <Trophy size={18} color="#00875A" />
            </View>
          </View>

          {recentResults.length > 0 ? (
            recentResults.map((m, idx) => {
              const targetTournamentId = ongoingTournaments[0]?.id || upcomingTournaments[0]?.id || 1;
              return (
                <TouchableOpacity
                  key={m.id || idx}
                  style={styles.resultCard}
                  onPress={() => router.push(`/(public)/tournaments/${targetTournamentId}/match/${m.id}` as any)}
                  activeOpacity={0.88}
                >
                  <View style={styles.resultTopBar}>
                    <View style={[styles.roundBadge, m.status === 'live' && { backgroundColor: '#DCFCE7' }]}>
                      <Text style={[styles.roundBadgeText, m.status === 'live' && { color: '#00875A' }]}>
                        {m.status === 'live' ? 'مباشر' : 'مباراة'}
                      </Text>
                    </View>
                    <Text style={styles.resultTournamentTitle}>{m.tournament_name || 'البطولة'}</Text>
                    <Text style={styles.resultDate}>
                      {m.scheduled_at
                        ? new Date(m.scheduled_at).toLocaleDateString('ar-MA', {
                            day: 'numeric',
                            month: 'short',
                          })
                        : 'قريباً'}
                    </Text>
                  </View>

                  <View style={styles.resultTeamsRow}>
                    {/* Team A */}
                    <View style={styles.resultTeamCol}>
                      {m.home_team?.logo_url ? (
                        <Image
                          source={{ uri: resolveImageUrl(m.home_team.logo_url) || undefined }}
                          style={styles.teamResultLogo}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.shieldBox, { backgroundColor: '#00875A' }]}>
                          <Shield size={18} color="#FFFFFF" />
                        </View>
                      )}
                      <Text style={styles.resultTeamName}>{m.home_team?.name || 'الفريق الأول'}</Text>
                    </View>

                    {/* Score Box */}
                    <View style={styles.scorePill}>
                      <Text style={styles.scoreText}>
                        {m.home_score !== null && m.home_score !== undefined && m.away_score !== null && m.away_score !== undefined
                          ? `${m.home_score} - ${m.away_score}`
                          : 'VS'}
                      </Text>
                    </View>

                    {/* Team B */}
                    <View style={styles.resultTeamCol}>
                      {m.away_team?.logo_url ? (
                        <Image
                          source={{ uri: resolveImageUrl(m.away_team.logo_url) || undefined }}
                          style={styles.teamResultLogo}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.shieldBox, { backgroundColor: '#EF4444' }]}>
                          <Shield size={18} color="#FFFFFF" />
                        </View>
                      )}
                      <Text style={styles.resultTeamName}>{m.away_team?.name || 'الفريق الثاني'}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyResultsCard}>
              <Trophy size={32} color="#CBD5E1" />
              <Text style={styles.emptyResultsText}>لا توجد نتائج أو مباريات مسجلة حالياً</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Tab Bar */}
      <AjiNqssroTabBar mode="public" activeTab="tournaments" />
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
  heroCard: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  trophyIllustrationBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#064E3B',
    textAlign: 'right',
  },
  heroDesc: {
    fontSize: 12,
    color: '#00875A',
    fontWeight: '600',
    textAlign: 'right',
    marginTop: 4,
    lineHeight: 16,
  },
  sectionWrap: {
    marginTop: 18,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00875A',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 12,
    color: '#00875A',
    fontWeight: '700',
  },
  tournamentItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  tournamentTopRow: {
    flexDirection: 'row-reverse',
    gap: 12,
  },
  tournamentThumbWrap: {
    width: 110,
    height: 90,
    borderRadius: 14,
    overflow: 'hidden',
    position: 'relative',
  },
  tournamentThumb: {
    width: '100%',
    height: '100%',
  },
  activePill: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#00875A',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activePillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  greenMiniDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#86EFAC',
  },
  upcomingPill: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  upcomingPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  tournamentMeta: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 3,
  },
  trophyMiniBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tournamentItemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  metaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  viewTournamentBtn: {
    backgroundColor: '#00875A',
    borderRadius: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  viewTournamentBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  upcomingDetailsBtn: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  upcomingDetailsBtnText: {
    color: '#00875A',
    fontSize: 13,
    fontWeight: '800',
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  resultTopBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  roundBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roundBadgeText: {
    color: '#00875A',
    fontSize: 11,
    fontWeight: '800',
  },
  resultTournamentTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  resultDate: {
    fontSize: 11,
    color: '#94A3B8',
  },
  resultTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  resultTeamCol: {
    alignItems: 'center',
    gap: 6,
  },
  shieldBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultTeamName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  scorePill: {
    backgroundColor: '#00875A',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
  },
  scoreText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },
  teamResultLogo: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyResultsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingVertical: 32,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyResultsText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },
});
