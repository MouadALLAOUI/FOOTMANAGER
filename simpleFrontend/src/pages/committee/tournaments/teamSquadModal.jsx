import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  Pencil,
  Plus,
  RotateCcw,
  Save,
  Search,
  ShieldAlert,
  Star,
  Table,
  Trash2,
  Upload,
  UserCheck,
  UserMinus,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import api from '../../../api/client'
import { useApi } from '../../../hooks/useApi'
import { Badge, Button, Empty, Modal, Skeleton } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { matchesArabicSearch } from '../../../lib/searchUtils'
import { toastApiError } from '../../../lib/errors'
import { TeamAvatar } from '../../tournaments/shared'
import Jersey from '../../manager/live/components/Jersey'
import { useProfileModal } from '../../../components/profile/ProfileModalContext'
import TeamDisciplinePreviewModal from '../../../domains/committee/components/TeamDisciplinePreviewModal'
import DisciplineMatchesReviewModal from '../../../domains/committee/components/DisciplineMatchesReviewModal'

const inputClass =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1B201D] px-3.5 py-2.5 text-sm font-bold text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20'

const POSITIONS = [
  { value: 'goalkeeper', label: 'حارس مرمى' },
  { value: 'defender', label: 'مدافع' },
  { value: 'midfielder', label: 'وسط ميدان' },
  { value: 'forward', label: 'مهاجم' },
]

/**
 * Intelligent helper to parse pasted text into player rows (name & jersey number).
 * Supports lines copied from WhatsApp, Excel, Notes, or Word:
 * Examples:
 *   "1. ياسين بونو - 1"
 *   "أحمد بنعلي\t10"
 *   "رشيد الداودي - 7"
 *   "سفيان أمرابط 4"
 *   "كريم فوزي"
 */
function parsePastedPlayerText(rawText) {
  if (!rawText || typeof rawText !== 'string') return []
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  const parsed = []

  for (const line of lines) {
    // 1. Strip leading numbering like "1. ", "1- ", "1) ", or "- "
    let clean = line.replace(/^\d+[\.\-\)]\s*/, '').replace(/^[-*•]\s*/, '').trim()
    if (!clean) continue

    let name = clean
    let number = ''

    // 2. Check tab-separated (from Excel/Sheets): "Name\t10"
    if (clean.includes('\t')) {
      const parts = clean.split('\t').map((p) => p.trim()).filter(Boolean)
      if (parts.length >= 2) {
        if (/^\d{1,2}$/.test(parts[1])) {
          name = parts[0]
          number = parts[1]
        } else if (/^\d{1,2}$/.test(parts[0])) {
          name = parts[1]
          number = parts[0]
        }
      }
    } else {
      // 3. Match trailing number: "Name - 10" or "Name : 10" or "Name , 10" or "Name 10"
      const trailingMatch = clean.match(/^(.*?)\s*[-–—:,]\s*(\d{1,2})$/) || clean.match(/^(.*?)\s+(\d{1,2})$/)
      if (trailingMatch && trailingMatch[1].trim() && !/^\d+$/.test(trailingMatch[1].trim())) {
        name = trailingMatch[1].trim()
        number = trailingMatch[2].trim()
      } else {
        // 4. Match leading number: "10 - Name" or "10 : Name"
        const leadingMatch = clean.match(/^(\d{1,2})\s*[-–—:,]\s*(.+)$/)
        if (leadingMatch && leadingMatch[2].trim()) {
          number = leadingMatch[1].trim()
          name = leadingMatch[2].trim()
        }
      }
    }

    if (name) {
      parsed.push({
        name: name.replace(/[-–—:,]+$/, '').trim(),
        number: number ? String(number) : '',
      })
    }
  }

  return parsed
}

export default function TeamSquadModal({
  open,
  team: passedTeam,
  tournamentId: passedTournamentId,
  tournament,
  tournamentTeam,
  onClose,
  onRefresh,
  onSquadUpdated,
}) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { openTeam, openPlayer } = useProfileModal()

  const tournamentId = passedTournamentId || tournament?.id
  const team = passedTeam || tournamentTeam?.team || tournamentTeam
  const isOpen = open !== undefined ? Boolean(open) : Boolean(team && tournamentId)

  // View state: 'roster' | 'bulk'
  const [activeTab, setActiveTab] = useState('roster')
  const [search, setSearch] = useState('')

  // Bulk Entry table state
  const [bulkRows, setBulkRows] = useState([
    { name: '', number: '' },
    { name: '', number: '' },
    { name: '', number: '' },
  ])
  const [bulkSaving, setBulkSaving] = useState(false)
  const [bulkErrors, setBulkErrors] = useState({})
  const [bulkTopError, setBulkTopError] = useState('')

  // Single player inline edit modal state
  const [playerModalOpen, setPlayerModalOpen] = useState(false)
  const [editingPlayer, setEditingPlayer] = useState(null)
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

  // Fast inline actions busy states
  const [busyActionId, setBusyActionId] = useState(null)
  const [disciplineAction, setDisciplineAction] = useState(null)
  const [reviewMatchesOpen, setReviewMatchesOpen] = useState(false)

  const { data: payload, loading, refetch } = useApi(
    () => api.get(`/committee/tournaments/${tournamentId}/teams/${team?.id}/squad`).then((r) => r.data ?? {}),
    [tournamentId, team?.id, isOpen],
    { enabled: Boolean(isOpen && tournamentId && team?.id), staleTime: 0 },
  )

  const players = payload?.players ?? []
  const max = payload?.max ?? null
  const warning = payload?.warning ?? null
  const squadCount = payload?.squad_count ?? 0
  const atMax = max !== null && squadCount >= max
  const isFree = Boolean(team?.is_free)

  const handleClose = () => {
    setSearch('')
    setBulkErrors({})
    setBulkTopError('')
    setPlayerModalOpen(false)
    setEditingPlayer(null)
    setPlayerPhotoFile(null)
    setPlayerPhotoPreview(null)
    if (onClose) onClose()
  }

  // --- Bulk Add Helpers ---
  const updateRow = (i, field, value) => {
    setBulkRows((rows) => {
      const next = rows.map((row, idx) => (idx === i ? { ...row, [field]: value } : row))
      // Auto-add an empty row when typing in the last row
      if (i === rows.length - 1 && value && rows.length < 30) {
        next.push({ name: '', number: '' })
      }
      return next
    })
    if (bulkErrors[`players.${i}.${field}`]) {
      setBulkErrors((prev) => {
        const copy = { ...prev }
        delete copy[`players.${i}.${field}`]
        return copy
      })
    }
  }

  const addRow = () => {
    setBulkRows((rows) => (rows.length < 30 ? [...rows, { name: '', number: '' }] : rows))
  }

  const removeRow = (i) => {
    setBulkRows((rows) => (rows.length > 1 ? rows.filter((_, idx) => idx !== i) : [{ name: '', number: '' }]))
  }

  const clearBulkRows = () => {
    setBulkRows([
      { name: '', number: '' },
      { name: '', number: '' },
      { name: '', number: '' },
    ])
    setBulkErrors({})
    setBulkTopError('')
  }

  const handlePasteName = (e, rowIndex) => {
    const text = e.clipboardData?.getData('text')
    if (!text || !text.includes('\n')) return // normal inline paste for single line
    e.preventDefault()

    const parsed = parsePastedPlayerText(text)
    if (parsed.length === 0) return

    setBulkRows((prev) => {
      const before = prev.slice(0, rowIndex)
      const combined = [...before, ...parsed]
      if (combined.length < 30) {
        combined.push({ name: '', number: '' })
      }
      return combined.slice(0, 30)
    })

    toast.success(`تم استيراد ${parsed.length} لاعبين من النص المنسوخ بنجاح 📋`)
  }

  const saveBulk = async () => {
    if (bulkSaving) return

    const trimmedRows = bulkRows
      .map((row) => ({
        name: (row.name || '').trim(),
        number: row.number !== '' && row.number != null ? Number(row.number) : null,
      }))
      .filter((row) => row.name !== '')

    if (trimmedRows.length === 0) {
      setBulkTopError('يرجى إدخال اسم لاعب واحد على الأقل')
      return
    }

    // Client-side validations
    const errors = {}
    const seenNames = new Set()
    const seenNumbers = new Set()
    const existingNames = new Set(players.map((p) => (p.name || '').trim().toLowerCase()))
    const existingNumbers = new Set(players.map((p) => p.number).filter((n) => n != null && n > 0))

    trimmedRows.forEach((r, idx) => {
      const normName = r.name.toLowerCase()
      if (seenNames.has(normName)) {
        errors[`players.${idx}.name`] = 'الاسم مكرر في الجدول'
      } else if (existingNames.has(normName)) {
        errors[`players.${idx}.name`] = 'اللاعب موجود بالفعل في تشكيلة الفريق'
      } else {
        seenNames.add(normName)
      }

      if (r.number !== null && r.number > 0) {
        if (r.number > 99) {
          errors[`players.${idx}.number`] = 'رقم القميص بين 0 و 99'
        } else if (seenNumbers.has(r.number)) {
          errors[`players.${idx}.number`] = 'الرقم مكرر في الجدول'
        } else if (existingNumbers.has(r.number)) {
          errors[`players.${idx}.number`] = 'الرقم مستخدم بالفعل'
        } else {
          seenNumbers.add(r.number)
        }
      }
    })

    if (Object.keys(errors).length > 0) {
      setBulkErrors(errors)
      setBulkTopError('يرجى تصحيح الأخطاء الموضحة في الجدول قبل الحفظ')
      return
    }

    setBulkSaving(true)
    setBulkErrors({})
    setBulkTopError('')

    try {
      const { data } = await api.post(`/committee/tournaments/${tournamentId}/teams/${team?.id}/squad/bulk`, {
        players: trimmedRows.map((r) => ({
          name: r.name,
          number: r.number != null ? r.number : undefined,
        })),
      })
      const count = data?.created_count ?? trimmedRows.length
      toast.success(`تم حفظ واعتماد ${count} لاعبين بنجاح في تشكيلة البطولة! 🎉`)
      clearBulkRows()
      setActiveTab('roster')
      refetch()
      if (onSquadUpdated) onSquadUpdated()
      if (onRefresh) onRefresh()
    } catch (err) {
      const errs = err.response?.data?.errors
      if (errs && typeof errs === 'object') {
        setBulkErrors(errs)
        const top = errs.players
        setBulkTopError(Array.isArray(top) ? top[0] : typeof top === 'string' ? top : 'تعذر حفظ قائمة اللاعبين')
      } else {
        toastApiError(err, t)
      }
    } finally {
      setBulkSaving(false)
    }
  }

  // --- Inline Single Player Actions ---
  const toggleSquadMembership = async (player) => {
    if (busyActionId) return
    setBusyActionId(`toggle-${player.id}`)
    try {
      await api.put(`/committee/tournaments/${tournamentId}/teams/${team?.id}/squad/${player.id}`)
      toast.success(player.in_squad ? 'تم استبعاد اللاعب من قائمة البطولة' : 'تم اعتماد اللاعب في قائمة البطولة')
      refetch()
      if (onSquadUpdated) onSquadUpdated()
      if (onRefresh) onRefresh()
    } catch (err) {
      toastApiError(err, t)
    } finally {
      setBusyActionId(null)
    }
  }

  const handleDeletePlayer = async (player) => {
    if (busyActionId) return
    const confirmMsg = `هل أنت متأكد من حذف اللاعب "${player.name}" من قائمة الفريق والبطولة؟`
    if (!window.confirm(confirmMsg)) return

    setBusyActionId(`delete-${player.id}`)
    try {
      await api.delete(`/committee/tournaments/${tournamentId}/teams/${team?.id}/squad/${player.id}`)
      toast.success('تمت إزالة اللاعب بنجاح')
      refetch()
      if (onSquadUpdated) onSquadUpdated()
      if (onRefresh) onRefresh()
    } catch (err) {
      toastApiError(err, t)
    } finally {
      setBusyActionId(null)
    }
  }

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
    setPlayerPhotoPreview(player.photo_thumbnail_url || player.photo_url || null)
    setPlayerFormErrors({})
    setPlayerModalOpen(true)
  }

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
        await api.post(
          `/committee/tournaments/${tournamentId}/teams/${team?.id}/squad/${editingPlayer.id}`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        )
        toast.success('تم تحديث بيانات اللاعب بنجاح')
      } else {
        formData.append('force', '1')
        await api.post(
          `/committee/tournaments/${tournamentId}/teams/${team?.id}/squad`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } },
        )
        toast.success('تمت إضافة اللاعب واعتماده بنجاح')
      }

      setPlayerModalOpen(false)
      refetch()
      if (onSquadUpdated) onSquadUpdated()
      if (onRefresh) onRefresh()
    } catch (err) {
      const errs = err.response?.data?.errors
      if (errs && typeof errs === 'object' && Object.keys(errs).length > 0) {
        setPlayerFormErrors(errs)
      } else {
        toastApiError(err, t)
      }
    } finally {
      setPlayerFormSaving(false)
    }
  }

  const filteredPlayers = players.filter((p) => {
    if (!search.trim()) return true
    return (
      matchesArabicSearch(search, p.name || '') ||
      (p.number != null && String(p.number).includes(search.trim())) ||
      (p.position && matchesArabicSearch(search, p.position))
    )
  })

  const getPositionLabel = (pos) => {
    const found = POSITIONS.find((p) => p.value === pos)
    return found ? found.label : pos || 'غير محدد'
  }

  return (
    <>
      <Modal
        open={isOpen}
        onClose={handleClose}
        title={team?.name || 'تشكيلة الفريق'}
        subtitle="إدارة وتعديل قائمة لاعبي الفريق في البطولة بصلاحيات اللجنة المنظمة الكاملة"
        size="lg"
      >
        <div className="space-y-4" dir="rtl">
          {/* Header Banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#F7F8F5] dark:bg-[#252B27] p-3 sm:p-4">
            <div className="flex items-center gap-3 min-w-0">
              <TeamAvatar
                team={team}
                onClick={team?.id != null ? () => { handleClose(); openTeam(team) } : undefined}
                className="size-12 shrink-0 shadow-2xs"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="truncate text-base font-black text-slate-900 dark:text-white">
                    {team?.id != null ? (
                      <button
                        type="button"
                        onClick={() => { handleClose(); openTeam(team) }}
                        className="max-w-full truncate text-start hover:text-emerald-600 dark:hover:text-[#D0FF38] transition-colors cursor-pointer"
                        title="عرض الملف الكامل للفريق"
                      >
                        {team.name}
                      </button>
                    ) : (
                      team?.name || '—'
                    )}
                  </h4>
                  {isFree && <Badge variant="info">فريق حر</Badge>}
                </div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  {team?.city ? `${team.city} • ` : ''}
                  إجمالي المسجلين: <span className="font-black text-slate-800 dark:text-slate-200 font-mono">{players.length}</span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={squadCount > 0 ? (atMax ? 'danger' : 'success') : 'neutral'}>
                {max != null ? `المعتمدون: ${squadCount} / ${max}` : `المعتمدون: ${squadCount}`}
              </Badge>
            </div>
          </div>

          {/* Navigation View Switcher (قائمة اللاعبين vs إضافة سريعة بالجدول) */}
          <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              type="button"
              onClick={() => setActiveTab('roster')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer ${
                activeTab === 'roster'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#1B201D] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Users className="size-4" />
              <span>قائمة اللاعبين</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                activeTab === 'roster' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
              }`}>
                {players.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('bulk')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-black transition cursor-pointer ${
                activeTab === 'bulk'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white dark:bg-[#1B201D] text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <Table className="size-4 text-emerald-500" />
              <span>إضافة سريعة بالجدول</span>
              <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] px-1.5 py-0.5 font-bold">
                سريعة
              </span>
            </button>

            <div className="ms-auto">
              <Button size="sm" variant="soft" onClick={openAddModal} disabled={atMax}>
                <Plus className="size-3.5" />
                <span>إضافة لاعب فردي</span>
              </Button>
            </div>
          </div>

          {/* TAB 1: BULK ENTRY TABLE (REQUIREMENT 2) */}
          {activeTab === 'bulk' && (
            <div className="space-y-3 rounded-2xl border border-emerald-500/25 bg-emerald-50/30 dark:bg-emerald-950/20 p-3.5 sm:p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-200/60 dark:border-emerald-800/60 pb-3">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Table className="size-4 text-emerald-600 dark:text-[#D0FF38]" />
                    <span>جدول الإدخال السريع للتشكيلة</span>
                  </h4>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                    أدخل أسماء اللاعبين وأرقام القمصان في صفوف الجدول، أو الصق قائمة كاملة من واتساب أو إكسيل.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={clearBulkRows}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 underline cursor-pointer"
                  >
                    مسح الجدول
                  </button>
                  <Button size="sm" variant="outline" onClick={addRow} disabled={bulkRows.length >= 30}>
                    <Plus className="size-3.5" />
                    <span>إضافة صف</span>
                  </Button>
                </div>
              </div>

              {bulkTopError && (
                <div className="rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/40 p-2.5 text-xs font-bold text-rose-700 dark:text-rose-300">
                  {bulkTopError}
                </div>
              )}

              {/* Table Container */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1B201D] shadow-2xs">
                <table className="w-full text-start border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#252B27] text-slate-700 dark:text-slate-300 font-black">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-3 text-start">اسم اللاعب الكامل (أو الصق قائمة أسماء هنا)</th>
                      <th className="py-2.5 px-3 w-24 sm:w-28 text-center">رقم القميص #</th>
                      <th className="py-2.5 px-3 w-12 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {bulkRows.map((row, i) => {
                      const nameError = bulkErrors[`players.${i}.name`]
                      const numberError = bulkErrors[`players.${i}.number`]
                      return (
                        <tr
                          key={i}
                          className="hover:bg-slate-50/70 dark:hover:bg-[#252B27]/50 transition-colors"
                        >
                          {/* Row Index */}
                          <td className="py-2 px-3 text-center font-mono font-bold text-slate-400">
                            {i + 1}
                          </td>

                          {/* Player Name Column */}
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.name}
                              onPaste={(e) => handlePasteName(e, i)}
                              onChange={(e) => updateRow(i, 'name', e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault()
                                  if (i === bulkRows.length - 1) addRow()
                                }
                              }}
                              placeholder="مثال: يوسف النصيري (أو الصق عدة أسطر)"
                              className={`w-full h-10 rounded-lg border bg-white dark:bg-[#252B27] px-3 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:ring-2 focus:ring-emerald-500/20 ${
                                nameError
                                  ? 'border-rose-400 bg-rose-50/30 dark:border-rose-800'
                                  : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                              }`}
                            />
                            {nameError && (
                              <span className="block mt-1 text-[10px] font-bold text-rose-600">
                                {Array.isArray(nameError) ? nameError[0] : nameError}
                              </span>
                            )}
                          </td>

                          {/* Jersey Number Column */}
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="99"
                              value={row.number}
                              onChange={(e) => updateRow(i, 'number', e.target.value)}
                              placeholder="#"
                              className={`w-full h-10 rounded-lg border bg-white dark:bg-[#252B27] text-center font-mono text-xs font-black text-slate-900 dark:text-white placeholder-slate-400 outline-none transition focus:ring-2 focus:ring-emerald-500/20 ${
                                numberError
                                  ? 'border-rose-400 bg-rose-50/30 dark:border-rose-800'
                                  : 'border-slate-200 dark:border-slate-700 focus:border-emerald-500'
                              }`}
                            />
                            {numberError && (
                              <span className="block mt-1 text-[10px] font-bold text-rose-600">
                                {Array.isArray(numberError) ? numberError[0] : numberError}
                              </span>
                            )}
                          </td>

                          {/* Row Delete Button */}
                          <td className="py-2 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => removeRow(i)}
                              disabled={bulkRows.length <= 1}
                              className="grid size-8 place-items-center rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30 transition cursor-pointer mx-auto"
                              title="حذف هذا الصف"
                              aria-label="حذف الصف"
                            >
                              <X className="size-4" />
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paste Help Tip Banner */}
              <div className="flex items-start gap-2 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50 dark:bg-sky-950/30 p-2.5 text-xs text-sky-900 dark:text-sky-300">
                <span className="text-sm">💡</span>
                <span className="font-semibold leading-relaxed">
                  <strong>نصيحة للإدخال فائق السرعة:</strong> انسخ قائمة اللاعبين من محادثة واتساب أو ملف إكسيل والصقها مباشرة في أي خانة اسم، وسيقوم النظام تلقائياً بإنشاء الأسطر وفصل أرقام القمصان لكل لاعب!
                </span>
              </div>

              {/* Single Save All Players Button */}
              <div className="flex items-center justify-between gap-3 pt-2">
                <Button variant="outline" size="sm" onClick={() => setActiveTab('roster')}>
                  إلغاء والعودة للقائمة
                </Button>
                <Button
                  size="md"
                  onClick={saveBulk}
                  loading={bulkSaving}
                  disabled={bulkSaving || atMax}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-black shadow-sm gap-2"
                >
                  <Save className="size-4" />
                  <span>حفظ واعتماد جميع اللاعبين</span>
                </Button>
              </div>
            </div>
          )}

          {/* TAB 2: ROSTER VIEW (REQUIREMENTS 3 & 4) */}
          {activeTab === 'roster' && (
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث بالاسم أو رقم القميص أو المركز..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1B201D] py-2.5 pe-3 ps-10 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:outline-none transition shadow-2xs"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Warnings & Max banners */}
              {atMax && (
                <p className="flex items-center gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/40 px-3.5 py-2.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <ShieldAlert className="size-4 shrink-0 text-amber-600" />
                  تم بلوغ الحد الأقصى للاعبي البطولة ({max} لاعب). لا يمكن اعتماد لاعبين إضافيين دون إزاحة غيرهم.
                </p>
              )}

              {/* Players Roster Grid */}
              {loading ? (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-2xl" />
                  ))}
                </div>
              ) : filteredPlayers.length === 0 ? (
                <Empty
                  icon={Users}
                  title={search ? 'لا توجد نتائج تطابق بحثك' : 'لا يوجد لاعبون مسجلون بعد'}
                  description="اضغط على «إضافة سريعة بالجدول» لإدخال تشكيلة الفريق دفعة واحدة بسهولة وسرعة."
                  action={
                    <Button size="sm" onClick={() => setActiveTab('bulk')} className="bg-emerald-600 text-white font-bold gap-1.5">
                      <Table className="size-3.5" />
                      <span>إضافة تشكيلة سريعة بالجدول</span>
                    </Button>
                  }
                />
              ) : (
                <div className="max-h-[50vh] overflow-y-auto pe-1">
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {filteredPlayers.map((player) => {
                      const isInSquad = Boolean(player.in_squad)
                      const isSuspended = player.status === 'suspended'
                      const isInjured = player.status === 'injured'
                      const isUnavailable = player.status === 'unavailable'
                      const photoSrc = player.photo_thumbnail_url || player.photo_url

                      return (
                        <div
                          key={player.id}
                          className={`relative flex items-center justify-between gap-3 rounded-2xl border p-3 transition-all ${
                            isInSquad
                              ? isSuspended
                                ? 'border-rose-300 bg-rose-50/40 dark:border-rose-900/60 dark:bg-rose-950/20'
                                : 'border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/25 dark:bg-emerald-950/15'
                              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1B201D] opacity-80 hover:opacity-100'
                          }`}
                        >
                          {/* Player Photo/Avatar + Clickable Name and Details */}
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Avatar (Click opens edit dialog) */}
                            <button
                              type="button"
                              onClick={() => openEditModal(player)}
                              className="relative shrink-0 cursor-pointer group"
                              title="اضغط لتعديل صورة اللاعب أو بياناته"
                            >
                              {photoSrc ? (
                                <img
                                  src={photoSrc}
                                  alt={player.name}
                                  className="size-12 rounded-xl object-cover ring-2 ring-white dark:ring-slate-800 shadow-xs group-hover:ring-emerald-400 transition"
                                />
                              ) : (
                                <div className="grid size-12 place-items-center rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:ring-2 group-hover:ring-emerald-400 transition">
                                  <Jersey number={player.number} variant={isInSquad ? 'home' : 'away'} className="size-9" />
                                </div>
                              )}
                              {player.number != null && (
                                <span className="absolute -bottom-1 -end-1 flex size-5 items-center justify-center rounded-full bg-slate-900 text-[10px] font-black text-white shadow font-mono">
                                  {player.number}
                                </span>
                              )}
                            </button>

                            {/* Player Info */}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                {/* Clickable Player Name (Requirement 3) */}
                                <button
                                  type="button"
                                  onClick={() => openEditModal(player)}
                                  className="max-w-full truncate text-start text-xs sm:text-sm font-black text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-[#D0FF38] transition-colors cursor-pointer group/name inline-flex items-center gap-1"
                                  title="اضغط لتعديل الاسم والرقم والصورة"
                                >
                                  <span className="truncate group-hover/name:underline">{player.name}</span>
                                  <Pencil className="size-3 text-slate-400 opacity-0 group-hover/name:opacity-100 transition-opacity" />
                                </button>
                                {player.is_essential && (
                                  <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-500" title="لاعب أساسي" />
                                )}
                              </div>

                              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                                <span className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-slate-600 dark:text-slate-300">
                                  {getPositionLabel(player.position)}
                                </span>

                                {isInSquad ? (
                                  isSuspended ? (
                                    <span className="rounded-md bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 px-1.5 py-0.5">⛔ موقوف</span>
                                  ) : isInjured ? (
                                    <span className="rounded-md bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 px-1.5 py-0.5">🩹 مصاب</span>
                                  ) : isUnavailable ? (
                                    <span className="rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 px-1.5 py-0.5">⚪ غير متاح</span>
                                  ) : (
                                    <span className="rounded-md bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 px-1.5 py-0.5">🟢 معتمد</span>
                                  )
                                ) : (
                                  <span className="rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5">غير مدرج</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1 shrink-0">
                            {/* Edit Button */}
                            <button
                              type="button"
                              onClick={() => openEditModal(player)}
                              className="grid size-8 place-items-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                              title="تعديل بيانات اللاعب والصورة"
                              aria-label="تعديل"
                            >
                              <Pencil className="size-3.5" />
                            </button>

                            {/* Toggle squad inclusion */}
                            <button
                              type="button"
                              onClick={() => toggleSquadMembership(player)}
                              disabled={busyActionId === `toggle-${player.id}` || (!isInSquad && atMax)}
                              className={`grid size-8 place-items-center rounded-xl transition cursor-pointer ${
                                isInSquad
                                  ? 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                                  : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                              } disabled:opacity-50`}
                              title={isInSquad ? 'استبعاد من قائمة البطولة' : 'اعتماد في قائمة البطولة'}
                              aria-label={isInSquad ? 'استبعاد' : 'اعتماد'}
                            >
                              {busyActionId === `toggle-${player.id}` ? (
                                <span className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              ) : isInSquad ? (
                                <UserMinus className="size-4" />
                              ) : (
                                <UserCheck className="size-4" />
                              )}
                            </button>

                            {/* Delete Player */}
                            <button
                              type="button"
                              onClick={() => handleDeletePlayer(player)}
                              disabled={busyActionId === `delete-${player.id}`}
                              className="grid size-8 place-items-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer disabled:opacity-50"
                              title="حذف اللاعب نهائياً"
                              aria-label="حذف"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Weekly Subscriptions Card */}
          {payload?.weekly_subscriptions && payload.weekly_subscriptions.length > 0 && (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-50/40 dark:bg-emerald-950/20 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-black text-emerald-900 dark:text-emerald-300">
                  <span className="grid size-6 place-items-center rounded-lg bg-emerald-600 text-white">
                    <CalendarDays className="size-3.5" />
                  </span>
                  <span>الحجوزات والمواعيد الأسبوعية المعتمدة للفريق ({payload.weekly_subscriptions.length})</span>
                </div>
                <button
                  type="button"
                  onClick={() => { handleClose(); openTeam(team) }}
                  className="text-[11px] font-bold text-emerald-700 dark:text-[#D0FF38] hover:underline cursor-pointer"
                >
                  عرض في الملف
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {payload.weekly_subscriptions.map((ws) => (
                  <div key={ws.id} className="flex items-center justify-between rounded-xl bg-white dark:bg-[#1B201D] p-2.5 text-xs shadow-2xs border border-emerald-100 dark:border-emerald-900/60">
                    <div className="font-bold text-slate-800 dark:text-slate-200">
                      <span className="text-emerald-700 dark:text-[#D0FF38] font-black">{ws.day_name}</span> • {ws.start_time} - {ws.end_time}
                    </div>
                    <div className="text-[11px] text-slate-500 font-semibold">{ws.terrain?.name || 'الملعب'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* MODAL: EDIT / ADD SINGLE PLAYER DETAILS & PHOTO (REQUIREMENT 3) */}
      <Modal
        open={playerModalOpen}
        onClose={() => setPlayerModalOpen(false)}
        title={editingPlayer ? `تعديل بيانات اللاعب: ${editingPlayer.name}` : `إضافة لاعب إلى ${team?.name || ''}`}
        subtitle="تعديل اسم اللاعب ورقم القميص وصورته الشخصية والمركز"
        size="md"
      >
        <form onSubmit={submitPlayerForm} className="space-y-4" dir="rtl">
          {/* Photo upload section (Requirement 3.2) */}
          <div className="flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#F7F8F5] dark:bg-[#252B27] p-3.5">
            <div className="relative shrink-0">
              {playerPhotoPreview ? (
                <img
                  src={playerPhotoPreview}
                  alt="Player preview"
                  className="size-16 rounded-2xl object-cover ring-2 ring-emerald-500/30 shadow-xs"
                />
              ) : (
                <div className="grid size-16 place-items-center rounded-2xl bg-white dark:bg-[#1B201D] text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700">
                  <Camera className="size-7" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">صورة اللاعب (اختياري)</p>
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
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white dark:bg-[#1B201D] px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 ring-1 ring-slate-200 dark:ring-slate-700 hover:bg-slate-50 transition"
                >
                  <Camera className="size-3.5 text-emerald-600 dark:text-[#D0FF38]" />
                  <span>{playerPhotoPreview ? 'تغيير الصورة' : 'رفع صورة'}</span>
                </label>

                {playerPhotoPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition cursor-pointer"
                  >
                    <X className="size-3.5" />
                    <span>إزالة الصورة</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {playerFormErrors.photo && (
            <p className="text-xs font-bold text-rose-600">{playerFormErrors.photo[0]}</p>
          )}

          {/* Name Field (Requirement 3.1) */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">
              اسم اللاعب <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={playerForm.name}
              onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
              placeholder="مثال: محمد العلوي"
              className={`${inputClass} ${playerFormErrors.name ? 'border-rose-400 bg-rose-50/30' : ''}`}
            />
            {playerFormErrors.name && (
              <p className="mt-1 text-xs font-bold text-rose-600">{playerFormErrors.name[0]}</p>
            )}
          </div>

          {/* Number & Position (Requirement 3.3) */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">رقم القميص</label>
              <input
                type="number"
                min="0"
                max="99"
                value={playerForm.number}
                onChange={(e) => setPlayerForm({ ...playerForm, number: e.target.value })}
                placeholder="مثال: 10"
                className={`${inputClass} ${playerFormErrors.number ? 'border-rose-400 bg-rose-50/30' : ''}`}
              />
              {playerFormErrors.number && (
                <p className="mt-1 text-xs font-bold text-rose-600">{playerFormErrors.number[0]}</p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">المركز</label>
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
            <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-300">حالة اللاعب في البطولة</label>
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
                  className={`flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all cursor-pointer ${
                    playerForm.status === st.value
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1B201D] text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <span className="text-xs font-black">{st.label}</span>
                  <span className="mt-0.5 text-[9px] text-slate-400">{st.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Essential Toggle & Open Player Profile (Requirement 3.4) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
            <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-[#F7F8F5] dark:bg-[#252B27] p-2.5">
              <input
                type="checkbox"
                checked={playerForm.is_essential}
                onChange={(e) => setPlayerForm({ ...playerForm, is_essential: e.target.checked })}
                className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">لاعب أساسي/نجم في التشكيلة</span>
            </label>

            {editingPlayer?.id && (
              <button
                type="button"
                onClick={() => {
                  setPlayerModalOpen(false)
                  handleClose()
                  openPlayer(editingPlayer.id)
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-[#D0FF38] hover:underline cursor-pointer p-1"
                title="عرض الملف الشخصي الكامل للاعب"
              >
                <UserRound className="size-3.5" />
                <span>عرض الملف الشخصي للاعب</span>
                <ExternalLink className="size-3" />
              </button>
            )}
          </div>

          {/* Form Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setPlayerModalOpen(false)}
              disabled={playerFormSaving}
            >
              إلغاء
            </Button>
            <Button type="submit" size="sm" loading={playerFormSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              <CheckCircle2 className="size-4" />
              <span>{editingPlayer ? 'حفظ التعديلات' : 'إضافة واعتماد'}</span>
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
