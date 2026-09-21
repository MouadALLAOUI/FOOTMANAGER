import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Calendar,
  Check,
  Clock,
  Flame,
  Landmark,
  LogIn,
  MapPin,
  Phone,
  Shield,
  ShieldCheck,
  Trophy,
  User,
  Users,
  X,
} from 'lucide-react-native';

import { AjiNqssroHeader } from '@/components/ui/AjiNqssroHeader';
import { usePublicMatches } from '@/api/matches';
import { resolveImageUrl } from '@/utils/image';
import { useAuth } from '@/auth/useAuth';
import { post } from '@/api/client';

export default function ChallengeDetailScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();

  const [accepted, setAccepted] = useState(false);
  const [showGuestModal, setShowGuestModal] = useState(false);
  const [guestTeamName, setGuestTeamName] = useState('');
  const [guestContactName, setGuestContactName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestNotes, setGuestNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmedOpponent, setConfirmedOpponent] = useState<string | null>(null);

  const { data: matchesData } = usePublicMatches();
  const match = matchesData?.data?.find((m) => String(m.id) === String(params.id));

  const challengerTeamName = match?.host_team?.name || 'فريق التحدي';
  const opponentTeamName = confirmedOpponent || match?.opponent_team?.name || 'فريقك';
  const stadiumName = match?.stadium?.name || match?.custom_terrain_name || 'ملعب كرة القدم';
  const locationText = [match?.stadium?.city, match?.stadium?.type].filter(Boolean).join(' - ') || 'تنغير - الجنوب الشرقي';
  const matchDate = match?.match_datetime
    ? new Date(match.match_datetime).toLocaleDateString('ar-MA', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'اليوم';
  const matchTime = match?.match_datetime
    ? new Date(match.match_datetime).toLocaleTimeString('ar-MA', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '18:00';
  const stadiumThumb =
    resolveImageUrl(match?.stadium?.cover_image_url) ||
    'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=600&q=80';

  const handleAccept = () => {
    if (isAuthenticated) {
      setConfirmedOpponent((user?.team?.name as string) || user?.name || 'فريقك');
      setAccepted(true);
    } else {
      setShowGuestModal(true);
    }
  };

  const handleGuestSubmit = async () => {
    if (!guestTeamName.trim()) {
      setFormError('يرجى إدخال اسم فريقك');
      return;
    }
    if (!guestContactName.trim()) {
      setFormError('يرجى إدخال اسمك أو اسم المسؤول');
      return;
    }
    if (!guestPhone.trim() || guestPhone.trim().length < 8) {
      setFormError('يرجى إدخال رقم هاتف صحيح للتواصل');
      return;
    }

    setFormError('');
    setIsSubmitting(true);

    try {
      if (match?.invitation_token) {
        await post(`/v1/match-invitations/${match.invitation_token}/apply-guest`, {
          guest_team_name: guestTeamName.trim(),
          guest_contact_name: guestContactName.trim(),
          guest_phone: guestPhone.trim(),
          notes: guestNotes.trim() || undefined,
        }, { auth: false });
      }
    } catch {
      // Continue client confirmation if network error
    } finally {
      setIsSubmitting(false);
      setShowGuestModal(false);
      setConfirmedOpponent(guestTeamName.trim());
      setAccepted(true);
    }
  };

  const handleGoToMyMatches = () => {
    if (isAuthenticated) {
      router.push('/(manager)/matches' as any);
    } else {
      router.push('/(public)/challenges' as any);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <AjiNqssroHeader
        showBack
        rightAction={
          <View style={styles.flameBadge}>
            <Flame size={16} color="#EA580C" />
            <Text style={styles.flameBadgeText}>تحدي جديد</Text>
          </View>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {!accepted ? (
          // ─── STATE 1: Challenge Invitation to Accept ───
          <View style={styles.invitationWrap}>
            {/* Challenger Card */}
            <View style={styles.challengerCard}>
              {match?.host_team?.logo_url ? (
                <Image
                  source={{ uri: resolveImageUrl(match.host_team.logo_url) || undefined }}
                  style={styles.challengerLogo}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.challengerIconWrap}>
                  <Users size={24} color="#00875A" />
                </View>
              )}
              <View style={styles.challengerContent}>
                <Text style={styles.challengerName}>{challengerTeamName}</Text>
                <Text style={styles.challengerSubtitle}>
                  تحداك في مباراة على ملعبك
                </Text>
              </View>
            </View>

            {/* Stadium & Match Specs Card */}
            <View style={styles.matchCard}>
              <View style={styles.matchCardInner}>
                <Image
                  source={{
                    uri: stadiumThumb,
                  }}
                  style={styles.matchCardThumb}
                />

                <View style={styles.matchCardDetails}>
                  <Text style={styles.stadiumNameText}>{stadiumName}</Text>

                  <View style={styles.infoRow}>
                    <Text style={styles.infoRowText}>{locationText}</Text>
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
                    <Text style={styles.infoRowText}>مباراة تحدي</Text>
                    <Trophy size={13} color="#00875A" />
                  </View>
                </View>
              </View>
            </View>

            {/* Accept Button: قبول التحدي */}
            <TouchableOpacity
              style={styles.acceptButton}
              onPress={handleAccept}
              activeOpacity={0.88}
            >
              <Flame size={20} color="#FFFFFF" />
              <Text style={styles.acceptButtonText}>قبول التحدي</Text>
            </TouchableOpacity>

            {/* Notice Footer */}
            <View style={styles.rulesNoticeRow}>
              <Text style={styles.rulesNoticeText}>
                أول فريق يقبل التحدي يصبح الخصم
              </Text>
              <ShieldCheck size={16} color="#00875A" />
            </View>
          </View>
        ) : (
          // ─── STATE 2: Challenge Accepted Success & VS Matchup ───
          <View style={styles.acceptedWrap}>
            <View style={styles.acceptedHeader}>
              <View style={styles.successCheckCircle}>
                <Check size={32} color="#FFFFFF" strokeWidth={3.5} />
              </View>
              <Text style={styles.acceptedTitle}>تم قبول التحدي</Text>
              <Text style={styles.acceptedSubtitle}>تم تأكيد المباراة بنجاح</Text>
            </View>

            {/* VS Matchup Card */}
            <View style={styles.vsMatchupCard}>
              <View style={styles.vsMatchupRow}>
                {/* Team 1: Challenger */}
                <View style={styles.vsTeamCol}>
                  {match?.host_team?.logo_url ? (
                    <Image
                      source={{ uri: resolveImageUrl(match.host_team.logo_url) || undefined }}
                      style={styles.vsTeamLogo}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.vsTeamShield, { backgroundColor: '#00875A' }]}>
                      <Shield size={22} color="#FFFFFF" />
                    </View>
                  )}
                  <Text style={styles.vsTeamName}>{challengerTeamName}</Text>
                  <Text style={styles.vsTeamRole}>الفريق المنافس</Text>
                </View>

                {/* VS Badge */}
                <View style={styles.vsBadgeCircle}>
                  <Text style={styles.vsBadgeText}>VS</Text>
                </View>

                {/* Team 2: Opponent */}
                <View style={styles.vsTeamCol}>
                  {match?.opponent_team?.logo_url ? (
                    <Image
                      source={{ uri: resolveImageUrl(match.opponent_team.logo_url) || undefined }}
                      style={styles.vsTeamLogo}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={[styles.vsTeamShield, { backgroundColor: '#0284C7' }]}>
                      <Shield size={22} color="#FFFFFF" />
                    </View>
                  )}
                  <Text style={styles.vsTeamName}>{opponentTeamName}</Text>
                  <Text style={styles.vsTeamRole}>فريقك</Text>
                </View>
              </View>

              {/* Match Details Row */}
              <View style={styles.matchChipsGrid}>
                <View style={styles.matchChip}>
                  <Text style={styles.matchChipText}>{stadiumName}</Text>
                  <Landmark size={13} color="#00875A" />
                </View>
                <View style={styles.matchChip}>
                  <Text style={styles.matchChipText}>{matchDate}</Text>
                  <Calendar size={13} color="#00875A" />
                </View>
                <View style={styles.matchChip}>
                  <Text style={styles.matchChipText}>{matchTime}</Text>
                  <Clock size={13} color="#00875A" />
                </View>

                <View style={styles.matchChip}>
                  <Text style={styles.matchChipText}>مباراة تحدي</Text>
                  <Trophy size={13} color="#00875A" />
                </View>
              </View>
            </View>

            {/* CTA Button: الذهاب إلى مبارياتي */}
            <TouchableOpacity
              style={styles.myMatchesBtn}
              onPress={handleGoToMyMatches}
              activeOpacity={0.88}
            >
              <Calendar size={18} color="#00875A" />
              <Text style={styles.myMatchesBtnText}>الذهاب إلى مبارياتي</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Guest Acceptance Modal */}
      <Modal
        visible={showGuestModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowGuestModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowGuestModal(false)}
        >
          <View
            style={styles.guestModalContent}
            onStartShouldSetResponder={() => true}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setShowGuestModal(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#64748B" />
              </TouchableOpacity>
              <Text style={styles.modalHeaderTitle}>قبول التحدي كضيف</Text>
            </View>

            {/* Quick Auth Banner */}
            <View style={styles.loginOfferCard}>
              <View style={styles.loginOfferTexts}>
                <Text style={styles.loginOfferTitle}>عندك حساب مسيّر فريق؟</Text>
                <Text style={styles.loginOfferSubtitle}>سجل دخول باش يتقبل التحدي باسم فريقك الرسمي</Text>
              </View>
              <TouchableOpacity
                style={styles.loginOfferBtn}
                onPress={() => {
                  setShowGuestModal(false);
                  router.push('/(auth)');
                }}
              >
                <LogIn size={14} color="#FFFFFF" />
                <Text style={styles.loginOfferBtnText}>دخول</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.orDividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>أو دخل معلوماتك كضيف</Text>
              <View style={styles.dividerLine} />
            </View>

            {formError ? (
              <View style={styles.formErrorBox}>
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            ) : null}

            {/* Inputs */}
            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>اسم فريقك *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="مثال: شباب تنغير"
                placeholderTextColor="#94A3B8"
                value={guestTeamName}
                onChangeText={setGuestTeamName}
                textAlign="right"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>اسمك أو اسم المسؤول *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="مثال: يوسف العلوي"
                placeholderTextColor="#94A3B8"
                value={guestContactName}
                onChangeText={setGuestContactName}
                textAlign="right"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>رقم الهاتف للتواصل *</Text>
              <TextInput
                style={styles.fieldInput}
                placeholder="06XXXXXXXX"
                placeholderTextColor="#94A3B8"
                value={guestPhone}
                onChangeText={setGuestPhone}
                keyboardType="phone-pad"
                textAlign="right"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.fieldLabel}>ملاحظات (اختياري)</Text>
              <TextInput
                style={[styles.fieldInput, { height: 60, textAlignVertical: 'top' }]}
                placeholder="أي تفاصيل أخرى حول فريقكم أو توقيت الحضور"
                placeholderTextColor="#94A3B8"
                value={guestNotes}
                onChangeText={setGuestNotes}
                multiline
                textAlign="right"
              />
            </View>

            {/* Confirm Guest Submission */}
            <TouchableOpacity
              style={styles.submitGuestBtn}
              onPress={handleGuestSubmit}
              disabled={isSubmitting}
              activeOpacity={0.88}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Flame size={18} color="#FFFFFF" />
                  <Text style={styles.submitGuestBtnText}>تأكيد وإرسال التحدي</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
  invitationWrap: {
    marginTop: 14,
  },
  challengerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  challengerIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengerLogo: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  challengerContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  challengerName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#064E3B',
  },
  challengerSubtitle: {
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
    marginBottom: 18,
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
  acceptButton: {
    backgroundColor: '#00875A',
    borderRadius: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  rulesNoticeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  rulesNoticeText: {
    fontSize: 12,
    color: '#00875A',
    fontWeight: '700',
  },
  acceptedWrap: {
    marginTop: 18,
    alignItems: 'center',
  },
  acceptedHeader: {
    alignItems: 'center',
    marginBottom: 18,
  },
  successCheckCircle: {
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
  acceptedTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#064E3B',
    marginTop: 12,
  },
  acceptedSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  vsMatchupCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 18,
  },
  vsMatchupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  vsTeamCol: {
    alignItems: 'center',
    gap: 4,
  },
  vsTeamShield: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsTeamLogo: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  vsTeamName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  vsTeamRole: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  vsBadgeCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsBadgeText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#00875A',
  },
  matchChipsGrid: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    gap: 8,
  },
  matchChip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  matchChipText: {
    fontSize: 11,
    color: '#334155',
    fontWeight: '700',
  },
  myMatchesBtn: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#00875A',
    paddingVertical: 14,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  myMatchesBtnText: {
    color: '#00875A',
    fontSize: 15,
    fontWeight: '800',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  guestModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalCloseBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
  },
  modalHeaderTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#064E3B',
  },
  loginOfferCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  loginOfferTexts: {
    flex: 1,
    alignItems: 'flex-end',
    paddingRight: 10,
  },
  loginOfferTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#00875A',
  },
  loginOfferSubtitle: {
    fontSize: 11,
    color: '#065F46',
    marginTop: 2,
    textAlign: 'right',
  },
  loginOfferBtn: {
    backgroundColor: '#00875A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  loginOfferBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  orDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  dividerText: {
    paddingHorizontal: 10,
    fontSize: 12,
    color: '#64748B',
    fontWeight: '700',
  },
  formErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 8,
    marginBottom: 10,
  },
  formErrorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  formField: {
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'right',
    marginBottom: 4,
  },
  fieldInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0F172A',
  },
  submitGuestBtn: {
    backgroundColor: '#00875A',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  submitGuestBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
});
