import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, MapPin, Phone, Award, Check, Sparkles, Calendar } from 'lucide-react'
import api from '../../../api/client'
import { useAuth } from '../../../context/AuthContext'
import { useCitiesSelect } from '../../../api/queries'
import { useToast } from '../../../components/ui/Toast'
import { Button, Field, inputClass, selectClass } from '../../../components/dashboard/ui'

const positions = [
  { id: 'goalkeeper', title: 'حارس مرمى', icon: '🧤', desc: 'حماية المرمى والتصدي للتسديدات' },
  { id: 'defender', title: 'مدافع', icon: '🛡️', desc: 'قطع الكرات والتغطية الدفاعية' },
  { id: 'midfielder', title: 'وسط ميدان', icon: '⚡', desc: 'صناعة اللعب والربط بين الخطوط' },
  { id: 'forward', title: 'مهاجم', icon: '🎯', desc: 'تسجيل الأهداف وإنهاء الهجمات' },
]

const skillLevels = [
  { id: 'beginner', title: 'مبتدئ' },
  { id: 'amateur', title: 'هاوٍ' },
  { id: 'semi_pro', title: 'شبه محترف' },
  { id: 'pro', title: 'محترف' },
]

export default function PlayerOnboarding() {
  const { user, refresh } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const { data: citiesData, isLoading: citiesLoading } = useCitiesSelect()
  const cities = citiesData?.cities || []

  const [phone, setPhone] = useState(user?.phone || '')
  const [isWhatsapp, setIsWhatsapp] = useState(user?.is_whatsapp ?? true)
  const [city, setCity] = useState(user?.player_profile?.city || '')
  const [position, setPosition] = useState(user?.player_profile?.position || 'midfielder')
  const [skillLevel, setSkillLevel] = useState(user?.player_profile?.skill_level || 'amateur')
  const [birthYear, setBirthYear] = useState(user?.player_profile?.birth_year || '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.phone) setPhone(user.phone)
    if (user?.player_profile?.city) setCity(user.player_profile.city)
    if (user?.player_profile?.position) setPosition(user.player_profile.position)
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!phone.trim()) {
      setError('يرجى إدخال رقم هاتفك لتتمكن الفرق من التواصل معك')
      return
    }

    if (!city) {
      setError('يرجى اختيار مدينتك لعرض المباريات القريبة منك')
      return
    }

    setBusy(true)
    try {
      await api.put('/player/profile', {
        name: user?.name,
        phone: phone.trim(),
        is_whatsapp: Boolean(isWhatsapp),
        city,
        position,
        skill_level: skillLevel,
        birth_year: birthYear ? Number(birthYear) : null,
      })

      if (refresh) await refresh()
      toast.success('تم إكمال ملفك الرياضي بنجاح! مرحباً بك ⚽')
      navigate('/player', { replace: true })
    } catch (err) {
      const first = Object.values(err.response?.data?.errors || {})[0]
      setError(first?.[0] || err.response?.data?.message || 'تعذر حفظ البيانات، يرجى المحاولة ثانية')
    } finally {
      setBusy(false)
    }
  }

  const handleSkip = () => {
    navigate('/player', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6" dir="rtl">
      <div className="mx-auto max-w-2xl">
        {/* Top Header Card */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid size-16 place-items-center rounded-3xl bg-sky-500/10 text-sky-600 shadow-sm">
            <span className="text-3xl">⚽</span>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700 ring-1 ring-sky-200">
            <Sparkles className="size-3.5" />
            إعداد ملف اللاعب الجديد
          </span>
          <h1 className="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">
            مرحباً بك يا {user?.name || 'كابتن'}!
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
            أكمل معلوماتك الرياضية لتظهر لمدربي الفرق في مدينتك وتتلقى دعوات المباريات
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl bg-rose-50 p-4 text-center text-xs font-bold text-rose-600 ring-1 ring-rose-200 animate-fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Card 1: Position Selection */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-7">
            <div className="flex items-center gap-2 mb-4">
              <Shield className="size-5 text-sky-600" />
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                1. ما هو مركزك المفضل في الملعب؟
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {positions.map((pos) => {
                const selected = position === pos.id
                return (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => setPosition(pos.id)}
                    className={`relative flex flex-col items-center gap-2 rounded-2xl border p-4 text-center transition-all ${
                      selected
                        ? 'border-sky-500 bg-sky-50/80 ring-2 ring-sky-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <span className="text-3xl">{pos.icon}</span>
                    <span className="text-xs font-extrabold text-slate-900">
                      {pos.title}
                    </span>
                    <span className="text-[10px] text-slate-400 leading-tight">
                      {pos.desc}
                    </span>
                    {selected && (
                      <div className="absolute top-2 start-2 flex size-4 items-center justify-center rounded-full bg-sky-500 text-white">
                        <Check className="size-2.5" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Card 2: Contact & Location */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-xs sm:p-7 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Phone className="size-5 text-emerald-600" />
              <h2 className="text-sm sm:text-base font-black text-slate-900">
                2. معلومات التواصل والمدينة
              </h2>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Field label="رقم الهاتف (ضروري لتنسيق المباريات وتلقي الدعوات)" required>
                <div className="relative">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="06XXXXXXXX أو 07XXXXXXXX"
                    className={inputClass}
                    dir="ltr"
                    required
                  />
                  <Phone className="pointer-events-none absolute end-3.5 top-3.5 size-4 text-slate-400" />
                </div>
              </Field>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none pt-1">
                <input
                  type="checkbox"
                  checked={isWhatsapp}
                  onChange={(e) => setIsWhatsapp(e.target.checked)}
                  className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>رقم الهاتف هذا يتوفر على واتساب (WhatsApp)</span>
              </label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-2">
              {/* City */}
              <Field label="المدينة التي تلعب فيها" required>
                <div className="relative">
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={selectClass}
                    required
                  >
                    <option value="" disabled>
                      {citiesLoading ? 'جارِ تحميل المدن...' : 'اختر مدينتك'}
                    </option>
                    {cities.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.localized_name || c.name}
                      </option>
                    ))}
                  </select>
                  <MapPin className="pointer-events-none absolute end-3.5 top-3.5 size-4 text-slate-400" />
                </div>
              </Field>

              {/* Skill level */}
              <Field label="مستواك الكروي">
                <div className="relative">
                  <select
                    value={skillLevel}
                    onChange={(e) => setSkillLevel(e.target.value)}
                    className={selectClass}
                  >
                    {skillLevels.map((lvl) => (
                      <option key={lvl.id} value={lvl.id}>
                        {lvl.title}
                      </option>
                    ))}
                  </select>
                  <Award className="pointer-events-none absolute end-3.5 top-3.5 size-4 text-slate-400" />
                </div>
              </Field>

              {/* Birth Year */}
              <Field label="سنة الميلاد (اختياري)">
                <div className="relative">
                  <input
                    type="number"
                    min="1950"
                    max={new Date().getFullYear()}
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value)}
                    placeholder="مثال: 2000"
                    className={inputClass}
                    dir="ltr"
                  />
                  <Calendar className="pointer-events-none absolute end-3.5 top-3.5 size-4 text-slate-400" />
                </div>
              </Field>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-bold text-slate-400 hover:text-slate-700 transition-colors py-2 px-3"
            >
              إكمال لاحقاً والانتقال للرئيسية
            </button>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={busy}
              className="w-full sm:w-auto min-w-[200px]"
            >
              حفظ والانطلاق للوحة التحكم ⚽
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
