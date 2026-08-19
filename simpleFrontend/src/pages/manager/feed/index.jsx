import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Radar,
  Search,
  SlidersHorizontal,
  Swords,
  X,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { SectionError } from '../../../components/errors'
import { useStadiums } from '../../../api/queries'
import { Button, Empty, Field, Modal, Pagination, SectionTitle, SkeletonCards, selectClass } from '../../../components/dashboard/ui'
import { ManagerContact, MatchCard } from '../../../components/dashboard/cards'
import { useToast } from '../../../components/ui/Toast'
import NeedPlayersField from '../../../components/NeedPlayersField'

const categoryLabels = { adult: 'كبار', teenager: 'شباب', children: 'أطفال' }
const levelLabels = { beginner: 'مبتدئ', amateur: 'هواة', semi_pro: 'نصف محترف', pro: 'محترف' }

function FilterBar({ onApply }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [expanded, setExpanded] = useState(false)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const { data: stadiumsData } = useStadiums({ per_page: 50 })

  const meta = useMemo(
    () => ({
      cities: stadiumsData?.meta?.filters?.cities || [],
      formats: stadiumsData?.meta?.filters?.player_formats || [],
      stadiums: stadiumsData?.data || [],
    }),
    [stadiumsData],
  )

  useEffect(() => {
    const t = setTimeout(() => onApply({ ...Object.fromEntries(searchParams), search }), 350)
    return () => clearTimeout(t)
  }, [search])

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
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
            placeholder="ابحث عن فريق أو ملعب…"
            aria-label="ابحث عن فريق أو ملعب"
            className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pe-4 ps-10 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              aria-label="مسح البحث"
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
          <Field label="الفئة">
            <select className={selectClass} value={searchParams.get('category') || ''} onChange={(e) => setParam('category', e.target.value)}>
              <option value="">كل الفئات</option>
              {Object.entries(categoryLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="المستوى">
            <select className={selectClass} value={searchParams.get('level') || ''} onChange={(e) => setParam('level', e.target.value)}>
              <option value="">كل المستويات</option>
              {Object.entries(levelLabels).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <Field label="الملعب">
            <select className={selectClass} value={searchParams.get('stadium_id') || ''} onChange={(e) => setParam('stadium_id', e.target.value)}>
              <option value="">كل الملاعب</option>
              {meta.stadiums.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="شكل اللعب">
            <select className={selectClass} value={searchParams.get('player_format') || ''} onChange={(e) => setParam('player_format', e.target.value)}>
              <option value="">الكل</option>
              {meta.formats.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
          <Field label="التاريخ">
            <input
              type="date"
              className={selectClass}
              value={searchParams.get('date') || ''}
              onChange={(e) => setParam('date', e.target.value)}
            />
          </Field>
          <Field label="الترتيب">
            <select
              className={selectClass}
              value={searchParams.get('sort') || ''}
              onChange={(e) => setParam('sort', e.target.value === 'newest' ? 'newest' : '')}
            >
              <option value="">الأقرب موعدًا</option>
              <option value="newest">الأحدث</option>
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

function AcceptModal({ match, onClose, onDone }) {
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [needsPlayers, setNeedsPlayers] = useState(false)
  const [playersNeeded, setPlayersNeeded] = useState('')

  const accept = async () => {
    setBusy(true)
    setError('')
    try {
      const res = await api.post(`/manager/match-requests/${match.id}/accept`, {
        needs_players: needsPlayers,
        players_needed: needsPlayers ? Number(playersNeeded) : undefined,
      })
      setResult(res.data)
      toast.success('تم قبول المباراة بنجاح')
    } catch (e) {
      setError(e.response?.data?.message || 'تعذر قبول المباراة')
    } finally {
      setBusy(false)
    }
  }

  const datetime = match?.match_datetime ? new Date(match.match_datetime) : null

  return (
    <Modal
      open
      onClose={onClose}
      title={result ? 'تم تأكيد المباراة 🎉' : 'قبول المباراة'}
      subtitle={result ? 'تواصل مع الفريق المنظم للاتفاق على التفاصيل' : `مباراة ضد ${match?.host_team?.name}`}
    >
      {result ? (
        <div className="space-y-5">
          <div className="rounded-3xl bg-gradient-to-l from-[#0b1220] to-[#12321f] p-6 text-center text-white">
            <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <span className="text-2xl font-black">{result.match_request?.host_team?.name}</span>
                <span className="text-[10px] font-bold text-white/40">الفريق المنظم</span>
              </div>
              <span className="grid size-10 place-items-center rounded-full bg-white/10 text-green-400">
                <Swords className="size-4" />
              </span>
              <div className="flex flex-col items-center gap-2">
                <span className="text-2xl font-black">فريقك</span>
                <span className="text-[10px] font-bold text-white/40">المنافس</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-2xl border border-green-100 bg-green-50/60 px-4 py-3">
              <div>
                <p className="text-[10px] font-bold text-green-600/70">مسير الفريق المنظم</p>
                <p className="text-sm font-extrabold text-slate-800">{result.host_manager?.name}</p>
              </div>
              <ManagerContact
                manager={{ phone: result.host_manager?.phone, is_whatsapp: result.host_manager?.is_whatsapp }}
              />
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
              <span className="grid size-9 place-items-center rounded-xl bg-white text-green-600 shadow-sm">
                <CalendarDays className="size-4" />
              </span>
              <div>
                <p className="text-[10px] font-bold text-slate-400">الموعد</p>
                <p className="text-sm font-bold text-slate-800">
                  {datetime ? new Intl.DateTimeFormat('ar-MA', { dateStyle: 'full', timeStyle: 'short' }).format(datetime) : '—'}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              إغلاق
            </Button>
            <Button className="flex-1" onClick={onDone}>
              مبارياتي
              <ArrowLeft className="size-4 rtl:rotate-180" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-center">
            <p className="text-sm font-extrabold text-slate-800">
              {match?.host_team?.name} <span className="mx-1 text-slate-300">ضد</span> فريقك
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              {datetime
                ? new Intl.DateTimeFormat('ar-MA', { dateStyle: 'full', timeStyle: 'short' }).format(datetime)
                : '—'}
              {' • '}
              {match?.stadium?.name || match?.custom_terrain_name || 'ملعب غير محدد'}
            </p>
          </div>
          {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600">{error}</p>}
          <NeedPlayersField enabled={needsPlayers} count={playersNeeded} onEnabled={setNeedsPlayers} onCount={setPlayersNeeded} />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={onClose} disabled={busy}>
              إلغاء
            </Button>
            <Button className="flex-1" disabled={busy} onClick={accept}>
              <CheckCircle2 className="size-4" />
              {busy ? 'جارٍ التأكيد…' : 'تأكيد المباراة'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default function Feed() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { data, loading, errorState, refetch } = useApi(() => {
    const params = new URLSearchParams(searchParams)
    params.set('per_page', '20')
    return api.get(`/manager/match-feed?${params}`).then((r) => r.data)
  }, [searchParams])

  const [acceptMatch, setAcceptMatch] = useState(null)

  const matches = data?.matches || []
  const total = data?.total || 0
  const currentPage = data?.current_page || 1
  const lastPage = data?.last_page || 1
  const perPage = data?.per_page || 20

  const page = (p) => {
    const next = new URLSearchParams(searchParams)
    next.set('page', String(p))
    setSearchParams(next)
  }

  return (
    <div>
      <SectionTitle title="ابحث عن خصم" subtitle="فرق تبحث عن مباريات ودية — اختر خصمك المقبل" />

      <FilterBar
        onApply={(f) => {
          const next = new URLSearchParams(f)
          next.delete('page')
          setSearchParams(next)
        }}
      />

      <div className="mt-5 flex items-center justify-between">
        <p className="flex items-center gap-2 text-xs font-bold text-slate-400">
          <Radar className="size-3.5 text-green-500" />
          {total} طلب مباراة متاح
        </p>
      </div>

      {errorState ? (
        <div className="mt-5">
          <SectionError state={errorState} onRetry={refetch} />
        </div>
      ) : loading ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <SkeletonCards count={4} />
        </div>
      ) : matches.length === 0 ? (
        <div className="mt-5">
          <Empty
            icon={Radar}
            title="لا توجد مباريات متاحة"
            description="عدّل الفلاتر أو عد لاحقًا — يمكنك أيضًا نشر طلب مباراة بنفسك"
            action={
              <Button size="sm" onClick={() => window.location.assign('/dashboard/matches?new=1')}>
                انشر طلب مباراة
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {matches.map((m) => (
              <MatchCard
                key={m.id}
                match={m}
                actions={
                  <Button className="flex-1" size="sm" onClick={() => setAcceptMatch(m)}>
                    <Swords className="size-3.5" />
                    قبول المباراة
                  </Button>
                }
              />
            ))}
          </div>

          {lastPage > 1 && (
            <Pagination
              bare
              page={currentPage}
              lastPage={lastPage}
              total={total}
              perPage={perPage}
              onChange={page}
            />
          )}
        </>
      )}

      {acceptMatch && (
        <AcceptModal
          match={acceptMatch}
          onClose={() => {
            setAcceptMatch(null)
            refetch()
          }}
          onDone={() => {
            setAcceptMatch(null)
            window.location.assign('/dashboard/matches')
          }}
        />
      )}
    </div>
  )
}
