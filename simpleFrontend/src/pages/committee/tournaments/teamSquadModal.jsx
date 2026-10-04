import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Camera,
  CheckCircle2,
  Pencil,
  Plus,
  Save,
  Search,
  ShieldAlert,
  Star,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
  X,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Badge, Button, Empty, Modal, Skeleton } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import { TeamAvatar } from '../../tournaments/shared'
import Jersey from '../../manager/live/components/Jersey'

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10'

const POSITIONS = [
  { value: 'goalkeeper', label: 'حارس مرمى' },
  { value: 'defender', label: 'مدافع' },
  { value: 'midfielder', label: 'وسط ميدان' },
  { value: 'forward', label: 'مهاجم' },
]

export default function TeamSquadModal({ team, tournamentId, open, onClose }) {
  const { t } = useTranslation()
  const { toast } = useToast()

  // Search filter
  const [search, setSearch] = useState('')

  // Bulk add state
  const [showBulkAdd, setShowBulkAdd] = useState(false)
  const [bulkRows, setBulkRows] = useState([{ name: '', number: '' }])
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkErrors, setBulkErrors] = useState({})
  const [bulkTopError, setBulkTopError] = useState('')

  // Single player add / edit modal state
  const [playerModalOpen, setPlayerModalOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState(null) // null = add new, player obj = edit
  const [playerForm, setPlayerForm] = useState({
    name: '',
    number: '',
    position: '',
    status: 'active',
    is_essential: false,
    remove_photo: false,
  })
  const [playerPhotoFile, setPlayerPhotoFile] = useState(null)
  const [playerPhotoPreview, setPlayerPhotoPreview] = useState(null)
  const [playerFormSaving, setPlayerFormSaving] = useState(false)
  const [playerFormErrors, setPlayerFormErrors] = useState({})
  const fileInputRef = useRef(null)

  // Fast inline toggling / removing busy flags
  const [busyActionId, setBusyActionId] = useState(null)

  const { data: payload, loading, refetch } = useApi(
    () => api.get(`/committee/tournaments/${tournamentId}/teams/${team?.id}/squad`).then((r) => r.data ?? {}),
    [tournamentId, team?.id, open],
    { enabled: open && Boolean(tournamentId && team?.id), staleTime: 0 },
  )

  const players = payload?.players ?? []
  const max = payload?.max ?? null
  const warning = payload?.warning ?? null
  const squadCount = payload?.squad_count ?? 0
  const atMax = max !== null && squadCount >= max
  const isFree = Boolean(team?.is_free)

  const handleClose = () => {
    setSearch('')
    setShowBulkAdd(false)
    setBulkRows([{ name: '', number: '' }])
    setBulkErrors({})
    setBulkTopError('')
    setPlayerModalOpen(false)
    setEditingPlayer(null)
    setPlayerPhotoFile(null)
    setPlayerPhotoPreview(null)
    onClose()
  }

  // Bulk add helpers
  const rowError = (i, field) => {
    const messages = bulkErrors[`players.${i}.${field}`]
    return Array.isArray(messages) ? messages[0] : messages || ''
  }

  const updateRow = (i, field, value) =>
    setBulkRows((rows) => rows.map((row, idx) => (idx === i ? { ...row, [field]: value } : row)))

  const addRow = () => setBulkRows((rows) => (rows.length < 30 ? [...rows, { name: '', number: '' }] : rows))

  const removeRow = (i) => setBulkRows((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : rows))

  const saveBulk = async () => {
    if (bulkSaving) return
    const rows = bulkRows
      .map((row) => ({
        name: (row.name || '').trim(),
        number: row.number !== '' && row.number != null ? Number(row.number) : undefined,
      }))
      .filter((row) => row.name !== '')
    if (rows.length === 0) return

    setBulkSaving(true)
    setBulkErrors({})
    setBulkTopError('')
    try {
      const { data } = await api.post(`/committee/tournaments/${tournamentId}/teams/${team?.id}/squad/bulk`, {
        players: rows,
      })
      const count = data?.created_count
      const msg = count == null
        ? t('committee.detail.playersAdded')
        : count === 1
          ? t('committee.detail.playerAdded')
          : t('committee.detail.playersAdded', { count })
      toast.success(msg)
      setBulkRows([{ name: '', number: '' }])
      setShowBulkAdd(false)
      refetch()
    } catch (err) {
      const errors = err.response?.data?.errors
      if (errors && typeof errors === 'object' && Object.keys(errors).length > 0) {
        setBulkErrors(errors)
        const top = errors.players
        setBulkTopError(Array.isArray(top) ? top[0] : typeof top === 'string' ? top : '')
        if (!errors.players) toastApiError(err, t)
      } else {
        toastApiError(err, t)
      }
    } finally {
      setBulkSaving(false)
    }
  }

  // Toggle squad inclusion
  const toggleSquadMembership = async (player) => {
    if (busyActionId) return
    setBusyActionId(`toggle-${player.id}`)
    try {
      await api.put(`/committee/tournaments/${tournamentId}/teams/${team?.id}/squad/${player.id}`)
      toast.success(player.in_squad ? 'تم استبعاد اللاعب من قائمة البطولة' : 'تم اعتماد اللاعب في قائمة البطولة')
      refetch()
    } catch (err) {
      toastApiError(err, t)
    } finally {
      setBusyActionId(null)
    }
  }

  // Remove player
  const handleDeletePlayer = async (player) => {
    if (busyActionId) return
    const confirmMsg = `هل أنت متأكد من حذف/استبعاد اللاعب "${player.name}" من قائمة الفريق والبطولة؟`
    if (!window.confirm(confirmMsg)) return

    setBusyActionId(`delete-${player.id}`)
    try {
      await api.delete(`/committee/tournaments/${tournamentId}/teams/${team?.id}/squad/${player.id}`)
      toast.success('تمت إزالة اللاعب بنجاح')
      refetch()
    } catch (err) {
      toastApiError(err, t)
    } finally {
      setBusyActionId(null)
    }
  }

  // Open Add Modal
  const openAddModal = () => {
    setEditingPlayer(null)
    setPlayerForm({
      name: '',
      number: '',
      position: '',
      status: 'active',
      is_essential: false,
      remove_photo: false,
    })
    setPlayerPhotoFile(null)
    setPlayerPhotoPreview(null)
    setPlayerFormErrors({})
    setPlayerModalOpen(true)
  }

  // Open Edit Modal
  const openEditModal = (player) => {
    setEditingPlayer(player)
    setPlayerForm({
      name: player.name || '',
      number: player.number != null ? String(player.number) : '',
      position: player.position || '',
      status: player.status || 'active',
      is_essential: Boolean(player.is_essential),
      remove_photo: false,
    })
    setPlayerPhotoFile(null)
    setPlayerPhotoPreview(player.photo_url || player.photo_thumbnail_url || null)
    setPlayerFormErrors({})
    setPlayerModalOpen(true)
  }

  // Handle Photo selection
  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPlayerPhotoFile(file)
    setPlayerForm((prev) => ({ ...prev, remove_photo: false }))
    const reader = new FileReader()
    reader.onload = () => setPlayerPhotoPreview(reader.result)
    reader.readAsDataURL(file)
  }

  const handleRemovePhoto = () => {
    setPlayerPhotoFile(null)
    setPlayerPhotoPreview(null)
    setPlayerForm((prev) => ({ ...prev, remove_photo: true }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Submit Player Form (Add or Edit)
  const submitPlayerForm = async (e) => {
    e?.preventDefault()
    if (playerFormSaving) return

    const trimmedName = playerForm.name.trim()
    if (!trimmedName) {
      setPlayerFormErrors({ name: ['اسم اللاعب مطلوب'] })
      return
    }

    setPlayerFormSaving(true)
    setPlayerFormErrors({})

    try {
      const formData = new FormData()
      formData.append('name', trimmedName)
      if (playerForm.number !== '') formData.append('number', playerForm.number)
      if (playerForm.position) formData.append('position', playerForm.position)
      if (playerForm.status) formData.append('status', playerForm.status)
      formData.append('is_essential', playerForm.is_essential ? '1' : '0')

      if (playerPhotoFile) {
        formData.append('photo', playerPhotoFile)
      } else if (playerForm.remove_photo) {
        formData.append('remove_photo', '1')
      }

      if (editingPlayer) {
        // Edit existing player (POST route with multipart support)
        await api.post(
          `/committee/tournaments/${tournamentId}/teams/${team?.id}/squad/${editingPlayer.id}`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        )
        toast.success('تم تحديث بيانات اللاعب بنجاح')
      } else {
        // Add new player
        formData.append('force', '1')
        await api.post(
          `/committee/tournaments/${tournamentId}/teams/${team?.id}/squad`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        )
        toast.success('تمت إضافة اللاعب بنجاح')
      }

      setPlayerModalOpen(false)
      refetch()
    } catch (err) {
      const errors = err.response?.data?.errors
      if (errors && typeof errors === 'object' && Object.keys(errors).length > 0) {
        setPlayerFormErrors(errors)
      } else {
        toastApiError(err, t)
      }
    } finally {
      setPlayerFormSaving(false)
    }
  }

  const filteredPlayers = players.filter((p) => {
    if (!search.trim()) return true
    const q = search.trim().toLowerCase()
    return (
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.number != null && String(p.number).includes(q)) ||
      (p.position && p.position.toLowerCase().includes(q))
    )
  })

  const getPositionLabel = (pos) => {
    const found = POSITIONS.find((p) => p.value === pos)
    return found ? found.label : (pos || 'غير محدد')
  }

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        title={team?.name || t('committee.detail.squad')}
        subtitle="إدارة وتعديل قائمة لاعبي الفريق في البطولة بصلاحيات اللجنة المنظمة الكاملة"
        size="lg"
      >
        <div className="space-y-4">
          {/* Header Banner */}
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-3.5">
            <div className="flex items-center gap-3">
              <TeamAvatar team={team} className="size-12 shadow-sm" />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="truncate text-base font-black text-slate-900">{team?.name || '—'}</h4>
                  {isFree && <Badge variant="info">{t('committee.detail.freeBadge')}</Badge>}
                </div>
                <p className="text-xs font-semibold text-slate-500">
                  {team?.city ? `${team.city} • ` : ''}
                  إجمالي المسجلين: <span className="font-bold text-slate-700">{players.length}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={squadCount > 0 ? (atMax ? 'danger' : 'success') : 'neutral'}>
                {max != null
                  ? `المعتمدون: ${squadCount} / ${max}`
                  : `المعتمدون: ${squadCount}`}
              </Badge>
              <Button size="sm" variant="soft" onClick={openAddModal} disabled={atMax}>
                <Plus className="size-3.5" />
                إضافة لاعب
              </Button>
              <Button
                size="sm"
                variant={showBulkAdd ? 'primary' : 'outline'}
                onClick={() => setShowBulkAdd(!showBulkAdd)}
              >
                {showBulkAdd ? <X className="size-3.5" /> : <Users className="size-3.5" />}
                {showBulkAdd ? 'إلغاء الإضافة السريعة' : 'إضافة سريعة'}
              </Button>
            </div>
          </div>

          {/* Warnings & Max banners */}
          {atMax && (
            <p className="flex items-center gap-2 rounded-xl bg-amber-50 px-3.5 py-2.5 text-xs font-bold text-amber-800">
              <ShieldAlert className="size-4 shrink-0 text-amber-600" />
              تم بلوغ الحد الأقصى للاعبي البطولة ({max} لاعب). لا يمكن اعتماد لاعبين إضافيين دون إزاحة غيرهم.
            </p>
          )}

          {warning && !atMax && (
            <p className="flex items-center gap-2 rounded-xl bg-sky-50 px-3.5 py-2.5 text-xs font-bold text-sky-800">
              <ShieldAlert className="size-4 shrink-0 text-sky-600" />
              {warning}
            </p>
          )}

          {/* Collapsible Bulk Add Section */}
          {showBulkAdd && (
            <div className="rounded-2xl border border-green-200 bg-green-50/70 p-4 transition-all">
              <div className="mb-2 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black text-green-900">{t('committee.detail.bulkAddPlayers')}</p>
                  <p className="text-[11px] font-medium text-green-700">
                    أدخل أسماء وأرقام اللاعبين لإضافتهم واعتمادهم فوراً في قائمة البطولة
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowBulkAdd(false)}
                  className="rounded-lg p-1 text-green-700 hover:bg-green-100"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="max-h-56 space-y-2 overflow-y-auto pe-1">
                {bulkRows.map((row, i) => {
                  const nameError = rowError(i, 'name')
                  const numberError = rowError(i, 'number')
                  return (
                    <div key={i} className="rounded-xl border border-green-100 bg-white p-2">
                      <div className="flex items-center gap-2">
                        <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-green-100 text-[10px] font-black text-green-700">
                          {i + 1}
                        </span>
                        <input
                          autoFocus={i === 0}
                          className={`${inputClass} border-green-200 focus:border-green-500 ${nameError ? 'border-red-300 bg-red-50/40' : ''}`}
                          placeholder="اسم اللاعب الكامل"
                          value={row.name}
                          onChange={(e) => updateRow(i, 'name', e.target.value)}
                        />
                        <input
                          type="number"
                          min="0"
                          max="99"
                          className={`${inputClass} w-20 border-green-200 focus:border-green-500 ${numberError ? 'border-red-300 bg-red-50/40' : ''}`}
                          placeholder="الرقم #"
                          value={row.number}
                          onChange={(e) => updateRow(i, 'number', e.target.value)}
                        />
                        {bulkRows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(i)}
                            className="grid size-7 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                            aria-label={t('committee.detail.removeRow')}
                          >
                            <X className="size-4" />
                          </button>
                        )}
                      </div>
                      {(nameError || numberError) && (
                        <p className="mt-1.5 px-1 text-[10px] font-bold text-red-600">{nameError || numberError}</p>
                      )}
                    </div>
                  )
                })}
              </div>

              {bulkTopError && (
                <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-[11px] font-bold text-red-600">{bulkTopError}</p>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={addRow}
                  disabled={bulkRows.length >= 30 || bulkSaving}
                  className="!text-green-800"
                >
                  <Plus className="size-3.5" />
                  {t('committee.detail.addRow')}
                </Button>
                <Button size="sm" onClick={saveBulk} loading={bulkSaving} disabled={atMax || bulkRows.length === 0}>
                  <Save className="size-3.5" />
                  حفظ واعتماد اللاعبين
                </Button>
              </div>
            </div>
          )}

          {/* Search bar */}
          <div className="relative">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو رقم القميص أو المركز..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pe-3 ps-10 text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-500/10"
            />
          </div>

          {/* Players Roster Grid */}
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : filteredPlayers.length === 0 ? (
            <Empty
              icon={Users}
              title={search ? 'لا توجد نتائج تطابق بحثك' : t('committee.detail.noSquadPlayers')}
              description="يمكن للجنة المنظمة إضافة وتعديل لاعبي الفريق في أي وقت لضمان سير البطولة بسلاسة."
              action={
                <Button size="sm" variant="soft" onClick={openAddModal} disabled={atMax}>
                  <Plus className="size-3.5" />
                  إضافة أول لاعب
                </Button>
              }
            />
          ) : (
            <div className="max-h-[52vh] overflow-y-auto pe-1">
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredPlayers.map((player) => {
                  const isInSquad = Boolean(player.in_squad)
                  const isSuspended = player.status === 'suspended'
                  const isInjured = player.status === 'injured'
                  const isUnavailable = player.status === 'unavailable'
                  const photoSrc = player.photo_thumbnail_url || player.photo_url

                  return (
                    <div
                      key={player.id}
                      className={`relative flex items-center gap-3.5 rounded-2xl border p-3 transition-all ${
                        isInSquad
                          ? isSuspended
                            ? 'border-rose-300 bg-rose-50/40'
                            : 'border-emerald-200 bg-emerald-50/30 ring-1 ring-emerald-500/10'
                          : 'border-slate-200/80 bg-white hover:border-slate-300'
                      }`}
                    >
                      {/* Player Photo or Jersey */}
                      <div className="relative shrink-0">
                        {photoSrc ? (
                          <img
                            src={photoSrc}
                            alt={player.name}
                            className="size-14 rounded-2xl object-cover ring-2 ring-white shadow-sm"
                          />
                        ) : (
                          <div className="grid size-14 place-items-center rounded-2xl bg-slate-100">
                            <Jersey number={player.number} variant={isInSquad ? 'home' : 'away'} className="size-11" />
                          </div>
                        )}

                        {player.number != null && (
                          <span className="absolute -bottom-1 -end-1 flex size-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-black text-white shadow">
                            {player.number}
                          </span>
                        )}
                      </div>

                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h5 className="truncate text-sm font-black text-slate-900">{player.name}</h5>
                          {player.is_essential && (
                            <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-500" title="لاعب أساسي" />
                          )}
                        </div>

                        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                          <Badge variant="neutral" className="!px-1.5 !py-0 text-[10px]">
                            {getPositionLabel(player.position)}
                          </Badge>

                          {isInSquad ? (
                            isSuspended ? (
                              <Badge variant="danger" className="!px-1.5 !py-0 text-[10px]">⛔ موقوف</Badge>
                            ) : isInjured ? (
                              <Badge variant="warning" className="!px-1.5 !py-0 text-[10px]">🩹 مصاب</Badge>
                            ) : isUnavailable ? (
                              <Badge variant="neutral" className="!px-1.5 !py-0 text-[10px]">⚪ غير متاح</Badge>
                            ) : (
                              <Badge variant="success" className="!px-1.5 !py-0 text-[10px]">🟢 معتمد للبطولة</Badge>
                            )
                          ) : (
                            <Badge variant="neutral" className="!px-1.5 !py-0 text-[10px]">غير مدرج</Badge>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 flex-col items-end gap-1.5">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(player)}
                            className="grid size-7 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                            title="تعديل بيانات اللاعب والصورة"
                            aria-label="تعديل"
                          >
                            <Pencil className="size-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeletePlayer(player)}
                            disabled={busyActionId === `delete-${player.id}`}
                            className="grid size-7 place-items-center rounded-lg text-rose-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                            title="حذف/إزالة اللاعب"
                            aria-label="حذف"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>

                        {/* Toggle squad inclusion button */}
                        <button
                          type="button"
                          onClick={() => toggleSquadMembership(player)}
                          disabled={busyActionId === `toggle-${player.id}` || (!isInSquad && atMax)}
                          className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold transition-all ${
                            isInSquad
                              ? 'bg-rose-50 text-rose-600 hover:bg-rose-100'
                              : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          } disabled:opacity-50`}
                          title={isInSquad ? 'استبعاد من قائمة البطولة' : 'اعتماد في قائمة البطولة'}
                        >
                          {busyActionId === `toggle-${player.id}` ? (
                            <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : isInSquad ? (
                            <>
                              <UserMinus className="size-3" />
                              <span>استبعاد</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="size-3" />
                              <span>اعتماد</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Add / Edit Player Modal */}
      <Modal
        open={playerModalOpen}
        onClose={() => setPlayerModalOpen(false)}
        title={editingPlayer ? `تعديل اللاعب: ${editingPlayer.name}` : `إضافة لاعب إلى فريق ${team?.name || ''}`}
        subtitle="صلاحية اللجنة المنظمة لتصحيح وتحديث بيانات اللاعبين وصورهم مباشرة"
        size="md"
      >
        <form onSubmit={submitPlayerForm} className="space-y-4">
          {/* Photo upload section */}
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-3.5">
            <div className="relative shrink-0">
              {playerPhotoPreview ? (
                <img
                  src={playerPhotoPreview}
                  alt="Player preview"
                  className="size-16 rounded-2xl object-cover ring-2 ring-emerald-500/20"
                />
              ) : (
                <div className="grid size-16 place-items-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-200">
                  <Camera className="size-7" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-xs font-bold text-slate-800">صورة اللاعب (اختياري)</p>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handlePhotoChange}
                  className="hidden"
                  id="squad-player-photo-input"
                />
                <label
                  htmlFor="squad-player-photo-input"
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                >
                  <Camera className="size-3.5 text-emerald-600" />
                  {playerPhotoPreview ? 'تغيير الصورة' : 'رفع صورة'}
                </label>

                {playerPhotoPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
                  >
                    <X className="size-3.5" />
                    إزالة
                  </button>
                )}
              </div>
            </div>
          </div>
          {playerFormErrors.photo && (
            <p className="text-xs font-bold text-rose-600">{playerFormErrors.photo[0]}</p>
          )}

          {/* Name Field */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">
              اسم اللاعب <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={playerForm.name}
              onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
              placeholder="مثال: محمد العلوي"
              className={`${inputClass} ${playerFormErrors.name ? 'border-rose-300 bg-rose-50/40' : ''}`}
            />
            {playerFormErrors.name && (
              <p className="mt-1 text-xs font-bold text-rose-600">{playerFormErrors.name[0]}</p>
            )}
          </div>

          {/* Number & Position row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">رقم القميص</label>
              <input
                type="number"
                min="0"
                max="99"
                value={playerForm.number}
                onChange={(e) => setPlayerForm({ ...playerForm, number: e.target.value })}
                placeholder="مثال: 10"
                className={`${inputClass} ${playerFormErrors.number ? 'border-rose-300 bg-rose-50/40' : ''}`}
              />
              {playerFormErrors.number && (
                <p className="mt-1 text-xs font-bold text-rose-600">{playerFormErrors.number[0]}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">المركز</label>
              <select
                value={playerForm.position}
                onChange={(e) => setPlayerForm({ ...playerForm, position: e.target.value })}
                className={inputClass}
              >
                <option value="">اختر المركز...</option>
                {POSITIONS.map((pos) => (
                  <option key={pos.value} value={pos.value}>
                    {pos.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Status Field */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700">حالة اللاعب في البطولة</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { value: 'active', label: '🟢 متاح', hint: 'جاهز للمشاركة' },
                { value: 'suspended', label: '⛔ موقوف', hint: 'غير مؤهل' },
                { value: 'injured', label: '🩹 مصاب', hint: 'تحت العلاج' },
                { value: 'unavailable', label: '⚪ غير متاح', hint: 'غياب' },
              ].map((st) => (
                <button
                  key={st.value}
                  type="button"
                  onClick={() => setPlayerForm({ ...playerForm, status: st.value })}
                  className={`flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all ${
                    playerForm.status === st.value
                      ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-black">{st.label}</span>
                  <span className="mt-0.5 text-[9px] text-slate-400">{st.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Essential Toggle */}
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5">
            <input
              type="checkbox"
              checked={playerForm.is_essential}
              onChange={(e) => setPlayerForm({ ...playerForm, is_essential: e.target.checked })}
              className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-xs font-bold text-slate-800">لاعب أساسي/نجم في التشكيلة</span>
          </label>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPlayerModalOpen(false)}
              disabled={playerFormSaving}
            >
              إلغاء
            </Button>
            <Button type="submit" size="sm" loading={playerFormSaving}>
              <CheckCircle2 className="size-4" />
              {editingPlayer ? 'حفظ التعديلات' : 'إضافة واعتماد'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}