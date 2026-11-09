import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  Modal as RNModal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import {
  AlertTriangle,
  Calendar,
  Check,
  Clock,
  Flame,
  Info,
  MapPin,
  MessageCircle,
  Phone,
  Share2,
  Shield,
  Swords,
  Trash2,
  Trophy,
  UserCheck,
  Users,
  X,
} from 'lucide-react-native';

import {
  useAcceptMatchRequest,
  useCancelMatchRequest,
  useConfirmChallengeProposal,
  useConfirmScore,
  useDeleteOpenMatchRequest,
  useDisputeScore,
  useManagerMatchDetail,
  useMatchApplicants,
  useMatchChallengeProposals,
  useRespondToApplication,
  useRespondToChallenge,
  useStartMatch,
  useSubmitScore,
} from '@/api/managerMatches';
import { getApiErrorMessage } from '@/api/errors';
import { useAuth } from '@/auth/AuthProvider';
import { AjiNqssroTabBar } from '@/components/navigation/AjiNqssroTabBar';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { ManagerFloatingHeader, ManagerPageTitle } from '@/components/ui/ManagerFloatingHeader';
import { useToast } from '@/components/ui/Toast';
import { resolveImageUrl } from '@/utils/image';

function getStatusBanner(status?: string | null): { label: string; bg: string; fg: string } {
  switch (status) {
    case 'live':
    case 'in_progress':
      return { label: 'مباشر الآن 🔴', bg: '#FEE2E2', fg: '#DC2626' };
    case 'accepted':
    case 'matched':
      return { label: 'مباراة مؤكدة ✓', bg: '#DCFCE7', fg: '#00875A' };
    case 'open':
      return { label: 'تنتظر الخصم ⏳', bg: '#FEF3C7', fg: '#D97706' };
    case 'completed':
      return { label: 'مباراة منتهية', bg: '#EAF7FF', fg: '#0284C7' };
    case 'cancelled':
    case 'declined':
      return { label: 'ملغاة', bg: '#F1F5F9', fg: '#64748B' };
    default:
      return { label: status ?? 'مباراة', bg: '#F1F5F9', fg: '#475569' };
  }
}

export default function ManagerMatchDetailScreen(): React.JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const { user } = useAuth();

  const matchId = Array.isArray(id) ? id[0] : id;

  const { match, isLoading, isError, error, refetch } = useManagerMatchDetail(matchId);
  const applicantsQuery = useMatchApplicants(matchId);

  const myTeamId = user?.team?.id;
  const isHost = Boolean(match && myTeamId && Number(match.host_team_id) === Number(myTeamId));
  const isTargetOfDirectChallenge = Boolean(
    match &&
      myTeamId &&
      match.type === 'direct_challenge' &&
      Number(match.target_team_id) === Number(myTeamId),
  );

  const proposalsQuery = useMatchChallengeProposals(
    matchId,
    Boolean(isHost && match?.status === 'open'),
  );

  // Mutations
  const respondAppMutation = useRespondToApplication();
  const acceptMatchMutation = useAcceptMatchRequest();
  const respondChallengeMutation = useRespondToChallenge();
  const confirmProposalMutation = useConfirmChallengeProposal();
  const deleteOpenMutation = useDeleteOpenMatchRequest();
  const cancelMatchMutation = useCancelMatchRequest();
  const startMutation = useStartMatch();
  const submitScoreMutation = useSubmitScore();
  const confirmScoreMutation = useConfirmScore();
  const disputeScoreMutation = useDisputeScore();

  // Dialog & Modal states
  const [startOpen, setStartOpen] = useState(false);
  const [scoreModalOpen, setScoreModalOpen] = useState(false);
  const [confirmScoreOpen, setConfirmScoreOpen] = useState(false);
  const [disputeScoreOpen, setDisputeScoreOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('تعذر الحضور لظروف طارئة');
  const [hostScoreInput, setHostScoreInput] = useState('');
  const [oppScoreInput, setOppScoreInput] = useState('');

  const status = match?.status;
  const isLiveOrFinished = status === 'live' || status === 'completed';
  const isFinished = status === 'completed';
  const canStart = isHost && (status === 'open' || status === 'accepted');
  const scoreStatus = match?.score_status;

  const applicants = useMemo(
    () => applicantsQuery.data?.applications ?? [],
    [applicantsQuery.data],
  );
  const pendingApplicants = useMemo(
    () => applicants.filter((a) => a.status === 'pending'),
    [applicants],
  );
  const joinedPlayers = useMemo(
    () => applicants.filter((a) => a.status === 'accepted'),
    [applicants],
  );
  const pendingProposals = useMemo(
    () => (proposalsQuery.data?.proposals ?? []).filter((p) => p.status === 'pending'),
    [proposalsQuery.data],
  );

  const resetScores = useCallback(() => {
    setHostScoreInput(String(match?.host_score ?? '0'));
    setOppScoreInput(String(match?.opponent_score ?? '0'));
  }, [match?.host_score, match?.opponent_score]);

  const handleShareChallenge = async () => {
    if (!match) return;
    const tokenOrId = match.invitation_token || match.id;
    const url = `https://ajn9essro.com/challenge/${tokenOrId}`;
    const hostName = match.hostTeam?.name ?? 'فريقنا';
    const venueName = match.stadium?.name ?? match.custom_terrain_name ?? 'ملعب كرة القدم';
    const message = `⚽🔥 تحدي مباراة ودية من فريق "${hostName}" على منصة أجي نقصرو!\n🏟️ الملعب: ${venueName}\nاقبل التحدي من هنا:\n${url}`;

    const waUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
    const canOpenWa = await Linking.canOpenURL(waUrl).catch(() => false);
    if (canOpenWa) {
      await Linking.openURL(waUrl);
    } else {
      await Share.share({ message });
    }
  };

  const handleAcceptOpenMatch = async () => {
    if (!match) return;
    try {
      const res = await acceptMatchMutation.mutateAsync({ id: match.id });
      toast.show(res.message || 'تم قبول التحدي وتأكيد المباراة!', 'success');
      await refetch();
    } catch (err) {
      Alert.alert('تنبيه', getApiErrorMessage(err));
    }
  };

  const handleRespondDirectChallenge = async (action: 'accept' | 'decline') => {
    if (!match) return;
    try {
      const res = await respondChallengeMutation.mutateAsync({ id: match.id, action });
      toast.show(res.message || 'تم تحديث حالة التحدي', 'success');
      await refetch();
    } catch (err) {
      Alert.alert('تنبيه', getApiErrorMessage(err));
    }
  };

  const handleConfirmProposal = async (proposalId: number) => {
    if (!match) return;
    try {
      const res = await confirmProposalMutation.mutateAsync({
        matchId: match.id,
        proposalId,
      });
      toast.show(res.message || 'تم تأكيد الفريق المنافس بنجاح!', 'success');
      await refetch();
      await proposalsQuery.refetch();
    } catch (err) {
      Alert.alert('تنبيه', getApiErrorMessage(err));
    }
  };

  const handleCancelOrDeleteMatch = async () => {
    if (!match) return;
    try {
      if (match.status === 'open' && isHost) {
        const res = await deleteOpenMutation.mutateAsync(match.id);
        setCancelModalOpen(false);
        toast.show(res.message || 'تم إلغاء طلب المباراة بنجاح', 'success');
        router.back();
      } else {
        const res = await cancelMatchMutation.mutateAsync({
          id: match.id,
          reason: cancelReason.trim() || 'إلغاء بطلب من مسير الفريق',
        });
        setCancelModalOpen(false);
        toast.show(res.message || 'تم إلغاء المباراة بنجاح', 'success');
        await refetch();
      }
    } catch (err) {
      setCancelModalOpen(false);
      Alert.alert('تنبيه', getApiErrorMessage(err));
    }
  };

  const handleRespondApplicant = (applicationId: number, action: 'accept' | 'decline') => {
    respondAppMutation.mutate(
      { applicationId, action },
      {
        onSuccess: (res) => {
          toast.show(res.message || (action === 'accept' ? 'تم قبول اللاعب' : 'تم رفض الطلب'), 'success');
          void applicantsQuery.refetch();
        },
        onError: (err) => {
          Alert.alert('تنبيه', getApiErrorMessage(err));
        },
      },
    );
  };

  const handleStart = () => {
    if (!match) return;
    startMutation.mutate(match.id, {
      onSuccess: (res) => {
        setStartOpen(false);
        toast.show(res.message || 'بدأت المباراة بنجاح!', 'success');
        void refetch();
      },
      onError: (err) => {
        setStartOpen(false);
        Alert.alert('تنبيه', getApiErrorMessage(err));
      },
    });
  };

  const handleSubmitScore = () => {
    if (!match) return;
    const payload = {
      host_score: Number(hostScoreInput) || 0,
      opponent_score: Number(oppScoreInput) || 0,
    };
    submitScoreMutation.mutate(
      { id: match.id, payload },
      {
        onSuccess: (res) => {
          setScoreModalOpen(false);
          toast.show(res.message || 'تم إرسال النتيجة بنجاح', 'success');
          void refetch();
        },
        onError: (err) => {
          Alert.alert('تنبيه', getApiErrorMessage(err));
        },
      },
    );
  };

  const handleConfirmScore = () => {
    if (!match) return;
    confirmScoreMutation.mutate(match.id, {
      onSuccess: (res) => {
        setConfirmScoreOpen(false);
        toast.show(res.message || 'تم تأكيد النتيجة بنجاح', 'success');
        void refetch();
      },
      onError: (err) => {
        setConfirmScoreOpen(false);
        Alert.alert('تنبيه', getApiErrorMessage(err));
      },
    });
  };

  const handleDisputeScore = () => {
    if (!match) return;
    disputeScoreMutation.mutate(match.id, {
      onSuccess: (res) => {
        setDisputeScoreOpen(false);
        toast.show(res.message || 'تم تسجيل الاعتراض على النتيجة', 'info');
        void refetch();
      },
      onError: (err) => {
        setDisputeScoreOpen(false);
        Alert.alert('تنبيه', getApiErrorMessage(err));
      },
    });
  };

  const formattedDate = match?.match_datetime
    ? new Date(match.match_datetime).toLocaleDateString('ar-MA', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'غير محدد';

  const formattedTime = match?.match_datetime
    ? new Date(match.match_datetime).toLocaleTimeString('ar-MA', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--:--';

  const hostName = match?.hostTeam?.name ?? 'الفريق المنظم';
  const awayName =
    match?.opponentTeam?.name ??
    match?.guest_team_name ??
    match?.targetTeam?.name ??
    'بانتظار الخصم';
  const hostLogo = resolveImageUrl(match?.hostTeam?.logo_url);
  const awayLogo = resolveImageUrl(
    match?.opponentTeam?.logo_url ?? match?.targetTeam?.logo_url,
  );
  const venue = match?.stadium?.name ?? match?.custom_terrain_name ?? 'ملعب محلي';
  const city = match?.stadium?.city ?? match?.hostTeam?.city ?? '';
  const statusInfo = getStatusBanner(status);

  return (
    <ImageBackground
      source={require('../../assets/role-selection-bg.png')}
      style={styles.screenBg}
      resizeMode="cover"
    >
      <View style={[styles.safeContainer, { paddingTop: insets.top }]}>
        <ManagerFloatingHeader />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <ManagerPageTitle
            title="تفاصيل المباراة"
            subtitle="إدارة المواجهة، النتيجة، وطلبات اللاعبين"
            icon={<Trophy size={20} color="#FFFFFF" />}
            showBack
          />

          {isLoading ? (
            <View style={styles.stateCard}>
              <ActivityIndicator size="large" color="#00875A" />
              <Text style={styles.stateTitle}>جاري تحميل تفاصيل المباراة...</Text>
            </View>
          ) : isError || !match ? (
            <View style={styles.stateCard}>
              <AlertTriangle size={36} color="#DC2626" />
              <Text style={styles.stateTitle}>تعذر تحميل المباراة</Text>
              <Text style={styles.stateSubtitle}>
                {error ? getApiErrorMessage(error) : 'يرجى التحقق من الاتصال والمحاولة مجدداً.'}
              </Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => void refetch()}>
                <Text style={styles.retryBtnText}>إعادة المحاولة</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* ─── A. VS Matchup Hero Card ─── */}
              <View style={styles.heroCard}>
                <View style={styles.heroTopStrip}>
                  <View style={styles.formatPill}>
                    <Swords size={14} color="#00875A" />
                    <Text style={styles.formatPillText}>
                      {(match.player_format || '7v7').toUpperCase()}
                    </Text>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
                    <Text style={[styles.statusBadgeText, { color: statusInfo.fg }]}>
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>

                <View style={styles.vsMatchupRow}>
                  {/* Host Team (Right in RTL) */}
                  <View style={styles.teamCol}>
                    {hostLogo ? (
                      <Image source={{ uri: hostLogo }} style={styles.teamLogo} resizeMode="cover" />
                    ) : (
                      <View style={[styles.teamShield, { backgroundColor: '#00875A' }]}>
                        <Shield size={26} color="#FFFFFF" />
                      </View>
                    )}
                    <Text style={styles.teamNameText} numberOfLines={2}>
                      {hostName}
                    </Text>
                    <Text style={styles.teamRoleText}>الفريق المنظم</Text>
                  </View>

                  {/* Score or VS */}
                  <View style={styles.vsCenterCol}>
                    {isLiveOrFinished || (match.host_score != null && match.opponent_score != null) ? (
                      <View style={styles.scoreBoardBox}>
                        <Text style={styles.scoreBoardText}>
                          {match.host_score ?? 0} - {match.opponent_score ?? 0}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.vsCircle}>
                        <Text style={styles.vsCircleText}>VS</Text>
                      </View>
                    )}
                    {scoreStatus === 'pending_confirmation' && (
                      <View style={styles.pendingScorePill}>
                        <Text style={styles.pendingScorePillText}>بانتظار تأكيد النتيجة</Text>
                      </View>
                    )}
                  </View>

                  {/* Opponent Team (Left in RTL) */}
                  <View style={styles.teamCol}>
                    {awayLogo ? (
                      <Image source={{ uri: awayLogo }} style={styles.teamLogo} resizeMode="cover" />
                    ) : (
                      <View
                        style={[
                          styles.teamShield,
                          {
                            backgroundColor:
                              match.opponent_team_id || match.is_guest ? '#0284C7' : '#CBD5E1',
                          },
                        ]}
                      >
                        <Shield size={26} color="#FFFFFF" />
                      </View>
                    )}
                    <Text style={styles.teamNameText} numberOfLines={2}>
                      {awayName}
                    </Text>
                    <Text style={styles.teamRoleText}>الفريق المنافس</Text>
                  </View>
                </View>

                {/* Primary Actions inside Hero Card */}
                {status === 'open' && !isHost && (
                  <View style={styles.heroActionsWrap}>
                    {isTargetOfDirectChallenge ? (
                      <View style={styles.directRespondRow}>
                        <TouchableOpacity
                          style={styles.declineChallengeBtn}
                          onPress={() => void handleRespondDirectChallenge('decline')}
                          disabled={respondChallengeMutation.isPending}
                        >
                          <X size={18} color="#DC2626" />
                          <Text style={styles.declineChallengeBtnText}>رفض التحدي</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.acceptChallengeBtn}
                          onPress={() => void handleRespondDirectChallenge('accept')}
                          disabled={respondChallengeMutation.isPending}
                        >
                          <Check size={18} color="#FFFFFF" />
                          <Text style={styles.acceptChallengeBtnText}>قبول التحدي المباشر</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.acceptChallengeBtnFull}
                        onPress={() => void handleAcceptOpenMatch()}
                        disabled={acceptMatchMutation.isPending}
                      >
                        <Flame size={20} color="#FFFFFF" />
                        <Text style={styles.acceptChallengeBtnText}>قبول التحدي ومواجهة الفريق</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}

                {/* Share Challenge Link when open */}
                {status === 'open' && isHost && (
                  <View style={styles.shareBannerBox}>
                    <TouchableOpacity
                      style={styles.whatsAppShareBtn}
                      onPress={() => void handleShareChallenge()}
                      activeOpacity={0.88}
                    >
                      <MessageCircle size={18} color="#FFFFFF" />
                      <Text style={styles.whatsAppShareBtnText}>
                        مشاركة رابط التحدي عبر WhatsApp
                      </Text>
                      <Share2 size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* ─── B. Match Information Section ─── */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionBanner}>
                  <Text style={styles.sectionBannerTitle}>معلومات المباراة</Text>
                  <Info size={20} color="#FFFFFF" />
                </View>

                <View style={styles.infoGrid}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoValueText}>
                      {[venue, city].filter(Boolean).join(' • ')}
                    </Text>
                    <View style={styles.infoLabelWrap}>
                      <Text style={styles.infoLabelText}>الملعب</Text>
                      <MapPin size={18} color="#00875A" />
                    </View>
                  </View>

                  <View style={styles.infoDivider} />

                  <View style={styles.infoRow}>
                    <Text style={styles.infoValueText}>{formattedDate}</Text>
                    <View style={styles.infoLabelWrap}>
                      <Text style={styles.infoLabelText}>التاريخ</Text>
                      <Calendar size={18} color="#00875A" />
                    </View>
                  </View>

                  <View style={styles.infoDivider} />

                  <View style={styles.infoRow}>
                    <Text style={styles.infoValueText}>{formattedTime}</Text>
                    <View style={styles.infoLabelWrap}>
                      <Text style={styles.infoLabelText}>التوقيت</Text>
                      <Clock size={18} color="#00875A" />
                    </View>
                  </View>

                  {match.notes ? (
                    <>
                      <View style={styles.infoDivider} />
                      <View style={styles.notesBox}>
                        <Text style={styles.notesLabel}>ملاحظات المنظم:</Text>
                        <Text style={styles.notesText}>{match.notes}</Text>
                      </View>
                    </>
                  ) : null}
                </View>
              </View>

              {/* ─── C. Challenge Proposals (For Host of Open Match) ─── */}
              {isHost && status === 'open' && pendingProposals.length > 0 && (
                <View style={styles.sectionCard}>
                  <View style={[styles.sectionBanner, { backgroundColor: '#EA580C' }]}>
                    <Text style={styles.sectionBannerTitle}>
                      طلبات الفرق لمواجهتك ({pendingProposals.length})
                    </Text>
                    <Flame size={20} color="#FFFFFF" />
                  </View>

                  <View style={styles.sectionBody}>
                    {pendingProposals.map((prop) => {
                      const teamTitle =
                        prop.type === 'registered'
                          ? prop.team?.name ?? 'فريق مسجل'
                          : `${prop.guest_team_name ?? 'فريق ضيف'} (ضيف)`;
                      const contactPhone =
                        prop.type === 'registered'
                          ? prop.team?.manager?.phone
                          : prop.guest_phone;
                      return (
                        <View key={prop.id} style={styles.proposalItemCard}>
                          <View style={styles.proposalHeaderRow}>
                            <Text style={styles.proposalTeamName}>{teamTitle}</Text>
                            {contactPhone ? (
                              <View style={styles.phoneBadge}>
                                <Phone size={12} color="#00875A" />
                                <Text style={styles.phoneBadgeText}>{contactPhone}</Text>
                              </View>
                            ) : null}
                          </View>
                          {prop.notes ? (
                            <Text style={styles.proposalNotesText}>{prop.notes}</Text>
                          ) : null}
                          <TouchableOpacity
                            style={styles.confirmProposalBtn}
                            onPress={() => void handleConfirmProposal(prop.id)}
                            disabled={confirmProposalMutation.isPending}
                          >
                            <Check size={16} color="#FFFFFF" />
                            <Text style={styles.confirmProposalBtnText}>
                              اعتماد هذا الفريق كمنافس
                            </Text>
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* ─── D. Match Controls & Score Management ─── */}
              {(canStart || isLiveOrFinished || status === 'open' || status === 'accepted') && (
                <View style={styles.sectionCard}>
                  <View style={styles.sectionBanner}>
                    <Text style={styles.sectionBannerTitle}>إدارة حالة المباراة والنتيجة</Text>
                    <Trophy size={20} color="#FFFFFF" />
                  </View>

                  <View style={styles.sectionBody}>
                    {canStart && (
                      <TouchableOpacity
                        style={styles.startMatchBtn}
                        onPress={() => setStartOpen(true)}
                        activeOpacity={0.88}
                      >
                        <Trophy size={20} color="#FFFFFF" />
                        <Text style={styles.startMatchBtnText}>بدء المباراة الآن (مباشر)</Text>
                      </TouchableOpacity>
                    )}

                    {(isLiveOrFinished || status === 'accepted') && (
                      <View style={styles.scoreActionsCol}>
                        {scoreStatus === 'pending_confirmation' ? (
                          <View style={styles.pendingConfirmBox}>
                            <Text style={styles.pendingConfirmText}>
                              النتيجة المسجلة ({match.host_score ?? 0} - {match.opponent_score ?? 0}) بانتظار التأكيد النهائي.
                            </Text>
                            <View style={styles.confirmDisputeRow}>
                              <TouchableOpacity
                                style={styles.disputeBtn}
                                onPress={() => setDisputeScoreOpen(true)}
                                disabled={isFinished}
                              >
                                <X size={16} color="#DC2626" />
                                <Text style={styles.disputeBtnText}>اعتراض</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.confirmScoreBtn}
                                onPress={() => setConfirmScoreOpen(true)}
                              >
                                <Check size={16} color="#FFFFFF" />
                                <Text style={styles.confirmScoreBtnText}>تأكيد النتيجة</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : !isFinished ? (
                          <TouchableOpacity
                            style={styles.submitScoreBtn}
                            onPress={() => {
                              resetScores();
                              setScoreModalOpen(true);
                            }}
                            activeOpacity={0.88}
                          >
                            <Swords size={18} color="#FFFFFF" />
                            <Text style={styles.submitScoreBtnText}>تسجيل / تحديث نتيجة المباراة</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    )}

                    {/* Cancel Match Option for Open or Accepted */}
                    {(status === 'open' || status === 'accepted') && (
                      <TouchableOpacity
                        style={styles.cancelMatchBtn}
                        onPress={() => setCancelModalOpen(true)}
                        activeOpacity={0.85}
                      >
                        <Trash2 size={16} color="#DC2626" />
                        <Text style={styles.cancelMatchBtnText}>
                          {status === 'open' ? 'حذف / إلغاء طلب المباراة' : 'إلغاء المباراة المؤكدة'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* ─── E. Player Applicants & Roster ─── */}
              <View style={styles.sectionCard}>
                <View style={styles.sectionBanner}>
                  <Text style={styles.sectionBannerTitle}>
                    طلبات انضمام اللاعبين ({pendingApplicants.length})
                  </Text>
                  <Users size={20} color="#FFFFFF" />
                </View>

                <View style={styles.sectionBody}>
                  {pendingApplicants.length === 0 ? (
                    <Text style={styles.emptySectionText}>
                      لا توجد طلبات انضمام معلقة من لاعبين حالياً.
                    </Text>
                  ) : (
                    pendingApplicants.map((app) => (
                      <View key={app.id} style={styles.applicantItem}>
                        <View style={styles.applicantActions}>
                          <TouchableOpacity
                            style={styles.appDeclineBtn}
                            onPress={() => handleRespondApplicant(app.id, 'decline')}
                            disabled={respondAppMutation.isPending}
                          >
                            <X size={16} color="#DC2626" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.appAcceptBtn}
                            onPress={() => handleRespondApplicant(app.id, 'accept')}
                            disabled={respondAppMutation.isPending}
                          >
                            <Check size={16} color="#FFFFFF" />
                            <Text style={styles.appAcceptBtnText}>قبول</Text>
                          </TouchableOpacity>
                        </View>

                        <View style={styles.applicantInfo}>
                          <Text style={styles.applicantName}>
                            {app.player?.name ?? 'لاعب متقدم'}
                          </Text>
                          {app.position ? (
                            <Text style={styles.applicantPosition}>المركز: {app.position}</Text>
                          ) : null}
                        </View>
                      </View>
                    ))
                  )}

                  {joinedPlayers.length > 0 && (
                    <View style={styles.joinedRosterBox}>
                      <Text style={styles.joinedRosterTitle}>
                        اللاعبون المقبولون في المباراة ({joinedPlayers.length}):
                      </Text>
                      {joinedPlayers.map((p) => (
                        <View key={p.id} style={styles.joinedPlayerRow}>
                          <Text style={styles.joinedPlayerPos}>{p.position || 'لاعب'}</Text>
                          <View style={styles.joinedPlayerRight}>
                            <Text style={styles.joinedPlayerName}>
                              {p.player?.name ?? 'لاعب'}
                            </Text>
                            <UserCheck size={16} color="#00875A" />
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>
            </>
          )}
        </ScrollView>

        <AjiNqssroTabBar mode="manager" />

        {/* ─── Score Input Modal ─── */}
        <RNModal
          visible={scoreModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setScoreModalOpen(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setScoreModalOpen(false)}>
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setScoreModalOpen(false)}>
                  <X size={22} color="#64748B" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>تسجيل نتيجة المباراة</Text>
              </View>

              <View style={styles.scoreInputsRow}>
                <View style={styles.scoreInputCol}>
                  <Text style={styles.scoreTeamLabel} numberOfLines={1}>
                    {hostName}
                  </Text>
                  <TextInput
                    style={styles.scoreNumberInput}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={hostScoreInput}
                    onChangeText={setHostScoreInput}
                    textAlign="center"
                  />
                </View>

                <Text style={styles.scoreDash}>:</Text>

                <View style={styles.scoreInputCol}>
                  <Text style={styles.scoreTeamLabel} numberOfLines={1}>
                    {awayName}
                  </Text>
                  <TextInput
                    style={styles.scoreNumberInput}
                    keyboardType="number-pad"
                    maxLength={2}
                    value={oppScoreInput}
                    onChangeText={setOppScoreInput}
                    textAlign="center"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                onPress={handleSubmitScore}
                disabled={submitScoreMutation.isPending}
              >
                <Text style={styles.modalPrimaryBtnText}>حفظ وإرسال النتيجة</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </RNModal>

        {/* ─── Cancel Match Modal ─── */}
        <RNModal
          visible={cancelModalOpen}
          transparent
          animationType="fade"
          onRequestClose={() => setCancelModalOpen(false)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setCancelModalOpen(false)}>
            <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setCancelModalOpen(false)}>
                  <X size={22} color="#64748B" />
                </TouchableOpacity>
                <Text style={styles.modalTitle}>تأكيد إلغاء المباراة</Text>
              </View>

              {status !== 'open' && (
                <>
                  <Text style={styles.cancelPromptText}>يرجى تحديد سبب الإلغاء لإشعار الفريق الآخر:</Text>
                  <TextInput
                    style={styles.cancelReasonInput}
                    value={cancelReason}
                    onChangeText={setCancelReason}
                    placeholder="سبب الإلغاء..."
                    textAlign="right"
                  />
                </>
              )}

              <TouchableOpacity
                style={[styles.modalPrimaryBtn, { backgroundColor: '#DC2626', marginTop: 12 }]}
                onPress={() => void handleCancelOrDeleteMatch()}
                disabled={deleteOpenMutation.isPending || cancelMatchMutation.isPending}
              >
                <Text style={styles.modalPrimaryBtnText}>تأكيد الإلغاء</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </RNModal>

        <ConfirmationDialog
          visible={startOpen}
          title="بدء المباراة؟"
          description="سيتم تحويل حالة المباراة إلى مباشرة الآن."
          confirmLabel="بدء المباراة"
          cancelLabel="تراجع"
          loading={startMutation.isPending}
          onConfirm={handleStart}
          onCancel={() => setStartOpen(false)}
        />

        <ConfirmationDialog
          visible={confirmScoreOpen}
          title="تأكيد النتيجة النهائية؟"
          description="تأكيدك يعتمد نتيجة المباراة رسمياً في ترتيب الفرق."
          confirmLabel="تأكيد النتيجة"
          cancelLabel="تراجع"
          loading={confirmScoreMutation.isPending}
          onConfirm={handleConfirmScore}
          onCancel={() => setConfirmScoreOpen(false)}
        />

        <ConfirmationDialog
          visible={disputeScoreOpen}
          title="الاعتراض على النتيجة؟"
          description="سيتم إرجاع النتيجة للمراجعة وإشعار الفريق المنظم."
          destructive
          confirmLabel="تسجيل اعتراض"
          cancelLabel="تراجع"
          loading={disputeScoreMutation.isPending}
          onConfirm={handleDisputeScore}
          onCancel={() => setDisputeScoreOpen(false)}
        />
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  screenBg: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 32,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#16A34A',
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  heroTopStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 16,
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
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: '900',
  },
  vsMatchupRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  teamCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  teamLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    borderColor: '#00875A',
  },
  teamShield: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamNameText: {
    fontSize: 17,
    fontWeight: '900',
    color: '#062F36',
    textAlign: 'center',
  },
  teamRoleText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  vsCenterCol: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 10,
    gap: 6,
  },
  vsCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EAF7FF',
    borderWidth: 2,
    borderColor: '#38BDF8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsCircleText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0284C7',
  },
  scoreBoardBox: {
    backgroundColor: '#062F36',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  scoreBoardText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  pendingScorePill: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  pendingScorePillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#D97706',
  },
  heroActionsWrap: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  directRespondRow: {
    flexDirection: 'row',
    gap: 10,
  },
  declineChallengeBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingVertical: 12,
    borderRadius: 14,
  },
  declineChallengeBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#DC2626',
  },
  acceptChallengeBtn: {
    flex: 2,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00A651',
    paddingVertical: 12,
    borderRadius: 14,
  },
  acceptChallengeBtnFull: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00A651',
    paddingVertical: 14,
    borderRadius: 16,
  },
  acceptChallengeBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  shareBannerBox: {
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  whatsAppShareBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#16A34A',
    paddingVertical: 12,
    borderRadius: 14,
  },
  whatsAppShareBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#16A34A',
    overflow: 'hidden',
    marginBottom: 16,
    elevation: 3,
  },
  sectionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    backgroundColor: '#00875A',
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  sectionBannerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  sectionBody: {
    padding: 16,
    gap: 12,
  },
  infoGrid: {
    padding: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoLabelText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#64748B',
  },
  infoValueText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#062F36',
    flex: 1,
    textAlign: 'left',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  notesBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    alignItems: 'flex-end',
  },
  notesLabel: {
    fontSize: 13,
    fontWeight: '900',
    color: '#00875A',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#334155',
    textAlign: 'right',
  },
  proposalItemCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#FDBA74',
    gap: 8,
  },
  proposalHeaderRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  proposalTeamName: {
    fontSize: 16,
    fontWeight: '900',
    color: '#062F36',
  },
  phoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  phoneBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00875A',
  },
  proposalNotesText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
    textAlign: 'right',
  },
  confirmProposalBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00A651',
    paddingVertical: 10,
    borderRadius: 12,
  },
  confirmProposalBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  startMatchBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#00A651',
    paddingVertical: 14,
    borderRadius: 16,
  },
  startMatchBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  scoreActionsCol: {
    gap: 10,
  },
  pendingConfirmBox: {
    backgroundColor: '#FEF3C7',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    gap: 10,
  },
  pendingConfirmText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#92400E',
    textAlign: 'right',
  },
  confirmDisputeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  disputeBtn: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingVertical: 11,
    borderRadius: 12,
  },
  disputeBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#DC2626',
  },
  confirmScoreBtn: {
    flex: 2,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#00875A',
    paddingVertical: 11,
    borderRadius: 12,
  },
  confirmScoreBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  submitScoreBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0284C7',
    paddingVertical: 13,
    borderRadius: 14,
  },
  submitScoreBtnText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  cancelMatchBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#FEF2F2',
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  cancelMatchBtnText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#DC2626',
  },
  emptySectionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
    paddingVertical: 8,
  },
  applicantItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  applicantInfo: {
    alignItems: 'flex-end',
  },
  applicantName: {
    fontSize: 15,
    fontWeight: '900',
    color: '#062F36',
  },
  applicantPosition: {
    fontSize: 12,
    fontWeight: '700',
    color: '#00875A',
    marginTop: 2,
  },
  applicantActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  appDeclineBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appAcceptBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00A651',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  appAcceptBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  joinedRosterBox: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    gap: 8,
  },
  joinedRosterTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#062F36',
    textAlign: 'right',
  },
  joinedPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#E9FBF2',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
  },
  joinedPlayerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  joinedPlayerName: {
    fontSize: 14,
    fontWeight: '900',
    color: '#062F36',
  },
  joinedPlayerPos: {
    fontSize: 12,
    fontWeight: '800',
    color: '#00875A',
  },
  stateCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#CBD5E1',
    gap: 10,
  },
  stateTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#062F36',
    textAlign: 'center',
  },
  stateSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: '#00875A',
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: 14,
    marginTop: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 47, 54, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalSheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: '#00875A',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#062F36',
  },
  scoreInputsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  scoreInputCol: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  scoreTeamLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: '#062F36',
  },
  scoreNumberInput: {
    width: 76,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#00875A',
    fontSize: 26,
    fontWeight: '900',
    color: '#062F36',
  },
  scoreDash: {
    fontSize: 28,
    fontWeight: '900',
    color: '#64748B',
    marginHorizontal: 8,
  },
  modalPrimaryBtn: {
    backgroundColor: '#00A651',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  cancelPromptText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'right',
    marginBottom: 8,
  },
  cancelReasonInput: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    padding: 12,
    fontSize: 14,
    fontWeight: '700',
    color: '#062F36',
  },
});
