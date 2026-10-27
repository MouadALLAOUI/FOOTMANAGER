import { useState } from 'react'
import {
  Calendar,
  Check,
  Image as ImageIcon,
  Info,
  Landmark,
  MapPin,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'
import { Card, Field, FieldRow, inputClass, selectClass } from '../../../../components/dashboard/ui'
import api from '../../../../api/client'
import { useToast } from '../../../../components/ui/Toast'

const CATEGORIES = ['أكابر', 'شبان', 'صغار', 'نسوية', 'محلية', 'شركات']

export default function Step1BasicInfo({
  data,
  onChange,
  stadiums = [],
  tournamentId = null,
  onBrandingUploaded = null,
}) {
  const { toast } = useToast()
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  // Upload Logo
  const handleLogoChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show instant local preview
    const localUrl = URL.createObjectURL(file)
    onChange('logo_url', localUrl)

    if (!tournamentId) {
      toast.info('تم تحديد الشعار وسيتم رفعه نهائياً فور حفظ المسودة')
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
      if (onBrandingUploaded) {
        onBrandingUploaded(res.data.data)
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'فشل في رفع الشعار')
    } finally {
      setUploadingLogo(false)
    }
  }

  // Upload Cover Banner
  const handleCoverChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show instant local preview
    const localUrl = URL.createObjectURL(file)
    onChange('cover_url', localUrl)

    if (!tournamentId) {
      toast.info('تم تحديد الغلاف وسيتم رفعه نهائياً فور حفظ المسودة')
      return
    }

    const formData = new FormData()
    formData.append('cover', file)

    setUploadingCover(true)
    try {
      const res = await api.post(`/committee/tournaments/${tournamentId}/branding`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('تم رفع غلاف البطولة بنجاح')
      if (onBrandingUploaded) {
        onBrandingUploaded(res.data.data)
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'فشل في رفع الغلاف')
    } finally {
      setUploadingCover(false)
    }
  }

  const selectedStadium = stadiums.find((s) => String(s.id) === String(data.stadium_id))

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Main Form Fields */}
      <div className="space-y-6 lg:col-span-2">
        {/* 1. هوية البطولة البصرية: البانر والشعار */}
        <Card
          title="الهوية البصرية للبطولة (الغلاف والشعار)"
          subtitle="تخصيص غلاف عريض وشعار رسمي يمنح بطولتك مظهراً احترافياً جذاباً للفرق والجمهور"
        >
          <div className="space-y-6">
            {/* أ. رفع بانر الغلاف (Cover Banner) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-800">
                  بانر الغلاف الرسمي (Cover Banner)
                </span>
                <span className="text-[11px] text-slate-400 font-semibold">
                  المقاس الموصى به: 1200×400 (نسبة 3:1 أو 16:9)
                </span>
              </div>

              <div className="relative overflow-hidden rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50/70 transition-all hover:border-[#10B981]/50">
                {data.cover_url ? (
                  <div className="relative aspect-[3/1] w-full group">
                    <img
                      src={data.cover_url}
                      alt="غلاف البطولة"
                      className="size-full object-cover rounded-3xl"
                    />
                    <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-xs">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-xs font-black text-slate-800 hover:bg-slate-50 shadow-lg">
                        <Upload className="size-4 text-[#10B981]" />
                        <span>{uploadingCover ? 'جاري الرفع...' : 'تغيير الغلاف'}</span>
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          onChange={handleCoverChange}
                          disabled={uploadingCover}
                          className="sr-only"
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => onChange('cover_url', '')}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-rose-600 px-4 py-2.5 text-xs font-black text-white hover:bg-rose-700 shadow-lg"
                      >
                        <Trash2 className="size-4" />
                        <span>إزالة</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="flex aspect-[3/1] w-full cursor-pointer flex-col items-center justify-center p-6 text-center">
                    <div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-[#10B981] mb-2 shadow-xs">
                      <ImageIcon className="size-6" />
                    </div>
                    <p className="text-xs font-black text-slate-800">
                      {uploadingCover ? 'جاري رفع الغلاف...' : 'انقر هنا لرفع غلاف البطولة (البانر)'}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      يدعم ملفات JPG، PNG، WebP حتى حجم 5 ميغابايت
                    </p>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleCoverChange}
                      disabled={uploadingCover}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>
            </div>

            {/* ب. رفع الشعار الرسمي (Logo) */}
            <div className="border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-800">
                  شعار البطولة الرسمي (Logo)
                </span>
                <span className="text-[11px] text-slate-400 font-semibold">
                  المقاس الموصى به: 500×500 (مربع بخلفية مفرغة)
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5 rounded-2xl border border-slate-200/90 bg-white p-4">
                <div className="relative shrink-0">
                  {data.logo_url ? (
                    <img
                      src={data.logo_url}
                      alt="شعار البطولة"
                      className="size-20 rounded-2xl border border-slate-200 object-cover bg-slate-50 shadow-xs"
                    />
                  ) : (
                    <div className="grid size-20 place-items-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-slate-400">
                      <Upload className="size-7 text-slate-400" />
                    </div>
                  )}
                </div>

                <div className="flex-1 text-center sm:text-start">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#0F172A] hover:bg-slate-800 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-colors">
                      <Upload className="size-3.5 text-[#10B981]" />
                      <span>{uploadingLogo ? 'جاري رفع الشعار...' : 'تحميل صورة الشعار'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={handleLogoChange}
                        disabled={uploadingLogo}
                        className="sr-only"
                      />
                    </label>

                    {data.logo_url && (
                      <button
                        type="button"
                        onClick={() => onChange('logo_url', '')}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors"
                      >
                        <Trash2 className="size-3.5" />
                        <span>إزالة الشعار</span>
                      </button>
                    )}
                  </div>
                  <p className="mt-2 text-[11px] text-slate-400 font-medium">
                    يظهر الشعار في بطاقات المباريات، الترتيب، وجدول الجولات الرسمي (حتى 2 ميغابايت)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* 2. بيانات البطولة الأساسية */}
        <Card
          title="معلومات البطولة الأساسية"
          subtitle="حدد الاسم الرسمي، التواريخ المعتمدة، والملعب الرئيسي للمنافسات"
        >
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
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3.5 text-xs text-emerald-900">
                <div className="flex items-center justify-between font-bold">
                  <span>الملعب المعتمد: {selectedStadium.name}</span>
                  {selectedStadium.price && <span>{selectedStadium.price} درهم/ساعة</span>}
                </div>
                <p className="mt-1 text-slate-600">{selectedStadium.address || selectedStadium.city}</p>
              </div>
            )}

            <Field label="نبذة تعريفية عن البطولة (اختياري)">
              <textarea
                value={data.description || ''}
                onChange={(e) => onChange('description', e.target.value)}
                rows={3}
                placeholder="أهداف البطولة، الفئات المستهدفة، أو معلومات تشجيعية للفرق..."
                className={inputClass}
              />
            </Field>
          </div>
        </Card>
      </div>

      {/* Sidebar: النصائح والإرشادات العملية */}
      <div className="space-y-4">
        {/* Prominent Tips and Guidelines Box */}
        <div className="rounded-3xl border border-emerald-500/40 bg-gradient-to-br from-[#0F172A] to-[#142320] p-5 text-white shadow-lg">
          <div className="flex items-center gap-2 text-emerald-400 font-black text-sm mb-3">
            <Sparkles className="size-4.5 text-amber-400" />
            <span>نصائح إعداد معلومات البطولة</span>
          </div>

          <div className="space-y-3 text-xs leading-relaxed text-slate-300">
            <div className="flex items-start gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px]">
                1
              </span>
              <p>
                <strong className="text-white">الهوية البصرية الجذابة:</strong> رفع الغلاف والشعار يرفع من نسبة تفاعل الفرق المشاركة ويمنح بطاقتك مظهراً رسمياً.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px]">
                2
              </span>
              <p>
                <strong className="text-white">تحديد الملعب المعتمد:</strong> يسهل على الفرق واللاعبين معرفة توقيت الحصص وموقع المباريات بدقة.
              </p>
            </div>

            <div className="flex items-start gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-[11px]">
                3
              </span>
              <p>
                <strong className="text-white">المرحلة التالية (قوانين البطولة):</strong> ستحدد فيها الصيغة الرياضية، مدة المباراة، ونقاط الفوز والتعادل واللوائح الداخلية.
              </p>
            </div>
          </div>
        </div>

        {/* Validation Checklist */}
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center gap-2 font-black text-xs text-slate-900 mb-3">
            <Info className="size-4 text-emerald-600" />
            <span>شروط الانتقال إلى الخطوة التالية:</span>
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
