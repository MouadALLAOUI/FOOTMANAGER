import React, { useState } from 'react'
import {
  Link2,
  Copy,
  Check,
  QrCode,
  Share2,
  AlertTriangle,
  RotateCcw,
  Ban,
  Clock,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react'
import { Modal, Button } from '../../../components/dashboard/ui'
import { useToast } from '../../../components/ui/Toast'
import api from '../../../api/client'

export default function DelegatedMatchLinkModal({
  isOpen,
  onClose,
  tournamentId,
  fixture,
  onTokenChanged,
}) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState(null)
  const [copied, setCopied] = useState(false)
  const [showQr, setShowQr] = useState(false)

  if (!isOpen || !fixture) return null

  const homeName = fixture.home_team?.name || 'الفريق 1'
  const awayName = fixture.away_team?.name || 'الفريق 2'

  const handleGenerate = async () => {
    setLoading(true)
    try {
      const res = await api.post(
        `/committee/tournaments/${tournamentId}/fixtures/${fixture.id}/delegated-link`
      )
      setData(res.data.data)
      toast.success(res.data.message || 'تم إنشاء رابط تسجيل المباراة بنجاح')
      if (onTokenChanged) onTokenChanged()
    } catch (err) {
      toast.error(err.response?.data?.message || 'تعذر إنشاء الرابط')
    } finally {
      setLoading(false)
    }
  }

  const handleRevoke = async () => {
    if (!window.confirm('هل أنت متأكد من إلغاء هذا الرابط؟ سيتوقف فورا عن العمل.')) return
    setLoading(true)
    try {
      const res = await api.delete(
        `/committee/tournaments/${tournamentId}/fixtures/${fixture.id}/delegated-link`
      )
      setData(null)
      toast.success(res.data.message || 'تم إلغاء الرابط بنجاح')
      if (onTokenChanged) onTokenChanged()
    } catch (err) {
      toast.error(err.response?.data?.message || 'تعذر إلغاء الرابط')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast.success('تم نسخ الرابط إلى الحافظة')
    setTimeout(() => setCopied(false), 2500)
  }

  const openWhatsApp = (shareText) => {
    const encoded = encodeURIComponent(shareText)
    window.open(`https://wa.me/?text=${encoded}`, '_blank')
  }

  const qrImageUrl = data?.url
    ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        data.url
      )}`
    : null

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="رابط تسجيل المباراة السري (تفويض المندوب)"
      size="md"
    >
      <div className="space-y-4 py-1 text-slate-800" dir="rtl">
        {/* Match Header Summary */}
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-center">
          <p className="text-xs font-bold text-slate-500">مباراة</p>
          <p className="text-sm font-black text-slate-900 mt-0.5">
            {homeName} <span className="text-slate-400 font-bold mx-1">ضد</span> {awayName}
          </p>
        </div>

        {/* Security Warning Notice */}
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-3.5 text-amber-900">
          <ShieldAlert className="size-5 shrink-0 text-amber-600 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-black">صلاحية محددة وآمنة</p>
            <p className="text-amber-800 leading-relaxed font-medium">
              يتيح هذا الرابط لأي شخص (حكم، مسؤول ملعب، مندوب) تسجيل النتيجة والأحداث لهذه المباراة فقط دون الحاجة لحساب أو كلمة سر. لن تتغير النتائج والترتيب رسمياً إلا بعد اعتمادك لها.
            </p>
          </div>
        </div>

        {/* State 1: No link created in this session yet */}
        {!data && (
          <div className="py-4 text-center space-y-3">
            <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Link2 className="size-6" />
            </div>
            <p className="text-xs font-bold text-slate-600 max-w-sm mx-auto">
              اضغط الزر أدناه لتوليد رابط سري فريد لهذه المواجهة ومشاركته عبر واتساب مع مندوب المباراة.
            </p>
            <Button
              className="w-full justify-center bg-emerald-600 hover:bg-emerald-700 text-white font-black py-2.5 rounded-xl shadow-xs"
              loading={loading}
              onClick={handleGenerate}
            >
              <Link2 className="size-4 me-1.5" />
              توليد رابط التسجيل الآن
            </Button>
          </div>
        )}

        {/* State 2: Link generated and active */}
        {data && (
          <div className="space-y-4 pt-1">
            {/* Direct URL Box */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-black text-slate-500">رابط التسجيل المباشر</label>
              <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
                <input
                  type="text"
                  readOnly
                  value={data.url}
                  className="w-full bg-transparent px-2 text-xs font-bold text-slate-800 focus:outline-hidden ltr"
                  dir="ltr"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1 rounded-lg px-2.5 py-1 text-xs font-bold"
                  onClick={() => copyToClipboard(data.url)}
                >
                  {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                  <span>{copied ? 'تم النسخ' : 'نسخ'}</span>
                </Button>
              </div>
            </div>

            {/* Quick Share via WhatsApp with required template */}
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-emerald-900">المشاركة عبر واتساب</span>
                <span className="text-[10px] font-bold text-emerald-700">نص جاهز مع التوقيت</span>
              </div>
              <p className="rounded-xl bg-white/90 p-2 text-xs text-slate-700 font-medium leading-relaxed border border-emerald-100/60">
                {data.share_text}
              </p>
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1 justify-center bg-[#25D366] hover:bg-[#20ba59] text-white font-black text-xs py-2 rounded-xl shadow-2xs gap-1.5"
                  onClick={() => openWhatsApp(data.share_text)}
                >
                  <Share2 className="size-3.5" />
                  مشاركة عبر واتساب
                </Button>
                <Button
                  variant="outline"
                  className="gap-1 rounded-xl px-3 text-xs font-bold border-emerald-200 text-emerald-800 hover:bg-emerald-100/50"
                  onClick={() => copyToClipboard(data.share_text)}
                >
                  <Copy className="size-3.5" />
                  نسخ النص
                </Button>
              </div>
            </div>

            {/* QR Code toggle */}
            <div className="border-t border-slate-100 pt-2 text-center">
              <button
                type="button"
                onClick={() => setShowQr(!showQr)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 transition"
              >
                <QrCode className="size-4" />
                <span>{showQr ? 'إخفاء رمز الاستجابة السريعة (QR)' : 'عرض رمز الاستجابة السريعة (QR)'}</span>
              </button>

              {showQr && qrImageUrl && (
                <div className="mt-3 flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <img
                    src={qrImageUrl}
                    alt="Match Entry QR Code"
                    className="size-44 rounded-xl border border-white shadow-xs bg-white p-2"
                  />
                  <span className="text-[11px] font-bold text-slate-500 mt-2">
                    امسح الرمز بكاميرا الهاتف لفتح صفحة تسجيل النتيجة فوراً
                  </span>
                </div>
              )}
            </div>

            {/* Management actions: Regenerate or Revoke */}
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
              <Button
                variant="outline"
                size="sm"
                className="gap-1 rounded-xl text-xs font-bold border-slate-200 text-slate-600 hover:bg-slate-50"
                loading={loading}
                onClick={handleGenerate}
              >
                <RotateCcw className="size-3.5" />
                توليد رابط جديد (إلغاء القديم)
              </Button>

              <Button
                variant="dangerSoft"
                size="sm"
                className="gap-1 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-100"
                loading={loading}
                onClick={handleRevoke}
              >
                <Ban className="size-3.5" />
                إلغاء الرابط نهائياً
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
