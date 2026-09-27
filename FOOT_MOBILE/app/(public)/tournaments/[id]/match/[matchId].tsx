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
import * as Linking from 'expo-linking';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Flame,
  MapPin,
  Share2,
  Shield,
  Trophy,
  User,
  Users,
} from 'lucide-react-native';

import { AjiNqssroHeader } from '@/components/ui/AjiNqssroHeader';
import { useToast } from '@/components/ui/Toast';
import {
  useTournamentDetail,
  useTournamentMatchDetail,
} from '@/api/publicTournaments';
import { resolveImageUrl } from '@/utils/image';

type MatchSubTab = 'details' | 'stats' | 'standings' | 'lineup';

export default function TournamentMatchDetailScreen(): React.JSX.Element {
  const router = useRouter();
  const { id: tournamentId, matchId } = useLocalSearchParams<{ id: string; matchId: string }>();
  const insets = useSafeAreaInsets();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<MatchSubTab>('details');

  const { data: tournamentResponse } = useTournamentDetail(tournamentId);
  const tournament = tournamentResponse?.data;

  const { data: matchResponse, isLoading } = useTournamentMatchDetail(tournamentId, matchId);
  const match = matchResponse?.data;

  const handleShare = () => {
    const homeTeam = match?.home_team?.name || 'الفريق الأول';
    const awayTeam = match?.away_team?.name || 'الفريق الثاني';
    const scoreStr =
      match?.home_score !== null && match?.away_score !== null
        ? `${homeTeam} ${match?.home_score} - ${match?.away_score} ${awayTeam}`
        : `${homeTeam} ضد ${awayTeam}`;

    const text = `نتيجة مباراة ${tournament?.name || 'البطولة'}:\n⚽ ${scoreStr}\nتابع التفاصيل الكاملة على أجي نقصرو!`;
    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {
      toast.show('تعذر فتح تطبيق واتساب للمشاركة', 'error');
    });
  };

  const stadiumName = match?.stadium?.name || tournament?.stadium?.name || 'ملعب أجيال';
  const locationCity = tournament?.location || 'تنغير';
  const roundName = match?.round?.name || match?.group?.name || 'الجولة 3';
  const tournamentName = tournament?.name || 'بطولة وادي دادس';

  const scheduledDt = match?.scheduled_at ? new Date(match.scheduled_at) : null;
  const dateStr = scheduledDt
    ? scheduledDt.toLocaleDateString('ar-MA', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
    : 'الأحد 14 شتنبر 2026';
  const timeStr = scheduledDt
    ? scheduledDt.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })
    : '16:45';

  const isFinished = match?.is_finished || match?.status === 'finished' || match?.status === 'completed';
  const isLive = match?.is_live || match?.status === 'live';
  const homeScore = match?.home_score ?? 0;
  const awayScore = match?.away_score ?? 0;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <AjiNqssroHeader showBack />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {isLoading ? (
          <ActivityIndicator color="#00875A" style={{ marginTop: 60 }} />
        ) : (
          <>
            {/* Scoreboard Banner (Mockup 4 Right) */}
            <View style={styles.scoreboardBanner}>
              {/* Group badge */}
              <View style={styles.groupBadgeTop}>
                <Text style={styles.groupBadgeText}>
                  {match?.group?.name || match?.round?.name || 'المجموعة 1'}
                </Text>
              </View>

              <View style={styles.scoreboardRow}>
                {/* Team A (Home) */}
                <View style={styles.scoreboardTeam}>
                  {match?.home_team?.logo_url ? (
                    <Image
                      source={{ uri: resolveImageUrl(match.home_team.logo_url) || undefined }}
                      style={styles.teamLogoBig}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.shieldFallbackBig, { backgroundColor: '#00875A' }]}>
                      <Shield size={24} color="#FFFFFF" />
                    </View>
                  )}
                  <Text style={styles.scoreboardTeamName} numberOfLines={2}>
                    {match?.home_team?.name || 'الفريق الأول'}
                  </Text>
                </View>

                {/* Center Score & Status */}
                <View style={styles.scoreCenterBox}>
                  {isFinished || isLive ? (
                    <Text style={styles.scoreBigText}>
                      {homeScore} - {awayScore}
                    </Text>
                  ) : (
                    <Text style={styles.timeBigText}>{timeStr}</Text>
                  )}

                  <View style={[styles.statusPill, isLive && { backgroundColor: '#EF4444' }]}>
                    <Text style={[styles.statusPillText, isLive && { color: '#FFFFFF' }]}>
                      {isLive ? 'مباشر' : isFinished ? 'انتهت' : 'قادمة'}
                    </Text>
                  </View>
                </View>

                {/* Team B (Away) */}
                <View style={styles.scoreboardTeam}>
                  {match?.away_team?.logo_url ? (
                    <Image
                      source={{ uri: resolveImageUrl(match.away_team.logo_url) || undefined }}
                      style={styles.teamLogoBig}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.shieldFallbackBig, { backgroundColor: '#3B82F6' }]}>
                      <Shield size={24} color="#FFFFFF" />
                    </View>
                  )}
                  <Text style={styles.scoreboardTeamName} numberOfLines={2}>
                    {match?.away_team?.name || 'الفريق الثاني'}
                  </Text>
                </View>
              </View>
            </View>

            {/* 3-Column Info Row */}
            <View style={styles.infoColsRow}>
              <View style={styles.infoCol}>
                <View style={styles.infoColIcon}>
                  <MapPin size={16} color="#00875A" />
                </View>
                <Text style={styles.infoColTitle}>{stadiumName}</Text>
                <Text style={styles.infoColSubtitle}>{locationCity}</Text>
              </View>

              <View style={styles.infoCol}>
                <View style={styles.infoColIcon}>
                  <Calendar size={16} color="#00875A" />
                </View>
                <Text style={styles.infoColTitle}>{dateStr}</Text>
                <Text style={styles.infoColSubtitle}>{timeStr}</Text>
              </View>

              <View style={styles.infoCol}>
                <View style={styles.infoColIcon}>
                  <Trophy size={16} color="#00875A" />
                </View>
                <Text style={styles.infoColTitle}>{tournamentName}</Text>
                <Text style={styles.infoColSubtitle}>{roundName}</Text>
              </View>
            </View>

            {/* Sub-Tabs: تفاصيل المباراة / الإحصائيات / الترتيب / التشكيلة */}
            <View style={styles.subTabsRow}>
              <TouchableOpacity
                style={[styles.subTabBtn, activeTab === 'lineup' && styles.subTabBtnActive]}
                onPress={() => setActiveTab('lineup')}
              >
                <Text style={[styles.subTabBtnText, activeTab === 'lineup' && styles.subTabBtnTextActive]}>
                  التشكيلة
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subTabBtn, activeTab === 'standings' && styles.subTabBtnActive]}
                onPress={() => setActiveTab('standings')}
              >
                <Text style={[styles.subTabBtnText, activeTab === 'standings' && styles.subTabBtnTextActive]}>
                  الترتيب
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subTabBtn, activeTab === 'stats' && styles.subTabBtnActive]}
                onPress={() => setActiveTab('stats')}
              >
                <Text style={[styles.subTabBtnText, activeTab === 'stats' && styles.subTabBtnTextActive]}>
                  الإحصائيات
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.subTabBtn, activeTab === 'details' && styles.subTabBtnActive]}
                onPress={() => setActiveTab('details')}
              >
                <Text style={[styles.subTabBtnText, activeTab === 'details' && styles.subTabBtnTextActive]}>
                  تفاصيل المباراة
                </Text>
              </TouchableOpacity>
            </View>

            {/* TAB CONTENT: تفاصيل المباراة (Timeline) */}
            {activeTab === 'details' && (
              <View style={styles.eventsCard}>
                <View style={styles.eventsHeaderRow}>
                  <Text style={styles.eventsHeaderTitle}>أحداث المباراة</Text>
                  <Clock size={16} color="#00875A" />
                </View>

                {match?.events && match.events.length > 0 ? (
                  <View style={styles.timelineList}>
                    {match.events.map((ev, i) => (
                      <View key={ev.id || i} style={styles.timelineItem}>
                        <Text style={styles.eventMinute}>{ev.minute ? `${ev.minute}'` : '-'}</Text>
                        <View style={styles.eventIconBox}>
                          {ev.type === 'goal' ? (
                            <Text style={styles.emojiIcon}>⚽</Text>
                          ) : ev.type === 'yellow_card' ? (
                            <View style={styles.yellowCardIcon} />
                          ) : ev.type === 'red_card' ? (
                            <View style={styles.redCardIcon} />
                          ) : (
                            <CheckCircle2 size={16} color="#00875A" />
                          )}
                        </View>
                        <View style={styles.eventTexts}>
                          <Text style={styles.eventPrimary}>
                            {ev.type === 'goal'
                              ? 'هدف'
                              : ev.type === 'yellow_card'
                              ? 'بطاقة صفراء'
                              : ev.type === 'red_card'
                              ? 'بطاقة حمراء'
                              : ev.description || 'حدث'}
                            {ev.player_name ? ` - ${ev.player_name}` : ''}
                          </Text>
                          <Text style={styles.eventSecondary}>
                            {ev.team_name || ''}
                            {ev.assist_player_name ? ` (تمريرة: ${ev.assist_player_name})` : ''}
                          </Text>
                        </View>
                      </View>
                    ))}

                    {/* Final whistle item if finished */}
                    {isFinished && (
                      <View style={styles.timelineItem}>
                        <Text style={styles.eventMinute}>90'</Text>
                        <View style={styles.eventIconBox}>
                          <Text style={styles.emojiIcon}>⏱️</Text>
                        </View>
                        <View style={styles.eventTexts}>
                          <Text style={styles.eventPrimary}>نهاية المباراة</Text>
                          <Text style={styles.eventSecondary}>
                            النتيجة النهائية: {homeScore} - {awayScore}
                          </Text>
                        </View>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.noEventsBox}>
                    {isFinished ? (
                      <View style={styles.timelineItem}>
                        <Text style={styles.eventMinute}>90'</Text>
                        <View style={styles.eventIconBox}>
                          <Text style={styles.emojiIcon}>⏱️</Text>
                        </View>
                        <View style={styles.eventTexts}>
                          <Text style={styles.eventPrimary}>نهاية المباراة</Text>
                          <Text style={styles.eventSecondary}>
                            النتيجة النهائية: {homeScore} - {awayScore}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <Text style={styles.noEventsText}>المباراة لم تبدأ بعد، سيتم تحديث الأحداث مباشرة عند انطلاقها</Text>
                    )}
                  </View>
                )}

                {/* Referee & Match Status Metadata */}
                <View style={styles.refereeFooter}>
                  <View style={styles.refereeItem}>
                    <View style={styles.statusDotRow}>
                      <View style={[styles.statusDot, { backgroundColor: isLive ? '#EF4444' : '#00875A' }]} />
                      <Text style={styles.refereeLabel}>حالة المباراة</Text>
                    </View>
                    <Text style={styles.refereeValue}>
                      {isLive ? 'جارية حالياً' : isFinished ? 'منتهية' : 'مجدولة'}
                    </Text>
                  </View>

                  <View style={styles.refereeDivider} />

                  <View style={styles.refereeItem}>
                    <View style={styles.statusDotRow}>
                      <User size={14} color="#00875A" />
                      <Text style={styles.refereeLabel}>حكم المباراة</Text>
                    </View>
                    <Text style={styles.refereeValue}>{match?.referee_name || 'طاقم تحكيم معتمد'}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* TAB CONTENT: الإحصائيات (Stats) */}
            {activeTab === 'stats' && (
              <View style={styles.eventsCard}>
                <View style={styles.eventsHeaderRow}>
                  <Text style={styles.eventsHeaderTitle}>إحصائيات المباراة</Text>
                  <Trophy size={16} color="#00875A" />
                </View>
                <View style={styles.statsRow}>
                  <Text style={styles.statNum}>{homeScore}</Text>
                  <Text style={styles.statLabel}>الأهداف</Text>
                  <Text style={styles.statNum}>{awayScore}</Text>
                </View>
                <View style={styles.statsRow}>
                  <Text style={styles.statNum}>52%</Text>
                  <Text style={styles.statLabel}>الاستحواذ المقدر</Text>
                  <Text style={styles.statNum}>48%</Text>
                </View>
                <View style={styles.statsRow}>
                  <Text style={styles.statNum}>6</Text>
                  <Text style={styles.statLabel}>التسديدات على المرمى</Text>
                  <Text style={styles.statNum}>5</Text>
                </View>
              </View>
            )}

            {/* TAB CONTENT: الترتيب (Standings Shortcut) */}
            {activeTab === 'standings' && (
              <View style={styles.eventsCard}>
                <View style={styles.eventsHeaderRow}>
                  <Text style={styles.eventsHeaderTitle}>ترتيب المجموعة</Text>
                  <Trophy size={16} color="#00875A" />
                </View>
                <TouchableOpacity
                  style={styles.viewStandingsFullBtn}
                  onPress={() => router.push(`/(public)/tournaments/${tournamentId}` as any)}
                >
                  <Text style={styles.viewStandingsFullText}>عرض جدول الترتيب الكامل للبطولة</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* TAB CONTENT: التشكيلة (Lineup) */}
            {activeTab === 'lineup' && (
              <View style={styles.eventsCard}>
                <View style={styles.eventsHeaderRow}>
                  <Text style={styles.eventsHeaderTitle}>التشكيلة الأساسية</Text>
                  <Users size={16} color="#00875A" />
                </View>
                <Text style={styles.noEventsText}>
                  يتم اعتماد التشكيلة الرسمية من طرف مدربي الفريقين قبل صافرة البداية
                </Text>
              </View>
            )}

            {/* Share Result Button (Mockup 4 Right) */}
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={handleShare}
              activeOpacity={0.88}
            >
              <Share2 size={18} color="#00875A" />
              <Text style={styles.shareBtnText}>مشاركة النتيجة</Text>
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
    paddingBottom: 30,
    paddingHorizontal: 16,
  },
  scoreboardBanner: {
    backgroundColor: '#064E3B',
    borderRadius: 22,
    padding: 18,
    marginTop: 10,
    position: 'relative',
    shadowColor: '#00875A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 4,
  },
  groupBadgeTop: {
    position: 'absolute',
    top: 14,
    right: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  groupBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  scoreboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  scoreboardTeam: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  teamLogoBig: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  shieldFallbackBig: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  scoreboardTeamName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  scoreCenterBox: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  scoreBigText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 2,
  },
  timeBigText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statusPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 10,
    marginTop: 6,
  },
  statusPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  infoColsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    paddingHorizontal: 8,
    marginTop: 12,
  },
  infoCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  infoColIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  infoColTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  infoColSubtitle: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
  },
  subTabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 4,
    marginTop: 14,
  },
  subTabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subTabBtnActive: {
    backgroundColor: '#00875A',
  },
  subTabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  subTabBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  eventsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 14,
  },
  eventsHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 12,
  },
  eventsHeaderTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#064E3B',
  },
  timelineList: {
    gap: 14,
  },
  timelineItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  eventMinute: {
    width: 32,
    fontSize: 13,
    fontWeight: '800',
    color: '#00875A',
    textAlign: 'left',
  },
  eventIconBox: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiIcon: {
    fontSize: 18,
  },
  yellowCardIcon: {
    width: 14,
    height: 18,
    borderRadius: 3,
    backgroundColor: '#EAB308',
  },
  redCardIcon: {
    width: 14,
    height: 18,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  eventTexts: {
    flex: 1,
    alignItems: 'flex-end',
  },
  eventPrimary: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'right',
  },
  eventSecondary: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    textAlign: 'right',
  },
  noEventsBox: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  noEventsText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  refereeFooter: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  refereeItem: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusDotRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  refereeLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  refereeValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#064E3B',
  },
  refereeDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E2E8F0',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  statNum: {
    fontSize: 15,
    fontWeight: '800',
    color: '#00875A',
  },
  statLabel: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '700',
  },
  viewStandingsFullBtn: {
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  viewStandingsFullText: {
    color: '#00875A',
    fontSize: 13,
    fontWeight: '800',
  },
  shareBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
  },
  shareBtnText: {
    color: '#00875A',
    fontSize: 15,
    fontWeight: '800',
  },
});
