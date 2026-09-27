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
  Calendar,
  ChevronDown,
  ChevronLeft,
  Clock,
  MapPin,
  Shield,
  Trophy,
  Users,
} from 'lucide-react-native';

import { AjiNqssroHeader } from '@/components/ui/AjiNqssroHeader';
import { AjiNqssroTabBar } from '@/components/navigation/AjiNqssroTabBar';
import {
  useTournamentDetail,
  useTournamentFixtures,
} from '@/api/publicTournaments';
import { resolveImageUrl } from '@/utils/image';

type MatchFilter = 'all' | 'today' | 'upcoming' | 'finished';

export default function TournamentMatchesScreen(): React.JSX.Element {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [activeFilter, setActiveFilter] = useState<MatchFilter>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');

  const { data: detailResponse, isLoading: isDetailLoading } = useTournamentDetail(id);
  const tournament = detailResponse?.data;

  const { data: fixturesResponse, isLoading: isFixturesLoading } = useTournamentFixtures(id);
  const fixtures = fixturesResponse?.data || [];

  // Extract unique group names
  const availableGroups = useMemo(() => {
    const set = new Set<string>();
    fixtures.forEach((f) => {
      if (f.group_name) set.add(f.group_name);
    });
    return Array.from(set);
  }, [fixtures]);

  // Filter fixtures
  const filteredFixtures = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    return fixtures.filter((f) => {
      // Group filter
      if (selectedGroup !== 'all' && f.group_name !== selectedGroup) {
        return false;
      }

      const isFinished =
        f.status === 'finished' ||
        f.status === 'completed' ||
        f.match?.status === 'finished' ||
        (f.match?.home_score !== null &&
          f.match?.home_score !== undefined &&
          f.match?.away_score !== null &&
          f.match?.away_score !== undefined);

      const scheduledDate = f.scheduled_at
        ? new Date(f.scheduled_at).toISOString().split('T')[0]
        : null;

      if (activeFilter === 'finished') return isFinished;
      if (activeFilter === 'upcoming') return !isFinished;
      if (activeFilter === 'today') return scheduledDate === todayStr;

      return true;
    });
  }, [fixtures, activeFilter, selectedGroup]);

  // Group filtered fixtures by date
  const groupedByDate = useMemo(() => {
    const groups: { [key: string]: typeof fixtures } = {};
    filteredFixtures.forEach((f) => {
      let dateKey = 'مواعيد قادمة';
      if (f.scheduled_at) {
        const d = new Date(f.scheduled_at);
        dateKey = d.toLocaleDateString('ar-MA', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
      }
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push(f);
    });
    return groups;
  }, [filteredFixtures]);

  const tournamentTitle = tournament?.name || (isDetailLoading ? 'جاري التحميل...' : 'بطولة كرة القدم');
  const locationText = [tournament?.location, tournament?.stadium?.name].filter(Boolean).join(' - ') || 'تنغير - الجنوب الشرقي';
  const datesText = tournament?.start_date
    ? `من ${new Date(tournament.start_date).toLocaleDateString('ar-MA', { day: 'numeric', month: 'short' })} إلى ${tournament.end_date ? new Date(tournament.end_date).toLocaleDateString('ar-MA', { day: 'numeric', month: 'short', year: 'numeric' }) : 'نهاية الشهر'}`
    : 'مواعيد البطولة تعلن قريباً';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <AjiNqssroHeader showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Compact Tournament Banner (Mockup 4 Left) */}
        <View style={styles.bannerCard}>
          <View style={styles.bannerBadgeRow}>
            <View style={styles.activePill}>
              <Text style={styles.activePillText}>
                {tournament?.status === 'in_progress' ? 'جارية' : 'مفتوحة'}
              </Text>
              <View style={styles.greenMiniDot} />
            </View>
            <View style={styles.trophyEmblemBadge}>
              <Trophy size={28} color="#F59E0B" />
            </View>
          </View>

          <Text style={styles.bannerTitle}>{tournamentTitle}</Text>

          <View style={styles.bannerMetaRow}>
            <Text style={styles.bannerMetaText}>{locationText}</Text>
            <MapPin size={13} color="#00875A" />
          </View>

          <View style={styles.bannerMetaRow}>
            <Text style={styles.bannerMetaText}>{datesText}</Text>
            <Calendar size={13} color="#00875A" />
          </View>
        </View>

        {/* Filter Pills (الكل, اليوم, القادمة, انتهت) */}
        <View style={styles.filterPillsRow}>
          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'finished' && styles.filterPillActive]}
            onPress={() => setActiveFilter('finished')}
          >
            <Text style={[styles.filterPillText, activeFilter === 'finished' && styles.filterPillTextActive]}>
              انتهت
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'upcoming' && styles.filterPillActive]}
            onPress={() => setActiveFilter('upcoming')}
          >
            <Text style={[styles.filterPillText, activeFilter === 'upcoming' && styles.filterPillTextActive]}>
              القادمة
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'today' && styles.filterPillActive]}
            onPress={() => setActiveFilter('today')}
          >
            <Text style={[styles.filterPillText, activeFilter === 'today' && styles.filterPillTextActive]}>
              اليوم
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
            onPress={() => setActiveFilter('all')}
          >
            <Text style={[styles.filterPillText, activeFilter === 'all' && styles.filterPillTextActive]}>
              الكل
            </Text>
          </TouchableOpacity>
        </View>

        {/* Group Selector Dropdown / Row */}
        {availableGroups.length > 0 && (
          <View style={styles.groupSelectorRow}>
            <TouchableOpacity
              style={styles.groupSelectBtn}
              onPress={() => {
                // Cycle through groups or reset to all
                if (selectedGroup === 'all') {
                  setSelectedGroup(availableGroups[0]);
                } else {
                  const currIdx = availableGroups.indexOf(selectedGroup);
                  if (currIdx < availableGroups.length - 1) {
                    setSelectedGroup(availableGroups[currIdx + 1]);
                  } else {
                    setSelectedGroup('all');
                  }
                }
              }}
            >
              <ChevronDown size={16} color="#00875A" />
              <Text style={styles.groupSelectText}>
                {selectedGroup === 'all' ? 'جميع المجموعات' : selectedGroup}
              </Text>
            </TouchableOpacity>

            <View style={styles.groupIconBox}>
              <Users size={16} color="#00875A" />
            </View>
          </View>
        )}

        {/* Matches Grouped by Date */}
        {isFixturesLoading ? (
          <ActivityIndicator color="#00875A" style={{ marginTop: 40 }} />
        ) : Object.keys(groupedByDate).length > 0 ? (
          Object.entries(groupedByDate).map(([dateLabel, matchList]) => (
            <View key={dateLabel} style={styles.dateGroupWrap}>
              {/* Date Header */}
              <View style={styles.dateHeaderRow}>
                <Text style={styles.dateHeaderText}>{dateLabel}</Text>
                <Calendar size={16} color="#00875A" />
              </View>

              {/* Match Cards */}
              {matchList.map((m) => {
                const dt = m.scheduled_at ? new Date(m.scheduled_at) : null;
                const timeStr = dt
                  ? dt.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })
                  : '17:00';

                const isFinished =
                  m.status === 'finished' ||
                  m.status === 'completed' ||
                  m.match?.status === 'finished' ||
                  (m.match?.home_score !== null &&
                    m.match?.home_score !== undefined &&
                    m.match?.away_score !== null &&
                    m.match?.away_score !== undefined);

                const homeScore = m.match?.home_score ?? m.home_score;
                const awayScore = m.match?.away_score ?? m.away_score;
                const stadiumName = m.stadium?.name || tournament?.stadium?.name || 'ملعب أجيال - تنغير';
                const matchIdentifier = m.match?.id || m.id;

                return (
                  <TouchableOpacity
                    key={m.id}
                    style={styles.matchCard}
                    onPress={() => router.push(`/(public)/tournaments/${id}/match/${matchIdentifier}` as any)}
                    activeOpacity={0.88}
                  >
                    {/* Group Badge */}
                    <View style={styles.matchGroupBadge}>
                      <Text style={styles.matchGroupBadgeText}>
                        {m.group_name || m.round_name || 'المجموعة 1'}
                      </Text>
                    </View>

                    {/* Teams and Score/Time Row */}
                    <View style={styles.matchRow}>
                      {/* Left side chevron */}
                      <ChevronLeft size={18} color="#00875A" />

                      {/* Team A (Right in RTL) */}
                      <View style={styles.teamColumn}>
                        {m.home_team?.logo_url ? (
                          <Image
                            source={{ uri: resolveImageUrl(m.home_team.logo_url) || undefined }}
                            style={styles.teamLogo}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.teamShieldFallback, { backgroundColor: '#00875A' }]}>
                            <Shield size={16} color="#FFFFFF" />
                          </View>
                        )}
                        <Text style={styles.teamName} numberOfLines={1}>
                          {m.home_team?.name || 'فريق 1'}
                        </Text>
                      </View>

                      {/* Center Time or Score */}
                      <View style={styles.centerScoreBox}>
                        {isFinished && homeScore !== null && awayScore !== null ? (
                          <View style={styles.scorePill}>
                            <Text style={styles.scorePillText}>
                              {homeScore} - {awayScore}
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.timePill}>
                            <Clock size={13} color="#00875A" />
                            <Text style={styles.timePillText}>{timeStr}</Text>
                          </View>
                        )}
                      </View>

                      {/* Team B */}
                      <View style={styles.teamColumn}>
                        {m.away_team?.logo_url ? (
                          <Image
                            source={{ uri: resolveImageUrl(m.away_team.logo_url) || undefined }}
                            style={styles.teamLogo}
                            resizeMode="cover"
                          />
                        ) : (
                          <View style={[styles.teamShieldFallback, { backgroundColor: '#EA580C' }]}>
                            <Shield size={16} color="#FFFFFF" />
                          </View>
                        )}
                        <Text style={styles.teamName} numberOfLines={1}>
                          {m.away_team?.name || 'فريق 2'}
                        </Text>
                      </View>
                    </View>

                    {/* Stadium Location Footer */}
                    <View style={styles.matchLocationRow}>
                      <Text style={styles.matchLocationText}>{stadiumName}</Text>
                      <MapPin size={12} color="#00875A" />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        ) : (
          <View style={styles.emptyWrap}>
            <Calendar size={36} color="#CBD5E1" />
            <Text style={styles.emptyText}>لا توجد مباريات تطابق هذا التصنيف</Text>
          </View>
        )}
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
    paddingHorizontal: 16,
  },
  bannerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 10,
    alignItems: 'flex-end',
  },
  bannerBadgeRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  activePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00875A',
  },
  greenMiniDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00875A',
  },
  trophyEmblemBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#064E3B',
    textAlign: 'right',
    marginBottom: 6,
  },
  bannerMetaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  bannerMetaText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  filterPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8,
  },
  filterPill: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterPillActive: {
    backgroundColor: '#00875A',
    borderColor: '#00875A',
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  groupSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 14,
  },
  groupSelectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  groupSelectText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#064E3B',
  },
  groupIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateGroupWrap: {
    marginTop: 18,
  },
  dateHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064E3B',
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 10,
    position: 'relative',
  },
  matchGroupBadge: {
    alignSelf: 'flex-end',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 8,
  },
  matchGroupBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#00875A',
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamColumn: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  teamLogo: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F8FAFC',
  },
  teamShieldFallback: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  centerScoreBox: {
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  timePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timePillText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00875A',
  },
  scorePill: {
    backgroundColor: '#00875A',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
  },
  scorePillText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  matchLocationRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  matchLocationText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
