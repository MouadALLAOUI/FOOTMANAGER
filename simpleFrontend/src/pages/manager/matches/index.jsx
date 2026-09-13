import i18n from '../../../i18n'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CalendarDays,
  CheckCircle2,
  Play,
  Plus,
  Radio,
  Share2,
  Shield,
  Trophy,
  Users,
  XCircle,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { SectionError } from '../../../components/errors'
import { useAuth } from '../../../context/AuthContext'
import { useTeam } from '../../../context/TeamContext'
import { toastApiError } from '../../../lib/errors'
import NewMatchModal from '../../../domains/manager/components/NewMatchModal'
import MatchProposalsModal from '../../../domains/manager/components/MatchProposalsModal'
import ScoreModal from '../../../domains/manager/components/ScoreModal'
import MatchDetail from '../../../domains/manager/components/MatchDetail'
import OpponentProfileModal from '../../../domains/manager/components/OpponentProfileModal'
import MatchLineupDrawer from '../components/MatchLineupDrawer'
import {
  Button,
  Empty,
  SectionTitle,
  SkeletonCards,
} from '../../../components/dashboard/ui'
import { MatchCard } from '../../../components/dashboard/cards'
import { useToast } from '../../../components/ui/Toast'

const tabs = () => [
  { key: 'all', label: i18n.t('dash.all') },
  { key: 'accepted', label: i18n.t('dash.confirmed') },
  { key: 'open', label: i18n.t('dash.open') },
  { key: 'live', label: i18n.t('dash.live') },
  { key: 'completed', label: i18n.t('dash.finished') },
  { key: 'pending_confirmation', label: i18n.t('dash.awaitingResult') },
  { key: 'cancelled', label: i18n.t('dash.cancelled') },
]

export default function Matches() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { user } = useAuth()
  const { currentTeam, teams } = useTeam()
  const myTeamIds = useMemo(
    () => new Set(teams.map((t) => t.id).concat(currentTeam?.id ? [currentTeam.id] : user?.team?.id ? [user.team.id] : [])),
    [teams, currentTeam, user?.team?.id],
  )
  const [tab, setTab] = useState('all')
  const { data, loading, errorState, refetch } = useApi(() =>
    api.get('/manager/my-match-requests?status=all').then((r) => r.data),
  )
  const { data: pendingScores } = useApi(() => api.get('/manager/matches/pending-scores').then((r) => r.data))
  const { data: pendingConfirms } = useApi(() => api.get('/manager/matches/pending-confirmations').then((r) => r.data))
  const [newOpen, setNewOpen] = useState(false)
  const [scoreMatchId, setScoreMatchId] = useState(null)
  const [confirmMatchId, setConfirmMatchId] = useState(null)
  // Modals track the match id, not a snapshot object: after accepting an
  // opponent the list refetches, and id-based lookup keeps the modals on
  // fresh data instead of a stale pre-refetch copy (missing opponent, etc.).
  const [detailId, setDetailId] = useState(null)
  const [lineupMatchId, setLineupMatchId] = useState(null)
  const [proposalsMatchId, setProposalsMatchId] = useState(null)
  const [inspectTeamId, setInspectTeamId] = useState(null)
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()

  const matches = useMemo(() => data?.match_requests || [], [data])
  const detail = useMemo(() => matches.find((m) => m.id === detailId) ?? null, [matches, detailId])
  const lineupMatch = useMemo(() => matches.find((m) => m.id === lineupMatchId) ?? null, [matches, lineupMatchId])
  const proposalsMatch = useMemo(() => matches.find((m) => m.id === proposalsMatchId) ?? null, [matches, proposalsMatchId])
  const scoreMatch = useMemo(() => matches.find((m) => m.id === scoreMatchId) ?? null, [matches, scoreMatchId])
  const confirmMatch = useMemo(() => matches.find((m) => m.id === confirmMatchId) ?? null, [matches, confirmMatchId])
  const inspectTeam = useMemo(() => {
    if (inspectTeamId == null) return null
    for (const m of matches) {
      if (m.host_team?.id === inspectTeamId) return m.host_team
      if (m.opponent_team?.id === inspectTeamId) return m.opponent_team
    }
    return { id: inspectTeamId }
  }, [matches, inspectTeamId])
  const canSubmitIds = useMemo(() => new Set((pendingScores?.matches || []).map((m) => m.id)), [pendingScores])
  const confirmIds = useMemo(() => new Set((pendingConfirms?.matches || []).map((m) => m.id)), [pendingConfirms])

  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setNewOpen(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const counts = useMemo(() => {
    const c = { all: matches.length }
    matches.forEach((m) => {
      c[m.status] = (c[m.status] || 0) + 1
    })
    return c
  }, [matches])

  const filtered = tab === 'all' ? matches : matches.filter((m) => m.status === tab)

  const canSubmit = (m) =>
    (m.score_status === 'none' || m.score_status === 'disputed') &&
    canSubmitIds.has(m.id) &&
    // Live matches can record their result at any time; accepted ones must
    // wait until an hour after kickoff (mirrors the backend rule).
    (m.status === 'live' ||
      (m.status === 'accepted' &&
        m.match_datetime &&
        new Date(m.match_datetime) <= new Date(Date.now() - 3600 * 1000)))

  const needsConfirmation = (m) =>
    (m.status === 'accepted' || m.status === 'live') && m.score_status === 'pending_confirmation' && confirmIds.has(m.id)

  const canStart = (m) =>
    (m.status === 'open' || m.status === 'accepted') &&
    m.match_datetime &&
    new Date(m.match_datetime) <= new Date() &&
    myTeamIds.size > 0 &&
    (myTeamIds.has(m.host_team_id) || myTeamIds.has(m.opponent_team_id))

  const startOpen = async (m) => {
    if (!window.confirm(t('dash.startTheMatchNow'))) return
    setBusy(true)
    try {
      const res = await api.post(`/manager/match-requests/${m.id}/start`)
      toast.success(res.data.message || t('dash.matchStartedSuccessfully'))
      const liveId = res.data?.live_match_id
      if (liveId) {
        navigate(`/dashboard/live/${liveId}`)
      } else {
        refetch()
      }
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  const openLive = (m) => {
    const liveId = m.football_match?.id
    if (liveId) navigate(`/dashboard/live/${liveId}`)
  }

  const isLiveOpen = (m) => {
    const fm = m.football_match
    if (!fm?.id) return false
    return !['finished', 'cancelled', 'postponed'].includes(fm.status)
  }

  const cancelOpen = async (m) => {
    if (!window.confirm(t('dash.cancelThisMatchRequest'))) return
    setBusy(true)
    try {
      await api.delete(`/manager/match-requests/${m.id}`)
      toast.success(t('dash.matchRequestCancelled'))
      refetch()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  const actionsFor = (m) => (
    <>
      {m.status === 'open' && myTeamIds.has(m.host_team_id) && (
        <>
          <Button
            size="sm"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={() => setProposalsMatchId(m.id)}
          >
            <Users className="size-3.5" />
            طلبات التحدي
            {m.pending_proposals_count > 0 && (
              <span className="ms-1.5 rounded-full bg-white px-1.5 py-0.5 text-[10px] font-black text-emerald-700">
                {m.pending_proposals_count}
              </span>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const inviteUrl = `${window.location.origin}/matches/invite/${m.invitation_token}`
              navigator.clipboard.writeText(inviteUrl)
              toast.success('تم نسخ رابط التحدي بنجاح!')
            }}
            title="نسخ رابط التحدي لمشاركته"
          >
            <Share2 className="size-3.5" />
            مشاركة التحدي
          </Button>
        </>
      )}
      {(m.status === 'open' || m.status === 'accepted') && (
        <Button size="sm" variant="soft" onClick={() => { setDetailId(null); setLineupMatchId(m.id) }}>
          <Shield className="size-3.5" />
          {t('dash.lineUp')}
        </Button>
      )}
      {canStart(m) && (
        <Button size="sm" variant="soft" disabled={busy} onClick={() => startOpen(m)}>
          <Play className="size-3.5" />
          {t('dash.startMatch')}
        </Button>
      )}
      {canSubmit(m) && (
        <Button size="sm" onClick={() => setScoreMatchId(m.id)}>
          <Trophy className="size-3.5" />
          {t('dash.recordScore')}
        </Button>
      )}
      {needsConfirmation(m) && (
        <Button size="sm" variant="soft" onClick={() => setConfirmMatchId(m.id)}>
          <CheckCircle2 className="size-3.5" />
          {t('dash.reviewScore')}
        </Button>
      )}
      {/* Deletable until the opponent is confirmed: open, or started live
          while still waiting for an opponent. */}
      {(m.status === 'open' || (m.status === 'live' && !m.opponent_team_id)) && (
        <Button size="sm" variant="dangerSoft" disabled={busy} onClick={() => cancelOpen(m)}>
          <XCircle className="size-3.5" />
          {t('dash.cancelRequest')}
        </Button>
      )}
      {m.status === 'live' && isLiveOpen(m) && (
        <Button size="sm" variant="outline" onClick={() => openLive(m)}>
          <Radio className="size-3.5 text-rose-500" />
          {t('dash.live')}
        </Button>
      )}
      {m.status === 'live' && (m.score_status === 'none' || m.score_status === 'disputed') && (
        <Button
          size="sm"
          className="bg-emerald-600 text-white hover:bg-emerald-700"
          onClick={() => setScoreMatchId(m.id)}
        >
          <Trophy className="size-3.5" />
          تحديث النتيجة
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={() => setDetailId(m.id)}>
        <CalendarDays className="size-3.5" />
        {t('dash.details')}
      </Button>
    </>
  )

  return (
    <div>
      <SectionTitle
        title={t('dash.myMatches')}
        subtitle={t('dash.allMatchRequestsAndTheirStatus')}
        action={
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="size-4" />
            {t('dash.newMatch')}
          </Button>
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs().map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold transition-all ${tab === t.key
                ? 'bg-slate-900 text-white shadow'
                : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
          >
            {t.label}
            <span
              className={`grid min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-black ${tab === t.key ? 'bg-white/20' : 'bg-slate-100 text-slate-500'
                }`}
            >
              {counts[t.key] || 0}
            </span>
          </button>
        ))}
      </div>

      {errorState ? (
        <div className="mt-6">
          <SectionError state={errorState} onRetry={refetch} />
        </div>
      ) : loading ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <SkeletonCards count={4} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6">
          <Empty
            icon={CalendarDays}
            title={t('dash.noMatchesInThisCategory')}
            description={tab === 'all' ? 'انشر أول طلب مباراة لتبدأ' : t('dash.tryAnotherCategory')}
            action={
              tab === 'all' && (
                <Button size="sm" onClick={() => setNewOpen(true)}>
                  <Plus className="size-3.5" />
                  {t('dash.newMatch')}
                </Button>
              )
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {filtered.map((m) => (
            <MatchCard
              key={m.id}
              match={m}
              onClick={() => setDetailId(m.id)}
              actions={actionsFor(m)}
              onTeamClick={(team) => setInspectTeamId(team?.id ?? null)}
            />
          ))}
        </div>
      )}

      <NewMatchModal open={newOpen} onClose={() => setNewOpen(false)} onSaved={refetch} />
      {scoreMatch && (
        <ScoreModal match={scoreMatch} mode="submit" onClose={() => setScoreMatchId(null)} onSaved={refetch} />
      )}
      {confirmMatch && (
        <ScoreModal match={confirmMatch} mode="confirm" onClose={() => setConfirmMatchId(null)} onSaved={refetch} />
      )}
      <MatchDetail
        match={detail}
        onClose={() => setDetailId(null)}
        onActions={actionsFor}
        onLineup={(m) => { setDetailId(null); setLineupMatchId(m.id) }}
        onTeamClick={(team) => setInspectTeamId(team?.id ?? null)}
      />
      <MatchLineupDrawer matchRequestId={lineupMatch?.id} open={Boolean(lineupMatch)} onClose={() => setLineupMatchId(null)} />
      <OpponentProfileModal teamId={inspectTeam?.id} open={Boolean(inspectTeam)} onClose={() => setInspectTeamId(null)} />
      <MatchProposalsModal
        open={Boolean(proposalsMatch)}
        onClose={() => setProposalsMatchId(null)}
        match={proposalsMatch}
        onConfirmed={() => {
          refetch()
          setProposalsMatchId(null)
        }}
      />
    </div>
  )
}

