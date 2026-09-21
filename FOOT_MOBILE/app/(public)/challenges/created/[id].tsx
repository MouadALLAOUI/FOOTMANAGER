import React, { useState } from 'react';
import {
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
  Check,
  ChevronLeft,
  Clock,
  Copy,
  Flame,
  Link2,
  MapPin,
  MessageCircle,
  Share2,
  Trophy,
  Users,
} from 'lucide-react-native';

import { AjiNqssroHeader } from '@/components/ui/AjiNqssroHeader';
import { useToast } from '@/components/ui/Toast';

export default function ChallengeCreatedScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    stadiumName?: string;
    date?: string;
    time?: string;
    type?: string;
    bookerName?: string;
    bookerPhone?: string;
    teamName?: string;
  }>();
  const id = params.id;
  const stadiumName = params.stadiumName || 'ملعب أجيال';
  const matchDate = params.date || 'الأربعاء 10 سيبتمبر 2026';
  const matchTime = params.time || '18:00 - 19:00';
  const matchType = params.type || 'مباراة تحدي';
  const bookerName = params.bookerName;
  const bookerPhone = params.bookerPhone;
  const teamName = params.teamName;

  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const challengeUrl = `https://ajn9essro.com/challenge/${id || 'AB7X3'}`;

  const handleCopy = () => {
    setCopied(true);
    toast.show('تم نسخ رابط التحدي بنجاح!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleShareWhatsApp = () => {
    const text = `تحدي كروي جديد على منصة أجي نقصرو! ⚽🔥\nقبل التحدي من هنا:\n${challengeUrl}`;
    const url = `whatsapp://send?text=${encodeURIComponent(text)}`;
    Linking.openURL(url).catch(() => {
      toast.show('تعذر فتح تطبيق واتساب', 'error');
    });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header with Flame Badge */}
      <AjiNqssroHeader
        showBack
        rightAction={
          <View style={styles.flameBadge}>
            <Flame size={16} color="#EA580C" />
            <Text style={styles.flameBadgeText}>تحدي</Text>
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Celebration Header */}
        <View style={styles.celebrationSection}>
          <View style={styles.checkCircleLarge}>
            <Check size={32} color="#FFFFFF" strokeWidth={3.5} />
          </View>
          <Text style={styles.celebrationTitle}>التحدي ديالك واجد!</Text>
          <Text style={styles.celebrationSubtitle}>قلب على فريق ينافسك</Text>
        </View>

        {/* Organizer / Booker Card if present */}
        {(teamName || bookerName) && (
          <View style={styles.organizerCard}>
            <View style={styles.organizerIconBox}>
              <Users size={20} color="#00875A" />
            </View>
            <View style={styles.organizerContent}>
              <Text style={styles.organizerRole}>منظم التحدي</Text>
              <Text style={styles.organizerTeam}>{teamName || 'فريق معتمد'}</Text>
              {(bookerName || bookerPhone) && (
                <Text style={styles.organizerContact}>
                  {bookerName ? `المسؤول: ${bookerName}` : ''}
                  {bookerPhone ? ` • ${bookerPhone}` : ''}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Stadium & Match Specs Card */}
        <View style={styles.matchCard}>
          <View style={styles.matchCardInner}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=600&q=80',
              }}
              style={styles.matchCardThumb}
            />

            <View style={styles.matchCardDetails}>
              <Text style={styles.stadiumNameText}>{stadiumName}</Text>

              <View style={styles.infoRow}>
                <Text style={styles.infoRowText}>تينغير - مركب معتمد</Text>
                <MapPin size={13} color="#00875A" />
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoRowText}>{matchDate}</Text>
                <Calendar size={13} color="#00875A" />
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoRowText}>{matchTime}</Text>
                <Clock size={13} color="#00875A" />
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoRowText}>{matchType}</Text>
                <Trophy size={13} color="#00875A" />
              </View>
            </View>
          </View>
        </View>

        {/* Share Link Box */}
        <View style={styles.linkSection}>
          <View style={styles.linkHeaderRow}>
            <Text style={styles.linkHeaderTitle}>رابط التحدي</Text>
            <Link2 size={16} color="#00875A" />
          </View>

          <View style={styles.urlBox}>
            <TouchableOpacity
              onPress={handleCopy}
              style={styles.copyIconButton}
              accessibilityRole="button"
            >
              {copied ? (
                <Check size={18} color="#00875A" />
              ) : (
                <Copy size={18} color="#64748B" />
              )}
            </TouchableOpacity>
            <Text style={styles.urlText} numberOfLines={1}>
              {challengeUrl}
            </Text>
          </View>

          <Text style={styles.urlHelperText}>
            شارك هذا الرابط مع الفرق عبر واتساب أو أي وسيلة أخرى
          </Text>

          {/* WhatsApp Share Button */}
          <TouchableOpacity
            style={styles.whatsAppBtn}
            onPress={handleShareWhatsApp}
            activeOpacity={0.88}
          >
            <ChevronLeft size={18} color="#FFFFFF" />
            <View style={styles.whatsAppBtnContent}>
              <Text style={styles.whatsAppBtnText}>مشاركة عبر WhatsApp</Text>
              <MessageCircle size={20} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          {/* Copy Link Secondary Button */}
          <TouchableOpacity
            style={styles.copySecondaryBtn}
            onPress={handleCopy}
            activeOpacity={0.85}
          >
            <Copy size={16} color="#00875A" />
            <Text style={styles.copySecondaryText}>
              {copied ? 'تم النسخ!' : 'نسخ الرابط'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Rules Footer Card */}
        <View style={styles.rulesCard}>
          <View style={styles.rulesIconBox}>
            <Users size={22} color="#00875A" />
          </View>
          <View style={styles.rulesContent}>
            <Text style={styles.rulesTitle}>أول فريق يقبل التحدي هو الخصم</Text>
            <Text style={styles.rulesDesc}>
              سيتم إشعارك مباشرة عند قبول التحدي
            </Text>
          </View>
        </View>
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
    paddingHorizontal: 16,
  },
  flameBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  flameBadgeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EA580C',
  },
  celebrationSection: {
    alignItems: 'center',
    marginVertical: 18,
  },
  checkCircleLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00875A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  celebrationTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#064E3B',
    marginTop: 12,
    textAlign: 'center',
  },
  celebrationSubtitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 4,
    textAlign: 'center',
  },
  organizerCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  organizerIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  organizerContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  organizerRole: {
    fontSize: 11,
    fontWeight: '700',
    color: '#00875A',
  },
  organizerTeam: {
    fontSize: 15,
    fontWeight: '800',
    color: '#064E3B',
    marginTop: 2,
  },
  organizerContact: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  matchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  matchCardInner: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  matchCardThumb: {
    width: 105,
    height: 95,
    borderRadius: 14,
  },
  matchCardDetails: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 4,
  },
  stadiumNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#064E3B',
    marginBottom: 2,
  },
  infoRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  infoRowText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '600',
  },
  linkSection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  linkHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  linkHeaderTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#064E3B',
  },
  urlBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  copyIconButton: {
    padding: 4,
  },
  urlText: {
    flex: 1,
    fontSize: 12,
    color: '#0F172A',
    fontWeight: '600',
    textAlign: 'right',
  },
  urlHelperText: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  whatsAppBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  whatsAppBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  whatsAppBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  copySecondaryBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  copySecondaryText: {
    color: '#00875A',
    fontSize: 14,
    fontWeight: '800',
  },
  rulesCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  rulesIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rulesContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  rulesTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00875A',
  },
  rulesDesc: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
});
