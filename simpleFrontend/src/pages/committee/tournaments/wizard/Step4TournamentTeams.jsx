import { useState } from 'react'
import {
  Check,
  CheckCircle2,
  Copy,
  FileText,
  KeyRound,
  Lock,
  Phone,
  Plus,
  Share2,
  Shield,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'
import { Badge, Button, Card, Empty, Field, Modal, Skeleton } from '../../../../components/dashboard/ui'
import api from '../../../../api/client'
import { useApi } from '../../../../hooks/useApi'
import { useToast } from '../../../../components/ui/Toast'
import { toastApiError } from '../../../../lib/errors'

export default function Step4TournamentTeams({
  tournament,
  refresh,
}) {
  const { toast } = useToast()
  const [busy, setBusy] = useState(null)

  // Direct registered teams modal
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [selectedTeams, setSelectedTeams] = useState([])

  // Free team modal
  const [freeModalOpen, setFreeModalOpen] = useState(false)
  const [freeTeamNames, setFreeTeamNames] = useState('')

  // WhatsApp share modal
  const [waModalOpen, setWaModalOpen] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  // Fetch teams registered in tournament
  const { data: teams, loading, refetch: refetchTeams } = useApi(
    () => api.get(`/committee/tournaments/${tournament.id}/teams`).then((r) => r.data.data),
    [tournament.id],
  )

  // Fetch all platform teams for direct selection
  const { data: allTeams, loading: loadingAllTeams } = useApi(
    () => api.get('/committee/teams').then((r) => r.data.data),
    [tournament.id],
    { enabled: addModalOpen },
  )

  const registeredTeams = teams || []
  const registeredIds = new Set(registeredTeams.map((t) => t.team_id || t.team?.id).filter(Boolean))
  const availableTeams = (allTeams || []).filter((t) => !registeredIds.has(t.id))

  const targetCount = Number(tournament.teams_count || 8)
  const count = registeredTeams.length
  const remainingSlots = Math.max(0, targetCount - count)
  const isTargetReached = count >= targetCount

  const publicUrl = `${window.location.origin}/tournaments/${tournament.slug || tournament.id}/join`

  // Method 1: Add existing teams directly
  const handleAddDirectTeams = async () => {
    if (!selectedTeams.length) return
    setBusy('add-direct')
    try {
      await api.post(`/committee/tournaments/${tournament.id}/teams`, {
        team_ids: selectedTeams,
      })
      toast.success(`تمت إضافة ${selectedTeams.length} فرق إلى البطولة بنجاح`)
      setSelectedTeams([])
      setAddModalOpen(false)
      refetchTeams()
      if (refresh) refresh()
    } catch (err) {
      toastApiError(err)
    } finally {
      setBusy(null)
    }
  }

  // Method 2: Add Free Teams (لجنة / فرق حرة)
  const handleAddFreeTeams = async () => {
    const names = freeTeamNames
      .split('\n')
      .map((n) => n.trim())
      .filter(Boolean)

    if (!names.length) {
      toast.error('يرجى كتابة اسم فريق واحد على الأقل')
      return
    }

    setBusy('add-free')
    try {
      await api.post(`/committee/tournaments/${tournament.id}/teams/free/bulk`, { names })
      toast.success(`تمت إضافة ${names.length} فريق حر بنجاح`)
      setFreeTeamNames('')
      setFreeModalOpen(false)
      refetchTeams()
      if (refresh) refresh()
    } catch (err) {
      toastApiError(err)
    } finally {
      setBusy(null)
    }
  }

  // Method 3: Share WhatsApp Invitation with Detailed Form Guidance
  const generateWhatsAppMessage = () => {
    return `🏆 *دعوة رسمية لتسجيل فريق في بطولة ${tournament.name}*\n\nتتشرف اللجنة المنظمة بدعوة فريقكم للمشاركة في منافسات البطولة عبر منصة "أجي نقصرو".\n\n🔗 *رابط التسجيل وتأكيد المشاركة:*\n${publicUrl}\n\n📋 *متطلبات التسجيل لمسير الفريق:*\n1. إدخال اسم الفريق ورفع شعاره الرسمي (Logo).\n2. إدخال بيانات المسير ورقم الهاتف المغربي 🇲🇦 (+212).\n3. تسجيل قائمة اللاعبين (الأسماء، الأعمار، والمراكز).\n4. الإقرار الصريح بالموافقة على القانون الداخلي للبطولة.\n5. الحصول التلقائي على رمز سري (PIN) لتعديل التشكيلة ومتابعة المباريات.\n\nسارعوا بحجز مقعدكم قبل اكتمال النصاب المحدد (${targetCount} فرق)!`
  }

  const handleShareWhatsApp = () => {
    const msg = generateWhatsAppMessage()
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(generateWhatsAppMessage())
    setCopiedLink(true)
    toast.success('تم نسخ رسالة الدعوة ورابط التسجيل بنجاح')
    setTimeout(() => setCopiedLink(false), 2500)
  }

  // Remove a team
  const handleRemoveTeam = async (teamId) => {
    if (!window.confirm('هل أنت متأكد من رغبتك في إزالة هذا الفريق من البطولة؟')) return
    setBusy(`remove-${teamId}`)
    try {
      await api.delete(`/committee/tournaments/${tournament.id}/teams/${teamId}`)
      toast.success('تمت إزالة الفريق من البطولة')
      refetchTeams()
      if (refresh) refresh()
    } catch (err) {
      toastApiError(err)
    } finally {
      setBusy(null)
    }
  }

  const toggleSelectTeam = (id) => {
    setSelectedTeams((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  return (
    <div className="space-y-6">
      {/* Three Registration Channels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Method 1: Direct platform teams */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-700 font-black text-sm mb-2">
              <Users className="size-4" />
              <span>1. الإضافة المباشرة للفرق</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              اختر من قائمة الفرق المسجلة مسبقاً في المنصة لإضافتها مباشرة إلى البطولة بنقرة واحدة.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#0F172A] hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus className="size-4" />
            <span>إضافة فرق المنصة</span>
          </button>
        </div>

        {/* Method 2: Free Team option */}
        <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-800 font-black text-sm mb-2">
              <Shield className="size-4" />
              <span>2. خيار "الفريق الحر" للجنة</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              أضف فرقاً حرة مخصصة تديرها اللجنة المنظمة مباشرة دون انتظار حساب مسير أو تأكيد مسبق.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFreeModalOpen(true)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#10B981] hover:bg-emerald-600 text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Plus className="size-4" />
            <span>إضافة فريق حر للجنة</span>
          </button>
        </div>

        {/* Method 3: WhatsApp Smart Registration Link */}
        <div className="rounded-3xl border border-teal-200 bg-teal-50/50 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-teal-800 font-black text-sm mb-2">
              <Share2 className="size-4" />
              <span>3. رابط الواتساب الذكي للفرق</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              رابط ذكي يتيح للمسير تسجيل الفريق والشعار واللاعبين والموافقة على القوانين مع رمز PIN آلي.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setWaModalOpen(true)}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[#1F7A4D] hover:bg-[#1A6841] text-white font-bold text-xs shadow-sm transition-all cursor-pointer"
          >
            <Share2 className="size-4" />
            <span>دعوة الفرق عبر واتساب</span>
          </button>
        </div>
      </div>

      {/* WhatsApp Smart Registration Explanatory Feature Card */}
      <div className="rounded-3xl border border-teal-100 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-2 font-black text-xs text-slate-900 mb-3">
          <Sparkles className="size-4 text-[#10B981]" />
          <span>ما الذي يتيحه رابط الواتساب الذكي لمسيري الفرق؟</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-xs">
            <span className="font-bold text-slate-800 block mb-1">بيانات الفريق والشعار</span>
            <p className="text-[11px] text-slate-500">اسم الفريق، المدينة، ورفع الشعار الرسمي.</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-xs">
            <span className="font-bold text-slate-800 block mb-1">المسير برقم مغربي 🇲🇦</span>
            <p className="text-[11px] text-slate-500">رقم الهاتف بتنسيق +212 لتلقي الإشعارات.</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-xs">
            <span className="font-bold text-slate-800 block mb-1">الموافقة على القوانين</span>
            <p className="text-[11px] text-slate-500">إقرار إلزامي ببنود اللائحة الداخلية للبطولة.</p>
          </div>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-3 text-xs">
            <span className="font-bold text-slate-800 block mb-1">رمز PIN للدخول الآلي</span>
            <p className="text-[11px] text-slate-500">رمز سري فوري للمسير لإدارة تشكيلته وجدوله.</p>
          </div>
        </div>
      </div>

      {/* Quota Progress & Registered Teams List */}
      <Card
        title="قائمة الفرق المشاركة في البطولة"
        subtitle={`تم تسجيل ${count} من أصل ${targetCount} فرق مطلوبة ${
          remainingSlots > 0 ? `(المتبقي: ${remainingSlots} أماكن)` : '(اكتمل النصاب المطلوب)'
        }`}
      >
        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-xs font-bold mb-1">
            <span className="text-slate-600">اكتمال نصاب الفرق</span>
            <span className={isTargetReached ? 'text-emerald-600 font-black' : 'text-slate-700'}>
              {count} / {targetCount} ({Math.round((count / Math.max(1, targetCount)) * 100)}%)
            </span>
          </div>
          <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                isTargetReached ? 'bg-[#10B981]' : 'bg-[#0F172A]'
              }`}
              style={{ width: `${Math.min(100, Math.round((count / Math.max(1, targetCount)) * 100))}%` }}
            />
          </div>
        </div>

        {/* Teams List */}
        {loading ? (
          <div className="space-y-2 py-4">
            <Skeleton className="h-14 rounded-2xl" />
            <Skeleton className="h-14 rounded-2xl" />
          </div>
        ) : registeredTeams.length === 0 ? (
          <Empty
            icon={Users}
            title="لم يتم تسجيل أي فريق بعد"
            description="استخدم إحدى الطرق الثلاث أعلاه لإشراك الفرق في البطولة وفتح باب المنافسة."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {registeredTeams.map((entry, idx) => {
              const team = entry.team || entry
              const isFree = team.is_free || entry.is_free
              return (
                <div key={entry.id || idx} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-slate-100 font-mono text-xs font-bold text-slate-500">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-slate-900 truncate">
                          {team.name || 'فريق مشارك'}
                        </p>
                        {isFree ? (
                          <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            فريق حر للجنة
                          </span>
                        ) : (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                            مسجل بالمنصة
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {team.city ? `المدينة: ${team.city}` : 'جاهز للمنافسة'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveTeam(entry.id || team.id)}
                    disabled={busy === `remove-${entry.id || team.id}`}
                    className="grid size-8 place-items-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="إزالة الفريق من البطولة"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Modal 1: Direct Platform Teams */}
      <Modal
        open={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title="إضافة فرق مسجلة من المنصة"
        subtitle="حدد الفرق التي ترغب في إضافتها مباشرة إلى البطولة"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
          {loadingAllTeams ? (
            <Skeleton className="h-32 rounded-2xl" />
          ) : availableTeams.length === 0 ? (
            <p className="py-6 text-center text-xs font-bold text-slate-500">
              لا توجد فرق إضافية متاحة للإشراك حالياً.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {availableTeams.map((t) => {
                const isSelected = selectedTeams.includes(t.id)
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleSelectTeam(t.id)}
                    className={`flex items-center gap-2.5 rounded-2xl p-2.5 text-start border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#10B981] bg-emerald-50/70 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`grid size-5 place-items-center rounded-md border text-xs ${
                        isSelected
                          ? 'border-[#10B981] bg-[#10B981] text-white'
                          : 'border-slate-300'
                      }`}
                    >
                      {isSelected && <Check className="size-3.5" />}
                    </span>
                    <span className="text-xs font-bold text-slate-900 truncate">{t.name}</span>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2 border-t pt-3">
          <Button variant="outline" onClick={() => setAddModalOpen(false)}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            disabled={!selectedTeams.length || busy === 'add-direct'}
            loading={busy === 'add-direct'}
            onClick={handleAddDirectTeams}
          >
            إضافة {selectedTeams.length} فرق مختارة
          </Button>
        </div>
      </Modal>

      {/* Modal 2: Free Team for Committee */}
      <Modal
        open={freeModalOpen}
        onClose={() => setFreeModalOpen(false)}
        title="إضافة فرق حرة (للجنة المنظمة)"
        subtitle="أدخل أسماء الفرق (اسم فريق واحد في كل سطر)"
      >
        <div className="space-y-3">
          <textarea
            rows={4}
            value={freeTeamNames}
            onChange={(e) => setFreeTeamNames(e.target.value)}
            placeholder="مثال:&#10;نجوم الحي الحسني&#10;شباب البرنوصي&#10;أمل سيدي عثمان"
            className="w-full rounded-2xl border border-slate-300 p-3 text-xs font-bold text-slate-800 placeholder:text-slate-400 outline-none focus:border-[#10B981]"
          />
          <p className="text-[11px] text-slate-500">
            تتم إضافة هذه الفرق كفرق حرة تديرها اللجنة المنظمة، ويمكن تعيين لاعبين وتشكيلات لها لاحقاً.
          </p>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2 border-t pt-3">
          <Button variant="outline" onClick={() => setFreeModalOpen(false)}>
            إلغاء
          </Button>
          <Button
            variant="primary"
            disabled={!freeTeamNames.trim() || busy === 'add-free'}
            loading={busy === 'add-free'}
            onClick={handleAddFreeTeams}
          >
            إضافة الفرق الحرة
          </Button>
        </div>
      </Modal>

      {/* Modal 3: WhatsApp Share Message with Internal Rules & PIN note */}
      <Modal
        open={waModalOpen}
        onClose={() => setWaModalOpen(false)}
        title="مشاركة دعوة التسجيل عبر واتساب"
        subtitle="رسالة مجهزة تتضمن متطلبات التسجيل والشعار والإقرار بالقوانين وتوليد رمز PIN"
      >
        <div className="space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-700 whitespace-pre-line leading-relaxed font-sans">
            {generateWhatsAppMessage()}
          </div>
          <p className="text-[11px] text-slate-500">
            تمنح هذه الدعوة مسير الفريق رابطاً آمناً لإدخال تفاصيل الفريق ورفع الشعار وتشكيلة اللاعبين، مع توليد رمز سري فوري.
          </p>
        </div>

        <div className="mt-5 flex items-center justify-between gap-2 border-t pt-3">
          <button
            type="button"
            onClick={handleCopyInviteLink}
            className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <Copy className="size-3.5" />
            <span>{copiedLink ? 'تم نسخ النص!' : 'نسخ نص الدعوة'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 px-4 py-2 text-xs font-black text-white transition-all cursor-pointer shadow-sm"
          >
            <Share2 className="size-4" />
            <span>فتح واتساب الآن</span>
          </button>
        </div>
      </Modal>
    </div>
  )
}
