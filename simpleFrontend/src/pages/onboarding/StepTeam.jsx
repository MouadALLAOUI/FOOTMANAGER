import { useState, useEffect } from 'react'
import { Shield, Upload, MapPin, Check, Sparkles, Phone } from 'lucide-react'
import { Button, Field, inputClass, selectClass } from '../../components/dashboard/ui'
import { useAuth } from '../../context/AuthContext'
import { useCitiesSelect } from '../../api/queries'

export default function StepTeam({ initialTeam, presets = [], cities: initialCities = [], onNext, busy }) {
  const { user } = useAuth()
  const { data: citiesData, isLoading: citiesLoading } = useCitiesSelect()
  const cities = initialCities.length > 0 ? initialCities : (citiesData?.cities || [])

  const [name, setName] = useState(initialTeam?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [isWhatsapp, setIsWhatsapp] = useState(user?.is_whatsapp ?? true)
  const [city, setCity] = useState(initialTeam?.city || '')
  const [category, setCategory] = useState(initialTeam?.category || 'adult')

  useEffect(() => {
    if (city && cities.length > 0) {
      const match = cities.find(
        (c) => c.name === city || c.name_ar === city || c.localized_name === city || c.slug === city.toLowerCase()
      )
      if (match && match.name !== city) {
        setCity(match.name)
      }
    }
  }, [cities, city])
  const [selectedPresetId, setSelectedPresetId] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(initialTeam?.logo_url || '')
  const [error, setError] = useState('')

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 4 * 1024 * 1024) {
      setError('حجم الصورة يجب ألا يتجاوز 4 ميغابايت')
      return
    }
    setError('')
    setLogoFile(file)
    setSelectedPresetId(null)
    setPreviewUrl(URL.createObjectURL(file))
  }

  const handleSelectPreset = (preset) => {
    setSelectedPresetId(preset.id)
    setLogoFile(null)
    setPreviewUrl(preset.image_url)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('يرجى إدخال اسم الفريق')
      return
    }
    if (!user?.phone && !phone.trim()) {
      setError('يرجى إدخال رقم هاتفك لتنسيق المباريات والتواصل')
      return
    }
    setError('')

    const formData = new FormData()
    formData.append('name', name.trim())
    if (phone.trim()) {
      formData.append('phone', phone.trim())
      formData.append('is_whatsapp', isWhatsapp ? '1' : '0')
    }
    if (city.trim()) formData.append('city', city.trim())
    if (category) formData.append('category', category)
    if (logoFile) {
      formData.append('logo', logoFile)
    } else if (selectedPresetId) {
      formData.append('preset_id', selectedPresetId)
    }

    onNext(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="mx-auto max-w-xl space-y-6">
      <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        {/* Step Header */}
        <div className="text-center">
          <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <Shield className="size-6" />
          </div>
          <h1 className="text-xl font-black text-slate-900 sm:text-2xl">معلومات الفريق والشعار</h1>
          <p className="mt-1 text-xs text-slate-500">
            اختر اسماً مميزاً لناديك وشعاراً يظهر في المباريات والبطولة
          </p>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl bg-rose-50 p-3.5 text-center text-xs font-bold text-rose-600 ring-1 ring-rose-200">
            {error}
          </div>
        )}

        {/* Logo Preview & Upload */}
        <div className="mt-8 flex flex-col items-center">
          <div className="relative group">
            <div className="grid size-24 place-items-center overflow-hidden rounded-full border-2 border-dashed border-emerald-500/40 bg-slate-50 shadow-inner sm:size-28">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="شعار الفريق"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <Shield className="size-9 text-slate-300" />
                  <span className="mt-1 text-[10px] font-bold">بدون شعار</span>
                </div>
              )}
            </div>

            <label
              htmlFor="team-logo-input"
              className="absolute -bottom-1 -end-1 flex size-8 cursor-pointer items-center justify-center rounded-full bg-emerald-600 text-white shadow-md transition-transform hover:scale-110 active:scale-95"
              title="تغيير الشعار"
            >
              <Upload className="size-4" />
              <input
                id="team-logo-input"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          <label
            htmlFor="team-logo-input"
            className="mt-3 cursor-pointer text-xs font-extrabold text-emerald-600 hover:underline"
          >
            اضغط هنا لرفع شعار من هاتفك
          </label>
        </div>

        {/* Presets Grid */}
        {presets.length > 0 && (
          <div className="mt-6 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Sparkles className="size-3.5 text-amber-500" />
              <span>أو اختر شعاراً جاهزاً سريعاً:</span>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-6">
              {presets.slice(0, 12).map((p) => {
                const selected = selectedPresetId === p.id
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p)}
                    className={`relative aspect-square overflow-hidden rounded-xl border-2 p-1 transition-all ${
                      selected
                        ? 'border-emerald-500 bg-white ring-2 ring-emerald-500/20 scale-105'
                        : 'border-transparent bg-white hover:border-slate-300'
                    }`}
                  >
                    <img
                      src={p.image_url}
                      alt={p.name}
                      className="h-full w-full rounded-lg object-contain"
                    />
                    {selected && (
                      <div className="absolute top-1 start-1 flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white">
                        <Check className="size-2.5" strokeWidth={3} />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Form Fields */}
        <div className="mt-6 space-y-4 text-start">
          <Field label="اسم الفريق" required>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: نجوم الحي، أبطال المدينة..."
              className={inputClass}
              dir="auto"
              required
            />
          </Field>

          {!user?.phone && (
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-50/50 p-4 space-y-3">
              <Field label="رقم الهاتف الخاص بك (مطلوب لتنسيق المباريات والتواصل)" required>
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
                  <Phone className="pointer-events-none absolute end-3.5 top-3.5 size-4 text-emerald-600" />
                </div>
              </Field>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
                <input
                  type="checkbox"
                  checked={isWhatsapp}
                  onChange={(e) => setIsWhatsapp(e.target.checked)}
                  className="size-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>رقم الهاتف هذا يتوفر على واتساب (WhatsApp)</span>
              </label>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="المدينة / المنطقة">
              <div className="relative">
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className={selectClass}
                  dir="auto"
                >
                  <option value="">
                    {citiesLoading && cities.length === 0 ? 'جارِ تحميل المدن...' : 'اختر المدينة أو المنطقة'}
                  </option>
                  {cities.map((c) => {
                    const label =
                      c.name_ar && c.name && c.name_ar !== c.name
                        ? `${c.name_ar} (${c.name})`
                        : (c.localized_name || c.name_ar || c.name)
                    return (
                      <option key={c.id || c.name} value={c.name}>
                        {label}
                      </option>
                    )
                  })}
                  {city && !cities.some((c) => c.name === city || c.name_ar === city) && (
                    <option value={city}>{city}</option>
                  )}
                </select>
                <MapPin className="pointer-events-none absolute end-3.5 top-3.5 size-4 text-slate-400" />
              </div>
            </Field>

            <Field label="فئة الفريق">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={selectClass}
              >
                <option value="adult">فريق كبار (Adults)</option>
                <option value="teenager">فريق شباب (U17 - U20)</option>
                <option value="children">فريق صغار (أقل من 15 سنة)</option>
              </select>
            </Field>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-end border-t border-slate-100 pt-5">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            loading={busy}
            className="w-full sm:w-auto"
          >
            حفظ ومتابعة الخطوة التالية ←
          </Button>
        </div>
      </div>
    </form>
  )
}
