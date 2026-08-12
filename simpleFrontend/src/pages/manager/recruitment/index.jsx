import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Handshake,
  Inbox,
  MapPin,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  UserPlus,
  Users,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { useMatchRequests } from '../../../api/queries'
import {
  Button,
  Field,
  Modal,
  SectionTitle,
  SkeletonCards,
  StatusBadge,
  inputClass,
  selectClass,
} from '../../../components/dashboard/ui'
import Drawer from '../../../components/dashboard/Drawer'
import { PlayerCard } from '../../../components/dashboard/cards'
import { useToast } from '../../../components/ui/Toast'
import { useAuth } from '../../../context/AuthContext'
import { photoThumb } from '../../../lib/thumb'

const positionLabels = { goalkeeper: 'حارس مرمى', defender: 'مدافع', midfielder: 'وسط', forward: 'مهاجم' }
const skillLabels = { beginner: 'مبتدئ', amateur: 'هواة', semi_pro: 'نصف محترف', pro: 'محترف' }
const positionOptions = [
  { value: 'goalkeeper', label: 'حارس مرمى', icon: '🧤' },
  { value: 'defender', label: 'مدافع', icon: '🛡️' },
  { value: 'midfielder', label: 'وسط ميدان', icon: '⚙️' },
  { value: 'forward', label: 'مهاجم', icon: '⚽' },
]

function SearchBar({ meta }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const t = setTimeout(() => {
      const next = new URLSearchParams(searchParams)
      if (search) next.set('search', search)
      else next.delete('search')
      next.delete('page')
      setSearchParams(next)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    next.delete('page')
    setSearchParams(next)
  }

  return (
    <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث عن لاعب بالاسم…"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pe-4 ps-10 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute end-3 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-slate-200 text-slate-500"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`inline-flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold transition-all ${
            expanded ? 'border-green-500 bg-green-50 text-green-700' : 'border-slate-200 bg-white text-slate-600'
          }`}
        >
          <SlidersHorizontal className="size-4" />
          تصفية
        </button>
      </div>

      {expanded && (
        <div className="mt-4 grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="المركز">
            <select className={selectClass} value={searchParams.get('position') || ''} onChange={(e) => setParam('position', e.target.value)}>
              <option value="">كل المراكز</option>
              {positionOptions.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.icon} {p.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="المستوى">
            <select className={selectClass} value={searchParams.get('skill_level') || ''} onChange={(e) => setParam('skill_level', e.target.value)}>
              <option value="">كل المستويات</option>
              {Object.entries(skillLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="المدينة">
            <select className={selectClass} value={searchParams.get('city') || ''} onChange={(e) => setParam('city', e.target.value)}>
              <option value="">كل المدن</option>
              {meta.cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <Button variant="ghost" className="w-full border border-slate-200" onClick={() => setSearchParams({})}>
              مسح الكل
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function InviteModal({ player, hosted, onClose, onSaved }) {
  const { toast } = useToast()
  const [matchId, setMatchId] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!matchId) return setError('اختر مباراة لتوجيه الدعوة إليها')
    setBusy(true)
    setError('')
    try {
      await api.post(`/manager/recruitment/${player.user_id}/invite`, {
        match_request_id: Number(matchId),
        message: message || undefined,
      })
      toast.success('تم إرسال الدعوة للاعب بنجاح')
      onSaved()
      onClose()
    } catch (e) {
      setError(e.response?.data?.message || 'تعذر إرسال الدعوة')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="دعوة لاعب"
      subtitle={`أرسل دعوة لـ ${player.user?.name} للانضمام لإحدى مبارياتك المفتوحة`}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
          {player.photo_url ? (
            <img loading="lazy" decoding="async" src={photoThumb(player)} alt="" className="size-12 rounded-2xl object-cover" />
          ) : (
            <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-green-100 to-emerald-200 text-base font-black text-green-700">
              {player.user?.name?.slice(0, 1)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold text-slate-900">{player.user?.name}</p>
            <p className="text-[11px] font-semibold text-slate-400">
              {positionLabels[player.position] || player.position || 'لاعب'} • {skillLabels[player.skill_level] || player.skill_level || ''}
            </p>
          </div>
          <span className="ms-auto inline-flex items-center gap-1 rounded-xl bg-amber-50 px-2.5 py-1.5 text-xs font-black text-amber-600 ring-1 ring-amber-200">
            {player.rating ?? '—'}
          </span>
        </div>

        <Field label="اختر مباراة مفتوحة" required>
          {hosted.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
              <p className="text-xs font-bold text-slate-600">لا توجد مباريات مفتوحة</p>
              <p className="mt-1 text-[11px] text-slate-400">أنشئ طلب مباراة أولاً لتتمكن من دعوة اللاعبين</p>
            </div>
          ) : (
            <div className="max-h-56 space-y-2 overflow-y-auto">
              {hosted.map((m) => {
                const dt = m.match_datetime ? new Date(m.match_datetime) : null
                const selected = Number(matchId) === m.id
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMatchId(String(m.id))}
                    className={`flex w-full items-center gap-3 rounded-2xl border p-3.5 text-start transition-all ${
                      selected ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <span
                      className={`grid size-6 shrink-0 place-items-center rounded-full border transition-all ${
                        selected ? 'border-green-500 bg-green-500 text-white' : 'border-slate-300 text-transparent'
                      }`}
                    >
                      <Check className="size-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-800">
                        {dt ? new Intl.DateTimeFormat('ar-MA', { dateStyle: 'medium', timeStyle: 'short' }).format(dt) : 'بدون وقت'}
                      </p>
                      <p className="truncate text-[11px] font-semibold text-slate-400">
                        {m.stadium?.name || m.custom_terrain_name || 'ملعب غير محدد'}
                      </p>
                    </div>
                    <StatusBadge status="open" />
                  </button>
                )
              })}
            </div>
          )}
        </Field>

        <Field label="رسالة الدعوة (اختياري)">
          <textarea
            rows={3}
            className={`${inputClass} h-auto py-3`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="مرحبًا، نود انضمامك لمباراتنا القادمة…"
          />
        </Field>

        {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600">{error}</p>}

        <Button className="w-full" disabled={busy || hosted.length === 0} onClick={submit}>
          <Send className="size-4" />
          {busy ? 'جارٍ الإرسال…' : 'إرسال الدعوة'}
        </Button>
      </div>
    </Modal>
  )
}

function PlayerDetail({ player, onClose, onInvite }) {
  if (!player) return null
  const name = player.user?.name || 'لاعب'
  return (
    <Drawer open onClose={onClose} title="ملف اللاعب" subtitle="تفاصيل اللاعب من المنصة" size="460">
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          {player.photo_url ? (
            <img loading="lazy" decoding="async" src={photoThumb(player)} alt="" className="size-16 rounded-3xl object-cover" />
          ) : (
            <span className="grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-green-100 to-emerald-200 text-2xl font-black text-green-700">
              {name.slice(0, 1)}
            </span>
          )}
          <div className="min-w-0">
            <p className="text-lg font-black text-slate-900">{name}</p>
            <p className="text-xs font-semibold text-slate-400">
              {positionLabels[player.position] || player.position || 'لاعب حر'}
            </p>
          </div>
          <span className="ms-auto grid size-12 place-items-center rounded-2xl bg-amber-50 text-base font-black text-amber-600 ring-1 ring-amber-200">
            {player.rating ?? '—'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'النقاط', value: player.points ?? 0 },
            { label: 'مباريات', value: player.matches_played ?? 0 },
            { label: 'المستوى', value: skillLabels[player.skill_level] || player.skill_level || '—' },
            { label: 'القدم المفضلة', value: player.preferred_foot || '—' },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-center">
              <p className="text-base font-black text-slate-800">{s.value}</p>
              <p className="text-[10px] font-bold text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>

        {player.city && (
          <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
            <span className="grid size-9 place-items-center rounded-xl bg-white text-green-600 shadow-sm">
              <MapPin className="size-4" />
            </span>
            <div>
              <p className="text-[10px] font-bold text-slate-400">المدينة</p>
              <p className="text-sm font-bold text-slate-800">{player.city}</p>
            </div>
          </div>
        )}

        {player.description && (
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
            <p className="text-[10px] font-bold text-slate-400">نبذة</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-700">{player.description}</p>
          </div>
        )}

        <Button className="w-full" onClick={() => onInvite(player)}>
          <UserPlus className="size-4" />
          دعوة اللاعب
        </Button>
      </div>
    </Drawer>
  )
}

function Applications({ hosted }) {
  const { toast } = useToast()
  const [matchId, setMatchId] = useState('')
  const [apps, setApps] = useState(null)
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState(null)
  const [error, setError] = useState('')

  const load = (id) => {
    setMatchId(String(id))
    setLoading(true)
    setApps(null)
    api
      .get(`/manager/matches/${id}/applicants`)
      .then((r) => setApps(r.data))
      .catch((e) => setError(e.response?.data?.message || 'تعذر تحميل الطلبات'))
      .finally(() => setLoading(false))
  }

  const respond = async (app, action) => {
    setBusyId(app.id)
    try {
      const res = await api.put(`/manager/recruitment/applications/${app.id}/respond`, { action })
      toast.success(res.data.message || (action === 'accept' ? 'تم قبول اللاعب' : 'تم رفض الطلب'))
      load(matchId)
    } catch (e) {
      toast.error(e.response?.data?.message || 'تعذر إتمام العملية')
    } finally {
      setBusyId(null)
    }
  }

  const labelFor = (type) => (type === 'invite' ? 'دعوة مرسلة' : 'طلب انضمام')

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
        <Field label="اختر مباراة مضيفة لعرض الطلبات" required>
          <select className={selectClass} value={matchId} onChange={(e) => e.target.value && load(e.target.value)}>
            <option value="">اختر مباراة…</option>
            {hosted.map((m) => {
              const dt = m.match_datetime ? new Date(m.match_datetime) : null
              return (
                <option key={m.id} value={m.id}>
                  {dt ? new Intl.DateTimeFormat('ar-MA', { dateStyle: 'medium', timeStyle: 'short' }).format(dt) : 'بدون وقت'}{' '}
                  — {m.stadium?.name || m.custom_terrain_name || 'ملعب'}
                </option>
              )
            })}
          </select>
        </Field>
      </div>

      {error && !apps && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600">{error}</p>}

      {loading ? (
        <SkeletonCards count={2} />
      ) : !apps ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-slate-50 text-slate-300">
            <Inbox className="size-7" strokeWidth={1.6} />
          </span>
          <p className="mt-4 text-sm font-bold text-slate-700">اختر مباراة لعرض طلبات اللاعبين</p>
          <p className="mt-1 text-xs text-slate-400">عندما يطلب لاعب الانضمام لمباراتك ستظهر طلباته هنا</p>
        </div>
      ) : apps.applications.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-slate-50 text-slate-300">
            <Users className="size-7" strokeWidth={1.6} />
          </span>
          <p className="mt-4 text-sm font-bold text-slate-700">لا طلبات لهذه المباراة</p>
          <p className="mt-1 text-xs text-slate-400">بحث في اللاعبين الأحرار ودعوة من يناسبك</p>
        </div>
      ) : (
        <div className="space-y-3">
          {apps.applications.map((app) => {
            const p = app.player
            const pf = p?.player_profile || {}
            const pending = app.status === 'pending' && app.type === 'apply'
            return (
              <div key={app.id} className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <div className="flex flex-wrap items-center gap-4">
                  {pf.photo_url ? (
                    <img loading="lazy" decoding="async" src={photoThumb(pf)} alt="" className="size-12 rounded-2xl object-cover" />
                  ) : (
                    <span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-green-100 to-emerald-200 text-base font-black text-green-700">
                      {p?.name?.slice(0, 1) || '؟'}
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-extrabold text-slate-900">{p?.name}</p>
                      <StatusBadge status={app.status} />
                    </div>
                    <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                      {positionLabels[pf.position] || pf.position || 'لاعب'} • {skillLabels[pf.skill_level] || pf.skill_level || '—'} •{' '}
                      {labelFor(app.type)}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-2.5 py-1.5 text-xs font-black text-amber-600 ring-1 ring-amber-200">
                    <Zap className="size-3" />
                    {pf.rating ?? '—'}
                  </span>
                </div>
                {app.message && (
                  <p className="mt-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-xs leading-relaxed text-slate-600">
                    «{app.message}»
                  </p>
                )}
                {pending && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                    <Button size="sm" variant="dangerSoft" disabled={busyId === app.id} onClick={() => respond(app, 'decline')}>
                      <XCircle className="size-3.5" />
                      رفض
                    </Button>
                    <Button size="sm" disabled={busyId === app.id} onClick={() => respond(app, 'accept')}>
                      <CheckCircle2 className="size-3.5" />
                      قبول اللاعب
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Recruitment() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuth()
  const myTeamId = user?.team?.id
  const [tab, setTab] = useState('search')
  const [invitePlayer, setInvitePlayer] = useState(null)
  const [detail, setDetail] = useState(null)
  const [meta, setMeta] = useState({ cities: [] })

  const { data, loading, refetch } = useApi(() => {
    const params = new URLSearchParams(searchParams)
    return api.get(`/manager/recruitment/search?${params}`).then((r) => r.data)
  }, [searchParams])

  const { data: allRequests } = useMatchRequests({ status: 'all' })

  const hosted = useMemo(() => {
    const list = allRequests?.match_requests || []
    return list.filter((m) => m.status === 'open' && m.host_team_id === myTeamId)
  }, [allRequests, myTeamId])

  useEffect(() => {
    api
      .get('/v1/stadiums?per_page=1')
      .then((r) => setMeta({ cities: r.data?.meta?.filters?.cities || [] }))
      .catch(() => {})
  }, [])

  const players = data?.players || []
  const total = data?.total || 0
  const currentPage = data?.current_page || 1
  const lastPage = data?.last_page || 1

  const page = (p) => {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(p))
    setSearchParams(next)
  }

  return (
    <div>
      <SectionTitle
        title="اللاعبون الأحرار"
        subtitle="ابحث عن لاعبين للانضمام لمباريات فريقك"
        action={
          <Button variant={tab === 'apps' ? 'outline' : 'primary'} onClick={() => setTab(tab === 'search' ? 'apps' : 'search')}>
            {tab === 'search' ? <Inbox className="size-4" /> : <Handshake className="size-4" />}
            {tab === 'search' ? 'الطلبات الواردة' : 'ابحث عن لاعبين'}
          </Button>
        }
      />

      {tab === 'search' ? (
        <>
          <SearchBar meta={meta} />

          <div className="mt-5 flex items-center justify-between">
            <p className="flex items-center gap-2 text-xs font-bold text-slate-400">
              <Sparkles className="size-3.5 text-green-500" />
              {total} لاعب متاح للانضمام
            </p>
          </div>

          {loading ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <SkeletonCards count={6} />
            </div>
          ) : players.length === 0 ? (
            <div className="mt-5 rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-slate-50 text-slate-300">
                <Users className="size-7" strokeWidth={1.6} />
              </span>
              <p className="mt-4 text-sm font-bold text-slate-700">لا لاعبين يطابقون البحث</p>
              <p className="mt-1 text-xs text-slate-400">عدّل الفلاتر وحاول مجددًا</p>
            </div>
          ) : (
            <>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {players.map((p) => (
                  <PlayerCard
                    key={p.user_id}
                    player={{ user: p.user, player_profile: p }}
                    onClick={() => setDetail(p)}
                    actions={
                      <>
                        <Button size="sm" className="flex-1" onClick={() => setInvitePlayer(p)}>
                          <UserPlus className="size-3.5" />
                          دعوة
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setDetail(p)}>
                          الملف
                        </Button>
                      </>
                    }
                  />
                ))}
              </div>

              {lastPage > 1 && (
                <div className="mt-8 flex items-center justify-center gap-2">
                  <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => page(currentPage - 1)}>
                    <ArrowRight className="size-3.5 rtl:rotate-180" />
                    السابق
                  </Button>
                  {Array.from({ length: lastPage }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => page(i + 1)}
                      className={`grid size-9 place-items-center rounded-xl text-xs font-bold transition-all ${
                        i + 1 === currentPage
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <Button variant="outline" size="sm" disabled={currentPage >= lastPage} onClick={() => page(currentPage + 1)}>
                    التالي
                    <ArrowLeft className="size-3.5 rtl:rotate-180" />
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      ) : (
        <Applications hosted={hosted} />
      )}

      {invitePlayer && (
        <InviteModal
          player={invitePlayer}
          hosted={hosted}
          onClose={() => setInvitePlayer(null)}
          onSaved={() => {
            refetch()
            setTab('apps')
          }}
        />
      )}
      <PlayerDetail player={detail} onClose={() => setDetail(null)} onInvite={(p) => { setDetail(null); setInvitePlayer(p) }} />
    </div>
  )
}
