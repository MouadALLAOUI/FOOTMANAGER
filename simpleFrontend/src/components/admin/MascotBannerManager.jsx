import { useState, useEffect } from 'react'
import { Sparkles, MessageSquare, Save, RotateCcw, CheckCircle2, Megaphone, Shield, User, Eye } from 'lucide-react'
import { Card, Button, Input, Toggle, Badge } from './ui'
import GenieMascot from '../mascot/GenieMascot'
import {
  DEFAULT_MASCOT_SETTINGS,
  getMascotSettings,
  saveMascotSettings,
} from '../../utils/mascotSettings'

export default function MascotBannerManager() {
  const [form, setForm] = useState(getMascotSettings)
  const [saved, setSaved] = useState(false)
  const [previewTab, setPreviewTab] = useState('banner')

  useEffect(() => {
    setForm(getMascotSettings())
  }, [])

  const handleChange = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }))
    setSaved(false)
  }

  const handleSave = () => {
    saveMascotSettings(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const handleReset = () => {
    setForm(DEFAULT_MASCOT_SETTINGS)
    saveMascotSettings(DEFAULT_MASCOT_SETTINGS)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <Card className="overflow-hidden border border-emerald-500/30 bg-gradient-to-br from-white via-slate-50 to-emerald-50/30 p-6 shadow-xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-5 mb-6">
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-600 border border-emerald-500/30 shadow-xs">
            <Sparkles className="size-6 text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900">
                مركز تحكم المساعد الذكي والبانر العلوي (Mascot & Banner Manager)
              </h2>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-800">
                مباشر
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              تعديل رسائل الترحيب العلوية، وفقاعة كلام التميمة (الجني ذو الطربوش)، وأزرار التسجيل السريع
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleReset} title="استعادة النصوص الافتراضية">
            <RotateCcw className="size-3.5" />
            <span>استعادة الافتراضي</span>
          </Button>

          <Button size="sm" onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30">
            <Save className="size-3.5" />
            <span>حفظ الإعدادات</span>
          </Button>
        </div>
      </div>

      {saved && (
        <div className="fade-in mb-6 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-xs sm:text-sm font-bold text-emerald-800 ring-1 ring-emerald-200">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
          <span>تم حفظ الإعدادات وتطبيقها فوراً على واجهة المنصة والمساعد الذكي!</span>
        </div>
      )}

      {/* Grid Settings: Banner on Left/Right, Mascot on other */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section 1: Top Announcement Banner Settings */}
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5 font-black text-slate-800 text-sm">
              <Megaphone className="size-4 text-emerald-600" />
              <span>إعدادات البانر الترحيبي في أعلى الموقع</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">
                {form.banner_enabled ? 'مُفعّل' : 'مُعطّل'}
              </span>
              <Toggle
                checked={Boolean(form.banner_enabled)}
                onChange={(v) => handleChange('banner_enabled', v)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              النص الترحيبي للبانر (الملف الدائم):
            </label>
            <textarea
              rows={2}
              value={form.banner_text || ''}
              onChange={(e) => handleChange('banner_text', e.target.value)}
              placeholder="نص البانر العلوي..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نص زر تسجيل اللاعب:
              </label>
              <Input
                value={form.banner_player_btn || ''}
                onChange={(e) => handleChange('banner_player_btn', e.target.value)}
                placeholder="سجّل كلاعب..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                نص زر تسجيل المسير:
              </label>
              <Input
                value={form.banner_manager_btn || ''}
                onChange={(e) => handleChange('banner_manager_btn', e.target.value)}
                placeholder="سجّل كمسير فريق..."
              />
            </div>
          </div>
        </div>

        {/* Section 2: Mascot Assistant (الجني ذو الطربوش) Settings */}
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5 font-black text-slate-800 text-sm">
              <MessageSquare className="size-4 text-emerald-600" />
              <span>إعدادات فقاعات المساعد الذكي (الجني)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">
                {form.mascot_enabled ? 'مُفعّل' : 'مُعطّل'}
              </span>
              <Toggle
                checked={Boolean(form.mascot_enabled)}
                onChange={(v) => handleChange('mascot_enabled', v)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              رسالة الجني في فقاعة الكلام (Speech Bubble):
            </label>
            <textarea
              rows={2}
              value={form.mascot_message || ''}
              onChange={(e) => handleChange('mascot_message', e.target.value)}
              placeholder="نص دعوة الجني للزوار..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-xs font-bold text-slate-800 focus:border-emerald-500 focus:bg-white focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              النص الإرشادي الفرعي للجني:
            </label>
            <Input
              value={form.mascot_subtext || ''}
              onChange={(e) => handleChange('mascot_subtext', e.target.value)}
              placeholder="نص توجيهي إضافي..."
            />
          </div>
        </div>
      </div>

      {/* Live Interactive Preview Box */}
      <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-900 p-5 text-white">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2 text-xs font-black text-emerald-400">
            <Eye className="size-4" />
            <span>معاينة حية فورية (Live Preview)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPreviewTab('banner')}
              className={`rounded-xl px-3 py-1 text-xs font-bold transition-colors ${
                previewTab === 'banner' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              البانر العلوي
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab('mascot')}
              className={`rounded-xl px-3 py-1 text-xs font-bold transition-colors ${
                previewTab === 'mascot' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              المساعد الذكي (الجني)
            </button>
          </div>
        </div>

        {previewTab === 'banner' ? (
          <div className="overflow-hidden rounded-2xl border border-emerald-900/60 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 p-3.5 text-center">
            <p className="text-xs sm:text-sm font-black text-slate-100 mb-2">
              {form.banner_text || DEFAULT_MASCOT_SETTINGS.banner_text}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500 px-3 py-1 text-[11px] font-black text-white shadow-xs">
                <User className="size-3" />
                {form.banner_player_btn || DEFAULT_MASCOT_SETTINGS.banner_player_btn}
              </span>
              <span className="inline-flex items-center gap-1 rounded-xl bg-slate-800 border border-slate-700 px-3 py-1 text-[11px] font-black text-emerald-400">
                <Shield className="size-3" />
                {form.banner_manager_btn || DEFAULT_MASCOT_SETTINGS.banner_manager_btn}
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-[#0E1726] p-4">
            <GenieMascot size={42} animated />
            <div className="space-y-1.5 flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black text-emerald-400">المساعد الرياضي (الجني)</span>
                <span className="size-1 rounded-full bg-emerald-500" />
                <span className="text-[10px] text-slate-400">جاهز للمساعدة</span>
              </div>
              <p className="text-xs sm:text-sm font-black text-white leading-relaxed">
                {form.mascot_message || DEFAULT_MASCOT_SETTINGS.mascot_message}
              </p>
              <p className="text-[11px] font-semibold text-slate-400">
                {form.mascot_subtext || DEFAULT_MASCOT_SETTINGS.mascot_subtext}
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
