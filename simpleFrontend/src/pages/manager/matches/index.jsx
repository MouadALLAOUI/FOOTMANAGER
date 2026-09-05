import i18n from '../../../i18n'
import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  MessageSquare,
  MapPin,
  Play,
  Plus,
  Shield,
  Trophy,
  XCircle,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { SectionError } from '../../../components/errors'
import { useStadiums } from '../../../api/queries'
import { useAuth } from '../../../context/AuthContext'
import { toastApiError } from '../../../lib/errors'
import NewMatchModal from '../../../domains/manager/components/NewMatchModal'
import ScoreModal from '../../../domains/manager/components/ScoreModal'
import MatchDetail from '../../../domains/manager/components/MatchDetail'
import MatchLineupDrawer from '../components/MatchLineupDrawer'
import {
  Button,
  Empty,
  Field,
  FieldRow,
  Modal,
  SectionTitle,
  SkeletonCards,
  StatusBadge,
  inputClass,
  selectClass,
} from '../../../components/dashboard/ui'
import Drawer from '../../../components/dashboard/Drawer'
import { ManagerContact, MatchCard } from '../../../components/dashboard/cards'
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
  const { t } = useTranslation()
  const { user } = useAuth()
  const myTeamId = user?.team?.id
  const [tab, setTab] = useState('all')
  const { data, loading, errorState, refetch } = useApi(() =>
    api.get('/manager/my-match-requests?status=all').then((r) => r.data),
  )
  const { data: pendingScores } = useApi(() => api.get('/manager/matches/pending-scores').then((r) => r.data))
  const { data: pendingConfirms } = useApi(() => api.get('/manager/matches/pending-confirmations').then((r) => r.data))
  const [newOpen, setNewOpen] = useState(false)
  const [scoreMatch, setScoreMatch] = useState(null)
  const [confirmMatch, setConfirmMatch] = useState(null)
  const [detail, setDetail] = useState(null)
  const [lineupMatch, setLineupMatch] = useState(null)
  const [busy, setBusy] = useState(false)
  const { toast } = useToast()

  const matches = data?.match_requests || []
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
    (m.status === 'accepted' || m.status === 'live') &&
    m.match_datetime &&
    new Date(m.match_datetime) <= new Date(Date.now() - 3600 * 1000) &&
    (m.score_status === 'none' || m.score_status === 'disputed') &&
    canSubmitIds.has(m.id)

  const needsConfirmation = (m) =>
    (m.status === 'accepted' || m.status === 'live') && m.score_status === 'pending_confirmation' && confirmIds.has(m.id)

  const canStart = (m) =>
    (m.status === 'open' || m.status === 'accepted') &&
    m.match_datetime &&
    new Date(m.match_datetime) <= new Date() &&
    Boolean(myTeamId) &&
    (m.host_team_id === myTeamId || m.opponent_team_id === myTeamId)

  const startOpen = async (m) => {
    if (!window.confirm(t('dash.startTheMatchNow'))) return
    setBusy(true)
    try {
      const res = await api.post(`/manager/match-requests/${m.id}/start`)
      toast.success(res.data.message || t('dash.matchStartedSuccessfully'))
      refetch()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
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
      {(m.status === 'open' || m.status === 'accepted') && (
        <Button size="sm" variant="soft" onClick={() => { setDetail(null); setLineupMatch(m) }}>
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
        <Button size="sm" onClick={() => setScoreMatch(m)}>
          <Trophy className="size-3.5" />
          {t('dash.recordScore')}
        </Button>
      )}
      {needsConfirmation(m) && (
        <Button size="sm" variant="soft" onClick={() => setConfirmMatch(m)}>
          <CheckCircle2 className="size-3.5" />
          {t('dash.reviewScore')}
        </Button>
      )}
      {m.status === 'open' && (
        <Button size="sm" variant="dangerSoft" disabled={busy} onClick={() => cancelOpen(m)}>
          <XCircle className="size-3.5" />
          {t('dash.cancelRequest')}
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={() => setDetail(m)}>
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
            <MatchCard key={m.id} match={m} onClick={() => setDetail(m)} actions={actionsFor(m)} />
          ))}
        </div>
      )}

      <NewMatchModal open={newOpen} onClose={() => setNewOpen(false)} onSaved={refetch} />
      {scoreMatch && (
        <ScoreModal match={scoreMatch} mode="submit" onClose={() => setScoreMatch(null)} onSaved={refetch} />
      )}
      {confirmMatch && (
        <ScoreModal match={confirmMatch} mode="confirm" onClose={() => setConfirmMatch(null)} onSaved={refetch} />
      )}
      <MatchDetail match={detail} onClose={() => setDetail(null)} onActions={actionsFor} onLineup={(m) => { setDetail(null); setLineupMatch(m) }} />
      <MatchLineupDrawer matchRequestId={lineupMatch?.id} open={Boolean(lineupMatch)} onClose={() => setLineupMatch(null)} />
    </div>
  )
}
