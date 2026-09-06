/**
 * Landing page — faithful mobile clone of simpleFrontend with functional search & responsive UI.
 * Sections (in order):
 *  1. Hero (bg image + dark overlay + interactive search bar + popular cities + live stats bar)
 *  2. MySection (role-specific: manager open match / terrain owner fields) — only if authenticated
 *  3. Available Fields (top stadiums carousel from /v1/home)
 *  4. Match Requests (latest matches carousel from /v1/home)
 *  5. Tournaments (from /v1/tournaments)
 *  6. Live & Next (from /v1/live-tournament-matches)
 *  7. Why Us (feature grid + dark CTA banner with pitch SVG)
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import {
  Bolt,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Heart,
  Landmark,
  MapPin,
  Moon,
  Radio,
  RotateCcw,
  Search,
  Shield,
  Star,
  Sun,
  SunMedium,
  Trophy,
  Users,
  Wallet,
  X,
} from 'lucide-react-native';

import { useQuery } from '@tanstack/react-query';
import { get } from '@/api/client';
import { usePublicTournaments } from '@/api/publicTournaments';
import { useAuth } from '@/auth/AuthProvider';
import { homeForRole } from '@/auth/homeForRole';
import { resolveImageUrl } from '@/utils/image';
import { BrandLogoMark } from '@/components/ui/illustrations';

const { width: SW } = Dimensions.get('window');

// ─── Palette ────────────────────────────────────────────────────────────────
const G = {
  green:   '#22c55e',
  green2:  '#16a34a',
  white:   '#ffffff',
  slate50: '#f8fafc',
  slate100:'#f1f5f9',
  slate200:'#e2e8f0',
  slate400:'#94a3b8',
  slate500:'#64748b',
  slate600:'#475569',
  slate700:'#334155',
  slate800:'#1e293b',
  slate900:'#0f172a',
  slate950:'#020617',
  amber:   '#f59e0b',
  rose:    '#e11d48',
  rose100: '#ffe4e6',
  emerald: '#10b981',
  indigo:  '#6366f1',
  bg:      '#f6f7fb',
};

// Fallback cities if API unavailable
const FALLBACK_CITIES = [
  'الدار البيضاء',
  'الرباط',
  'مراكش',
  'فاس',
  'طنجة',
  'أكادير',
  'سلا',
  'مكناس',
  'وجدة',
  'القنيطرة',
  'تطوان',
  'خريبكة',
  'الجديدة',
  'الناظور',
  'أسفي',
];

// Hourly time slots
const HOURLY_SECTIONS = [
  {
    title: 'الصباح',
    icon: Sun,
    slots: ['08:00', '09:00', '10:00', '11:00'],
  },
  {
    title: 'الظهيرة',
    icon: SunMedium,
    slots: ['12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
  },
  {
    title: 'المساء',
    icon: Moon,
    slots: ['18:00', '19:00', '20:00', '21:00', '22:00', '23:00', '00:00'],
  },
];

// ─── API hooks ────────────────────────────────────────────────────────────────

interface Stadium { id: number; name: string; city?: string; location?: string; price_per_hour?: number; rating?: number; is_open?: boolean; type?: string; images?: { image_url?: string; thumbnail_url?: string; is_thumbnail?: boolean }[] }
interface MatchRequest { id: number; team?: { name: string; logo_url?: string }; preferred_day?: string; preferred_time?: string; city?: string; stadium?: { name: string }; level?: string; format?: string; created_at?: string }
interface HomeData { top_stadiums?: Stadium[]; latest_matches?: MatchRequest[]; stats?: { teams?: number; stadiums?: number; matches?: number }; live_matches_count?: number }

interface LiveMatch { id: number; home_team?: { name: string; logo_thumbnail_url?: string }; away_team?: { name: string; logo_thumbnail_url?: string }; match?: { home_score?: number; away_score?: number; current_minute?: number; events?: { id: number; minute?: number; type: string; player_name?: string }[] }; tournament?: { name: string; slug?: string }; stadium?: { name: string }; scheduled_at?: string }
interface LiveData { live?: LiveMatch[]; next?: LiveMatch }
interface CityItem { id: number; slug?: string; localized_name?: string; name?: string }

function useHomeData() {
  return useQuery<{ data: HomeData }>({
    queryKey: ['v1', 'home'],
    queryFn: () => get('/v1/home', { auth: false }),
    staleTime: 10 * 60 * 1000,
  });
}

function useStats() {
  return useQuery<{ teams?: number; stadiums?: number; matches?: number; live_matches?: number }>({
    queryKey: ['v1', 'stats'],
    queryFn: () => get('/v1/stats', { auth: false }),
    staleTime: 5 * 60 * 1000,
  });
}

function useLiveTournamentMatches() {
  return useQuery<{ data: LiveData }>({
    queryKey: ['v1', 'live-tournament'],
    queryFn: () => get('/v1/live-tournament-matches', { auth: false }),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });
}

function useCities() {
  return useQuery<{ cities: CityItem[] } | CityItem[]>({
    queryKey: ['cities', 'select'],
    queryFn: () => get<{ cities: CityItem[] } | CityItem[]>('/cities/select', { params: { active_only: true }, auth: false }),
    staleTime: 30 * 60 * 1000,
  });
}

function useManagerOpenMatches(enabled: boolean) {
  return useQuery({
    queryKey: ['manager', 'open-matches'],
    queryFn: () => get('/manager/my-match-requests', { params: { status: 'open' } }),
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

// ─── Mini components ───────────────────────────────────────────────────────

function SectionLabel({ color = G.green }: { color?: string }) {
  return <View style={[styles.sectionLabel, { backgroundColor: color }]} />;
}

function SectionHead({ title, subtitle, onViewAll, labelColor }: { title: string; subtitle?: string; onViewAll?: () => void; labelColor?: string }) {
  return (
    <View style={styles.sectionHeadRow}>
      <View style={{ flex: 1 }}>
        <SectionLabel color={labelColor} />
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {onViewAll ? (
        <TouchableOpacity onPress={onViewAll} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Text style={styles.viewAllText}>عرض الكل</Text>
          <ChevronRight size={14} color={G.green2} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function SkeletonCard({ width = SW * 0.82, height = 280 }: { width?: number; height?: number }) {
  return <View style={[styles.skeleton, { width, height }]} />;
}

function LiveDot() {
  return (
    <View style={styles.liveDotWrap}>
      <View style={styles.liveDotPing} />
      <View style={styles.liveDot} />
    </View>
  );
}

function TeamInitials({ name, logoUrl, size = 48 }: { name?: string; logoUrl?: string; size?: number }) {
  const [err, setErr] = useState(false);
  const resolved = resolveImageUrl(logoUrl);
  const initials = (name ?? '?').trim().charAt(0).toUpperCase();
  if (resolved && !err) {
    return (
      <Image
        source={{ uri: resolved }}
        style={{ width: size, height: size, borderRadius: 10 }}
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <View style={[styles.teamInitials, { width: size, height: size, borderRadius: 10 }]}>
      <Text style={[styles.teamInitialsText, { fontSize: size * 0.4 }]}>{initials}</Text>
    </View>
  );
}

// ─── Interactive Calendar Picker ──────────────────────────────────────────────

function CalendarPicker({
  selectedDate,
  onSelectDate,
  onClose,
}: {
  selectedDate: string;
  onSelectDate: (d: string) => void;
  onClose: () => void;
}) {
  const ARABIC_MONTHS = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'ماي', 'يونيو',
    'يوليو', 'غشت', 'شتنبر', 'أكتوبر', 'نونبر', 'دجنبر',
  ];
  const ARABIC_WEEKDAYS = ['أح', 'إث', 'ثل', 'أر', 'خم', 'جم', 'سب'];
  const FULL_WEEKDAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonthIndex, setCurrentMonthIndex] = useState(today.getMonth());

  const daysInMonth = new Date(currentYear, currentMonthIndex + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonthIndex, 1).getDay();

  const handlePrevMonth = () => {
    if (currentMonthIndex === 0) {
      setCurrentYear((y) => y - 1);
      setCurrentMonthIndex(11);
    } else {
      setCurrentMonthIndex((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonthIndex === 11) {
      setCurrentYear((y) => y + 1);
      setCurrentMonthIndex(0);
    } else {
      setCurrentMonthIndex((m) => m + 1);
    }
  };

  const dayCells = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    dayCells.push({ key: `blank-${i}`, dayNum: null });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    dayCells.push({ key: `day-${d}`, dayNum: d });
  }

  const handleSelectDay = (dayNum: number) => {
    const d = new Date(currentYear, currentMonthIndex, dayNum);
    const dayOfWeekName = FULL_WEEKDAYS[d.getDay()];
    const monthName = ARABIC_MONTHS[currentMonthIndex];
    const formatted = `${dayOfWeekName} ${dayNum} ${monthName} ${currentYear}`;
    onSelectDate(formatted);
    onClose();
  };

  const isDayDisabled = (dayNum: number) => {
    const d = new Date(currentYear, currentMonthIndex, dayNum, 23, 59, 59);
    return d < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  return (
    <View style={styles.calendarWrap}>
      {/* Header Month / Nav */}
      <View style={styles.calendarHeaderRow}>
        <TouchableOpacity onPress={handlePrevMonth} style={styles.calNavBtn}>
          <ChevronRight size={18} color={G.slate700} />
        </TouchableOpacity>

        <Text style={styles.calMonthTitle}>
          {ARABIC_MONTHS[currentMonthIndex]} {currentYear}
        </Text>

        <TouchableOpacity onPress={handleNextMonth} style={styles.calNavBtn}>
          <ChevronLeft size={18} color={G.slate700} />
        </TouchableOpacity>
      </View>

      {/* Weekdays */}
      <View style={styles.calWeekdaysRow}>
        {ARABIC_WEEKDAYS.map((w, idx) => (
          <Text key={idx} style={styles.calWeekdayText}>{w}</Text>
        ))}
      </View>

      {/* Days Grid */}
      <View style={styles.calGrid}>
        {dayCells.map((item) => {
          if (!item.dayNum) {
            return <View key={item.key} style={styles.calDayCellEmpty} />;
          }
          const disabled = isDayDisabled(item.dayNum);
          const monthName = ARABIC_MONTHS[currentMonthIndex];
          const isSelected = selectedDate.includes(`${item.dayNum} ${monthName}`);

          return (
            <TouchableOpacity
              key={item.key}
              disabled={disabled}
              onPress={() => handleSelectDay(item.dayNum!)}
              style={[
                styles.calDayCell,
                isSelected && styles.calDayCellSelected,
                disabled && styles.calDayCellDisabled,
              ]}
            >
              <Text
                style={[
                  styles.calDayText,
                  isSelected && styles.calDayTextSelected,
                  disabled && styles.calDayTextDisabled,
                ]}
              >
                {item.dayNum}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

// ─── Hourly Time Picker ───────────────────────────────────────────────────────

function HourlyTimePicker({
  selectedTime,
  onSelectTime,
  onClose,
}: {
  selectedTime: string;
  onSelectTime: (t: string) => void;
  onClose: () => void;
}) {
  return (
    <ScrollView style={{ maxHeight: 340 }}>
      {HOURLY_SECTIONS.map((sec) => {
        const IconComp = sec.icon;
        return (
          <View key={sec.title} style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <IconComp size={16} color={G.green2} />
              <Text style={styles.hourlySectionTitle}>{sec.title}</Text>
            </View>

            <View style={styles.hourlyGrid}>
              {sec.slots.map((slot) => {
                const label = `${slot} (${sec.title})`;
                const isSelected = selectedTime === label || selectedTime.startsWith(slot);
                return (
                  <TouchableOpacity
                    key={slot}
                    onPress={() => {
                      onSelectTime(label);
                      onClose();
                    }}
                    style={[styles.hourlySlotPill, isSelected && styles.hourlySlotPillSelected]}
                  >
                    <Text style={[styles.hourlySlotText, isSelected && styles.hourlySlotTextSelected]}>{slot}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

// ─── Pitch SVG illustration (WhyUs CTA) ───────────────────────────────────

function PitchIllustration() {
  return (
    <Svg viewBox="0 0 640 500" width="100%" height={220}>
      <Defs>
        <LinearGradient id="turf" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#15803d" />
          <Stop offset="100%" stopColor="#052e16" />
        </LinearGradient>
      </Defs>
      <Ellipse cx={320} cy={470} rx={240} ry={26} fill="#000000" opacity={0.55} />
      <Path d="M110,215 L530,215 L612,475 L28,475 Z" fill="url(#turf)" />
      <Path d="M250,80 L390,80 L390,212 L250,212 Z" fill="rgba(255,255,255,0.05)" />
      <Path d="M250,80 L250,212 M390,80 L390,212 M250,80 L390,80" stroke="#f8fafc" strokeWidth={5} strokeLinecap="round" />
      <Path d="M110,215 L530,215 L612,475 L28,475 Z" stroke="#fff" strokeWidth={2.5} fill="none" opacity={0.75} strokeLinejoin="round" />
      <Line x1={320} y1={215} x2={320} y2={475} stroke="#fff" strokeWidth={2.5} opacity={0.75} />
      <Ellipse cx={320} cy={345} rx={62} ry={20} stroke="#fff" strokeWidth={2.5} fill="none" opacity={0.75} />
    </Svg>
  );
}

// ─── Section 1: HERO ──────────────────────────────────────────────────────

interface HeroProps {
  stats?: { teams?: number; stadiums?: number; matches?: number };
  liveCount?: number;
  selectedCity: string;
  selectedDate: string;
  selectedTime: string;
  onSelectCity: (city: string) => void;
  onSelectDate: (date: string) => void;
  onSelectTime: (time: string) => void;
  onPerformSearch: () => void;
  isFilterActive: boolean;
  onResetSearch: () => void;
}

function HeroSection({
  stats,
  liveCount,
  selectedCity,
  selectedDate,
  selectedTime,
  onSelectCity,
  onSelectDate,
  onSelectTime,
  onPerformSearch,
  isFilterActive,
  onResetSearch,
}: HeroProps) {
  const { sessionState, role } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [cityModalOpen, setCityModalOpen] = useState(false);
  const [dateModalOpen, setDateModalOpen] = useState(false);
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [citySearchQuery, setCitySearchQuery] = useState('');

  // Fetch active cities from backend (like simpleFrontend)
  const { data: citiesData } = useCities();

  const activeCitiesList = useMemo(() => {
    const raw = (citiesData as any)?.cities || (Array.isArray(citiesData) ? citiesData : []);
    if (Array.isArray(raw) && raw.length > 0) {
      return raw.map((c: any) => c.localized_name || c.name || c.slug || c);
    }
    return FALLBACK_CITIES;
  }, [citiesData]);

  // Popular cities pills
  const popularCities = useMemo(() => activeCitiesList.slice(0, 6), [activeCitiesList]);

  // Filtered city modal list
  const filteredModalCities = useMemo(() => {
    if (!citySearchQuery.trim()) return activeCitiesList;
    const q = citySearchQuery.trim().toLowerCase();
    return activeCitiesList.filter((c: string) => c.toLowerCase().includes(q));
  }, [activeCitiesList, citySearchQuery]);

  return (
    <View style={styles.hero}>
      <ImageBackground
        source={{ uri: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=900&auto=format&fit=crop' }}
        style={styles.heroBg}
        resizeMode="cover"
      >
        <View style={styles.heroOverlay} />
        <View style={styles.heroGlow} />

        <View style={[styles.heroContent, { paddingTop: Math.max(16, insets.top) }]}>
          {/* Brand header */}
          <View style={styles.heroNav}>
            <BrandLogoMark size={36} />
            <Text style={styles.heroBrand}>FootMANAGER</Text>
            <View style={{ flex: 1 }} />
            {sessionState === 'authenticated' && role ? (
              <Pressable onPress={() => router.push(homeForRole(role) as never)} style={styles.heroLoginBtn}>
                <Text style={styles.heroLoginText}>لوحتي</Text>
              </Pressable>
            ) : (
              <Link href="/(auth)" asChild>
                <Pressable style={styles.heroLoginBtn}>
                  <Text style={styles.heroLoginText}>تسجيل الدخول</Text>
                </Pressable>
              </Link>
            )}
          </View>

          {/* Title */}
          <View style={styles.heroTitleBlock}>
            <Text style={styles.heroTitle}>احجز ملعبك</Text>
            <Text style={styles.heroTitle}>ونظّم مباراتك</Text>
            <Text style={styles.heroSubtitle}>
              المنصة الرقمية للفرق الهواة في المغرب — احجز الملاعب ونظّم المباريات
            </Text>
          </View>

          {/* Functional Search box */}
          <View style={styles.searchBoxCard}>
            <View style={styles.searchFieldsColumn}>
              {/* City selector field */}
              <Pressable onPress={() => setCityModalOpen(true)} style={styles.searchFieldRow}>
                <View style={styles.searchFieldIcon}>
                  <MapPin size={18} color={G.green2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchFieldLabel}>المدينة</Text>
                  <Text style={[styles.searchFieldValue, { color: selectedCity ? G.slate900 : G.slate400 }]} numberOfLines={1}>
                    {selectedCity || 'اختر مدينة'}
                  </Text>
                </View>
                {selectedCity ? (
                  <Pressable onPress={(e) => { e.stopPropagation(); onSelectCity(''); }} style={styles.clearIconBtn}>
                    <X size={14} color={G.slate400} />
                  </Pressable>
                ) : (
                  <ChevronRight size={16} color={G.slate400} />
                )}
              </Pressable>

              <View style={styles.searchFieldDivider} />

              {/* Date selector field */}
              <Pressable onPress={() => setDateModalOpen(true)} style={styles.searchFieldRow}>
                <View style={styles.searchFieldIcon}>
                  <Calendar size={18} color={G.green2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchFieldLabel}>التاريخ</Text>
                  <Text style={[styles.searchFieldValue, { color: selectedDate ? G.slate900 : G.slate400 }]} numberOfLines={1}>
                    {selectedDate || 'اختر تاريخ من التقويم'}
                  </Text>
                </View>
                {selectedDate ? (
                  <Pressable onPress={(e) => { e.stopPropagation(); onSelectDate(''); }} style={styles.clearIconBtn}>
                    <X size={14} color={G.slate400} />
                  </Pressable>
                ) : (
                  <ChevronRight size={16} color={G.slate400} />
                )}
              </Pressable>

              <View style={styles.searchFieldDivider} />

              {/* Time selector field */}
              <Pressable onPress={() => setTimeModalOpen(true)} style={styles.searchFieldRow}>
                <View style={styles.searchFieldIcon}>
                  <Clock size={18} color={G.green2} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.searchFieldLabel}>الوقت بالساعة</Text>
                  <Text style={[styles.searchFieldValue, { color: selectedTime ? G.slate900 : G.slate400 }]} numberOfLines={1}>
                    {selectedTime || 'اختر وقت (بالساعة)'}
                  </Text>
                </View>
                {selectedTime ? (
                  <Pressable onPress={(e) => { e.stopPropagation(); onSelectTime(''); }} style={styles.clearIconBtn}>
                    <X size={14} color={G.slate400} />
                  </Pressable>
                ) : (
                  <ChevronRight size={16} color={G.slate400} />
                )}
              </Pressable>
            </View>

            {/* Action buttons row */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {isFilterActive ? (
                <Pressable onPress={onResetSearch} style={styles.resetSearchBtn}>
                  <RotateCcw size={16} color={G.slate700} />
                  <Text style={styles.resetSearchBtnText}>إعادة الضبط</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={onPerformSearch} style={[styles.searchBtn, { flex: 1 }]}>
                <Search size={18} color={G.white} />
                <Text style={styles.searchBtnText}>بحث</Text>
              </Pressable>
            </View>
          </View>

          {/* Popular cities */}
          <View style={{ alignItems: 'center', marginTop: 14, gap: 8 }}>
            <Text style={styles.popularLabel}>المدن الشائعة</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {popularCities.map((c: string) => (
                <Pressable
                  key={c}
                  onPress={() => {
                    onSelectCity(c);
                  }}
                  style={[styles.cityPill, selectedCity === c && styles.cityPillActive]}
                >
                  <Text style={[styles.cityPillText, selectedCity === c && styles.cityPillTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      </ImageBackground>

      {/* Responsive Live stats bar */}
      <View style={styles.statsBarContainer}>
        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Users size={16} color={G.green} />
          </View>
          <View>
            <Text style={styles.statLabel}>الفرق</Text>
            <Text style={styles.statValue}>{stats?.teams ?? '…'}</Text>
          </View>
        </View>

        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Landmark size={16} color={G.green} />
          </View>
          <View>
            <Text style={styles.statLabel}>الملاعب</Text>
            <Text style={styles.statValue}>{stats?.stadiums ?? '…'}</Text>
          </View>
        </View>

        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Trophy size={16} color={G.green} />
          </View>
          <View>
            <Text style={styles.statLabel}>المباريات</Text>
            <Text style={styles.statValue}>{stats?.matches ?? '…'}</Text>
          </View>
        </View>

        <View style={styles.livePill}>
          <LiveDot />
          <Text style={styles.livePillCount}>{liveCount ?? '…'}</Text>
          <Text style={styles.livePillLabel}>مباشر</Text>
        </View>
      </View>

      {/* City Selection Modal */}
      <Modal visible={cityModalOpen} animationType="slide" transparent onRequestClose={() => setCityModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>اختر المدينة</Text>
              <Pressable onPress={() => setCityModalOpen(false)} style={styles.modalCloseBtn}>
                <X size={18} color={G.slate600} />
              </Pressable>
            </View>

            <View style={styles.modalSearchInputWrap}>
              <Search size={16} color={G.slate400} />
              <TextInput
                value={citySearchQuery}
                onChangeText={setCitySearchQuery}
                placeholder="ابحث عن مدينة..."
                placeholderTextColor={G.slate400}
                style={styles.modalSearchInput}
                autoCapitalize="none"
              />
            </View>

            <ScrollView style={{ maxHeight: 320 }} keyboardShouldPersistTaps="handled">
              {filteredModalCities.map((city: string) => {
                const isSelected = selectedCity === city;
                return (
                  <Pressable
                    key={city}
                    onPress={() => {
                      onSelectCity(city);
                      setCityModalOpen(false);
                    }}
                    style={[styles.modalItemRow, isSelected && styles.modalItemRowSelected]}
                  >
                    <MapPin size={16} color={isSelected ? G.green2 : G.slate400} />
                    <Text style={[styles.modalItemText, isSelected && styles.modalItemTextSelected]}>{city}</Text>
                    {isSelected && <Check size={16} color={G.green2} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Calendar Date Picker Modal */}
      <Modal visible={dateModalOpen} animationType="slide" transparent onRequestClose={() => setDateModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>تقويم اختيار التاريخ</Text>
              <Pressable onPress={() => setDateModalOpen(false)} style={styles.modalCloseBtn}>
                <X size={18} color={G.slate600} />
              </Pressable>
            </View>

            <CalendarPicker
              selectedDate={selectedDate}
              onSelectDate={onSelectDate}
              onClose={() => setDateModalOpen(false)}
            />
          </View>
        </View>
      </Modal>

      {/* Hourly Time Picker Modal */}
      <Modal visible={timeModalOpen} animationType="slide" transparent onRequestClose={() => setTimeModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>اختر الوقت بالساعة</Text>
              <Pressable onPress={() => setTimeModalOpen(false)} style={styles.modalCloseBtn}>
                <X size={18} color={G.slate600} />
              </Pressable>
            </View>

            <HourlyTimePicker
              selectedTime={selectedTime}
              onSelectTime={onSelectTime}
              onClose={() => setTimeModalOpen(false)}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Section 2: MY SECTION (authenticated managers/owners) ────────────────

function MySection() {
  const { role, sessionState } = useAuth();
  const isManager = sessionState === 'authenticated' && role === 'manager';
  const { data, isLoading } = useManagerOpenMatches(isManager);
  if (!isManager) return null;
  const match = (data as any)?.match_requests?.[0];

  return (
    <View style={[styles.section, { backgroundColor: G.bg }]}>
      <View style={styles.sectionInner}>
        <SectionHead title="طلباتي المفتوحة" subtitle="مباريات ودية في انتظار خصم" />
        {isLoading ? (
          <View style={[styles.skeleton, { height: 170, borderRadius: 20 }]} />
        ) : match ? (
          <View style={styles.managerCard}>
            <View style={styles.row}>
              <View style={styles.seekingBadge}><Text style={styles.seekingBadgeText}>يبحث عن خصم</Text></View>
              <View style={styles.levelBadge}>
                <Trophy size={12} color={G.white} />
                <Text style={styles.levelBadgeText}>{match.level ?? 'متوسط'}</Text>
              </View>
            </View>
            <Text style={styles.managerCardTeam} numberOfLines={1}>{match.team?.name ?? 'فريقك'}</Text>
            <View style={[styles.row, { gap: 16, marginTop: 8 }]}>
              <View style={styles.row}>
                <Calendar size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.managerCardMeta}> {match.preferred_day ?? '–'} {match.preferred_time ?? ''}</Text>
              </View>
              <View style={styles.row}>
                <MapPin size={14} color="rgba(255,255,255,0.7)" />
                <Text style={styles.managerCardMeta}> {match.city ?? '–'}</Text>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.emptyDashed}>
            <Text style={styles.emptyText}>لا توجد طلبات مفتوحة حالياً</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Section 3: AVAILABLE FIELDS ─────────────────────────────────────────

function FieldCard({ stadium, onBook }: { stadium: Stadium; onBook: (s: Stadium) => void }) {
  const [liked, setLiked] = useState(false);
  const thumb = stadium.images?.find((i) => i.is_thumbnail)?.thumbnail_url
    ?? stadium.images?.[0]?.thumbnail_url
    ?? stadium.images?.[0]?.image_url;
  const resolvedThumb = resolveImageUrl(thumb);

  return (
    <View style={styles.fieldCard}>
      <View style={styles.fieldCardImg}>
        {resolvedThumb ? (
          <Image source={{ uri: resolvedThumb }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: G.slate800 }]} />
        )}
        <View style={styles.fieldCardOverlay} />
        <View style={styles.fieldCardBadgeRow}>
          <View style={styles.availBadge}><Text style={styles.availBadgeText}>متاح</Text></View>
          <Pressable onPress={() => setLiked((p) => !p)} style={styles.likeBtn}>
            <Heart size={16} color={liked ? '#ef4444' : G.white} fill={liked ? '#ef4444' : 'transparent'} />
          </Pressable>
        </View>
        {stadium.type ? (
          <View style={styles.formatBadge}>
            <MapPin size={11} color={G.white} />
            <Text style={styles.formatBadgeText}>{stadium.type}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.fieldCardBody}>
        {stadium.rating != null ? (
          <View style={[styles.row, { gap: 4, marginBottom: 4 }]}>
            <Star size={14} color={G.amber} fill={G.amber} />
            <Text style={styles.ratingText}>{stadium.rating}</Text>
          </View>
        ) : null}
        <Text style={styles.fieldCardName} numberOfLines={1}>{stadium.name}</Text>
        <View style={[styles.row, { gap: 4, marginTop: 4 }]}>
          <MapPin size={13} color={G.slate400} />
          <Text style={styles.fieldCardCity} numberOfLines={1}>{stadium.city ?? stadium.location ?? '–'}</Text>
        </View>
        <View style={[styles.row, { gap: 4, marginTop: 4 }]}>
          <Clock size={13} color={G.slate400} />
          <Text style={styles.fieldCardOpen}>{stadium.is_open ? 'مفتوح الآن' : 'مغلق'}</Text>
        </View>
        <View style={[styles.row, { justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: G.slate100 }]}>
          <View>
            <Text style={styles.fieldPrice}>{stadium.price_per_hour ?? '–'} <Text style={styles.fieldCurrency}>درهم</Text></Text>
            <Text style={styles.fieldPerHour}>في الساعة</Text>
          </View>
          <Pressable onPress={() => onBook(stadium)} style={styles.bookBtn}>
            <Calendar size={14} color={G.white} />
            <Text style={styles.bookBtnText}>احجز</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

function AvailableFieldsSection({ stadiums, loading, filterCity }: { stadiums: Stadium[]; loading: boolean; filterCity?: string }) {
  const router = useRouter();

  const filtered = useMemo(() => {
    if (!filterCity) return stadiums;
    const q = filterCity.trim().toLowerCase();
    return stadiums.filter((s) => (s.city || s.location || '').toLowerCase().includes(q));
  }, [stadiums, filterCity]);

  return (
    <View style={[styles.section, { backgroundColor: G.white }]}>
      <View style={styles.sectionInner}>
        <SectionHead
          title="الملاعب المتاحة"
          subtitle={filterCity ? `نتائج تصفية بالمدينة: ${filterCity}` : 'ملاعب متميزة لحجز فوري'}
          onViewAll={() => router.push('/(public)/fields' as never)}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16, paddingBottom: 4 }} style={{ marginTop: 20 }}>
        {loading ? [1, 2, 3].map((i) => <SkeletonCard key={i} height={360} />) : filtered.length === 0 ? (
          <View style={styles.emptyDashed}>
            <Text style={styles.emptyText}>{filterCity ? `لا توجد ملاعب متاحة في ${filterCity}` : 'لا توجد ملاعب حالياً'}</Text>
          </View>
        ) : filtered.map((s) => <FieldCard key={s.id} stadium={s} onBook={() => router.push('/(public)/fields' as never)} />)}
      </ScrollView>
    </View>
  );
}

// ─── Section 4: MATCH REQUESTS ────────────────────────────────────────────

const ACCENTS = ['#059669', '#ea580c', '#2563eb', '#7c3aed'];

function MatchCard({ match, accent, onChallenge }: { match: MatchRequest; accent: string; onChallenge: (m: MatchRequest) => void }) {
  const days: Record<string, string> = { saturday: 'السبت', sunday: 'الأحد', monday: 'الاثنين', tuesday: 'الثلاثاء', wednesday: 'الأربعاء', thursday: 'الخميس', friday: 'الجمعة' };
  const levels: Record<string, string> = { beginner: 'مبتدئ', intermediate: 'متوسط', good: 'جيد', veryGood: 'جيد جداً', excellent: 'ممتاز' };

  return (
    <View style={[styles.matchCard, { borderColor: G.slate100 }]}>
      <View style={styles.matchCardStatus}>
        <View style={[styles.matchStatusBadge, { backgroundColor: '#dcfce7' }]}>
          <Text style={{ color: '#16a34a', fontSize: 10, fontWeight: '700' }}>يبحث</Text>
        </View>
      </View>
      <View style={[styles.matchCardAvatar, { backgroundColor: accent + '20' }]}>
        <Users size={36} color={accent} />
      </View>
      <Text style={styles.matchCardTeam} numberOfLines={1}>{match.team?.name ?? 'فريق غير معروف'}</Text>
      <View style={[styles.row, { justifyContent: 'center', gap: 4, marginTop: 4 }]}>
        <Trophy size={12} color={G.slate400} />
        <Text style={styles.matchCardLevel}>{levels[match.level ?? ''] ?? match.level ?? '–'}</Text>
      </View>
      <View style={[styles.row, { justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: G.slate100, paddingTop: 12, marginTop: 14 }]}>
        <View style={styles.row}>
          <Calendar size={12} color={G.slate400} />
          <Text style={styles.matchCardMeta}> {days[match.preferred_day ?? ''] ?? match.preferred_day ?? '–'}</Text>
        </View>
        <View style={styles.row}>
          <MapPin size={12} color={G.slate400} />
          <Text style={styles.matchCardMeta}> {match.city ?? '–'}</Text>
        </View>
      </View>
      <View style={styles.row}>
        <View style={[styles.matchCardFormat, { backgroundColor: G.slate100 }]}>
          <Text style={styles.matchCardFormatText}>{match.format ?? 'ودية'}</Text>
        </View>
        {match.stadium?.name ? (
          <View style={[styles.matchCardFormat, { backgroundColor: G.slate100 }]}>
            <Landmark size={10} color={G.slate500} />
            <Text style={styles.matchCardFormatText}> {match.stadium.name}</Text>
          </View>
        ) : null}
      </View>
      <Pressable onPress={() => onChallenge(match)} style={[styles.challengeBtn, { borderColor: accent }]}>
        <Trophy size={16} color={accent} />
        <Text style={[styles.challengeBtnText, { color: accent }]}>إرسال تحدي</Text>
      </Pressable>
    </View>
  );
}

function MatchesSection({ matches, loading, filterCity }: { matches: MatchRequest[]; loading: boolean; filterCity?: string }) {
  const router = useRouter();
  const { sessionState } = useAuth();

  const filtered = useMemo(() => {
    if (!filterCity) return matches;
    const q = filterCity.trim().toLowerCase();
    return matches.filter((m) => (m.city || '').toLowerCase().includes(q));
  }, [matches, filterCity]);

  const handleChallenge = (m: MatchRequest) => {
    if (sessionState !== 'authenticated') {
      router.push('/(auth)' as never);
    } else {
      router.push('/(public)/matches' as never);
    }
  };

  return (
    <View style={[styles.section, { backgroundColor: G.white }]}>
      <View style={styles.sectionInner}>
        <SectionHead
          title="طلبات مباريات"
          subtitle={filterCity ? `مباريات متاحة في ${filterCity}` : 'فرق تبحث عن خصم الآن'}
          onViewAll={() => router.push('/(public)/matches' as never)}
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16, paddingBottom: 4 }} style={{ marginTop: 20 }}>
        {loading ? [1, 2].map((i) => <SkeletonCard key={i} height={280} />) : filtered.length === 0 ? (
          <View style={styles.emptyDashed}>
            <Text style={styles.emptyText}>{filterCity ? `لا توجد طلبات مباريات في ${filterCity}` : 'لا توجد طلبات مباريات حالياً'}</Text>
          </View>
        ) : filtered.map((m, i) => <MatchCard key={m.id} match={m} accent={ACCENTS[i % ACCENTS.length]!} onChallenge={handleChallenge} />)}
      </ScrollView>
    </View>
  );
}

// ─── Section 5: TOURNAMENTS ───────────────────────────────────────────────

function TournamentCard({ t }: { t: { id: number; name: string; status: string; description?: string | null; teams_count?: number | null; start_date?: string | null; logo_url?: string | null; cover_url?: string | null } }) {
  const router = useRouter();
  const statusColor: Record<string, string> = { registration_open: '#22c55e', ongoing: '#3b82f6', upcoming: '#f59e0b' };
  const statusLabel: Record<string, string> = { registration_open: 'التسجيل مفتوح', ongoing: 'جارية', upcoming: 'قريباً' };
  const coverResolved = resolveImageUrl(t.cover_url);

  return (
    <View style={styles.tournamentCard}>
      <View style={styles.tournamentCardHeader}>
        {coverResolved ? (
          <Image source={{ uri: coverResolved }} style={StyleSheet.absoluteFill} resizeMode="cover" />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: G.slate800 }]} />
        )}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(15,23,42,0.55)' }]} />
        <View style={[styles.tStatusBadge, { backgroundColor: (statusColor[t.status] ?? G.slate500) + '25', borderColor: (statusColor[t.status] ?? G.slate500) + '60' }]}>
          <View style={[styles.tStatusDot, { backgroundColor: statusColor[t.status] ?? G.slate500 }]} />
          <Text style={[styles.tStatusText, { color: statusColor[t.status] ?? G.slate400 }]}>{statusLabel[t.status] ?? t.status}</Text>
        </View>
      </View>
      <View style={styles.tournamentCardBody}>
        <Text style={styles.tName} numberOfLines={2}>{t.name}</Text>
        {t.description ? <Text style={styles.tDesc} numberOfLines={2}>{t.description}</Text> : null}
        <View style={[styles.row, { gap: 12, marginTop: 10 }]}>
          {t.teams_count != null ? (
            <View style={styles.row}><Users size={12} color={G.slate400} /><Text style={styles.tMeta}> {t.teams_count} فريق</Text></View>
          ) : null}
          {t.start_date ? (
            <View style={styles.row}><Calendar size={12} color={G.slate400} /><Text style={styles.tMeta}> {t.start_date}</Text></View>
          ) : null}
        </View>
        <Pressable onPress={() => router.push('/(public)/tournaments' as never)} style={styles.tJoinBtn}>
          <Text style={styles.tJoinBtnText}>انضم للبطولة</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TournamentsSection() {
  const router = useRouter();
  const { data, isLoading } = usePublicTournaments();
  const tournaments = (data?.data ?? []).filter((t) => !['completed', 'cancelled'].includes(t.status));

  return (
    <View style={[styles.section, { backgroundColor: G.bg }]}>
      <View style={styles.sectionInner}>
        <SectionHead title="البطولات" subtitle="شارك مع فريقك في البطولات الحية" onViewAll={() => router.push('/(public)/tournaments' as never)} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16, paddingBottom: 4 }} style={{ marginTop: 20 }}>
        {isLoading ? [1, 2].map((i) => <SkeletonCard key={i} height={260} width={SW * 0.78} />) : tournaments.length === 0 ? (
          <View style={styles.emptyDashed}><Text style={styles.emptyText}>لا توجد بطولات حالياً</Text></View>
        ) : tournaments.map((t) => <TournamentCard key={t.id} t={t} />)}
      </ScrollView>
    </View>
  );
}

// ─── Section 6: LIVE & NEXT ───────────────────────────────────────────────

function LiveCard({ f }: { f: LiveMatch }) {
  const router = useRouter();
  const m = f.match ?? {};
  const events = m.events ?? [];
  const EVENT_ICON: Record<string, string> = { goal: '⚽', own_goal: '⚽', yellow_card: '🟨', red_card: '🟥', substitution: '🔄' };

  return (
    <View style={styles.liveCard}>
      <View style={[styles.row, { justifyContent: 'space-between' }]}>
        <View style={styles.tBadgeRow}>
          <Trophy size={11} color={G.slate400} />
          <Text style={styles.liveCardTournament} numberOfLines={1}>{f.tournament?.name ?? '–'}</Text>
        </View>
        <View style={styles.liveBadge}>
          <LiveDot />
          <Text style={styles.liveBadgeText}>مباشر{(m.current_minute ?? 0) > 0 ? ` ${m.current_minute}'` : ''}</Text>
        </View>
      </View>
      <View style={[styles.row, { justifyContent: 'center', gap: 16, marginTop: 16 }]}>
        <View style={{ alignItems: 'center', gap: 6, flex: 1 }}>
          <TeamInitials name={f.home_team?.name} logoUrl={f.home_team?.logo_thumbnail_url} />
          <Text style={styles.liveTeamName} numberOfLines={2}>{f.home_team?.name ?? '–'}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.liveScore}>{m.home_score ?? 0} - {m.away_score ?? 0}</Text>
          <Text style={styles.liveScoreLabel}>مباشر</Text>
        </View>
        <View style={{ alignItems: 'center', gap: 6, flex: 1 }}>
          <TeamInitials name={f.away_team?.name} logoUrl={f.away_team?.logo_thumbnail_url} />
          <Text style={styles.liveTeamName} numberOfLines={2}>{f.away_team?.name ?? '–'}</Text>
        </View>
      </View>
      {f.stadium?.name ? (
        <View style={[styles.row, { justifyContent: 'center', gap: 4, marginTop: 10 }]}>
          <Landmark size={11} color={G.slate400} /><Text style={styles.liveCardStadium}>{f.stadium.name}</Text>
        </View>
      ) : null}
      {events.length > 0 ? (
        <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: G.slate100, paddingTop: 10 }}>
          <Text style={styles.eventsLabel}>أحداث أخيرة</Text>
          {events.slice(0, 3).map((e) => (
            <View key={e.id} style={[styles.row, { gap: 6, marginTop: 4 }]}>
              <Text style={{ width: 24, textAlign: 'right', fontSize: 11, fontWeight: '700', color: G.slate400 }}>{e.minute ?? 0}'</Text>
              <Text style={{ fontSize: 12 }}>{EVENT_ICON[e.type] ?? '•'}</Text>
              <Text style={{ flex: 1, fontSize: 11, color: G.slate700, fontWeight: '600' }}>{e.player_name ?? ''}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <Pressable onPress={() => router.push('/(public)/tournaments' as never)} style={styles.watchBtn}>
        <Radio size={14} color={G.white} />
        <Text style={styles.watchBtnText}>تابع المباراة</Text>
      </Pressable>
    </View>
  );
}

function NextCard({ f }: { f: LiveMatch }) {
  return (
    <View style={styles.nextCard}>
      <View style={[styles.row, { justifyContent: 'space-between', marginBottom: 14 }]}>
        <View style={[styles.row, { gap: 5, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }]}>
          <Clock size={11} color={G.amber} />
          <Text style={{ color: G.white, fontSize: 10, fontWeight: '700' }}>القادم</Text>
        </View>
        <View style={[styles.row, { gap: 5, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 }]}>
          <Trophy size={11} color={G.emerald} />
          <Text style={{ color: G.emerald, fontSize: 10, fontWeight: '700' }} numberOfLines={1}>{f.tournament?.name ?? '–'}</Text>
        </View>
      </View>
      <View style={[styles.row, { justifyContent: 'center', gap: 16 }]}>
        <View style={{ alignItems: 'center', gap: 8, flex: 1 }}>
          <TeamInitials name={f.home_team?.name} logoUrl={f.home_team?.logo_thumbnail_url} />
          <Text style={{ color: G.white, fontSize: 13, fontWeight: '800', textAlign: 'center' }} numberOfLines={2}>{f.home_team?.name ?? '–'}</Text>
        </View>
        <Text style={{ color: G.amber, fontSize: 18, fontWeight: '900' }}>VS</Text>
        <View style={{ alignItems: 'center', gap: 8, flex: 1 }}>
          <TeamInitials name={f.away_team?.name} logoUrl={f.away_team?.logo_thumbnail_url} />
          <Text style={{ color: G.white, fontSize: 13, fontWeight: '800', textAlign: 'center' }} numberOfLines={2}>{f.away_team?.name ?? '–'}</Text>
        </View>
      </View>
      {f.scheduled_at ? (
        <View style={[styles.row, { justifyContent: 'center', gap: 12, marginTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 12 }]}>
          <View style={styles.row}><Calendar size={12} color={G.slate400} /><Text style={{ color: G.slate400, fontSize: 11 }}> {f.scheduled_at.substring(0, 10)}</Text></View>
          <View style={styles.row}><Clock size={12} color={G.slate400} /><Text style={{ color: G.slate400, fontSize: 11 }}> {f.scheduled_at.substring(11, 16)}</Text></View>
        </View>
      ) : null}
    </View>
  );
}

function LiveAndNextSection() {
  const { data, isLoading } = useLiveTournamentMatches();
  const live = data?.data?.live ?? [];
  const next = data?.data?.next ?? null;
  const hasContent = live.length > 0 || Boolean(next);

  return (
    <View style={[styles.section, { backgroundColor: G.bg }]}>
      <View style={styles.sectionInner}>
        <View style={styles.sectionHeadRow}>
          <View style={{ flex: 1 }}>
            <SectionLabel color={G.rose} />
            <View style={[styles.row, { gap: 8 }]}>
              <Text style={styles.sectionTitle}>مباشر</Text>
              <View style={[styles.row, { gap: 5 }]}>
                <Radio size={18} color={G.rose} />
              </View>
            </View>
            <Text style={styles.sectionSubtitle}>تابع المباريات الحية واكتشف القادم</Text>
          </View>
        </View>
      </View>
      <View style={{ paddingHorizontal: 20, gap: 12, marginTop: 20 }}>
        {isLoading ? (
          <>
            <SkeletonCard width={SW - 40} height={240} />
            <SkeletonCard width={SW - 40} height={200} />
          </>
        ) : !hasContent ? (
          <View style={styles.emptyDashed}>
            <Radio size={28} color={G.slate400} />
            <Text style={[styles.emptyText, { marginTop: 8 }]}>لا توجد مباريات مباشرة الآن</Text>
          </View>
        ) : (
          <>
            {live.map((f) => <LiveCard key={f.id} f={f} />)}
            {next ? <NextCard f={next} /> : null}
          </>
        )}
      </View>
    </View>
  );
}

// ─── Section 7: WHY US ────────────────────────────────────────────────────

const WHY_FEATURES = [
  { key: 'fast',      icon: Bolt,   title: 'سريع وسهل',       desc: 'احجز ملعبك في ثوانٍ من هاتفك' },
  { key: 'verified',  icon: Shield, title: 'موثوق ومضمون',    desc: 'كل الملاعب تم التحقق منها' },
  { key: 'price',     icon: Wallet, title: 'أسعار منافسة',    desc: 'أفضل الأسعار مضمونة' },
  { key: 'community', icon: Users,  title: 'مجتمع نشط',       desc: 'انضم لآلاف اللاعبين' },
];

function WhyUsSection() {
  const router = useRouter();
  const { role, sessionState } = useAuth();

  return (
    <View style={[styles.section, { backgroundColor: G.white, paddingBottom: 0 }]}>
      <View style={styles.sectionInner}>
        <View style={{ alignItems: 'center' }}>
          <SectionLabel />
          <Text style={[styles.sectionTitle, { textAlign: 'center', marginTop: 4 }]}>لماذا أجي نقصروا؟</Text>
          <Text style={[styles.sectionSubtitle, { textAlign: 'center' }]}>الحل الأمثل لتنظيم مباريات الهواة في المغرب</Text>
        </View>
      </View>

      {/* Feature 2×2 grid */}
      <View style={styles.whyGrid}>
        {WHY_FEATURES.map(({ key, icon: Icon, title, desc }) => (
          <View key={key} style={styles.whyCard}>
            <View style={styles.whyCardIcon}><Icon size={22} color={G.green2} /></View>
            <Text style={styles.whyCardTitle}>{title}</Text>
            <Text style={styles.whyCardDesc}>{desc}</Text>
          </View>
        ))}
      </View>

      {/* Dark CTA Banner */}
      <View style={styles.ctaBanner}>
        {/* Pitch illustration */}
        <View style={{ marginBottom: 10 }}>
          <PitchIllustration />
        </View>
        <Text style={styles.ctaTitle}>
          ابدأ رحلتك مع{' '}
          <Text style={{ color: G.green }}>أجي نقصروا</Text>
        </Text>
        <Text style={styles.ctaDesc}>سجّل حسابك مجاناً وانضم إلى مجتمع كرة القدم الهواة في المغرب</Text>
        <Pressable
          onPress={() => router.push(sessionState === 'authenticated' && role ? homeForRole(role) as never : '/(auth)/register' as never)}
          style={styles.ctaBtn}
        >
          <Text style={styles.ctaBtnText}>ابدأ مجاناً</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function LandingScreen(): React.JSX.Element {
  const insets = useSafeAreaInsets();
  const { data: homeData, isLoading: homeLoading } = useHomeData();
  const { data: statsData } = useStats();

  const home = (homeData as any)?.data as HomeData | undefined;
  const stadiums: Stadium[] = (home?.top_stadiums ?? []) as Stadium[];
  const matches: MatchRequest[] = (home?.latest_matches ?? []) as MatchRequest[];
  const stats = statsData as { teams?: number; stadiums?: number; matches?: number; live_matches?: number } | undefined;

  const { sessionState, role } = useAuth();
  const router = useRouter();

  // Hero Search state
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [activeFilter, setActiveFilter] = useState<{ city: string; date: string; time: string; active: boolean }>({
    city: '',
    date: '',
    time: '',
    active: false,
  });

  const handlePerformSearch = () => {
    setActiveFilter({
      city: selectedCity,
      date: selectedDate,
      time: selectedTime,
      active: Boolean(selectedCity || selectedDate || selectedTime),
    });
  };

  const handleResetSearch = () => {
    setSelectedCity('');
    setSelectedDate('');
    setSelectedTime('');
    setActiveFilter({ city: '', date: '', time: '', active: false });
  };

  return (
    <View style={{ flex: 1, backgroundColor: G.white }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(80, 80 + insets.bottom) }}>
        <HeroSection
          stats={stats}
          liveCount={stats?.live_matches}
          selectedCity={selectedCity}
          selectedDate={selectedDate}
          selectedTime={selectedTime}
          onSelectCity={(city) => {
            setSelectedCity(city);
            if (city) {
              setActiveFilter((prev) => ({ ...prev, city, active: true }));
            }
          }}
          onSelectDate={setSelectedDate}
          onSelectTime={setSelectedTime}
          onPerformSearch={handlePerformSearch}
          isFilterActive={activeFilter.active}
          onResetSearch={handleResetSearch}
        />
        <MySection />
        <AvailableFieldsSection stadiums={stadiums} loading={homeLoading} filterCity={activeFilter.active ? activeFilter.city : undefined} />
        <MatchesSection matches={matches} loading={homeLoading} filterCity={activeFilter.active ? activeFilter.city : undefined} />
        <TournamentsSection />
        <LiveAndNextSection />
        <WhyUsSection />
      </ScrollView>

      {/* Sticky bottom CTA for guests */}
      {sessionState !== 'authenticated' ? (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(14, insets.bottom) }]}>
          <Link href="/(auth)/register" asChild style={{ flex: 1 }}>
            <Pressable style={styles.bottomBarPrimary}>
              <Text style={styles.bottomBarPrimaryText}>إنشاء حساب</Text>
            </Pressable>
          </Link>
          <Link href="/(auth)" asChild style={{ flex: 1 }}>
            <Pressable style={styles.bottomBarSecondary}>
              <Text style={styles.bottomBarSecondaryText}>تسجيل الدخول</Text>
            </Pressable>
          </Link>
        </View>
      ) : (
        <View style={[styles.bottomBar, { paddingBottom: Math.max(14, insets.bottom) }]}>
          <Pressable onPress={() => router.push(homeForRole(role!) as never)} style={[styles.bottomBarPrimary, { flex: 1 }]}>
            <Text style={styles.bottomBarPrimaryText}>الانتقال إلى لوحة التحكم</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  section:        { paddingTop: 50, paddingBottom: 50 },
  sectionInner:   { paddingHorizontal: 20 },
  sectionHeadRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  sectionLabel:   { width: 40, height: 4, borderRadius: 4, marginBottom: 12 },
  sectionTitle:   { fontSize: 24, fontWeight: '900', color: G.slate900, lineHeight: 30 },
  sectionSubtitle:{ fontSize: 13, color: G.slate500, marginTop: 6, lineHeight: 18, maxWidth: 280 },
  viewAllText:    { fontSize: 13, fontWeight: '700', color: G.green2 },
  skeleton:       { borderRadius: 24, backgroundColor: G.slate200 },
  emptyDashed:    { borderWidth: 1.5, borderStyle: 'dashed', borderColor: G.slate200, borderRadius: 20, backgroundColor: G.white, paddingHorizontal: 24, paddingVertical: 40, alignItems: 'center', width: SW - 40 },
  emptyText:      { color: G.slate400, fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 8 },
  row:            { flexDirection: 'row', alignItems: 'center' },

  // HERO
  hero:           { overflow: 'hidden' },
  heroBg:         { minHeight: 460 },
  heroOverlay:    { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.65)' },
  heroGlow:       { position: 'absolute', top: -80, left: '25%', width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(34,197,94,0.10)' },
  heroContent:    { paddingHorizontal: 20, paddingBottom: 24, gap: 18 },
  heroNav:        { flexDirection: 'row', alignItems: 'center', gap: 10 },
  heroBrand:      { color: G.white, fontSize: 16, fontWeight: '800' },
  heroLoginBtn:   { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', backgroundColor: 'rgba(255,255,255,0.12)' },
  heroLoginText:  { color: G.white, fontSize: 12, fontWeight: '700' },
  heroTitleBlock: { alignItems: 'center', gap: 4, marginTop: 6 },
  heroTitle:      { color: G.white, fontSize: 32, fontWeight: '900', textAlign: 'center', lineHeight: 40 },
  heroSubtitle:   { color: 'rgba(255,255,255,0.85)', fontSize: 13, textAlign: 'center', lineHeight: 19, maxWidth: 310, marginTop: 6 },

  // Search box card
  searchBoxCard:  { backgroundColor: G.white, borderRadius: 22, padding: 14, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  searchFieldsColumn: { gap: 4 },
  searchFieldRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingHorizontal: 8 },
  searchFieldIcon:{ width: 38, height: 38, borderRadius: 19, backgroundColor: G.slate100, alignItems: 'center', justifyContent: 'center' },
  searchFieldLabel:{ fontSize: 10, fontWeight: '700', color: G.slate400 },
  searchFieldValue:{ fontSize: 14, fontWeight: '800', marginTop: 1 },
  searchFieldDivider: { height: 1, backgroundColor: G.slate100, marginHorizontal: 8 },
  clearIconBtn:   { padding: 4 },

  searchBtn:      { flexDirection: 'row', backgroundColor: G.green, borderRadius: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 8, shadowColor: G.green, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  searchBtnText:  { color: G.white, fontSize: 15, fontWeight: '800' },
  resetSearchBtn: { flexDirection: 'row', backgroundColor: G.slate100, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', gap: 6 },
  resetSearchBtnText: { color: G.slate700, fontSize: 13, fontWeight: '700' },

  // Popular cities
  popularLabel:   { color: 'rgba(255,255,255,0.80)', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  cityPill:       { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(15,23,42,0.75)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.20)' },
  cityPillActive: { backgroundColor: G.green, borderColor: G.green },
  cityPillText:   { color: G.white, fontSize: 12, fontWeight: '700' },
  cityPillTextActive: { color: G.white },

  // Stats bar
  statsBarContainer: { backgroundColor: 'rgba(15,23,42,0.90)', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, gap: 10 },
  statItem:       { flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: (SW - 60) / 4 },
  statIcon:       { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  statLabel:      { fontSize: 10, color: G.slate400, lineHeight: 12 },
  statValue:      { fontSize: 15, fontWeight: '800', color: G.white },
  livePill:       { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(225,29,72,0.15)', borderWidth: 1, borderColor: 'rgba(225,29,72,0.35)' },
  liveDotWrap:    { width: 10, height: 10, alignItems: 'center', justifyContent: 'center' },
  liveDotPing:    { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: G.rose, opacity: 0.5 },
  liveDot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: G.rose },
  livePillCount:  { color: G.white, fontSize: 16, fontWeight: '900' },
  livePillLabel:  { color: '#fca5a5', fontSize: 10, fontWeight: '700' },

  // Modals
  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent:   { backgroundColor: G.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  modalHeader:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  modalTitle:     { fontSize: 18, fontWeight: '900', color: G.slate900 },
  modalCloseBtn:  { width: 32, height: 32, borderRadius: 16, backgroundColor: G.slate100, alignItems: 'center', justifyContent: 'center' },
  modalSearchInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: G.slate100, borderRadius: 14, paddingHorizontal: 12, height: 44, marginBottom: 12 },
  modalSearchInput: { flex: 1, fontSize: 14, color: G.slate900, textAlign: 'right' },
  modalItemRow:   { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 14, borderBottomWidth: 1, borderBottomColor: G.slate100 },
  modalItemRowSelected: { backgroundColor: '#f0fdf4' },
  modalItemText:  { flex: 1, fontSize: 14, fontWeight: '700', color: G.slate800 },
  modalItemTextSelected: { color: G.green2 },

  // Calendar
  calendarWrap:       { paddingVertical: 10 },
  calendarHeaderRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  calNavBtn:          { width: 36, height: 36, borderRadius: 18, backgroundColor: G.slate100, alignItems: 'center', justifyContent: 'center' },
  calMonthTitle:      { fontSize: 16, fontWeight: '800', color: G.slate900 },
  calWeekdaysRow:     { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8, borderBottomWidth: 1, borderBottomColor: G.slate100, paddingBottom: 8 },
  calWeekdayText:     { width: (SW - 60) / 7, textAlign: 'center', fontSize: 12, fontWeight: '700', color: G.slate400 },
  calGrid:            { flexDirection: 'row', flexWrap: 'wrap' },
  calDayCellEmpty:    { width: (SW - 60) / 7, height: 42 },
  calDayCell:         { width: (SW - 60) / 7, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, marginVertical: 2 },
  calDayCellSelected: { backgroundColor: G.green },
  calDayCellDisabled: { opacity: 0.3 },
  calDayText:         { fontSize: 14, fontWeight: '700', color: G.slate800 },
  calDayTextSelected: { color: G.white, fontWeight: '900' },
  calDayTextDisabled: { color: G.slate400 },

  // Hourly time slots
  hourlySectionTitle: { fontSize: 13, fontWeight: '800', color: G.slate600 },
  hourlyGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  hourlySlotPill:     { width: (SW - 64) / 3, paddingVertical: 12, borderRadius: 14, backgroundColor: G.slate100, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent' },
  hourlySlotPillSelected: { backgroundColor: '#f0fdf4', borderColor: G.green2 },
  hourlySlotText:     { fontSize: 13, fontWeight: '800', color: G.slate800 },
  hourlySlotTextSelected: { color: G.green2 },

  // Manager card
  managerCard:    { borderRadius: 24, padding: 24, backgroundColor: '#4338ca', gap: 8 },
  seekingBadge:   { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)' },
  seekingBadgeText:{ color: G.white, fontSize: 11, fontWeight: '700' },
  levelBadge:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.12)' },
  levelBadgeText: { color: G.white, fontSize: 11, fontWeight: '600' },
  managerCardTeam:{ color: G.white, fontSize: 22, fontWeight: '900', marginTop: 8 },
  managerCardMeta:{ color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600' },

  // Field cards
  fieldCard:      { width: SW * 0.72, backgroundColor: G.white, borderRadius: 24, overflow: 'hidden', shadowColor: '#111827', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  fieldCardImg:   { height: 200, backgroundColor: G.slate800, position: 'relative' },
  fieldCardOverlay:{ ...StyleSheet.absoluteFill, backgroundColor: 'rgba(17,24,39,0.15)' },
  fieldCardBadgeRow:{ position: 'absolute', top: 12, right: 12, left: 12, flexDirection: 'row', justifyContent: 'space-between' },
  availBadge:     { backgroundColor: G.green, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  availBadgeText: { color: G.white, fontSize: 10, fontWeight: '700' },
  likeBtn:        { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  formatBadge:    { position: 'absolute', bottom: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 4 },
  formatBadgeText:{ color: G.white, fontSize: 10, fontWeight: '600' },
  fieldCardBody:  { padding: 18 },
  ratingText:     { fontSize: 12, fontWeight: '700', color: G.slate800 },
  fieldCardName:  { fontSize: 17, fontWeight: '800', color: G.slate900 },
  fieldCardCity:  { fontSize: 12, color: G.slate500, flex: 1 },
  fieldCardOpen:  { fontSize: 12, fontWeight: '600', color: G.slate600 },
  fieldPrice:     { fontSize: 20, fontWeight: '900', color: G.green2 },
  fieldCurrency:  { fontSize: 12, fontWeight: '600', color: G.slate500 },
  fieldPerHour:   { fontSize: 10, color: G.slate400, marginTop: 2 },
  bookBtn:        { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: G.green, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10 },
  bookBtnText:    { color: G.white, fontSize: 12, fontWeight: '700' },

  // Match cards
  matchCard:      { width: SW * 0.72, backgroundColor: G.white, borderRadius: 24, padding: 18, shadowColor: '#111827', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 4, gap: 10, borderWidth: 1 },
  matchCardStatus:{ alignItems: 'flex-end' },
  matchStatusBadge:{ paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  matchCardAvatar:{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', borderWidth: 3, borderColor: G.slate50 },
  matchCardTeam:  { fontSize: 17, fontWeight: '800', color: G.slate900, textAlign: 'center' },
  matchCardLevel: { fontSize: 11, fontWeight: '600', color: G.slate500 },
  matchCardMeta:  { fontSize: 11, fontWeight: '600', color: G.slate600 },
  matchCardFormat:{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  matchCardFormatText:{ fontSize: 10, fontWeight: '600', color: G.slate600 },
  challengeBtn:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 16, borderWidth: 2, marginTop: 4 },
  challengeBtnText:{ fontSize: 13, fontWeight: '700' },

  // Tournament cards
  tournamentCard: { width: SW * 0.78, backgroundColor: G.white, borderRadius: 24, overflow: 'hidden', shadowColor: '#111827', shadowOpacity: 0.08, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  tournamentCardHeader: { height: 140, backgroundColor: G.slate800, position: 'relative', justifyContent: 'flex-end', padding: 14 },
  tStatusBadge:   { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  tStatusDot:     { width: 6, height: 6, borderRadius: 3 },
  tStatusText:    { fontSize: 10, fontWeight: '700' },
  tournamentCardBody:{ padding: 18 },
  tName:          { fontSize: 16, fontWeight: '900', color: G.slate900 },
  tDesc:          { fontSize: 12, color: G.slate500, lineHeight: 16, marginTop: 6 },
  tMeta:          { fontSize: 11, color: G.slate500, fontWeight: '600' },
  tBadgeRow:      { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: G.slate100, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, maxWidth: 160 },
  tJoinBtn:       { backgroundColor: G.green, borderRadius: 14, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', marginTop: 14, shadowColor: G.green, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  tJoinBtnText:   { color: G.white, fontSize: 13, fontWeight: '800' },

  // Live cards
  liveCard:       { backgroundColor: G.white, borderRadius: 24, padding: 16, shadowColor: G.rose, shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 4, borderWidth: 1, borderColor: '#fce7f3', gap: 4 },
  liveBadge:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff1f2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1, borderColor: '#fecdd3' },
  liveBadgeText:  { color: G.rose, fontSize: 10, fontWeight: '800' },
  liveTeamName:   { fontSize: 11, fontWeight: '700', color: G.slate800, textAlign: 'center' },
  liveScore:      { color: G.rose, fontSize: 26, fontWeight: '900', lineHeight: 30 },
  liveScoreLabel: { color: G.slate400, fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  liveCardTournament:{ fontSize: 10, fontWeight: '700', color: G.slate600, flex: 1 },
  liveCardStadium:{ fontSize: 11, color: G.slate500, fontWeight: '600' },
  eventsLabel:    { fontSize: 9, fontWeight: '900', color: G.slate400, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  watchBtn:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, borderRadius: 14, backgroundColor: G.rose, marginTop: 14, shadowColor: G.rose, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  watchBtnText:   { color: G.white, fontSize: 13, fontWeight: '700' },

  // Next card
  nextCard:       { backgroundColor: G.slate900, borderRadius: 24, padding: 20, shadowColor: G.slate950, shadowOpacity: 0.35, shadowRadius: 30, shadowOffset: { width: 0, height: 12 }, elevation: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },

  // Team initials
  teamInitials:   { backgroundColor: G.slate700, alignItems: 'center', justifyContent: 'center' },
  teamInitialsText:{ color: G.white, fontWeight: '800' },

  // Why us
  whyGrid:        { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20, gap: 12, marginTop: 28, paddingBottom: 8 },
  whyCard:        { width: (SW - 52) / 2, borderRadius: 20, backgroundColor: G.white, padding: 18, shadowColor: '#111827', shadowOpacity: 0.07, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 3, borderWidth: 1, borderColor: G.slate100 },
  whyCardIcon:    { width: 52, height: 52, borderRadius: 16, backgroundColor: '#f0fdf4', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  whyCardTitle:   { fontSize: 13, fontWeight: '800', color: G.slate900 },
  whyCardDesc:    { fontSize: 11, color: G.slate500, lineHeight: 15, marginTop: 4 },

  // CTA Banner
  ctaBanner:      { backgroundColor: '#111827', marginTop: 32, padding: 28, paddingTop: 8, gap: 10 },
  ctaTitle:       { color: G.white, fontSize: 26, fontWeight: '900', lineHeight: 32, textAlign: 'center' },
  ctaDesc:        { color: G.slate400, fontSize: 13, lineHeight: 18, textAlign: 'center' },
  ctaBtn:         { backgroundColor: G.green, borderRadius: 18, paddingVertical: 16, alignItems: 'center', marginTop: 8, shadowColor: G.green, shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  ctaBtnText:     { color: G.white, fontSize: 16, fontWeight: '800' },

  // Bottom bar
  bottomBar:      { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, backgroundColor: G.white, paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: G.slate100, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: -4 }, elevation: 10 },
  bottomBarPrimary:{ flex: 1, backgroundColor: G.green, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  bottomBarPrimaryText:{ color: G.white, fontSize: 14, fontWeight: '800' },
  bottomBarSecondary:{ flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: G.slate200 },
  bottomBarSecondaryText:{ color: G.slate700, fontSize: 14, fontWeight: '700' },
});
