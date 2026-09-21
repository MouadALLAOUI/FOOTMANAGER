import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Calendar,
  ChevronLeft,
  Heart,
  Lightbulb,
  MapPin,
  ParkingCircle,
  ShowerHead,
  Sparkles,
  Star,
  Zap,
} from 'lucide-react-native';
import { resolveImageUrl } from '@/utils/image';

export interface StadiumData {
  id: string | number;
  name: string;
  location: string;
  distanceKm?: number | string;
  rating?: number;
  reviewsCount?: number;
  image?: string;
  type?: string;
  amenities?: string[];
  turfType?: string;
}

interface StadiumCardProps {
  stadium: StadiumData;
  onPressTimes?: (stadium: StadiumData) => void;
}

export function StadiumCard({ stadium, onPressTimes }: StadiumCardProps): React.JSX.Element {
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);

  const handlePressTimes = () => {
    if (onPressTimes) {
      onPressTimes(stadium);
    } else {
      router.push(`/(public)/stadiums/${stadium.id}` as any);
    }
  };

  const resolvedImage = resolveImageUrl(stadium.image);
  const defaultImage =
    resolvedImage ||
    'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80';

  return (
    <View style={styles.cardContainer}>
      {/* Stadium Photo Banner */}
      <View style={styles.imageWrap}>
        <Image source={{ uri: defaultImage }} style={styles.stadiumImage} resizeMode="cover" />

        {/* Type Tag (e.g. ملعب مغطى / ملعب ترابي) */}
        <View style={styles.typeBadge}>
          <Text style={styles.typeBadgeText}>{stadium.type || 'عشب صناعي'}</Text>
        </View>

        {/* Favorite Button */}
        <TouchableOpacity
          style={styles.favoriteBtn}
          onPress={() => setIsFavorite(!isFavorite)}
          activeOpacity={0.8}
          accessibilityRole="button"
        >
          <Heart
            size={18}
            color={isFavorite ? '#EF4444' : '#1E293B'}
            fill={isFavorite ? '#EF4444' : 'transparent'}
          />
        </TouchableOpacity>
      </View>

      {/* Info Section */}
      <View style={styles.contentWrap}>
        {/* Top title and location */}
        <View style={styles.titleRow}>
          <Text style={styles.stadiumName}>{stadium.name}</Text>
        </View>

        <View style={styles.locationRow}>
          <Text style={styles.locationText}>{stadium.location}</Text>
          <MapPin size={14} color="#00875A" />
        </View>

        {/* Rating and review count */}
        <View style={styles.ratingRow}>
          <Text style={styles.reviewCountText}>
            ({stadium.reviewsCount ?? 52} تقييم)
          </Text>
          <Text style={styles.ratingScore}>{stadium.rating ?? 4.8}</Text>
          <Star size={14} color="#F59E0B" fill="#F59E0B" />
        </View>

        {/* Amenities Icons Row */}
        <View style={styles.amenitiesRow}>
          <View style={styles.amenityChip}>
            <Text style={styles.amenityText}>مرافق صحية</Text>
            <ShowerHead size={12} color="#00875A" />
          </View>
          <View style={styles.amenityChip}>
            <Text style={styles.amenityText}>إنارة ليلية</Text>
            <Zap size={12} color="#00875A" />
          </View>
          <View style={styles.amenityChip}>
            <Text style={styles.amenityText}>{stadium.turfType || 'عشب صناعي'}</Text>
            <Sparkles size={12} color="#00875A" />
          </View>
          <View style={styles.amenityChip}>
            <Text style={styles.amenityText}>مواقف سيارات</Text>
            <ParkingCircle size={12} color="#00875A" />
          </View>
        </View>

        {/* Action Button: شوف الأوقات */}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={handlePressTimes}
          activeOpacity={0.88}
          accessibilityRole="button"
        >
          <ChevronLeft size={18} color="#FFFFFF" />
          <View style={styles.actionBtnInner}>
            <Text style={styles.actionBtnText}>شوف الأوقات</Text>
            <Calendar size={18} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F0FDF4',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  imageWrap: {
    width: '100%',
    height: 155,
    position: 'relative',
    backgroundColor: '#E2E8F0',
  },
  stadiumImage: {
    width: '100%',
    height: '100%',
  },
  typeBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(6, 95, 70, 0.88)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  favoriteBtn: {
    position: 'absolute',
    top: 12,
    left: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentWrap: {
    padding: 14,
    alignItems: 'flex-end',
  },
  titleRow: {
    width: '100%',
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stadiumName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#064E3B',
    textAlign: 'right',
  },
  locationRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  ratingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  ratingScore: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  reviewCountText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  amenitiesRow: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    marginBottom: 14,
  },
  amenityChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  amenityText: {
    fontSize: 11,
    color: '#00875A',
    fontWeight: '600',
  },
  actionBtn: {
    width: '100%',
    backgroundColor: '#00875A',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
