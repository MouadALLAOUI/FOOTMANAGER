import React, { useState } from 'react';
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
  Clock,
  Flame,
  MapPin,
  Plus,
  Shield,
} from 'lucide-react-native';

import { AjiNqssroHeader } from '@/components/ui/AjiNqssroHeader';
import { AjiNqssroTabBar } from '@/components/navigation/AjiNqssroTabBar';
import { usePublicMatches } from '@/api/matches';
import { resolveImageUrl } from '@/utils/image';

export default function ChallengesListScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { data: matchesResponse, isLoading } = usePublicMatches();
  const matches = matchesResponse?.data || [];

  const colors = ['#00875A', '#0284C7', '#6366F1', '#D97706', '#EF4444'];

  const openChallenges = matches.map((m, idx) => {
    const dt = m.match_datetime ? new Date(m.match_datetime) : null;
    return {
      id: m.id,
      teamName: m.host_team?.name || 'فريق التحدي',
      teamLogo: m.host_team?.logo_url,
      location: m.stadium?.name
        ? `${m.stadium.name} - ${m.stadium.city || 'تنغير'}`
        : (m.custom_terrain_name || 'ملعب تنغير'),
      date: dt
        ? dt.toLocaleDateString('ar-MA', { weekday: 'short', day: 'numeric', month: 'short' })
        : 'قريباً',
      time: dt
        ? dt.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })
        : '18:00',
      stadium: m.stadium?.name || m.custom_terrain_name || 'ملعب كرة القدم',
      shieldColor: colors[idx % colors.length],
    };
  });

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <AjiNqssroHeader
        title="التحديات الكروية"
        subtitle="تحدى الفرق المحلية وأثبت جدارتك"
        showAuthButtons
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Create Challenge CTA Banner */}
        <TouchableOpacity
          style={styles.createChallengeCard}
          onPress={() => router.push('/(public)/book-match' as any)}
          activeOpacity={0.88}
        >
          <View style={styles.createIconBox}>
            <Plus size={24} color="#FFFFFF" />
          </View>
          <View style={styles.createTexts}>
            <Text style={styles.createTitle}>إنشاء تحدي جديد</Text>
            <Text style={styles.createSubtitle}>
              حدد الملعب والتوقيت وشارك الرابط مع أي فريق
            </Text>
          </View>
          <Flame size={28} color="#EA580C" />
        </TouchableOpacity>

        {/* Section Title: التحديات المفتوحة */}
        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>التحديات المفتوحة حالياً</Text>
          <Flame size={18} color="#EA580C" />
        </View>

        {/* Challenges List */}
        {openChallenges.length > 0 ? (
          openChallenges.map((challenge) => (
            <View key={challenge.id} style={styles.challengeItemCard}>
              <View style={styles.itemHeader}>
                <View style={styles.openBadge}>
                  <Text style={styles.openBadgeText}>تحدي مفتوح</Text>
                </View>
                <View style={styles.locationTag}>
                  <Text style={styles.locationTagText}>{challenge.location}</Text>
                  <MapPin size={12} color="#00875A" />
                </View>
              </View>

              <View style={styles.teamMatchRow}>
                <View style={styles.challengerInfo}>
                  <Text style={styles.challengerTitle}>{challenge.teamName}</Text>
                  <Text style={styles.challengerSub}>يبحث عن منافس</Text>
                </View>
                {challenge.teamLogo ? (
                  <Image
                    source={{ uri: resolveImageUrl(challenge.teamLogo) || undefined }}
                    style={styles.teamAvatarLogo}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    style={[
                      styles.teamAvatarShield,
                      { backgroundColor: challenge.shieldColor },
                    ]}
                  >
                    <Shield size={20} color="#FFFFFF" />
                  </View>
                )}
              </View>

              <View style={styles.timeScheduleRow}>
                <View style={styles.timeTag}>
                  <Text style={styles.timeTagText}>{challenge.time}</Text>
                  <Clock size={12} color="#00875A" />
                </View>
                <View style={styles.timeTag}>
                  <Text style={styles.timeTagText}>{challenge.date}</Text>
                  <Calendar size={12} color="#00875A" />
                </View>
              </View>

              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => router.push(`/(public)/challenges/${challenge.id}` as any)}
                activeOpacity={0.88}
              >
                <Flame size={16} color="#FFFFFF" />
                <Text style={styles.acceptBtnText}>عرض وقبول التحدي</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <View style={styles.emptyCard}>
            <Flame size={36} color="#CBD5E1" />
            <Text style={styles.emptyTitle}>لا توجد تحديات مفتوحة حالياً</Text>
            <Text style={styles.emptySub}>
              كن أول من يبادر بإنشاء تحدي كروي في منطقتك!
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => router.push('/(public)/book-match' as any)}
            >
              <Text style={styles.emptyBtnText}>إنشاء تحدي الآن</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>


      {/* Tab Bar */}
      <AjiNqssroTabBar mode="public" activeTab="challenges" />
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
  createChallengeCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 14,
  },
  createIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EA580C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  createTexts: {
    flex: 1,
    alignItems: 'flex-end',
    marginHorizontal: 10,
  },
  createTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#9A3412',
  },
  createSubtitle: {
    fontSize: 11,
    color: '#7C2D12',
    marginTop: 2,
    textAlign: 'right',
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
  challengeItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  openBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  openBadgeText: {
    color: '#00875A',
    fontSize: 11,
    fontWeight: '800',
  },
  locationTag: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  locationTagText: {
    fontSize: 12,
    color: '#64748B',
  },
  teamMatchRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  challengerInfo: {
    alignItems: 'flex-end',
  },
  challengerTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  challengerSub: {
    fontSize: 11,
    color: '#94A3B8',
  },
  teamAvatarShield: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamAvatarLogo: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  timeScheduleRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
    marginTop: 8,
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
  acceptBtn: {
    backgroundColor: '#00875A',
    borderRadius: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyBtn: {
    marginTop: 18,
    backgroundColor: '#00875A',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

