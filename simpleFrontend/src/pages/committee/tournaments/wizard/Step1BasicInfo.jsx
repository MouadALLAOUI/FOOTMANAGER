import { useState } from 'react'
import { Calendar, Check, Info, Landmark, MapPin, Sparkles, Upload, X } from 'lucide-react'
import { Button, Card, Field, FieldRow, inputClass, selectClass } from '../../../../components/dashboard/ui'
import api from '../../../../api/client'
import { useToast } from '../../../../components/ui/Toast'

const CATEGORIES = ['أكابر', 'شبان', 'صغار', 'نسوية', 'محلية', 'شركات']

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
        <Card title="بيانات البطولة والمنظم" subtitle="حدد الاسم الرسمي، التصنيف وموقع إقامة المنافسات">
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
              <Field label="النسخة (اختياري)" hint="مثال: 1 أو 2026 أو الأولى">
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
                    placeholder="مثال: الدار البيضاء - عين السبع"
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
                rows={3}
                placeholder="أهداف البطولة، الفئات المستهدفة، أو معلومات تشجيعية للفرق..."
                className={inputClass}
              />
            </Field>

            {/* Logo upload if tournament exists */}
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
      </div>

      {/* Contextual Guidance & Checklist Sidebar */}
      <div className="space-y-4">
        <div className="rounded-3xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50/70 to-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-sm mb-2">
            <Sparkles className="size-4" />
            <span>إرشادات الخطوة الأولى</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-600">
            تعتبر المعلومات الأساسية هي الواجهة الرسمية لبطولتك التي ستراها الفرق عند التسجيل والجمهور في صفحة النتائج.
          </p>

          <div className="mt-4 border-t border-emerald-100 pt-3 space-y-2">
            <span className="text-[11px] font-black text-emerald-900 block">
              شروط الانتقال للخطوة التالية:
            </span>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2">
                <span className={`grid size-4 place-items-center rounded-full text-[10px] ${data.name ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {data.name ? <Check className="size-3 stroke-[3]" /> : '1'}
                </span>
                <span className={data.name ? 'font-bold text-slate-800' : 'text-slate-500'}>
                  تحديد اسم البطولة
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`grid size-4 place-items-center rounded-full text-[10px] ${data.start_date ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                  {data.start_date ? <Check className="size-3 stroke-[3]" /> : '2'}
                </span>
                <span className={data.start_date ? 'font-bold text-slate-800' : 'text-slate-500'}>
                  تحديد تاريخ البداية
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 text-xs text-slate-600 space-y-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-900">
            <Info className="size-4 text-sky-500" />
            <span>نصيحة المنظم</span>
          </div>
          <p className="leading-relaxed text-slate-500">
            يمكنك دائماً تعديل هذه التفاصيل وحفظ المسودة والعودة إليها في أي وقت دون أن تفقد أي تغييرات.
          </p>
        </div>
      </div>
    </div>
  )
}
