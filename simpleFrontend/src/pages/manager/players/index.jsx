import { useMemo, useRef, useState } from 'react'
import {
  Phone,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import api from '../../../api/client'
import { useManagerPlayers, invalidateKeys } from '../../../api/queries'
import {
  Button,
  Field,
  FieldRow,
  Modal,
  SectionTitle,
  Skeleton,
  Toggle,
  inputClass,
  selectClass,
} from '../../../components/dashboard/ui'
import Drawer from '../../../components/dashboard/Drawer'
import { Donut } from '../../../components/dashboard/charts'
import { useToast } from '../../../components/ui/Toast'

const positionLabels = { goalkeeper: 'حارس مرمى', defender: 'مدافع', midfielder: 'وسط ميدان', forward: 'مهاجم' }
const positionChips = [
  { value: '', label: 'الكل' },
  { value: 'goalkeeper', label: 'حراس' },
  { value: 'defender', label: 'مدافعون' },
  { value: 'midfielder', label: 'أوساط' },
  { value: 'forward', label: 'مهاجمون' },
]

const emptyForm = { name: '', position: 'midfielder', number: '', phone: '', is_whatsapp: false, notes: '' }

function PlayerModal({ open, onClose, editing, initial, onSaved }) {
  const { toast } = useToast()
  const [form, setForm] = useState(emptyForm)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: key === 'is_whatsapp' ? e.target.checked : e.target.value }))

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      const payload = {
        name: form.name,
        position: form.position,
        number: form.number ? Number(form.number) : null,
        phone: form.phone,
        is_whatsapp: form.is_whatsapp,
        notes: form.notes,
      }
      if (editing) await api.put(`/manager/players/${editing}`, payload)
      else await api.post('/manager/players', payload)
      toast.success(editing ? 'تم تحديث بيانات اللاعب' : 'تم إضافة اللاعب')
      onSaved()
      onClose()
    } catch (e) {
      setError(e.response?.data?.errors
        ? Object.values(e.response.data.errors).flat()[0]
        : e.response?.data?.message || 'تعذر الحفظ')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'تعديل لاعب' : 'إضافة لاعب'}
      subtitle={editing ? initial?.name : 'أضف عضوًا إلى تشكيلة فريقك'}
    >
      <div className="space-y-4">
        <Field label="الاسم" required>
          <input className={inputClass} value={form.name} onChange={set('name')} />
        </Field>
        <FieldRow>
          <Field label="المركز">
            <select className={selectClass} value={form.position} onChange={set('position')}>
              <option value="goalkeeper">حارس مرمى</option>
              <option value="defender">مدافع</option>
              <option value="midfielder">وسط ميدان</option>
              <option value="forward">مهاجم</option>
            </select>
          </Field>
          <Field label="الرقم القميص">
            <input type="number" min="0" max="99" className={inputClass} value={form.number} onChange={set('number')} />
          </Field>
        </FieldRow>
        <Field label="الهاتف">
          <input dir="ltr" className={inputClass} value={form.phone} onChange={set('phone')} />
        </Field>
        <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
          <div>
            <p className="text-sm font-bold text-slate-700">رقم واتساب</p>
            <p className="text-[11px] font-semibold text-slate-400">لإرسال إشعارات المباريات عبر واتساب</p>
          </div>
          <Toggle checked={form.is_whatsapp} onChange={(v) => setForm((f) => ({ ...f, is_whatsapp: v }))} />
        </div>
        <Field label="ملاحظات">
          <textarea rows={2} className={`${inputClass} h-auto py-3`} value={form.notes} onChange={set('notes')} />
        </Field>
        {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600">{error}</p>}
        <Button className="w-full" disabled={busy || !form.name.trim()} onClick={submit}>
          {busy ? 'جارٍ الحفظ…' : 'حفظ'}
        </Button>
      </div>
    </Modal>
  )
}

function PlayerRow({ p, busyId, onOpen, onEdit, onRemove }) {
  return (
    <div
      className="group flex cursor-pointer items-center gap-4 rounded-3xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all hover:border-green-200 hover:shadow-[0_14px_32px_rgba(15,23,42,0.09)]"
      onClick={() => onOpen(p)}
    >
      <span
        className={`grid size-12 shrink-0 place-items-center rounded-2xl text-sm font-black ${
          p.number !== null && p.number !== undefined
            ? 'bg-slate-900 text-white'
            : 'bg-gradient-to-br from-green-100 to-emerald-200 text-green-700'
        }`}
      >
        {p.number !== null && p.number !== undefined ? p.number : <UserRound className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-extrabold text-slate-900">{p.name}</p>
        <p className="text-[11px] font-semibold text-slate-400">
          {positionLabels[p.position] || p.position || 'لاعب'}
          {p.phone ? ' • ' : ''}
          {p.phone}
        </p>
      </div>
      {p.is_whatsapp && (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600 ring-1 ring-emerald-200">
          <Phone className="size-3" />
          واتساب
        </span>
      )}
      <div className="flex shrink-0 items-center gap-1 opacity-100 lg:opacity-0 lg:transition-opacity lg:group-hover:opacity-100">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEdit(p)
          }}
          className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
          title="تعديل"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          disabled={busyId === p.id}
          onClick={(e) => {
            e.stopPropagation()
            onRemove(p)
          }}
          className="grid size-9 place-items-center rounded-xl border border-slate-200 bg-white text-rose-500 hover:bg-rose-50"
          title="حذف"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  )
}

export default function Players() {
  const { toast } = useToast()
  const { data, isLoading: loading } = useManagerPlayers()
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState('')
  const [modal, setModal] = useState({ open: false, editing: null, initial: null })
  const [detail, setDetail] = useState(null)
  const [busyId, setBusyId] = useState(null)
  const parentRef = useRef(null)

  const players = data?.players || []

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return players.filter((p) => {
      const matchPos = !position || p.position === position
      const matchSearch =
        !q ||
        (p.name || '').toLowerCase().includes(q) ||
        (p.phone || '').includes(q) ||
        String(p.number || '').includes(q) ||
        (positionLabels[p.position] || p.position || '').includes(search.trim())
      return matchPos && matchSearch
    })
  }, [players, search, position])

  const rowVirtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 84,
    overscan: 6,
  })

  const distribution = useMemo(() => {
    const counts = { goalkeeper: 0, defender: 0, midfielder: 0, forward: 0, other: 0 }
    players.forEach((p) => {
      if (counts[p.position] !== undefined) counts[p.position] += 1
      else counts.other += 1
    })
    return [
      { name: 'حراس', value: counts.goalkeeper, color: '#22c55e' },
      { name: 'مدافعون', value: counts.defender, color: '#0ea5e9' },
      { name: 'أوساط', value: counts.midfielder, color: '#f59e0b' },
      { name: 'مهاجمون', value: counts.forward, color: '#f43f5e' },
    ].filter((x) => x.value > 0)
  }, [players])

  const openAdd = () => setModal({ open: true, editing: null, initial: null })
  const openEdit = (p) =>
    setModal({
      open: true,
      editing: p.id,
      initial: p,
    })

  const remove = async (p) => {
    if (!window.confirm(`حذف ${p.name} من الفريق؟`)) return
    setBusyId(p.id)
    try {
      await api.delete(`/manager/players/${p.id}`)
      toast.success('تم حذف اللاعب')
      invalidateKeys(['manager', 'players'])
      if (detail?.id === p.id) setDetail(null)
    } catch (e) {
      toast.error(e.response?.data?.message || 'تعذر الحذف')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <SectionTitle
        title="لاعبو الفريق"
        subtitle="إدارة تشكيلة فريقك"
        action={
          <Button onClick={openAdd}>
            <Plus className="size-4" />
            إضافة لاعب
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-3xl" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-3xl" />
          ))}
        </div>
      ) : players.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-slate-50 text-slate-300">
            <Users className="size-7" strokeWidth={1.6} />
          </span>
          <p className="mt-4 text-sm font-bold text-slate-700">لا يوجد لاعبون بعد</p>
          <p className="mt-1 text-xs text-slate-400">أضف لاعبي فريقك لإدارتهم هنا</p>
          <Button className="mt-5" size="sm" onClick={openAdd}>
            <Plus className="size-3.5" />
            إضافة أول لاعب
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <p className="text-sm font-extrabold text-slate-900">تركيبة التشكيلة</p>
              {distribution.length > 0 ? (
                <Donut data={distribution} centerLabel="لاعب" centerValue={players.length} height={180} innerRadius={50} outerRadius={70} />
              ) : (
                <div className="flex h-44 items-center justify-center text-xs text-slate-400">لا بيانات بعد</div>
              )}
            </div>
            <div className="lg:col-span-2">
              <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <div className="relative">
                  <Search className="absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="ابحث بالاسم أو الرقم أو الهاتف…"
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pe-9 ps-10 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
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
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {positionChips.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setPosition(c.value)}
                      className={`shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                        position === c.value
                          ? 'bg-slate-900 text-white'
                          : 'border border-slate-200 bg-white text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {filtered.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10 text-center text-xs text-slate-400">
                    لا لاعبين يطابقون البحث
                  </div>
                ) : filtered.length > 60 ? (
                  <div ref={parentRef} className="h-[calc(100vh-360px)] min-h-[320px] overflow-y-auto" dir="ltr">
                    <div className="relative w-full" style={{ height: rowVirtualizer.getTotalSize() }}>
                      {rowVirtualizer.getVirtualItems().map((vi) => (
                        <div
                          key={vi.key}
                          data-index={vi.index}
                          ref={rowVirtualizer.measureElement}
                          className="absolute left-0 top-0 w-full pb-3"
                          style={{ transform: `translateY(${vi.start}px)` }}
                        >
                          <PlayerRow p={filtered[vi.index]} busyId={busyId} onOpen={setDetail} onEdit={openEdit} onRemove={remove} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  filtered.map((p) => (
                    <PlayerRow key={p.id} p={p} busyId={busyId} onOpen={setDetail} onEdit={openEdit} onRemove={remove} />
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {modal.open && (
        <PlayerModal
          open
          onClose={() => setModal({ open: false, editing: null, initial: null })}
          editing={modal.editing}
          initial={modal.initial}
          onSaved={() => invalidateKeys(['manager', 'players'])}
        />
      )}

      <Drawer open={Boolean(detail)} onClose={() => setDetail(null)} title="بيانات اللاعب" subtitle="معلومات اللاعب في فريقك" size="440">
        {detail && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <span
                className={`grid size-16 place-items-center rounded-3xl text-xl font-black ${
                  detail.number !== null && detail.number !== undefined
                    ? 'bg-slate-900 text-white'
                    : 'bg-gradient-to-br from-green-100 to-emerald-200 text-green-700'
                }`}
              >
                {detail.number !== null && detail.number !== undefined ? detail.number : <UserRound className="size-7" />}
              </span>
              <div className="min-w-0">
                <p className="truncate text-lg font-black text-slate-900">{detail.name}</p>
                <p className="text-xs font-semibold text-slate-400">{positionLabels[detail.position] || detail.position || 'لاعب'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'المركز', value: positionLabels[detail.position] || detail.position || '—' },
                { label: 'الرقم', value: detail.number ?? '—' },
                { label: 'الهاتف', value: detail.phone || '—' },
                { label: 'الحالة', value: detail.status || 'نشط' },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-center">
                  <p className="text-sm font-black text-slate-800">{s.value}</p>
                  <p className="text-[10px] font-bold text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>
            {detail.notes && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-[10px] font-bold text-slate-400">ملاحظات</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{detail.notes}</p>
              </div>
            )}
            <div className="flex gap-3">
              <Button
                variant="dangerSoft"
                className="flex-1"
                onClick={() => {
                  setDetail(null)
                  remove(detail)
                }}
              >
                <Trash2 className="size-4" />
                حذف
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  openEdit(detail)
                  setDetail(null)
                }}
              >
                <Pencil className="size-4" />
                تعديل
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
