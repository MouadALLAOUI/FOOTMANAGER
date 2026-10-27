import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Camera,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Phone,
  Shield,
  Sparkles,
  User,
  Zap,
} from 'lucide-react'
import api from '../../../api/client'
import { useAuth } from '../../../context/AuthContext'
import { useToast } from '../../../components/ui/Toast'
import SEO from '../../../components/system/SEO'

const POSITIONS = [
  { id: 'goalkeeper', label: 'حارس مرمى', icon: '🧤', desc: 'حماية المرمى ورد الكرات' },
  { id: 'defender', label: 'مدافع', icon: '🛡️', desc: 'إيقاف الهجمات والتغطية' },
  { id: 'midfielder', label: 'وسط ميدان', icon: '⚙️', desc: 'صناعة اللعب والربط' },
  { id: 'forward', label: 'مهاجم', icon: '⚽', desc: 'تسجيل الأهداف والإنهاء' },
]

export default function PlayerRegisterPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { persist } = useAuth()
  const fileInputRef = useRef(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [age, setAge] = useState('')
  const [position, setPosition] = useState('midfielder')
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [customPin, setCustomPin] = useState('')
  const [showPinInput, setShowPinInput] = useState(false)

  // Handle Photo Selection
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة يجب ألا يتجاوز 5 ميجابايت')
      return
    }
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = () => setAvatarPreview(reader.result)
    reader.readAsDataURL(file)
  }

  // Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('يرجى إدخال اسم اللاعب بالكامل')
      return
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '')
    if (!cleanPhone) {
      toast.error('يرجى إدخال رقم الهاتف للتواصل')
      return
    }

    const ageNum = parseInt(age, 10)
    const currentYear = new Date().getFullYear()
    const birthYear = ageNum && ageNum >= 10 && ageNum <= 65 ? currentYear - ageNum : null

    // Generate or use chosen password / PIN
    const generatedPassword = customPin.trim() ? customPin.trim() : `Player_${Math.random().toString(36).slice(2, 10)}!9`

    setLoading(true)

    try {
      // 1. Register Player via API
      const payload = {
        name: name.trim(),
        phone: cleanPhone,
        position,
        is_whatsapp: true,
        password: generatedPassword,
        birth_year: birthYear,
      }

      const res = await api.post('/register-player', payload)
      const data = res.data

      // 2. Upload Avatar if selected
      if (avatarFile && data?.token) {
        try {
          const avatarForm = new FormData()
          avatarForm.append('avatar', avatarFile)
          await api.post('/me/avatar', avatarForm, {
            headers: {
              Authorization: `Bearer ${data.token}`,
              'Content-Type': 'multipart/form-data',
            },
          })
        } catch (avatarErr) {
          console.warn('Avatar upload deferred:', avatarErr)
        }
      }

      // 3. Save Authentication Session
      if (data?.token && data?.user && persist) {
        persist(data.token, data.user)
      } else if (data?.token) {
        localStorage.setItem('auth_token', data.token)
        if (data.user) {
          localStorage.setItem('auth_user', JSON.stringify(data.user))
        }
      }

      toast.success('تم تسجيل ملفك كلاعب بنجاح! مرحباً بك في أجي نقصرو.')
      navigate('/player')
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.errors?.phone?.[0] ||
        err?.response?.data?.errors?.name?.[0] ||
        'حدث خطأ أثناء حفظ الملف الشخصي، يرجى التحقق من صحة البيانات'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100 py-8 px-4 sm:px-6 flex flex-col justify-center items-center">
      <SEO
        title="سجّل كلاعب | أجي نقصرو"
        description="انضم كلاعب إلى منصة أجي نقصرو برقم هاتفك فقط، وأنشئ ملفك الرياضي للمشاركة في مباريات القرب والبطولات المحلية."
      />

      {/* Background Ambient Glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute -top-32 -start-32 size-96 rounded-full bg-[#10B981]/15 blur-3xl" />
        <div className="absolute bottom-0 -end-32 size-96 rounded-full bg-emerald-600/10 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Back Link */}
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white transition-colors mb-4"
        >
          <ChevronRight className="size-4" />
          <span>العودة إلى الصفحة الرئيسية</span>
        </Link>

        {/* Header Card */}
        <div className="rounded-3xl border border-emerald-500/30 bg-[#142320]/90 p-6 sm:p-7 shadow-2xl backdrop-blur-md">
          {/* Header Title with Badge */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-[#10B981]/20 border border-[#10B981]/40 px-3.5 py-1 text-xs font-black text-[#10B981] mb-3">
              <Sparkles className="size-3.5" />
              <span>تسجيل اللاعبين الفوري</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              أنشئ ملفك الرياضي كلاعب
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-slate-300 font-medium">
              سجّل الآن برقم هاتفك لتتلقى دعوات المباريات والبطولات المحلية.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* 1. الصورة الشخصية (اختياري / رفع سريع) */}
            <div className="flex flex-col items-center justify-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
                id="player-avatar-input"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="group relative size-24 cursor-pointer rounded-full border-2 border-dashed border-[#10B981]/60 bg-[#0F172A] p-1 shadow-lg transition-transform hover:scale-105 active:scale-95"
                title="اضغط لاختيار صورتك الشخصية"
              >
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="معاينة الصورة"
                    className="size-full rounded-full object-cover"
                  />
                ) : (
                  <div className="flex size-full flex-col items-center justify-center rounded-full bg-slate-800/80 text-slate-400 transition-colors group-hover:bg-slate-700">
                    <Camera className="size-7 text-[#10B981]" />
                    <span className="mt-1 text-[9px] font-bold text-slate-300">صورتك</span>
                  </div>
                )}
                <span className="absolute bottom-0 end-0 grid size-7 place-items-center rounded-full bg-[#10B981] text-white shadow-md">
                  <Camera className="size-3.5" />
                </span>
              </div>
              <span className="mt-1.5 text-[11px] font-bold text-slate-400">
                الصورة الشخصية (اختيارية)
              </span>
            </div>

            {/* 2. اسم اللاعب */}
            <div className="space-y-1.5">
              <label htmlFor="player-name" className="block text-xs font-black text-slate-200">
                اسم اللاعب <span className="text-rose-400">*</span>
              </label>
              <div className="relative flex items-center">
                <input
                  id="player-name"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: يوسف الإدريسي"
                  className="h-12 w-full rounded-2xl border border-slate-700 bg-[#0F172A] ps-11 pe-4 text-sm font-bold text-white placeholder:text-slate-500 outline-none transition-all focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                />
                <User className="absolute start-3.5 size-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* 3. رقم الهاتف مع مفتاح المغرب 🇲🇦 +212 */}
            <div className="space-y-1.5">
              <label htmlFor="player-phone" className="block text-xs font-black text-slate-200">
                رقم الهاتف (واتساب) <span className="text-rose-400">*</span>
              </label>
              <div className="relative flex items-center" dir="ltr">
                <div className="flex items-center gap-1.5 border-e border-slate-700 bg-slate-800/90 px-3 h-12 rounded-s-2xl text-xs font-bold text-slate-200 select-none">
                  <span className="text-base" role="img" aria-label="علم المغرب">🇲🇦</span>
                  <span>+212</span>
                </div>
                <input
                  id="player-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="06 12 34 56 78"
                  className="h-12 flex-1 rounded-e-2xl border border-s-0 border-slate-700 bg-[#0F172A] px-4 text-sm font-bold text-white placeholder:text-slate-500 outline-none transition-all focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                سنرسل لك دعوات المباريات والبطولات عبر هذا الرقم.
              </p>
            </div>

            {/* 4. العمر */}
            <div className="space-y-1.5">
              <label htmlFor="player-age" className="block text-xs font-black text-slate-200">
                العمر (بالسنوات)
              </label>
              <input
                id="player-age"
                type="number"
                min="10"
                max="65"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="مثال: 24"
                className="h-12 w-full rounded-2xl border border-slate-700 bg-[#0F172A] px-4 text-sm font-bold text-white placeholder:text-slate-500 outline-none transition-all focus:border-[#10B981] focus:ring-2 focus:ring-[#10B981]/20"
              />
            </div>

            {/* 5. المركز في الملعب */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-slate-200">
                المركز المفضل في الملعب <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                {POSITIONS.map((pos) => {
                  const isSelected = position === pos.id
                  return (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => setPosition(pos.id)}
                      className={`flex items-center gap-2.5 rounded-2xl p-3 text-start transition-all cursor-pointer ${
                        isSelected
                          ? 'border-2 border-[#10B981] bg-[#10B981]/20 text-white shadow-md shadow-[#10B981]/20'
                          : 'border border-slate-700/80 bg-[#0F172A] text-slate-300 hover:border-slate-600 hover:bg-slate-800/60'
                      }`}
                    >
                      <span className="text-xl shrink-0" role="img" aria-label={pos.label}>
                        {pos.icon}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-black truncate">{pos.label}</p>
                        <p className="text-[10px] text-slate-400 truncate">{pos.desc}</p>
                      </div>
                      {isSelected && (
                        <CheckCircle2 className="size-4 shrink-0 text-[#10B981]" />
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* خيار تعيين رمز PIN أو كلمة سر مخصصة (اختياري) */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => setShowPinInput((prev) => !prev)}
                className="text-[11px] font-bold text-[#10B981] hover:underline cursor-pointer"
              >
                {showPinInput ? 'إخفاء رمز الدخول الخاص' : '+ تعيين رمز مرور خاص (اختياري)'}
              </button>

              {showPinInput && (
                <div className="mt-2 space-y-1">
                  <input
                    type="password"
                    minLength={8}
                    value={customPin}
                    onChange={(e) => setCustomPin(e.target.value)}
                    placeholder="أدخل كلمة مرور أو رمزاً من 8 أحرف/أرقام"
                    className="h-11 w-full rounded-2xl border border-slate-700 bg-[#0F172A] px-4 text-xs font-bold text-white placeholder:text-slate-500 outline-none focus:border-[#10B981]"
                  />
                  <p className="text-[10px] text-slate-400">
                    إذا تركت الحقل فارغاً، سيتم حفظ حسابك تلقائياً وبأمان.
                  </p>
                </div>
              )}
            </div>

            {/* زر الإرسال والحفظ الفوري */}
            <button
              type="submit"
              disabled={loading}
              className="mt-6 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#10B981] to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-sm shadow-xl shadow-[#10B981]/25 transition-all hover:scale-[1.01] active:scale-98 disabled:opacity-60 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  <span>جاري حفظ الملف الشخصي...</span>
                </>
              ) : (
                <>
                  <Zap className="size-4 fill-white" />
                  <span>حفظ الملف الشخصي والانضمام فوراً</span>
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <div className="mt-5 text-center border-t border-slate-800 pt-4">
            <p className="text-[11px] text-slate-400">
              لديك حساب بالفعل؟{' '}
              <Link to="/login" className="font-black text-[#10B981] hover:underline">
                تسجيل الدخول
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
