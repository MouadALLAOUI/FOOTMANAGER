import i18n from '../../../i18n'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Camera,
  ImageIcon,
  Palette,
  Phone,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { useVirtualizer } from '@tanstack/react-virtual'
import api from '../../../api/client'
import { useManagerPlayers, invalidateKeys } from '../../../api/queries'
import { mapHttpError } from '../../../lib/errorState'
import { toastApiError } from '../../../lib/errors'
import { SectionError } from '../../../components/errors'
import {
  Button,
  Empty,
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

const positionLabels = { get goalkeeper() { return i18n.t('dash.goalkeeper') }, get defender() { return i18n.t('dash.defender') }, get midfielder() { return i18n.t('dash.midfield') }, get forward() { return i18n.t('dash.striker') } }
const positionChips = () => [
  { value: '', label: i18n.t('dash.all') },
  { value: 'goalkeeper', label: i18n.t('dash.goalkeepers') },
  { value: 'defender', label: i18n.t('dash.defenders') },
  { value: 'midfielder', label: i18n.t('dash.midfielders') },
  { value: 'forward', label: i18n.t('dash.attackers') },
]

const emptyForm = { name: '', position: 'midfielder', number: '', phone: '', is_whatsapp: false, notes: '' }

function PlayerModal({ open, onClose, editing, initial, onSaved }) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [form, setForm] = useState(emptyForm)
  const [photoFile, setPhotoFile] = useState(null)
  const [selectedPreset, setSelectedPreset] = useState(null)
  const [photoRemoved, setPhotoRemoved] = useState(false)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [presetModalOpen, setPresetModalOpen] = useState(false)
  const [presets, setPresets] = useState([])
  const [loadingPresets, setLoadingPresets] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const isLinked = Boolean(editing && initial && initial.user_id != null)

  useEffect(() => {
    if (!presetModalOpen) return
    let mounted = true
    setLoadingPresets(true)
    api
      .get('/presets', { params: { category: 'profile_avatar' } })
      .then((res) => {
        if (!mounted) return
        setPresets(res.data?.data || [])
      })
      .catch((e) => console.error(e))
      .finally(() => {
        if (mounted) setLoadingPresets(false)
      })
    return () => {
      mounted = false
    }
  }, [presetModalOpen])

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name || '',
        position: initial.position || 'midfielder',
        number: initial.number !== null && initial.number !== undefined ? String(initial.number) : '',
        phone: initial.phone || '',
        is_whatsapp: Boolean(initial.is_whatsapp),
        notes: initial.notes || '',
      })
      setPreviewUrl(initial.photo_thumbnail_url || initial.photo_url || null)
    } else {
      setForm(emptyForm)
      setPreviewUrl(null)
    }
    setPhotoFile(null)
    setSelectedPreset(null)
    setPhotoRemoved(false)
    setError('')
  }, [initial, open])

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: key === 'is_whatsapp' ? e.target.checked : e.target.value }))

  const submit = async () => {
    setBusy(true)
    setError('')
    try {
      if (photoFile) {
        const formData = new FormData()
        formData.append('name', form.name)
        formData.append('position', form.position)
        if (form.number) formData.append('number', form.number)
        if (form.phone) formData.append('phone', form.phone)
        formData.append('is_whatsapp', form.is_whatsapp ? '1' : '0')
        if (form.notes) formData.append('notes', form.notes)
        formData.append('photo', photoFile)

        if (editing) {
          formData.append('_method', 'PUT')
          await api.post(`/manager/players/${editing}`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        } else {
          await api.post('/manager/players', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          })
        }
      } else {
        const payload = {
          name: form.name,
          position: form.position,
          number: form.number ? Number(form.number) : null,
          phone: form.phone,
          is_whatsapp: form.is_whatsapp,
          notes: form.notes,
          ...(selectedPreset ? { photo_preset_id: selectedPreset.id } : {}),
          ...(photoRemoved ? { remove_photo: true } : {}),
        }
        if (editing) await api.put(`/manager/players/${editing}`, payload)
        else await api.post('/manager/players', payload)
      }

      toast.success(editing ? t('dash.playerInfoUpdated') : t('dash.playerAdded'))
      onSaved()
      onClose()
    } catch (e) {
      setError(
        e.response?.data?.errors
          ? Object.values(e.response.data.errors).flat()[0]
          : e.response?.data?.message || t('dash.couldNotSave'),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Modal
        open={open}
        onClose={onClose}
        title={editing ? 'تعديل لاعب' : t('dash.addPlayer')}
        subtitle={editing ? initial?.name : t('dash.addAMemberToYourSquad')}
      >
        <div className="space-y-4">
          {isLinked && (
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs text-blue-800">
              <p className="font-extrabold flex items-center gap-1.5">
                <UserRound className="size-4 text-blue-600" />
                حساب لاعب مرتبط
              </p>
              <p className="mt-1 text-[11px] text-blue-600 leading-relaxed">
                هذا اللاعب مسجل بحساب شخصي. يتم تحديث الاسم ورقم الهاتف والصورة من طرفه مباشرة.
              </p>
            </div>
          )}

          {!isLinked && (
            <Field label="صورة اللاعب الشخصية">
              <div className="flex items-center gap-4">
                {previewUrl ? (
                  <div className="relative size-16 shrink-0 overflow-hidden rounded-2xl border border-slate-200">
                    <img src={previewUrl} alt="Preview" className="size-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoFile(null)
                        setSelectedPreset(null)
                        setPhotoRemoved(true)
                        setPreviewUrl(null)
                      }}
                      className="absolute end-1 top-1 grid size-5 place-items-center rounded-full bg-slate-900/70 text-white hover:bg-rose-600"
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ) : (
                  <div className="grid size-16 shrink-0 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                    <UserRound className="size-6" />
                  </div>
                )}
                <div className="flex-1 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50">
                      <Camera className="size-4 text-green-600" />
                      {previewUrl ? 'رفع صورة أخرى' : 'رفع صورة من الجهاز'}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            setPhotoFile(file)
                            setSelectedPreset(null)
                            setPhotoRemoved(false)
                            setPreviewUrl(URL.createObjectURL(file))
                          }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => setPresetModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      <Palette className="size-4 text-violet-600" />
                      اختيار رمزية جاهزة
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">يمكنك رفع صورة شخصية أو اختيار رمزية جاهزة يوفرها التطبيق</p>
                </div>
              </div>
            </Field>
          )}

          <Field label={t('dash.name')} required>
            <input
              className={inputClass}
              value={form.name}
              onChange={set('name')}
              disabled={isLinked}
            />
          </Field>

          <FieldRow>
            <Field label={t('dash.position')}>
              <select className={selectClass} value={form.position} onChange={set('position')}>
                <option value="goalkeeper">{t('dash.goalkeeper')}</option>
                <option value="defender">{t('dash.defender')}</option>
                <option value="midfielder">{t('dash.midfield')}</option>
                <option value="forward">{t('dash.striker')}</option>
              </select>
            </Field>
            <Field label={t('dash.shirtNumber')}>
              <input type="number" min="0" max="99" className={inputClass} value={form.number} onChange={set('number')} />
            </Field>
          </FieldRow>

          <Field label={t('dash.phone')}>
            <input
              dir="ltr"
              className={inputClass}
              value={form.phone}
              onChange={set('phone')}
              disabled={isLinked}
            />
          </Field>

          <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
            <div>
              <p className="text-sm font-bold text-slate-700">{t('dash.whatsappNumber')}</p>
              <p className="text-[11px] font-semibold text-slate-400">{t('dash.toSendMatchNotificationsViaWhatsapp')}</p>
            </div>
            <Toggle checked={form.is_whatsapp} onChange={(v) => setForm((f) => ({ ...f, is_whatsapp: v }))} />
          </div>

          <Field label={t('dash.notes')}>
            <textarea rows={2} className={`${inputClass} h-auto py-3`} value={form.notes} onChange={set('notes')} />
          </Field>

          {error && <p className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-600">{error}</p>}
          <Button className="w-full" disabled={busy || !form.name.trim()} onClick={submit}>
            {busy ? t('dash.saving') : t('dash.save')}
          </Button>
        </div>
      </Modal>

      {presetModalOpen && (
        <Modal
          open={presetModalOpen}
          onClose={() => setPresetModalOpen(false)}
          title="اختيار رمزية جاهزة للاعب"
          subtitle="اختر صورة جاهزة من الرمزيات المضافة بالمنصة"
          size="md"
        >
          <div className="space-y-4">
            {loadingPresets ? (
              <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                  <span key={i} className="size-16 animate-pulse rounded-2xl bg-slate-100" />
                ))}
              </div>
            ) : presets.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                لم يتم إضافة رمزيات جاهزة بعد من قِبل الإدارة.
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto pe-1">
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
                  {presets.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        setSelectedPreset(p)
                        setPhotoFile(null)
                        setPhotoRemoved(false)
                        setPreviewUrl(p.image_thumbnail_url || p.image_url)
                        setPresetModalOpen(false)
                      }}
                      className="group flex flex-col items-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-2 transition-all hover:border-violet-400 hover:shadow-md hover:ring-2 hover:ring-violet-400/20 active:scale-95"
                    >
                      <img
                        src={p.image_thumbnail_url || p.image_url}
                        alt={p.name}
                        loading="lazy"
                        className="size-14 rounded-xl object-contain"
                      />
                      <span className="max-w-[70px] truncate text-[10px] font-bold text-slate-600 group-hover:text-violet-700">
                        {p.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="flex justify-end border-t border-slate-100 pt-3">
              <Button variant="outline" size="sm" onClick={() => setPresetModalOpen(false)}>
                إغلاق
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

function PlayerRow({ p, busyId, onOpen, onEdit, onRemove }) {
  const { t } = useTranslation()
  const isLinked = Boolean(p.user_id != null)

  return (
    <div
      className="group flex cursor-pointer items-center gap-4 rounded-3xl border border-slate-200/70 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all hover:border-green-200 hover:shadow-[0_14px_32px_rgba(15,23,42,0.09)]"
      onClick={() => onOpen(p)}
    >
      {p.photo_thumbnail_url || p.photo_url ? (
        <img
          src={p.photo_thumbnail_url || p.photo_url}
          alt={p.name}
          className="size-12 shrink-0 rounded-2xl object-cover ring-1 ring-slate-200 shadow-sm"
        />
      ) : (
        <span
          className={`grid size-12 shrink-0 place-items-center rounded-2xl text-sm font-black ${
            p.number !== null && p.number !== undefined
              ? 'bg-slate-900 text-white'
              : 'bg-gradient-to-br from-green-100 to-emerald-200 text-green-700'
          }`}
        >
          {p.number !== null && p.number !== undefined ? p.number : <UserRound className="size-5" />}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-extrabold text-slate-900">{p.name}</p>
          {isLinked ? (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black text-blue-600 ring-1 ring-blue-200">
              حساب مرتبط
            </span>
          ) : (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black text-slate-500">
              لاعب يدوي
            </span>
          )}
        </div>
        <p className="text-[11px] font-semibold text-slate-400">
          {positionLabels[p.position] || p.position || t('dash.player')}
          {p.phone ? ' • ' : ''}
          {p.phone}
        </p>
      </div>
      {p.is_whatsapp && (
        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-600 ring-1 ring-emerald-200">
          <Phone className="size-3" />
          {t('dash.whatsapp')}
        </span>
      )}
      {p.is_essential && (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-600 ring-1 ring-amber-200">
          <Star className="size-3 fill-amber-400" />
          {t('dash.starter')}
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
          title={t('common.edit')}
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
          title={t('common.delete')}
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  )
}


export default function Players() {
  const { toast } = useToast()
  const { t } = useTranslation()
  const { data, isLoading: loading, error, refetch } = useManagerPlayers()
  const errorState = error ? mapHttpError(error) : null
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
      { name: t('dash.goalkeepers'), value: counts.goalkeeper, color: '#22c55e' },
      { name: t('dash.defenders'), value: counts.defender, color: '#0ea5e9' },
      { name: t('dash.midfielders'), value: counts.midfielder, color: '#f59e0b' },
      { name: t('dash.attackers'), value: counts.forward, color: '#f43f5e' },
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
    if (!window.confirm(t('dash.removePlayerConfirm', { name: p.name }))) return
    setBusyId(p.id)
    try {
      await api.delete(`/manager/players/${p.id}`)
      toast.success(t('dash.playerRemoved'))
      invalidateKeys(['manager', 'players'])
      if (detail?.id === p.id) setDetail(null)
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <SectionTitle
        title={t('dash.teamPlayers')}
        subtitle={t('dash.manageYourTeamSquad')}
        action={
          <Button onClick={openAdd}>
            <Plus className="size-4" />
            {t('dash.addPlayer')}
          </Button>
        }
      />

      {errorState ? (
        <SectionError state={errorState} onRetry={refetch} />
      ) : loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-3xl" />
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-3xl" />
          ))}
        </div>
      ) : players.length === 0 ? (
        <Empty
          icon={UserRound}
          title={t('dash.noPlayersYet')}
          description={t('dash.addYourTeamPlayersToManageThemHere')}
          action={
            <Button size="sm" onClick={openAdd}>
              <Plus className="size-3.5" />
              {t('dash.addFirstPlayer')}
            </Button>
          }
        />
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
              <p className="text-sm font-extrabold text-slate-900">{t('dash.squadComposition')}</p>
              {distribution.length > 0 ? (
                <Donut data={distribution} centerLabel={t('dash.player')} centerValue={players.length} height={180} innerRadius={50} outerRadius={70} />
              ) : (
                <div className="flex h-44 items-center justify-center text-xs text-slate-400">{t('dash.noDataYet')}</div>
              )}
            </div>
            <div className="lg:col-span-2">
              <div className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
                <div className="relative">
                  <Search className="absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t('dash.searchByNameNumberOrPhone')}
                    aria-label={t('dash.searchByNameNumberOrPhone2')}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pe-9 ps-10 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:bg-white focus:ring-4 focus:ring-green-500/10"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      aria-label={t('dash.clearSearch')}
                      className="absolute end-3 top-1/2 grid size-5 -translate-y-1/2 place-items-center rounded-full bg-slate-200 text-slate-500"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {positionChips().map((c) => (
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
                  <Empty
                    icon={Search}
                    title={t('dash.noPlayersMatchTheSearch')}
                    description={t('dash.tryAnotherSearchTermOrChangeThePosition')}
                    action={
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSearch('')
                          setPosition('')
                        }}
                      >
                        <X className="size-3.5" />
                        {t('dash.clearSearchAndFilters')}
                      </Button>
                    }
                  />
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

      <Drawer open={Boolean(detail)} onClose={() => setDetail(null)} title={t('dash.playerInfo')} subtitle={t('dash.playerInformationInYourTeam')} size="440">
        {detail && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              {detail.photo_thumbnail_url || detail.photo_url ? (
                <img
                  src={detail.photo_thumbnail_url || detail.photo_url}
                  alt={detail.name}
                  className="size-16 rounded-3xl object-cover shadow-sm ring-2 ring-slate-100"
                />
              ) : (
                <span
                  className={`grid size-16 place-items-center rounded-3xl text-xl font-black ${
                    detail.number !== null && detail.number !== undefined
                      ? 'bg-slate-900 text-white'
                      : 'bg-gradient-to-br from-green-100 to-emerald-200 text-green-700'
                  }`}
                >
                  {detail.number !== null && detail.number !== undefined ? detail.number : <UserRound className="size-7" />}
                </span>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-lg font-black text-slate-900">{detail.name}</p>
                  {detail.user_id ? (
                    <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-black text-blue-600 ring-1 ring-blue-200">
                      حساب مرتبط
                    </span>
                  ) : (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-500">
                      لاعب يدوي
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold text-slate-400">{positionLabels[detail.position] || detail.position || t('dash.player')}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: t('dash.position'), value: positionLabels[detail.position] || detail.position || '—' },
                { label: t('dash.number'), value: detail.number ?? '—' },
                { label: t('dash.phone'), value: detail.phone || '—' },
                { label: 'نوع اللاعب', value: detail.user_id ? 'حساب شخصي مرتبط' : 'لاعب يدوي' },
                { label: t('dash.status'), value: detail.status || t('dash.active') },
                { label: t('dash.membership'), value: detail.is_essential ? t('dash.starter') : 'عضو' },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-center">
                  <p className="text-sm font-black text-slate-800">{s.value}</p>
                  <p className="text-[10px] font-bold text-slate-400">{s.label}</p>
                </div>
              ))}
            </div>

            {detail.notes && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                <p className="text-[10px] font-bold text-slate-400">{t('dash.notes')}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{detail.notes}</p>
              </div>
            )}
            <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/60 px-4 py-3">
              <div className="flex items-center gap-2">
                <Star className={`size-4 ${detail.is_essential ? 'fill-amber-400 text-amber-500' : 'text-slate-400'}`} />
                <div>
                  <p className="text-sm font-bold text-slate-700">{t('dash.starter2')}</p>
                  <p className="text-[11px] font-semibold text-slate-400">{t('dash.importanceInTheTeam')}</p>
                </div>
              </div>
              <Toggle
                checked={detail.is_essential || false}
                onChange={async () => {
                  try {
                    const res = await api.put(`/manager/team-members/${detail.id}/essential`)
                    setDetail((d) => d ? { ...d, is_essential: !d.is_essential } : d)
                    toast.success(res.data.message)
                    invalidateKeys(['manager', 'players'])
                  } catch (e) {
                    toastApiError(e, t)
                  }
                }}
              />
            </div>
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
                {t('common.delete')}
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  openEdit(detail)
                  setDetail(null)
                }}
              >
                <Pencil className="size-4" />
                {t('common.edit')}
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
