import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { LayoutGrid, List, Plus, Search, Store } from 'lucide-react'
import api from '../../../api/client'
import { toastApiError } from '../../../lib/errors'
import { useApi } from '../../../hooks/useApi'
import { useCitiesSelect } from '../../../api/queries'
import { Button, Field, FieldRow, Modal, SectionTitle, SkeletonCards, Spinner, Toggle, inputClass } from '../../../components/dashboard/ui'
import Drawer from '../../../components/dashboard/Drawer'
import { useToast } from '../../../components/ui/Toast'
import { TerrainCard, TerrainListItem, typeLabels } from '../components/TerrainCard'
import WorkingHoursEditor from '../components/WorkingHoursEditor'
import FacilitiesPicker from '../components/FacilitiesPicker'
import ImageGallery from '../components/ImageGallery'
import PhotosModal from './photosModal'

const emptyForm = {
  name: '',
  city_id: '',
  address: '',
  google_maps_url: '',
  type: 'salle',
  player_format: '7v7',
  price_per_team: '',
  has_benches: false,
  has_lighting: false,
  has_vestiaires: false,
  supports_tournaments: false,
  is_available: true,
}

const playerFormats = ['5v5', '6v6', '7v7', '8v8', '11v11']

export default function Terrains() {
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const { toast } = useToast()
  const { data, loading, refetch } = useApi(() => api.get('/owner/terrains').then((r) => r.data))
  const {
    data: facilitiesData,
    loading: facilitiesLoading,
    error: facilitiesError,
    refetch: refetchFacilities,
  } = useApi(() => api.get('/facilities').then((r) => r.data))

  const { data: citiesData, loading: citiesLoading, error: citiesError } = useCitiesSelect()

  const facilities = facilitiesData?.facilities || []
  const terrains = data?.terrains || []

  const [view, setView] = useState('grid')
  const [query, setQuery] = useState('')
  const [fType, setFType] = useState('')
  const [fCity, setFCity] = useState('')
  const [fAvail, setFAvail] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(emptyForm)
  const [facilityIds, setFacilityIds] = useState([])
  const [schedule, setSchedule] = useState([])
  const [busy, setBusy] = useState(false)
  const [statusBusy, setStatusBusy] = useState(false)
  const [closureModal, setClosureModal] = useState(false)
  const [closureReason, setClosureReason] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [photosTarget, setPhotosTarget] = useState(null)

  const cities = useMemo(() => {
    const apiCities = citiesData?.cities || []
    const derivedCities = [...new Set(terrains.map((t) => t.city).filter(Boolean))]
    const merged = new Map()
    apiCities.forEach((c) => merged.set(c.localized_name, { id: c.id, name: c.localized_name }))
    derivedCities.forEach((name) => {
      if (!merged.has(name)) merged.set(name, { id: null, name })
    })
    return [...merged.values()]
  }, [citiesData, terrains])

  useEffect(() => {
    if (params.get('new')) {
      setEditing(null)
      setForm(emptyForm)
      setFacilityIds([])
      setSchedule([])
      setDrawerOpen(true)
      setParams({}, { replace: true })
    }
  }, [params, setParams])

  const openDrawer = (terrain) => {
    setEditing(terrain)
    setForm({
      name: terrain.name || '',
      city_id: terrain.city_id || '',
      address: terrain.address || '',
      google_maps_url: terrain.google_maps_url || '',
      type: terrain.type || 'salle',
      player_format: terrain.player_format || '7v7',
      price_per_team: terrain.price_per_team ?? '',
      has_benches: Boolean(terrain.has_benches),
      has_lighting: Boolean(terrain.has_lighting),
      has_vestiaires: Boolean(terrain.has_vestiaires),
      supports_tournaments: Boolean(terrain.supports_tournaments),
      is_available: terrain.is_available !== false,
    })
    setFacilityIds((terrain.facilities || []).map((f) => f.id))
    setSchedule(
      (terrain.schedules || []).map((s) => ({
        day_of_week: s.day_of_week,
        open_time: s.open_time || '09:00',
        close_time: s.close_time || '23:00',
        is_active: Boolean(s.is_active),
      })),
    )
    setDrawerOpen(true)
  }

  const loadDetail = async (id) => {
    try {
      const r = await api.get(`/owner/terrains/${id}`)
      return r.data.terrain
    } catch (e) {
      toastApiError(e, t)
      return null
    }
  }

  const refreshDetail = useCallback(
    async (id) => {
      const t = await loadDetail(id)
      if (t) openDrawer(t)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const setBool = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name || !form.city_id) {
      toast.error(t('validation.nameAndCityRequired'))
      return
    }
    setBusy(true)
    const payload = {
      name: form.name,
      city_id: Number(form.city_id),
      address: form.address || null,
      google_maps_url: form.google_maps_url || null,
      type: form.type,
      player_format: form.player_format,
      has_benches: form.has_benches,
      has_lighting: form.has_lighting,
      has_vestiaires: form.has_vestiaires,
      supports_tournaments: form.supports_tournaments,
      price_per_team: Number(form.price_per_team || 0),
      is_available: form.is_available,
      facility_ids: facilityIds,
    }
    try {
      let id = editing?.id
      if (editing) {
        await api.put(`/owner/terrains/${editing.id}`, payload)
      } else {
        const r = await api.post('/owner/terrains', payload)
        id = r.data.terrain.id
      }
      if (schedule.length) {
        await api.put(`/owner/terrains/${id}/working-hours`, {
          schedule: [0, 1, 2, 3, 4, 5, 6].map((d) => {
            const s = schedule.find((x) => x.day_of_week === d)
            return s || { day_of_week: d, open_time: '09:00', close_time: '23:00', is_active: false }
          }),
        })
      }
      toast.success(editing ? 'تم تحديث الملعب بنجاح' : 'تم إضافة الملعب بنجاح')
      setDrawerOpen(false)
      refetch()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  const toggleStatus = async (terrain) => {
    const isOpen = terrain.is_open !== false
    if (isOpen) {
      setEditing(terrain)
      setClosureReason('')
      setClosureModal(true)
      return
    }
    if (statusBusy) return
    setStatusBusy(true)
    try {
      await api.put(`/owner/terrains/${terrain.id}/toggle-status`, { is_open: true })
      toast.success('تم فتح الملعب بنجاح')
      refetch()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setStatusBusy(false)
    }
  }

  const confirmClosure = async () => {
    setBusy(true)
    try {
      await api.put(`/owner/terrains/${editing.id}/toggle-status`, {
        is_open: false,
        closure_reason: closureReason || null,
      })
      toast.success('تم إغلاق الملعب بنجاح')
      setClosureModal(false)
      refetch()
      if (drawerOpen) await refreshDetail(editing.id)
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setBusy(false)
    }
  }

  const requestDelete = (terrain) => setDeleteTarget(terrain)

  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    try {
      await api.delete(`/owner/terrains/${deleteTarget.id}`)
      toast.success('تم حذف الملعب')
      setDeleteTarget(null)
      refetch()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setDeleting(false)
    }
  }

  const filtered = terrains.filter((t) => {
    if (query && !t.name.includes(query)) return false
    if (fType && t.type !== fType) return false
    if (fCity && String(t.city_id || '') !== fCity) return false
    if (fAvail === 'open' && t.is_open === false) return false
    if (fAvail === 'closed' && t.is_open !== false) return false
    return true
  })

  return (
    <div>
      <SectionTitle
        title="ملاعبي"
        subtitle="إدارة ملاعبك وأوقات العمل والصور والمرافق"
        action={
          <Button onClick={() => { setEditing(null); setForm(emptyForm); setFacilityIds([]); setSchedule([]); setDrawerOpen(true) }}>
            <Plus className="size-4" />
            إضافة ملعب
          </Button>
        }
      />

      {/* Toolbar */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="ابحث عن ملعب…"
            aria-label="ابحث عن ملعب"
            className="h-11 w-full rounded-xl border border-slate-200 bg-white ps-11 pe-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
          />
          <Search className="absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        </div>
        <select className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 outline-none" value={fType} onChange={(e) => setFType(e.target.value)}>
          <option value="">كل الأنواع</option>
          {Object.entries(typeLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 outline-none" value={fCity} onChange={(e) => setFCity(e.target.value)}>
          <option value="">كل المدن</option>
          {cities.map((c) => (
            <option key={c.name} value={c.id || ''}>{c.name}</option>
          ))}
        </select>
        <select className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-600 outline-none" value={fAvail} onChange={(e) => setFAvail(e.target.value)}>
          <option value="">الكل</option>
          <option value="open">مفتوح</option>
          <option value="closed">مغلق</option>
        </select>
        <div className="flex rounded-xl border border-slate-200 bg-white p-1">
          <button
            type="button"
            onClick={() => setView('grid')}
            className={`grid size-9 place-items-center rounded-lg transition-colors ${view === 'grid' ? 'bg-green-500 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
            title="شبكة"
          >
            <LayoutGrid className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setView('list')}
            className={`grid size-9 place-items-center rounded-lg transition-colors ${view === 'list' ? 'bg-green-500 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
            title="قائمة"
          >
            <List className="size-4" />
          </button>
        </div>
      </div>

      {/* Grid / List */}
      {loading ? (
        <SkeletonCards count={3} />
      ) : filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-14 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-slate-50 text-slate-300">
            <Store className="size-7" strokeWidth={1.6} />
          </span>
          <p className="mt-4 text-sm font-bold text-slate-700">{t('terrain.empty.noTerrains')}</p>
          <p className="mt-1 text-xs text-slate-400">{t('terrain.empty.noTerrainsDesc')}</p>
          <Button size="sm" variant="soft" className="mt-4" onClick={() => { setEditing(null); setForm(emptyForm); setFacilityIds([]); setSchedule([]); setDrawerOpen(true) }}>
            <Plus className="size-3.5" />
            {t('terrain.empty.addTerrain')}
          </Button>
        </div>
      ) : view === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((t) => (
            <TerrainCard
              key={t.id}
              terrain={t}
              onEdit={() => openDrawer(t)}
              onImages={() => setPhotosTarget(t)}
              onToggle={() => toggleStatus(t)}
              onDelete={() => requestDelete(t)}
              toggleBusy={statusBusy}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((t) => (
            <TerrainListItem key={t.id} terrain={t} onEdit={() => openDrawer(t)} onToggle={() => toggleStatus(t)} onDelete={() => requestDelete(t)} />
          ))}
        </div>
      )}

      {/* Edit / Detail Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editing ? 'تعديل الملعب' : 'إضافة ملعب'}
        subtitle="أدخل بيانات الملعب"
        size="640"
      >
        {busy && !closureModal && <Spinner className="!py-8" />}
        {!busy && (
          <div className="space-y-6">
            <div className="space-y-6">
                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="grid size-9 place-items-center rounded-xl bg-green-50 text-green-600">
                      <Store className="size-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">البيانات الأساسية</h4>
                      <p className="text-[11px] font-semibold text-slate-400">الاسم والموقع والسعر</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <Field label="اسم الملعب" required>
                      <input className={inputClass} value={form.name} onChange={set('name')} />
                    </Field>
                    <FieldRow>
                      <Field label="المدينة" required>
                        <select
                          className={inputClass}
                          value={form.city_id}
                          onChange={(e) => setForm((f) => ({ ...f, city_id: e.target.value }))}
                          disabled={citiesLoading}
                        >
                          <option value="">
                            {citiesLoading ? 'جارٍ تحميل المدن…' : citiesError ? 'تعذر تحميل المدن' : 'اختر مدينة…'}
                          </option>
                          {cities.map((c) => (
                            <option key={c.id ?? c.name} value={c.id || ''}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label="السعر للفريق (د.م)" required>
                        <input type="number" min="0" className={inputClass} value={form.price_per_team} onChange={set('price_per_team')} />
                      </Field>
                    </FieldRow>
                    <Field label="العنوان">
                      <input className={inputClass} value={form.address} onChange={set('address')} />
                    </Field>
                    <Field label="رابط خريطة قوقل">
                      <input dir="ltr" className={inputClass} value={form.google_maps_url} onChange={set('google_maps_url')} placeholder="https://maps.google.com/…" />
                    </Field>
                    <FieldRow>
                      <Field label="النوع">
                        <select className={inputClass} value={form.type} onChange={set('type')}>
                          {Object.entries(typeLabels).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="عدد اللاعبين">
                        <select className={inputClass} value={form.player_format} onChange={set('player_format')}>
                          {playerFormats.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                      </Field>
                    </FieldRow>
                    <div className="space-y-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5">
                      {[
                        { key: 'has_benches', label: 'مقاعد للاعبين' },
                        { key: 'has_lighting', label: 'إنارة ليلية' },
                        { key: 'has_vestiaires', label: 'غرف تغيير الملابس' },
                        { key: 'supports_tournaments', label: 'يدعم البطولات' },
                        { key: 'is_available', label: 'قابل للحجز' },
                      ].map((opt) => (
                        <div key={opt.key} className="flex items-center justify-between rounded-xl bg-white px-3.5 py-2.5">
                          <p className="text-sm font-bold text-slate-700">{opt.label}</p>
                          <Toggle checked={form[opt.key]} onChange={setBool(opt.key)} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
                      <Store className="size-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">المرافق</h4>
                      <p className="text-[11px] font-semibold text-slate-400">اختر مرافق الملعب</p>
                    </div>
                  </div>
                  <FacilitiesPicker
                    facilities={facilities}
                    selected={facilityIds}
                    onChange={setFacilityIds}
                    loading={facilitiesLoading}
                    error={facilitiesError}
                    onRetry={refetchFacilities}
                  />
                </div>

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600">
                      <Store className="size-4" />
                    </span>
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900">أوقات العمل</h4>
                      <p className="text-[11px] font-semibold text-slate-400">جدول أسبوعي لكل يوم</p>
                    </div>
                  </div>
                  <WorkingHoursEditor value={schedule} onChange={setSchedule} />
                </div>
              </div>

            {editing && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <span className="grid size-9 place-items-center rounded-xl bg-sky-50 text-sky-600">
                    <Store className="size-4" />
                  </span>
                  <div>
                    <h4 className="text-sm font-extrabold text-slate-900">صور الملعب</h4>
                    <p className="text-[11px] font-semibold text-slate-400">حتى 6 صور</p>
                  </div>
                </div>
                <ImageGallery
                  terrainId={editing.id}
                  images={editing.images || []}
                  onChanged={() => refreshDetail(editing.id)}
                />
              </div>
            )}

            <div className="sticky bottom-0 -mx-6 flex gap-2 border-t border-slate-100 bg-white/95 px-6 py-4 backdrop-blur">
              <Button className="flex-1" disabled={busy} onClick={save}>
                {editing ? 'حفظ التغييرات' : 'إضافة الملعب'}
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => setDrawerOpen(false)}>إلغاء</Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Closure reason modal */}
      <Modal
        open={!!closureModal}
        onClose={() => !busy && setClosureModal(false)}
        title="إغلاق الملعب"
        subtitle="سيتم إيقاف استقبال الحجوزات الجديدة لهذا الملعب"
      >
        <Field label="سبب الإغلاق (اختياري)">
          <textarea
            className={`${inputClass} h-24 resize-none !h-auto py-3`}
            value={closureReason}
            onChange={(e) => setClosureReason(e.target.value)}
            placeholder="مثال: صيانة العشب"
          />
        </Field>
        <div className="mt-5 flex gap-2">
          <Button variant="danger" className="flex-1" disabled={busy} loading={busy} onClick={confirmClosure}>
            {busy ? 'جارٍ…' : 'تأكيد الإغلاق'}
          </Button>
          <Button variant="outline" className="flex-1" disabled={busy} onClick={() => setClosureModal(false)}>إلغاء</Button>
        </div>
      </Modal>

      {/* Delete confirmation modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        title={t('terrain.card.deleteTitle')}
      >
        <p className="text-sm font-bold text-slate-800">
          {t('terrain.card.deleteConfirm', { name: deleteTarget?.name })}
        </p>
        <p className="mt-1.5 text-xs text-slate-500">{t('terrain.card.deleteWarning')}</p>
        <div className="mt-5 flex gap-2">
          <Button variant="danger" className="flex-1" disabled={deleting} loading={deleting} onClick={confirmDelete}>
            {t('terrain.card.confirmDelete')}
          </Button>
          <Button variant="outline" className="flex-1" disabled={deleting} onClick={() => setDeleteTarget(null)}>
            {t('terrain.card.cancel')}
          </Button>
        </div>
      </Modal>

      <PhotosModal terrain={photosTarget} onClose={() => setPhotosTarget(null)} />
    </div>
  )
}
