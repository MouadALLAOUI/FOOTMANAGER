import React, { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  LogIn,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Share2,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  User,
  UserCheck,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react'
import api from '../../../api/client'
import { useAuth } from '../../../context/AuthContext'
import { useTeam } from '../../../context/TeamContext'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'
import TeamLogo from '../../../components/profile/TeamLogo'
import { logoThumb } from '../../../lib/thumb'

export default function MatchInvitePage() {
  const { token } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { toast } = useToast()
  const { user } = useAuth()
  const { currentTeam } = useTeam()

  const [match, setMatch] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  // Challenge application mode: 'guest' | 'login'
  const [activeTab, setActiveTab] = useState('guest')

  // Guest form
  const [guestForm, setGuestForm] = useState({
    guest_team_name: '',
    guest_contact_name: '',
    guest_phone: '',
    notes: '',
  })

  // Manager form
  const [managerNotes, setManagerNotes] = useState('')

  const [submitting, setSubmitting] = useState(false)
  const [appliedSuccess, setAppliedSuccess] = useState(false)
  const [appliedMessage, setAppliedMessage] = useState('')

  const isManager = user?.role === 'manager'
  const userTeam = currentTeam || user?.team

  useEffect(() => {
    fetchMatchDetails()
  }, [token])

  // Arrived at the invite link after login: the pending redirect is consumed.
  useEffect(() => {
    try {
      localStorage.removeItem('match_invite_redirect')
    } catch {}
    sessionStorage.removeItem('match_invite_redirect')
  }, [])

  const fetchMatchDetails = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get(`/match-invitations/${token}`)
      setMatch(res.data.match || res.data.match_request)
    } catch (e) {
      setError(e?.response?.data?.message || 'تعذر تحميل بيانات التحدي')
    } finally {
      setLoading(false)
    }
  }

  const handleGuestSubmit = async (e) => {
    e.preventDefault()
    if (!guestForm.guest_team_name.trim() || !guestForm.guest_contact_name.trim() || !guestForm.guest_phone.trim()) {
      toast.error('يرجى ملء جميع الحقول المطلوبة')
      return
    }

    setSubmitting(true)
    try {
      const res = await api.post(`/match-invitations/${token}/apply-guest`, guestForm)
      setAppliedMessage(res.data?.message || 'تم إرسال طلب التحدي بنجاح!')
      toast.success('تم إرسال طلب التحدي بنجاح!')
      setAppliedSuccess(true)
    } catch (err) {
      toastApiError(err, t)
    } finally {
      setSubmitting(false)
    }
  }

  const handleManagerSubmit = async (e) => {
    e.preventDefault()
    if (!userTeam) {
      toast.error('يجب إنشاء أو اختيار فريق لإرسال التحدي')
      return
    }

    setSubmitting(true)
    try {
      const res = await api.post(`/manager/match-invitations/${token}/apply-team`, {
        notes: managerNotes || undefined,
      })
      setAppliedMessage(res.data?.message || 'تم إرسال طلب التحدي بنجاح!')
      toast.success('تم إرسال طلب التحدي بفريقك بنجاح!')
      setAppliedSuccess(true)
    } catch (err) {
      toastApiError(err, t)
    } finally {
      setSubmitting(false)
    }
  }

  // localStorage (not sessionStorage) so the link survives the tab closing
  // while the new manager waits for the admin approval before logging in.
  const storeInviteRedirect = () => {
    try {
      localStorage.setItem('match_invite_redirect', `/matches/invite/${token}`)
    } catch {}
  }

  const handleLoginRedirect = () => {
    storeInviteRedirect()
    navigate('/login')
  }

  const inviteUrl = typeof window !== 'undefined' ? window.location.href : ''

  const handleCopyLink = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(inviteUrl)
      setCopied(true)
      toast.success('تم نسخ رابط التحدي بنجاح!')
      setTimeout(() => setCopied(false), 2500)
    }
  }

  const handleWhatsAppShare = () => {
    const fieldName = match?.stadium?.name || match?.custom_terrain_name || 'الملعب'
    const matchDate = match?.match_datetime
      ? new Date(match.match_datetime).toLocaleString('ar-MA', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : ''
    const msg = `⚽ *تحدي مباراة ودية!*\nفريقنا [${match?.host_team?.name || 'فريقنا'}] يبحث عن منافس لمباراة كرة قدم!\n📍 *الملعب:* ${fieldName}\n📅 *الموعد:* ${matchDate}\n⚔️ *هل تقبل التحدي؟ أرسل طلب التحدي هنا:*\n${inviteUrl}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 pt-28 sm:pt-36 pb-16 px-4 text-center" dir="rtl">
        <div className="mx-auto max-w-xl animate-pulse space-y-6 rounded-3xl border border-white/10 bg-slate-900/60 p-8 backdrop-blur-xl">
          <div className="mx-auto size-24 rounded-full bg-white/10" />
          <div className="h-7 w-3/4 mx-auto rounded-xl bg-white/10" />
          <div className="h-4 w-1/2 mx-auto rounded-lg bg-white/10" />
          <div className="h-32 rounded-2xl bg-white/5" />
          <div className="h-12 rounded-2xl bg-white/10" />
        </div>
      </div>
    )
  }

  if (error || !match) {
    return (
      <div className="min-h-screen bg-slate-950 pt-28 sm:pt-36 pb-16 px-4 flex items-center justify-center" dir="rtl">
        <div className="mx-auto max-w-md w-full rounded-3xl border border-rose-500/20 bg-slate-900/95 p-8 text-center shadow-2xl backdrop-blur-xl">
          <div className="mx-auto grid size-20 place-items-center rounded-3xl bg-rose-500/10 text-rose-400 ring-1 ring-rose-500/20">
            <Swords className="size-10" />
          </div>
          <h2 className="mt-5 text-2xl font-black text-white">رابط التحدي غير متاح</h2>
          <p className="mt-2 text-sm text-slate-400 leading-relaxed">
            {error || 'قد تكون هذه المباراة ملغاة أو أن الرابط منتهي الصلاحية.'}
          </p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              to="/matches"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-sm font-black text-white shadow-lg shadow-emerald-950/40 transition hover:bg-emerald-500"
            >
              <Swords className="size-4" />
              تصفح المباريات المفتوحة
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-white/5 px-6 py-2.5 text-xs font-bold text-slate-400 hover:text-white"
            >
              العودة للرئيسية
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isClosed = match.status !== 'open'
  const datetime = match.match_datetime ? new Date(match.match_datetime) : null
  const myProposalPending = match.my_proposal?.status === 'pending'

  // Check if current user is the host manager of this match
  const isHostManager = Boolean(
    user && match.host_team && (
      (match.host_team.manager_id && user.id === match.host_team.manager_id) ||
      (userTeam && userTeam.id === match.host_team.id)
    )
  )

  return (
    <div className="min-h-screen bg-slate-950 pt-28 sm:pt-36 pb-16 px-4 text-white relative overflow-hidden" dir="rtl">
      {/* Dynamic ambient stadium lights */}
      <div className="pointer-events-none absolute -top-40 start-1/2 -translate-x-1/2 size-[650px] rounded-full bg-emerald-500/15 blur-[130px]" />
      <div className="pointer-events-none absolute top-1/3 -end-40 size-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="pointer-events-none absolute bottom-0 -start-40 size-[450px] rounded-full bg-emerald-700/10 blur-[110px]" />

      <div className="relative mx-auto max-w-2xl space-y-6">
        {/* Top Header Badge */}
        <div className="text-center space-y-2">
          {isClosed ? (
            <span className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-4 py-1.5 text-xs font-black text-amber-400 backdrop-blur-md">
              <CheckCircle2 className="size-4" />
              تم تأكيد المنافس واكتمال التحدي
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/70 px-4 py-1.5 text-xs font-black text-emerald-400 backdrop-blur-md shadow-lg shadow-emerald-950/40">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <Swords className="size-4 text-emerald-400" />
              تحدي مباراة ودية مفتوح الآن
            </span>
          )}

          <h1 className="text-2xl font-black text-white sm:text-4xl tracking-tight leading-tight">
            من يتحدى فريق <span className="text-emerald-400 underline decoration-emerald-500/40 decoration-4 underline-offset-8">{match.host_team?.name}</span>؟
          </h1>
          <p className="text-xs text-slate-300 sm:text-sm max-w-lg mx-auto leading-relaxed">
            {isClosed
              ? 'تم قبول أحد طلبات التحدي لهذه المباراة بنجاح!'
              : 'تم نشر هذا التحدي للبحث عن فريق منافس لخوض مباراة ودية حماسية.'}
          </p>
        </div>

        {/* Matchup Match Preview Card */}
        <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-900/80 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
          {/* Teams Matchup Header */}
          <div className="relative p-6 sm:p-8 bg-gradient-to-b from-white/[0.04] to-transparent border-b border-white/10">
            <div className="flex items-center justify-around gap-2 sm:gap-6">
              {/* Host Team Side */}
              <div className="flex flex-1 flex-col items-center text-center">
                <div className="relative">
                  <div className="grid size-20 sm:size-24 place-items-center rounded-3xl bg-emerald-950/60 p-2 shadow-2xl ring-2 ring-emerald-500/40 transition-transform duration-300 hover:scale-105">
                    <TeamLogo
                      team={match.host_team}
                      src={logoThumb(match.host_team) || match.host_team?.logo_url || match.host_team?.logo}
                      className="size-full rounded-2xl"
                      fontSize="text-2xl sm:text-3xl font-black"
                      bg="bg-transparent"
                    />
                  </div>
                  <span className="absolute -bottom-2.5 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-black text-slate-950 shadow">
                    صاحب التحدي
                  </span>
                </div>
                <p className="mt-4 text-sm font-black text-white sm:text-lg line-clamp-1">
                  {match.host_team?.name}
                </p>
                <div className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-slate-400">
                  <MapPin className="size-3 text-emerald-400" />
                  <span>{match.host_team?.city || 'المغرب'}</span>
                </div>
                {match.host_manager?.name && (
                  <p className="mt-1 text-[10px] font-semibold text-emerald-400/90">
                    الكابتن: {match.host_manager.name}
                  </p>
                )}
              </div>

              {/* VS Center Element */}
              <div className="flex flex-col items-center gap-1 shrink-0 px-2">
                <div className="relative grid size-12 sm:size-14 place-items-center rounded-2xl border border-white/15 bg-gradient-to-br from-emerald-500/20 via-slate-800 to-cyan-500/20 text-emerald-400 shadow-xl shadow-black/40">
                  <Swords className="size-6 sm:size-7" />
                </div>
                <span className="text-[11px] font-black text-slate-400 tracking-wider">ضد</span>
              </div>

              {/* Opponent Slot */}
              <div className="flex flex-1 flex-col items-center text-center">
                {isClosed ? (
                  <>
                    <div className="grid size-20 sm:size-24 place-items-center rounded-3xl border-2 border-emerald-500/40 bg-emerald-950/60 p-2 shadow-2xl">
                      {match.opponent_team ? (
                        <TeamLogo
                          team={match.opponent_team}
                          src={logoThumb(match.opponent_team) || match.opponent_team?.logo_url || match.opponent_team?.logo}
                          className="size-full rounded-2xl"
                          bg="bg-transparent"
                        />
                      ) : (
                        <Shield className="size-10 text-emerald-400" />
                      )}
                    </div>
                    <span className="mt-2 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                      تم تأكيد المنافس
                    </span>
                    <p className="mt-1 text-sm font-black text-white sm:text-lg line-clamp-1">
                      {match.is_guest ? match.guest_team_name : match.opponent_team?.name || 'المنافس'}
                    </p>
                  </>
                ) : (
                  <>
                    <div className="group relative grid size-20 sm:size-24 place-items-center rounded-3xl border-2 border-dashed border-emerald-400/50 bg-emerald-500/5 text-emerald-400 shadow-inner transition-all duration-300 hover:border-emerald-400 hover:bg-emerald-500/10">
                      <UserPlus className="size-9 transition-transform group-hover:scale-110" />
                      <span className="absolute -top-1.5 -end-1.5 flex size-3">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex size-3 rounded-full bg-emerald-500" />
                      </span>
                    </div>
                    <span className="mt-2 rounded-full bg-slate-800/80 px-2.5 py-0.5 text-[10px] font-bold text-slate-300">
                      بانتظار المنافس
                    </span>
                    <p className="mt-1 text-sm font-black text-emerald-300 sm:text-lg">فريقك هنا؟</p>
                    <p className="text-[10px] text-slate-400 font-semibold">اقبل التحدي بالأسفل</p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Match Details Pill Badges */}
          <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-6 bg-slate-900/60">
            {/* Date */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3 transition hover:border-white/10 hover:bg-white/[0.05]">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400">
                <CalendarDays className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase">التاريخ</p>
                <p className="text-xs font-black text-white truncate sm:text-sm">
                  {datetime
                    ? datetime.toLocaleDateString('ar-MA', { weekday: 'long', day: 'numeric', month: 'long' })
                    : 'غير محدد'}
                </p>
              </div>
            </div>

            {/* Time */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3 transition hover:border-white/10 hover:bg-white/[0.05]">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-cyan-500/10 text-cyan-400">
                <Clock className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase">وقت الانطلاق</p>
                <p className="text-xs font-black text-white truncate sm:text-sm">
                  {datetime
                    ? datetime.toLocaleTimeString('ar-MA', { hour: '2-digit', minute: '2-digit' })
                    : 'غير محدد'}
                </p>
              </div>
            </div>

            {/* Stadium */}
            <div className="col-span-2 sm:col-span-1 flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.03] p-3 transition hover:border-white/10 hover:bg-white/[0.05]">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-500/10 text-amber-400">
                <MapPin className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase">الملعب</p>
                <p className="text-xs font-black text-white truncate sm:text-sm">
                  {match.stadium?.name || match.custom_terrain_name || 'ملعب محدد'}
                </p>
                {match.stadium?.city && (
                  <p className="text-[10px] font-semibold text-slate-400 truncate">{match.stadium.city}</p>
                )}
              </div>
            </div>
          </div>

          {/* Additional Badges (Format, Free Players, Price) */}
          {(match.player_format || match.needs_players || match.price_per_player) && (
            <div className="flex flex-wrap items-center gap-2 px-6 pb-4">
              {match.player_format && (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
                  <Trophy className="size-3.5 text-emerald-400" />
                  صيغة اللعب: {match.player_format} ضد {match.player_format}
                </span>
              )}

              {match.needs_players && (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-300">
                  <Users className="size-3.5 text-emerald-400" />
                  يحتاج لاعبين أحرار {match.players_needed ? `(${match.players_needed} لاعبين)` : ''}
                </span>
              )}

              {match.price_per_player && (
                <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-300">
                  المساهمة: {match.price_per_player} د.م / لاعب
                </span>
              )}
            </div>
          )}

          {/* Notes Section */}
          {match.notes && (
            <div className="px-6 pb-6">
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-950/20 p-4 text-xs text-slate-200">
                <p className="font-extrabold text-emerald-400 flex items-center gap-1.5 mb-1.5">
                  <MessageCircle className="size-4" />
                  رسالة من منظم المباراة:
                </p>
                <p className="leading-relaxed text-slate-300 bg-black/20 p-2.5 rounded-xl border border-white/5">
                  {match.notes}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action / Response Section */}
        {isClosed ? (
          <div className="rounded-3xl border border-amber-500/20 bg-slate-900/90 p-8 text-center backdrop-blur-xl shadow-2xl">
            <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/30">
              <CheckCircle2 className="size-8" />
            </div>
            <h3 className="mt-4 text-xl font-black text-white">تم تأكيد هذه المباراة بالفعل</h3>
            <p className="mt-2 text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              تم قبول أحد التحديات واكتمال طرفي المباراة. يمكنك تصفح باقي المباريات المفتوحة أو إنشاء تحدٍ خاص بفريقك!
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/matches"
                className="rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-black text-white shadow-lg shadow-emerald-950/50 hover:bg-emerald-500"
              >
                تصفح باقي المباريات المفتوحة
              </Link>
              <Link
                to="/dashboard/matches"
                className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-xs font-bold text-slate-300 hover:text-white"
              >
                إنشاء مباراة جديدة
              </Link>
            </div>
          </div>
        ) : appliedSuccess ? (
          /* Submission Success State */
          <div className="rounded-3xl border border-emerald-500/30 bg-emerald-950/40 p-8 text-center backdrop-blur-xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="mx-auto grid size-20 place-items-center rounded-3xl bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40">
              <CheckCircle2 className="size-10" />
            </div>
            <h3 className="mt-5 text-2xl font-black text-white">تم إرسال طلب التحدي بنجاح! 🎉</h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-lg mx-auto">
              {appliedMessage || 'سيتوصل كابتن الفريق المنظم بإشعار فوري يتضمن بيانات فريقك. في حال قبول التحدي، سيتم التواصل معك مباشرة لتأكيد التفاصيل.'}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/matches"
                className="rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-black text-white hover:bg-emerald-500 shadow-lg shadow-emerald-950/40"
              >
                تصفح مباريات وتحديات أخرى
              </Link>
              <Link
                to="/"
                className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-xs font-bold text-white hover:bg-white/10"
              >
                العودة للرئيسية
              </Link>
            </div>
          </div>
        ) : myProposalPending ? (
          /* Already applied: waiting for the organizer's confirmation */
          <div className="rounded-3xl border border-sky-500/30 bg-slate-900/90 p-8 text-center backdrop-blur-xl shadow-2xl">
            <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/30">
              <Clock className="size-8" />
            </div>
            <h3 className="mt-4 text-xl font-black text-white">طلبك بانتظار تأكيد المنظم</h3>
            <p className="mt-2 text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              تم استلام طلب تحدي فريقك بنجاح. الطلب الآن بانتظار تأكيد منظم المباراة، وسيتم إشعارك فور قبول الطلب أو رفضه.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link
                to="/matches"
                className="rounded-2xl bg-emerald-600 px-6 py-3 text-xs font-black text-white shadow-lg shadow-emerald-950/50 hover:bg-emerald-500"
              >
                تصفح مباريات أخرى
              </Link>
              <Link
                to="/"
                className="rounded-2xl border border-white/10 bg-white/5 px-6 py-3 text-xs font-bold text-slate-300 hover:text-white"
              >
                العودة للرئيسية
              </Link>
            </div>
          </div>
        ) : isHostManager ? (
          /* Scenario: Host Organizer viewing their own link */
          <div className="rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-slate-900/95 to-emerald-950/40 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="grid size-12 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-400">
                <Sparkles className="size-6" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase text-emerald-400">لوحة المنظم</span>
                <h3 className="text-lg font-black text-white">أنت منظم هذا التحدي</h3>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              شارك هذا الرابط في مجموعات واتساب أو فيسبوك لاستقبال طلبات التحدي من الفرق الأخرى. ستظهر لك جميع الطلبات المستلمة في لوحة تحكمك لاختيار المنافس الأنسب.
            </p>

            <div className="mt-5 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/40 p-2">
              <input
                type="text"
                readOnly
                value={inviteUrl}
                className="min-w-0 flex-1 bg-transparent px-2.5 text-xs font-mono text-emerald-300 outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold text-white hover:bg-white/20"
              >
                {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
                {copied ? 'تم النسخ' : 'نسخ'}
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={handleWhatsAppShare}
                className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 px-4 text-xs font-black text-white shadow-lg shadow-emerald-950/50 hover:bg-emerald-500 transition"
              >
                <MessageCircle className="size-4" />
                مشاركة التحدي على واتساب
              </button>

              <Link
                to="/dashboard/matches"
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 py-3.5 px-4 text-xs font-bold text-white hover:bg-white/15 transition"
              >
                <ExternalLink className="size-4" />
                إدارة طلبات التحدي ({match.pending_proposals_count || 0})
              </Link>
            </div>
          </div>
        ) : isManager && userTeam ? (
          /* Scenario: Registered Approved Manager Challenging */
          <div className="rounded-3xl border border-emerald-500/30 bg-slate-900/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <TeamLogo
                  team={userTeam}
                  src={logoThumb(userTeam) || userTeam?.logo_url || userTeam?.logo}
                  className="size-12 rounded-2xl shadow ring-1 ring-emerald-500/30"
                  bg="bg-transparent"
                />
                <div>
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300">
                    مدير فريق رسمي
                  </span>
                  <p className="text-base font-black text-white">{userTeam.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('guest')}
                className="text-xs font-bold text-slate-400 hover:text-emerald-300 underline underline-offset-4"
              >
                أو اللعب كفريق ضيف
              </button>
            </div>

            <form onSubmit={handleManagerSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  رسالة لمدير الفريق المنظم (اختياري)
                </label>
                <textarea
                  rows={2}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 p-3.5 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition"
                  placeholder="مثال: جاهزون للمباراة بتشكيلتنا الأساسية، نراكم في الموعد المكتوب!"
                  value={managerNotes}
                  onChange={(e) => setManagerNotes(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 py-3.5 px-4 text-sm font-black text-slate-950 shadow-lg shadow-emerald-950/60 transition hover:from-emerald-400 hover:to-green-500 disabled:opacity-50 active:scale-[0.99]"
              >
                <Swords className="size-4" />
                {submitting ? 'جاري إرسال التحدي...' : 'إرسال طلب التحدي بفريقي'}
              </button>
            </form>
          </div>
        ) : (
          /* Visitor / Guest Flow (High Conversion) */
          <div className="rounded-3xl border border-white/10 bg-slate-900/90 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
            {/* Segmented Control Tabs */}
            <div className="flex gap-2 rounded-2xl bg-white/5 p-1.5">
              <button
                type="button"
                onClick={() => setActiveTab('guest')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black transition-all ${
                  activeTab === 'guest'
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-slate-950 shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="size-3.5" />
                طلب سريع كضيف (بدون تسجيل)
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black transition-all ${
                  activeTab === 'login'
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-slate-950 shadow-lg'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Trophy className="size-3.5" />
                لدي فريق مسجل بالمنصة
              </button>
            </div>

            {activeTab === 'guest' ? (
              <form onSubmit={handleGuestSubmit} className="mt-6 space-y-4">
                {/* Team / Group Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    اسم فريقك أو مجموعتك <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <Shield className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="مثال: شباب النهضة / أصدقاء أنس"
                      className="w-full rounded-2xl border border-slate-700 bg-slate-800/90 ps-10 pe-4 py-3 text-xs text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 transition"
                      value={guestForm.guest_team_name}
                      onChange={(e) => setGuestForm({ ...guestForm, guest_team_name: e.target.value })}
                    />
                  </div>
                </div>

                {/* Captain Name and Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5">
                      اسم المسؤول / الكابتن <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <User className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        required
                        placeholder="اسمك الكامل"
                        className="w-full rounded-2xl border border-slate-700 bg-slate-800/90 ps-10 pe-4 py-3 text-xs text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 transition"
                        value={guestForm.guest_contact_name}
                        onChange={(e) => setGuestForm({ ...guestForm, guest_contact_name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-200 mb-1.5">
                      رقم الهاتف أو واتساب <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="tel"
                        required
                        placeholder="06XXXXXXXX"
                        dir="ltr"
                        className="w-full rounded-2xl border border-slate-700 bg-slate-800/90 ps-10 pe-4 py-3 text-xs text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 text-start transition"
                        value={guestForm.guest_phone}
                        onChange={(e) => setGuestForm({ ...guestForm, guest_phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                {/* Optional Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1.5">
                    ملاحظات أو استفسار إضافي (اختياري)
                  </label>
                  <div className="relative">
                    <textarea
                      rows={2}
                      placeholder="مثال: لون قمصاننا أزرق، جاهزون للمباراة في التوقيت المحدد..."
                      className="w-full rounded-2xl border border-slate-700 bg-slate-800/90 p-3.5 text-xs text-white placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/20 transition"
                      value={guestForm.notes}
                      onChange={(e) => setGuestForm({ ...guestForm, notes: e.target.value })}
                    />
                  </div>
                </div>

                {/* Trust Card */}
                <div className="flex items-start gap-2.5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-[11px] text-emerald-200 leading-relaxed">
                  <Zap className="size-4 shrink-0 text-emerald-400 mt-0.5" />
                  <p>
                    <span className="font-extrabold text-white">سريع ومباشر:</span> لا يلزمك إنشاء حساب. سيتوصل منظم المباراة برقمك وسيتواصل معك مباشرة عبر واتساب أو الهاتف لتأكيد اللقاء.
                  </p>
                </div>

                {/* Submit CTA */}
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 py-3.5 px-4 text-sm font-black text-slate-950 shadow-xl shadow-emerald-950/60 transition hover:from-emerald-400 hover:to-green-500 disabled:opacity-50 active:scale-[0.99]"
                >
                  <Send className="size-4" />
                  {submitting ? 'جاري إرسال الطلب...' : 'إرسال طلب التحدي كضيف ⚽'}
                </button>
              </form>
            ) : (
              /* Registered Manager Login Prompt */
              <div className="mt-6 text-center space-y-4 py-4">
                <div className="mx-auto grid size-16 place-items-center rounded-3xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                  <Trophy className="size-8" />
                </div>
                <h4 className="text-base font-black text-white">هل تدير فريقاً مسجلاً في أجي نقفصرو؟</h4>
                <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                  سجل دخولك بحساب مدير فريقك لتقديم التحدي رسمياً، وتسجيل نتائج المباراة ونقاط الفوز في ترتيب الفرق والإحصائيات العامة للمنصة!
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                  <button
                    type="button"
                    onClick={handleLoginRedirect}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3.5 text-xs font-black text-white hover:bg-emerald-500 shadow-lg shadow-emerald-950/50 transition"
                  >
                    <LogIn className="size-4" />
                    تسجيل الدخول والعودة للتحدي
                  </button>
                  <Link
                    to="/register"
                    onClick={storeInviteRedirect}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-3.5 text-xs font-bold text-white hover:bg-white/10 transition"
                  >
                    إنشاء حساب فريق جديد
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Share Challenge with Friends Section */}
        <div className="rounded-3xl border border-white/5 bg-slate-900/60 p-5 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-start">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-400 shrink-0">
              <Share2 className="size-5" />
            </div>
            <div>
              <p className="text-xs font-extrabold text-white">تعرف فريقاً أو أصدقاء مستعدين للمباراة؟</p>
              <p className="text-[11px] text-slate-400">شارك هذا التحدي معهم على واتساب وشاهد من يقبل التحدي!</p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleWhatsAppShare}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600/90 px-4 py-2 text-xs font-black text-white hover:bg-emerald-500 transition"
            >
              <MessageCircle className="size-3.5" />
              مشاركة على واتساب
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 hover:text-white transition"
              title="نسخ الرابط"
            >
              {copied ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5" />}
              {copied ? 'تم النسخ' : 'نسخ الرابط'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
