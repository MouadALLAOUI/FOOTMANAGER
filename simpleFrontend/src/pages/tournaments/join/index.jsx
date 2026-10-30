import { useState, useRef, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  Camera,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  Loader2,
  Phone,
  Plus,
  Shield,
  Sparkles,
  Trophy,
  Trash2,
  User,
  Users,
  X,
  AlertCircle,
  Share2,
  MapPin,
  Calendar,
  MessageCircle,
  RefreshCw,
  Edit3,
  HelpCircle,
  ChevronDown,
} from 'lucide-react'
import api from '../../../api/client'
import { useToast } from '../../../components/ui/Toast'
import SEO from '../../../components/system/SEO'
import { Modal } from '../../../components/dashboard/ui'
import QuickShareCard from '../../../components/tournaments/QuickShareCard'

const POSITIONS = [
  { value: 'goalkeeper', label: 'حارس مرمى', icon: '🧤' },
  { value: 'defender', label: 'مدافع', icon: '🛡️' },
  { value: 'midfielder', label: 'خط وسط', icon: '⚙️' },
  { value: 'forward', label: 'مهاجم', icon: '⚽' },
]

const DAYS_OF_WEEK = [
  { value: 0, label: 'الأحد' },
  { value: 1, label: 'الاثنين' },
  { value: 2, label: 'الثلاثاء' },
  { value: 3, label: 'الأربعاء' },
  { value: 4, label: 'الخميس' },
  { value: 5, label: 'الجمعة' },
  { value: 6, label: 'السبت' },
]

const TIME_SLOTS = [
  '17:00', '18:00', '19:00', '20:00', '21:00', '22:00', '23:00'
]

export default function TournamentJoinPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const logoInputRef = useRef(null)

  // Tournament Data
  const [tournament, setTournament] = useState(null)
  const [loadingTour, setLoadingTour] = useState(true)
  const [tourError, setTourError] = useState(null)

  // Stadiums for League format
  const [stadiums, setStadiums] = useState([])
  const [loadingStadiums, setLoadingStadiums] = useState(false)

  // Form State
  const [teamName, setTeamName] = useState('')
  const [city, setCity] = useState('')
  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)

  // Manager State
  const [managerName, setManagerName] = useState('')
  const [managerPhone, setManagerPhone] = useState('')

  // League Pitch Reservation State (Only for 'league' format)
  const [selectedStadiumId, setSelectedStadiumId] = useState('')
  const [customPitchName, setCustomPitchName] = useState('')
  const [bookingDayOfWeek, setBookingDayOfWeek] = useState(5) // default Friday
  const [bookingTime, setBookingTime] = useState('20:00')
  const [pitchNotes, setPitchNotes] = useState('')

  // Players Roster State
  const [players, setPlayers] = useState([
    { name: '', age: '', position: 'midfielder' },
    { name: '', age: '', position: 'defender' },
    { name: '', age: '', position: 'forward' },
    { name: '', age: '', position: 'goalkeeper' },
    { name: '', age: '', position: 'midfielder' },
  ])

  // Rules & Terms
  const [rulesAccepted, setRulesAccepted] = useState(false)
  const [rulesModalOpen, setRulesModalOpen] = useState(false)

  // Submission State & Pending Dashboard
  const [submitting, setSubmitting] = useState(false)
  const [submittedData, setSubmittedData] = useState(null)
  const [checkingStatus, setCheckingStatus] = useState(false)
  const [squadExpanded, setSquadExpanded] = useState(false)

  // Check LocalStorage for existing pending registration on mount
  useEffect(() => {
    if (!slug) return
    try {
      const saved = localStorage.getItem(`pending_tournament_join_${slug}`)
      if (saved) {
        setSubmittedData(JSON.parse(saved))
      }
    } catch {
      // Ignore parse errors
    }
  }, [slug])

  // Fetch Tournament Info
  useEffect(() => {
    let active = true
    setLoadingTour(true)
    api
      .get(`/v1/tournaments/${slug}`)
      .then((res) => {
        if (!active) return
        const tData = res.data?.data || res.data
        setTournament(tData)

        // If tournament format is league, fetch stadiums
        if (tData?.tournament_format === 'league') {
          setLoadingStadiums(true)
          api
            .get('/stadiums')
            .then((stadiumRes) => {
              if (active) {
                setStadiums(stadiumRes.data?.data || [])
              }
            })
            .catch(() => {})
            .finally(() => {
              if (active) setLoadingStadiums(false)
            })
        }
      })
      .catch(() => {
        if (!active) return
        setTourError('تعذر تحميل بيانات البطولة، قد تكون غير منشورة أو غير موجودة.')
      })
      .finally(() => {
        if (active) setLoadingTour(false)
      })

    return () => {
      active = false
    }
  }, [slug])

  // Handle Logo Selection
  const handleLogoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الشعار يجب ألا يتجاوز 5 ميجابايت')
      return
    }
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = () => setLogoPreview(reader.result)
    reader.readAsDataURL(file)
  }

  // Player Rows Management
  const addPlayerRow = () => {
    setPlayers((prev) => [...prev, { name: '', age: '', position: 'midfielder' }])
  }

  const removePlayerRow = (index) => {
    if (players.length <= 1) {
      toast.error('يجب أن تحتوي التشكيلة على لاعب واحد على الأقل')
      return
    }
    setPlayers((prev) => prev.filter((_, idx) => idx !== index))
  }

  const updatePlayer = (index, field, value) => {
    setPlayers((prev) => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: value }
      return copy
    })
  }

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!teamName.trim()) {
      toast.error('يرجى إدخال اسم الفريق أو النادي')
      return
    }

    if (!managerName.trim()) {
      toast.error('يرجى إدخال اسم مسير الفريق')
      return
    }

    let cleanPhone = managerPhone.trim().replace(/\s+/g, '')
    if (!cleanPhone) {
      toast.error('يرجى إدخال رقم هاتف المسير للتواصل')
      return
    }

    if (!rulesAccepted) {
      toast.error('يجب الموافقة على القانون الداخلي وشروط البطولة لإتمام التسجيل')
      return
    }

    if (tournament?.tournament_format === 'league' && !selectedStadiumId && !customPitchName.trim()) {
      toast.error('يرجى اختيار ملعب القرب المعتمد أو إدخال اسم ملعبكم لإتمام التسجيل بنظام الدوري')
      return
    }

    // Filter valid players
    const validPlayers = players.filter((p) => p.name.trim().length > 0)

    setSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('team_name', teamName.trim())
      if (city.trim()) formData.append('city', city.trim())
      formData.append('manager_name', managerName.trim())
      formData.append('manager_phone', cleanPhone)
      formData.append('rules_accepted', '1')

      if (logoFile) {
        formData.append('logo', logoFile)
      }

      // League-specific pitch reservation parameters
      const isLeague = tournament?.tournament_format === 'league'
      if (isLeague) {
        if (selectedStadiumId) {
          formData.append('stadium_id', selectedStadiumId)
        }
        if (customPitchName.trim()) {
          formData.append('custom_pitch_name', customPitchName.trim())
        }
        formData.append('booking_day_of_week', String(bookingDayOfWeek))
        formData.append('booking_time', bookingTime)
        if (pitchNotes.trim()) {
          formData.append('pitch_notes', pitchNotes.trim())
        }
      }

      validPlayers.forEach((p, idx) => {
        formData.append(`players[${idx}][name]`, p.name.trim())
        if (p.age) formData.append(`players[${idx}][age]`, p.age)
        formData.append(`players[${idx}][position]`, p.position || 'midfielder')
      })

      const key = tournament?.slug || tournament?.id || slug
      const res = await api.post(`/v1/tournaments/${key}/join`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      const chosenStadium = stadiums.find((s) => String(s.id) === String(selectedStadiumId))

      // Format Moroccan phone for display
      let displayPhone = cleanPhone
      if (displayPhone.startsWith('0')) {
        displayPhone = '+212 ' + displayPhone.substring(1)
      } else if (!displayPhone.startsWith('+')) {
        displayPhone = '+212 ' + displayPhone
      }

      const pendingRecord = {
        teamId: res.data?.data?.team_id,
        teamName: teamName.trim(),
        city: city.trim() || tournament?.location || 'الدار البيضاء',
        logoPreview,
        managerName: managerName.trim(),
        managerPhone: displayPhone,
        rawPhone: cleanPhone,
        playersCount: validPlayers.length,
        players: validPlayers,
        tournamentName: tournament?.name || '',
        tournamentFormat: tournament?.tournament_format || 'knockout',
        organizerName: tournament?.organizer?.name || 'اللجنة المنظمة',
        organizerPhone: tournament?.organizer?.phone || '+212600000000',
        submittedAt: new Date().toISOString(),
        pitchReservation: isLeague
          ? {
              stadiumName: chosenStadium?.name || customPitchName.trim() || 'ملعب القرب المعتمد',
              dayName: DAYS_OF_WEEK.find((d) => d.value === Number(bookingDayOfWeek))?.label || 'الجمعة',
              time: bookingTime,
              status: 'pending',
            }
          : null,
      }

      setSubmittedData(pendingRecord)
      try {
        localStorage.setItem(`pending_tournament_join_${slug}`, JSON.stringify(pendingRecord))
      } catch {
        // LocalStorage quota fallback
      }

      toast.success('تم إرسال طلب انضمام فريقكم بنجاح!')
    } catch (err) {
      const msg = err.response?.data?.message || (err.response?.status === 500 ? 'حدث خطأ في الخادم أثناء معالجة الطلب، يرجى المحاولة ثانية' : 'حدث خطأ أثناء إرسال طلب الانضمام، يرجى المحاولة ثانية')
      toast.error(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Refresh status check
  const handleCheckStatus = async () => {
    setCheckingStatus(true)
    try {
      const res = await api.get(`/v1/tournaments/${slug}/me`)
      const reg = res.data?.data?.registration
      if (reg?.status === 'registered') {
        toast.success('تهانينا! تمت الموافقة على فريقكم رسمياً!')
      } else {
        toast.info('طلبكم لا يزال قيد مراجعة وموافقة اللجنة المنظمة.')
      }
    } catch {
      toast.info('طلبكم لا يزال قيد المراجعة.')
    } finally {
      setCheckingStatus(false)
    }
  }

  // Reset and allow submitting a new registration
  const handleResetRegistration = () => {
    if (window.confirm('هل تريد إلغاء لوحة الانتظار الحالية والعودة لنموذج التسجيل؟')) {
      try {
        localStorage.removeItem(`pending_tournament_join_${slug}`)
      } catch {}
      setSubmittedData(null)
    }
  }

  if (loadingTour) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4">
        <Loader2 className="size-10 animate-spin text-[#10B981] mb-3" />
        <p className="text-sm font-bold text-slate-300">جاري تحميل بيانات البطولة...</p>
      </div>
    )
  }

  if (tourError || !tournament) {
    return (
      <div className="min-h-screen bg-[#0F172A] flex flex-col items-center justify-center p-4 text-center">
        <div className="grid size-16 place-items-center rounded-3xl bg-rose-500/10 text-rose-400 mb-4 ring-1 ring-rose-500/20">
          <AlertCircle className="size-8" />
        </div>
        <h2 className="text-lg font-black text-white mb-2">البطولة غير متوفرة</h2>
        <p className="text-xs text-slate-400 max-w-sm mb-6">{tourError || 'لم يتم العثور على البطولة المطلوبة.'}</p>
        <Link
          to="/tournaments"
          className="inline-flex items-center gap-2 rounded-xl bg-[#10B981] px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-emerald-600 transition-colors"
        >
          <span>تصفح البطولات المتاحة</span>
        </Link>
      </div>
    )
  }

  // -------------------------------------------------------------
  // VIRTUAL PENDING DASHBOARD (لوحة التحكم الافتراضية المؤقتة)
  // -------------------------------------------------------------
  if (submittedData) {
    const orgPhoneClean = (submittedData.organizerPhone || '+212600000000').replace(/[^\d]/g, '')
    const waOrganizerMsg = encodeURIComponent(
      `السلام عليكم، أنا مسير فريق "${submittedData.teamName}". قمت بتقديم طلب انضمام لبطولة "${submittedData.tournamentName}" عبر الرابط وأنتظر موافقتكم الكريمة.`
    )

    return (
      <div dir="rtl" className="min-h-screen bg-[#0F172A] py-6 sm:py-10 px-3 sm:px-4 text-slate-100">
        <SEO title={`لوحة انتظار الفريق | بطولة ${submittedData.tournamentName}`} />

        <div className="mx-auto w-full max-w-xl space-y-5">
          {/* Top Bar Navigation */}
          <div className="flex items-center justify-between">
            <Link
              to={`/tournaments/${slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#10B981] hover:text-emerald-400 transition-colors"
            >
              <ChevronRight className="size-4" />
              <span>العودة لصفحة البطولة</span>
            </Link>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-bold text-[#10B981]">
              🇲🇦 منصة أجي نقصرو
            </span>
          </div>

          {/* Pending Dashboard Main Banner Card */}
          <div className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 p-6 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div className="flex items-center gap-4">
                {submittedData.logoPreview ? (
                  <img
                    src={submittedData.logoPreview}
                    alt="شعار الفريق"
                    className="size-16 rounded-2xl object-cover ring-2 ring-emerald-500/40 shrink-0 bg-slate-950"
                  />
                ) : (
                  <div className="grid size-16 shrink-0 place-items-center rounded-2xl bg-emerald-500/20 text-[#10B981] ring-2 ring-emerald-500/30">
                    <Shield className="size-8" />
                  </div>
                )}
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 px-2.5 py-0.5 text-[11px] font-bold text-amber-300 mb-1">
                    <Clock className="size-3 animate-pulse" />
                    <span>قيد مراجعة المنظم</span>
                  </span>
                  <h1 className="text-xl font-black text-white">{submittedData.teamName}</h1>
                  <p className="text-xs text-slate-400">
                    {submittedData.city} • بطولة {submittedData.tournamentName}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCheckStatus}
                disabled={checkingStatus}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors self-start sm:self-center"
              >
                <RefreshCw className={`size-3.5 ${checkingStatus ? 'animate-spin text-emerald-400' : ''}`} />
                <span>تحديث الحالة</span>
              </button>
            </div>

            {/* Manager Contact Details Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-5">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3.5">
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">مسير الفريق المعتمد</span>
                <p className="text-sm font-extrabold text-white">{submittedData.managerName}</p>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3.5">
                <span className="text-[10px] font-bold text-slate-400 block mb-0.5">رقم الهاتف للتواصل والتفعيل</span>
                <p className="text-sm font-extrabold text-[#10B981] dir-ltr inline-block">
                  🇲🇦 {submittedData.managerPhone}
                </p>
              </div>
            </div>

            {/* League Pitch Reservation Details (if League format) */}
            {submittedData.pitchReservation && (
              <div className="mt-4 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="size-4 text-[#10B981]" />
                    <span className="text-xs font-black text-emerald-300">حجز ملعب القرب المقترح (نظام الدوري)</span>
                  </div>
                  <span className="rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2 py-0.5 text-[10px] font-bold">
                    تأكيد مسير الملعب مطلوب 🏟️
                  </span>
                </div>
                <div className="text-xs text-slate-300 space-y-1">
                  <p>
                    • <span className="text-slate-400">الملعب:</span> <strong className="text-white">{submittedData.pitchReservation.stadiumName}</strong>
                  </p>
                  <p>
                    • <span className="text-slate-400">الموعد الأسبوعي المقترح:</span> <strong className="text-emerald-400">كل يوم {submittedData.pitchReservation.dayName} الساعة {submittedData.pitchReservation.time}</strong>
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Share Links Card */}
          <QuickShareCard tournament={tournament} type="both" />

          {/* Activation Step-by-Step Roadmap */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg space-y-4">
            <h2 className="text-sm font-black text-white flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sparkles className="size-4 text-[#10B981]" />
              <span>مسار تفعيل حساب المسير والانضمام للبطولة</span>
            </h2>

            <div className="space-y-3">
              {/* Step 1 */}
              <div className="flex items-start gap-3 rounded-2xl bg-emerald-950/20 border border-emerald-500/20 p-3">
                <div className="grid size-6 shrink-0 place-items-center rounded-full bg-[#10B981] text-white text-xs font-black">
                  ✓
                </div>
                <div>
                  <p className="text-xs font-extrabold text-white">1. إرسال طلب الانضمام</p>
                  <p className="text-[11px] text-emerald-300/80">تم تسجيل بيانات الفريق والمسير ولائحة اللاعبين بنجاح في أرشيف المنصة.</p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3">
                <div className="grid size-6 shrink-0 place-items-center rounded-full bg-amber-500 text-slate-950 text-xs font-black animate-pulse">
                  2
                </div>
                <div>
                  <p className="text-xs font-extrabold text-amber-200">2. مراجعة وموافقة اللجنة المنظمة (المرحلة الحالية)</p>
                  <p className="text-[11px] text-slate-300">
                    تقوم اللجنة المنظمة بمراجعة الطلب {submittedData.pitchReservation ? 'والتأكد من تأكيد حجز الملعب ' : ''}ثم الضغط على قبول الفريق.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3 rounded-2xl bg-slate-950/60 border border-slate-800 p-3">
                <div className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-800 text-slate-400 text-xs font-black">
                  3
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-300">3. استلام رسالة واتساب برابط تعيين الرقم السري (PIN)</p>
                  <p className="text-[11px] text-slate-400">
                    فور موافقة اللجنة، ستصلك رسالة عبر واتساب على هاتفك تحتوي على رابط آمن لتعيين كلمة مرورك/رقمك السري.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex items-start gap-3 rounded-2xl bg-slate-950/60 border border-slate-800 p-3">
                <div className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-800 text-slate-400 text-xs font-black">
                  4
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-300">4. الدخول إلى لوحة تحكم الفريق</p>
                  <p className="text-[11px] text-slate-400">
                    التحكم في التشكيلة، استدعاء اللاعبين، ومتابعة جدول المباريات والنتائج مباشرة.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Direct Organizer Contact Action */}
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/30 p-5 space-y-3 text-center sm:text-start">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold text-white">هل تود تسريع مراجعة وقبول طلبك؟</p>
                <p className="text-[11px] text-emerald-200/80">يمكنك التواصل مباشرة مع اللجنة المنظمة عبر واتساب لتأكيد جاهزية فريقكم.</p>
              </div>
              <a
                href={`https://wa.me/${orgPhoneClean}?text=${waOrganizerMsg}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#10B981] hover:bg-emerald-600 text-white font-bold text-xs px-5 py-3 shadow-lg shadow-emerald-950/40 transition-all shrink-0 w-full sm:w-auto"
              >
                <MessageCircle className="size-4" />
                <span>مراسلة المنظم عبر واتساب 💬</span>
              </a>
            </div>
          </div>

          {/* Registered Players Accordion / Summary */}
          {submittedData.players && submittedData.players.length > 0 && (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg space-y-3">
              <button
                type="button"
                onClick={() => setSquadExpanded(!squadExpanded)}
                className="flex w-full items-center justify-between text-xs font-black text-white cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-[#10B981]" />
                  <span>لائحة اللاعبين المسجلين ({submittedData.players.length} لاعب)</span>
                </div>
                <ChevronDown className={`size-4 text-slate-400 transition-transform ${squadExpanded ? 'rotate-180' : ''}`} />
              </button>

              {squadExpanded && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  {submittedData.players.map((pl, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl bg-slate-950/60 border border-slate-800/80 px-3 py-2 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="grid size-5 place-items-center rounded bg-slate-800 text-[10px] font-bold text-slate-300">
                          {idx + 1}
                        </span>
                        <span className="font-bold text-white">{pl.name}</span>
                        {pl.age && <span className="text-[11px] text-slate-400">({pl.age} سنة)</span>}
                      </div>
                      <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                        {POSITIONS.find((p) => p.value === pl.position)?.label || pl.position}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Link
              to={`/tournaments/${slug}`}
              className="flex-1 flex items-center justify-center gap-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-3 border border-slate-700 transition-colors"
            >
              <Trophy className="size-4 text-amber-400" />
              <span>صفحة تفاصيل البطولة</span>
            </Link>

            <button
              type="button"
              onClick={handleResetRegistration}
              className="flex items-center justify-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/40 hover:bg-slate-900 text-slate-400 hover:text-slate-300 font-bold text-xs py-3 px-4 transition-colors"
            >
              <Edit3 className="size-3.5" />
              <span>تقديم طلب جديد</span>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // -------------------------------------------------------------
  // REGISTRATION FORM
  // -------------------------------------------------------------
  const isLeagueFormat = tournament.tournament_format === 'league'

  return (
    <div dir="rtl" className="min-h-screen bg-[#0F172A] py-6 sm:py-12 px-3 sm:px-4 text-slate-100">
      <SEO
        title={`تسجيل فريق في بطولة ${tournament.name} | أجي نقصرو`}
        description={`انضم وسجل فريقك في بطولة ${tournament.name} عبر منصة أجي نقصرو.`}
      />

      <div className="mx-auto w-full max-w-xl">
        {/* Back Link */}
        <div className="mb-4 flex items-center justify-between">
          <Link
            to={`/tournaments/${slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#10B981] hover:text-emerald-300 transition-colors"
          >
            <ChevronRight className="size-4" />
            <span>العودة لتفاصيل البطولة</span>
          </Link>
          <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-bold text-[#10B981]">
            🇲🇦 +212 المغرب
          </span>
        </div>

        {/* Tournament Banner Card */}
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/80 via-slate-900 to-slate-950 p-5 shadow-xl mb-6">
          <div className="flex items-center gap-3.5">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[#10B981] text-white shadow-lg shadow-emerald-500/30">
              <Trophy className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-[#10B981] uppercase tracking-wider block mb-0.5">
                استمارة تسجيل وانضمام فريق • {isLeagueFormat ? 'نظام الدوري' : 'بطولة مجمعة'}
              </span>
              <h1 className="text-lg font-black text-white truncate">{tournament.name}</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {tournament.location || 'الدار البيضاء'} • {tournament.teams_count || 8} فرق مطلوبة
              </p>
            </div>
          </div>
        </div>

        {/* Main Join Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. معلومات الفريق */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-white border-b border-slate-800 pb-3">
              <Shield className="size-4 text-[#10B981]" />
              <span>1. معلومات الفريق والشعار</span>
            </div>

            {/* Logo Upload */}
            <div className="flex items-center gap-4">
              <div
                onClick={() => logoInputRef.current?.click()}
                className="relative grid size-20 shrink-0 place-items-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-950/60 hover:border-emerald-500 cursor-pointer overflow-hidden transition-colors"
                title="اضغط لاختيار شعار الفريق"
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="شعار الفريق" className="size-full object-cover" />
                ) : (
                  <div className="text-center p-2">
                    <Camera className="size-5 text-slate-400 mx-auto mb-1" />
                    <span className="text-[9px] text-slate-400 font-bold block">شعار النادي</span>
                  </div>
                )}
              </div>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoSelect}
                className="hidden"
              />
              <div className="min-w-0 flex-1">
                <button
                  type="button"
                  onClick={() => logoInputRef.current?.click()}
                  className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition-colors"
                >
                  {logoPreview ? 'تغيير الشعار' : 'رفع الشعار الرسمي (Logo)'}
                </button>
                <p className="text-[11px] text-slate-400 mt-1">اختياري - صيغة PNG أو JPG لا تتجاوز 5MB.</p>
              </div>
            </div>

            {/* Team Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                اسم الفريق أو النادي <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="مثال: نادي الأمل الرياضي"
                className="h-11 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3.5 text-xs font-bold text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* City */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                المدينة
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="مثال: الدار البيضاء، مراكش، طنجة..."
                className="h-11 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3.5 text-xs font-bold text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>
          </div>

          {/* 2. بيانات مسيري الفريق */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg space-y-4">
            <div className="flex items-center gap-2 text-sm font-black text-white border-b border-slate-800 pb-3">
              <User className="size-4 text-[#10B981]" />
              <span>2. بيانات مسير الفريق للتواصل والتفعيل</span>
            </div>

            {/* Manager Name */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                الاسم الكامل للمسير <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={managerName}
                onChange={(e) => setManagerName(e.target.value)}
                placeholder="الاسم واللقب"
                className="h-11 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3.5 text-xs font-bold text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            {/* Manager Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                رقم الهاتف (مع مفتاح المغرب 🇲🇦) <span className="text-rose-400">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute start-3 text-xs font-bold text-[#10B981] select-none">
                  🇲🇦 +212
                </span>
                <input
                  type="tel"
                  required
                  value={managerPhone}
                  onChange={(e) => setManagerPhone(e.target.value)}
                  placeholder="0612345678"
                  className="h-11 w-full rounded-2xl border border-slate-700 bg-slate-950 ps-20 pe-3.5 text-xs font-bold text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                سيتم إرسال رابط تفعيل الرقم السري الشخصي (PIN) إلى هذا الرقم فور قبول المنظم للطلب عبر واتساب.
              </p>
            </div>
          </div>

          {/* 3. شرط نوع البطولة: إذا كان نوع البطولة "دوري" حصرياً، تظهر خانة ملاعب القرب المعتمدة */}
          {isLeagueFormat && (
            <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-950 p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-800/40 pb-3">
                <div className="flex items-center gap-2 text-sm font-black text-white">
                  <MapPin className="size-4 text-[#10B981]" />
                  <span>3. حجوزات ملاعب القرب المعتمدة (خاص بنظام الدوري)</span>
                </div>
                <span className="rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                  إلزامي للدوري
                </span>
              </div>

              {/* Pitch Manager Confirmation Warning Alert */}
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-200 leading-relaxed font-medium">
                ⚠️ <span className="font-bold">تنبيه هام لنظام الدوري:</span> يتطلب انضمام الفريق في الدوري تحديد ملعب القرب وتوقيت الحجز الأسبوعي المعتمد، ولا يعتبر التسجيل نهائياً إلا بعد تأكيد وموافقة مسير الملعب واللجنة المنظمة.
              </div>

              {/* Stadium Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  اختر من ملاعب القرب المعتمدة بالمنصة
                </label>
                <select
                  value={selectedStadiumId}
                  onChange={(e) => setSelectedStadiumId(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3.5 text-xs font-bold text-white outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="">-- اختر الملعب من القائمة أو حدد ملعباً مخصصاً أدناه --</option>
                  {stadiums.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} {st.city ? `(${st.city})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Pitch Name if not in list */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  أو أدخل اسم ملعب القرب الخاص بفريقكم
                </label>
                <input
                  type="text"
                  value={customPitchName}
                  onChange={(e) => setCustomPitchName(e.target.value)}
                  placeholder="مثال: ملعب قرب الحي المحمدي، ملعب الشباب..."
                  className="h-11 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3.5 text-xs font-bold text-white placeholder:text-slate-500 outline-none focus:border-emerald-500"
                />
              </div>

              {/* Weekly Day & Time Slot */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    اليوم الأسبوعي المعتاد للحجز
                  </label>
                  <select
                    value={bookingDayOfWeek}
                    onChange={(e) => setBookingDayOfWeek(Number(e.target.value))}
                    className="h-11 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3.5 text-xs font-bold text-white outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {DAYS_OF_WEEK.map((d) => (
                      <option key={d.value} value={d.value}>
                        كل يوم {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    توقيت الحجز المعتاد
                  </label>
                  <select
                    value={bookingTime}
                    onChange={(e) => setBookingTime(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3.5 text-xs font-bold text-white outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {TIME_SLOTS.map((slot) => (
                      <option key={slot} value={slot}>
                        الساعة {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pitch Notes */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  ملاحظات الحجز أو اسم مسير الملعب (اختياري)
                </label>
                <input
                  type="text"
                  value={pitchNotes}
                  onChange={(e) => setPitchNotes(e.target.value)}
                  placeholder="مثال: تم الاتفاق مع مسير الملعب مسبقاً على الحصة"
                  className="h-11 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3.5 text-xs font-bold text-white placeholder:text-slate-500 outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* 4. إضافة لائحة اللاعبين */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-sm font-black text-white">
                <Users className="size-4 text-[#10B981]" />
                <span>4. لائحة لاعبي الفريق</span>
              </div>
              <span className="text-xs font-bold text-slate-400">
                {players.filter((p) => p.name.trim()).length} لاعب مسجل
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              أدخل أسماء اللاعبين ومراكزهم الأساسية في الملعب. يمكنك إضافة المزيد أو تعديلهم لاحقاً.
            </p>

            <div className="space-y-3">
              {players.map((player, idx) => (
                <div
                  key={`pl-row-${idx}`}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-3"
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-xl bg-slate-800 text-[11px] font-black text-slate-300">
                    {idx + 1}
                  </span>

                  {/* Player Name */}
                  <input
                    type="text"
                    value={player.name}
                    onChange={(e) => updatePlayer(idx, 'name', e.target.value)}
                    placeholder="اسم اللاعب"
                    className="h-9 min-w-[120px] flex-1 rounded-xl border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-white placeholder:text-slate-500 outline-none focus:border-emerald-500"
                  />

                  {/* Player Age */}
                  <input
                    type="number"
                    min="8"
                    max="65"
                    value={player.age}
                    onChange={(e) => updatePlayer(idx, 'age', e.target.value)}
                    placeholder="العمر"
                    className="h-9 w-20 shrink-0 rounded-xl border border-slate-700 bg-slate-900 px-2.5 text-xs font-bold text-white placeholder:text-slate-500 outline-none focus:border-emerald-500 text-center"
                  />

                  {/* Player Position */}
                  <select
                    value={player.position}
                    onChange={(e) => updatePlayer(idx, 'position', e.target.value)}
                    className="h-9 shrink-0 rounded-xl border border-slate-700 bg-slate-900 px-2.5 text-xs font-bold text-white outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {POSITIONS.map((pos) => (
                      <option key={pos.value} value={pos.value}>
                        {pos.icon} {pos.label}
                      </option>
                    ))}
                  </select>

                  {/* Delete Row Button */}
                  <button
                    type="button"
                    onClick={() => removePlayerRow(idx)}
                    className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="حذف هذا اللاعب"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addPlayerRow}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-700 hover:border-emerald-500 text-xs font-bold text-[#10B981] hover:bg-emerald-500/5 transition-all cursor-pointer"
            >
              <Plus className="size-4" />
              <span>إضافة لاعب آخر إلى التشكيلة</span>
            </button>
          </div>

          {/* 5. خانة إجبارية للإقرار وقبول "القانون الداخلي وشروط البطولة" */}
          <div className="rounded-3xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="accept-rules"
                checked={rulesAccepted}
                onChange={(e) => setRulesAccepted(e.target.checked)}
                className="mt-1 size-5 rounded-lg border-amber-400/50 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <label htmlFor="accept-rules" className="text-xs text-slate-200 leading-relaxed cursor-pointer font-bold select-none">
                أقر أنا مسير الفريق باطلاعي الكامل وموافقتي الصريحة على{' '}
                <button
                  type="button"
                  onClick={() => setRulesModalOpen(true)}
                  className="font-black text-amber-400 underline hover:text-amber-300 inline-block px-1"
                >
                  القانون الداخلي وشروط البطولة
                </button>
                {' '}والالتزام بالروح الرياضية وقرارات اللجنة المنظمة. <span className="text-rose-400">*</span>
              </label>
            </div>
          </div>

          {/* 6. زر إرسال طلب الانضمام */}
          <button
            type="submit"
            disabled={submitting}
            className="flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-[#10B981] hover:bg-emerald-600 active:scale-98 text-white font-black text-sm shadow-xl shadow-emerald-950/50 transition-all cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="size-5 animate-spin" />
                <span>جاري إرسال طلب الانضمام...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="size-5" />
                <span>إرسال طلب الانضمام إلى البطولة</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Rules Modal */}
      {rulesModalOpen && (
        <Modal
          open={rulesModalOpen}
          onClose={() => setRulesModalOpen(false)}
          title={`القانون الداخلي لبطولة ${tournament.name}`}
          size="md"
        >
          <div className="space-y-4 text-xs leading-relaxed text-slate-700 max-h-[60vh] overflow-y-auto p-1">
            {tournament.rules ? (
              <div className="whitespace-pre-line rounded-2xl bg-slate-50 p-4 border border-slate-200 font-medium">
                {tournament.rules}
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2">
                <p className="font-bold text-slate-800">البنود العامة للبطولة:</p>
                <ul className="list-disc list-inside space-y-1 text-slate-600">
                  <li>الالتزام التام بالروح الرياضية واحترام قرارات حكام المباريات.</li>
                  <li>الحضور قبل موعد المباراة بـ 15 دقيقة على الأقل في الملعب المحدد.</li>
                  <li>تعتبر التشكيلة نهائية فور تأكيدها ولا يسمح بمشاركة أي لاعب غير مسجل.</li>
                  <li>تخضع جميع النتائج لمصادقة اللجنة المنظمة للبطولة.</li>
                </ul>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                setRulesAccepted(true)
                setRulesModalOpen(false)
              }}
              className="flex h-10 w-full items-center justify-center rounded-xl bg-[#10B981] text-white font-bold text-xs hover:bg-emerald-600 transition-colors"
            >
              الموافقة على الشروط والمتابعة
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
