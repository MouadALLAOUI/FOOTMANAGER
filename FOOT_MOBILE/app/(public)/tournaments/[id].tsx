import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Calendar,
  ChevronLeft,
  Clock,
  Layers,
  MapPin,
  Shield,
  Trophy,
  Users,
} from 'lucide-react-native';

import { AjiNqssroHeader } from '@/components/ui/AjiNqssroHeader';
import {
  useTournamentDetail,
  useTournamentFixtures,
  useTournamentStandings,
  useTournamentTeams,
} from '@/api/publicTournaments';
import { resolveImageUrl } from '@/utils/image';

export default function TournamentDetailScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<'matches' | 'standings' | 'teams' | 'results'>('matches');

  const { data: detailResponse, isLoading: isDetailLoading } = useTournamentDetail(params.id);
  const tournament = detailResponse?.data;

  const { data: fixturesResponse, isLoading: isFixturesLoading } = useTournamentFixtures(params.id);
  const fixtures = fixturesResponse?.data || [];

  const { data: standingsResponse, isLoading: isStandingsLoading } = useTournamentStandings(params.id);
  const standingsGroups = standingsResponse?.data?.groups || [];

  const { data: teamsResponse, isLoading: isTeamsLoading } = useTournamentTeams(params.id);
  const tournamentTeams = teamsResponse?.data || [];

  // Categorize fixtures into upcoming vs finished
  const upcomingMatches = fixtures.filter((f) => {
    const isFinished =
      f.status === 'finished' ||
      f.status === 'completed' ||
      f.match?.status === 'finished' ||
      (f.match?.home_score !== null && f.match?.home_score !== undefined && f.match?.away_score !== null && f.match?.away_score !== undefined);
    return !isFinished;
  });

  const finishedMatches = fixtures.filter((f) => {
    const isFinished =
      f.status === 'finished' ||
      f.status === 'completed' ||
      f.match?.status === 'finished' ||
      (f.match?.home_score !== null && f.match?.home_score !== undefined && f.match?.away_score !== null && f.match?.away_score !== undefined);
    return isFinished;
  });

  const colors = ['#00875A', '#EF4444', '#0284C7', '#D97706', '#059669', '#7C3AED'];

  const tournamentTitle = tournament?.name || (isDetailLoading ? 'جاري التحميل...' : 'بطولة كرة القدم');
  const tournamentSubtitle = [tournament?.category, tournament?.edition].filter(Boolean).join(' - ') || 'بطولة محلية';
  const locationText = [tournament?.location, tournament?.stadium?.name].filter(Boolean).join(' - ') || 'تنغير - الجنوب الشرقي';
  const datesText = tournament?.start_date
    ? `من ${new Date(tournament.start_date).toLocaleDateString('ar-MA', { day: 'numeric', month: 'short' })} إلى ${tournament.end_date ? new Date(tournament.end_date).toLocaleDateString('ar-MA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'نهاية الشهر'}`
    : 'مواعيد البطولة تعلن قريباً';
  const teamsCountText = `${tournament?.teams_count ?? tournamentTeams.length} فريق`;
  const formatText = tournament?.tournament_format || 'نظام المجموعات';
  const coverImage =
    resolveImageUrl(tournament?.cover_url || tournament?.logo_url) ||
    'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=1000&q=80';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <AjiNqssroHeader showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Tournament Hero Cover */}
        <View style={styles.heroWrap}>
          <Image
            source={{ uri: coverImage }}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <View style={styles.livePill}>
            <Text style={styles.livePillText}>
              {tournament?.status === 'in_progress' ? 'جارية' : 'مفتوحة'}
            </Text>
            <View style={styles.liveDot} />
          </View>

          <View style={styles.trophyEmblemBadge}>
            <Trophy size={30} color="#F59E0B" />
          </View>
        </View>

        {/* Title & Metadata Card */}
        <View style={styles.titleCard}>
          <Text style={styles.tournamentTitle}>{tournamentTitle}</Text>
          <Text style={styles.tournamentSubtitle}>{tournamentSubtitle}</Text>

          {/* Location & Dates */}
          <View style={styles.metaRowWrap}>
            <View style={styles.metaItem}>
              <Text style={styles.metaItemText}>{locationText}</Text>
              <MapPin size={13} color="#00875A" />
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaItemText}>{datesText}</Text>
              <Calendar size={13} color="#00875A" />
            </View>
          </View>

          {/* Format & Teams */}
          <View style={styles.metaRowWrap}>
            <View style={styles.metaItem}>
              <Text style={styles.metaItemText}>{teamsCountText}</Text>
              <Users size={13} color="#00875A" />
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaItemText}>{formatText}</Text>
              <Layers size={13} color="#00875A" />
            </View>
          </View>

          {/* Info Card: Registration fee & rules */}
          <View style={styles.prizeCard}>
            <View style={styles.prizeTexts}>
              <Text style={styles.prizeTitle}>رسوم التسجيل والقوانين</Text>
              <Text style={styles.prizeDesc}>
                {tournament?.registration_fee ? `${tournament.registration_fee} درهم / فريق` : 'مشاركة مجانية'}
                {tournament?.rules ? ` • ${tournament.rules}` : ''}
              </Text>
            </View>
            <View style={styles.prizeIconBox}>
              <Trophy size={20} color="#00875A" />
            </View>
          </View>
        </View>

        {/* Sub-Tabs: المباريات / الترتيب / الفرق / النتائج */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'results' && styles.tabButtonActive]}
            onPress={() => setActiveTab('results')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'results' && styles.tabButtonTextActive]}>
              النتائج
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'standings' && styles.tabButtonActive]}
            onPress={() => setActiveTab('standings')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'standings' && styles.tabButtonTextActive]}>
              الترتيب
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'teams' && styles.tabButtonActive]}
            onPress={() => setActiveTab('teams')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'teams' && styles.tabButtonTextActive]}>
              الفرق ({tournamentTeams.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabButton, activeTab === 'matches' && styles.tabButtonActive]}
            onPress={() => setActiveTab('matches')}
          >
            <Text style={[styles.tabButtonText, activeTab === 'matches' && styles.tabButtonTextActive]}>
              المباريات
            </Text>
          </TouchableOpacity>
        </View>

        {/* ─── TAB 1: المباريات (Upcoming Matches - Mockup 2) ─── */}
        {activeTab === 'matches' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionHeaderRow}>
              <TouchableOpacity
                style={styles.seeAllInlineBtn}
                onPress={() => router.push(`/(public)/tournaments/${params.id}/matches` as any)}
                activeOpacity={0.8}
              >
                <ChevronLeft size={16} color="#00875A" />
                <Text style={styles.seeAllInlineText}>عرض الكل</Text>
              </TouchableOpacity>

              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>المباريات القادمة</Text>
                <Calendar size={18} color="#00875A" />
              </View>
            </View>

            {isFixturesLoading ? (
              <ActivityIndicator color="#00875A" style={{ marginTop: 20 }} />
            ) : upcomingMatches.length > 0 ? (
              upcomingMatches.map((m, idx) => {
                const dt = m.scheduled_at ? new Date(m.scheduled_at) : null;
                const dateStr = dt
                  ? dt.toLocaleDateString('ar-MA', { weekday: 'long', day: 'numeric', month: 'short' })
                  : 'قريباً';
                const timeStr = dt
                  ? dt.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })
                  : '17:00';
                const matchId = m.match?.id || m.id;

                return (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.matchScheduleCard}
                    onPress={() => router.push(`/(public)/tournaments/${params.id}/match/${matchId}` as any)}
                    activeOpacity={0.88}
                  >
                    <View style={styles.groupPill}>
                      <Text style={styles.groupPillText}>
                        {m.round_name || m.group_name || 'المجموعة 1'}
                      </Text>
                    </View>

                    <View style={styles.matchScheduleRow}>
                      <ChevronLeft size={16} color="#00875A" />

                      {/* Team A */}
                      <View style={styles.teamSide}>
                        {m.home_team?.logo_url ? (
                          <Image
                            source={{ uri: resolveImageUrl(m.home_team.logo_url) || undefined }}
                            style={styles.teamLogoImg}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.shieldBox, { backgroundColor: colors[(idx * 2) % colors.length] }]}>
                            <Shield size={16} color="#FFFFFF" />
                          </View>
                        )}
                        <Text style={styles.teamNameText} numberOfLines={1}>
                          {m.home_team?.name || 'فريق 1'}
                        </Text>
                      </View>

                      {/* Match Timing */}
                      <View style={styles.matchTimeCenter}>
                        <Text style={styles.matchDateText}>{dateStr}</Text>
                        <View style={styles.timeClockRow}>
                          <Text style={styles.timeClockText}>{timeStr}</Text>
                          <Clock size={12} color="#00875A" />
                        </View>
                        <Text style={styles.matchDash}>-</Text>
                      </View>

                      {/* Team B */}
                      <View style={styles.teamSide}>
                        {m.away_team?.logo_url ? (
                          <Image
                            source={{ uri: resolveImageUrl(m.away_team.logo_url) || undefined }}
                            style={styles.teamLogoImg}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.shieldBox, { backgroundColor: colors[(idx * 2 + 1) % colors.length] }]}>
                            <Shield size={16} color="#FFFFFF" />
                          </View>
                        )}
                        <Text style={styles.teamNameText} numberOfLines={1}>
                          {m.away_team?.name || 'فريق 2'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyTabCard}>
                <Calendar size={32} color="#CBD5E1" />
                <Text style={styles.emptyTabText}>لا توجد مباريات قادمة مبرمجة حالياً</Text>
              </View>
            )}

            {/* Bottom Sticky Link Button (Mockup 2) */}
            <TouchableOpacity
              style={styles.fullScheduleBannerBtn}
              onPress={() => router.push(`/(public)/tournaments/${params.id}/matches` as any)}
              activeOpacity={0.88}
            >
              <ChevronLeft size={16} color="#00875A" />
              <View style={styles.fullScheduleBannerContent}>
                <Text style={styles.fullScheduleBannerText}>
                  تصفح جميع المباريات والنتائج والجدول الكامل للبطولة
                </Text>
                <Trophy size={16} color="#00875A" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── TAB 2: الترتيب (Standings - Mockup 3) ─── */}
        {activeTab === 'standings' && (
          <View style={styles.tabSection}>
            {/* Header with Group dropdown */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.groupDropdownPill}>
                <Text style={styles.groupDropdownPillText}>المجموعة 1</Text>
              </View>

              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>ترتيب المجموعة 1</Text>
                <Users size={18} color="#00875A" />
              </View>
            </View>

            {isStandingsLoading ? (
              <ActivityIndicator color="#00875A" style={{ marginTop: 20 }} />
            ) : standingsGroups.length > 0 ? (
              standingsGroups.map((group, gIdx) => (
                <View key={group.group_id || gIdx} style={styles.groupTableCard}>
                  {/* Table Column Headers (Mockup 3) */}
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.colHeader, styles.colRank]}>#</Text>
                    <Text style={[styles.colHeader, styles.colTeam]}>الفريق</Text>
                    <Text style={[styles.colHeader, styles.colStat]}>لعب</Text>
                    <Text style={[styles.colHeader, styles.colStat]}>فاز</Text>
                    <Text style={[styles.colHeader, styles.colStat]}>تعادل</Text>
                    <Text style={[styles.colHeader, styles.colStat]}>خسر</Text>
                    <Text style={[styles.colHeader, styles.colPoints]}>النقاط</Text>
                  </View>

                  {/* Rows */}
                  {group.rows?.map((row, rIdx) => {
                    const isFirst = rIdx === 0;

                    return (
                      <TouchableOpacity
                        key={row.team_id || rIdx}
                        style={[styles.tableRow, rIdx % 2 === 1 && styles.tableRowEven]}
                        onPress={() => router.push(`/(public)/tournaments/${params.id}/team/${row.team_id}` as any)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.rankPillBox, isFirst && styles.rankPillFirst]}>
                          <Text style={[styles.rankPillText, isFirst && styles.rankPillTextFirst]}>
                            {rIdx + 1}
                          </Text>
                        </View>

                        <View style={[styles.colTeamRow, styles.colTeam]}>
                          {row.team?.logo_url ? (
                            <Image
                              source={{ uri: resolveImageUrl(row.team.logo_url) || undefined }}
                              style={styles.standingTeamLogo}
                              resizeMode="cover"
                            />
                          ) : (
                            <View style={styles.standingTeamShield}>
                              <Shield size={12} color="#FFFFFF" />
                            </View>
                          )}
                          <Text style={styles.standingTeamName} numberOfLines={1}>
                            {row.team?.name || `فريق ${row.team_id}`}
                          </Text>
                        </View>

                        <Text style={[styles.colData, styles.colStat]}>{row.played}</Text>
                        <Text style={[styles.colData, styles.colStat]}>{row.wins}</Text>
                        <Text style={[styles.colData, styles.colStat]}>{row.draws}</Text>
                        <Text style={[styles.colData, styles.colStat]}>{row.losses}</Text>
                        <View style={[styles.pointsBadgeBox, isFirst && styles.pointsBadgeBoxFirst]}>
                          <Text style={[styles.pointsBadgeText, isFirst && styles.pointsBadgeTextFirst]}>
                            {row.points}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))
            ) : (
              <View style={styles.emptyTabCard}>
                <Trophy size={32} color="#CBD5E1" />
                <Text style={styles.emptyTabText}>لم يتم تحديد جدول الترتيب لهذه البطولة بعد</Text>
              </View>
            )}

            {/* Below Standings: آخر المباريات (Mockup 3) */}
            <View style={styles.standingsRecentSection}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>آخر المباريات</Text>
                <Clock size={18} color="#00875A" />
              </View>

              {finishedMatches.slice(0, 3).map((m) => {
                const dt = m.scheduled_at ? new Date(m.scheduled_at) : null;
                const dateStr = dt
                  ? dt.toLocaleDateString('ar-MA', { day: 'numeric', month: 'short' })
                  : '12 شتنبر 2026';
                const homeScore = m.match?.home_score ?? m.home_score ?? 2;
                const awayScore = m.match?.away_score ?? m.away_score ?? 1;
                const matchId = m.match?.id || m.id;

                return (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.standingsRecentMatchCard}
                    onPress={() => router.push(`/(public)/tournaments/${params.id}/match/${matchId}` as any)}
                    activeOpacity={0.88}
                  >
                    <View style={styles.recentMatchTopBar}>
                      <View style={styles.recentRoundBadge}>
                        <Text style={styles.recentRoundBadgeText}>
                          {m.round_name || 'الجولة 3'}
                        </Text>
                      </View>
                      <Text style={styles.recentMatchDateText}>{dateStr}</Text>
                    </View>

                    <View style={styles.recentMatchContentRow}>
                      <Text style={styles.recentTeamName}>{m.home_team?.name || 'فريق 1'}</Text>
                      <View style={styles.recentScorePill}>
                        <Text style={styles.recentScorePillText}>{homeScore} - {awayScore}</Text>
                      </View>
                      <Text style={styles.recentTeamName}>{m.away_team?.name || 'فريق 2'}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={styles.viewAllMatchesInlineBtn}
                onPress={() => router.push(`/(public)/tournaments/${params.id}/matches` as any)}
                activeOpacity={0.88}
              >
                <ChevronLeft size={16} color="#00875A" />
                <Text style={styles.viewAllMatchesInlineText}>عرض جميع المباريات</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ─── TAB 3: الفرق (Teams - Mockup 5) ─── */}
        {activeTab === 'teams' && (
          <View style={styles.tabSection}>
            {/* Header with Group dropdown */}
            <View style={styles.sectionHeaderRow}>
              <View style={styles.groupDropdownPill}>
                <Text style={styles.groupDropdownPillText}>المجموعة 1</Text>
              </View>

              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitle}>فرق المجموعة 1</Text>
                <Users size={18} color="#00875A" />
              </View>
            </View>

            {isTeamsLoading ? (
              <ActivityIndicator color="#00875A" style={{ marginTop: 20 }} />
            ) : tournamentTeams.length > 0 ? (
              <View style={styles.teamsListColumn}>
                {tournamentTeams.map((tt, idx) => {
                  const teamId = tt.team_id || tt.id;
                  const teamName = tt.team?.name || 'فريق مسجل';
                  const logoUri = resolveImageUrl(tt.team?.logo_url);
                  const rankNum = idx + 1;
                  const pts = Math.max(7 - idx * 2, 1);

                  return (
                    <TouchableOpacity
                      key={tt.id}
                      style={styles.teamRowCard}
                      onPress={() => router.push(`/(public)/tournaments/${params.id}/team/${teamId}` as any)}
                      activeOpacity={0.88}
                    >
                      <ChevronLeft size={16} color="#94A3B8" />

                      <View style={styles.teamPointsPill}>
                        <Text style={styles.teamPointsPillText}>{pts} نقاط</Text>
                      </View>

                      <View style={styles.teamRowInfo}>
                        <Text style={styles.teamRowName}>{teamName}</Text>
                        <View style={styles.teamPlayersCountRow}>
                          <Text style={styles.teamPlayersCountText}>16 لاعب</Text>
                          <Users size={12} color="#64748B" />
                        </View>
                      </View>

                      {logoUri ? (
                        <Image source={{ uri: logoUri }} style={styles.teamRowLogo} resizeMode="cover" />
                      ) : (
                        <View style={styles.teamRowShield}>
                          <Shield size={20} color="#FFFFFF" />
                        </View>
                      )}

                      <View style={styles.teamRankCircle}>
                        <Text style={styles.teamRankCircleText}>{rankNum}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={styles.emptyTabCard}>
                <Users size={32} color="#CBD5E1" />
                <Text style={styles.emptyTabText}>لا توجد فرق مسجلة في البطولة بعد</Text>
              </View>
            )}

            {/* Tip card at bottom (Mockup 5) */}
            <View style={styles.teamTipCard}>
              <Text style={styles.teamTipText}>
                اضغط على أي فريق لعرض تفاصيله واللاعبين وإحصائياته
              </Text>
              <Text style={styles.teamTipIcon}>💡</Text>
            </View>
          </View>
        )}

        {/* ─── TAB 4: النتائج (Finished Matches) ─── */}
        {activeTab === 'results' && (
          <View style={styles.tabSection}>
            <View style={styles.sectionTitleRow}>
              <Text style={styles.sectionTitle}>نتائج المباريات</Text>
              <Trophy size={18} color="#00875A" />
            </View>

            {isFixturesLoading ? (
              <ActivityIndicator color="#00875A" style={{ marginTop: 20 }} />
            ) : finishedMatches.length > 0 ? (
              finishedMatches.map((m) => {
                const dt = m.scheduled_at ? new Date(m.scheduled_at) : null;
                const dateStr = dt
                  ? dt.toLocaleDateString('ar-MA', { day: 'numeric', month: 'short' })
                  : 'مكتملة';
                const homeScore = m.match?.home_score ?? m.home_score ?? 0;
                const awayScore = m.match?.away_score ?? m.away_score ?? 0;
                const matchId = m.match?.id || m.id;

                return (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.resultItemCard}
                    onPress={() => router.push(`/(public)/tournaments/${params.id}/match/${matchId}` as any)}
                    activeOpacity={0.88}
                  >
                    <View style={styles.resultItemHeader}>
                      <View style={styles.completedBadge}>
                        <Text style={styles.completedBadgeText}>انتهت</Text>
                      </View>
                      <Text style={styles.resultRoundText}>
                        {m.round_name || m.group_name || 'مباراة دورية'}
                      </Text>
                      <Text style={styles.resultDateText}>{dateStr}</Text>
                    </View>

                    <View style={styles.resultMatchupRow}>
                      {/* Team A */}
                      <View style={styles.resultTeamSide}>
                        {m.home_team?.logo_url ? (
                          <Image
                            source={{ uri: resolveImageUrl(m.home_team.logo_url) || undefined }}
                            style={styles.teamLogoImg}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.shieldBox, { backgroundColor: '#00875A' }]}>
                            <Shield size={16} color="#FFFFFF" />
                          </View>
                        )}
                        <Text style={styles.teamNameText} numberOfLines={1}>
                          {m.home_team?.name || 'فريق 1'}
                        </Text>
                      </View>

                      {/* Score Box */}
                      <View style={styles.scoreContainer}>
                        <Text style={styles.scoreNumberText}>
                          {homeScore} - {awayScore}
                        </Text>
                      </View>

                      {/* Team B */}
                      <View style={styles.resultTeamSide}>
                        {m.away_team?.logo_url ? (
                          <Image
                            source={{ uri: resolveImageUrl(m.away_team.logo_url) || undefined }}
                            style={styles.teamLogoImg}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.shieldBox, { backgroundColor: '#EF4444' }]}>
                            <Shield size={16} color="#FFFFFF" />
                          </View>
                        )}
                        <Text style={styles.teamNameText} numberOfLines={1}>
                          {m.away_team?.name || 'فريق 2'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyTabCard}>
                <Trophy size={32} color="#CBD5E1" />
                <Text style={styles.emptyTabText}>لم تكتمل أي مباراة في البطولة بعد</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 40,
  },
  heroWrap: {
    width: '100%',
    height: 180,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  livePill: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: '#00875A',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  livePillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4ADE80',
  },
  trophyEmblemBadge: {
    position: 'absolute',
    bottom: -20,
    left: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 2,
    borderColor: '#FEF3C7',
  },
  titleCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginTop: 26,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tournamentTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'right',
  },
  tournamentSubtitle: {
    fontSize: 12,
    color: '#00875A',
    fontWeight: '700',
    textAlign: 'right',
    marginTop: 2,
  },
  metaRowWrap: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  metaItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
  },
  metaItemText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  prizeCard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 14,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
  },
  prizeTexts: {
    alignItems: 'flex-end',
    flex: 1,
  },
  prizeTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00875A',
  },
  prizeDesc: {
    fontSize: 11,
    color: '#064E3B',
    marginTop: 1,
    textAlign: 'right',
  },
  prizeIconBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabsRow: {
    flexDirection: 'row-reverse',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 6,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#00875A',
    borderColor: '#00875A',
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  tabSection: {
    marginHorizontal: 16,
    marginTop: 18,
  },
  sectionTitleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  matchScheduleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  groupPill: {
    alignSelf: 'flex-end',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  groupPillText: {
    fontSize: 10,
    color: '#00875A',
    fontWeight: '700',
  },
  matchScheduleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamSide: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  shieldBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLogoImg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  teamNameText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    textAlign: 'right',
  },
  matchTimeCenter: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  matchDateText: {
    fontSize: 10,
    color: '#94A3B8',
    marginBottom: 2,
  },
  timeClockRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 3,
  },
  timeClockText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00875A',
  },
  groupTableCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    marginBottom: 14,
  },
  groupTableHeader: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  groupTableTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00875A',
    textAlign: 'right',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  colHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  tableRowEven: {
    backgroundColor: '#FAFAFA',
  },
  colData: {
    fontSize: 12,
    color: '#334155',
    textAlign: 'center',
  },
  colRank: {
    width: 24,
    fontWeight: '700',
  },
  topRank: {
    color: '#00875A',
    fontWeight: '900',
  },
  colTeam: {
    flex: 1,
  },
  colTeamRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingRight: 6,
  },
  standingTeamLogo: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  standingTeamShield: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  standingTeamName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
    textAlign: 'right',
  },
  colStat: {
    width: 26,
  },
  colPoints: {
    width: 32,
    fontWeight: '800',
  },
  pointsText: {
    color: '#00875A',
    fontWeight: '900',
  },
  teamsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  teamGridCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  teamGridLogo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  teamGridShield: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamGridName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  teamGridCity: {
    fontSize: 11,
    color: '#64748B',
  },
  resultItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
  },
  resultItemHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    marginBottom: 8,
  },
  completedBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  completedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  resultRoundText: {
    fontSize: 11,
    color: '#00875A',
    fontWeight: '700',
  },
  resultDateText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  resultMatchupRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  resultTeamSide: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  scoreContainer: {
    backgroundColor: '#00875A',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 10,
  },
  scoreNumberText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 2,
  },
  emptyTabCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderStyle: 'dashed',
    paddingVertical: 36,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  emptyTabText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  seeAllInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllInlineText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00875A',
  },
  matchDash: {
    fontSize: 14,
    fontWeight: '800',
    color: '#94A3B8',
    marginTop: 2,
  },
  fullScheduleBannerBtn: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 16,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  fullScheduleBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    justifyContent: 'flex-end',
  },
  fullScheduleBannerText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00875A',
    textAlign: 'right',
  },
  groupDropdownPill: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  groupDropdownPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#064E3B',
  },
  rankPillBox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  rankPillFirst: {
    backgroundColor: '#00875A',
  },
  rankPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  rankPillTextFirst: {
    color: '#FFFFFF',
  },
  pointsBadgeBox: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsBadgeBoxFirst: {
    backgroundColor: '#DCFCE7',
  },
  pointsBadgeText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#0F172A',
  },
  pointsBadgeTextFirst: {
    color: '#00875A',
  },
  standingsRecentSection: {
    marginTop: 20,
  },
  standingsRecentMatchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 8,
  },
  recentMatchTopBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recentRoundBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  recentRoundBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00875A',
  },
  recentMatchDateText: {
    fontSize: 10,
    color: '#94A3B8',
  },
  recentMatchContentRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentTeamName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    textAlign: 'center',
  },
  recentScorePill: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    marginHorizontal: 8,
  },
  recentScorePillText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#00875A',
  },
  viewAllMatchesInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 10,
    marginTop: 6,
  },
  viewAllMatchesInlineText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00875A',
  },
  teamsListColumn: {
    gap: 8,
  },
  teamRowCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamPointsPill: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  teamPointsPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00875A',
  },
  teamRowInfo: {
    flex: 1,
    alignItems: 'flex-end',
    marginRight: 10,
  },
  teamRowName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 2,
  },
  teamPlayersCountRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  teamPlayersCountText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  teamRowLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: 10,
  },
  teamRowShield: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  teamRankCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamRankCircleText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748B',
  },
  teamTipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginTop: 14,
  },
  teamTipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00875A',
    textAlign: 'center',
  },
  teamTipIcon: {
    fontSize: 16,
  },
});

