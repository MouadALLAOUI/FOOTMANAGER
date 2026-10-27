import { useState } from 'react'
import {
  Calendar,
  Check,
  Clock,
  HelpCircle,
  Info,
  Landmark,
  LayoutGrid,
  MapPin,
  Network,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Upload,
  Users,
  X,
} from 'lucide-react'
import { Button, Card, Field, FieldRow, inputClass, selectClass } from '../../../../components/dashboard/ui'
import api from '../../../../api/client'
import { useToast } from '../../../../components/ui/Toast'

const CATEGORIES = ['أكابر', 'شبان', 'صغار', 'نسوية', 'محلية', 'شركات']

const FORMAT_OPTIONS = [
  {
    id: 'groups_knockout',
    title: 'مجموعات + أدوار إقصائية',
    desc: 'مرحلة مجموعات يتأهل منها أفضل الفرق للمربع الذهبي أو النهائي',
    icon: Network,
    badge: 'الأكثر شعبية',
  },
  {
    id: 'league',
    title: 'دوري كامل بنقاط (League)',
    desc: 'كل فريق يواجه جميع الفرق الأخرى ويتوج صاحب أكبر عدد من النقاط',
    icon: Trophy,
    badge: 'نظام النقاط',
  },
  {
    id: 'knockout_only',
    title: 'خروج المغلوب مباشرة (Cup)',
    desc: 'مباريات إقصائية سريعة ومباشرة من الدور الأول حتى النهائي',
    icon: Swords,
    badge: 'خروج مغلوب',
  },
]

export default function Step1BasicInfo({
  data,
  onChange,
  stadiums = [],
  tournamentId = null,
  onLogoUploaded = null,
}) {
  const { toast } = useToast()
  const [uploadingLogo, setUploadingLogo] = useState(false)

  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!tournamentId) {
      toast.info('سيتم رفع الشعار تلقائياً فور حفظ المسودة الأولى للبطولة')
      return
    }

    const formData = new FormData()
    formData.append('logo', file)

    setUploadingLogo(true)
    try {
      const res = await api.post(`/committee/tournaments/${tournamentId}/branding`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('تم رفع شعار البطولة بنجاح')
      if (onLogoUploaded) {
        onLogoUploaded(res.data.data)
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'فشل في رفع الشعار')
    } finally {
      setUploadingLogo(false)
    }
  }

  const selectedStadium = stadiums.find((s) => String(s.id) === String(data.stadium_id))

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Form Fields */}
      <div className="space-y-6 lg:col-span-2">
        {/* 1. بيانات البطولة الأساسية */}
        <Card title="المعلومات الأساسية للبطولة" subtitle="حدد الاسم الرسمي، التواريخ، وموقع إقامة المنافسات">
          <div className="space-y-4">
            <Field label="اسم البطولة الرسمي" required hint="مثال: دوري الصداقة الرمضاني للنسخة الخامسة">
              <input
                type="text"
                value={data.name || ''}
                onChange={(e) => onChange('name', e.target.value)}
                placeholder="أدخل اسم البطولة..."
                className={inputClass}
                required
              />
            </Field>

            <FieldRow>
              <Field label="النسخة (اختياري)" hint="مثال: 2026 أو النسخة الأولى">
                <input
                  type="text"
                  value={data.edition || ''}
                  onChange={(e) => onChange('edition', e.target.value)}
                  placeholder="رقم النسخة"
                  className={inputClass}
                />
              </Field>

              <Field label="الفئة العمرية / التصنيف">
                <select
                  value={data.category || ''}
                  onChange={(e) => onChange('category', e.target.value)}
                  className={selectClass}
                >
                  <option value="">اختر الفئة...</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </Field>
            </FieldRow>

            <FieldRow>
              <Field label="تاريخ الانطلاق (أول يوم)" required hint="تاريخ بدء المباريات الرسمية">
                <input
                  type="date"
                  value={data.start_date || ''}
                  onChange={(e) => onChange('start_date', e.target.value)}
                  className={inputClass}
                  required
                />
              </Field>

              <Field label="تاريخ الاختتام (المتوقع)" hint="تاريخ المباراة النهائية أو نهاية الدوري">
                <input
                  type="date"
                  value={data.end_date || ''}
                  min={data.start_date || undefined}
                  onChange={(e) => onChange('end_date', e.target.value)}
                  className={inputClass}
                />
              </Field>
            </FieldRow>

            <FieldRow>
              <Field label="المدينة / المنطقة" hint="المدينة التي ستقام بها البطولة">
                <div className="relative">
                  <MapPin className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <input
                    type="text"
                    value={data.location || ''}
                    onChange={(e) => onChange('location', e.target.value)}
                    placeholder="مثال: الدار البيضاء"
                    className={`${inputClass} ps-9`}
                  />
                </div>
              </Field>

              <Field label="الملعب الرئيسي المعتمد" hint="يمكن ربط ملعب مسجل في المنصة أو تركه لاحقاً">
                <div className="relative">
                  <Landmark className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                  <select
                    value={data.stadium_id || ''}
                    onChange={(e) => onChange('stadium_id', e.target.value)}
                    className={`${selectClass} ps-9`}
                  >
                    <option value="">بدون ملعب محدد حالياً</option>
                    {stadiums.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} {st.city ? `(${st.city})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
            </FieldRow>

            {selectedStadium && (
              <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-3.5 text-xs text-sky-800">
                <div className="flex items-center justify-between font-bold">
                  <span>الملعب المختار: {selectedStadium.name}</span>
                  {selectedStadium.price && <span>{selectedStadium.price} درهم/ساعة</span>}
                </div>
                <p className="mt-1 text-slate-500">{selectedStadium.address || selectedStadium.city}</p>
              </div>
            )}

            <Field label="نبذة تعريفية عن البطولة (اختياري)">
              <textarea
                value={data.description || ''}
                onChange={(e) => onChange('description', e.target.value)}
                rows={2}
                placeholder="أهداف البطولة، الفئات المستهدفة، أو معلومات تشجيعية للفرق..."
                className={inputClass}
              />
            </Field>

            {/* Logo upload */}
            {tournamentId && (
              <div className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-4">
                <span className="block text-xs font-bold text-slate-700 mb-2">
                  شعار البطولة (Logo)
                </span>
                <div className="flex items-center gap-4">
                  {data.logo_url ? (
                    <img
                      src={data.logo_url}
                      alt="شعار البطولة"
                      className="size-16 rounded-2xl border border-slate-200 object-cover bg-white"
                    />
                  ) : (
                    <div className="grid size-16 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white text-slate-400">
                      <Upload className="size-6" />
                    </div>
                  )}
                  <div>
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-3.5 py-2 text-xs font-bold text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-2xs">
                      <Upload className="size-3.5" />
                      {uploadingLogo ? 'جاري الرفع...' : 'تحميل صورة الشعار'}
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleLogoChange}
                        disabled={uploadingLogo}
                        className="sr-only"
                      />
                    </label>
                    <p className="mt-1 text-[11px] text-slate-400">PNG أو JPG حتى 2 ميغابايت</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 2. نظام وقواعد المنافسة */}
        <Card title="صيغة ونظام البطولة" subtitle="اختر النظام الرياضي وعدد الفرق المشاركة">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {FORMAT_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const isSelected = data.tournament_format === opt.id
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChange('tournament_format', opt.id)}
                    className={`flex flex-col justify-between rounded-2xl p-4 text-start border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50/70 shadow-sm ring-2 ring-emerald-500/20'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <Icon className={`size-5 ${isSelected ? 'text-emerald-600' : 'text-slate-500'}`} />
                        <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${isSelected ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          {opt.badge}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-black text-slate-900">{opt.title}</p>
                      <p className="mt-1 text-[11px] text-slate-500 leading-normal">{opt.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            <FieldRow>
              <Field label="العدد الإجمالي للفرق" required hint="عدد الفرق المستهدف في البطولة">
                <select
                  value={data.teams_count || 8}
                  onChange={(e) => onChange('teams_count', parseInt(e.target.value, 10))}
                  className={selectClass}
                >
                  {[4, 6, 8, 12, 16, 24, 32].map((num) => (
                    <option key={num} value={num}>
                      {num} فرق
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="مدة المباراة (بالدقائق)" hint="مدة شوطي المباراة">
                <select
                  value={data.match_duration_minutes || 90}
                  onChange={(e) => {
                    const dur = parseInt(e.target.value, 10)
                    onChange('match_duration_minutes', dur)
                    onChange('half_duration_minutes', Math.round(dur / 2))
                  }}
                  className={selectClass}
                >
                  <option value={40}>40 دقيقة (20 دقيقة لكل شوط)</option>
                  <option value={50}>50 دقيقة (25 دقيقة لكل شوط)</option>
                  <option value={60}>60 دقيقة (30 دقيقة لكل شوط)</option>
                  <option value={70}>70 دقيقة (35 دقيقة لكل شوط)</option>
                  <option value={90}>90 دقيقة (45 دقيقة لكل شوط)</option>
                </select>
              </Field>
            </FieldRow>

            <Field label="القانون الداخلي وشروط الانضباط (اختياري)">
              <textarea
                value={data.rules || ''}
                onChange={(e) => onChange('rules', e.target.value)}
                rows={3}
                placeholder="شروط المشاركة، العقوبات الانضباطية، رسوم التسجيل، وأي بنود خاصة بالبطولة..."
                className={inputClass}
              />
            </Field>
          </div>
        </Card>
      </div>

      {/* Sidebar: النصائح والإرشادات العملية لتنظيم البطولة */}
      <div className="space-y-4">
        {/* Prominent Tips and Guidelines Box */}
        <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-[#0F172A] to-[#142320] p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 text-emerald-400 font-black text-sm mb-3">
            <Sparkles className="size-4.5 text-amber-400" />
            <span>نصائح وإرشادات تنظيم البطولة</span>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-slate-300">
            <div className="flex items-start gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px]">
                1
              </span>
              <p>
                <strong className="text-white">نشر البطولة مبكراً:</strong> في الخطوة التالية يمكنك نشر البطولة فوراً لمشاركة الرابط مع الفرق وفتح باب التسجيل قبل حصر القوائم.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px]">
                2
              </span>
              <p>
                <strong className="text-white">تحديد الملعب المعتمد:</strong> ربط الملعب في البداية يسهل على الفرق معرفة الموقع وتوقيت الحجوزات بدقة.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px]">
                3
              </span>
              <p>
                <strong className="text-white">مرونة إضافة الفرق:</strong> يمكنك استخدام الإضافة المباشرة، أو إضافة فرق حرة بدون حساب مسير، أو إرسال دعوة الواتساب.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px]">
                4
              </span>
              <p>
                <strong className="text-white">إغلاق التسجيل النهائي:</strong> بمجرد اكتمال النصاب، يتم إغلاق التسجيل لإنشاء جدول المباريات والقرعة بضغطة زر.
              </p>
            </div>
          </div>
        </div>

        {/* Validation Checklist */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 font-black text-xs text-slate-900 mb-3">
            <Info className="size-4 text-emerald-600" />
            <span>شروط الانتقال إلى مرحلة النشر:</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className={`grid size-4 place-items-center rounded-full text-[10px] ${data.name?.trim() ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {data.name?.trim() ? <Check className="size-3 stroke-[3]" /> : '1'}
              </span>
              <span className={data.name?.trim() ? 'font-bold text-slate-800' : 'text-slate-500'}>
                تحديد اسم البطولة الرسمي
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className={`grid size-4 place-items-center rounded-full text-[10px] ${data.start_date ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {data.start_date ? <Check className="size-3 stroke-[3]" /> : '2'}
              </span>
              <span className={data.start_date ? 'font-bold text-slate-800' : 'text-slate-500'}>
                تحديد تاريخ الانطلاق
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
