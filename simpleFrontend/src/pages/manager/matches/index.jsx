import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  MessageSquare,
  MapPin,
  Play,
  Plus,
  Swords,
  Trophy,
  XCircle,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { useStadiums } from '../../../api/queries'
import { useAuth } from '../../../context/AuthContext'
import NewMatchModal from '../../../domains/manager/components/NewMatchModal'
import ScoreModal from '../../../domains/manager/components/ScoreModal'
import MatchDetail from '../../../domains/manager/components/MatchDetail'
import {
  Button,
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

const tabs = [
  { key: 'all', label: 'الكل' },
  { key: 'accepted', label: 'مؤكدة' },
  { key: 'open', label: 'مفتوحة' },
  { key: 'live', label: 'مباشرة' },
  { key: 'completed', label: 'منتهية' },
  { key: 'pending_confirmation', label: 'بانتظار النتيجة' },
  { key: 'cancelled', label: 'ملغاة' },
]



export default function Matches() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const myTeamId = user?.team?.id
  const [tab, setTab] = useState('all')
  const { data, loading, refetch } = useApi(() =>
    api.get('/manager/my-match-requests?status=all').then((r) => r.data),
  )
  const { data: pendingScores } = useApi(() => api.get('/manager/matches/pending-scores').then((r) => r.data))
  const { data: pendingConfirms } = useApi(() => api.get('/manager/matches/pending-confirmations').then((r) => r.data))
  const [newOpen, setNewOpen] = useState(false)
  const [scoreMatch, setScoreMatch] = useState(null)
  const [confirmMatch, setConfirmMatch] = useState(null)
  const [detail, setDetail] = useState(null)
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
    if (!window.confirm('هل تريد بدء المباراة الآن؟')) return
    setBusy(true)
    try {
      const res = await api.post(`/manager/match-requests/${m.id}/start`)
      toast.success(res.data.message || 'تم بدء المباراة بنجاح')
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.message || 'تعذر بدء المباراة')
    } finally {
      setBusy(false)
    }
  }

  const cancelOpen = async (m) => {
    if (!window.confirm('هل تريد إلغاء طلب المباراة هذا؟')) return
    setBusy(true)
    try {
      await api.delete(`/manager/match-requests/${m.id}`)
      toast.success('تم إلغاء طلب المباراة')
      refetch()
    } catch (e) {
      toast.error(e.response?.data?.message || 'تعذر الإلغاء')
    } finally {
      setBusy(false)
    }
  }

  const actionsFor = (m) => (
    <>
      {canStart(m) && (
        <Button size="sm" variant="soft" disabled={busy} onClick={() => startOpen(m)}>
          <Play className="size-3.5" />
          بدء المباراة
        </Button>
      )}
      {canSubmit(m) && (
        <Button size="sm" onClick={() => setScoreMatch(m)}>
          <Trophy className="size-3.5" />
          تسجيل النتيجة
        </Button>
      )}
      {needsConfirmation(m) && (
        <Button size="sm" variant="soft" onClick={() => setConfirmMatch(m)}>
          <CheckCircle2 className="size-3.5" />
          مراجعة النتيجة
        </Button>
      )}
      {m.status === 'open' && (
        <Button size="sm" variant="dangerSoft" disabled={busy} onClick={() => cancelOpen(m)}>
          <XCircle className="size-3.5" />
          إلغاء الطلب
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={() => setDetail(m)}>
        <CalendarDays className="size-3.5" />
        التفاصيل
      </Button>
    </>
  )

  return (
    <div>
      <SectionTitle
        title="مبارياتي"
        subtitle="جميع طلبات المباريات وحالتها"
        action={
          <Button onClick={() => setNewOpen(true)}>
            <Plus className="size-4" />
            مباراة جديدة
          </Button>
        }
      />

      <div className="flex gap-2 overflow-x-auto pb-1">
        {tabs.map((t) => (
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

      {loading ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <SkeletonCards count={4} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-slate-50 text-slate-300">
            <Swords className="size-7" strokeWidth={1.6} />
          </span>
          <p className="mt-4 text-sm font-bold text-slate-700">لا مباريات في هذا التصنيف</p>
          <p className="mt-1 text-xs text-slate-400">
            {tab === 'all' ? 'انشر أول طلب مباراة لتبدأ' : 'جرّب تصنيفًا آخر'}
          </p>
          {tab === 'all' && (
            <Button className="mt-4" size="sm" onClick={() => setNewOpen(true)}>
              <Plus className="size-3.5" />
              مباراة جديدة
            </Button>
          )}
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
      <MatchDetail match={detail} onClose={() => setDetail(null)} onActions={actionsFor} />
    </div>
  )
}
