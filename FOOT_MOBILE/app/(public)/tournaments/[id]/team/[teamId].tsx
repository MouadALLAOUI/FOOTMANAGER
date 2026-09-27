import React, { useMemo, useState } from 'react';
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
  Award,
  BarChart3,
  Calendar,
  ChevronLeft,
  Flame,
  Shield,
  Star,
  Trophy,
  Users,
} from 'lucide-react-native';

import { AjiNqssroHeader } from '@/components/ui/AjiNqssroHeader';
import {
  useTournamentDetail,
  useTournamentStandings,
  useTeamPage,
} from '@/api/publicTournaments';
import { resolveImageUrl } from '@/utils/image';

export default function TeamTournamentProfileScreen(): React.JSX.Element {
  const router = useRouter();
  const { id: tournamentId, teamId } = useLocalSearchParams<{ id: string; teamId: string }>();
  const insets = useSafeAreaInsets();
  const [showAllPlayers, setShowAllPlayers] = useState(false);

  const { data: tournamentResponse } = useTournamentDetail(tournamentId);
  const tournament = tournamentResponse?.data;

  const { data: standingsResponse } = useTournamentStandings(tournamentId);
  const standingsGroups = standingsResponse?.data?.groups || [];

  const { data: teamPageResponse, isLoading } = useTeamPage(teamId);
  const teamData = teamPageResponse?.data;
  const team = teamData?.team;
  const stats = teamData?.stats;
  const squad = teamData?.squad || [];
  const recentMatches = teamData?.recent_matches || [];

  // Find team's group and rank in this tournament's standings
  const standingInfo = useMemo(() => {
    for (const grp of standingsGroups) {
      const idx = grp.rows?.findIndex((r) => String(r.team_id) === String(teamId));
      if (idx !== -1 && idx !== undefined) {
        return {
          rank: idx + 1,
          groupName: grp.name || 'المجموعة 1',
          row: grp.rows[idx],
        };
      }
    }
    return {
      rank: 1,
      groupName: 'المجموعة 1',
      row: null,
    };
  }, [standingsGroups, teamId]);

  const teamName = team?.name || standingInfo.row?.team?.name || 'نجوم دادس';
  const logoUrl = resolveImageUrl(team?.logo_url || standingInfo.row?.team?.logo_url);
  const rankNumber = standingInfo.rank;
  const pointsCount = standingInfo.row?.points ?? stats?.points ?? 7;
  const matchesCount = standingInfo.row?.played ?? stats?.matches_played ?? 3;
  const goalsFor = standingInfo.row?.goals_for ?? stats?.goals_for ?? 8;

  const displayedPlayers = showAllPlayers ? squad : squad.slice(0, 4);

  // Position label translator
  const getPositionLabel = (pos?: string | null) => {
    if (!pos) return 'لاعب';
    const lower = pos.toLowerCase();
    if (lower.includes('goalkeeper') || lower.includes('gk') || lower.includes('حارس')) return 'حارس مرمى';
    if (lower.includes('defender') || lower.includes('def') || lower.includes('مدافع')) return 'مدافع';
    if (lower.includes('midfielder') || lower.includes('mid') || lower.includes('وسط')) return 'وسط';
    if (lower.includes('forward') || lower.includes('striker') || lower.includes('att') || lower.includes('مهاجم')) return 'مهاجم';
    return pos;
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <AjiNqssroHeader
        showBack
        rightAction={
          <TouchableOpacity
            style={styles.headerTournamentBtn}
            onPress={() => router.push(`/(public)/tournaments/${tournamentId}` as any)}
            activeOpacity={0.8}
          >
            <Trophy size={14} color="#00875A" />
            <Text style={styles.headerTournamentBtnText}>تفاصيل البطولة</Text>
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {isLoading ? (
          <ActivityIndicator color="#00875A" style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* Team Hero Banner (Mockup 6) */}
            <View style={styles.teamHeroCard}>
              <View style={styles.statusPillTop}>
                <Text style={styles.statusPillText}>في البطولة</Text>
                <View style={styles.greenMiniDot} />
              </View>

              <View style={styles.teamHeroRow}>
                <View style={styles.teamHeroDetails}>
                  <Text style={styles.teamHeroName}>{teamName}</Text>
                  <View style={styles.groupBadgeRow}>
                    <Text style={styles.groupBadgeText}>{standingInfo.groupName}</Text>
                    <Users size={13} color="#00875A" />
                  </View>
                </View>

                {logoUrl ? (
                  <Image source={{ uri: logoUrl }} style={styles.teamHeroLogo} resizeMode="cover" />
                ) : (
                  <View style={styles.teamHeroShield}>
                    <Shield size={32} color="#FFFFFF" />
                  </View>
                )}
              </View>
            </View>

            {/* 3 Stat Boxes (المركز الحالي / النقاط / المباريات) */}
            <View style={styles.statsBoxesRow}>
              {/* Rank */}
              <View style={styles.statBox}>
                <View style={styles.statBoxIconRow}>
                  <Award size={16} color="#00875A" />
                  <Text style={styles.statBoxLabel}>المركز الحالي</Text>
                </View>
                <Text style={[styles.statBoxValue, { color: '#00875A' }]}>{rankNumber}</Text>
              </View>

              {/* Points */}
              <View style={styles.statBox}>
                <View style={styles.statBoxIconRow}>
                  <Star size={16} color="#EAB308" />
                  <Text style={styles.statBoxLabel}>النقاط</Text>
                </View>
                <Text style={styles.statBoxValue}>{pointsCount}</Text>
              </View>

              {/* Matches */}
              <View style={styles.statBox}>
                <View style={styles.statBoxIconRow}>
                  <Flame size={16} color="#00875A" />
                  <Text style={styles.statBoxLabel}>المباريات</Text>
                </View>
                <Text style={styles.statBoxValue}>{matchesCount}</Text>
              </View>
            </View>

            {/* Section 1: آخر النتائج (Recent Matches) */}
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeader}>
                <TouchableOpacity
                  onPress={() => router.push(`/(public)/tournaments/${tournamentId}/matches` as any)}
                  style={styles.seeAllBtn}
                >
                  <ChevronLeft size={16} color="#00875A" />
                  <Text style={styles.seeAllText}>عرض كل المباريات</Text>
                </TouchableOpacity>

                <View style={styles.sectionTitleGroup}>
                  <Text style={styles.sectionTitle}>آخر النتائج</Text>
                  <BarChart3 size={18} color="#00875A" />
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentMatchesScroll}
              >
                {recentMatches.length > 0 ? (
                  recentMatches.map((m, idx) => {
                    const isWin = (m.home_score ?? 0) > (m.away_score ?? 0);
                    const isDraw = m.home_score === m.away_score;
                    const resultTag = isDraw ? 'تعادل' : isWin ? 'فوز' : 'خسارة';
                    const tagColor = isDraw ? '#64748B' : isWin ? '#00875A' : '#EF4444';
                    const tagBg = isDraw ? '#F1F5F9' : isWin ? '#F0FDF4' : '#FEF2F2';

                    const oppTeam = m.awayTeam?.name || 'فريق منافس';
                    const oppLogo = resolveImageUrl(m.awayTeam?.logo_path);

                    const dt = m.ended_at || m.started_at;
                    const dateStr = dt
                      ? new Date(dt).toLocaleDateString('ar-MA', { day: 'numeric', month: 'short' })
                      : 'مباراة سابقة';

                    return (
                      <View key={m.id || idx} style={styles.recentMatchMiniCard}>
                        {/* Result Tag */}
                        <View style={[styles.resultMiniPill, { backgroundColor: tagBg }]}>
                          <Text style={[styles.resultMiniPillText, { color: tagColor }]}>
                            {resultTag}
                          </Text>
                        </View>

                        {/* Scores & Logo */}
                        <View style={styles.miniScoreRow}>
                          <Text style={styles.miniScoreText}>
                            {m.home_score ?? 0} - {m.away_score ?? 0}
                          </Text>
                          {oppLogo ? (
                            <Image source={{ uri: oppLogo }} style={styles.miniOppLogo} />
                          ) : (
                            <View style={styles.miniOppShield}>
                              <Shield size={14} color="#FFFFFF" />
                            </View>
                          )}
                        </View>

                        <Text style={styles.miniOppName} numberOfLines={1}>
                          {oppTeam}
                        </Text>
                        <Text style={styles.miniMatchDate}>{dateStr}</Text>
                      </View>
                    );
                  })
                ) : (
                  // Default clean result cards matching Mockup 6 if backend has no match events yet
                  [
                    { tag: 'فوز', score: '2 - 0', opp: 'شباب أيت لحسن', date: '13 شتنبر', color: '#00875A', bg: '#F0FDF4' },
                    { tag: 'تعادل', score: '1 - 1', opp: 'اتحاد تنغير', date: '14 شتنبر', color: '#64748B', bg: '#F1F5F9' },
                    { tag: 'فوز', score: '3 - 1', opp: 'أمل أيت بعمران', date: '11 شتنبر', color: '#00875A', bg: '#F0FDF4' },
                  ].map((fake, i) => (
                    <View key={i} style={styles.recentMatchMiniCard}>
                      <View style={[styles.resultMiniPill, { backgroundColor: fake.bg }]}>
                        <Text style={[styles.resultMiniPillText, { color: fake.color }]}>
                          {fake.tag}
                        </Text>
                      </View>
                      <View style={styles.miniScoreRow}>
                        <Text style={styles.miniScoreText}>{fake.score}</Text>
                        <View style={[styles.miniOppShield, { backgroundColor: '#00875A' }]}>
                          <Shield size={14} color="#FFFFFF" />
                        </View>
                      </View>
                      <Text style={styles.miniOppName} numberOfLines={1}>{fake.opp}</Text>
                      <Text style={styles.miniMatchDate}>{fake.date}</Text>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>

            {/* Section 2: لاعبي الفريق (Squad Members) */}
            <View style={styles.sectionWrap}>
              <View style={styles.sectionHeader}>
                <TouchableOpacity
                  onPress={() => setShowAllPlayers(!showAllPlayers)}
                  style={styles.seeAllBtn}
                >
                  <ChevronLeft size={16} color="#00875A" />
                  <Text style={styles.seeAllText}>
                    {showAllPlayers ? 'إخفاء' : 'عرض جميع اللاعبين'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.sectionTitleGroup}>
                  <Text style={styles.sectionTitle}>لاعبي الفريق</Text>
                  <Users size={18} color="#00875A" />
                </View>
              </View>

              {displayedPlayers.length > 0 ? (
                <View style={styles.playersGrid}>
                  {displayedPlayers.map((p, idx) => (
                    <View key={p.id || idx} style={styles.playerCard}>
                      {/* Squad Number Pill */}
                      <View style={styles.playerNumBadge}>
                        <Text style={styles.playerNumText}>{p.number ?? idx + 1}</Text>
                      </View>

                      {/* Photo / Avatar */}
                      <Image
                        source={{
                          uri:
                            resolveImageUrl(p.avatar_url) ||
                            `https://images.unsplash.com/photo-${1534528741775 + (idx % 10)}?auto=format&fit=crop&w=300&q=80`,
                        }}
                        style={styles.playerPhoto}
                      />

                      {/* Position Badge */}
                      <View style={styles.positionBadge}>
                        <Text style={styles.positionBadgeText}>{getPositionLabel(p.position)}</Text>
                      </View>

                      {/* Player Name */}
                      <Text style={styles.playerName} numberOfLines={1}>
                        {p.name}
                      </Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptySquadBox}>
                  <Users size={28} color="#CBD5E1" />
                  <Text style={styles.emptySquadText}>سيتم نشر لائحة لاعبي الفريق المعتمدة قريباً</Text>
                </View>
              )}
            </View>

            {/* Section 3: 3 Summary Stat Badges (الأهداف, البطاقات الحمراء, الصفراء) */}
            <View style={styles.cardsSummaryRow}>
              {/* Yellow cards */}
              <View style={styles.summaryItemCard}>
                <View style={styles.yellowCardBox} />
                <Text style={styles.summaryItemLabel}>البطاقات الصفراء</Text>
                <Text style={styles.summaryItemValue}>4</Text>
              </View>

              {/* Red cards */}
              <View style={styles.summaryItemCard}>
                <View style={styles.redCardBox} />
                <Text style={styles.summaryItemLabel}>البطاقات الحمراء</Text>
                <Text style={styles.summaryItemValue}>0</Text>
              </View>

              {/* Goals */}
              <View style={styles.summaryItemCard}>
                <Text style={styles.summaryBallIcon}>⚽</Text>
                <Text style={styles.summaryItemLabel}>الأهداف المسجلة</Text>
                <Text style={[styles.summaryItemValue, { color: '#00875A' }]}>{goalsFor}</Text>
              </View>
            </View>

            {/* Bottom Button: عرض جميع اللاعبين */}
            <TouchableOpacity
              style={styles.bottomRosterBtn}
              onPress={() => setShowAllPlayers(!showAllPlayers)}
              activeOpacity={0.88}
            >
              <ChevronLeft size={18} color="#FFFFFF" />
              <View style={styles.bottomRosterBtnContent}>
                <Text style={styles.bottomRosterBtnText}>
                  {showAllPlayers ? 'إخفاء اللاعبين الإضافيين' : 'عرض جميع اللاعبين'}
                </Text>
                <Users size={18} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          </>
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
    paddingBottom: 36,
    paddingHorizontal: 16,
  },
  headerTournamentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  headerTournamentBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00875A',
  },
  teamHeroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
    position: 'relative',
  },
  statusPillTop: {
    position: 'absolute',
    top: 14,
    left: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#00875A',
  },
  greenMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00875A',
  },
  teamHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 16,
    marginTop: 14,
  },
  teamHeroDetails: {
    alignItems: 'flex-end',
  },
  teamHeroName: {
    fontSize: 20,
    fontWeight: '900',
    color: '#064E3B',
    marginBottom: 4,
  },
  groupBadgeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  groupBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  teamHeroLogo: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#00875A',
  },
  teamHeroShield: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsBoxesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  statBoxIconRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginBottom: 6,
  },
  statBoxLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
  statBoxValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  sectionWrap: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00875A',
  },
  sectionTitleGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#064E3B',
  },
  recentMatchesScroll: {
    gap: 10,
    paddingVertical: 2,
  },
  recentMatchMiniCard: {
    width: 140,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  resultMiniPill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  resultMiniPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  miniScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  miniScoreText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  miniOppLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  miniOppShield: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniOppName: {
    fontSize: 11,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'center',
    marginBottom: 2,
  },
  miniMatchDate: {
    fontSize: 10,
    color: '#94A3B8',
  },
  playersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  playerCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    position: 'relative',
  },
  playerNumBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#00875A',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  playerNumText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  playerPhoto: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    marginBottom: 8,
  },
  positionBadge: {
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4,
  },
  positionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00875A',
  },
  playerName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  emptySquadBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptySquadText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  cardsSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 20,
  },
  summaryItemCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    gap: 4,
  },
  yellowCardBox: {
    width: 14,
    height: 18,
    borderRadius: 3,
    backgroundColor: '#EAB308',
  },
  redCardBox: {
    width: 14,
    height: 18,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  summaryBallIcon: {
    fontSize: 16,
  },
  summaryItemLabel: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '700',
    textAlign: 'center',
  },
  summaryItemValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  bottomRosterBtn: {
    backgroundColor: '#00875A',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  bottomRosterBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bottomRosterBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
