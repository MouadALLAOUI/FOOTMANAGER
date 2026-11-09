import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Calendar, Clock, Flame, MapPin, Shield, Swords, Users } from 'lucide-react-native';

import type { FeedMatch } from '@/api/matches';
import { useI18n } from '@/i18n/I18nProvider';
import { formatTime } from '@/utils/format';
import { resolveImageUrl } from '@/utils/image';

export function MatchCard({
  match,
  onPress,
}: {
  match: FeedMatch;
  onPress: () => void;
}): React.JSX.Element {
  const { t, formatDate, locale } = useI18n();

  const hostTeamName = match.host_team?.name ?? t('match.unknownTeam', 'فريق مستضيف');
  const opponentTeam = (match as FeedMatch & { opponent_team?: { name?: string | null; logo_url?: string | null } | null }).opponent_team;
  const opponentTeamName = opponentTeam?.name ?? null;
  const hostLogo = resolveImageUrl(match.host_team?.logo_url);
  const opponentLogo = resolveImageUrl(opponentTeam?.logo_url);
  const terrainName = match.stadium?.name ?? match.custom_terrain_name ?? t('match.noTerrain', 'ملعب محلي');
  const city = match.stadium?.city ?? match.host_team?.city ?? '';
  const playerFormat = match.player_format ? match.player_format.toUpperCase() : '7V7';
  const spots = match.players_remaining ?? match.players_needed ?? 0;
  const isFull = Boolean(match.players_full);
  const needsPlayers = Boolean(match.needs_players);

  const spotsLabel = isFull
    ? t('match.full', 'مكتمل')
    : `${spots} ${t('match.spotsLeftShort', 'أماكن متاحة')}`;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.9}
      accessibilityRole="button"
    >
      {/* Top Status Banner */}
      <View style={styles.topBanner}>
        <View style={styles.formatPill}>
          <Swords size={14} color="#00875A" />
          <Text style={styles.formatPillText}>{playerFormat}</Text>
        </View>

        {needsPlayers ? (
          <View style={[styles.spotsPill, isFull ? styles.spotsPillFull : styles.spotsPillOpen]}>
            <Users size={14} color={isFull ? '#DC2626' : '#00875A'} />
            <Text style={[styles.spotsPillText, isFull ? styles.spotsTextFull : styles.spotsTextOpen]}>
              {spotsLabel}
            </Text>
          </View>
        ) : (
          <View style={styles.challengePill}>
            <Flame size={14} color="#EA580C" />
            <Text style={styles.challengePillText}>مباراة ودية</Text>
          </View>
        )}
      </View>

      {/* Teams VS Row */}
      <View style={styles.teamsRow}>
        {/* Host Team (Right in RTL) */}
        <View style={styles.teamCol}>
          {hostLogo ? (
            <Image source={{ uri: hostLogo }} style={styles.teamLogo} resizeMode="cover" />
          ) : (
            <View style={[styles.teamShield, { backgroundColor: '#00875A' }]}>
              <Shield size={20} color="#FFFFFF" />
            </View>
          )}
          <Text style={styles.teamName} numberOfLines={1}>
            {hostTeamName}
          </Text>
          <Text style={styles.teamRoleLabel}>المنظم</Text>
        </View>

        {/* VS Badge */}
        <View style={styles.vsBadge}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        {/* Opponent Team (Left in RTL) */}
        <View style={styles.teamCol}>
          {opponentLogo ? (
            <Image source={{ uri: opponentLogo }} style={styles.teamLogo} resizeMode="cover" />
          ) : (
            <View
              style={[
                styles.teamShield,
                { backgroundColor: opponentTeamName ? '#0284C7' : '#E2E8F0' },
              ]}
            >
              <Shield size={20} color={opponentTeamName ? '#FFFFFF' : '#64748B'} />
            </View>
          )}
          <Text
            style={[styles.teamName, !opponentTeamName && styles.waitingTeamText]}
            numberOfLines={1}
          >
            {opponentTeamName ?? 'في انتظار المنافس'}
          </Text>
          <Text style={styles.teamRoleLabel}>المنافس</Text>
        </View>
      </View>

      {/* Metadata Chips Footer */}
      <View style={styles.metaFooter}>
        <View style={styles.metaChip}>
          <Text style={styles.metaChipText} numberOfLines={1}>
            {[terrainName, city].filter(Boolean).join(' • ')}
          </Text>
          <MapPin size={14} color="#00875A" />
        </View>

        <View style={styles.metaDateTimeRow}>
          <View style={styles.metaChipSmall}>
            <Text style={styles.metaChipText}>
              {formatTime(match.match_datetime, locale)}
            </Text>
            <Clock size={13} color="#00875A" />
          </View>
          <View style={styles.metaChipSmall}>
            <Text style={styles.metaChipText}>{formatDate(match.match_datetime)}</Text>
            <Calendar size={13} color="#00875A" />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  topBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#DCFCE7',
  },
  formatPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  formatPillText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#00875A',
  },
  spotsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  spotsPillOpen: {
    backgroundColor: '#DCFCE7',
  },
  spotsPillFull: {
    backgroundColor: '#FEE2E2',
  },
  spotsPillText: {
    fontSize: 13,
    fontWeight: '800',
  },
  spotsTextOpen: {
    color: '#00875A',
  },
  spotsTextFull: {
    color: '#DC2626',
  },
  challengePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  challengePillText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#EA580C',
  },
  teamsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  teamCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  teamLogo: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: '#00875A',
  },
  teamShield: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#062F36',
    textAlign: 'center',
  },
  waitingTeamText: {
    color: '#64748B',
    fontWeight: '700',
  },
  teamRoleLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  vsBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#EAF7FF',
    borderWidth: 1.5,
    borderColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  vsText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#0284C7',
  },
  metaFooter: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 6,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
  },
  metaDateTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaChipSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  metaChipText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
});
