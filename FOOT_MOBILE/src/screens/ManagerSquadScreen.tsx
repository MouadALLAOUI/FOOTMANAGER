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
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Edit2,
  Plus,
  Search,
  Shield,
  User,
  Users,
} from 'lucide-react-native';

import { AjiNqssroHeader } from '@/components/ui/AjiNqssroHeader';
import { PositionBadge } from '@/components/ui/PositionBadge';
import { useTeamMembers, useTeamProfile } from '@/api/managerTeam';

export default function ManagerSquadScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  const { data: teamData } = useTeamProfile();
  const { data: squadData, isLoading } = useTeamMembers();

  const defaultAvatar =
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';

  const apiPlayers =
    squadData?.players?.map((p) => ({
      id: p.id,
      name: p.name,
      position: p.position || 'CM',
      number: p.number ?? p.id,
      avatar: p.avatar_url || defaultAvatar,
    })) || [];

  const filteredPlayers = apiPlayers.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const teamName = teamData?.team?.name || 'فريقك';
  const playersCount = apiPlayers.length;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <AjiNqssroHeader
        showBack
        title="الفريق واللاعبين"
        titleIcon={<Users size={22} color="#00875A" />}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Team Card */}
        <View style={styles.teamCard}>
          <View style={styles.teamLogoBox}>
            <Shield size={36} color="#00875A" />
            <Text style={styles.teamLogoText}>AHL</Text>
            <Text style={styles.teamLogoYear}>2026</Text>
          </View>

          <View style={styles.teamInfoCol}>
            <View style={styles.teamNameRow}>
              <TouchableOpacity style={styles.editPencilBtn}>
                <Edit2 size={14} color="#64748B" />
              </TouchableOpacity>
              <Text style={styles.teamTitle}>{teamName}</Text>
            </View>

            <Text style={styles.teamSubtitle}>فريق {teamName}</Text>

            <View style={styles.playerCountRow}>
              <Text style={styles.playerCountText}>{playersCount} لاعب</Text>
              <User size={13} color="#00875A" />
            </View>
          </View>
        </View>

        {/* Add Player Big Button: + إضافة لاعب */}
        <TouchableOpacity
          style={styles.addPlayerBtn}
          onPress={() => router.push('/(manager)/team/add-player')}
          activeOpacity={0.88}
        >
          <Plus size={18} color="#FFFFFF" strokeWidth={3} />
          <Text style={styles.addPlayerBtnText}>إضافة لاعب</Text>
        </TouchableOpacity>

        {/* Search Input */}
        {apiPlayers.length > 0 && (
          <View style={styles.searchWrap}>
            <View style={styles.searchBar}>
              <TextInput
                style={styles.searchInput}
                placeholder="البحث عن لاعب..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                textAlign="right"
              />
              <Search size={18} color="#64748B" />
            </View>
          </View>
        )}

        {/* Players List */}
        <View style={styles.playersList}>
          {filteredPlayers.length > 0 ? (
            filteredPlayers.map((player) => (
              <TouchableOpacity
                key={player.id}
                style={styles.playerCard}
                onPress={() => router.push(`/(manager)/team/${player.id}`)}
                activeOpacity={0.8}
              >
                <ChevronLeft size={18} color="#94A3B8" />

                <View style={styles.playerRightContent}>
                  <View style={styles.playerMetaCol}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <View style={styles.badgeNumberRow}>
                      <Text style={styles.playerNumberText}>رقم {player.number}</Text>
                      <PositionBadge position={player.position} size="sm" />
                    </View>
                  </View>

                  <Image
                    source={{ uri: player.avatar }}
                    style={styles.playerAvatar}
                  />
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptySquadCard}>
              <Users size={36} color="#94A3B8" />
              <Text style={styles.emptySquadTitle}>
                {searchQuery ? 'لا توجد نتائج مطابقة للبحث' : 'لا يوجد لاعبين مضافين حالياً'}
              </Text>
              <Text style={styles.emptySquadSubtitle}>
                {searchQuery
                  ? 'جرب البحث باسم آخر'
                  : 'ابدأ بإضافة لاعبي فريقك لتنظيم التشكيلة'}
              </Text>
            </View>
          )}
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
  teamCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 16,
    marginVertical: 14,
    shadowColor: '#00875A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  teamLogoBox: {
    width: 68,
    height: 78,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#00875A',
    backgroundColor: '#F0FDF4',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  teamLogoText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#064E3B',
    marginTop: -4,
  },
  teamLogoYear: {
    fontSize: 8,
    color: '#00875A',
    fontWeight: '700',
  },
  teamInfoCol: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  teamNameRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  teamTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#064E3B',
  },
  editPencilBtn: {
    padding: 4,
  },
  teamSubtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  playerCountRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  playerCountText: {
    fontSize: 12,
    color: '#00875A',
    fontWeight: '700',
  },
  addPlayerBtn: {
    backgroundColor: '#00875A',
    borderRadius: 16,
    paddingVertical: 13,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  addPlayerBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
  searchWrap: {
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
    fontWeight: '600',
  },
  playersList: {
    gap: 10,
  },
  playerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  playerRightContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  playerMetaCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  badgeNumberRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  playerNumberText: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  playerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  emptySquadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptySquadTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 12,
    textAlign: 'center',
  },
  emptySquadSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
  },
});

