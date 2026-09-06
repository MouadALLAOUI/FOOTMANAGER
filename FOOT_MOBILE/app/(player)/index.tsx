import { useCallback, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Bell,
  Calendar,
  ChevronRight,
  Clock,
  Inbox,
  MapPin,
  Search,
  Shield,
  Trophy,
} from 'lucide-react-native';

import { usePlayerBookings } from '@/api/bookings';
import { useMyTeam } from '@/api/team';
import { useAuth } from '@/auth/AuthProvider';
import { roleLabel } from '@/auth/roles';
import { AppText } from '@/components/ui/AppText';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { TeamLogo } from '@/components/ui/TeamLogo';
import { useI18n } from '@/i18n/I18nProvider';
import { palette } from '@/theme/colors';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, sizes, spacing } from '@/theme/spacing';

export default function PlayerHomeScreen(): React.JSX.Element {
  const { user, refreshUser } = useAuth();
  const { t, locale, isRTL } = useI18n();
  const { colors } = useTheme();
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const { data: teamData, refetch: refetchTeam } = useMyTeam();
  const { data: bookingsData, refetch: refetchBookings } = usePlayerBookings('upcoming');

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refreshUser(), refetchTeam(), refetchBookings()]);
    } finally {
      setRefreshing(false);
    }
  }, [refreshUser, refetchTeam, refetchBookings]);

  const team = teamData?.team;
  const greeting = user?.name
    ? locale === 'ar'
      ? `مرحباً ${user.name}!`
      : locale === 'fr'
        ? `Bonjour ${user.name} !`
        : `Hello ${user.name}!`
    : t('home.welcome', 'مرحباً بك!');

  const subGreeting = team?.name || roleLabel('player', locale as 'ar' | 'en' | 'fr');

  // Shortcut items with paired icon & short text label
  const shortcuts = [
    {
      key: 'find',
      label: t('home.findMatch', 'البحث عن مباراة'),
      Icon: Search,
      href: '/(player)/matches',
      accent: palette.primaryGreen,
      badge: null,
    },
    {
      key: 'team',
      label: t('nav.team', 'فريقي'),
      Icon: Shield,
      href: '/(player)/team',
      accent: palette.darkGreen,
      badge: team ? null : t('common.join', 'انضم'),
    },
    {
      key: 'bookings',
      label: t('nav.bookings', 'حجوزاتي'),
      Icon: Calendar,
      href: '/(player)/bookings',
      accent: palette.accentBlue,
      badge: null,
    },
    {
      key: 'applications',
      label: t('nav.applications', 'طلباتي'),
      Icon: Inbox,
      href: '/(player)/applications',
      accent: '#8B5CF6',
      badge: null,
    },
  ];

  return (
    <Screen padded={false}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void handleRefresh()}
            tintColor={palette.primaryGreen}
          />
        }
      >
        {/* Top Greeting Header with Circular Avatar */}
        <View style={styles.header}>
          <View style={styles.headerTextWrap}>
            <Text style={[styles.greetingTitle, { color: colors.text }]}>{greeting}</Text>
            <Text style={[styles.greetingSub, { color: colors.textMuted }]}>{subGreeting}</Text>
          </View>
          <Pressable
            onPress={() => router.push('/(player)/profile' as never)}
            accessibilityRole="button"
            accessibilityLabel={t('nav.profile', 'الملف الشخصي')}
          >
            <Avatar uri={user?.avatar_thumbnail_url ?? user?.avatar_url} name={user?.name} size="md" />
          </Pressable>
        </View>

        {/* Summary Card: Next Upcoming Match or Empty State */}
        <View style={styles.sectionHeader}>
          <AppText variant="h2" style={{ color: colors.text }}>
            {t('home.upcomingMatches', 'المباراة القادمة')}
          </AppText>
        </View>

        {bookingsData?.data && bookingsData.data.length > 0 ? (() => {
          const booking = bookingsData.data[0];
          const stadiumName = booking.stadium?.name ?? t('common.stadium', 'الملعب');
          const stadiumCity = booking.stadium?.city ? ` · ${booking.stadium.city}` : '';
          const bookingDateStr = booking.booking_date
            ? `${booking.booking_date}${booking.start_time ? ` · ${booking.start_time.slice(0, 5)}` : ''}`
            : '';
          const isPending = booking.status === 'pending' || booking.reservation_status === 'pending';

          return (
            <Card style={styles.matchCard}>
              <View style={styles.matchCardTop}>
                <View style={styles.badgeRow}>
                  <Badge
                    label={isPending ? t('common.status.pending', 'قيد الانتظار') : t('match.status.scheduled', 'مؤكدة')}
                    variant={isPending ? 'pending' : 'available'}
                  />
                  {bookingDateStr ? (
                    <View style={styles.dateRow}>
                      <Clock size={13} color={colors.textMuted} />
                      <Text style={[styles.dateTimeText, { color: colors.textMuted }]}>
                        {bookingDateStr}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>

              <View style={styles.matchTeamsRow}>
                {/* My Team */}
                <View style={styles.teamColumn}>
                  <TeamLogo uri={team?.logo_thumbnail_url ?? team?.logo_url} size="md" />
                  <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
                    {team?.name ?? user?.name ?? t('nav.team', 'فريقي')}
                  </Text>
                </View>

                {/* VS Tag */}
                <View style={[styles.vsBadge, { backgroundColor: colors.bgMuted }]}>
                  <Text style={[styles.vsText, { color: colors.textMuted }]}>VS</Text>
                </View>

                {/* Opponent or Reserved Stadium Slot */}
                <View style={styles.teamColumn}>
                  <TeamLogo size="md" />
                  <Text style={[styles.teamName, { color: colors.text }]} numberOfLines={1}>
                    {booking.team?.name ?? stadiumName}
                  </Text>
                </View>
              </View>

              {/* Stadium location info */}
              <View style={[styles.matchVenueRow, { borderTopColor: colors.border }]}>
                <MapPin size={15} color={palette.primaryGreen} />
                <Text style={[styles.venueName, { color: colors.textMuted }]}>
                  {stadiumName}{stadiumCity}
                </Text>
              </View>
            </Card>
          );
        })() : (
          <Card style={styles.emptyCard}>
            <EmptyState
              title={t('home.noUpcomingMatchTitle', 'لا توجد مباريات قادمة')}
              description={t('home.noUpcomingMatchDesc', 'انضم لفريق أو تصفح المباريات المفتوحة للمشاركة.')}
              actionLabel={t('home.findMatch', 'البحث عن مباراة')}
              onAction={() => router.push('/(player)/matches' as never)}
            />
          </Card>
        )}

        {/* Large Shortcut Tiles Row (2x2 Grid) */}
        <View style={styles.sectionHeader}>
          <AppText variant="h2" style={{ color: colors.text }}>
            {t('home.quickActions', 'إجراءات سريعة')}
          </AppText>
        </View>

        <View style={styles.shortcutsGrid}>
          {shortcuts.map((item) => {
            const Icon = item.Icon;
            return (
              <Pressable
                key={item.key}
                onPress={() => router.push(item.href as never)}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                style={({ pressed }) => [
                  styles.shortcutTile,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    opacity: pressed ? 0.88 : 1,
                    transform: pressed ? [{ scale: 0.98 }] : [],
                  },
                ]}
              >
                <View style={[styles.shortcutIconBox, { backgroundColor: item.accent + '16' }]}>
                  <Icon size={26} color={item.accent} />
                </View>
                <Text style={[styles.shortcutLabel, { color: colors.text }]}>{item.label}</Text>
                {item.badge ? (
                  <View style={styles.shortcutBadgeWrap}>
                    <Badge label={item.badge} variant="warning" />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>

        {/* Secondary Info / Tips Banner */}
        <View style={[styles.tipsBanner, { backgroundColor: palette.navy }]}>
          <View style={styles.tipsIconCircle}>
            <Trophy size={20} color="#F59E0B" />
          </View>
          <View style={styles.tipsTextWrap}>
            <Text style={styles.tipsTitle}>{t('home.tournamentsPromoTitle', 'بطولات الأحياء القادمة')}</Text>
            <Text style={styles.tipsDesc}>
              {t('home.tournamentsPromoDesc', 'تابع نتائج وجداول مباريات البطولات المحلية')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.xs,
  },
  headerTextWrap: {
    flex: 1,
    gap: 4,
  },
  greetingTitle: {
    fontSize: 24,
    fontWeight: '800',
  },
  greetingSub: {
    fontSize: 14,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  matchCard: {
    padding: spacing.lg,
    borderRadius: radius.large,
    gap: spacing.md,
  },
  matchCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dateTimeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  matchTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: spacing.sm,
  },
  teamColumn: {
    alignItems: 'center',
    gap: spacing.xs,
    width: 100,
  },
  teamName: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  vsBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    fontSize: 12,
    fontWeight: '800',
  },
  matchVenueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  venueName: {
    fontSize: 13,
  },
  emptyCard: {
    padding: spacing.md,
    borderRadius: radius.large,
  },
  shortcutsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  shortcutTile: {
    width: '47.5%',
    minHeight: 110,
    padding: spacing.md,
    borderRadius: radius.large,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  shortcutIconBox: {
    width: 50,
    height: 50,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shortcutLabel: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  shortcutBadgeWrap: {
    position: 'absolute',
    top: 8,
    end: 8,
  },
  tipsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.large,
    marginTop: spacing.xs,
  },
  tipsIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(245, 158, 11, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsTextWrap: {
    flex: 1,
    gap: 4,
  },
  tipsTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  tipsDesc: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 12,
    lineHeight: 16,
  },
});

