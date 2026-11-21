import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  Trash2,
  UserCheck,
  UserX,
  X,
} from 'lucide-react'
import api from '../../../api/client'
import { Button, Modal } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import { TeamAvatar } from '../../tournaments/shared'

export default function DisciplinaryModal({ open, onClose, tournament, onUpdated }) {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [filter, setFilter] = useState('all') // all, suspended, tournament_long, warning
  const [search, setSearch] = useState('')
  const [busyAction, setBusyAction] = useState(null)

  // Sub-modal for issuing tournament-long suspension
  const [addModal, setAddModal] = useState(false)
  const [addTeamId, setAddTeamId] = useState('')
  const [addPlayerId, setAddPlayerId] = useState('')
  const [addReason, setAddReason] = useState('')
  const [teamsWithPlayers, setTeamsWithPlayers] = useState([])
  const [loadingTeams, setLoadingTeams] = useState(false)

  const loadData = async () => {
    setLoading(true)
    try {
      const res = await api.get(`/committee/tournaments/${tournament.id}/disciplinary`)
      setData(res.data.data)
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open) {
      loadData()
    }
  }, [open, tournament.id])

  const loadTeamsForAdd = async () => {
    if (teamsWithPlayers.length > 0) return
    setLoadingTeams(true)
    try {
      // Fetch tournament teams with rosters
      const res = await api.get(`/committee/tournaments/${tournament.id}/teams`)
      const teams = res.data.data || []
      setTeamsWithPlayers(teams)
      if (teams.length > 0 && !addTeamId) {
        setAddTeamId(teams[0].id)
      }
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setLoadingTeams(false)
    }
  }

  const handleOpenAdd = () => {
    setAddModal(true)
    loadTeamsForAdd()
  }

  const handleIssueTournamentLong = async () => {
    if (!addPlayerId || !addReason.trim()) {
      toast.error('يرجى اختيار اللاعب وإدخال سبب العقوبة')
      return
    }

    setBusyAction('issue')
    try {
      await api.post(`/committee/tournaments/${tournament.id}/disciplinary/tournament-long`, {
        player_id: addPlayerId,
        reason: addReason.trim(),
      })
      toast.success('تم إصدار عقوبة الإيقاف لنهاية الدوري بنجاح (القاعدة A)')
      setAddModal(false)
      setAddPlayerId('')
      setAddReason('')
      loadData()
      if (onUpdated) onUpdated()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusyAction(null)
    }
  }

  const handleLiftTournamentLong = async (playerId, playerName) => {
    if (!confirm(`هل أنت متأكد من رغبتك في رفع العقوبة لنهاية الدوري عن اللاعب (${playerName})؟`)) {
      return
    }

    setBusyAction(`lift_${playerId}`)
    try {
      await api.delete(`/committee/tournaments/${tournament.id}/disciplinary/tournament-long/${playerId}`)
      toast.success(`تم رفع العقوبة عن اللاعب (${playerName}) بنجاح`)
      loadData()
      if (onUpdated) onUpdated()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusyAction(null)
    }
  }

  const summary = data?.summary || {
    total_players_tracked: 0,
    active_suspensions_count: 0,
    tournament_long_count: 0,
    yellow_resets_applied: false,
  }

  const allPlayers = data?.players || []

  // Filtered and searched list
  const filteredPlayers = useMemo(() => {
    return allPlayers.filter((p) => {
      // Filter status
      if (filter === 'suspended' && !p.is_suspended) return false
      if (filter === 'tournament_long' && !p.tournament_long) return false
      if (filter === 'warning') {
        const totalYellows = (p.knockout_yellows || 0) + (summary.yellow_resets_applied ? 0 : (p.group_yellows || 0))
        if (totalYellows !== 1 || p.is_suspended) return false
      }

      // Search match
      if (search.trim()) {
        const q = search.trim().toLowerCase()
        const matchName = (p.name || '').toLowerCase().includes(q)
        const matchTeam = (p.team_name || '').toLowerCase().includes(q)
        if (!matchName && !matchTeam) return false
      }

      return true
    })
  }, [allPlayers, filter, search, summary.yellow_resets_applied])

  const selectedTeamPlayers = useMemo(() => {
    if (!addTeamId) return []
    const team = teamsWithPlayers.find((t) => String(t.id) === String(addTeamId))
    return team?.players || []
  }, [teamsWithPlayers, addTeamId])

  return (
    <Modal open={open} onClose={onClose} size="xl" title="سجل الانضباط والبطاقات والعقوبات">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#65706A]">
          <RefreshCw className="size-8 animate-spin text-[#179955]" />
          <p className="mt-3 text-sm font-bold">جاري تحميل سجل الانضباط والبطاقات...</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Summary Strip */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-2xl border border-[#E1E5DF] dark:border-[#303832] bg-[#F7F8F5] dark:bg-[#252B27] p-3 text-center">
              <span className="text-[11px] font-bold text-[#65706A] dark:text-[#B2B9B3]">اللاعبون المسجلون بالبطاقات</span>
              <p className="mt-1 text-lg font-black text-[#111313] dark:text-[#F5F7F2]">
                {summary.total_players_tracked}
              </p>
            </div>

            <div className="rounded-2xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 p-3 text-center">
              <span className="text-[11px] font-bold text-red-600 dark:text-red-400">إيقافات سارية (مباراة)</span>
              <p className="mt-1 text-lg font-black text-red-700 dark:text-red-300">
                {summary.active_suspensions_count}
              </p>
            </div>

            <div className="rounded-2xl border border-purple-200 dark:border-purple-900/40 bg-purple-50 dark:bg-purple-950/20 p-3 text-center">
              <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400">عقوبة لنهاية الدوري (A)</span>
              <p className="mt-1 text-lg font-black text-purple-700 dark:text-purple-300">
                {summary.tournament_long_count}
              </p>
            </div>

            <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 p-3 text-center">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">تصفير إنذارات المجموعات (C)</span>
              <p className="mt-1 text-xs font-black text-emerald-700 dark:text-emerald-300">
                {summary.yellow_resets_applied ? 'مفعّل للمتأهلين' : 'قيد الانتظار'}
              </p>
            </div>
          </div>

          {/* Rules Overview Callout */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/70 dark:bg-blue-950/20 p-3 text-xs text-blue-800 dark:text-blue-300">
            <ShieldAlert className="size-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <div className="flex-1 space-y-0.5">
              <span className="font-bold">قواعد الانضباط المعتمدة: </span>
              <span className="text-[11px] opacity-90">
                (A) إيقاف لنهاية الدوري لا يسقط بالتأهل • (B) إيقاف مباراة بسبب بطاقة حمراء أو إنذارين ينتقل للأدوار الإقصائية حتى يُستنفد • (C) تصفير عداد الإنذارات الفردية عند التأهل للأدوار الإقصائية مع الحفاظ على العقوبات السارية.
              </span>
            </div>
          </div>

          {/* Filter Bar & Action */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  filter === 'all'
                    ? 'bg-[#179955] text-white shadow-sm'
                    : 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3] hover:text-[#111313]'
                }`}
              >
                الكل ({allPlayers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('suspended')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  filter === 'suspended'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3] hover:text-red-600'
                }`}
              >
                الموقوفون حالياً ({allPlayers.filter((p) => p.is_suspended).length})
              </button>
              <button
                type="button"
                onClick={() => setFilter('tournament_long')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  filter === 'tournament_long'
                    ? 'bg-purple-700 text-white shadow-sm'
                    : 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3] hover:text-purple-600'
                }`}
              >
                عقوبات لنهاية الدوري ({summary.tournament_long_count})
              </button>
              <button
                type="button"
                onClick={() => setFilter('warning')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  filter === 'warning'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'bg-[#F7F8F5] dark:bg-[#252B27] text-[#65706A] dark:text-[#B2B9B3] hover:text-amber-600'
                }`}
              >
                إنذار واحد (تحذير)
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={handleOpenAdd}>
                <Plus className="size-4" />
                إصدار عقوبة لنهاية الدوري
              </Button>
            </div>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-[#65706A]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم اللاعب أو اسم الفريق..."
              className="w-full rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] py-2 pe-3 ps-9 text-xs text-[#111313] dark:text-[#F5F7F2] placeholder-[#65706A] focus:border-[#179955] focus:outline-none"
            />
          </div>

          {/* Players List */}
          {filteredPlayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#E1E5DF] dark:border-[#303832] py-12 text-center">
              <Shield className="size-10 text-[#65706A]/40" />
              <p className="mt-2 text-xs font-bold text-[#65706A] dark:text-[#B2B9B3]">
                لا توجد سجلات انضباطية مطابقة للتصفية الحالية
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto pe-1">
              {filteredPlayers.map((player) => (
                <div
                  key={player.player_id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5 transition ${
                    player.tournament_long
                      ? 'border-purple-300 dark:border-purple-900/60 bg-purple-50/50 dark:bg-purple-950/20'
                      : player.is_suspended
                      ? 'border-red-300 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20'
                      : 'border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D]'
                  }`}
                >
                  {/* Player & Team Info */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`grid size-9 shrink-0 place-items-center rounded-xl font-bold ${
                        player.tournament_long
                          ? 'bg-purple-600/15 text-purple-700 dark:text-purple-300'
                          : player.is_suspended
                          ? 'bg-red-600/15 text-red-600 dark:text-red-400'
                          : 'bg-[#179955]/15 text-[#179955] dark:text-[#42D889]'
                      }`}
                    >
                      {player.tournament_long || player.is_suspended ? (
                        <UserX className="size-4" />
                      ) : (
                        <UserCheck className="size-4" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[#111313] dark:text-[#F5F7F2] truncate">
                          {player.name}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            player.tournament_long
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                              : player.is_suspended
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
                          }`}
                        >
                          {player.status_label || (player.is_suspended ? 'موقوف' : 'متاح')}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[#65706A] dark:text-[#B2B9B3]">
                        {player.team_logo && (
                          <img src={player.team_logo} alt="" className="size-3.5 rounded object-cover" />
                        )}
                        <span>{player.team_name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cards Breakdown & Reason */}
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Cards chips */}
                    <div className="flex items-center gap-1.5 text-[11px]">
                      {player.group_yellows > 0 && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-bold ${
                            summary.yellow_resets_applied
                              ? 'bg-gray-100 text-gray-500 line-through dark:bg-gray-800 dark:text-gray-400'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                          }`}
                          title={summary.yellow_resets_applied ? 'تم تصفيرها بالتأهل' : 'إنذارات دور المجموعات'}
                        >
                          <span>🟨</span>
                          <span>{player.group_yellows} (م)</span>
                        </span>
                      )}

                      {player.knockout_yellows > 0 && (
                        <span
                          className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                          title="إنذارات الأدوار الإقصائية"
                        >
                          <span>🟨</span>
                          <span>{player.knockout_yellows} (إ)</span>
                        </span>
                      )}

                      {player.direct_reds > 0 && (
                        <span
                          className="inline-flex items-center gap-1 rounded-md bg-red-100 px-1.5 py-0.5 font-bold text-red-800 dark:bg-red-900/40 dark:text-red-300"
                          title="طرد مباشر"
                        >
                          <span>🟥</span>
                          <span>{player.direct_reds}</span>
                        </span>
                      )}

                      {player.second_yellows > 0 && (
                        <span
                          className="inline-flex items-center gap-1 rounded-md bg-orange-100 px-1.5 py-0.5 font-bold text-orange-800 dark:bg-orange-900/40 dark:text-orange-300"
                          title="إنذاران في مباراة واحدة"
                        >
                          <span>🟨🟥</span>
                          <span>{player.second_yellows}</span>
                        </span>
                      )}
                    </div>

                    {/* Suspension Cause Details */}
                    {player.active_suspension && (
                      <span className="rounded-lg bg-red-50 dark:bg-red-950/40 px-2 py-1 text-[11px] font-bold text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/40">
                        {player.active_suspension.reason}
                      </span>
                    )}

                    {player.tournament_long && (
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-purple-100 dark:bg-purple-900/40 px-2 py-1 text-[11px] font-bold text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                          عقوبة إدارية لنهاية الدوري
                        </span>
                        <Button
                          size="xs"
                          variant="ghost"
                          loading={busyAction === `lift_${player.player_id}`}
                          onClick={() => handleLiftTournamentLong(player.player_id, player.name)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="size-3 text-red-500" />
                          رفع العقوبة
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Footer Action */}
          <div className="flex justify-end border-t border-[#E1E5DF] dark:border-[#303832] pt-4">
            <Button variant="ghost" onClick={onClose}>
              إغلاق
            </Button>
          </div>
        </div>
      )}

      {/* Issue Tournament-Long Suspension Modal */}
      <Modal
        open={addModal}
        onClose={() => setAddModal(false)}
        size="md"
        title="إصدار عقوبة إيقاف لنهاية الدوري (القاعدة A)"
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50 dark:bg-purple-950/20 p-3 text-xs text-purple-800 dark:text-purple-300">
            <p className="font-bold">ملاحظة تنظيمية هامة:</p>
            <p className="mt-0.5 text-[11px] opacity-90 leading-relaxed">
              هذه العقوبة تصدر بقرار من اللجنة المنظمة للاعبين المخالفين لسلوكيات البطولة وتبقى سارية حتى ختام الدوري ولا
              تسقط بتأهل الفريق أو تصفير الإنذارات، وسيمنع النظام إدراج اللاعب في أي قائمة مباراة.
            </p>
          </div>

          {loadingTeams ? (
            <div className="flex items-center justify-center py-6 text-xs text-[#65706A]">
              <RefreshCw className="size-4 animate-spin me-2 text-[#179955]" />
              جاري تحميل قوائم الفرق...
            </div>
          ) : (
            <>
              {/* Select Team */}
              <div>
                <label className="block text-xs font-bold text-[#111313] dark:text-[#F5F7F2] mb-1">
                  اختر الفريق
                </label>
                <select
                  value={addTeamId}
                  onChange={(e) => {
                    setAddTeamId(e.target.value)
                    setAddPlayerId('')
                  }}
                  className="w-full rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] px-3 py-2 text-xs text-[#111313] dark:text-[#F5F7F2] focus:border-[#179955] focus:outline-none"
                >
                  <option value="">-- اختر الفريق --</option>
                  {teamsWithPlayers.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Select Player */}
              <div>
                <label className="block text-xs font-bold text-[#111313] dark:text-[#F5F7F2] mb-1">
                  اختر اللاعب
                </label>
                <select
                  value={addPlayerId}
                  disabled={!addTeamId}
                  onChange={(e) => setAddPlayerId(e.target.value)}
                  className="w-full rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] px-3 py-2 text-xs text-[#111313] dark:text-[#F5F7F2] focus:border-[#179955] focus:outline-none disabled:opacity-50"
                >
                  <option value="">-- اختر اللاعب --</option>
                  {selectedTeamPlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {player.name} {player.shirt_number ? `(#${player.shirt_number})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Justification Reason */}
              <div>
                <label className="block text-xs font-bold text-[#111313] dark:text-[#F5F7F2] mb-1">
                  سبب العقوبة الإدارية (إلزامي)
                </label>
                <textarea
                  value={addReason}
                  onChange={(e) => setAddReason(e.target.value)}
                  rows={3}
                  placeholder="مثال: سلوك غير رياضي تجاه الحكم، شجار في الممر، قرار انضباطي رقم 4..."
                  className="w-full rounded-xl border border-[#E1E5DF] dark:border-[#303832] bg-white dark:bg-[#1B201D] p-3 text-xs text-[#111313] dark:text-[#F5F7F2] focus:border-[#179955] focus:outline-none"
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setAddModal(false)} disabled={busyAction === 'issue'}>
              إلغاء
            </Button>
            <Button
              variant="primary"
              loading={busyAction === 'issue'}
              disabled={!addPlayerId || !addReason.trim()}
              onClick={handleIssueTournamentLong}
              className="bg-purple-700 hover:bg-purple-800 text-white"
            >
              تثبيت العقوبة لنهاية الدوري
            </Button>
          </div>
        </div>
      </Modal>
    </Modal>
  )
}
