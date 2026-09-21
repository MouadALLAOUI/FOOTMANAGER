import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  Map,
  MapPin,
  Search,
  SlidersHorizontal,
} from 'lucide-react-native';

import { AjiNqssroHeader } from '@/components/ui/AjiNqssroHeader';
import { AjiNqssroTabBar } from '@/components/navigation/AjiNqssroTabBar';
import { StadiumCard, StadiumData } from '@/components/stadium/StadiumCard';
import { usePublicStadiums } from '@/api/stadiums';
import { resolveImageUrl } from '@/utils/image';

export default function StadiumsScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'closest' | 'all'>('closest');

  // Query live stadiums from backend
  const { data: stadiumsResponse, isLoading } = usePublicStadiums({
    search: searchQuery.trim() || undefined,
  });

  const stadiumsList: StadiumData[] = (stadiumsResponse?.data || []).map((s) => ({
    id: s.id,
    name: s.name,
    location: [s.city, s.address].filter(Boolean).join(' - ') || 'تنغير - الجنوب الشرقي',
    distanceKm: s.distance ? `${s.distance} كم` : undefined,
    rating: s.rating ?? 4.8,
    reviewsCount: s.reviews_count ?? 12,
    type: s.type || (s.is_covered ? 'ملعب مغطى' : 'ملعب مفتوح'),
    turfType: s.player_format || 'عشب صناعي',
    image: resolveImageUrl(s.cover_image_url) || 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80',
    amenities: s.facilities,
  }));

  const filteredStadiums = stadiumsList;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* Header with Title & Logo */}
      <AjiNqssroHeader
        showBack
        title="حجز ملعب"
        subtitle="اختر الملعب المناسب لك"
        showAuthButtons
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="أبحث عن ملعب..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              textAlign="right"
            />
            <Search size={18} color="#64748B" />
          </View>
        </View>

        {/* Filter Chips Row */}
        <View style={styles.filtersRow}>
          {/* Closest filter */}
          <TouchableOpacity
            style={[styles.filterChip, styles.filterChipActive]}
            activeOpacity={0.8}
          >
            <ArrowUpDown size={14} color="#00875A" />
            <Text style={[styles.filterChipText, styles.filterChipTextActive]}>
              الأقرب إليك
            </Text>
            <ChevronDown size={14} color="#00875A" />
          </TouchableOpacity>

          {/* Types filter */}
          <TouchableOpacity style={styles.filterChip} activeOpacity={0.8}>
            <SlidersHorizontal size={14} color="#64748B" />
            <Text style={styles.filterChipText}>جميع الأنواع</Text>
            <ChevronDown size={14} color="#64748B" />
          </TouchableOpacity>

          {/* Areas filter */}
          <TouchableOpacity style={styles.filterChip} activeOpacity={0.8}>
            <MapPin size={14} color="#64748B" />
            <Text style={styles.filterChipText}>جميع المناطق</Text>
            <ChevronDown size={14} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* Section Counter: جميع الملاعب (12) */}
        <View style={styles.counterRow}>
          <View style={styles.countBadge}>
            <Text style={styles.countBadgeText}>{filteredStadiums.length || 12}</Text>
          </View>
          <Text style={styles.counterTitle}>جميع الملاعب</Text>
        </View>

        {/* Stadium Cards List */}
        <View style={styles.stadiumsList}>
          {filteredStadiums.map((stadium) => (
            <StadiumCard
              key={stadium.id}
              stadium={stadium}
              onPressTimes={(s) => router.push(`/(public)/stadiums/${s.id}` as any)}
            />
          ))}
        </View>

        {/* Nearby Map CTA Banner */}
        <TouchableOpacity
          style={styles.mapBannerBtn}
          activeOpacity={0.88}
          onPress={() => router.push('/(public)/stadiums' as any)}
        >
          <ChevronLeft size={18} color="#00875A" />
          <View style={styles.mapBannerRight}>
            <Text style={styles.mapBannerText}>الملاعب القريبة مني</Text>
            <Map size={18} color="#00875A" />
          </View>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Tab Bar */}
      <AjiNqssroTabBar mode="public" activeTab="stadiums" />
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
  searchContainer: {
    paddingHorizontal: 16,
    marginTop: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 14,
    height: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '600',
  },
  filtersRow: {
    flexDirection: 'row-reverse',
    paddingHorizontal: 16,
    marginTop: 12,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  filterChipActive: {
    borderColor: '#00875A',
    backgroundColor: '#F0FDF4',
  },
  filterChipText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#00875A',
    fontWeight: '700',
  },
  counterRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 18,
    marginBottom: 8,
  },
  counterTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  countBadge: {
    backgroundColor: '#00875A',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  stadiumsList: {
    paddingHorizontal: 16,
  },
  mapBannerBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mapBannerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mapBannerText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00875A',
  },
});
