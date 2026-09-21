import React from 'react';
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
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  Edit,
  Flag,
  Info,
  Ruler,
  Scale,
  Shield,
  Shirt,
  TrendingUp,
  User,
} from 'lucide-react-native';

import { AjiNqssroHeader } from '@/components/ui/AjiNqssroHeader';
import { PositionBadge } from '@/components/ui/PositionBadge';
import { useSquadMemberDetail, useTeamProfile } from '@/api/managerTeam';

export default function SquadMemberDetailScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const { player: squadMember, isLoading } = useSquadMemberDetail(params.id);
  const { data: teamData } = useTeamProfile();

  const defaultAvatar =
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80';

  const posMap: Record<string, string> = {
    goalkeeper: 'GK',
    defender: 'CB',
    midfielder: 'CM',
    forward: 'ST',
  };

  const posLabelMap: Record<string, string> = {
    GK: 'حارس المرمى',
    CB: 'مدافع',
    CDM: 'وسط دفاعي',
    CM: 'وسط ميدان',
    W: 'جناح',
    ST: 'مهاجم',
    goalkeeper: 'حارس المرمى',
    defender: 'مدافع',
    midfielder: 'وسط ميدان',
    forward: 'مهاجم',
  };

  const rawPos = squadMember?.position || 'CM';
  const normalizedPos = posMap[rawPos] || rawPos;

  const player = {
    name: squadMember?.name || 'لاعب الفريق',
    jerseyNumber: squadMember?.number ?? (params.id || 10),
    position: normalizedPos,
    positionLabel: posLabelMap[rawPos] || posLabelMap[normalizedPos] || 'لاعب',
    age: squadMember?.joined_at
      ? `${Math.max(18, new Date().getFullYear() - new Date(squadMember.joined_at).getFullYear() + 18)} سنة`
      : '20 سنة',
    height: squadMember?.height_cm ? `${(squadMember.height_cm / 100).toFixed(2)} م` : '1.80 م',
    weight: squadMember?.weight_kg ? `${squadMember.weight_kg} كغ` : '72 كغ',
    fitness: 75,
    reflexes: normalizedPos === 'GK' ? 85 : 75,
    focus: 80,
    goalkeeping: normalizedPos === 'GK' ? 88 : 45,
    nationality: 'المغرب 🇲🇦',
    joinDate: squadMember?.joined_at || '2026-01-01',
    status: squadMember?.status === 'injured' ? 'مصاب' : 'متاح',
    image: squadMember?.avatar_url || defaultAvatar,
  };

  const teamName = teamData?.team?.name || 'فريقك';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header with Team Logo on Right */}
      <AjiNqssroHeader
        showBack
        rightAction={
          <View style={styles.headerTeamCol}>
            <Text style={styles.headerTeamName}>{teamName}</Text>
            <Text style={styles.headerTeamSub}>فريق {teamName}</Text>
          </View>
        }
      />


      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Player Banner Card */}
        <View style={styles.playerCard}>
          <View style={styles.playerTopRow}>
            {/* Jersey Number Tag */}
            <View style={styles.jerseyNumBadge}>
              <Text style={styles.jerseyNumText}>{player.jerseyNumber}</Text>
            </View>

            <View style={styles.playerMainMeta}>
              <Text style={styles.playerName}>{player.name}</Text>
              <View style={styles.positionBadgeWrap}>
                <Text style={styles.positionBadgeText}>{player.positionLabel}</Text>
                <PositionBadge position={player.position} size="sm" />
              </View>

              {/* Physical Stats: Age, Height, Weight */}
              <View style={styles.physicalStatsRow}>
                <View style={styles.physicalStatItem}>
                  <Text style={styles.physicalStatValue}>{player.weight}</Text>
                  <Text style={styles.physicalStatLabel}>الوزن</Text>
                </View>
                <View style={styles.physicalStatItem}>
                  <Text style={styles.physicalStatValue}>{player.height}</Text>
                  <Text style={styles.physicalStatLabel}>الطول</Text>
                </View>
                <View style={styles.physicalStatItem}>
                  <Text style={styles.physicalStatValue}>{player.age}</Text>
                  <Text style={styles.physicalStatLabel}>العمر</Text>
                </View>
              </View>
            </View>

            {/* Portrait Image */}
            <Image source={{ uri: player.image }} style={styles.portraitPhoto} />
          </View>
        </View>

        {/* Section: إحصائيات اللاعب */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>إحصائيات اللاعب</Text>
            <TrendingUp size={16} color="#00875A" />
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxNum}>{player.fitness}</Text>
              <Text style={styles.statBoxLabel}>اللياقة</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxNum}>{player.reflexes}</Text>
              <Text style={styles.statBoxLabel}>الردود</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxNum}>{player.focus}</Text>
              <Text style={styles.statBoxLabel}>التركيز</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statBoxNum}>{player.goalkeeping}</Text>
              <Text style={styles.statBoxLabel}>المرمى</Text>
            </View>
          </View>
        </View>

        {/* Section: معلومات إضافية */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>معلومات إضافية</Text>
            <Info size={16} color="#00875A" />
          </View>

          <View style={styles.infoList}>
            {/* Jersey Number */}
            <View style={styles.infoRow}>
              <Text style={styles.infoVal}>{player.jerseyNumber}</Text>
              <View style={styles.infoLabelSide}>
                <Text style={styles.infoLabel}>الرقم في القميص</Text>
                <Shirt size={15} color="#00875A" />
              </View>
            </View>

            {/* Nationality */}
            <View style={styles.infoRow}>
              <Text style={styles.infoVal}>{player.nationality}</Text>
              <View style={styles.infoLabelSide}>
                <Text style={styles.infoLabel}>الجنسية</Text>
                <Flag size={15} color="#00875A" />
              </View>
            </View>

            {/* Join Date */}
            <View style={styles.infoRow}>
              <Text style={styles.infoVal}>{player.joinDate}</Text>
              <View style={styles.infoLabelSide}>
                <Text style={styles.infoLabel}>تاريخ الانضمام</Text>
                <Calendar size={15} color="#00875A" />
              </View>
            </View>

            {/* Status */}
            <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{player.status}</Text>
              </View>
              <View style={styles.infoLabelSide}>
                <Text style={styles.infoLabel}>الحالة</Text>
                <User size={15} color="#00875A" />
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.editPlayerBtn}
          onPress={() => router.push('/(manager)/team/add-player')}
          activeOpacity={0.88}
        >
          <Edit size={16} color="#FFFFFF" />
          <Text style={styles.editPlayerBtnText}>تعديل بيانات اللاعب</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.backToTeamBtn}
          onPress={() => router.back()}
          activeOpacity={0.85}
        >
          <ChevronLeft size={18} color="#00875A" />
          <Text style={styles.backToTeamBtnText}>العودة إلى الفريق</Text>
        </TouchableOpacity>
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
  headerTeamCol: {
    alignItems: 'flex-end',
  },
  headerTeamName: {
    fontSize: 13,
    fontWeight: '900',
    color: '#064E3B',
  },
  headerTeamSub: {
    fontSize: 10,
    color: '#64748B',
  },
  playerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 14,
  },
  playerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  jerseyNumBadge: {
    backgroundColor: '#00875A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  jerseyNumText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  playerMainMeta: {
    flex: 1,
    alignItems: 'flex-end',
  },
  playerName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  positionBadgeWrap: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  positionBadgeText: {
    fontSize: 12,
    color: '#00875A',
    fontWeight: '700',
  },
  physicalStatsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 14,
    marginTop: 10,
  },
  physicalStatItem: {
    alignItems: 'center',
  },
  physicalStatValue: {
    fontSize: 11,
    fontWeight: '800',
    color: '#0F172A',
  },
  physicalStatLabel: {
    fontSize: 10,
    color: '#64748B',
  },
  portraitPhoto: {
    width: 90,
    height: 100,
    borderRadius: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 14,
  },
  sectionHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#064E3B',
  },
  statsGrid: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  statBoxNum: {
    fontSize: 18,
    fontWeight: '900',
    color: '#00875A',
  },
  statBoxLabel: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '700',
  },
  infoList: {
    paddingHorizontal: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  infoVal: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  infoLabelSide: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: '#00875A',
    fontSize: 11,
    fontWeight: '800',
  },
  editPlayerBtn: {
    backgroundColor: '#00875A',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  editPlayerBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  backToTeamBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#00875A',
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  backToTeamBtnText: {
    color: '#00875A',
    fontSize: 14,
    fontWeight: '800',
  },
});
