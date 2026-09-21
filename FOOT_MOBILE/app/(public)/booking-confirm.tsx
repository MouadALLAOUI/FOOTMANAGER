import React, { useState } from 'react';
import {
  Image,
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
  ArrowLeft,
  Calendar,
  Check,
  ChevronLeft,
  Clock,
  LogIn,
  Map,
  MapPin,
  Phone,
  ShieldCheck,
  Star,
  Trophy,
  User,
  UserPlus,
} from 'lucide-react-native';

import { AjiNqssroHeader } from '@/components/ui/AjiNqssroHeader';
import { useAuth } from '@/auth/useAuth';

export default function BookingConfirmScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();

  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestTeamName, setGuestTeamName] = useState('');
  const [formError, setFormError] = useState('');

  const stadiumName = (params.stadiumName as string) || 'ملعب أجيال';
  const matchDate = (params.date as string) || 'الجمعة 12 شتنبر 2026';
  const matchTime = (params.time as string) || '18:00 - 19:00';
  const matchType = (params.matchType as string) || 'مباراة ودية';

  const handleFinalConfirm = () => {
    if (!isAuthenticated) {
      if (!guestName.trim()) {
        setFormError('يرجى إدخال اسمك الكامل لتأكيد الحجز');
        return;
      }
      if (!guestPhone.trim() || guestPhone.trim().length < 8) {
        setFormError('يرجى إدخال رقم هاتف صحيح للتواصل');
        return;
      }
      if (!guestTeamName.trim()) {
        setFormError('يرجى إدخال اسم الفريق أو المجموعة');
        return;
      }
    }

    setFormError('');

    router.push({
      pathname: `/challenges/created/${params.stadiumId || '1'}` as any,
      params: {
        stadiumId: params.stadiumId,
        stadiumName,
        date: matchDate,
        time: matchTime,
        matchType,
        bookerName: isAuthenticated ? user?.name : guestName.trim(),
        bookerPhone: isAuthenticated ? user?.phone : guestPhone.trim(),
        teamName: isAuthenticated ? ((user?.team?.name as string) || user?.name) : guestTeamName.trim(),
      },
    });
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <AjiNqssroHeader
        showBack
        rightAction={
          <TouchableOpacity
            style={styles.mapShortcutBtn}
            onPress={() => router.push('/(public)/stadiums' as any)}
          >
            <Text style={styles.mapShortcutText}>الملاعب</Text>
            <Map size={16} color="#00875A" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Title Header with Check Icon */}
        <View style={styles.headerTitleWrap}>
          <View style={styles.titleRow}>
            <View style={styles.verifiedCheckBadge}>
              <Check size={16} color="#FFFFFF" strokeWidth={3} />
            </View>
            <Text style={styles.screenTitle}>تأكيد الحجز</Text>
          </View>
          <Text style={styles.screenSubtitle}>راجع تفاصيل حجزك قبل التأكيد</Text>
        </View>

        {/* Stadium & Match Summary Card */}
        <View style={styles.summaryCard}>
          {/* Stadium Photo Banner */}
          <View style={styles.imageWrap}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1529900748604-07564a03e7a6?auto=format&fit=crop&w=800&q=80',
              }}
              style={styles.stadiumImage}
            />
            <View style={styles.stadiumTagBadge}>
              <Text style={styles.stadiumTagText}>{stadiumName}</Text>
            </View>
          </View>

          {/* Stadium Title & Location & Rating */}
          <View style={styles.stadiumBody}>
            <View style={styles.stadiumHeaderRow}>
              <View style={styles.ratingRow}>
                <Text style={styles.ratingReviews}>(52 تقييم)</Text>
                <Text style={styles.ratingNum}>4.8</Text>
                <Star size={13} color="#F59E0B" fill="#F59E0B" />
              </View>
              <Text style={styles.stadiumTitleText}>{stadiumName}</Text>
            </View>

            <View style={styles.locationRow}>
              <Text style={styles.locationText}>تنغير - جماعة أيت سدرين</Text>
              <MapPin size={13} color="#00875A" />
            </View>
          </View>

          {/* Details List (Date, Time, Type) */}
          <View style={styles.detailsList}>
            {/* Date Row */}
            <View style={styles.detailRow}>
              <Text style={styles.detailValue}>{matchDate}</Text>
              <View style={styles.detailLabelGroup}>
                <Text style={styles.detailLabel}>التاريخ</Text>
                <Calendar size={16} color="#00875A" />
              </View>
            </View>

            {/* Time Row */}
            <View style={styles.detailRow}>
              <Text style={styles.detailValue}>{matchTime}</Text>
              <View style={styles.detailLabelGroup}>
                <Text style={styles.detailLabel}>الساعة</Text>
                <Clock size={16} color="#00875A" />
              </View>
            </View>

            {/* Match Type Row */}
            <View style={[styles.detailRow, { borderBottomWidth: 0 }]}>
              <Text style={styles.detailValue}>{matchType}</Text>
              <View style={styles.detailLabelGroup}>
                <Text style={styles.detailLabel}>نوع المباراة</Text>
                <Trophy size={16} color="#00875A" />
              </View>
            </View>
          </View>
        </View>

        {/* Auth status or Guest Form */}
        {isAuthenticated ? (
          <View style={styles.authConfirmedCard}>
            <View style={styles.authConfirmedIconBox}>
              <Check size={20} color="#FFFFFF" strokeWidth={3} />
            </View>
            <View style={styles.authConfirmedContent}>
              <Text style={styles.authConfirmedTitle}>الحساب المؤكد للحجز</Text>
              <Text style={styles.authConfirmedName}>
                {user?.name} {user?.team?.name ? `• ${user.team.name}` : ''}
              </Text>
              <Text style={styles.authConfirmedPhone}>
                {user?.phone || 'مسيّر معتمد'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.guestFormCard}>
            <View style={styles.guestFormHeader}>
              <TouchableOpacity
                style={styles.guestLoginLinkBtn}
                onPress={() => router.push('/(auth)')}
                activeOpacity={0.8}
              >
                <LogIn size={14} color="#00875A" />
                <Text style={styles.guestLoginLinkText}>دخول للحساب</Text>
              </TouchableOpacity>
              <View style={styles.guestFormHeaderTexts}>
                <Text style={styles.guestFormTitle}>معلومات الحجز (كضيف)</Text>
                <Text style={styles.guestFormSubtitle}>
                  أدخل معلوماتك لتأكيد الحجز، أو سجل الدخول
                </Text>
              </View>
            </View>

            {formError ? (
              <View style={styles.formErrorBox}>
                <Text style={styles.formErrorText}>{formError}</Text>
              </View>
            ) : null}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>الاسم الكامل *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="مثال: كريم المرابطي"
                placeholderTextColor="#94A3B8"
                value={guestName}
                onChangeText={setGuestName}
                textAlign="right"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>رقم الهاتف للتأكيد *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="06XXXXXXXX"
                placeholderTextColor="#94A3B8"
                value={guestPhone}
                onChangeText={setGuestPhone}
                keyboardType="phone-pad"
                textAlign="right"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>اسم الفريق أو المجموعة *</Text>
              <TextInput
                style={styles.textInput}
                placeholder="مثال: أصدقاء دادس"
                placeholderTextColor="#94A3B8"
                value={guestTeamName}
                onChangeText={setGuestTeamName}
                textAlign="right"
              />
            </View>
          </View>
        )}

        {/* Security & Slogan Footer */}
        <View style={styles.trustFooter}>
          <View style={styles.securityRow}>
            <Text style={styles.securityText}>
              حجزك آمن ومضمون عبر أجي نقصرو
            </Text>
            <ShieldCheck size={16} color="#00875A" />
          </View>
          <Text style={styles.sloganText}>معاً .. نعيش كرة القدم</Text>
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Button */}
      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          style={styles.confirmActionBtn}
          onPress={handleFinalConfirm}
          activeOpacity={0.88}
        >
          <ArrowLeft size={20} color="#FFFFFF" />
          <View style={styles.confirmActionInner}>
            <Text style={styles.confirmActionText}>تأكيد الحجز</Text>
            <Calendar size={18} color="#FFFFFF" />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    paddingBottom: 95,
  },
  mapShortcutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  mapShortcutText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00875A',
  },
  headerTitleWrap: {
    alignItems: 'center',
    marginVertical: 14,
  },
  titleRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  verifiedCheckBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#064E3B',
  },
  screenSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    fontWeight: '600',
  },
  summaryCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  imageWrap: {
    width: '100%',
    height: 155,
    position: 'relative',
  },
  stadiumImage: {
    width: '100%',
    height: '100%',
  },
  stadiumTagBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(6, 95, 70, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  stadiumTagText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  stadiumBody: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  stadiumHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  ratingNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  ratingReviews: {
    fontSize: 11,
    color: '#64748B',
  },
  stadiumTitleText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#064E3B',
  },
  locationRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#64748B',
  },
  detailsList: {
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  detailLabelGroup: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  authPromptCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authPromptContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  authPromptTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#00875A',
    textAlign: 'right',
  },
  authPromptDesc: {
    fontSize: 11,
    color: '#334155',
    textAlign: 'right',
    marginTop: 2,
    lineHeight: 16,
  },
  authPromptIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authConfirmedCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  authConfirmedIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00875A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  authConfirmedContent: {
    flex: 1,
    alignItems: 'flex-end',
  },
  authConfirmedTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00875A',
  },
  authConfirmedName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#064E3B',
    marginTop: 2,
  },
  authConfirmedPhone: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  guestFormCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  guestFormHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  guestLoginLinkBtn: {
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
  guestLoginLinkText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00875A',
  },
  guestFormHeaderTexts: {
    alignItems: 'flex-end',
  },
  guestFormTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#064E3B',
  },
  guestFormSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  formErrorBox: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 10,
    padding: 8,
    marginBottom: 12,
  },
  formErrorText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'right',
    marginBottom: 4,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0F172A',
  },
  trustFooter: {
    alignItems: 'center',
    marginTop: 20,
    gap: 6,
  },
  securityRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  securityText: {
    fontSize: 12,
    color: '#00875A',
    fontWeight: '700',
  },
  sloganText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F0FDF4',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  confirmActionBtn: {
    backgroundColor: '#00875A',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  confirmActionInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  confirmActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
