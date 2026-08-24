import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowUpDown,
  CalendarDays,
  Camera,
  CircleDot,
  MapPin,
  Palette,
  Save,
  Shield,
  Swords,
  Trophy,
  Upload,
  Users,
} from 'lucide-react'
import api from '../../../api/client'
import { useTeamProfile, useStadiums } from '../../../api/queries'
import {
  Button,
  Field,
  FieldRow,
  SectionTitle,
  Skeleton,
  inputClass,
  selectClass,
} from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import { toastApiError } from '../../../lib/errors'

const categoryLabels = { adult: 'كبار', teenager: 'شباب', children: 'أطفال' }

function JerseyPreview({ primary, secondary, name }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div
          className="grid size-28 place-items-center rounded-[36px] shadow-[0_18px_40px_rgba(15,23,42,0.22)]"
          style={{
            background: `linear-gradient(135deg, ${primary || '#22c55e'}, ${secondary || '#0ea5e9'})`,
          }}
        >
          <span className="text-4xl font-black text-white drop-shadow">{name?.slice(0, 1) || '؟'}</span>
          <span className="absolute bottom-3 flex gap-1">
            <span className="h-1.5 w-8 rounded-full bg-white/30" />
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
        <span className="size-3 rounded-full" style={{ background: primary || '#22c55e' }} />
        <span className="size-3 rounded-full" style={{ background: secondary || '#0ea5e9' }} />
      </div>
    </div>
  )
}

export default function Team() {
  const { toast } = useToast()
  const { t } = useTranslation()
  const { data, loading, refetch } = useTeamProfile()
  const { data: stadiumsData } = useStadiums({ per_page: 50 })
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  const team = data?.team
  const stadiums = stadiumsData?.data || []

  useEffect(() => {
    if (team) {
      setForm({
        name: team.name || '',
        member_count: team.member_count || 1,
        category: team.category || 'adult',
        association_name: team.association_name || '',
        primary_stadium_id: team.primary_stadium_id || '',
        city: team.city || '',
        region: team.region || '',
        description: team.description || '',
        primary_color: team.primary_color || '#22c55e',
        secondary_color: team.secondary_color || '#0ea5e9',
      })
    }
  }, [team])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const save = async () => {
    setSaving(true)
    try {
      const res = await api.put('/manager/team-profile', form)
      toast.success(res.data.message || 'تم تحديث بيانات الفريق')
      refetch()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setSaving(false)
    }
  }

  const uploadLogo = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('logo', file)
      const res = await api.post('/manager/team-profile/logo', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success(res.data.message || 'تم رفع الشعار')
      refetch()
    } catch (e) {
      toastApiError(e, t)
    } finally {
      setUploading(false)
    }
  }

  const stats = useMemo(
    () => [
      { label: 'النقاط', value: team?.points ?? 0, icon: Trophy, color: 'text-amber-600', bg: 'bg-amber-50' },
      { label: 'مباريات', value: team?.matches_played ?? 0, icon: Swords, color: 'text-sky-600', bg: 'bg-sky-50' },
      { label: 'فوز / تعادل / خسارة', value: `${team?.wins ?? 0} / ${team?.draws ?? 0} / ${team?.losses ?? 0}`, icon: ArrowUpDown, color: 'text-green-600', bg: 'bg-green-50' },
      { label: 'الأهداف', value: `${team?.goals_for ?? 0} — ${team?.goals_against ?? 0}`, icon: CircleDot, color: 'text-violet-600', bg: 'bg-violet-50' },
    ],
    [team],
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-56 w-full rounded-[28px]" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-3xl" />
          ))}
        </div>
        <Skeleton className="h-80 w-full rounded-3xl" />
      </div>
    )
  }

  if (!team) {
    return (
      <SectionTitle title="ملف الفريق" subtitle="لا يوجد فريق مرتبط بحسابك بعد" />
    )
  }

  const coverUrl = team.cover_image_url

  return (
    <div>
      <SectionTitle
        title="ملف الفريق"
        subtitle="تعريف بفريقك ليظهر أمام المسيرين واللاعبين"
        action={
          <Button onClick={save} disabled={saving || loading}>
            <Save className="size-4" />
            {saving ? 'جارٍ الحفظ…' : 'حفظ التغييرات'}
          </Button>
        }
      />

      {/* Hero */}
      <div className="relative overflow-hidden rounded-[28px]">
        {coverUrl ? (
          <img loading="lazy" decoding="async" src={coverUrl} alt="" className="h-56 w-full object-cover" />
        ) : (
          <div
            className="h-56 w-full"
            style={{
              background: `linear-gradient(120deg, ${form.primary_color || '#0b1220'}, ${form.secondary_color || '#0f172a'} 60%, #12321f)`,
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 flex flex-wrap items-end gap-4 p-6">
          <div className="group relative">
            {team.logo_url ? (
              <img
                src={team.logo_url}
                alt=""
                loading="lazy"
                decoding="async"
                className="size-24 rounded-3xl border-4 border-white object-cover shadow-2xl"
              />
            ) : (
              <span className="grid size-24 place-items-center rounded-3xl border-4 border-white bg-white/15 text-4xl font-black text-white shadow-2xl backdrop-blur">
                {(team.name || '؟').slice(0, 1)}
              </span>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute inset-0 grid place-items-center rounded-3xl bg-slate-950/50 opacity-0 transition-opacity group-hover:opacity-100"
              title="تغيير الشعار"
            >
              {uploading ? (
                <span className="size-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Camera className="size-6 text-white" />
              )}
            </button>
          </div>
          <div className="min-w-0 pb-1 text-white">
            <h2 className="truncate text-2xl font-black drop-shadow">{team.name}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-white/80">
              <span className="inline-flex items-center gap-1">
                <Users className="size-3.5" />
                {categoryLabels[team.category] || team.category || 'فئة غير محددة'}
              </span>
              {team.city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" />
                  {team.city}
                </span>
              )}
              {team.founded_year && (
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3.5" />
                  {team.founded_year}
                </span>
              )}
            </p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            uploadLogo(e.target.files?.[0])
            e.target.value = ''
          }}
        />
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-3xl border border-slate-200/70 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className={`grid size-10 place-items-center rounded-2xl ${s.bg} ${s.color}`}>
              <s.icon className="size-5" />
            </div>
            <p className="mt-3 truncate text-xl font-black text-slate-900">{s.value}</p>
            <p className="mt-0.5 text-[11px] font-semibold text-slate-400">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        {/* Info */}
        <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] lg:col-span-2">
          <div className="mb-5 flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-green-50 text-green-600">
              <Shield className="size-4" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">معلومات الفريق</h3>
              <p className="text-[11px] font-semibold text-slate-400">البيانات الأساسية لفريقك</p>
            </div>
          </div>
          <div className="space-y-4">
            <FieldRow>
              <Field label="اسم الفريق" required>
                <input className={inputClass} value={form.name || ''} onChange={set('name')} />
              </Field>
              <Field label="عدد الأعضاء" required>
                <input type="number" min="1" className={inputClass} value={form.member_count || ''} onChange={set('member_count')} />
              </Field>
            </FieldRow>
            <FieldRow>
              <Field label="الفئة" required>
                <select className={selectClass} value={form.category || 'adult'} onChange={set('category')}>
                  {Object.entries(categoryLabels).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="الملعب الأساسي">
                <select className={selectClass} value={form.primary_stadium_id || ''} onChange={set('primary_stadium_id')}>
                  <option value="">غير محدد</option>
                  {stadiums.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.city}
                    </option>
                  ))}
                </select>
              </Field>
            </FieldRow>
            <FieldRow>
              <Field label="المدينة">
                <input className={inputClass} value={form.city || ''} onChange={set('city')} />
              </Field>
              <Field label="الجهة / الإقليم">
                <input className={inputClass} value={form.region || ''} onChange={set('region')} />
              </Field>
            </FieldRow>
            <Field label="الجمعية الرياضية">
              <input className={inputClass} value={form.association_name || ''} onChange={set('association_name')} />
            </Field>
            <Field label="نبذة عن الفريق">
              <textarea
                rows={4}
                className={`${inputClass} h-auto py-3`}
                value={form.description || ''}
                onChange={set('description')}
                placeholder="عرّف بفريقك وتاريخه وإنجازاته…"
              />
            </Field>
          </div>
        </div>

        {/* Colors + logo */}
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="mb-5 flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-violet-50 text-violet-600">
                <Palette className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">ألوان الفريق</h3>
                <p className="text-[11px] font-semibold text-slate-400">معاينة حية لقميصك</p>
              </div>
            </div>
            <JerseyPreview
              primary={form.primary_color}
              secondary={form.secondary_color}
              name={form.name || team.name}
            />
            <div className="mt-5 grid grid-cols-2 gap-3">
              {[
                { key: 'primary_color', label: 'اللون الأساسي' },
                { key: 'secondary_color', label: 'اللون الثانوي' },
              ].map((c) => (
                <label key={c.key} className="block">
                  <span className="mb-1.5 block text-[11px] font-bold text-slate-600">{c.label}</span>
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 p-1.5 ps-3">
                    <input
                      type="color"
                      value={form[c.key] || '#22c55e'}
                      onChange={set(c.key)}
                      className="h-8 w-8 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                    />
                    <input
                      className="h-9 w-full bg-transparent text-xs font-bold text-slate-700 outline-none"
                      value={form[c.key] || ''}
                      onChange={set(c.key)}
                    />
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200/70 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-sky-50 text-sky-600">
                <Upload className="size-4" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">شعار الفريق</h3>
                <p className="text-[11px] font-semibold text-slate-400">JPG أو PNG حتى 2MB</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {team.logo_url ? (
                <img loading="lazy" decoding="async" src={team.logo_url} alt="" className="size-16 rounded-2xl object-cover ring-1 ring-slate-200" />
              ) : (
                <span className="grid size-16 place-items-center rounded-2xl bg-slate-50 text-slate-300">
                  <Shield className="size-7" strokeWidth={1.6} />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <Button variant="outline" size="sm" className="w-full" disabled={uploading} onClick={() => fileRef.current?.click()}>
                  {uploading ? 'جارٍ الرفع…' : 'رفع شعار جديد'}
                </Button>
                <p className="mt-1.5 text-[10px] font-semibold text-slate-400">
                  سيظهر الشعار في بطاقات الفريق والترتيب
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
